// First data layer for CampusLens. Paths are written without an /api prefix and
// resolved against API_BASE:
//   - dev: API_BASE defaults to "/api", so calls hit the Vite dev proxy
//     (/api/* → http://localhost:3000/*, see vite.config.js) and stay
//     same-origin — no CORS needed locally.
//   - prod: set VITE_API_URL to the deployed backend origin
//     (e.g. https://campuslens-api.onrender.com) at build time; calls go
//     straight there and the server's CORS allowlist lets them through.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON response (shouldn't happen with this backend, but be safe)
  }
  if (!res.ok) {
    throw new Error((body && body.error) || res.statusText);
  }
  return body;
}

export function listCourses() {
  return request("/courses");
}

export function createCourse(name) {
  return request("/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function deleteCourse(courseId) {
  return request(`/courses/${courseId}`, { method: "DELETE" });
}

export function listDocuments(courseId) {
  return request(`/courses/${courseId}/documents`);
}

export function deleteDocument(courseId, documentId) {
  return request(`/courses/${courseId}/documents/${documentId}`, {
    method: "DELETE",
  });
}

export function uploadPdf(courseId, file) {
  const form = new FormData();
  form.append("pdf", file);
  form.append("courseId", courseId);
  return request("/upload", { method: "POST", body: form });
}

export function listChatSessions(courseId) {
  return request(`/chat/sessions?courseId=${encodeURIComponent(courseId)}`);
}

export function createChatSession(courseId, title = "New chat") {
  return request("/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, title }),
  });
}

export function deleteChatSession(sessionId) {
  return request(`/chat/sessions/${sessionId}`, { method: "DELETE" });
}

// The chat endpoint streams over Server-Sent Events. onChunk fires with each
// text fragment as the model produces it; the returned promise resolves with
// the final {answer, sources, session} payload once the stream completes.
export async function sendChat(courseId, question, sessionId = null, onChunk) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, question, sessionId }),
  });

  // errors before the stream starts (400s, quota) arrive as plain JSON
  if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
    let body = null;
    try {
      body = await res.json();
    } catch {
      // non-JSON error body
    }
    throw new Error((body && body.error) || res.statusText);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop(); // keep any incomplete trailing event

    for (const event of events) {
      const dataLine = event.split("\n").find((l) => l.startsWith("data: "));
      if (!dataLine) continue;

      const payload = JSON.parse(dataLine.slice(6));
      if (payload.type === "chunk") {
        onChunk?.(payload.text);
      } else if (payload.type === "done") {
        result = payload;
      } else if (payload.type === "error") {
        throw new Error(payload.message);
      }
    }
  }

  if (!result) {
    throw new Error("The connection dropped before the answer finished.");
  }
  return result;
}

export function generateQuiz(courseId, count = 5) {
  return request("/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, count }),
  });
}

// Returns the course's saved plan, or null if there isn't one yet.
export function getStudyPlan(courseId) {
  return request(`/study-plan?courseId=${encodeURIComponent(courseId)}`);
}

// Generates and saves a plan, overwriting any existing one for the course.
export function generateStudyPlan(courseId, examDate, focus = "") {
  return request("/study-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, examDate, focus }),
  });
}

// Ticks a single task on/off; returns the updated plan.
export function toggleStudyTask(courseId, day, taskIndex, done) {
  return request("/study-plan/task", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, day, taskIndex, done }),
  });
}
