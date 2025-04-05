const express = require('express');
const line = require('@line/bot-sdk');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const clockService = require('./services/clockService');
const User = require('./models/user');
const overtimeService = require('./services/overtimeService');
require('dotenv').config();
const app = express();
app.use(express.json()); // 為了解析 JSON 請求體

// LINE Bot 配置
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// 連接 MongoDB
mongoose.connect(process.env.MONGODB_URI);

const client = new line.Client(config);

app.get('/', (req, res) => {
    res.json('API SERVER');
});
app.post('/webhook', (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err);
            res.status(500).end();
        });
});

// 處理 LINE 事件
async function handleEvent(event) {
    if (event.type !== 'message' && event.type !== 'postback') {
        return Promise.resolve(null);
    }

    const { userId } = event.source;
    const profile = await client.getProfile(userId);
    let user = await User.findOne({ userId });
    if (user === null) {
        const newUser = new User({
            userId,
            userName: profile.displayName,
            avatar: profile.pictureUrl,
        });
        await newUser.save();
        user = newUser;
    }
    // 處理 RichMenu 按鈕事件
    if (event.type === 'postback') {
        const data = event.postback.data;
        if (data === 'clock_in_out') {
            return handleClockInOut(event);
        } else if (data === 'view_records') {
            return handleViewRecords(event);
        }
    }

    return Promise.resolve(null);
}

// 處理打卡功能
async function handleClockInOut(event) {
    const userId = event.source.userId;
    const result = await clockService.clockInOut(userId);
    return client.replyMessage(event.replyToken, {
        type: 'text',
        text: result.message,
    });
}

// 處理查看紀錄功能
async function handleViewRecords(event) {
    const userId = event.source.userId;
    const records = await overtimeService.getMonthlyRecords(userId);
    return client.replyMessage(event.replyToken, {
        type: 'flex',
        altText: '本月加班紀錄',
        contents: generateRecordFlexMessage(records),
    });
}

// 生成加班紀錄的 Flex Message
function generateRecordFlexMessage(data) {
    const { records, summary } = data;

    // 將記錄按週分組，最多顯示30天
    const recordsByWeek = [];
    let currentWeek = [];
    let currentWeekNum = null;

    // 使用最多30天的記錄
    const limitedRecords = records.slice(0, 30);

    limitedRecords.forEach((record) => {
        const date = new Date(record.date);
        const weekNum = getWeekNumber(date);

        if (currentWeekNum === null) {
            currentWeekNum = weekNum;
        }
        if (weekNum !== currentWeekNum) {
            // 開始新的一週
            recordsByWeek.push(currentWeek);
            currentWeek = [record];
            currentWeekNum = weekNum;
        } else {
            currentWeek.push(record);
        }
    });
    // 添加最後一週的數據
    if (currentWeek.length > 0) {
        recordsByWeek.push(currentWeek);
    }
    // 創建多個 box 來顯示每一週的記錄
    const weekBoxes = recordsByWeek.map((weekRecords) => {
        const recordContents = weekRecords.map((record) => {
            return {
                type: 'box',
                layout: 'horizontal',
                contents: [
                    {
                        type: 'text',
                        text: record.date.slice(5),
                        size: 'sm',
                        color: '#555555',
                        align: 'center',
                        flex: 1,
                    },
                    {
                        type: 'text',
                        text: record.clockIn.slice(0, -3),
                        size: 'sm',
                        color: '#111111',
                        align: 'center',
                        flex: 1,
                    },
                    {
                        type: 'text',
                        text: record.clockOut.slice(0, -3),
                        size: 'sm',
                        color: '#111111',
                        align: 'center',
                        flex: 1,
                    },
                    {
                        type: 'text',
                        text: record.overtimeHours + 'h',
                        size: 'sm',
                        color: '#111111',
                        align: 'end',
                        flex: 1,
                    },
                    {
                        type: 'text',
                        text: '$' + record.overtimeAmount,
                        size: 'sm',
                        color: '#111111',
                        align: 'end',
                        flex: 1,
                    },
                ],
                margin: 'md',
            };
        });

        return {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'separator',
                    margin: 'sm',
                },
                ...recordContents,
            ],
            margin: 'sm',
        };
    });

    // 創建主要 Flex Message 內容
    return {
        type: 'bubble',
        size: 'mega',
        header: {
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'text',
                    text: new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' }) + '        ' + '加班紀錄總表',
                    weight: 'bold',
                    size: 'xl',
                    color: '#ffffff',
                },
            ],
            backgroundColor: '#27ACB2',
            paddingAll: '10px',
        },
        body: {
            type: 'box',
            layout: 'vertical',
            contents: [
                // 表頭
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: '日期',
                            weight: 'bold',
                            size: 'sm',
                            color: '#888888',
                            align: 'center',
                            flex: 1,
                        },
                        {
                            type: 'text',
                            text: '上班',
                            weight: 'bold',
                            size: 'sm',
                            color: '#888888',
                            align: 'center',
                            flex: 1,
                        },
                        {
                            type: 'text',
                            text: '下班',
                            weight: 'bold',
                            size: 'sm',
                            color: '#888888',
                            align: 'center',
                            flex: 1,
                        },
                        {
                            type: 'text',
                            text: '時數',
                            weight: 'bold',
                            size: 'sm',
                            color: '#888888',
                            align: 'end',
                            flex: 1,
                        },
                        {
                            type: 'text',
                            text: '加班費',
                            weight: 'bold',
                            size: 'sm',
                            color: '#888888',
                            align: 'end',
                            flex: 1,
                        },
                    ],
                },
                // 週分組的記錄
                ...weekBoxes,
                // 分隔線
                {
                    type: 'separator',
                    margin: 'xxl',
                },
                // 總結
                {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                        {
                            type: 'text',
                            text: '總計',
                            weight: 'bold',
                            size: 'lg',
                            color: '#555555',
                            flex: 1,
                        },
                        {
                            type: 'text',
                            text: summary.totalOvertimeHours + 'h',
                            weight: 'bold',
                            size: 'lg',
                            color: '#111111',
                            align: 'end',
                            flex: 2,
                        },
                        {
                            type: 'text',
                            text: '$' + summary.totalOvertimeAmount,
                            weight: 'bold',
                            size: 'lg',
                            color: '#111111',
                            align: 'end',
                            flex: 2,
                        },
                    ],
                    margin: 'md',
                },
            ],
            paddingAll: '10px',
        },
    };
}

// 計算日期所在的週數
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// ================ 添加 RichMenu API ================

// 設定 RichMenu API
app.post('/api/setup-richmenu', async (req, res) => {
    try {
        // 可選：API 金鑰保護
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
            return res.status(401).json({ success: false, message: '未授權的請求' });
        }

        // 從請求中獲取自定義配置（可選）
        const customConfig = req.body || {};

        // 創建 RichMenu
        const richMenuId = await createRichMenu(customConfig);

        res.json({
            success: true,
            message: 'RichMenu 設定成功',
            richMenuId,
        });
    } catch (error) {
        // console.error('設定 RichMenu 失敗:', error);
        res.status(500).json({
            success: false,
            message: '設定 RichMenu 失敗',
            error: error.message,
        });
    }
});

// 刪除所有 RichMenu API
app.delete('/api/richmenu', async (req, res) => {
    try {
        // 可選：API 金鑰保護
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
            return res.status(401).json({ success: false, message: '未授權的請求' });
        }

        // 獲取所有 RichMenu
        const richMenuList = await client.getRichMenuList();

        // 刪除所有 RichMenu
        for (const menu of richMenuList) {
            await client.deleteRichMenu(menu.richMenuId);
        }

        res.json({
            success: true,
            message: `已刪除 ${richMenuList.length} 個 RichMenu`,
        });
    } catch (error) {
        console.error('刪除 RichMenu 失敗:', error);
        res.status(500).json({
            success: false,
            message: '刪除 RichMenu 失敗',
            error: error.message,
        });
    }
});

// 獲取所有 RichMenu API
app.get('/api/richmenu', async (req, res) => {
    try {
        // 可選：API 金鑰保護
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
            return res.status(401).json({ success: false, message: '未授權的請求' });
        }

        // 獲取所有 RichMenu
        const richMenuList = await client.getRichMenuList();

        res.json({
            success: true,
            richMenus: richMenuList,
        });
    } catch (error) {
        console.error('獲取 RichMenu 列表失敗:', error);
        res.status(500).json({
            success: false,
            message: '獲取 RichMenu 列表失敗',
            error: error.message,
        });
    }
});

// 創建 RichMenu 函數
async function createRichMenu(customConfig = {}) {
    // 預設 RichMenu 配置

    const defaultRichMenu = {
        size: {
            width: 2500,
            height: 843,
        },
        selected: true,
        name: '加班費計算機器人選單',
        chatBarText: '點擊開啟選單',
        areas: [
            {
                bounds: {
                    x: 0,
                    y: 0,
                    width: 1250,
                    height: 843,
                },
                action: {
                    type: 'postback',
                    data: 'clock_in_out',
                    label: '打卡',
                },
            },
            {
                bounds: {
                    x: 1250,
                    y: 0,
                    width: 1250,
                    height: 843,
                },
                action: {
                    type: 'postback',
                    data: 'view_records',
                    label: '查看加班紀錄',
                },
            },
        ],
    };

    // 合併自定義配置
    const richMenuConfig = { ...defaultRichMenu, ...customConfig };
    // 創建 RichMenu
    const richMenuId = await client.createRichMenu(richMenuConfig);
    // 上傳 RichMenu 圖片
    // 注意：在實際應用中，你可能需要從某處獲取圖片，這裡假設圖片在 assets 目錄中
    try {
        const imagePath = path.join(__dirname, 'richmenu.jpg');
        const bufferImage = fs.readFileSync(imagePath);
        await client.setRichMenuImage(richMenuId, bufferImage);
        // 將 RichMenu 設為預設
        await client.setDefaultRichMenu(richMenuId);
        return richMenuId;
    } catch (error) {
        // 如果上傳圖片失敗，刪除剛剛創建的 RichMenu
        await client.deleteRichMenu(richMenuId);
        throw new Error(`上傳 RichMenu 圖片失敗: ${error.message}`);
    }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});

module.exports = app;
