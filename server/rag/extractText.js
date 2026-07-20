const fs = require("fs");
const { PDFParse } = require("pdf-parse");

// PDF math fonts often extract as unmappable glyphs - private-use codepoints,
// control characters, replacement chars - that render as tofu boxes in the UI
// and add pure noise to embeddings. Strip them at the pipeline entrance and
// tidy the leftover whitespace. Newlines are preserved: the chunker keys on
// paragraph breaks. (Built via RegExp so the source stays ASCII-only.)
const UNMAPPABLE_GLYPHS = new RegExp(
  "[" +
    "\\u0000-\\u0008" + // C0 controls (except tab/newline/CR handled below)
    "\\u000B\\u000C" +
    "\\u000E-\\u001F" +
    "\\u007F-\\u009F" + // DEL + C1 controls
    "\\uE000-\\uF8FF" + // private use area: unmapped font glyphs
    "\\uFFF0-\\uFFFD" + // specials, incl. the replacement character
    "]",
  "g"
);

// Equations in PDFs are positioned glyphs with no logical reading order, so
// they extract as long runs of scrambled 1-2 char tokens ("2 1 3 1 * 9 3 5").
// The order is unrecoverable — the run carries no meaning — so collapse any
// long run of tiny/numeric tokens into a placeholder instead of embedding and
// displaying noise. Threshold of 8 keeps real prose safe: eight consecutive
// words of <=2 letters essentially never happens in sentences.
function collapseEquationRuns(line, minRun = 8) {
  const tokens = line.split(" ");
  const out = [];
  let run = [];

  const isMathy = (t) => t.length <= 2 || /^[\d\W]+$/.test(t);

  const flush = () => {
    if (run.length >= minRun) {
      if (out[out.length - 1] !== "[equation]") out.push("[equation]");
    } else {
      out.push(...run);
    }
    run = [];
  };

  for (const token of tokens) {
    if (token && isMathy(token)) {
      run.push(token);
    } else {
      flush();
      if (token) out.push(token);
    }
  }
  flush();

  return out.join(" ");
}

function cleanExtractedText(text) {
  return (
    text
      .replace(UNMAPPABLE_GLYPHS, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      // page markers ("-- 24 of 48 --") are what make excerpts verifiable —
      // fuse each into a single non-mathy token so the collapse can't eat it
      .replace(/--\s*(\d+)\s+of\s+(\d+)\s*--/g, "[page:$1/$2]")
      .split("\n")
      .map((line) => collapseEquationRuns(line))
      .join("\n")
      .trim()
  );
}

async function extractText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return cleanExtractedText(result.text);
}

module.exports = { extractText };
