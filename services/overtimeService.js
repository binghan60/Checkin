const Record = require('../models/record');
const dateUtil = require('../utils/dateUtil');

async function getMonthlyRecords(userId) {
    const now = new Date();
    const startOfMonth = dateUtil.startOfMonth(now);
    const endOfMonth = dateUtil.endOfMonth(now);

    const records = await Record.find({
        userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: 1 });

    const totalOvertimeHours = records.reduce((sum, record) => sum + (record.overtimeHours || 0), 0);
    const totalOvertimeAmount = records.reduce((sum, record) => sum + (record.overtimeAmount || 0), 0);

    return {
        records: records.map((r) => ({
            date: dateUtil.formatDate(r.date),
            clockIn: r.clockInTime ? dateUtil.formatTime(r.clockInTime) : '無',
            clockOut: r.clockOutTime ? dateUtil.formatTime(r.clockOutTime) : '無',
            workingHours: r.workingHours ? r.workingHours.toFixed(2) : '0',
            overtimeHours: r.overtimeHours ? r.overtimeHours.toFixed(2) : '0',
            overtimeAmount: r.overtimeAmount ? r.overtimeAmount.toFixed(0) : '0',
        })),
        summary: {
            totalOvertimeHours: totalOvertimeHours.toFixed(2),
            totalOvertimeAmount: totalOvertimeAmount.toFixed(0),
        },
    };
}

module.exports = {
    getMonthlyRecords,
};
