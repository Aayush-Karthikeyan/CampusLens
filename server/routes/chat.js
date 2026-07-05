const express = require("express");
const router = express.Router();
const { query } = require("../rag/query");
const { buildPrompt, generateAnswer } = require("../rag/generate");

router.post("/", async (req, res) => {
  try {
    const { courseId, question } = req.body;
    const matches = await query(question, courseId);
    const prompt = buildPrompt(matches, question);
    const answer = await generateAnswer(prompt);
    const sources = matches.map((match, i) => ({
  number: i + 1,
  source: match.metadata.source,
  chunkIndex: match.metadata.chunkIndex,
}));

res.json({ answer, sources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;