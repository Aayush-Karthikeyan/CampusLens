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

function cleanExtractedText(text) {
  return text
    .replace(UNMAPPABLE_GLYPHS, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return cleanExtractedText(result.text);
}

module.exports = { extractText };
