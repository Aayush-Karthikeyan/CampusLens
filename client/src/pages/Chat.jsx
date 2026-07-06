import { useEffect, useRef, useState } from "react";
import { ArrowGlyph, Logomark, SiteHeader } from "../components/SiteChrome";
import {
  createCourse,
  listCourses,
  listDocuments,
  sendChat,
  uploadPdf,
} from "../lib/api";

function Chat() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [creating, setCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [railError, setRailError] = useState(null);

  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);

  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  // load the course list once
  useEffect(() => {
    listCourses()
      .then(setCourses)
      .catch((err) => setRailError(err.message));
  }, []);

  // whenever the active course changes, load its documents and reset the thread
  useEffect(() => {
    if (!activeCourse) return;
    setMessages([]);
    setDocuments([]);
    listDocuments(activeCourse._id)
      .then(setDocuments)
      .catch((err) => setRailError(err.message));
  }, [activeCourse]);

  // keep the thread pinned to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleCreateCourse(e) {
    e.preventDefault();
    const name = newCourseName.trim();
    if (!name) return;
    setRailError(null);
    try {
      const course = await createCourse(name);
      setCourses((prev) => [course, ...prev]);
      setActiveCourse(course);
      setNewCourseName("");
      setCreating(false);
    } catch (err) {
      setRailError(err.message);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same filename
    if (!file || !activeCourse) return;
    setRailError(null);
    setUploading(true);
    try {
      await uploadPdf(activeCourse._id, file);
      const docs = await listDocuments(activeCourse._id);
      setDocuments(docs);
    } catch (err) {
      setRailError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || !activeCourse || sending) return;

    setQuestion("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", pending: true },
    ]);

    try {
      const { answer, sources } = await sendChat(activeCourse._id, q);
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", text: answer, sources };
        return next;
      });
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", error: err.message };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-night text-cream">
      <SiteHeader />
      <div className="h-24 shrink-0" />

      <div className="flex min-h-0 flex-1">
        {/* left rail */}
        <aside className="flex w-72 shrink-0 flex-col overflow-y-auto border-r border-cream/10 px-6 py-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Courses
            </h2>
            <button
              onClick={() => setCreating((v) => !v)}
              className="text-sm text-ice transition-opacity hover:opacity-70"
            >
              + New
            </button>
          </div>

          {creating && (
            <form onSubmit={handleCreateCourse} className="mt-4">
              <input
                autoFocus
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                placeholder="Course name"
                className="w-full border border-cream/20 bg-cream/5 px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-ice focus:outline-none"
              />
            </form>
          )}

          <ul className="mt-4 flex flex-col gap-1">
            {courses.map((course) => {
              const active = activeCourse?._id === course._id;
              return (
                <li key={course._id}>
                  <button
                    onClick={() => setActiveCourse(course)}
                    className={
                      "w-full border-l-2 py-1.5 pl-3 text-left text-sm transition-colors " +
                      (active
                        ? "border-ice text-ice"
                        : "border-transparent text-cream/70 hover:text-cream")
                    }
                  >
                    {course.name}
                  </button>
                </li>
              );
            })}
            {courses.length === 0 && !creating && (
              <li className="text-sm text-cream/40">No courses yet.</li>
            )}
          </ul>

          <h2 className="mt-10 text-xs font-medium uppercase tracking-[0.2em] text-red">
            Documents
          </h2>
          <ul className="mt-4 flex flex-1 flex-col gap-3">
            {activeCourse ? (
              documents.length > 0 ? (
                documents.map((doc) => (
                  <li key={doc._id} className="flex items-start gap-2 text-sm text-cream/80">
                    <Logomark className="mt-0.5 h-4 w-4 shrink-0 text-ice" />
                    <span className="break-all">{doc.filename}</span>
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!activeCourse || uploading}
            className="mt-6 border border-ice px-4 py-2.5 text-sm font-medium uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? "Uploading…" : "Upload PDF"}
          </button>

          {railError && <p className="mt-4 text-sm text-red">{railError}</p>}
        </aside>

        {/* main conversation */}
        <main className="flex min-h-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
            {!activeCourse ? (
              <EmptyState text="Pick a course to start." />
            ) : messages.length === 0 ? (
              <EmptyState text={`Ask anything about ${activeCourse.name}.`} />
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-10">
                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex justify-end">
                      <p className="max-w-lg border border-cream/10 bg-cream/5 px-5 py-3 leading-relaxed">
                        {msg.text}
                      </p>
                    </div>
                  ) : (
                    <AssistantMessage key={i} msg={msg} />
                  )
                )}
              </div>
            )}
          </div>

          {/* input bar */}
          <form
            onSubmit={handleSend}
            className="shrink-0 border-t border-cream/10 px-8 py-5"
          >
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  activeCourse ? "Ask your notes anything…" : "Pick a course first…"
                }
                disabled={!activeCourse || sending}
                className="flex-1 border border-cream/20 bg-cream/5 px-4 py-3 text-cream placeholder:text-cream/40 focus:border-ice focus:outline-none disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!activeCourse || sending || !question.trim()}
                className="flex items-center gap-2 border border-ice px-5 py-3 text-sm font-medium uppercase tracking-wide text-ice transition-colors hover:bg-ice hover:text-night disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>Send</span>
                <ArrowGlyph className="h-4 w-4" />
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-display text-2xl text-cream/40">{text}</p>
    </div>
  );
}

function AssistantMessage({ msg }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cream/50">
        <Logomark className="h-4 w-4 text-ice" />
        campuslens
      </div>

      {msg.pending ? (
        <div className="flex gap-1.5" aria-label="Thinking">
          <span className="thinking-dot h-2 w-2 rounded-full bg-cream/50" />
          <span className="thinking-dot h-2 w-2 rounded-full bg-cream/50" />
          <span className="thinking-dot h-2 w-2 rounded-full bg-cream/50" />
        </div>
      ) : msg.error ? (
        <p className="text-red">{msg.error}</p>
      ) : (
        <>
          <p className="leading-relaxed">{msg.text}</p>
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {msg.sources.map((src) => (
                <span
                  key={src.number}
                  className="flex items-center gap-2 border border-cream/15 px-3 py-1.5 text-xs text-cream/70"
                >
                  <span className="flex h-4 w-4 items-center justify-center bg-ice text-[10px] font-bold text-night">
                    {src.number}
                  </span>
                  <span className="break-all">{src.source}</span>
                  <span className="text-cream/40">#{src.chunkIndex}</span>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Chat;
