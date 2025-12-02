const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("SubsAI Backend is running!"));
app.get("/health", (req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
