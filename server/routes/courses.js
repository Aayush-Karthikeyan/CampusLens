const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const Document = require("../models/Document");
const ChatSession = require("../models/ChatSession");
const {
  deleteCourseVectors,
  deleteDocumentVectors,
} = require("../rag/deleteVectors");

router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    const course = await Course.create({ name });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/documents", async (req, res) => {
  try {
    const documents = await Document.find({ course: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:courseId/documents/:documentId", async (req, res) => {
  try {
    const { courseId, documentId } = req.params;
    const document = await Document.findOne({ _id: documentId, course: courseId });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    await deleteDocumentVectors(courseId, document);
    await Document.findByIdAndDelete(documentId);

    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    await deleteCourseVectors(req.params.id);
    await Document.deleteMany({ course: req.params.id });
    await ChatSession.deleteMany({ course: req.params.id });
    await Course.findByIdAndDelete(req.params.id);

    res.json({ message: "Course deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
