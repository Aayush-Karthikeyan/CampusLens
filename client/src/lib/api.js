// First data layer for CampusLens. Everything goes through the Vite dev proxy
// at /api/* → http://localhost:3000/* (see vite.config.js), which keeps calls
// same-origin so the browser never hits the backend's missing CORS.

async function request(path, options) {
  const res = await fetch(path, options);
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
  return request("/api/courses");
}

export function createCourse(name) {
  return request("/api/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export function deleteCourse(courseId) {
  return request(`/api/courses/${courseId}`, { method: "DELETE" });
}

export function listDocuments(courseId) {
  return request(`/api/courses/${courseId}/documents`);
}

export function deleteDocument(courseId, documentId) {
  return request(`/api/courses/${courseId}/documents/${documentId}`, {
    method: "DELETE",
  });
}

export function uploadPdf(courseId, file) {
  const form = new FormData();
  form.append("pdf", file);
  form.append("courseId", courseId);
  return request("/api/upload", { method: "POST", body: form });
}

export function listChatSessions(courseId) {
  return request(`/api/chat/sessions?courseId=${encodeURIComponent(courseId)}`);
}

export function createChatSession(courseId, title = "New chat") {
  return request("/api/chat/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, title }),
  });
}

export function deleteChatSession(sessionId) {
  return request(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
}

export function sendChat(courseId, question, sessionId = null) {
  return request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, question, sessionId }),
  });
}

export function generateQuiz(courseId, count = 5) {
  return request("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, count }),
  });
}
