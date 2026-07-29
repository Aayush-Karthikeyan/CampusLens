import { describe, it, expect } from "vitest";
import { cleanExtractedText, collapseEquationRuns } from "./extractText.js";

// PDF extraction produces two kinds of garbage: unmappable glyphs from maths
// fonts (which render as tofu boxes) and scrambled equation runs (positioned
// symbols read in spatial rather than logical order). Both are cleaned at
// ingestion so they never reach the embeddings or the source previews.
describe("collapseEquationRuns", () => {
  it("collapses a long run of scrambled maths tokens", () => {
    const scrambled = "* 2 1 3 1 2 1 1 2 3 0 3 1 * 9 3 5 2 1 2 3";
    expect(collapseEquationRuns(scrambled)).toBe("[equation]");
  });

  it("leaves ordinary prose completely alone", () => {
    const prose =
      "Case I: the 0 is in the units position so n1 = 1 and we multiply the possibilities.";
    expect(collapseEquationRuns(prose)).toBe(prose);
  });

  it("keeps short inline maths like n1 = 1 intact", () => {
    // only runs of 8+ tiny tokens collapse, so real inline notation survives
    const line = "We know n1 = 1 and n2 = 5 for this case.";
    expect(collapseEquationRuns(line)).toBe(line);
  });

  it("does not swallow the surrounding readable text", () => {
    const mixed =
      "Example #7 (Sol.) Required: 2 1 x 4 1 P dx ) x 1 ( 2 3 dx 2 x 27 5 (b)";
    const out = collapseEquationRuns(mixed);
    expect(out).toContain("Example #7");
    expect(out).toContain("[equation]");
    expect(out).toContain("(b)");
  });
});

describe("cleanExtractedText", () => {
  it("strips unmappable glyphs that render as tofu boxes", () => {
    // private-use codepoints are what maths fonts leave behind
    const dirty = "Probability  of an event � occurring.";
    const clean = cleanExtractedText(dirty);
    expect(clean).not.toMatch(/[-�]/);
    expect(clean).toContain("Probability");
    expect(clean).toContain("occurring.");
  });

  it("collapses runaway whitespace but keeps paragraph breaks", () => {
    const clean = cleanExtractedText("First para.\n\n\n\n\nSecond para.");
    expect(clean).toBe("First para.\n\nSecond para.");
  });
});
