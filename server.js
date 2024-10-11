const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');

dotenv.config(); // Load environment variables from .env file

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Instagram OAuth login URL
app.get('/auth/instagram', (req, res) => {
    const instagramAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_APP_ID}&redirect_uri=${process.env.INSTAGRAM_REDIRECT_URI}&scope=user_profile,user_media&response_type=code`;
    res.redirect(instagramAuthUrl);
});

// Instagram OAuth callback route
app.get('/auth/instagram/callback', async (req, res) => {
    const { code } = req.query; // Authorization code from Instagram

    if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
    }

    try {
        // Exchange authorization code for access token
        const tokenUrl = 'https://api.instagram.com/oauth/access_token';
        const response = await axios.post(tokenUrl, {
            client_id: process.env.INSTAGRAM_APP_ID,
            client_secret: process.env.INSTAGRAM_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: process.env.INSTAGRAM_REDIRECT_URI,
            code: code,
        });

        const { access_token } = response.data;

        // Fetch basic user info using access token
        const userInfoUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${access_token}`;
        const userInfo = await axios.get(userInfoUrl);

        res.json({
            user: userInfo.data,
            access_token,
        });
    } catch (error) {
        console.error('Error fetching Instagram token:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to fetch Instagram token' });
    }
});

// Verification route for Instagram Webhooks
app.get('/webhook/instagram', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Token from your .env file

    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            // Respond with the challenge token to verify webhook
            return res.status(200).send(challenge);
        } else {
            // Respond with '403 Forbidden' if tokens don't match
            return res.sendStatus(403);
        }
    }
});

// Handle incoming webhook events (e.g., new media, profile updates)
app.post('/webhook/instagram', (req, res) => {
    const event = req.body;
    console.log('Webhook event received:', event);

    // Handle event here (e.g., process new media or profile updates)

    // Acknowledge receipt of the event
    res.sendStatus(200);
});

// Root route for testing if the server is running
app.get('/', (req, res) => {
    res.send('Instagram OAuth and Webhook server is running.');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
});
