const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const Document = require("../models/Document");

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

module.exports = router;
