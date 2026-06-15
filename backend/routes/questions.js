const express   = require('express');
const questions = require('../data/new_questions.json');

const router = express.Router();

// Serves the tiered-scoring questionnaire (10 questions across 5 categories).
// The scoring payload (domainPoints / indicatedNeeds / effects) stays server-side;
// the client only needs id, category, text, type, and option labels.
router.get('/', (_req, res) => {
  const clientQuestions = questions.questions.map(q => ({
    id:       q.id,
    category: q.category,
    text:     q.text,
    type:     q.type, // 'single' | 'multi'
    options:  q.options.map(o => ({ id: o.id, text: o.label }))
  }));

  res.json({
    categories: questions.categories,
    questions:  clientQuestions
  });
});

module.exports = router;
