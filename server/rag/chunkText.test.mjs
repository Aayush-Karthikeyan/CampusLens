import { describe, it, expect } from "vitest";
import { chunkText } from "./chunkText.js";

// The chunker was rewritten from blind 500-char slicing to sentence-aware
// packing because fragment boundaries were poisoning retrieval — a chunk
// starting mid-word embeds as noise. These lock in that behaviour.
describe("chunkText", () => {
  it("returns nothing for empty or whitespace-only input", () => {
    // an image-only PDF extracts to nothing; upload relies on this to fail loudly
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\n  ")).toEqual([]);
  });

  it("keeps short text as a single chunk", () => {
    const chunks = chunkText("This is one short sentence about probability.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toContain("probability");
  });

  it("never starts or ends a chunk mid-word", () => {
    const sentence =
      "The cumulative distribution function describes accumulated probability. ";
    const chunks = chunkText(sentence.repeat(60));

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk).toBe(chunk.trim());
      // a severed word would leave a partial token at either boundary
      expect(chunk.startsWith("he ")).toBe(false);
      expect(/[a-z]$/.test(chunk)).toBe(false);
    }
  });

  it("splits an unbroken run so no chunk grows without bound", () => {
    // tables and formula dumps can arrive with no sentence punctuation at all
    const chunks = chunkText("x".repeat(5000));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1600);
    }
  });

  it("preserves the full text across chunk boundaries", () => {
    const text =
      "First sentence here. Second sentence follows. Third one closes it out.";
    const joined = chunkText(text).join(" ");
    expect(joined).toContain("First sentence");
    expect(joined).toContain("Third one closes it out.");
  });
});
