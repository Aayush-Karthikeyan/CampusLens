// Turns raw Gemini SDK errors into user-friendly HTTP responses. Gemini's free
// tier throws quota errors (429 / RESOURCE_EXHAUSTED) with a machine-readable
// retry delay buried in JSON — surface that instead of a scary raw 500.

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

function normalizeGeminiError(error, fallbackMessage) {
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
      message: fallbackMessage,
    };
  }

  const retryDelay = formatRetryDelay(getRetryDelaySeconds(payload));
  return {
    statusCode: 429,
    message: `CampusLens has hit the AI request limit for now. Google says to try again ${retryDelay}. If it still does not work after that, the daily free quota may need longer to reset.`,
  };
}

module.exports = { normalizeGeminiError };
