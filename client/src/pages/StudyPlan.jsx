import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ActionButton, Field, Kicker } from "../components/ui";
import { generateStudyPlan, getStudyPlan, toggleStudyTask } from "../lib/api";
import { useDocumentTitle } from "../lib/useDocumentTitle";

// yyyy-mm-dd for <input type="date">, in local time (toISOString would shift
// the day for anyone behind UTC).
function toDateInput(date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function formatDay(dateish) {
  return new Date(dateish).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function daysUntil(dateish) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exam = new Date(dateish);
  const examDay = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate());
  return Math.round((examDay - today) / (24 * 60 * 60 * 1000));
}

function StudyPlan() {
  useDocumentTitle("Study Plan");

  // course + documents come from the CourseWorkspace layout rail.
  const { activeCourse, documents } = useOutletContext();
  const activeCourseId = activeCourse?._id || null;

  const [plan, setPlan] = useState(null);
  const [examDate, setExamDate] = useState(toDateInput(tomorrow()));
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false); // regenerating over an existing plan
  const [error, setError] = useState(null);

  // load this course's saved plan (if any) whenever the course changes
  useEffect(() => {
    if (!activeCourseId) return;

    let cancelled = false;
    getStudyPlan(activeCourseId)
      .then((saved) => {
        if (cancelled) return;
        setPlan(saved);
        setEditing(false);
        setError(null);
        if (saved?.examDate) setExamDate(toDateInput(new Date(saved.examDate)));
        if (saved?.focus) setFocus(saved.focus);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourseId]);

  async function handleGenerate() {
    if (!activeCourseId) return;
    setLoading(true);
    setError(null);
    try {
      const saved = await generateStudyPlan(activeCourseId, examDate, focus);
      setPlan(saved);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Tick a task off. Update the UI immediately, then persist — and roll back if
  // the save fails, so a checkbox can never lie about what's actually stored.
  async function handleToggleTask(day, taskIndex) {
    const current = plan.days.find((d) => d.day === day)?.tasks[taskIndex];
    if (!current) return;

    const setDone = (value) =>
      setPlan((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.day === day
            ? {
                ...d,
                tasks: d.tasks.map((t, i) =>
                  i === taskIndex ? { ...t, done: value } : t
                ),
              }
            : d
        ),
      }));

    const next = !current.done;
    setDone(next);
    try {
      await toggleStudyTask(activeCourseId, day, taskIndex, next);
    } catch (err) {
      setDone(current.done); // revert
      setError(err.message);
    }
  }

  // ---- no course selected ----
  if (!activeCourse) {
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
        <Kicker>Study Plan</Kicker>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">
          Pick a course
        </h1>
        <p className="mt-6 max-w-md text-cream/60">
          Choose a course from the rail to build a study plan from its material.
        </p>
      </main>
    );
  }

  // ---- setup (no saved plan yet, or regenerating) ----
  if (!plan || editing) {
    const hasDocs = documents.length > 0;
    return (
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-10 text-center">
        <Kicker>Study Plan</Kicker>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight">
          {activeCourse.name}
        </h1>
        <p className="mt-6 max-w-md text-cream/60">
          {hasDocs
            ? "Tell me when the exam is and I'll build a day-by-day plan from your actual notes — not a generic template."
            : "Upload a PDF for this course first, then I can build you a plan from it."}
        </p>

        {hasDocs && (
          <>
            <div className="mt-10 flex flex-col items-center gap-5">
              <label className="flex flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-cream/50">
                  Exam date
                </span>
                <Field
                  type="date"
                  value={examDate}
                  min={toDateInput(tomorrow())}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="px-4 py-2.5"
                />
              </label>

              <label className="flex w-full max-w-md flex-col items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-cream/50">
                  Focus on (optional)
                </span>
                <Field
                  type="text"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="e.g. probability and Bayes' theorem"
                  className="w-full px-4 py-2.5 text-center"
                />
              </label>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <ActionButton
                onClick={handleGenerate}
                disabled={loading || !examDate}
                className="px-8 py-3"
              >
                {loading ? "Building your plan…" : "Generate plan"}
              </ActionButton>
              {plan && !loading && (
                <button
                  onClick={() => setEditing(false)}
                  className="text-sm uppercase tracking-wide text-cream/50 transition-colors hover:text-cream"
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}

        {error && <p className="mt-6 max-w-md text-sm text-red">{error}</p>}
      </main>
    );
  }

  // ---- saved plan ----
  const countdown = daysUntil(plan.examDate);
  const totalTasks = plan.days.reduce((n, d) => n + d.tasks.length, 0);
  const doneTasks = plan.days.reduce(
    (n, d) => n + d.tasks.filter((t) => t.done).length,
    0
  );
  // only worth naming sources when the course actually has more than one PDF
  const showSources = documents.length > 1;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-baseline justify-between gap-6">
          <div>
            <Kicker>Study Plan · {activeCourse.name}</Kicker>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Your {plan.days.length}-day plan
            </h1>
            <p className="mt-2 text-sm text-cream/50">
              Exam: {formatDay(plan.examDate)}
              {plan.focus && ` · Focus: ${plan.focus}`}
            </p>
            <p className="mt-1 text-sm text-cream/40">
              {doneTasks} of {totalTasks} tasks done
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-4xl font-semibold text-ice">
              {countdown > 0 ? countdown : 0}
            </p>
            <p className="text-xs uppercase tracking-wide text-cream/40">
              {countdown === 1 ? "day to exam" : "days to exam"}
            </p>
          </div>
        </div>

        <ol className="mt-10 flex flex-col gap-8">
          {plan.days.map((d) => (
            <li key={d.day} className="border-l-2 border-cream/15 pl-5">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-lg font-semibold text-ice">
                  Day {d.day}
                </span>
                <span className="text-xs uppercase tracking-wide text-cream/40">
                  {formatDay(d.date)}
                </span>
              </div>

              <h2 className="mt-1 font-medium leading-relaxed">{d.focus}</h2>

              {d.tasks.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {d.tasks.map((task, i) => (
                    <li key={i}>
                      <button
                        onClick={() => handleToggleTask(d.day, i)}
                        className="group flex w-full items-start gap-3 text-left text-sm"
                      >
                        <span
                          aria-hidden="true"
                          className={
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[10px] font-bold transition-colors " +
                            (task.done
                              ? "border-ice bg-ice text-night"
                              : "border-cream/30 text-transparent group-hover:border-ice")
                          }
                        >
                          ✓
                        </span>
                        <span
                          className={
                            "transition-colors " +
                            (task.done
                              ? "text-cream/35 line-through"
                              : "text-cream/75 group-hover:text-cream")
                          }
                        >
                          {task.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showSources && d.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.sources.map((src, i) => (
                    <span
                      key={i}
                      className="border border-cream/15 px-2.5 py-1 text-xs text-cream/50"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-12">
          <ActionButton onClick={() => setEditing(true)} className="px-8 py-3">
            Regenerate plan
          </ActionButton>
        </div>
      </div>
    </main>
  );
}

export default StudyPlan;
