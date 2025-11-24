// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ENV VARS (Railway will store these)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// ---------------------------
// 1. Redirect user to Google OAuth
// ---------------------------
app.get("/auth", (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
    "openid",
    "email",
    "profile"
  ].join(" ");

  const url =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    `client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    "&response_type=code" +
    `&scope=${encodeURIComponent(scopes)}` +
    "&access_type=offline" +
    "&prompt=consent";

  // Redirect browser directly to Google login
  res.redirect(url);
});

// ---------------------------
// 2. OAuth callback: exchange code for tokens
// ---------------------------
app.get("/oauth/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) return res.status(400).send("Missing code in query parameters");

    const tokenUrl = "https://oauth2.googleapis.com/token";

    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("redirect_uri", REDIRECT_URI);
    params.append("grant_type", "authorization_code");

    const response = await fetch(tokenUrl, {
      method: "POST",
      body: params,
    });

    const data = await response.json();

    if (data.error) {
      console.error("Token error:", data);
      return res.status(400).json(data);
    }

    console.log("OAuth success:", data);

    // Send tokens as JSON (your iOS app will receive these)
    res.json({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    });

  } catch (err) {
    console.error("Callback exception:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ---------------------------
// 3. Fetch YouTube channel stats
// ---------------------------
app.get("/youtube/stats", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).send("Missing access token");

    const url = "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true";

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    res.json(data);

  } catch (err) {
    console.error("Stats fetch error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ---------------------------
// Start the server
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
