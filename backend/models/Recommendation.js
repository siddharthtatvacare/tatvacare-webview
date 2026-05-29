const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  recommendedPackage: {
    oracleCode: Number,
    name:       String,
    gender:     String,
    price:      Number
  },
  finalScores: {
    Basic:    Number,
    Silver:   Number,
    Gold:     Number,
    Diabetic: Number,
    Heart:    Number
  },
  scoringBreakdown: [mongoose.Schema.Types.Mixed],
  llmExplanation:  { type: String, default: null },
  recommendedAt:   { type: Date, default: Date.now },
  explainedAt:     { type: Date, default: null }
}, { timestamps: false });

module.exports = mongoose.model('Recommendation', recommendationSchema);
