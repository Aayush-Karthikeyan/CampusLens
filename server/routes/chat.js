const express = require("express");
const router = express.Router();
const ChatSession = require("../models/ChatSession");
const { query } = require("../rag/query");
const { buildPrompt, generateAnswerStream } = require("../rag/generate");
const { normalizeGeminiError } = require("../lib/geminiError");
const { normalizeDbError } = require("../lib/httpError");
const { aiLimiter } = require("../lib/rateLimit");
const { BROAD_RETRIEVAL_SEED, isBroadQuestion } = require("../rag/questionMode");
const { requireAuth } = require("../lib/requireAuth");
const { findOwnedCourse } = require("../lib/ownership");
const { reportError } = require("../lib/monitoring");

// Empirically measured on real course data: on-topic questions score ~0.63-0.70,
// off-topic questions score ~0.45-0.49. 0.55 sits in the gap between them.
const SOURCE_SCORE_THRESHOLD = Number(process.env.SOURCE_SCORE_THRESHOLD || 0.55);
const MIN_CONTEXT_SCORE = Number(
  process.env.MIN_CONTEXT_SCORE || SOURCE_SCORE_THRESHOLD
);

function normalizeChatError(error) {
  return normalizeGeminiError(
    error,
    "CampusLens hit a problem answering that. Please try again."
  );
}

function reportUnexpectedChatError(error, normalized, phase) {
  if (normalized.statusCode >= 500) {
    // Never attach the question, request body, PDF text, cookies, or headers.
    reportError(error, { route: "POST /chat", phase });
  }
}

function makeTitle(question) {
  const clean = question.trim().replace(/\s+/g, " ");
  if (clean.length <= 48) return clean || "New chat";
  return `${clean.slice(0, 45)}...`;
}

function formatSources(matches, minScore = SOURCE_SCORE_THRESHOLD) {
  return matches
    .filter((match) => Number(match.score) >= minScore)
    .map((match, i) => ({
      number: i + 1,
      source: match.metadata.source,
      chunkIndex: match.metadata.chunkIndex,
      text: match.metadata.text,
      score: match.score,
    }));
}

function getLocalAnswer(question) {
  const clean = question.trim().toLowerCase().replace(/[^\w\s']/g, "");
  const compact = clean.replace(/\s+/g, " ");

  if (
    /^(hi|hey|hello|yo|sup|wassup|what's up|whats up|good morning|good afternoon|good evening)$/.test(
      compact
    )
  ) {
    return "Hey, I'm here. Pick a PDF-shaped problem and let's make it less rude.";
  }

  if (/^(thanks|thank you|thx|ty|appreciate it|thanks bro|thanks man)$/.test(compact)) {
    return "Anytime. Academic suffering loves company, apparently.";
  }

  if (/^(bye|goodbye|see you|cya|later)$/.test(compact)) {
    return "Later. May your notes be searchable and your professors unusually merciful.";
  }

  return null;
}

function getWeakContextAnswer(matches) {
  const list = Array.isArray(matches) ? matches : [];
  const bestScore = Number(list[0]?.score || 0);
  if (list.length > 0 && bestScore >= MIN_CONTEXT_SCORE) return null;

  return [
    "Your notes are uploaded and searchable — but this question doesn't match any passage in them closely enough for me to answer honestly.",
    "",
    "Try wording it with a phrase that appears in the PDF (a topic, a formula name, an example number). Or zoom out — ask me to \"summarize the big ideas\" and I'll sample across everything you've uploaded. I only answer what your notes can back up, because pretending they said something they did not is how study tools become decorative nonsense.",
  ].join("\n");
}

async function saveAnswer(session, question, answer, sources = []) {
  if (session.title === "New chat" && session.messages.length === 0) {
    session.title = makeTitle(question);
  }

  session.messages.push({ role: "user", text: question.trim() });
  session.messages.push({ role: "assistant", text: answer, sources });
  session.refreshExpiry();
  await session.save();
  return session;
}

// no chat route is reachable without a session
router.use(requireAuth);

router.get("/sessions", async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const course = await findOwnedCourse(courseId, req.user._id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // capped for the same reason as the course list — bounded response size
    // without paging a rail that realistically holds a handful of chats
    const sessions = await ChatSession.find({ course: courseId })
      .sort({ updatedAt: -1 })
      .limit(100);
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

    const course = await findOwnedCourse(courseId, req.user._id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
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

    // sessions have no owner of their own — scope flows through the course
    const course = await findOwnedCourse(session.course, req.user._id);
    if (!course) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    res.json(session);
  } catch (error) {
    const { statusCode, message } = normalizeDbError(
      error,
      "Could not load that chat."
    );
    res.status(statusCode).json({ error: message });
  }
});

router.delete("/sessions/:id", async (req, res) => {
  try {
    // look up before deleting — the previous version deleted first, which would
    // now let anyone destroy another account's chat by guessing an id
    const session = await ChatSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    const course = await findOwnedCourse(session.course, req.user._id);
    if (!course) {
      return res.status(404).json({ error: "Chat session not found" });
    }

    await ChatSession.findByIdAndDelete(req.params.id);
    res.json({ message: "Chat deleted" });
  } catch (error) {
    const { statusCode, message } = normalizeDbError(
      error,
      "Could not delete that chat."
    );
    res.status(statusCode).json({ error: message });
  }
});

// Streams the answer over Server-Sent Events so the browser renders words as
// Gemini produces them (~1s to first text) instead of waiting ~8-10s for the
// full answer. Events: {type:"chunk"} repeatedly, then one {type:"done"} with
// the sources + saved session. Errors before streaming starts are normal HTTP
// errors; errors mid-stream become a {type:"error"} event because the 200
// status has already been sent.
router.post("/", aiLimiter, async (req, res) => {
  let session;
  let matches;
  let answerOverride = null;
  let broadMode = false;
  try {
    const { courseId, question, sessionId } = req.body;
    if (!courseId || !question?.trim()) {
      return res.status(400).json({ error: "courseId and question are required" });
    }
    // guard the embedding call: a novel-length "question" just wastes quota and
    // exceeds the embedding token limit anyway
    if (question.length > 4000) {
      return res
        .status(400)
        .json({ error: "That question is too long. Please shorten it." });
    }

    const course = await findOwnedCourse(courseId, req.user._id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
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

    answerOverride = getLocalAnswer(question);
    if (answerOverride) {
      matches = [];
    } else {
      broadMode = isBroadQuestion(question);
      // broad questions sample the course widely; specific ones search by the
      // question itself. 10 chunks (was 6) gives the model enough surrounding
      // material to reason across, not just the single closest passage.
      matches = broadMode
        ? await query(BROAD_RETRIEVAL_SEED, courseId, 10)
        : await query(question, courseId, 10);
    }
  } catch (error) {
    const normalized = normalizeChatError(error);
    reportUnexpectedChatError(error, normalized, "retrieval");
    return res.status(normalized.statusCode).json({ error: normalized.message });
  }

  const { question } = req.body;
  // broad mode: the score measures seed-vs-chunk similarity, not the user's
  // question, so the threshold guard doesn't apply — having chunks is enough
  const guardedAnswer =
    answerOverride ||
    (broadMode && matches.length > 0 ? null : getWeakContextAnswer(matches));
  // session.messages holds the prior turns — this question is only appended
  // after generation, so passing it straight through gives the model memory
  const prompt = guardedAnswer
    ? null
    : buildPrompt(matches, question, session.messages);
  const sources = broadMode
    ? formatSources(matches.slice(0, 4), 0)
    : formatSources(matches);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  // If the client hangs up mid-answer (tab closed, navigated away), stop pulling
  // from Gemini — otherwise we keep consuming the full generation and its quota
  // into a dead socket. Fires on normal completion too, but only after res.end().
  let clientGone = false;
  res.on("close", () => {
    clientGone = true;
  });

  try {
    let answer = "";
    if (guardedAnswer) {
      answer = guardedAnswer;
      send({ type: "chunk", text: answer });
    } else {
      for await (const chunk of generateAnswerStream(prompt)) {
        if (clientGone) break;
        answer += chunk;
        send({ type: "chunk", text: chunk });
      }
    }

    // client left mid-stream — don't persist a partial answer or write to the
    // closed socket
    if (clientGone) return;

    await saveAnswer(session, question, answer, sources);

    send({ type: "done", answer, sources, session });
  } catch (error) {
    if (clientGone) return; // error is just the closed socket; nothing to report
    const normalized = normalizeChatError(error);
    reportUnexpectedChatError(error, normalized, "generation");
    send({ type: "error", message: normalized.message });
  } finally {
    if (!clientGone) res.end();
  }
});

module.exports = router;
