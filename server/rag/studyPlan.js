require("dotenv").config();
const { GoogleGenAI, Type } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Like the quiz, a study plan has no single "question" to embed, so we retrieve
// with a broad seed that pulls the most representative chunks across the course.
const PLAN_RETRIEVAL_SEED =
  "core topics, key concepts, definitions, formulas, worked problems, and everything a student needs to revise for an exam";

// Structured-output schema. Note there is no `date` field: the model returns day
// NUMBERS only and the route maps them to real calendar dates. LLMs are
// unreliable at date arithmetic and there is no reason to risk it here.
const PLAN_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.INTEGER }, // 1-based
      focus: { type: Type.STRING }, // the theme for that day
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      sources: {
        type: Type.ARRAY,
        items: { type: Type.STRING }, // filenames the day draws from
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
    ? `\nThe student specifically wants to focus on: ${focus}. Weight the plan toward that, but still cover the fundamentals it depends on.\n`
    : "";

  return `You are CampusLens, building a realistic ${days}-day study plan for a student revising for an exam.

Use ONLY the topics, concepts, and problems in the note excerpts below. Do not invent material the notes don't cover.
${focusLine}
Structure the plan so it actually builds:
- Early days: learn and understand the core concepts.
- Middle days: practice problems and apply the methods.
- The final day: light review and recap only — no new material the day before an exam.
- Spread topics sensibly. Don't cram everything into day 1 or repeat the same topic every day.

Rules for every day:
- "day" is the day number, from 1 to ${days}. Produce exactly ${days} days, numbered 1 through ${days}, each exactly once.
- "focus" is a short theme for the day (a few words, e.g. "Conditional probability & Bayes").
- "tasks" is 2-4 SHORT, concrete, actionable items (e.g. "Work through the 3 seating-arrangement problems"). Keep each task to one line — long tasks make the plan slow to generate and painful to read.
- "sources" lists the filename(s) that day's material comes from (shown in brackets above).
- Only plan work the excerpts actually support.

Note excerpts:
${context}`;
}

// One Gemini call — deliberately NOT batched in parallel like the quiz is.
// Quiz questions are independent, so parallel batches are a pure latency win.
// Study-plan days are sequential and interdependent (day 3 builds on day 1, the
// last day is a recap), so splitting the plan across parallel calls would break
// the progression and duplicate topics. Output here is small (concise tasks,
// <= 14 days), so a single call stays fast.
async function generateStudyPlan(matches, days, focus) {
  const prompt = buildPlanPrompt(matches, days, focus);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: PLAN_SCHEMA,
      // Some thinking budget: sequencing topics sensibly across days is exactly
      // the kind of ordering task that benefits from it.
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

  // Defensive: keep only well-formed days, drop out-of-range/duplicate day
  // numbers, and re-sort — so a bad model response can never crash the UI.
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
      tasks: Array.isArray(d.tasks) ? d.tasks.filter((t) => typeof t === "string") : [],
      sources: Array.isArray(d.sources)
        ? d.sources.filter((s) => typeof s === "string")
        : [],
    }))
    .sort((a, b) => a.day - b.day);
}

module.exports = { generateStudyPlan, PLAN_RETRIEVAL_SEED };
