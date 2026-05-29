const express            = require('express');
const Response           = require('../models/Response');
const Recommendation     = require('../models/Recommendation');
const Session            = require('../models/Session');
const { computeRecommendation } = require('../services/scoringEngine');
const { generateExplanation }   = require('../services/llmService');

const router = express.Router();

router.post('/', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const responseDoc = await Response.findOne({ sessionId });
    if (!responseDoc) return res.status(404).json({ error: 'Responses not found for session' });

    const { recommendedPackage, finalScores, scoringBreakdown } =
      computeRecommendation(responseDoc.answers, responseDoc.activeBranches);

    await Promise.all([
      Recommendation.create({
        sessionId,
        recommendedPackage,
        finalScores,
        scoringBreakdown,
        recommendedAt: new Date()
      }),
      Session.updateOne({ sessionId }, { completedAt: new Date() })
    ]);

    res.json({ recommendedPackage, finalScores });
  } catch (err) {
    console.error('Recommend error:', err.message);
    res.status(500).json({ error: 'Could not compute recommendation', detail: err.message });
  }
});

router.get('/explain/:sessionId', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const recDoc = await Recommendation.findOne({ sessionId });
    if (!recDoc) return res.status(404).json({ error: 'Recommendation not found' });

    if (recDoc.llmExplanation) {
      return res.json({ explanation: recDoc.llmExplanation, fromCache: true });
    }

    const explanation = await generateExplanation(sessionId);

    await Recommendation.updateOne(
      { sessionId },
      { llmExplanation: explanation, explainedAt: new Date() }
    );

    res.json({ explanation, fromCache: false });
  } catch (err) {
    console.error('Explain error:', err.message);
    res.status(500).json({ error: 'Could not generate explanation', detail: err.message });
  }
});

module.exports = router;
