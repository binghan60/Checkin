const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        date: { type: Date, required: true },
        clockInTime: { type: Date },
        clockOutTime: { type: Date },
        workingHours: { type: Number },
        overtimeHours: { type: Number, default: 0 },
        overtimeAmount: { type: Number, default: 0 },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Record', recordSchema);
