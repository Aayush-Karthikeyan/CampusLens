const Course = require("../models/Course");

// Every route that accepts a courseId funnels through this. Scoping is done by
// querying `{ _id, owner }` together rather than fetching then comparing, so a
// course belonging to someone else is indistinguishable from one that does not
// exist — no "this exists but isn't yours" oracle, and no way to forget the
// check and still get a result back.
//
// Documents, chat sessions and study plans have no owner field of their own;
// they inherit scope through the course they belong to, which keeps a single
// place to get authorization right.
async function findOwnedCourse(courseId, userId) {
  if (!courseId || !userId) return null;
  return Course.findOne({ _id: courseId, owner: userId });
}

module.exports = { findOwnedCourse };
