require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Single-text embed — used to embed a user's question at query time.
async function embedText(text) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });
  return response.embeddings[0].values;
}

// Batch embed — one HTTP call for many chunks. Used when ingesting a PDF so a
// dense document is a handful of requests instead of one-per-chunk (which was
// both slow and prone to tripping the per-minute rate limit mid-upload). The
// SDK returns embeddings in input order, one per text.
async function embedTexts(texts) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: texts,
  });
  return response.embeddings.map((embedding) => embedding.values);
}

module.exports = { embedText, embedTexts };
