const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  attemptId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Attempt',
    required: true
  },
  type: {
    type: String,
    enum: [
      'tab_switch',
      'multiple_faces',
      'no_face_detected',
      'face_turned',
      'mobile_detected',
      'voice_detected',
      'fullscreen_exit',
      'suspicious_behavior',
      'camera_blocked'
    ],
    required: true
  },
  evidenceImage: {
    type: String // URL from Cloudinary or local path
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  warningNumber: {
    type: Number,
    default: 1
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Violation', violationSchema);
