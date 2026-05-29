const OpenAI = require('openai');
const ahcListing  = require('../data/AHClisting.json');
const Response    = require('../models/Response');
const Recommendation = require('../models/Recommendation');
const { SYSTEM_PROMPT, buildUserMessage } = require('./WhyThisTestPrompt');

async function generateExplanation(sessionId) {
  // Client created here (not at module load) so process.env is fully populated by dotenv
  const client = new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey:  process.env.LLM_API_KEY
  });

  const [responseDoc, recDoc] = await Promise.all([
    Response.findOne({ sessionId }),
    Recommendation.findOne({ sessionId })
  ]);

  if (!responseDoc || !recDoc) throw new Error('Session data not found');

  // ── Recommended package test panels ──────────────────────────────────────
  const pkgEntry = ahcListing.find(p => p.oracleCode === recDoc.recommendedPackage.oracleCode);
  const testPanels = pkgEntry
    ? pkgEntry.tests.map(t => ({
        name: t.name,
        keySubTests: t.subTests ? t.subTests.slice(0, 4).map(s => s.name) : []
      }))
    : [];

  // ── Runner-up (second highest scoring package) ────────────────────────────
  const scores     = recDoc.finalScores;
  const winnerName = recDoc.recommendedPackage.name.replace(' Health Package', '').replace(' Profile', '');
  const sorted     = Object.entries(scores).sort(([, a], [, b]) => b - a);
  const winnerScore = sorted[0][1];
  const runnerUpEntry = sorted.find(([name]) => name !== sorted[0][0]);
  const runnerUp = {
    name:        runnerUpEntry ? `${runnerUpEntry[0]} Package` : 'Basic Health Package',
    score:       runnerUpEntry ? runnerUpEntry[1] : 0,
    winnerScore
  };

  // ── Assemble payload and call LLM ─────────────────────────────────────────
  const payload = {
    recommendedPackage: recDoc.recommendedPackage,
    testPanels,
    runnerUp,
    userAnswers: responseDoc.answers.map(a => ({
      question: a.questionText,
      answer:   a.answerText
    })),
    scoringBreakdown: recDoc.scoringBreakdown
  };

  const completion = await client.chat.completions.create({
    model:    process.env.LLM_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: buildUserMessage(payload) }
    ],
    max_tokens:  700,
    temperature: 0.3
  });

  return completion.choices[0].message.content.trim();
}

module.exports = { generateExplanation };
