const Record = require('../models/record');
const dateUtil = require('../utils/dateUtil');

const STANDARD_HOURS = 8; // 標準工時
const HOURLY_RATE = 188; // 假設時薪為 150 元

async function clockInOut(userId) {
    const now = new Date();
    const today = dateUtil.getDateStr(now);

    // 自動判斷是上班還是下班
    const hour = now.getHours();
    const isClockIn = hour < 12; // 12點前認為是上班打卡

    let record = await Record.findOne({
        userId,
        date: { $gte: dateUtil.startOfDay(now), $lte: dateUtil.endOfDay(now) },
    });

    if (isClockIn) {
        // 上班打卡
        if (!record) {
            record = new Record({
                userId,
                date: now,
            });
        }

        record.clockInTime = now; // 設定上班打卡時間
        await record.save();

        return { success: true, message: `上班打卡成功！時間：${dateUtil.formatTime(now)}` };
    } else {
        // 下班打卡
        if (!record) {
            return { success: false, message: '無法下班打卡，今天沒有上班記錄。' };
        }

        if (!record.clockInTime) {
            return { success: false, message: '資料不足，無法計算工作時數，請聯繫管理員處理。' };
        }

        record.clockOutTime = now; // 設定下班打卡時間

        // 計算工作時數
        const workHours = (now - record.clockInTime) / (1000 * 60 * 60);
        record.workingHours = workHours;

        // 計算加班時數和加班費
        if (workHours > STANDARD_HOURS) {
            record.overtimeHours = workHours - STANDARD_HOURS;
            record.overtimeAmount = record.overtimeHours * HOURLY_RATE;
        }

        await record.save();

        let message = `下班打卡成功！時間：${dateUtil.formatTime(now)}\n`;
        message += `今日工作時數：${record.workingHours.toFixed(2)}小時\n`;

        if (record.overtimeHours > 0) {
            message += `加班時數：${record.overtimeHours.toFixed(2)}小時\n`;
            message += `加班費：NT$ ${record.overtimeAmount.toFixed(0)}元`;
        }

        return { success: true, message };
    }
}

module.exports = {
    clockInOut,
};
