const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true, unique: true },
  patientId:   { type: String, required: true },
  createdAt:   { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  source:      { type: String, default: 'myFortis-webview' }
}, { timestamps: false });

module.exports = mongoose.model('Session', sessionSchema);
