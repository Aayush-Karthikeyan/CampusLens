const express = require("express");
const router = express.Router();
const ChatSession = require("../models/ChatSession");
const { query } = require("../rag/query");
const { buildPrompt, generateAnswerStream } = require("../rag/generate");
const { normalizeGeminiError } = require("../lib/geminiError");

// Empirically measured on real course data: on-topic questions score ~0.63-0.70,
// off-topic questions score ~0.45-0.49. 0.55 sits in the gap between them.
const SOURCE_SCORE_THRESHOLD = Number(process.env.SOURCE_SCORE_THRESHOLD || 0.55);

function normalizeChatError(error) {
  return normalizeGeminiError(
    error,
    "CampusLens hit a problem answering that. Please try again."
  );
}

function makeTitle(question) {
  const clean = question.trim().replace(/\s+/g, " ");
  if (clean.length <= 48) return clean || "New chat";
  return `${clean.slice(0, 45)}...`;
}

function formatSources(matches) {
  return matches
    .filter((match) => Number(match.score) >= SOURCE_SCORE_THRESHOLD)
    .map((match, i) => ({
      number: i + 1,
      source: match.metadata.source,
      chunkIndex: match.metadata.chunkIndex,
      text: match.metadata.text,
      score: match.score,
    }));
}

router.get("/sessions", async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const sessions = await ChatSession.find({ course: courseId }).sort({
      updatedAt: -1,
    });
    res.json(sessions);
  } catch (error) {
    const normalized = normalizeChatError(error);
    res.status(normalized.statusCode).json({ error: normalized.message });
  }
});

router.post("/sessions", async (req, res) => {
  try {
    const { courseId, title } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const session = await ChatSession.create({
      course: courseId,
      title: title?.trim() || "New chat",
      messages: [],
    });

    res.json(session);
  } catch (error) {
    const normalized = normalizeChatError(error);
    res.status(normalized.statusCode).json({ error: normalized.message });
  }
});

router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await ChatSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    const session = await ChatSession.findByIdAndDelete(req.params.id);

    if (!session) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    res.json({ message: "Chat deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Streams the answer over Server-Sent Events so the browser renders words as
// Gemini produces them (~1s to first text) instead of waiting ~8-10s for the
// full answer. Events: {type:"chunk"} repeatedly, then one {type:"done"} with
// the sources + saved session. Errors before streaming starts are normal HTTP
// errors; errors mid-stream become a {type:"error"} event because the 200
// status has already been sent.
router.post("/", async (req, res) => {
  let session;
  let matches;
  try {
    const { courseId, question, sessionId } = req.body;
    if (!courseId || !question?.trim()) {
      return res.status(400).json({ error: "courseId and question are required" });
    }

    session = sessionId
      ? await ChatSession.findOne({ _id: sessionId, course: courseId })
      : null;

    if (!session) {
      session = await ChatSession.create({
        course: courseId,
        title: makeTitle(question),
        messages: [],
      });
    }

    matches = await query(question, courseId);
  } catch (error) {
    const normalized = normalizeChatError(error);
    return res.status(normalized.statusCode).json({ error: normalized.message });
  }

  const { question } = req.body;
  const prompt = buildPrompt(matches, question);
  const sources = formatSources(matches);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    let answer = "";
    for await (const chunk of generateAnswerStream(prompt)) {
      answer += chunk;
      send({ type: "chunk", text: chunk });
    }

    if (session.title === "New chat" && session.messages.length === 0) {
      session.title = makeTitle(question);
    }

    session.messages.push({ role: "user", text: question.trim() });
    session.messages.push({ role: "assistant", text: answer, sources });
    session.refreshExpiry();
    await session.save();

    send({ type: "done", answer, sources, session });
  } catch (error) {
    const normalized = normalizeChatError(error);
    send({ type: "error", message: normalized.message });
  } finally {
    res.end();
  }
});

module.exports = router;
