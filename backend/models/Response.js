const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId:   String,
  questionText: String,
  answerId:     String,
  answerText:   String
}, { _id: false });

const responseSchema = new mongoose.Schema({
  sessionId:      { type: String, required: true, unique: true },
  answers:        [answerSchema],
  activeBranches: [String],
  savedAt:        { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = mongoose.model('Response', responseSchema);
