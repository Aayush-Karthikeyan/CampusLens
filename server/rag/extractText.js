const fs = require("fs");
const { PDFParse } = require("pdf-parse");

async function extractText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const parser = new PDFParse({ data: dataBuffer });
  const result = await parser.getText();
  return result.text;
}

module.exports = { extractText };