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
