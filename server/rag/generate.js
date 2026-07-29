require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// How much hidden reasoning the model may spend before answering. 0 disables
// thinking entirely (fastest first word, noticeably weaker multi-step math);
// higher spends more tokens and a few more seconds for better derivations.
// Env-tunable so it can be dialled from the host dashboard without a code change.
const THINKING_BUDGET = Number(process.env.CHAT_THINKING_BUDGET ?? 1024);

// Chat used to answer every message cold — no memory of the thread — so
// follow-ups like "so no example 11?" or "explain that one" had nothing to
// anchor to. Feed back a few recent turns, truncated so a long answer can't
// crowd out the retrieved notes.
const HISTORY_MESSAGES = 6;
const HISTORY_CHAR_CAP = 700;

function formatHistory(messages) {
  const recent = (Array.isArray(messages) ? messages : [])
    .slice(-HISTORY_MESSAGES)
    .filter((message) => message?.text);

  if (recent.length === 0) return "";

  const lines = recent.map((message) => {
    const who = message.role === "user" ? "Student" : "CampusLens";
    const text =
      message.text.length > HISTORY_CHAR_CAP
        ? `${message.text.slice(0, HISTORY_CHAR_CAP)}…`
        : message.text;
    return `${who}: ${text}`;
  });

  return `\n\nConversation so far (oldest first). Use it to resolve follow-up references like "it", "that example", or "the second one" — but keep answering from the note excerpts, not from memory of your own previous wording:\n${lines.join(
    "\n"
  )}`;
}

function buildPrompt(matches, question, history = []) {
  const context = matches
    .map(
      (match, i) =>
        `[Note excerpt ${i + 1} from ${match.metadata.source}]\n${match.metadata.text}`
    )
    .join("\n\n");

  const prompt = `You are CampusLens, a grounded AI study tutor for course notes. Your voice is clear, warm, sharp, and lightly witty. Use dry humor only when it helps the student stay engaged. Never let a joke replace the explanation. Never insult the student. If a question or professor wording is confusing, you may gently point that out, then solve it properly.

Use the note excerpts below as the source of truth. Synthesize across excerpts, explain relationships, and reason from what the notes say. Do not be pedantic about exact wording: if the notes contain enough information to answer helpfully, answer helpfully.

Only say "I couldn't find that in your notes" when the question is genuinely unrelated to the excerpts or the excerpts do not contain enough information to answer. If part of the answer is available, explain that part and briefly say what is missing.

Do not print source numbers, bracketed citations, or a "Sources used" section. The app shows source chips separately.

Format every answer in clean Markdown:
- Use short paragraphs, headings, and numbered steps when explaining a solution.
- Use bullet lists for definitions, givens, and conclusions.
- For math, use LaTeX: inline math with $...$ and display equations with $$...$$.
- For probability/statistics, define events first, show the formula, substitute values, then give the final answer.
- If the question asks for a solution, use this shape when possible: **What we know**, **Method**, **Work**, **Final answer**.
- If the question asks for a summary, make compact study notes with the most testable points first.
- If the question asks for a definition, give the definition, a tiny example, and why it matters.
- Put the final result in a short **Final answer:** line.
- Avoid raw Markdown clutter such as excessive bolding. Make it readable, not glitter-covered.
- Keep the tone confident and useful. One small witty aside is fine; three is homework theater.
- If the user is just greeting you, answer briefly and invite a course question; do not invent a lesson.

Context:
${context}${formatHistory(history)}

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
// takes about 8s to generate; streaming shows the first words in about 1s.
async function* generateAnswerStream(prompt) {
  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      // Thinking happens before any text is emitted, so the stream stays blank
      // while the model reasons. That cost buys correct multi-step derivations,
      // which is the whole job for course material — and the UI already covers
      // the gap with a "reading your notes…" indicator.
      thinkingConfig: { thinkingBudget: THINKING_BUDGET },
    },
  });
  for await (const chunk of response) {
    if (chunk.text) yield chunk.text;
  }
}

module.exports = { buildPrompt, generateAnswer, generateAnswerStream };
