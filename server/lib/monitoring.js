const Sentry = require("@sentry/node");

// Error reporting is opt-in: without SENTRY_DSN nothing initialises and every
// helper below is a no-op, so local development and anyone cloning the repo
// are unaffected. Set the DSN on the host to turn it on.
const dsn = process.env.SENTRY_DSN;
const enabled = Boolean(dsn);

if (enabled) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    // Errors only. Performance tracing on a free tier burns the event quota
    // fast and tells us little we can act on.
    tracesSampleRate: 0,
    // Never ship request bodies or headers: they carry PDF text, questions,
    // auth cookies and API keys. A stack trace is what's actually useful.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
  console.log("Sentry error monitoring enabled");
}

// Report an error we've already handled, so a caught-and-degraded failure is
// still visible rather than silently swallowed.
function reportError(error, context) {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

// Express error handler — mounted last so anything that escapes a route lands
// here instead of vanishing into the platform log.
function errorHandler(err, req, res, next) {
  reportError(err, { path: req.path, method: req.method });
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

module.exports = { reportError, errorHandler, monitoringEnabled: enabled };
