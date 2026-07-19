import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ActionButton, Kicker } from "../components/ui";
import { generateQuiz } from "../lib/api";
import { useDocumentTitle } from "../lib/useDocumentTitle";

const COUNT_OPTIONS = [3, 5, 10];

function Quiz() {
  useDocumentTitle("Quiz");

  // course + documents come from the CourseWorkspace layout rail.
  const { activeCourse, documents } = useOutletContext();
  const activeCourseId = activeCourse?._id || null;

  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState("setup"); // setup | loading | active | results
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]); // selected option index per question
  const [error, setError] = useState(null);

  const score = useMemo(() => {
    if (phase !== "results") return 0;
    return questions.reduce(
      (total, q, i) => total + (answers[i] === q.correctIndex ? 1 : 0),
      0
    );
  }, [phase, questions, answers]);

  const allAnswered =
    questions.length > 0 && answers.every((a) => a !== null && a !== undefined);

  function resetToSetup() {
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setError(null);
  }

  async function handleGenerate() {
    if (!activeCourseId) return;
    setPhase("loading");
    setError(null);
    try {
      const { questions: qs } = await generateQuiz(activeCourseId, count);
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(null));
      setPhase("active");
    } catch (err) {
      setError(err.message);
      setPhase("setup");
    }
  }

  function selectOption(questionIndex, optionIndex) {
    if (phase !== "active") return;
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  // ---- no course selected ----
  if (!activeCourse) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="fade-up font-display text-3xl text-red">( quiz )</p>
        <h1 className="fade-up fade-up-1 mt-5 font-display text-6xl font-semibold tracking-tight md:text-7xl">
          Pick a course
        </h1>
        <p className="fade-up fade-up-2 mt-6 max-w-md text-cream/60">
          Choose a course from the rail to build a quiz from its material.
        </p>
      </main>
    );
  }

  // ---- setup / loading ----
  if (phase === "setup" || phase === "loading") {
    const hasDocs = documents.length > 0;
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
        <p className="fade-up font-display text-3xl text-red">( quiz )</p>
        <h1 className="fade-up fade-up-1 mt-5 font-display text-6xl font-semibold tracking-tight md:text-7xl">
          {activeCourse.name}
        </h1>
        <p className="fade-up fade-up-2 mt-6 max-w-md text-cream/60">
          {hasDocs
            ? "Test yourself before the exam does — every question drawn straight from your uploads, no internet trivia."
            : "Upload a PDF for this course first, then I can build you a quiz from it."}
        </p>

        {hasDocs && (
          <>
            <div className="fade-up fade-up-3 mt-10 flex items-center gap-3">
              <span className="text-sm text-cream/50">Questions:</span>
              {COUNT_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={
                    "h-10 w-12 border text-sm transition-colors " +
                    (count === n
                      ? "border-ice bg-ice text-night"
                      : "border-cream/20 text-cream/70 hover:border-ice hover:text-ice")
                  }
                >
                  {n}
                </button>
              ))}
            </div>

            <ActionButton
              onClick={handleGenerate}
              disabled={phase === "loading"}
              className="fade-up fade-up-3 mt-8 px-8 py-3"
            >
              {phase === "loading" ? "Building your quiz…" : "Generate quiz"}
            </ActionButton>
          </>
        )}

        {error && <p className="mt-6 max-w-md text-sm text-red">{error}</p>}
      </main>
    );
  }

  // ---- active quiz / results ----
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {phase === "results" ? (
          // the graded paper: the page's one cream inversion, landing-style
          <div className="fade-up flex items-end justify-between gap-6 bg-cream px-6 py-5 text-night">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Results · {activeCourse.name}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                {score === questions.length
                  ? "Perfect run."
                  : score >= questions.length / 2
                    ? "Solid work."
                    : "Room to grow."}
              </h1>
            </div>
            <p className="shrink-0 font-display text-7xl font-extrabold leading-none md:text-8xl">
              {score}
              <span className="text-4xl font-semibold text-night/40 md:text-5xl">
                /{questions.length}
              </span>
            </p>
          </div>
        ) : (
          <div>
            <Kicker>Quiz · {activeCourse.name}</Kicker>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              {questions.length} questions
            </h1>
          </div>
        )}

        <ol className="mt-10 flex flex-col gap-10">
          {questions.map((q, qi) => {
            const selected = answers[qi];
            const graded = phase === "results";
            return (
              <li key={qi} className="flex gap-5">
                {/* ghosted display numeral — the landing's chapter-number motif */}
                <span
                  aria-hidden="true"
                  className="w-12 shrink-0 text-right font-display text-4xl font-extrabold leading-none text-cream/12"
                >
                  {String(qi + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-relaxed">{q.question}</p>

                  <div className="mt-4 flex flex-col gap-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = selected === oi;
                      const isCorrect = q.correctIndex === oi;

                      // during the quiz the pick is cream; after grading, ice
                      // marks correct and red marks a wrong pick — palette only
                      let cls =
                        "border-cream/15 text-cream/80 hover:border-cream/60";
                      if (graded) {
                        if (isCorrect)
                          cls = "border-ice bg-ice/10 text-cream";
                        else if (isSelected)
                          cls = "border-red bg-red/10 text-cream";
                        else cls = "border-cream/10 text-cream/50";
                      } else if (isSelected) {
                        cls = "border-cream bg-cream/10 text-cream";
                      }

                      return (
                        <button
                          key={oi}
                          onClick={() => selectOption(qi, oi)}
                          disabled={graded}
                          className={
                            "flex items-center gap-3 border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default " +
                            cls
                          }
                        >
                          <span className="shrink-0 text-xs uppercase text-cream/40">
                            {String.fromCharCode(65 + oi)}
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {graded && (
                    <div className="mt-3 border-l-2 border-cream/15 pl-4 text-sm text-cream/60">
                      {q.explanation && <p>{q.explanation}</p>}
                      {q.source && (
                        <p className="mt-1 text-xs uppercase tracking-wide text-cream/35">
                          Source: {q.source}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex items-center gap-4">
          {phase === "active" ? (
            <ActionButton
              onClick={() => setPhase("results")}
              disabled={!allAnswered}
              className="px-8 py-3"
            >
              {allAnswered ? "Submit quiz" : "Answer all questions"}
            </ActionButton>
          ) : (
            <ActionButton onClick={resetToSetup} className="px-8 py-3">
              New quiz
            </ActionButton>
          )}
        </div>
      </div>
    </main>
  );
}

export default Quiz;
