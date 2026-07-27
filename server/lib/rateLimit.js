const rateLimit = require("express-rate-limit");

const FIVE_MIN = 5 * 60 * 1000;

// Generous catch-all so nothing can be raw-hammered, without getting in the way
// of a real person clicking around the app.
const globalLimiter = rateLimit({
  windowMs: FIVE_MIN,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please slow down and try again shortly.",
  },
});

// Strict cap for the expensive endpoints — every upload/chat/quiz/plan call
// spends Gemini + Pinecone quota from a shared free tier, so a bot or an
// over-eager visitor mustn't be able to exhaust the daily budget and break the
// demo for everyone. Applied only to the generation routes, not cheap GETs.
const aiLimiter = rateLimit({
  windowMs: FIVE_MIN,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      "You're sending a lot fast. Give it a minute — this is a free-tier demo with limited AI quota.",
  },
});

module.exports = { globalLimiter, aiLimiter };
