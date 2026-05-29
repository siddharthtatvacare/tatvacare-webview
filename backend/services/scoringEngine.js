const scoringLogic = require('../data/scoringLogic.json');
const ahcListing   = require('../data/AHClisting.json');

function computeRecommendation(answers, activeBranches) {
  const scores = { Basic: 0, Silver: 0, Gold: 0, Diabetic: 0, Heart: 0 };
  const breakdown = [];
  let genderAnswerId = null;

  for (const answer of answers) {
    if (answer.questionId === 'Q1') {
      genderAnswerId = answer.answerId;
      continue;
    }

    const rule = scoringLogic.rules.find(
      r => r.questionId === answer.questionId && r.answerId === answer.answerId
    );

    if (!rule) continue;

    // Branch rules only apply when that branch was triggered by Q3
    if (rule.branch && !activeBranches.includes(rule.branch)) continue;

    for (const [pkg, pts] of Object.entries(rule.scores)) {
      scores[pkg] += pts;
    }

    if (Object.keys(rule.scores).length > 0) {
      breakdown.push({
        questionId:   answer.questionId,
        answerId:     answer.answerId,
        contribution: { ...rule.scores }
      });
    }
  }

  const winner     = findWinner(scores);
  const genderId   = genderAnswerId || 'Q1_M';
  const oracleCode = scoringLogic.genderMap[winner][genderId];
  const pkg        = ahcListing.find(p => p.oracleCode === oracleCode);

  return {
    recommendedPackage: {
      oracleCode: pkg.oracleCode,
      name:       pkg.name,
      gender:     pkg.gender,
      price:      pkg.price
    },
    finalScores:     scores,
    scoringBreakdown: breakdown
  };
}

function findWinner(scores) {
  let maxScore = -1;
  const winners = [];

  for (const [pkg, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      winners.length = 0;
      winners.push(pkg);
    } else if (score === maxScore) {
      winners.push(pkg);
    }
  }

  if (winners.length === 1) return winners[0];

  for (const pkg of scoringLogic.tiebreaker.priority) {
    if (winners.includes(pkg)) return pkg;
  }

  return winners[0];
}

module.exports = { computeRecommendation };
