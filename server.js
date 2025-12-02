require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } = process.env;

// -----------------------------
// Root & Health Routes
// -----------------------------
app.get("/", (req, res) => {
  res.send("SubsAI Backend is running!");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// -----------------------------
// Step 1: Get Google OAuth URL
// -----------------------------
app.get("/auth/url", (req, res) => {
  const scopes = ["https://www.googleapis.com/auth/youtube.readonly"].join(" ");

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    REDIRECT_URI
  )}&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;

  res.json({ url: authUrl });
});

// ---------------------------------------------------
// Step 2: Google OAuth callback -> exchange for token
// ---------------------------------------------------
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code provided");

  try {
    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      null,
      {
        params: {
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to exchange token" });
  }
});

// ----------------------------------------
// Refresh Google access token
// ----------------------------------------
app.post("/oauth/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token)
    return res.status(400).json({ error: "No refresh token provided" });

  try {
    const response = await axios.post(
      "https://oauth2.googleapis.com/token",
      null,
      {
        params: {
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token,
          grant_type: "refresh_token",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to refresh token" });
  }
});

// ------------------------------------------------------------
// /channelStats — main YouTube analytics endpoint
// ------------------------------------------------------------
app.get("/channelStats", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "Missing Authorization header" });

  const accessToken = authHeader.replace("Bearer ", "");

  try {
    const channelRes = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      {
        params: {
          part: "snippet,statistics",
          mine: true,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const channel = channelRes.data.items[0];
    if (!channel) {
      return res.status(404).json({ error: "Channel not found" });
    }

    const stats = channel.statistics;
    const snippet = channel.snippet;

    const responseData = {
      title: snippet.title,
      thumbnailURL: snippet.thumbnails?.default?.url || "",
      subscribers: Number(stats.subscriberCount || 0),
      totalViews: Number(stats.viewCount || 0),
      totalVideos: Number(stats.videoCount || 0),
      totalWatchTime: 0, // YouTube Analytics API needs extra setup
      thumbnailCTR: 0.0, // placeholder
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching channel stats:", error.response?.data || error);
    res.status(500).json({ error: "Failed to fetch channel stats" });
  }
});

// ---------------------------
// Start server (Render-ready)
// ---------------------------
const PORT = parseInt(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`SubsAI Backend is running on port ${PORT}`);
});
