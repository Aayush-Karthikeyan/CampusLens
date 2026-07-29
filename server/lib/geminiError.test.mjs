import { describe, it, expect } from "vitest";
import geminiError from "./geminiError.js";

const { isTransientGeminiError, normalizeGeminiError } = geminiError;

// The free tier throws quota errors with a machine-readable retry delay buried
// in a JSON message. Surfacing that beats showing the user a raw 500.
describe("normalizeGeminiError", () => {
  it("turns a quota error into a 429 that tells the user when to retry", () => {
    const quotaError = new Error(
      JSON.stringify({
        error: {
          status: "RESOURCE_EXHAUSTED",
          message: "Quota exceeded",
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.RetryInfo",
              retryDelay: "42s",
            },
          ],
        },
      })
    );

    const result = normalizeGeminiError(quotaError, "fallback");
    expect(result.statusCode).toBe(429);
    expect(result.message).toMatch(/42 seconds/);
  });

  it("uses the fallback message for ordinary failures", () => {
    const result = normalizeGeminiError(
      new Error("Unexpected response shape"),
      "CampusLens hit a problem answering that."
    );

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("CampusLens hit a problem answering that.");
    expect(result.message).not.toContain("Unexpected response shape");
  });

  it("still reports quota when the message only mentions 429", () => {
    const result = normalizeGeminiError(new Error("Request failed: 429"), "x");
    expect(result.statusCode).toBe(429);
  });

  it("recognizes temporary Gemini outages without exposing the raw error", () => {
    const error = new Error(
      JSON.stringify({
        error: {
          code: 503,
          status: "UNAVAILABLE",
          message: "The service is temporarily unavailable",
        },
      })
    );

    expect(isTransientGeminiError(error)).toBe(true);

    const result = normalizeGeminiError(error, "fallback");
    expect(result.statusCode).toBe(503);
    expect(result.message).toMatch(/temporarily unavailable/i);
    expect(result.message).not.toContain("503");
  });

  it("recognizes transient network failures but not permanent bad requests", () => {
    expect(isTransientGeminiError(new Error("socket hang up"))).toBe(true);
    expect(isTransientGeminiError({ status: 504, message: "gateway timeout" })).toBe(
      true
    );
    expect(isTransientGeminiError({ status: 400, message: "bad request" })).toBe(
      false
    );
  });
});
