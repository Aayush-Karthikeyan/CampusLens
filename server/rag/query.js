require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");
const { embedText } = require("./embed");
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);

async function query(question, courseId, topK = 6) {
  const questionVector = await embedText(question);

  const results = await index.query({
    vector: questionVector,
    topK,
    includeMetadata: true,
    filter: { courseId: courseId },
  });

  return results.matches || [];
}

module.exports = { query };
