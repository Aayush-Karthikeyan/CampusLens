require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");
const { extractText } = require("./extractText");
const { chunkText } = require("./chunkText");
const { embedText } = require("./embed");
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);
async function storePDF(filePath, courseId, sourceName, documentId = null) {
  const text = await extractText(filePath);
  const chunks = chunkText(text);

  // A scanned or image-only PDF has no text layer, so extraction yields nothing
  // and there's nothing to embed. Fail clearly instead of upserting an empty
  // vector list (which Pinecone rejects) or silently storing a doc with 0 chunks.
  if (chunks.length === 0) {
    const err = new Error(
      "Couldn't read any text from this PDF. It looks scanned or image-only — try a PDF with selectable text."
    );
    err.code = "NO_TEXT";
    throw err;
  }

  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i]);
    vectors.push({
      id: `${filePath}-chunk-${i}`,
      values: embedding,
      metadata: {
        text: chunks[i],
        courseId: courseId,
        ...(documentId ? { documentId: String(documentId) } : {}),
        source: sourceName,
        chunkIndex: i,
      },
    });
  }
  await index.upsert({ records: vectors });
  console.log(`Stored ${vectors.length} chunks for "${sourceName}"`);
}
module.exports = { storePDF };
