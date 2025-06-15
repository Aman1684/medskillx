const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  enrolledCourses: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    progress: [{
      moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' },
      completed: { type: Boolean, default: false },
      score: Number,
      completedAt: Date,
    }],
  }],
  notifications: [{
    message: String,
    date: Date,
    read: { type: Boolean, default: false }
  }]
});

module.exports = mongoose.model('User', UserSchema);
