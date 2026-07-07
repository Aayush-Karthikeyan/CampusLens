const express = require("express");
const router = express.Router();
const ChatSession = require("../models/ChatSession");
const { query } = require("../rag/query");
const { buildPrompt, generateAnswer } = require("../rag/generate");

const SOURCE_SCORE_THRESHOLD = Number(process.env.SOURCE_SCORE_THRESHOLD || 0.7);

function parseErrorPayload(error) {
  if (!error?.message) return null;

  try {
    return JSON.parse(error.message);
  } catch {
    return null;
  }
}

function formatRetryDelay(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "in a little while";
  if (seconds < 60) return `in about ${Math.ceil(seconds)} seconds`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes === 1) return "in about 1 minute";
  return `in about ${minutes} minutes`;
}

function getRetryDelaySeconds(payload) {
  const retryInfo = payload?.error?.details?.find((detail) =>
    detail?.["@type"]?.includes("RetryInfo")
  );
  const rawDelay = retryInfo?.retryDelay;
  if (!rawDelay) return null;

  const seconds = Number(String(rawDelay).replace("s", ""));
  return Number.isFinite(seconds) ? seconds : null;
}

function normalizeChatError(error) {
  const payload = parseErrorPayload(error);
  const status = payload?.error?.status || "";
  const message = payload?.error?.message || error.message || "";
  const quotaLike =
    status === "RESOURCE_EXHAUSTED" ||
    message.toLowerCase().includes("quota") ||
    message.includes("429");

  if (!quotaLike) {
    return {
      statusCode: 500,
      message: "CampusLens hit a problem answering that. Please try again.",
    };
  }

  const retryDelay = formatRetryDelay(getRetryDelaySeconds(payload));
  return {
    statusCode: 429,
    message: `CampusLens has hit the AI request limit for now. Google says to try again ${retryDelay}. If it still does not work after that, the daily free quota may need longer to reset.`,
  };
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

router.post("/", async (req, res) => {
  try {
    const { courseId, question, sessionId } = req.body;
    if (!courseId || !question?.trim()) {
      return res.status(400).json({ error: "courseId and question are required" });
    }

    let session = sessionId
      ? await ChatSession.findOne({ _id: sessionId, course: courseId })
      : null;

    if (!session) {
      session = await ChatSession.create({
        course: courseId,
        title: makeTitle(question),
        messages: [],
      });
    }

    const matches = await query(question, courseId);
    const prompt = buildPrompt(matches, question);
    const answer = await generateAnswer(prompt);
    const sources = formatSources(matches);

    if (session.title === "New chat" && session.messages.length === 0) {
      session.title = makeTitle(question);
    }

    session.messages.push({ role: "user", text: question.trim() });
    session.messages.push({ role: "assistant", text: answer, sources });
    session.refreshExpiry();
    await session.save();

    res.json({ answer, sources, session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
