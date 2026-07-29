require("dotenv").config();
// must be required before the app so instrumentation is in place early
const { errorHandler, reportError } = require("./lib/monitoring");
const express = require('express');
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./db");
const { globalLimiter } = require("./lib/rateLimit");
connectDB();

// Fail at boot rather than at the first login attempt: without a signing key
// tokens can't be trusted, and a server that starts and then rejects everyone
// is harder to diagnose than one that refuses to start.
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("JWT_SECRET is required in production. Refusing to start.");
  process.exit(1);
}

const app = express();

// Behind Render's reverse proxy the real client IP arrives in X-Forwarded-For;
// trust the first hop so rate limiting keys on the visitor, not the proxy.
app.set("trust proxy", 1);

// In prod the client is served from a different origin (Vercel) than the API
// (Render), so the browser needs the API to opt into cross-origin requests.
// CORS_ORIGIN is a comma-separated allowlist of frontend origins; unset (local
// dev, where the client uses the same-origin Vite proxy) reflects any origin.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : null;
app.use(
  cors({
    origin: allowedOrigins && allowedOrigins.length ? allowedOrigins : true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    // the auth cookie only travels cross-origin if the server opts in here and
    // the client sends credentials — miss either half and login silently fails
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// generous global cap on every route; the expensive AI routes add a tighter
// per-route cap (see aiLimiter usage in each generation route)
app.use(globalLimiter);

const authRoute = require("./routes/auth");
app.use("/auth", authRoute);

const uploadRoute = require("./routes/upload");
app.use("/upload", uploadRoute);

const chatRoute = require("./routes/chat");
app.use("/chat", chatRoute);

const coursesRoute = require("./routes/courses");
app.use("/courses", coursesRoute);

const quizRoute = require("./routes/quiz");
app.use("/quiz", quizRoute);

const studyPlanRoute = require("./routes/study-plan");
app.use("/study-plan", studyPlanRoute);


// doubles as the platform health check (Render pings this to confirm liveness)
app.get('/', (req, res) => {
    res.send('CampusLens API is running');
});

// last middleware: anything a route throws without handling lands here, gets
// reported, and returns a clean message instead of Express's HTML stack trace
app.use(errorHandler);

// A crash that takes the process down is the one you most want to know about,
// so report it before letting the platform restart us.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  reportError(reason instanceof Error ? reason : new Error(String(reason)));
});

// hosts inject their own port via process.env.PORT; 3000 is the local default
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});