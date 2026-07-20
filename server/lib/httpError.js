// Turns raw Mongoose/DB errors into clean HTTP responses so route handlers
// never leak internal error text or return a 500 for what is really bad input.
// Mirrors the { statusCode, message } shape of normalizeGeminiError.

function normalizeDbError(error, fallbackMessage = "Something went wrong. Please try again.") {
  // malformed ObjectId in a query (bad :id / courseId) → client error, not 500
  if (error?.name === "CastError") {
    return { statusCode: 400, message: "That id doesn't look valid." };
  }
  // schema validation (e.g. missing required field) → surface the first reason
  if (error?.name === "ValidationError") {
    const first = Object.values(error.errors || {})[0]?.message;
    return {
      statusCode: 400,
      message: first || "Some required fields are missing or invalid.",
    };
  }
  return { statusCode: 500, message: fallbackMessage };
}

module.exports = { normalizeDbError };
