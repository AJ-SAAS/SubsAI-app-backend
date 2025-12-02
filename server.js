require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI } = process.env;

// Step 1: Generate auth URL
app.get('/auth/url', (req, res) => {
    const scopes = [
        'https://www.googleapis.com/auth/youtube.readonly'
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;

    res.json({ url: authUrl });
});

// Step 2: Handle OAuth callback
app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('No code provided');

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', null, {
            params: {
                code,
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                grant_type: 'authorization_code'
            }
        });

        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to exchange token' });
    }
});

// Optional: Refresh token endpoint
app.post('/oauth/refresh', async (req, res) => {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'No refresh token provided' });

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token,
                grant_type: 'refresh_token'
            }
        });

        res.json(response.data);
    } catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({ error: 'Failed to refresh token' });
    }
});

// ---------------------------
// Start Server (only once)
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
