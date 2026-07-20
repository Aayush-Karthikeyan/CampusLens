import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { Logomark, SiteHeader } from "../components/SiteChrome";
import { ActionButton, Field, Kicker } from "../components/ui";
import { useConfirm } from "../lib/useConfirm";
import {
  createCourse,
  deleteCourse,
  deleteDocument,
  listCourses,
  listDocuments,
  uploadPdf,
} from "../lib/api";

const ACTIVE_COURSE_KEY = "campuslens:activeCourse";

// Shared layout for the app tools (Chat / Quiz / Study Plan). Owns the course +
// document rail so the three tools don't each re-implement it, and so switching
// between them keeps the selected course (this component stays mounted across
// its child routes). The active course lives in state, not the URL; a one-time
// ?course=<id> seed lets the Dashboard deep-link into a specific course.
function CourseWorkspace() {
  const [searchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  // The active course lives in state, not the URL — but the header nav links to
  // /chat, /quiz, /study-plan without the ?course= param, so a refresh after
  // switching tools would otherwise lose it. Seed from the deep-link param if
  // present, else from the last course we persisted.
  const [activeCourseId, setActiveCourseId] = useState(
    () => searchParams.get("course") || localStorage.getItem(ACTIVE_COURSE_KEY)
  );
  const [documents, setDocuments] = useState([]);

  const [creating, setCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [railError, setRailError] = useState(null);

  const fileInputRef = useRef(null);
  const { confirm, confirmDialog } = useConfirm();

  // portal target below Documents: tools with rail-worthy lists (Chat's saved
  // chats) render into it instead of stacking a second sidebar
  const [railSlot, setRailSlot] = useState(null);

  const activeCourse = useMemo(
    () => courses.find((course) => course._id === activeCourseId) || null,
    [courses, activeCourseId]
  );
  const visibleDocuments = useMemo(
    () =>
      activeCourseId
        ? documents.filter((doc) => String(doc.course) === activeCourseId)
        : [],
    [documents, activeCourseId]
  );

  // remember the active course across refreshes / tool switches
  useEffect(() => {
    if (activeCourseId) localStorage.setItem(ACTIVE_COURSE_KEY, activeCourseId);
    else localStorage.removeItem(ACTIVE_COURSE_KEY);
  }, [activeCourseId]);

  // load the course list once, then reconcile: if the persisted/seeded course
  // no longer exists (deleted elsewhere, stale bookmark), drop it so we don't
  // fetch documents for a dead id or strand the UI on a phantom course.
  useEffect(() => {
    listCourses()
      .then((loaded) => {
        setCourses(loaded);
        setActiveCourseId((current) =>
          current && loaded.some((c) => c._id === current) ? current : null
        );
      })
      .catch((err) => setRailError(err.message));
  }, []);

  // load the active course's documents whenever it changes. No active course →
  // nothing to fetch; the derived `visibleDocuments` already renders empty.
  useEffect(() => {
    if (!activeCourseId) return;

    let cancelled = false;
    listDocuments(activeCourseId)
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((err) => {
        if (!cancelled) setRailError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourseId]);

  async function handleCreateCourse(e) {
    e.preventDefault();
    const name = newCourseName.trim();
    if (!name) return;
    setRailError(null);
    try {
      const course = await createCourse(name);
      setCourses((prev) => [course, ...prev]);
      setActiveCourseId(course._id);
      setNewCourseName("");
      setCreating(false);
    } catch (err) {
      setRailError(err.message);
    }
  }

  async function handleDeleteCourse(course) {
    const ok = await confirm({
      title: "Delete course",
      body: `"${course.name}" will take its PDFs, saved chats, and search data with it.`,
      confirmLabel: "Delete course",
    });
    if (!ok) return;

    setRailError(null);
    try {
      await deleteCourse(course._id);
      setCourses((prev) => prev.filter((item) => item._id !== course._id));
      if (activeCourseId === course._id) {
        setActiveCourseId(null);
      }
    } catch (err) {
      setRailError(err.message);
    }
  }

  async function handleDeleteDocument(doc) {
    if (!activeCourseId) return;
    const ok = await confirm({
      title: "Delete document",
      body: `"${doc.filename}" will be removed from this course and its search index.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    setRailError(null);
    try {
      await deleteDocument(activeCourseId, doc._id);
      setDocuments((prev) => prev.filter((item) => item._id !== doc._id));
    } catch (err) {
      setRailError(err.message);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same filename
    if (!file || !activeCourseId) return;
    setRailError(null);
    setUploading(true);
    try {
      await uploadPdf(activeCourseId, file);
      const docs = await listDocuments(activeCourseId);
      setDocuments(docs);
    } catch (err) {
      setRailError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-night text-cream">
      <SiteHeader />
      <div className="h-24 shrink-0" />

      <div className="flex min-h-0 flex-1">
        {/* shared course + document rail */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-cream/10 px-6 py-8">
          <div className="flex items-center justify-between">
            <Kicker as="h2">Courses</Kicker>
            <button
              onClick={() => setCreating((v) => !v)}
              className="text-sm text-ice transition-opacity hover:opacity-70"
            >
              + New
            </button>
          </div>

          {creating && (
            <form onSubmit={handleCreateCourse} className="mt-4">
              <Field
                autoFocus
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Course name"
                className="w-full px-3 py-2 text-sm"
              />
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-1">
            {courses.map((course) => {
              const active = activeCourseId === course._id;
              return (
                <li key={course._id} className="group flex items-center gap-2">
                  <button
                    onClick={() => setActiveCourseId(course._id)}
                    className={
                      "min-w-0 flex-1 border-l-2 py-1.5 pl-3 text-left text-sm transition-colors " +
                      (active
                        ? "border-ice text-ice"
                        : "border-transparent text-cream/70 hover:text-cream")
                    }
                  >
                    <span className="block truncate">{course.name}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course)}
                    className="shrink-0 px-2 py-1 text-xs uppercase tracking-wide text-cream/35 opacity-0 transition hover:text-red group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Delete ${course.name}`}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
            {courses.length === 0 && !creating && (
              <li className="text-sm text-cream/40">No courses yet.</li>
            )}
          </ul>

          <Kicker as="h2" className="mt-10">
            Documents
          </Kicker>
          <ul className="mt-4 flex flex-col gap-3">
            {activeCourse ? (
              visibleDocuments.length > 0 ? (
                visibleDocuments.map((doc) => (
                  <li
                    key={doc._id}
                    className="group flex items-start gap-2 text-sm text-cream/80"
                  >
                    <Logomark className="mt-0.5 h-4 w-4 shrink-0 text-ice" />
                    <span className="min-w-0 flex-1 break-all">{doc.filename}</span>
                    <button
                      onClick={() => handleDeleteDocument(doc)}
                      className="shrink-0 text-xs uppercase tracking-wide text-cream/35 opacity-0 transition hover:text-red group-hover:opacity-100 focus:opacity-100"
                      aria-label={`Delete ${doc.filename}`}
                    >
                      Delete
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-sm text-cream/40">No documents yet.</li>
              )
            ) : (
              <li className="text-sm text-cream/40">Pick a course.</li>
            )}
          </ul>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleUpload}
            className="hidden"
          />
          <ActionButton
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeCourseId || uploading}
            className="mt-6 px-4 py-2.5"
          >
            {uploading ? "Uploading…" : "Upload PDF"}
          </ActionButton>

          <div ref={setRailSlot} className="mt-10 flex min-h-0 flex-1 flex-col" />

          {railError && <p className="mt-4 text-sm text-red">{railError}</p>}
        </aside>

        {/* inner boundary: while a tool's lazy chunk loads, only this region
            suspends — the rail above stays mounted and keeps the course. */}
        <Suspense fallback={<div className="flex min-h-0 flex-1" />}>
          <Outlet
            context={{ activeCourse, documents: visibleDocuments, railSlot }}
          />
        </Suspense>
      </div>

      {confirmDialog}
    </div>
  );
}

export default CourseWorkspace;
