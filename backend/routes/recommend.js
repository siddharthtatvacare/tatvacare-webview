const express            = require('express');
const Response           = require('../models/Response');
const Recommendation     = require('../models/Recommendation');
const Session            = require('../models/Session');
const { computeRecommendationV2 } = require('../services/newScoringEngine');
const { generateExplanation }     = require('../services/llmService');

const router = express.Router();

// Map V2 package ids -> the short keys the Recommendation schema + llmService expect.
const SHORT_KEY = {
  basic_health_package:   'Basic',
  silver_health_package:  'Silver',
  gold_health_package:    'Gold',
  diabetic_profile:       'Diabetic',
  healthy_heart_profile:  'Heart'
};

router.post('/', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

  try {
    const responseDoc = await Response.findOne({ sessionId });
    if (!responseDoc) return res.status(404).json({ error: 'Responses not found for session' });

    // V2: risk-domain alignment + test-coverage scoring (NewScoringExplained.md)
    const { recommendedPackage, ranked, diagnostics } =
      computeRecommendationV2(responseDoc.answers);

    // finalScores kept as {Basic,Silver,Gold,Diabetic,Heart} = fit, so the existing
    // schema and the LLM "why" runner-up logic keep working unchanged.
    const finalScores = {};
    for (const p of ranked) finalScores[SHORT_KEY[p.id] || p.id] = p.fit;

    await Promise.all([
      Recommendation.create({
        sessionId,
        recommendedPackage,
        finalScores,
        scoringBreakdown: ranked,          // full ranked fit detail (Mixed[])
        recommendedAt: new Date()
      }),
      Session.updateOne({ sessionId }, { completedAt: new Date() })
    ]);

    res.json({ recommendedPackage, ranked, finalScores, diagnostics });
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
