require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");
const { extractText } = require("./extractText");
const { chunkText } = require("./chunkText");
const { embedTexts } = require("./embed");
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);

// Process chunks in slices: one batched embed call + one upsert per slice.
// Keeps requests off the per-minute rate limit and each upsert under Pinecone's
// ~2 MB request cap (a single upsert of a large PDF's vectors would exceed it).
const BATCH_SIZE = 50;

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

  for (let start = 0; start < chunks.length; start += BATCH_SIZE) {
    const slice = chunks.slice(start, start + BATCH_SIZE);
    const embeddings = await embedTexts(slice);
    const records = slice.map((chunkTextValue, i) => ({
      id: `${filePath}-chunk-${start + i}`,
      values: embeddings[i],
      metadata: {
        text: chunkTextValue,
        courseId: courseId,
        ...(documentId ? { documentId: String(documentId) } : {}),
        source: sourceName,
        chunkIndex: start + i,
      },
    }));
    await index.upsert({ records });
  }

  console.log(`Stored ${chunks.length} chunks for "${sourceName}"`);
}
module.exports = { storePDF };
