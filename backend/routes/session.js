const express = require('express');
const crypto  = require('crypto');
const Session = require('../models/Session');

const router = express.Router();

router.post('/init', async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) return res.status(400).json({ error: 'patientId is required' });

  const sessionId = crypto.randomUUID();
  const createdAt = new Date();

  await Session.create({ sessionId, patientId, createdAt });

  res.json({ sessionId, createdAt });
});

module.exports = router;
