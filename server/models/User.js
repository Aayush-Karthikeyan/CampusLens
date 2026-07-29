const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: [true, "Username is required."],
      trim: true,
    },
    // bcrypt hash only — the raw password is never stored or logged
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Whatever else happens, the hash must never leave the server. Overriding
// toJSON means even an accidental res.json(user) can't leak it.
userSchema.methods.toJSON = function toJSON() {
  return {
    _id: this._id,
    email: this.email,
    username: this.username,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
