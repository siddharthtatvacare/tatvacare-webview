const express  = require('express');
const Response = require('../models/Response');
const Session  = require('../models/Session');

const router = express.Router();

router.post('/save', async (req, res) => {
  const { sessionId, answers, activeBranches } = req.body;

  if (!sessionId || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'sessionId and answers[] are required' });
  }

  const session = await Session.findOne({ sessionId });
  if (!session) return res.status(404).json({ error: 'Session not found' });

  await Response.create({
    sessionId,
    answers,
    activeBranches: activeBranches || [],
    savedAt: new Date()
  });

  res.json({ saved: true });
});

module.exports = router;
