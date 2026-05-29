const express        = require('express');
const Session        = require('../models/Session');
const Response       = require('../models/Response');
const Recommendation = require('../models/Recommendation');
const router         = express.Router();

router.post('/notify', async (req, res) => {
  try {
    const { sessionId } = req.body;

    const [sessionDoc, responseDoc, recDoc] = await Promise.all([
      Session.findOne({ sessionId }),
      Response.findOne({ sessionId }),
      Recommendation.findOne({ sessionId })
    ]);

    if (!recDoc) return res.status(404).json({ error: 'Recommendation not found for this session' });

    const payload = {
      event:              'package_recommended',
      patientId:          sessionDoc?.patientId,
      sessionId,
      recommendedPackage: recDoc.recommendedPackage,
      finalScores:        recDoc.finalScores,
      answers:            responseDoc?.answers        || [],
      activeBranches:     responseDoc?.activeBranches || [],
      recommendedAt:      recDoc.recommendedAt,
      notifiedAt:         new Date().toISOString()
    };

    const webhookUrl = process.env.FORTIS_BOOKING_WEBHOOK;

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const webhookRes = await fetch(webhookUrl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        signal:  ctrl.signal
      });
      clearTimeout(timer);
      console.log(`[booking] Fortis webhook → ${webhookRes.status} session=${sessionId}`);
    } catch (webhookErr) {
      // Non-fatal — Fortis endpoint unavailable should never block the user
      console.warn(`[booking] Fortis webhook failed (${webhookErr.message}) session=${sessionId}`);
    }

    res.json({ notified: true, payload });
  } catch (err) {
    console.error('Booking notify error:', err.message);
    res.status(500).json({ error: 'Could not process booking notification', detail: err.message });
  }
});

module.exports = router;
