const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const Document = require("../models/Document");
const ChatSession = require("../models/ChatSession");
const StudyPlan = require("../models/StudyPlan");
const {
  deleteCourseVectors,
  deleteDocumentVectors,
} = require("../rag/deleteVectors");
const { normalizeDbError } = require("../lib/httpError");

function fail(res, error, fallback) {
  const { statusCode, message } = normalizeDbError(error, fallback);
  res.status(statusCode).json({ error: message });
}

router.post("/", async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    if (!name) {
      return res.status(400).json({ error: "Course name is required." });
    }
    const course = await Course.create({ name });
    res.json(course);
  } catch (error) {
    fail(res, error, "Could not create the course.");
  }
});

router.get("/", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    fail(res, error, "Could not load courses.");
  }
});

router.get("/:id/documents", async (req, res) => {
  try {
    const documents = await Document.find({ course: req.params.id }).sort({
      createdAt: -1,
    });
    res.json(documents);
  } catch (error) {
    fail(res, error, "Could not load documents.");
  }
});

router.delete("/:courseId/documents/:documentId", async (req, res) => {
  try {
    const { courseId, documentId } = req.params;
    const document = await Document.findOne({ _id: documentId, course: courseId });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Remove the DB row first so the document always disappears for the user;
    // vector cleanup is best-effort — a Pinecone hiccup shouldn't strand it.
    await Document.findByIdAndDelete(documentId);
    try {
      await deleteDocumentVectors(courseId, document);
    } catch (vectorError) {
      console.warn("Document vectors not fully removed:", vectorError.message);
    }

    res.json({ message: "Document deleted" });
  } catch (error) {
    fail(res, error, "Could not delete the document.");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Delete the DB rows first so the course reliably disappears even if the
    // vector store is momentarily unreachable; without this ordering a Pinecone
    // error would abort the whole cascade and leave the course undeletable.
    await Document.deleteMany({ course: req.params.id });
    await ChatSession.deleteMany({ course: req.params.id });
    await StudyPlan.deleteMany({ course: req.params.id });
    await Course.findByIdAndDelete(req.params.id);

    try {
      await deleteCourseVectors(req.params.id);
    } catch (vectorError) {
      console.warn("Course vectors not fully removed:", vectorError.message);
    }

    res.json({ message: "Course deleted" });
  } catch (error) {
    fail(res, error, "Could not delete the course.");
  }
});

module.exports = router;
