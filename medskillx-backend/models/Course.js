const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Course', CourseSchema);
