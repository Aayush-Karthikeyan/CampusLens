// Answers greetings, small talk, and "what is this app" questions locally —
// no embedding call, no model call — so a "heyy" doesn't get embedded, score
// ~0.2 against the notes, and earn the weak-context refusal. Grounding rules
// on purpose: every pattern must match the ENTIRE normalized message, so
// "hi, what is a binary tree" matches nothing here and takes the grounded
// retrieval path. When in doubt this module returns null; it never guesses at
// course content. Rules instead of a classifier model because a model call
// would tax every real question with extra latency and tokens, and because an
// anchored regex cannot be talked into misclassifying — the failure mode is
// only ever "exotic greeting still gets the grounded refusal", which is safe.
//
// Lives in its own module (like questionMode.js) so it can be unit-tested
// without a database or an API key.

// A message longer than this cannot be small talk; skip the pattern checks
// before one is ever added that forgets its anchors.
const MAX_SMALL_TALK_LENGTH = 60;

// Stretch-tolerant greeting words ("heyy", "hiii") plus the fixed phrases.
// Apostrophes survive normalization, so both "what's up" and "whats up" appear.
const GREETING_WORD =
  "hi+|hey+o*|hiya+|hel+o+|yo+|sup+|howdy|wassup|wazzup|whats up|what's up|whatsup";
const GREETING_SUFFIX = "there|campuslens|campus lens|guys|everyone|all";

const LOCAL_ANSWERS = [
  {
    pattern: new RegExp(
      `^((${GREETING_WORD})( (${GREETING_SUFFIX}))?|good (morning|afternoon|evening))$`
    ),
    reply: "Hey, I'm here. Pick a PDF-shaped problem and let's make it less rude.",
  },
  {
    pattern:
      /^(thanks?( (a lot|so much|bro|man|campuslens))?|thank (you|u)( (so|very) much)?|thankyou|thx|ty|tysm|appreciate it)$/,
    reply: "Anytime. Academic suffering loves company, apparently.",
  },
  {
    // "peace" is deliberately absent — as a bare message it could be a real
    // query in a history course, and uncertain messages stay grounded
    pattern: /^(bye( bye)?|goodbye|see (you|ya)|cya|later|gtg|gn|good ?night)$/,
    reply:
      "Later. May your notes be searchable and your professors unusually merciful.",
  },
  {
    pattern:
      /^(how are you( doing| today)?|how r u|hru|how'?s it going|how is it going|how you doing|how do you do|what are you doing|what are you up to|whatcha doing|wyd|you good|you ok(ay)?)$/,
    reply:
      "All good — index is warm and your PDFs aren't going anywhere. Hand me a question from your notes and I'll earn my keep.",
  },
  {
    pattern:
      /^(who are you|who r u|what are you|what is this( app)?|what'?s this( app)?|what is campuslens|what'?s campuslens|who made you|who built you|are you (an ai|a bot|a robot|chatgpt|real))$/,
    reply:
      "I'm CampusLens — an AI tutor that answers strictly from the PDFs you upload, citations included. Ask me something your notes cover and I'll show you exactly where they say it.",
  },
  {
    // no overlap with questionMode's BROAD_PATTERN — "what should i study"
    // must keep its broad-retrieval behavior, so only "ask" is caught here
    pattern:
      /^(help( me)?|what can you do|what do you do|what can you help( me)? with|how do you work|how does this( app)? work|how do i use this|how to use this|what (can|should) i ask( you)?)$/,
    reply:
      "Upload PDFs to a course, then ask me about them — I answer only from your notes and cite the passage. There's also a quiz generator and a study planner in the course tabs. Try me on a topic from your upload.",
  },
];

// Returns the canned reply for a small-talk message, or null for anything that
// could be a content question — null sends the message down the grounded path.
function getLocalAnswer(question) {
  if (typeof question !== "string") return null;

  const compact = question
    .trim()
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!compact || compact.length > MAX_SMALL_TALK_LENGTH) return null;

  for (const { pattern, reply } of LOCAL_ANSWERS) {
    if (pattern.test(compact)) return reply;
  }
  return null;
}

module.exports = { getLocalAnswer };
