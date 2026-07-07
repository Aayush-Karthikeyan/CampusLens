const express = require("express");
const multer = require("multer");
const fs = require("fs");
const router = express.Router();
const { storePDF } = require("../rag/store");
const Document = require("../models/Document");


const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("pdf"), async (req, res) => {
  let document = null;
  try {
    const filePath = req.file.path;
    const { courseId } = req.body;
    const sourceName = req.file.originalname;
    document = await Document.create({
      filename: sourceName,
      course: courseId,
      vectorMetadataVersion: 2,
    });

    await storePDF(filePath, courseId, sourceName, document._id);
    fs.unlinkSync(filePath);

    res.json({ message: "PDF processed and stored", file: req.file.originalname, document });
  } catch (error) {
    if (document) await Document.findByIdAndDelete(document._id);
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
