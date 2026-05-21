const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
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
  answers: [{
    questionId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Question'
    },
    answer: mongoose.Schema.Types.Mixed, // string, boolean, etc.
    marksObtained: {
      type: Number,
      default: 0
    }
  }],
  score: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'submitted', 'terminated'],
    default: 'active'
  },
  suspicionScore: {
    type: Number,
    default: 0
  },
  violations: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Violation'
  }],
  autoSubmitted: {
    type: Boolean,
    default: false
  },
  submissionReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure one attempt per student per exam
attemptSchema.index({ studentId: 1, examId: 1 }, { unique: true });

module.exports = mongoose.model('Attempt', attemptSchema);
