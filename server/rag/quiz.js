require("dotenv").config();
const { GoogleGenAI, Type } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// A quiz has no single user question to embed, so we retrieve with a broad seed
// that pulls definitions, formulas, worked methods, and likely test material.
const QUIZ_RETRIEVAL_SEED =
  "core concepts, key definitions, important formulas, worked examples, common mistakes, and exam-style practice material";

// Structured output keeps the frontend simple and avoids regex-scraping prose.
const QUIZ_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      correctIndex: { type: Type.INTEGER },
      explanation: { type: Type.STRING },
      source: { type: Type.STRING },
    },
    required: ["question", "options", "correctIndex", "explanation", "source"],
  },
};

function buildQuizPrompt(matches, count) {
  const context = matches
    .map(
      (match, i) =>
        `[Note excerpt ${i + 1} from ${match.metadata.source}]\n${match.metadata.text}`
    )
    .join("\n\n");

  return `You are CampusLens, creating a fresh practice quiz from a student's uploaded course notes.

Use ONLY the concepts, definitions, formulas, and methods in the note excerpts below. Write up to ${count} multiple-choice questions that test real understanding, not memorization.

Question quality rules:
- Do not copy question stems from the notes. Reframe the concept in your own words.
- Prefer conceptual and method-transfer questions over trivia.
- For simple numeric problems, change the numbers to new plausible values and solve them carefully.
- For complex multi-step problems, keep the math manageable and double-check the answer before marking it correct.
- Avoid repeating the same concept across the quiz unless the excerpts only support one concept.
- Mix difficulty: mostly medium, with one easier confidence-builder when possible.

Answer rules:
- Exactly 4 options per question.
- Exactly one option is correct.
- Vary the correct option position. Do not always make it A.
- Distractors should be plausible mistakes a student might actually make.
- The explanation must be 2-4 concise sentences. It must say why the correct answer is correct, and when useful, mention the tempting mistake behind one distractor.
- For numeric questions, include the key formula and the final substitution, but do not write a full textbook solution.
- "source" is the filename the concept came from, using the filenames shown in brackets.
- If the excerpts do not support ${count} good questions, write fewer rather than padding with weak ones.

Note excerpts:
${context}`;
}

async function generateBatch(matches, count) {
  const prompt = buildQuizPrompt(matches, count);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: QUIZ_SCHEMA,
      // Higher temperature gives regenerated quizzes real variety.
      temperature: 1.0,
      // Bounded thinking helps with arithmetic without letting latency run wild.
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  let questions;
  try {
    questions = JSON.parse(response.text);
  } catch {
    throw new Error("The AI returned a quiz we couldn't read. Please try again.");
  }
  return Array.isArray(questions) ? questions : [];
}

// Questions are independent, so parallel batches reduce wall-clock time. Each
// batch sees a different slice of retrieved material to reduce duplicates.
const BATCH_SIZE = 2;

async function generateQuiz(matches, count) {
  const batchCount = Math.ceil(count / BATCH_SIZE);

  const slices = Array.from({ length: batchCount }, () => []);
  matches.forEach((match, i) => slices[i % batchCount].push(match));

  const sizes = Array.from({ length: batchCount }, (_, i) =>
    Math.min(BATCH_SIZE, count - i * BATCH_SIZE)
  );

  const batches = await Promise.all(
    sizes.map((size, i) =>
      slices[i].length > 0 ? generateBatch(slices[i], size) : []
    )
  );
  const questions = batches.flat();

  return questions
    .filter(
      (q) =>
        q &&
        typeof q.question === "string" &&
        Array.isArray(q.options) &&
        q.options.length >= 2
    )
    .map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex:
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex < q.options.length
          ? q.correctIndex
          : 0,
      explanation: typeof q.explanation === "string" ? q.explanation : "",
      source: typeof q.source === "string" ? q.source : "",
    }));
}

module.exports = { generateQuiz, QUIZ_RETRIEVAL_SEED };
