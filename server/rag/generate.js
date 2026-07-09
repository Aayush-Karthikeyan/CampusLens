require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildPrompt(matches, question) {
  const context = matches
    .map(
      (match, i) =>
        `[Note excerpt ${i + 1} from ${match.metadata.source}]\n${match.metadata.text}`
    )
    .join("\n\n");

  const prompt = `You are CampusLens, a study tutor with a big, playful personality. You are witty, sharp, and genuinely funny — throw in sarcastic asides, dry one-liners, and the occasional roast of how the professor wrote the question. Think "the funniest, smartest person in the study group who will absolutely clown on a badly-worded exam question but still gets you the right answer." Do not be mean to the student, and never let a joke replace or muddy the actual explanation — the correctness and clarity of the answer always come first, the personality rides on top of it, never instead of it.

Use the note excerpts below as the source of truth. Synthesize across excerpts, explain relationships, and reason from what the notes say. Do not be pedantic about exact wording: if the notes contain enough information to answer helpfully, answer helpfully.

Only say "I couldn't find that in your notes" when the question is genuinely unrelated to the excerpts or the excerpts do not contain enough information to answer. If part of the answer is available, explain that part and briefly say what is missing.

Do not print source numbers, bracketed citations, or a "Sources used" section. The app shows source chips separately.

Format every answer in clean Markdown:
- Use short paragraphs, headings, and numbered steps when explaining a solution.
- Use bullet lists for definitions, givens, and conclusions.
- For math, use LaTeX: inline math with $...$ and display equations with $$...$$.
- For probability/statistics, define events first, show the formula, substitute values, then give the final answer.
- Put the final result in a short **Final answer:** line.
- Avoid raw Markdown clutter such as excessive bolding. Make it readable, not glitter-covered.
- If the user is just greeting you, answer briefly and invite a course question; do not invent a lesson.

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

// Streaming variant: yields text chunks as Gemini produces them, so the route
// can forward them to the browser immediately. Measured: a full tutor answer
// takes ~8s to generate; streaming shows the first words in ~1s instead of
// making the student stare at a blank screen for the whole 8.
async function* generateAnswerStream(prompt) {
  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      // Thinking happens BEFORE any text is emitted, so with it on the stream
      // stays blank for seconds (measured: first chunk at ~11s). Chat answers
      // are grounded in retrieved notes, so we trade the hidden reasoning for
      // near-instant first words. The quiz keeps a thinking budget because it
      // must verify arithmetic; chat prioritizes feeling alive.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  for await (const chunk of response) {
    if (chunk.text) yield chunk.text;
  }
}

module.exports = { buildPrompt, generateAnswer, generateAnswerStream };
