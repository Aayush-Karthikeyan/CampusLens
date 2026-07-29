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

// Login and registration get their own tight cap. Without it an attacker can
// grind passwords at whatever rate the network allows; bcrypt makes each guess
// expensive for us too, so this protects the CPU as much as the accounts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only failed attempts count toward the cap
  message: {
    error: "Too many attempts. Please wait a few minutes and try again.",
  },
});

module.exports = { globalLimiter, aiLimiter, authLimiter };
