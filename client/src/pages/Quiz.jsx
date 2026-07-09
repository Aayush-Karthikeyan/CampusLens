import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { generateQuiz } from "../lib/api";

const COUNT_OPTIONS = [3, 5, 10];

function Quiz() {
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
        <p className="text-xs uppercase tracking-[0.2em] text-red">Quiz</p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">
          Pick a course
        </h1>
        <p className="mt-6 max-w-md text-cream/60">
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
        <p className="text-xs uppercase tracking-[0.2em] text-red">Quiz</p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">
          {activeCourse.name}
        </h1>
        <p className="mt-6 max-w-md text-cream/60">
          {hasDocs
            ? "Generate a practice quiz drawn straight from your uploaded material — no internet trivia, just what you'll be tested on."
            : "Upload a PDF for this course first, then I can build you a quiz from it."}
        </p>

        {hasDocs && (
          <>
            <div className="mt-10 flex items-center gap-3">
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

            <button
              onClick={handleGenerate}
              disabled={phase === "loading"}
              className="mt-8 border border-ice px-8 py-3 text-sm font-medium uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === "loading" ? "Building your quiz…" : "Generate quiz"}
            </button>
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
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red">
              Quiz · {activeCourse.name}
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              {phase === "results" ? "Results" : `${questions.length} questions`}
            </h1>
          </div>
          {phase === "results" && (
            <p className="font-display text-4xl font-semibold text-ice">
              {score}
              <span className="text-cream/40">/{questions.length}</span>
            </p>
          )}
        </div>

        <ol className="mt-10 flex flex-col gap-10">
          {questions.map((q, qi) => {
            const selected = answers[qi];
            const graded = phase === "results";
            return (
              <li key={qi}>
                <p className="font-medium leading-relaxed">
                  <span className="mr-2 text-cream/40">{qi + 1}.</span>
                  {q.question}
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  {q.options.map((opt, oi) => {
                    const isSelected = selected === oi;
                    const isCorrect = q.correctIndex === oi;

                    // color logic: during the quiz, only highlight the pick;
                    // after grading, mark correct green and a wrong pick red.
                    let cls =
                      "border-cream/15 text-cream/80 hover:border-ice/60";
                    if (graded) {
                      if (isCorrect)
                        cls = "border-emerald-400/70 bg-emerald-400/10 text-cream";
                      else if (isSelected)
                        cls = "border-red bg-red/10 text-cream";
                      else cls = "border-cream/10 text-cream/50";
                    } else if (isSelected) {
                      cls = "border-ice bg-ice/10 text-cream";
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
              </li>
            );
          })}
        </ol>

        <div className="mt-12 flex items-center gap-4">
          {phase === "active" ? (
            <button
              onClick={() => setPhase("results")}
              disabled={!allAnswered}
              className="border border-ice px-8 py-3 text-sm font-medium uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night disabled:cursor-not-allowed disabled:opacity-50"
            >
              {allAnswered ? "Submit quiz" : "Answer all questions"}
            </button>
          ) : (
            <button
              onClick={resetToSetup}
              className="border border-ice px-8 py-3 text-sm font-medium uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night"
            >
              New quiz
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default Quiz;
