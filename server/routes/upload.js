const express = require("express");
const multer = require("multer");
const fs = require("fs");
const router = express.Router();
const { storePDF } = require("../rag/store");
const Document = require("../models/Document");


const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("pdf"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const { courseId } = req.body;
    const sourceName = req.file.originalname;
    await storePDF(filePath, courseId, sourceName);
        fs.unlinkSync(filePath);

    const document = await Document.create({ filename: sourceName, course: courseId });

    res.json({ message: "PDF processed and stored", file: req.file.originalname, document });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;