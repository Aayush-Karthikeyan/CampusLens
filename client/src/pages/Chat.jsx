import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { ArrowGlyph, Logomark } from "../components/SiteChrome";
import { ActionButton, Kicker } from "../components/ui";
import { timeAgo } from "../lib/timeAgo";
import { useConfirm } from "../lib/useConfirm";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import {
  createChatSession,
  deleteChatSession,
  listChatSessions,
  sendChat,
} from "../lib/api";

function makeChatTitle(question) {
  const clean = question.trim().replace(/\s+/g, " ");
  return clean.length > 48 ? `${clean.slice(0, 45)}...` : clean || "New chat";
}

// one-click conversation starters for a fresh thread
const STARTER_PROMPTS = [
  "Summarize the big ideas in my notes",
  "Explain the trickiest concept like I'm five",
  "What's most likely to show up on the exam?",
];

function Chat() {
  useDocumentTitle("Chat");

  // course + documents come from the CourseWorkspace layout; chat owns only
  // the saved sessions and the live conversation. railSlot is the layout's
  // portal target below Documents — the saved-chats list renders there.
  const { activeCourse, railSlot } = useOutletContext();

  const [chatSessions, setChatSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState(null);
  const { confirm, confirmDialog } = useConfirm();

  const activeCourseId = activeCourse?._id || null;
  const activeSessionForCourse = useMemo(
    () =>
      activeSession && String(activeSession.course) === activeCourseId
        ? activeSession
        : null,
    [activeSession, activeCourseId]
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

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // the input is the page's focal control — hand it focus as soon as a course
  // is in play so asking is zero-click
  useEffect(() => {
    if (activeCourseId) inputRef.current?.focus();
  }, [activeCourseId]);

  // load the active course's saved chats whenever it changes. No active course →
  // nothing to fetch; the derived values already render empty and guard by course.
  useEffect(() => {
    if (!activeCourseId) return;

    let cancelled = false;
    listChatSessions(activeCourseId)
      .then((sessions) => {
        if (cancelled) return;
        setChatSessions(sessions);
        setActiveSession(sessions[0] || null);
        setChatError(null);
      })
      .catch((err) => {
        if (!cancelled) setChatError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourseId]);

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
    setChatError(null);
    try {
      const session = await createChatSession(activeCourse._id);
      putSessionFirst(session);
    } catch (err) {
      setChatError(err.message);
    }
  }

  async function ensureSession(firstQuestion) {
    if (activeSessionForCourse) return activeSessionForCourse;
    const session = await createChatSession(activeCourse._id, makeChatTitle(firstQuestion));
    putSessionFirst(session);
    return session;
  }

  async function handleDeleteChat(session) {
    const ok = await confirm({
      title: "Delete chat",
      body: `"${session.title}" and its messages will be gone for good.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    setChatError(null);
    try {
      await deleteChatSession(session._id);
      setChatSessions((prev) => prev.filter((item) => item._id !== session._id));

      if (activeSessionForCourse?._id === session._id) {
        const nextSession =
          visibleChatSessions.find((item) => item._id !== session._id) || null;
        setActiveSession(nextSession);
      }
    } catch (err) {
      setChatError(err.message);
    }
  }

  function handleSend(e) {
    e.preventDefault();
    sendQuestion(question);
  }

  // shared by the form submit and the starter-prompt chips
  async function sendQuestion(rawQuestion) {
    const q = rawQuestion.trim();
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

      // stream: update the pending assistant bubble as each chunk arrives,
      // then swap in the saved session (with sources) when the stream ends.
      let streamed = "";
      const { session: savedSession } = await sendChat(
        courseId,
        q,
        session._id,
        (chunk) => {
          streamed += chunk;
          putSessionFirst({
            ...optimisticSession,
            messages: [
              ...optimisticSession.messages.slice(0, -1),
              { role: "assistant", pending: true, text: streamed },
            ],
          });
        }
      );
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
        setChatError(err.message);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  // saved chats live in the shared rail (below Documents) via the layout's
  // portal slot — no second sidebar eating conversation width
  const chatsRail = (
    <>
      <div className="flex items-center justify-between">
        <Kicker as="h2">Chats</Kicker>
        <button
          onClick={handleNewChat}
          disabled={!activeCourse}
          className="text-sm text-ice transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + New
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-1">
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
                      {session.updatedAt && ` · ${timeAgo(session.updatedAt)}`}
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

      {chatError && <p className="mt-4 text-sm text-red">{chatError}</p>}
    </>
  );

  return (
    <>
      {railSlot && createPortal(chatsRail, railSlot)}

      {/* main conversation */}
      <main className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-8 py-10">
          {!activeCourse ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Kicker className="fade-up">Chat</Kicker>
              <h1 className="fade-up fade-up-1 mt-4 font-display text-5xl font-semibold tracking-tight">
                Pick a course
              </h1>
              <p className="fade-up fade-up-2 mt-6 max-w-md text-cream/60">
                Choose a course from the rail and start asking your notes
                questions.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Kicker className="fade-up">{activeCourse.name}</Kicker>
              <h1 className="fade-up fade-up-1 mt-4 max-w-2xl font-display text-5xl font-semibold tracking-tight md:text-6xl">
                Ask your notes anything.
              </h1>
              <p className="fade-up fade-up-2 mt-6 max-w-md text-cream/60">
                Every answer comes straight from your uploaded material — with
                receipts.
              </p>
              <div className="fade-up fade-up-3 mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendQuestion(prompt)}
                    className="border border-cream/15 px-4 py-2.5 text-sm text-cream/70 transition-colors hover:border-ice hover:text-ice"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-10">
              {messages.map((msg, i) =>
                msg.role === "user" ? (
                  <div
                    key={`${activeSessionForCourse._id}-${i}`}
                    className="msg-enter flex justify-end"
                  >
                    <p className="max-w-lg border border-cream/12 bg-cream/[0.07] px-5 py-3 leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                ) : (
                  <AssistantMessage
                    key={`${activeSessionForCourse._id}-${i}`}
                    msg={msg}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* input bar — the wrapper owns the field chrome so the whole bar
            lights up ice on focus */}
        <form
          onSubmit={handleSend}
          className="shrink-0 border-t border-cream/10 px-8 py-5"
        >
          <div className="mx-auto flex max-w-3xl items-center gap-2 border border-cream/15 bg-cream/[0.03] p-2 transition-colors focus-within:border-ice/70">
            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                activeCourse ? "Ask your notes anything…" : "Pick a course first…"
              }
              disabled={!activeCourse || sending}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-cream placeholder:text-cream/40 focus:outline-none disabled:opacity-40"
            />
            <ActionButton
              type="submit"
              disabled={!activeCourse || sending || !question.trim()}
              className="flex shrink-0 items-center gap-2 px-5 py-2.5"
            >
              <span>{sending ? "Sending" : "Send"}</span>
              {sending ? (
                <span className="mint-arrows" aria-hidden="true">
                  <ArrowGlyph className="mint-arrow h-3.5 w-3.5" />
                  <ArrowGlyph className="mint-arrow h-3.5 w-3.5" />
                  <ArrowGlyph className="mint-arrow h-3.5 w-3.5" />
                </span>
              ) : (
                <ArrowGlyph className="h-4 w-4" />
              )}
            </ActionButton>
          </div>
        </form>
      </main>

      {confirmDialog}
    </>
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
    <div className="msg-enter flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-cream/50">
        <Logomark className="h-4 w-4 text-ice" />
        campuslens
      </div>

      {msg.pending && !msg.text ? (
        <div className="flex items-center gap-3" aria-label="Thinking">
          <span className="flex gap-1.5">
            <span className="thinking-dot h-2 w-2 rounded-full bg-cream/50" />
            <span className="thinking-dot h-2 w-2 rounded-full bg-cream/50" />
            <span className="thinking-dot h-2 w-2 rounded-full bg-cream/50" />
          </span>
          <span className="text-sm text-cream/40">reading your notes…</span>
        </div>
      ) : msg.pending ? (
        // streaming: render the partial answer as it arrives
        <MarkdownMessage text={msg.text} />
      ) : msg.error ? (
        <p className="border border-red/40 bg-red/10 px-4 py-3 leading-relaxed text-red">
          {msg.error}
        </p>
      ) : (
        <>
          <MarkdownMessage text={msg.text} />
          {msg.sources && msg.sources.length > 0 && (
            <div className="mt-2 flex flex-col gap-3">
              <Kicker>Sources</Kicker>
              <div className="flex flex-wrap gap-2">
                {msg.sources.map((src) => {
                  const open = openNumber === src.number;
                  return (
                    <button
                      key={src.number}
                      onClick={() => setOpenNumber(open ? null : src.number)}
                      className={
                        "flex max-w-full items-center gap-2 border px-3 py-1.5 text-xs transition-colors " +
                        (open
                          ? "border-ice bg-ice/10 text-ice"
                          : "border-cream/15 text-cream/70 hover:border-ice hover:text-ice")
                      }
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center bg-ice text-[10px] font-bold text-night">
                        {src.number}
                      </span>
                      <span className="max-w-48 truncate">{src.source}</span>
                      <span className="shrink-0 text-cream/40">
                        #{src.chunkIndex}
                      </span>
                    </button>
                  );
                })}
              </div>
              {openSource && (
                <div className="msg-enter border border-cream/12 bg-cream/[0.04]">
                  <div className="flex items-center justify-between gap-4 border-b border-cream/10 px-4 py-2.5">
                    <p className="min-w-0 truncate text-xs uppercase tracking-[0.18em] text-cream/50">
                      Source {openSource.number} · {openSource.source} · #
                      {openSource.chunkIndex}
                    </p>
                    <button
                      onClick={() => setOpenNumber(null)}
                      className="shrink-0 text-xs uppercase tracking-wide text-cream/40 transition-colors hover:text-cream"
                    >
                      Close
                    </button>
                  </div>
                  <blockquote className="border-l-2 border-ice px-4 py-3 text-sm leading-relaxed text-cream/70">
                    {openSource.text || "No preview available for this source."}
                  </blockquote>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Chat;
