const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Exam',
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'descriptive', 'coding'],
    required: true
  },
  question: {
    type: String,
    required: [true, 'Please provide the question text']
  },
  options: [{
    text: String,
    isCorrect: Boolean
  }], // Mostly for MCQ
  correctAnswer: {
    type: String
  }, // For descriptive or coding expected output
  testCases: [{
    input: String,
    expectedOutput: String
  }],
  marks: {
    type: Number,
    required: true,
    default: 1
  },
  difficultyLevel: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);
