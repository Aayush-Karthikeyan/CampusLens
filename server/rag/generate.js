require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildPrompt(matches, question) {
  const context = matches
    .map((match, i) => `[Source ${i + 1}: ${match.metadata.source}]\n${match.metadata.text}`)
    .join("\n\n");

  const prompt = `You are a study assistant. Answer the question using ONLY the context below. If the context doesn't contain the answer, say so clearly. Cite which source number(s) you used.

Context:
${context}

Question: ${question}`;

  return prompt;
}

async function generateAnswer(prompt) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });
  return response.text;
}

module.exports = { buildPrompt, generateAnswer };