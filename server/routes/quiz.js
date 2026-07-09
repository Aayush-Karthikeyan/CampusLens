const express = require("express");
const router = express.Router();
const { query } = require("../rag/query");
const { generateQuiz, QUIZ_RETRIEVAL_SEED } = require("../rag/quiz");

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 15;

router.post("/", async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    // clamp the requested count into a sane range
    const requested = Number(req.body.count) || 5;
    const count = Math.min(Math.max(requested, MIN_QUESTIONS), MAX_QUESTIONS);

    // Reuse the chat retrieval layer, but with a broad seed and a wider net so the
    // quiz draws from across the course rather than one topic. topK is roughly
    // 2 chunks per question, capped.
    const topK = Math.min(count * 2, 12);
    const matches = await query(QUIZ_RETRIEVAL_SEED, courseId, topK);

    if (matches.length === 0) {
      return res.status(400).json({
        error: "No study material found for this course. Upload a PDF first.",
      });
    }

    const questions = await generateQuiz(matches, count);
    if (questions.length === 0) {
      return res.status(422).json({
        error: "Couldn't build a quiz from this material. Try a different course.",
      });
    }

    res.json({ questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
