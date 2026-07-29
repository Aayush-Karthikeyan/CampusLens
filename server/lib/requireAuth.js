const User = require("../models/User");
const { COOKIE_NAME, readToken } = require("./auth");

// Gate for every route that touches user data. Reads the httpOnly cookie,
// verifies the token, loads the user, and attaches it as req.user. Anything
// that fails is a flat 401 — routes below this never see an unauthenticated
// request, so ownership checks can assume req.user exists.
async function requireAuth(req, res, next) {
  try {
    const userId = readToken(req.cookies?.[COOKIE_NAME]);
    if (!userId) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }

    // Load the user rather than trusting the token's claims alone: a deleted
    // account should stop working immediately, not when its token expires.
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Please sign in to continue." });
  }
}

module.exports = { requireAuth };
