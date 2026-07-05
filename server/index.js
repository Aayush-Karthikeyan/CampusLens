const express = require('express');
require("dotenv").config();
const connectDB = require("./db");
connectDB();

const app = express();
app.use(express.json());

const uploadRoute = require("./routes/upload");
app.use("/upload", uploadRoute);

const chatRoute = require("./routes/chat");
app.use("/chat", chatRoute);

app.get('/', (req, res) => {
    res.send('CampusLens API is running');
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});