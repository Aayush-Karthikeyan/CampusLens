const mongoose = require("mongoose");

// A single task the student can tick off. Stored as an object rather than a bare
// string so progress survives a refresh.
const taskSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    done: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// One day of the plan. `date` is computed on the server from the day number —
// the model is never asked to do date arithmetic (LLMs are unreliable at it).
const daySchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    focus: {
      type: String,
      required: true,
    },
    tasks: [taskSchema],
    sources: [String],
  },
  { _id: false }
);

const studyPlanSchema = new mongoose.Schema(
  {
    // Unique: one saved plan per course. Regenerating upserts over it rather
    // than piling up plans the student will never look at again.
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      unique: true,
    },
    examDate: {
      type: Date,
      required: true,
    },
    focus: {
      type: String,
      trim: true,
      default: "",
    },
    days: [daySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyPlan", studyPlanSchema);
