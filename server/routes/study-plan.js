const express = require("express");
const router = express.Router();
const StudyPlan = require("../models/StudyPlan");
const { query } = require("../rag/query");
const { generateStudyPlan, PLAN_RETRIEVAL_SEED } = require("../rag/studyPlan");
const { normalizeGeminiError } = require("../lib/geminiError");
const { normalizeDbError } = require("../lib/httpError");

const MAX_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Midnight today, so day counting isn't skewed by the current time of day.
function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Parse "2026-07-20" as LOCAL midnight. Passing that string to new Date() would
// parse it as UTC midnight, and every date we then read back with local getters
// (.getDate() etc.) would shift back a day for anyone west of UTC — so a student
// in Calgary (UTC-6) picking a Monday exam would get a plan ending the Saturday
// before it. Build the date from its parts instead.
function parseLocalDate(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysUntil(examDate) {
  const exam = new Date(
    examDate.getFullYear(),
    examDate.getMonth(),
    examDate.getDate()
  );
  return Math.round((exam - startOfToday()) / MS_PER_DAY);
}

// Load the saved plan for a course (null if the student hasn't made one yet).
router.get("/", async (req, res) => {
  try {
    const { courseId } = req.query;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const plan = await StudyPlan.findOne({ course: courseId });
    res.json(plan);
  } catch (error) {
    const { statusCode, message } = normalizeDbError(
      error,
      "Could not load the study plan."
    );
    res.status(statusCode).json({ error: message });
  }
});

// Tick a single task on or off. Kept as its own small endpoint so checking a box
// doesn't have to round-trip the entire plan.
router.patch("/task", async (req, res) => {
  try {
    const { courseId, day, taskIndex, done } = req.body;
    if (!courseId || !Number.isInteger(day) || !Number.isInteger(taskIndex)) {
      return res
        .status(400)
        .json({ error: "courseId, day and taskIndex are required" });
    }

    const plan = await StudyPlan.findOne({ course: courseId });
    if (!plan) {
      return res.status(404).json({ error: "No study plan for this course" });
    }

    const planDay = plan.days.find((d) => d.day === day);
    const task = planDay?.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    task.done = Boolean(done);
    await plan.save();
    res.json(plan);
  } catch (error) {
    const { statusCode, message } = normalizeDbError(
      error,
      "Could not update the task."
    );
    res.status(statusCode).json({ error: message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { courseId, focus } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const examDate = parseLocalDate(req.body.examDate);
    if (!examDate) {
      return res.status(400).json({ error: "A valid exam date is required" });
    }

    const until = daysUntil(examDate);
    if (until <= 0) {
      return res
        .status(400)
        .json({ error: "Your exam date needs to be in the future." });
    }

    // Cap the plan length: output tokens drive latency, and nobody follows a
    // 40-day plan made 40 days out anyway. They can regenerate closer to the exam.
    const days = Math.min(until, MAX_DAYS);

    // Broad retrieval so the plan covers the course, not one corner of it.
    const topK = Math.min(days * 2, 16);
    const matches = await query(PLAN_RETRIEVAL_SEED, courseId, topK);

    if (matches.length === 0) {
      return res.status(400).json({
        error: "No study material found for this course. Upload a PDF first.",
      });
    }

    const generated = await generateStudyPlan(matches, days, focus?.trim() || "");
    if (generated.length === 0) {
      return res.status(422).json({
        error: "Couldn't build a plan from this material. Try a different course.",
      });
    }

    // Map day numbers -> real calendar dates here, not in the model. Tasks become
    // objects so the student can tick them off and have that progress persist.
    const today = startOfToday();
    const withDates = generated.map((d) => ({
      ...d,
      date: new Date(today.getTime() + (d.day - 1) * MS_PER_DAY),
      tasks: d.tasks.map((text) => ({ text, done: false })),
    }));

    // One plan per course: upsert so regenerating overwrites instead of piling up.
    const plan = await StudyPlan.findOneAndUpdate(
      { course: courseId },
      {
        course: courseId,
        examDate,
        focus: focus?.trim() || "",
        days: withDates,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(plan);
  } catch (error) {
    const normalized = normalizeGeminiError(
      error,
      "Couldn't build your study plan. Please try again."
    );
    res.status(normalized.statusCode).json({ error: normalized.message });
  }
});

module.exports = router;
