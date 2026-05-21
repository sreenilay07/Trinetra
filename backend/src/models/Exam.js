const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  examType: {
    type: String,
    enum: ['mcq', 'coding', 'both'],
    default: 'both'
  },
  authorId: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  duration: {
    type: Number, // in minutes
    required: [true, 'Please add exam duration']
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 0
  },
  instructions: {
    type: String
  },
  rules: {
    type: Map,
    of: String,
    default: {}
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  randomizeQuestions: {
    type: Boolean,
    default: false
  },
  allowFullscreenOnly: {
    type: Boolean,
    default: true
  },
  maxWarnings: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Exam', examSchema);
