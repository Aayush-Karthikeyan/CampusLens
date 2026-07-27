const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { storePDF } = require("../rag/store");
const Document = require("../models/Document");
const { aiLimiter } = require("../lib/rateLimit");

const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 15);

// Absolute path, not "uploads/" — multer's dest is relative to process.cwd(),
// so on a host that starts the app from the repo root (not server/) a relative
// path resolves to a missing dir and every upload fails with ENOENT. Anchor to
// this file's location and make sure the dir exists.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Reject anything that isn't a PDF before it touches disk, and cap the size so
// a hostile or fat-fingered upload can't fill the host's ephemeral storage.
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    cb(isPdf ? null : new Error("Only PDF files are accepted."), isPdf);
  },
});

// multer errors (size/type) surface in the middleware, before the handler runs,
// so wrap it and translate them into clean JSON instead of Express's HTML 500.
function acceptPdf(req, res, next) {
  upload.single("pdf")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `PDF is too large (max ${MAX_UPLOAD_MB} MB).`
        : err.message;
    res.status(400).json({ error: message });
  });
}

router.post("/", aiLimiter, acceptPdf, async (req, res) => {
  let document = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF was uploaded." });
    }
    const { courseId } = req.body;
    if (!courseId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "courseId is required" });
    }

    const filePath = req.file.path;
    const sourceName = req.file.originalname;
    document = await Document.create({
      filename: sourceName,
      course: courseId,
      vectorMetadataVersion: 2,
    });

    await storePDF(filePath, courseId, sourceName, document._id);
    fs.unlinkSync(filePath);

    res.json({ message: "PDF processed and stored", file: sourceName, document });
  } catch (error) {
    if (document) await Document.findByIdAndDelete(document._id);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    // unreadable PDF is the user's file, not our bug → 422 with the reason
    if (error.code === "NO_TEXT") {
      return res.status(422).json({ error: error.message });
    }
    // anything else: log the detail server-side, don't leak internals to the client
    console.error("Upload failed:", error.message);
    res.status(500).json({ error: "Could not process the PDF. Please try again." });
  }
});

module.exports = router;
