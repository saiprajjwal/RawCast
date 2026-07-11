const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const prisma = require('../prisma');

// Endpoint to start the OAuth flow
router.get('/youtube', (req, res) => {
  const url = youtubeService.getAuthUrl();
  res.redirect(url);
});

// OAuth callback
router.get('/youtube/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const tokens = await youtubeService.getTokens(code);
    
    // For simplicity, we just create a generic YouTube channel entry, 
    // or update the existing one if we want to tie it to a specific user.
    // In a real app, you would fetch the channel name from the YouTube API here.
    
    // Just find any existing youtube channel or create one
    // Let's create a new one for demonstration or update existing
    
    const count = await prisma.channel.count({
      where: { platform: 'youtube' }
    });
    
    await prisma.channel.create({
      data: {
        platform: 'youtube',
        name: `YouTube Channel ${count + 1}`,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      }
    });

    res.send(`
      <html>
        <body>
          <h2>YouTube Authorized Successfully!</h2>
          <p>You can close this window and go back to Dailies.</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send('Authentication failed');
  }
});

module.exports = router;
