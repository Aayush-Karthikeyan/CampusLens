import { describe, it, expect } from "vitest";
import { normalizeGeminiError } from "./geminiError.js";

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
      new Error("socket hang up"),
      "CampusLens hit a problem answering that."
    );

    expect(result.statusCode).toBe(500);
    expect(result.message).toBe("CampusLens hit a problem answering that.");
    expect(result.message).not.toContain("socket hang up");
  });

  it("still reports quota when the message only mentions 429", () => {
    const result = normalizeGeminiError(new Error("Request failed: 429"), "x");
    expect(result.statusCode).toBe(429);
  });
});
