require("dotenv").config();
const { GoogleGenAI, Type } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// A quiz has no single "question" to embed, so we retrieve with a broad seed that
// pulls the most representative chunks (definitions, formulas, core ideas). This
// is a v1 coverage shortcut — a fuller version would sample evenly across the
// whole document rather than lean on one semantic query.
const QUIZ_RETRIEVAL_SEED =
  "core concepts, key definitions, important formulas, main ideas, and things a student would be tested on";

// Structured-output schema. We ask Gemini to return JSON in exactly this shape so
// the frontend gets a reliable object instead of us regex-scraping prose.
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
      correctIndex: { type: Type.INTEGER }, // 0-based index into options
      explanation: { type: Type.STRING },
      source: { type: Type.STRING }, // filename the question was drawn from
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

  return `You are CampusLens, writing a fresh practice quiz to help a student study.

Using ONLY the concepts, definitions, and methods in the note excerpts below, write exactly ${count} multiple-choice questions that test whether the student truly understands this material.

Do NOT simply copy questions that already appear in the notes. Test the underlying concept in a new way:
- Reword every question in your own words — never reprint a stem verbatim from the excerpts.
- For simple or single-step numeric problems, CHANGE the numbers to new plausible values so the student practises the method instead of memorising one answer.
- For complex multi-step problems, you may keep the original values (re-deriving new numbers risks arithmetic mistakes), but still reword the framing.
- Whenever you use numbers, solve the problem step by step and double-check your arithmetic BEFORE choosing the correct option. The answer you mark correct must actually be correct.

Rules for every question:
- Exactly 4 options. Exactly one is correct.
- "correctIndex" is the 0-based position of the correct option (0, 1, 2, or 3).
- Vary the position of the correct answer across questions — do not always make it option 0.
- Wrong options must be plausible and related to the topic (e.g. the result of a common mistake), not obviously silly.
- "explanation" shows why the correct answer is right, including the working for numeric questions.
- "source" is the filename the concept was drawn from (shown in brackets above).
- Only test concepts the excerpts actually support. If there isn't enough material for ${count} good questions, write fewer.

Note excerpts:
${context}`;
}

async function generateQuiz(matches, count) {
  const prompt = buildQuizPrompt(matches, count);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: QUIZ_SCHEMA,
      // Higher temperature so regenerating a quiz for the same course gives
      // genuinely different questions instead of the same set every time.
      temperature: 1.0,
    },
  });

  let questions;
  try {
    questions = JSON.parse(response.text);
  } catch {
    throw new Error("The AI returned a quiz we couldn't read. Please try again.");
  }

  // Defensive: only keep well-formed questions, and clamp correctIndex into range
  // so a bad model response can never crash the frontend.
  return (Array.isArray(questions) ? questions : [])
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
