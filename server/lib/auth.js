const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL = "7d";
const COOKIE_NAME = "campuslens_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === "production";

// A signing secret is not optional in production — a predictable one lets
// anyone mint a token for any account. Locally we fall back to a fixed
// dev-only string so restarts don't invalidate your session while you work.
const DEV_SECRET = "campuslens-local-development-secret-do-not-deploy";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (isProduction) {
    throw new Error(
      "JWT_SECRET must be set in production. Refusing to sign tokens with a known key."
    );
  }

  return DEV_SECRET;
}

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, getSecret(), {
    expiresIn: TOKEN_TTL,
  });
}

// Returns the user id, or null for anything malformed/expired/forged. Callers
// treat null as "not signed in" rather than distinguishing the failure mode —
// telling an attacker *why* a token failed is free information.
function readToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getSecret()).sub;
  } catch {
    return null;
  }
}

// The token rides in an httpOnly cookie rather than localStorage: script on the
// page cannot read it, so an XSS bug can't walk off with the session. In every
// environment the cookie is first-party — dev proxies /api through Vite, and
// production proxies it through a Vercel rewrite to Render (client/vercel.json)
// because mobile Safari/WebKit drops cross-site cookies no matter what SameSite
// says. First-party means Lax works everywhere and blocks cross-site POSTs.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: SEVEN_DAYS_MS,
    path: "/",
  };
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  signToken,
  readToken,
  cookieOptions,
};
