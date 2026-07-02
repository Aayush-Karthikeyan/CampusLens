const { extractText } = require("./extractText");
function chunkText(text, chunkSize = 500, overlap = 50) {
    const chunks = [];
    let start = 0;

    while (start < text.length) {
        const end = start + chunkSize;
        chunks.push(text.slice(start, end));
        start = end - overlap;
    }

    return chunks;

}
async function test() {
  const text = await extractText("./sample-pdfs/Circular LInked List.pdf");
  const chunks = chunkText(text);
  console.log("Number of chunks:", chunks.length);
  console.log("First chunk:", chunks[0]);
}

test();

module.exports = { chunkText };