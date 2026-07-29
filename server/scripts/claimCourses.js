// One-off migration: courses created before accounts existed have no owner, so
// once ownership filtering is live they belong to nobody and vanish from every
// view. This assigns them to a named account instead of deleting anything.
//
//   node scripts/claimCourses.js you@example.com "Your Name" yourpassword
//
// Safe to re-run: it only touches courses that still have no owner, and reuses
// the account if it already exists.
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../db");
const User = require("../models/User");
const Course = require("../models/Course");
const { hashPassword } = require("../lib/auth");

async function main() {
  const [email, username, password] = process.argv.slice(2);

  if (!email || !username || !password) {
    console.error(
      'Usage: node scripts/claimCourses.js <email> "<username>" <password>'
    );
    process.exit(1);
  }

  await connectDB();

  let user = await User.findOne({ email: email.toLowerCase() });
  if (user) {
    console.log(`Using existing account: ${user.email}`);
  } else {
    user = await User.create({
      email: email.toLowerCase(),
      username,
      passwordHash: await hashPassword(password),
    });
    console.log(`Created account: ${user.email}`);
  }

  // `owner: null` covers docs written before the field existed as well as any
  // explicitly nulled ones
  const orphaned = await Course.find({
    $or: [{ owner: { $exists: false } }, { owner: null }],
  });

  if (orphaned.length === 0) {
    console.log("No unowned courses found — nothing to migrate.");
  } else {
    console.log(`Claiming ${orphaned.length} course(s):`);
    for (const course of orphaned) {
      console.log(`  - ${course.name}`);
    }
    await Course.updateMany(
      { $or: [{ owner: { $exists: false } }, { owner: null }] },
      { $set: { owner: user._id } }
    );
    console.log("Done. Their documents, chats and study plans follow the course.");
  }

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error("Migration failed:", error.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
