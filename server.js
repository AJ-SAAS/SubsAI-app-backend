const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("SubsAI Backend is running!"));
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/favicon.ico", (req, res) => res.status(204).end());

const PORT = process.env.PORT || 3000;

// IMPORTANT: bind to 0.0.0.0 so Railway can route external requests
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
