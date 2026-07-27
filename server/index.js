const express = require('express');
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./db");
const { globalLimiter } = require("./lib/rateLimit");
connectDB();

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
  })
);

app.use(express.json());

// generous global cap on every route; the expensive AI routes add a tighter
// per-route cap (see aiLimiter usage in each generation route)
app.use(globalLimiter);

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

// hosts inject their own port via process.env.PORT; 3000 is the local default
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});