// Sentence-aware chunking. The old version sliced every 500 characters with a
// 50-char overlap, which routinely cut words and sentences in half — retrieval
// then matched against fragments like "ark flickers in and out". This version
// packs whole sentences (bullets count as sentences) into ~1000-char chunks
// with a one-sentence overlap, so every chunk starts and ends on a complete
// thought. Hard slicing survives only as a fallback for pathological unbroken
// runs (tables, formula dumps) longer than hardMax.

function splitIntoSentences(text) {
  const sentences = [];

  // paragraphs and bullet lines are natural boundaries; keep them as units
  const blocks = text
    .split(/\n{2,}|\n(?=\s*[●•\-*•])/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const block of blocks) {
    // split after sentence punctuation followed by a capital/digit/opening mark
    const parts = block.split(/(?<=[.!?])\s+(?=[A-Z0-9("'“\[])/);
    for (const part of parts) {
      const s = part.trim();
      if (s) sentences.push(s);
    }
  }

  return sentences;
}

function chunkText(text, target = 1000, hardMax = 1600) {
  const pieces = [];
  for (const sentence of splitIntoSentences(text)) {
    if (sentence.length <= hardMax) {
      pieces.push(sentence);
    } else {
      // unbroken run: fall back to hard slices so no piece exceeds hardMax
      for (let i = 0; i < sentence.length; i += target) {
        pieces.push(sentence.slice(i, i + target).trim());
      }
    }
  }

  const chunks = [];
  let current = "";
  let lastSentence = "";

  for (const piece of pieces) {
    if (current && current.length + piece.length + 1 > target) {
      chunks.push(current);
      // one-sentence overlap carries context across the boundary, but only
      // when the carried sentence is short enough not to bloat the next chunk
      current =
        lastSentence && lastSentence.length <= 200
          ? `${lastSentence} ${piece}`
          : piece;
    } else {
      current = current ? `${current} ${piece}` : piece;
    }
    lastSentence = piece;
  }
  if (current) chunks.push(current);

  return chunks;
}

module.exports = { chunkText };
