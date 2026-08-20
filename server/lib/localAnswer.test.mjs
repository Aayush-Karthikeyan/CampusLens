import { describe, it, expect } from "vitest";
import { getLocalAnswer } from "./localAnswer.js";

// The contract under test: a reply string for whole-message small talk, null
// for everything else. The null cases matter more than the matches — null is
// what keeps content questions on the grounded retrieval path.

describe("greetings", () => {
  it.each([
    "hi",
    "heyy",
    "heyyyy",
    "hiii",
    "hellooo",
    "yo",
    "sup",
    "howdy",
    "hi there",
    "hey there",
    "hello campuslens",
    "what's up",
    "whats up",
    "wassup",
    "good morning",
    "good evening",
  ])("answers %j", (message) => {
    expect(getLocalAnswer(message)).toMatch(/PDF-shaped problem/);
  });
});

describe("thanks", () => {
  it.each(["thanks", "thank you", "thanks a lot", "thank you so much", "tysm", "thankyou", "ty"])(
    "answers %j",
    (message) => {
      expect(getLocalAnswer(message)).toMatch(/Anytime/);
    }
  );
});

describe("goodbyes", () => {
  it.each(["bye", "bye bye", "see ya", "goodnight", "good night", "gtg", "cya"])(
    "answers %j",
    (message) => {
      expect(getLocalAnswer(message)).toMatch(/merciful/);
    }
  );
});

describe("how-are-you small talk", () => {
  it.each([
    "how are you",
    "how are you doing",
    "how's it going",
    "hows it going",
    "what are you doing",
    "what are you up to",
    "wyd",
    "you good",
  ])("answers %j", (message) => {
    expect(getLocalAnswer(message)).toMatch(/question from your notes/);
  });
});

describe("identity questions", () => {
  it.each([
    "who are you",
    "what are you",
    "what is this",
    "what's this",
    "what is campuslens",
    "who made you",
    "are you an ai",
    "are you chatgpt",
  ])("answers %j", (message) => {
    expect(getLocalAnswer(message)).toMatch(/I'm CampusLens/);
  });
});

describe("capability questions", () => {
  it.each([
    "help",
    "help me",
    "what can you do",
    "what do you do",
    "how does this work",
    "how do i use this",
    "what can i ask you",
    "what should i ask",
  ])("answers %j", (message) => {
    expect(getLocalAnswer(message)).toMatch(/Upload PDFs/);
  });
});

describe("normalization", () => {
  it("ignores case, punctuation, and stray whitespace", () => {
    expect(getLocalAnswer("HELLO!!!")).toMatch(/PDF-shaped/);
    expect(getLocalAnswer("  hey   there  ")).toMatch(/PDF-shaped/);
    expect(getLocalAnswer("Who are you?")).toMatch(/I'm CampusLens/);
  });

  it("rejects empty and non-string input", () => {
    expect(getLocalAnswer("")).toBeNull();
    expect(getLocalAnswer("   ")).toBeNull();
    expect(getLocalAnswer(null)).toBeNull();
    expect(getLocalAnswer(undefined)).toBeNull();
    expect(getLocalAnswer(42)).toBeNull();
  });
});

describe("conservative default: anything content-shaped stays grounded", () => {
  it.each([
    // greeting glued to a real question — the whole point of the anchors
    "hi, what is a binary tree",
    "hello can you explain osmosis",
    "who are you and what is bayes theorem",
    "help me with sn2 reactions",
    "hey there what does chapter 3 say",
    // real questions that merely resemble small talk
    "what is this equation doing",
    "how does this algorithm work",
    "what can you do with a linked list",
    // a long message that starts like a greeting
    "hello i uploaded my chemistry notes yesterday and i want to know what the second law of thermodynamics says",
    // bare nouns that could appear in course notes
    "peace",
    // plain content
    "define entropy",
    "asdfgh",
  ])("returns null for %j", (message) => {
    expect(getLocalAnswer(message)).toBeNull();
  });

  it("never captures broad-mode study questions (questionMode owns those)", () => {
    expect(getLocalAnswer("what should i study")).toBeNull();
    expect(getLocalAnswer("summarize my notes")).toBeNull();
    expect(getLocalAnswer("what should i focus on")).toBeNull();
    expect(getLocalAnswer("what topics are covered")).toBeNull();
  });
});
