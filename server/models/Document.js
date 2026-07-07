const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  vectorMetadataVersion: {
    type: Number,
    default: 1,
  },
});

module.exports = mongoose.model("Document", documentSchema);
