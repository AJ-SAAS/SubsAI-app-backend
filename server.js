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

// 1. Generate Google OAuth URL
app.get("/auth/url", (req, res) => {
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

  res.json({ url });
});

// 2. Google OAuth callback → exchange code for tokens
app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

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
    return res.status(400).json(data);
  }

  // send tokens back to the iOS app
  res.json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in
  });
});

// 3. Example: Fetch YouTube channel stats
app.get("/youtube/stats", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  const url =
    "https://www.googleapis.com/youtube/v3/channels?part=statistics&mine=true";

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  res.json(data);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
