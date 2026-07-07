import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { ArrowGlyph, Logomark, SiteHeader } from "../components/SiteChrome";
import {
  createChatSession,
  createCourse,
  deleteChatSession,
  deleteCourse,
  deleteDocument,
  listChatSessions,
  listCourses,
  listDocuments,
  sendChat,
  uploadPdf,
} from "../lib/api";

function makeChatTitle(question) {
  const clean = question.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? `${clean.slice(0, 45)}...` : clean || "New chat";
}

function Chat() {
  const [courses, setCourses] = useState([]);
  const [activeCourse, setActiveCourse] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [creating, setCreating] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [railError, setRailError] = useState(null);

  const [chatSessions, setChatSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);

  const activeCourseId = activeCourse?._id || null;
  const activeSessionForCourse = useMemo(
    () =>
      activeSession && String(activeSession.course) === activeCourseId
        ? activeSession
        : null,
    [activeSession, activeCourseId]
  );
  const visibleDocuments = useMemo(
    () =>
      activeCourseId
        ? documents.filter((doc) => String(doc.course) === activeCourseId)
        : [],
    [documents, activeCourseId]
  );
  const visibleChatSessions = useMemo(
    () =>
      activeCourseId
        ? chatSessions.filter((session) => String(session.course) === activeCourseId)
        : [],
    [chatSessions, activeCourseId]
  );
  const messages = useMemo(
    () => activeSessionForCourse?.messages || [],
    [activeSessionForCourse]
  );

  const fileInputRef = useRef(null);
  const scrollRef = useRef(null);

  // load the course list once
  useEffect(() => {
    listCourses()
      .then(setCourses)
      .catch((err) => setRailError(err.message));
  }, []);

  // whenever the active course changes, load its documents and saved chats
  useEffect(() => {
    if (!activeCourse) return;

    let cancelled = false;

    listDocuments(activeCourse._id)
      .then((docs) => {
        if (!cancelled) setDocuments(docs);
      })
      .catch((err) => setRailError(err.message));

    listChatSessions(activeCourse._id)
      .then((sessions) => {
        if (cancelled) return;
        setChatSessions(sessions);
        setActiveSession(sessions[0] || null);
      })
      .catch((err) => setRailError(err.message));

    return () => {
      cancelled = true;
    };
  }, [activeCourse]);

  // keep the thread pinned to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function putSessionFirst(session) {
    setActiveSession(session);
    setChatSessions((prev) => [
      session,
      ...prev.filter((item) => item._id !== session._id),
    ]);
  }

  async function handleNewChat() {
    if (!activeCourse) return;
    setRailError(null);
    try {
      const session = await createChatSession(activeCourse._id);
      putSessionFirst(session);
    } catch (err) {
      setRailError(err.message);
    }
  }

  async function ensureSession(firstQuestion) {
    if (activeSessionForCourse) return activeSessionForCourse;
    const session = await createChatSession(activeCourse._id, makeChatTitle(firstQuestion));
    putSessionFirst(session);
    return session;
  }

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

  async function handleDeleteCourse(course) {
    const ok = window.confirm(
      `Delete "${course.name}"? This removes its PDFs, saved chats, and search data.`
    );
    if (!ok) return;

    setRailError(null);
    try {
      await deleteCourse(course._id);
      setCourses((prev) => prev.filter((item) => item._id !== course._id));
      setDocuments((prev) =>
        prev.filter((doc) => String(doc.course) !== String(course._id))
      );
      setChatSessions((prev) =>
        prev.filter((session) => String(session.course) !== String(course._id))
      );

      if (activeCourse?._id === course._id) {
        const nextCourse = courses.find((item) => item._id !== course._id) || null;
        setActiveCourse(nextCourse);
        setActiveSession(null);
      }
    } catch (err) {
      setRailError(err.message);
    }
  }

  async function handleDeleteDocument(doc) {
    if (!activeCourse) return;
    const ok = window.confirm(`Delete "${doc.filename}" from this course?`);
    if (!ok) return;

    setRailError(null);
    try {
      await deleteDocument(activeCourse._id, doc._id);
      setDocuments((prev) => prev.filter((item) => item._id !== doc._id));
    } catch (err) {
      setRailError(err.message);
    }
  }

  async function handleDeleteChat(session) {
    const ok = window.confirm(`Delete "${session.title}"?`);
    if (!ok) return;

    setRailError(null);
    try {
      await deleteChatSession(session._id);
      setChatSessions((prev) => prev.filter((item) => item._id !== session._id));

      if (activeSessionForCourse?._id === session._id) {
        const nextSession =
          visibleChatSessions.find((item) => item._id !== session._id) || null;
        setActiveSession(nextSession);
      }
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

    const courseId = activeCourse._id;
    let optimisticSession = null;

    try {
      const session = await ensureSession(q);
      optimisticSession = {
        ...session,
        title: session.title === "New chat" ? makeChatTitle(q) : session.title,
        messages: [
          ...(session.messages || []),
          { role: "user", text: q },
          { role: "assistant", pending: true },
        ],
      };

      setQuestion("");
      setSending(true);
      putSessionFirst(optimisticSession);

      const { session: savedSession } = await sendChat(courseId, q, session._id);
      putSessionFirst(savedSession);
    } catch (err) {
      if (optimisticSession) {
        const messages = [...optimisticSession.messages];
        messages[messages.length - 1] = { role: "assistant", error: err.message };
        putSessionFirst({ ...optimisticSession, messages });
      } else if (activeSessionForCourse) {
        putSessionFirst({
          ...activeSessionForCourse,
          messages: [
            ...(activeSessionForCourse.messages || []),
            { role: "user", text: q },
            { role: "assistant", error: err.message },
          ],
        });
      } else {
        setRailError(err.message);
      }
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
                <li key={course._id} className="group flex items-center gap-2">
                  <button
                    onClick={() => setActiveCourse(course)}
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

          <h2 className="mt-10 text-xs font-medium uppercase tracking-[0.2em] text-red">
            Documents
          </h2>
          <ul className="mt-4 flex max-h-36 flex-col gap-3 overflow-y-auto pr-1">
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

          <div className="mt-10 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-red">
              Chats
            </h2>
            <button
              onClick={handleNewChat}
              disabled={!activeCourse}
              className="text-sm text-ice transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + New
            </button>
          </div>

          <ul className="mt-4 flex min-h-24 flex-1 flex-col gap-1 overflow-y-auto pr-1">
            {activeCourse ? (
              visibleChatSessions.length > 0 ? (
                visibleChatSessions.map((session) => {
                  const active = activeSessionForCourse?._id === session._id;
                  return (
                    <li key={session._id} className="group flex items-start gap-2">
                      <button
                        onClick={() => setActiveSession(session)}
                        className={
                          "min-w-0 flex-1 border-l-2 py-1.5 pl-3 text-left text-sm transition-colors " +
                          (active
                            ? "border-ice text-ice"
                            : "border-transparent text-cream/70 hover:text-cream")
                        }
                      >
                        <span className="block truncate">{session.title}</span>
                        <span className="mt-0.5 block text-xs text-cream/35">
                          {session.messages?.length || 0} messages
                        </span>
                      </button>
                      <button
                        onClick={() => handleDeleteChat(session)}
                        className="mt-1 shrink-0 px-2 py-1 text-xs uppercase tracking-wide text-cream/35 opacity-0 transition hover:text-red group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Delete ${session.title}`}
                      >
                        Delete
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="text-sm text-cream/40">No saved chats yet.</li>
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

function MarkdownMessage({ text }) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ ...props }) => <h2 {...props} />,
          h2: ({ ...props }) => <h3 {...props} />,
          h3: ({ ...props }) => <h4 {...props} />,
          p: ({ ...props }) => <p {...props} />,
          a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
          code: ({ className, children, ...props }) => {
            const inline = !className;
            return inline ? (
              <code {...props}>{children}</code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function AssistantMessage({ msg }) {
  // which citation chip is expanded to show its source passage (null = none)
  const [openNumber, setOpenNumber] = useState(null);
  const openSource = msg.sources?.find((s) => s.number === openNumber) || null;

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
        <p className="border border-red/40 bg-red/10 px-4 py-3 leading-relaxed text-red">
          {msg.error}
        </p>
      ) : (
        <>
          <MarkdownMessage text={msg.text} />
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {msg.sources.map((src) => {
                  const open = openNumber === src.number;
                  return (
                    <button
                      key={src.number}
                      onClick={() => setOpenNumber(open ? null : src.number)}
                      className={
                        "flex items-center gap-2 border px-3 py-1.5 text-xs transition-colors " +
                        (open
                          ? "border-ice text-ice"
                          : "border-cream/15 text-cream/70 hover:border-cream/40")
                      }
                    >
                      <span className="flex h-4 w-4 items-center justify-center bg-ice text-[10px] font-bold text-night">
                        {src.number}
                      </span>
                      <span className="break-all">{src.source}</span>
                      <span className="text-cream/40">#{src.chunkIndex}</span>
                    </button>
                  );
                })}
              </div>
              {openSource && (
                <blockquote className="border-l-2 border-ice bg-cream/5 px-4 py-3 text-sm leading-relaxed text-cream/70">
                  {openSource.text || "No preview available for this source."}
                </blockquote>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Chat;
