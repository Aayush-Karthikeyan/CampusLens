const express = require("express");
const multer = require("multer");
const router = express.Router();
const { storePDF } = require("../rag/store");

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("pdf"), async (req, res) => {
  try {
    const filePath = req.file.path;
    await storePDF(filePath);
    res.json({ message: "PDF processed and stored", file: req.file.originalname });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// const uploadRoute = require("./routes/upload");
// app.use("/upload", uploadRoute);