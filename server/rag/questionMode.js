// Broad "big picture" questions (summarize, what's on the exam, trickiest
// topic) don't embed near any single passage — similarity search starves and
// the weak-context guard fires even though the notes are fine. Detect them and
// retrieve with a broad seed instead, the same trick the quiz generator uses.
//
// Lives in its own module so the classifier can be tested directly rather than
// only through a route that needs a database and an API key.
const BROAD_RETRIEVAL_SEED =
  "core concepts, key definitions, important formulas, worked examples, main topics, and exam-style material";

const BROAD_PATTERN =
  /summar|overview|big idea|main idea|big picture|key (topic|concept|idea|point|takeaway)|main takeaway|what.*(cover|included|in (my|the|these) notes)|trickiest|hardest|most (difficult|important)|most likely.*(exam|test)|on the (exam|test)|what should i (study|focus|review|know)|study guide|explain.*concept/;

function isBroadQuestion(question) {
  if (typeof question !== "string") return false;
  return BROAD_PATTERN.test(question.toLowerCase());
}

module.exports = { BROAD_RETRIEVAL_SEED, isBroadQuestion };
