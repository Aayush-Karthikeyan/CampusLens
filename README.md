# CampusLens

**Ask your course notes anything — and get answers grounded in your own PDFs, with citations.**

CampusLens is a full-stack RAG (retrieval-augmented generation) study assistant. Upload your lecture slides and notes, and it becomes a tutor that only answers from *your* material: a grounded chat with source citations, auto-generated practice quizzes, and day-by-day study plans built from the actual content — not generic templates.

<!-- Screenshots: drop images into a top-level `screenshots/` folder and uncomment.
![Dashboard](screenshots/dashboard.png)
![Chat with citations](screenshots/chat.png)
![Quiz results](screenshots/quiz.png)
![Study plan](screenshots/study-plan.png)
-->

_Screenshots coming soon._

## Features

- **Grounded chat** — ask questions and get answers streamed token-by-token, drawn only from your uploaded PDFs. Every answer shows the exact source passages it used, so you can verify it.
- **Broad-question mode** — "summarize the big ideas" or "what's most likely on the exam?" sample across the whole course instead of failing a narrow keyword search.
- **Practice quizzes** — generate multiple-choice questions from your material with explanations and a graded results view.
- **Study plans** — give it your exam date and it builds a day-by-day plan mapped to your notes, with checkable tasks and a countdown.
- **Course workspace** — organize PDFs by course; a dashboard tracks what you've uploaded.

## How it works

CampusLens is a classic RAG pipeline with a grounding guard so it refuses to hallucinate beyond your notes.

```
Upload PDF
  → extract text (clean unmappable glyphs)
  → sentence-aware chunking
  → embed each chunk (Gemini)
  → store vectors in Pinecone (tagged by course + document)

Ask a question
  → embed the question (or a broad seed for big-picture questions)
  → similarity search in Pinecone, filtered to the course
  → weak-context guard: refuse if nothing relevant is retrieved
  → build a grounded prompt from the top chunks
  → stream the answer from Gemini, with source citations
```

The same retrieval layer powers quizzes and study plans, which retrieve broadly across a course rather than answering a single question.

## Tech stack

**Client** — React 19, Vite, Tailwind CSS v4, React Router 7
**Server** — Node.js, Express 5, MongoDB (Mongoose)
**AI / retrieval** — Google Gemini (embeddings + generation), Pinecone (vector store)

Answers stream to the browser over Server-Sent Events, so text appears as the model produces it.

## Getting started

### Prerequisites

- Node.js 18+
- A MongoDB database (e.g. a free MongoDB Atlas cluster)
- A Pinecone index
- A Google Gemini API key

### Setup

```bash
git clone https://github.com/<your-username>/CampusLens.git
cd CampusLens

# Backend
cd server
npm install
cp .env.example .env      # then fill in the values
npm run dev               # http://localhost:3000

# Frontend (in a second terminal)
cd client
npm install
npm run dev               # http://localhost:5173
```

The frontend proxies API calls to the backend in development, so no extra config is needed locally. See `server/.env.example` and `client/.env.example` for every variable.

## Deployment

The client and server deploy independently:

- **Client** → Vercel (set `VITE_API_URL` to the deployed backend origin).
- **Server** → Render (set `CORS_ORIGIN` to the deployed frontend origin, plus the Mongo/Pinecone/Gemini keys).

## Project structure

```
client/   React + Vite single-page app (dashboard, chat, quiz, study plan)
server/   Express API, RAG pipeline (server/rag), and Mongoose models
```
