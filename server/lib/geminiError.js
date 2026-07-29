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

function getErrorStatus(error, payload = parseErrorPayload(error)) {
  return (
    payload?.error?.status ||
    payload?.error?.code ||
    error?.status ||
    error?.statusCode ||
    error?.code ||
    error?.response?.status ||
    ""
  );
}

function isTransientGeminiError(error) {
  const payload = parseErrorPayload(error);
  const status = String(getErrorStatus(error, payload)).toUpperCase();
  const message = String(payload?.error?.message || error?.message || "").toUpperCase();

  return (
    ["500", "502", "503", "504", "INTERNAL", "UNAVAILABLE", "DEADLINE_EXCEEDED"].includes(
      status
    ) ||
    /\b(500|502|503|504)\b/.test(message) ||
    message.includes("UNAVAILABLE") ||
    message.includes("DEADLINE_EXCEEDED") ||
    message.includes("SOCKET HANG UP") ||
    message.includes("ECONNRESET") ||
    message.includes("ETIMEDOUT")
  );
}

function normalizeGeminiError(error, fallbackMessage) {
  const payload = parseErrorPayload(error);
  const status = String(getErrorStatus(error, payload));
  const message = payload?.error?.message || error.message || "";
  const quotaLike =
    status === "RESOURCE_EXHAUSTED" ||
    status === "429" ||
    message.toLowerCase().includes("quota") ||
    message.includes("429");

  if (quotaLike) {
    const retryDelay = formatRetryDelay(getRetryDelaySeconds(payload));
    return {
      statusCode: 429,
      message: `CampusLens has hit the AI request limit for now. Google says to try again ${retryDelay}. If it still does not work after that, the daily free quota may need longer to reset.`,
    };
  }

  if (isTransientGeminiError(error)) {
    return {
      statusCode: 503,
      message:
        "CampusLens's AI service is temporarily unavailable. Please try again in a moment.",
    };
  }

  return {
    statusCode: 500,
    message: fallbackMessage,
  };
}

module.exports = { isTransientGeminiError, normalizeGeminiError };
