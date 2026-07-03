require("dotenv").config();
const { Pinecone } = require("@pinecone-database/pinecone");
const { embedText } = require("./embed");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX);

async function query(question) {
  const questionVector = await embedText(question);

  const results = await index.query({
    vector: questionVector,
    topK: 3,
    includeMetadata: true,
  });

  results.matches.forEach((match, i) => {
    console.log(`\nMatch ${i + 1} (score: ${match.score})`);
    console.log(match.metadata.text);
  });
}

async function test() {
  await query("How do I delete the last node?");
}

test();