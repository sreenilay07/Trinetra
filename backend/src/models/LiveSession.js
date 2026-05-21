const mongoose = require('mongoose');

const liveSessionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  examId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Exam',
    required: true
  },
  socketId: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  warnings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LiveSession', liveSessionSchema);
