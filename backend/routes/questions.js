const express   = require('express');
const questions = require('../data/questions.json');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json(questions);
});

module.exports = router;
