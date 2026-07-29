const express = require("express");
const router = express.Router();
const User = require("../models/User");
const {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signToken,
  cookieOptions,
} = require("../lib/auth");
const { requireAuth } = require("../lib/requireAuth");
const { authLimiter } = require("../lib/rateLimit");
const { normalizeDbError } = require("../lib/httpError");

const MIN_PASSWORD = 8;

function fail(res, error, fallback) {
  const { statusCode, message } = normalizeDbError(error, fallback);
  res.status(statusCode).json({ error: message });
}

router.post("/register", authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !username || !password) {
      return res
        .status(400)
        .json({ error: "Email, username and password are all required." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "That email doesn't look valid." });
    }
    if (password.length < MIN_PASSWORD) {
      return res.status(400).json({
        error: `Password must be at least ${MIN_PASSWORD} characters.`,
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with that email already exists." });
    }

    const user = await User.create({
      email,
      username,
      passwordHash: await hashPassword(password),
    });

    res.cookie(COOKIE_NAME, signToken(user._id), cookieOptions());
    res.status(201).json(user); // toJSON strips the hash
  } catch (error) {
    // a racing duplicate slips past the check above and lands here
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ error: "An account with that email already exists." });
    }
    fail(res, error, "Could not create your account.");
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    // Same message and same work whether the email exists or the password is
    // wrong — a distinct "no such user" reply is an account-enumeration oracle.
    const ok = user && (await verifyPassword(password, user.passwordHash));
    if (!ok) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    res.cookie(COOKIE_NAME, signToken(user._id), cookieOptions());
    res.json(user);
  } catch (error) {
    fail(res, error, "Could not sign you in.");
  }
});

router.post("/logout", (req, res) => {
  // clearCookie must be given the same attributes the cookie was set with,
  // otherwise the browser keeps it
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
  res.json({ message: "Signed out" });
});

// The client calls this on load to find out whether the cookie is still good.
router.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

module.exports = router;
