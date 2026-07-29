import { describe, it, expect } from "vitest";
import { isBroadQuestion } from "./questionMode.js";

// Broad questions carry no course vocabulary, so embedding them finds nothing
// and the weak-context guard refuses a perfectly fair question. Detecting them
// routes retrieval to a broad seed instead. This was a real reported bug.
describe("isBroadQuestion", () => {
  it("catches the big-picture phrasings that similarity search starves on", () => {
    const broad = [
      "Summarize the big ideas in my notes",
      "Explain the trickiest concept like I'm five",
      "What's most likely to show up on the exam?",
      "give me an overview",
      "what should i study first",
      "what are the key takeaways",
      "make me a study guide",
    ];
    for (const question of broad) {
      expect(isBroadQuestion(question), question).toBe(true);
    }
  });

  it("leaves specific questions to normal similarity search", () => {
    const specific = [
      "What is Bayes' theorem?",
      "Explain the multiplicative rule for independent events",
      "How do I calculate P(1 < X < 2) for this pdf?",
      "Define a circular linked list",
    ];
    for (const question of specific) {
      expect(isBroadQuestion(question), question).toBe(false);
    }
  });

  it("is case-insensitive", () => {
    expect(isBroadQuestion("SUMMARIZE MY NOTES")).toBe(true);
  });

  it("does not throw on non-string input", () => {
    expect(isBroadQuestion(undefined)).toBe(false);
    expect(isBroadQuestion(null)).toBe(false);
  });
});
