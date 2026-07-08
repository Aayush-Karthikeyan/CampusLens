const mongoose = require("mongoose");

const CHAT_TTL_DAYS = 7;

function nextExpiry() {
  return new Date(Date.now() + CHAT_TTL_DAYS * 24 * 60 * 60 * 1000);
}

const sourceSchema = new mongoose.Schema(
  {
    number: Number,
    source: String,
    chunkIndex: Number,
    text: String,
    score: Number,
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    sources: [sourceSchema],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "New chat",
    },
    messages: [messageSchema],
    expiresAt: {
      type: Date,
      default: nextExpiry,
    },
  },
  { timestamps: true }
);

chatSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

chatSessionSchema.methods.refreshExpiry = function refreshExpiry() {
  this.expiresAt = nextExpiry();
};

module.exports = mongoose.model("ChatSession", chatSessionSchema);
