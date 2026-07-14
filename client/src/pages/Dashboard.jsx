import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiBookOpen,
  FiCalendar,
  FiCheckSquare,
  FiFileText,
  FiMessageSquare,
  FiPlus,
} from "react-icons/fi";
import { Logomark, SiteHeader } from "../components/SiteChrome";
import { createCourse, listCourses, listDocuments } from "../lib/api";

const ACTIONS = [
  {
    label: "Chat",
    to: "/chat",
    icon: FiMessageSquare,
    description: "Ask questions against your notes.",
  },
  {
    label: "Quiz",
    to: "/quiz",
    icon: FiCheckSquare,
    description: "Generate practice questions.",
  },
  {
    label: "Study Plan",
    to: "/study-plan",
    icon: FiCalendar,
    description: "Build a day-by-day plan.",
  },
];

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pluralizePdf(count) {
  return `${count} ${count === 1 ? "PDF" : "PDFs"}`;
}

function Dashboard() {
  const [courses, setCourses] = useState([]);
  const [documentCounts, setDocumentCounts] = useState({});
  const [newCourseName, setNewCourseName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const totalDocuments = useMemo(
    () =>
      courses.reduce(
        (total, course) => total + (documentCounts[course._id] ?? 0),
        0
      ),
    [courses, documentCounts]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      try {
        const loadedCourses = await listCourses();
        if (cancelled) return;

        setCourses(loadedCourses);

        const documentPairs = await Promise.all(
          loadedCourses.map(async (course) => {
            const docs = await listDocuments(course._id);
            return [course._id, docs.length];
          })
        );

        if (!cancelled) {
          setDocumentCounts(Object.fromEntries(documentPairs));
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateCourse(e) {
    e.preventDefault();
    const name = newCourseName.trim();
    if (!name) return;

    setCreating(true);
    setError(null);
    try {
      const course = await createCourse(name);
      setCourses((prev) => [course, ...prev]);
      setDocumentCounts((prev) => ({ ...prev, [course._id]: 0 }));
      setNewCourseName("");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-night text-cream">
      <SiteHeader />

      <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 pb-12 pt-32 md:px-8 lg:px-10">
        <section className="grid gap-10 border-b border-cream/10 pb-10 lg:grid-cols-[1fr_24rem] lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-ice">
              <Logomark className="h-6 w-6" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em]">
                CampusLens
              </p>
            </div>

            <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Your course cockpit.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-cream/62">
              Pick a course, jump into chat, generate a quiz, or build the study
              plan without wandering through the app like it owes you directions.
            </p>
          </div>

          <form
            onSubmit={handleCreateCourse}
            className="border border-cream/12 bg-cream/[0.035] p-5"
          >
            <label
              htmlFor="dashboard-course-name"
              className="text-xs font-medium uppercase tracking-[0.2em] text-red"
            >
              New course
            </label>
            <div className="mt-4 flex gap-3">
              <input
                id="dashboard-course-name"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="e.g. ENGG 319"
                className="min-w-0 flex-1 border border-cream/15 bg-night px-4 py-3 text-sm text-cream placeholder:text-cream/35 focus:border-ice focus:outline-none"
              />
              <button
                type="submit"
                disabled={creating || !newCourseName.trim()}
                className="flex h-12 w-12 shrink-0 items-center justify-center border border-ice text-ice transition-colors hover:bg-ice hover:text-night disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Create course"
              >
                <FiPlus aria-hidden="true" />
              </button>
            </div>
            <p className="mt-3 text-sm text-cream/45">
              Create it here, then upload PDFs from any tool page.
            </p>
          </form>
        </section>

        {error && (
          <p className="mt-6 border border-red/40 bg-red/10 px-4 py-3 text-sm text-red">
            {error}
          </p>
        )}

        <section className="grid gap-4 border-b border-cream/10 py-6 sm:grid-cols-3">
          <Stat label="Courses" value={loading ? "..." : courses.length} />
          <Stat label="Uploaded PDFs" value={loading ? "..." : totalDocuments} />
          <Stat label="Tools Ready" value="3" />
        </section>

        <section className="flex min-h-0 flex-1 flex-col py-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-red">
                Workspace
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                Courses
              </h2>
            </div>
            <p className="text-sm text-cream/45">
              {courses.length > 0
                ? "Choose your next move."
                : "Create a course to begin."}
            </p>
          </div>

          {loading ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse border border-cream/10 bg-cream/[0.025]"
                />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {courses.map((course) => (
                <CourseCard
                  key={course._id}
                  course={course}
                  documentCount={documentCounts[course._id] ?? 0}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-end justify-between border border-cream/10 px-5 py-4">
      <span className="text-xs uppercase tracking-[0.18em] text-cream/42">
        {label}
      </span>
      <span className="font-display text-3xl font-semibold text-ice">
        {value}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 flex min-h-80 flex-col items-center justify-center border border-dashed border-cream/18 px-6 text-center">
      <FiBookOpen className="h-10 w-10 text-ice" aria-hidden="true" />
      <h3 className="mt-5 font-display text-3xl font-semibold tracking-tight">
        No courses yet.
      </h3>
      <p className="mt-3 max-w-md text-cream/55">
        Make your first course above, then open any tool page to upload notes and
        let CampusLens do the useful part.
      </p>
    </div>
  );
}

function CourseCard({ course, documentCount }) {
  const hasDocuments = documentCount > 0;

  return (
    <article className="group flex min-h-72 flex-col border border-cream/10 bg-cream/[0.025] p-5 transition-colors hover:border-ice/45">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-cream/38">
            Created {formatDate(course.createdAt)}
          </p>
          <h3 className="mt-3 truncate font-display text-3xl font-semibold tracking-tight">
            {course.name}
          </h3>
        </div>
        <Logomark className="h-8 w-8 shrink-0 text-ice transition-transform duration-500 group-hover:rotate-180" />
      </div>

      <div className="mt-6 flex items-center gap-3 border border-cream/10 px-3 py-2.5 text-sm">
        <FiFileText className="h-4 w-4 shrink-0 text-ice" aria-hidden="true" />
        <span className={hasDocuments ? "text-cream/70" : "text-cream/42"}>
          {hasDocuments
            ? `${pluralizePdf(documentCount)} uploaded`
            : "No PDFs yet"}
        </span>
      </div>

      <div className="mt-auto pt-8">
        <div className="grid gap-2">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={`${action.to}?course=${course._id}`}
                className="flex items-center gap-3 border border-cream/12 px-3 py-3 text-sm text-cream/72 transition-colors hover:border-ice hover:bg-ice hover:text-night"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="font-medium uppercase tracking-wide">
                  {action.label}
                </span>
                <span className="ml-auto hidden text-xs normal-case tracking-normal opacity-70 sm:block">
                  {action.description}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export default Dashboard;
