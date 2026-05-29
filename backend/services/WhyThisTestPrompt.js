const fs   = require('fs');
const path = require('path');

// Prompt text lives in WhyThisTestPrompt.md — edit that file to change the explanation behaviour.
// This file only owns the dynamic message assembly logic.
const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, 'WhyThisTestPrompt.md'),
  'utf8'
);

function buildUserMessage(payload) {
  const { recommendedPackage, testPanels, runnerUp, userAnswers, scoringBreakdown } = payload;

  const panelList = testPanels
    .map(t => `  - ${t.name}${t.keySubTests?.length ? ` (includes: ${t.keySubTests.join(', ')})` : ''}`)
    .join('\n');

  const answerList = userAnswers
    .map(a => `  Q: ${a.question}\n  A: ${a.answer}`)
    .join('\n');

  const breakdownList = scoringBreakdown
    .map(b => `  - ${b.answerId} contributed points toward ${Object.keys(b.contribution).join(', ')}`)
    .join('\n');

  return `
RECOMMENDED PACKAGE: ${recommendedPackage.name} (${recommendedPackage.gender}, ₹${recommendedPackage.price})

TEST PANELS IN THIS PACKAGE:
${panelList}

RUNNER-UP PACKAGE (second highest score): ${runnerUp.name} — score ${runnerUp.score} vs recommended score ${runnerUp.winnerScore}

PATIENT'S ANSWERS:
${answerList}

SCORING SIGNALS (which answers drove the recommendation):
${breakdownList}

Task: Write the 3-section explanation as instructed. Reference the actual test names from the panel list above. Name the runner-up package in section 3.
`.trim();
}

module.exports = { SYSTEM_PROMPT, buildUserMessage };
