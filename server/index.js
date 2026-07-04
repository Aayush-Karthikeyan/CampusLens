const express = require('express');
require("dotenv").config();
const connectDB = require("./db");
connectDB();

// const Course = require("./models/Course");

// async function testCourse() {
//   const c = await Course.create({ name: "Data Structures" });
//   console.log("Created course:", c);
// }
// testCourse();

// const Course = require("./models/Course");
// const Document = require("./models/Document");

// async function testDoc() {
//   const c = await Course.create({ name: "Test Course" });
//   const d = await Document.create({ filename: "notes.pdf", course: c._id });
//   console.log("Created document:", d);
// }
// testDoc();

const app = express();

const uploadRoute = require("./routes/upload");
app.use("/upload", uploadRoute);

app.get('/', (req, res) => {
    res.send('CampusLens API is running');
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});