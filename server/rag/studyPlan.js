require("dotenv").config();
const { GoogleGenAI, Type } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// A study plan has no user question to embed, so use a broad seed that pulls
// representative course material across definitions, methods, and practice.
const PLAN_RETRIEVAL_SEED =
  "core topics, key concepts, definitions, formulas, worked problems, common mistakes, and exam revision material";

// The model returns day numbers only. The route maps those to calendar dates so
// deterministic date math stays in code, where it belongs.
const PLAN_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.INTEGER },
      focus: { type: Type.STRING },
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      sources: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
    },
    required: ["day", "focus", "tasks", "sources"],
  },
};

function buildPlanPrompt(matches, days, focus) {
  const context = matches
    .map(
      (match, i) =>
        `[Note excerpt ${i + 1} from ${match.metadata.source}]\n${match.metadata.text}`
    )
    .join("\n\n");

  const focusLine = focus
    ? `\nThe student specifically wants to focus on: ${focus}. Prioritize that area while still covering prerequisite ideas from the notes.\n`
    : "";

  return `You are CampusLens, building a realistic ${days}-day study plan from a student's uploaded notes.

Use ONLY the topics, concepts, formulas, examples, and problem types in the note excerpts below. Do not invent chapters, readings, or topics that are not supported by the excerpts.
${focusLine}
Plan quality rules:
- The plan should build logically: understand first, practice next, mixed review last.
- Early days should identify concepts, definitions, and formulas.
- Middle days should include practice, worked examples, and common mistakes.
- The final day must be light review and recap only. No new material the day before an exam.
- Avoid vague tasks like "review notes." Every task should tell the student what to actually do.
- Spread topics across days. Do not dump everything into day 1 or repeat the same focus every day.

Rules for every day:
- "day" is a number from 1 to ${days}. Produce exactly ${days} days, each day exactly once.
- "focus" is a short theme for the day, such as "Bayes and conditional probability."
- "tasks" is 2-4 short, concrete tasks. Mix reading, active recall, practice, and error review when the notes support it.
- Each task should be one line and start with an action verb, such as "Define", "Solve", "Compare", "Redo", "Summarize", or "Check".
- "sources" lists the filename(s) that day's material comes from, using the filenames shown in brackets.
- Only plan work the excerpts actually support.

Note excerpts:
${context}`;
}

// One Gemini call, deliberately not batched. Study-plan days depend on each
// other, so splitting them would hurt progression and create duplicate starts.
async function generateStudyPlan(matches, days, focus) {
  const prompt = buildPlanPrompt(matches, days, focus);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: PLAN_SCHEMA,
      thinkingConfig: { thinkingBudget: 1024 },
    },
  });

  let plan;
  try {
    plan = JSON.parse(response.text);
  } catch {
    throw new Error("The AI returned a plan we couldn't read. Please try again.");
  }
  if (!Array.isArray(plan)) return [];

  const seen = new Set();
  return plan
    .filter(
      (d) =>
        d &&
        Number.isInteger(d.day) &&
        d.day >= 1 &&
        d.day <= days &&
        typeof d.focus === "string" &&
        d.focus.trim() !== "" &&
        !seen.has(d.day) &&
        seen.add(d.day) !== undefined
    )
    .map((d) => ({
      day: d.day,
      focus: d.focus,
      tasks: Array.isArray(d.tasks)
        ? d.tasks.filter((t) => typeof t === "string")
        : [],
      sources: Array.isArray(d.sources)
        ? d.sources.filter((s) => typeof s === "string")
        : [],
    }))
    .sort((a, b) => a.day - b.day);
}

module.exports = { generateStudyPlan, PLAN_RETRIEVAL_SEED };
