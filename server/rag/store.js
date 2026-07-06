require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");
const { extractText } = require("./extractText");
const { chunkText } = require("./chunkText");
const { embedText } = require("./embed");
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);
async function storePDF(filePath, courseId, sourceName) {
  const text = await extractText(filePath);
  const chunks = chunkText(text);
  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedText(chunks[i]);
    vectors.push({
      id: `${filePath}-chunk-${i}`,
      values: embedding,
      metadata: { text: chunks[i], courseId: courseId, source: sourceName, chunkIndex: i },
    });
    console.log(`Embedded chunk ${i + 1}/${chunks.length}`);
  }
  console.log("Vectors ready:", vectors.length);
  console.log("First vector id:", vectors[0]?.id);
  console.log("First values type:", Array.isArray(vectors[0]?.values), vectors[0]?.values?.length);
    await index.upsert({ records: vectors });
  console.log("Stored all vectors in Pinecone");
}
module.exports = { storePDF };