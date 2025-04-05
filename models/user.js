// models/Todo.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('User', userSchema);