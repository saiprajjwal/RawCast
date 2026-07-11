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
    const actualName = await youtubeService.getChannelName(tokens);
    
    const count = await prisma.channel.count({
      where: { platform: 'youtube' }
    });
    
    const channelName = actualName || `YouTube Channel ${count + 1}`;
    
    const existing = await prisma.channel.findFirst({
      where: { platform: 'youtube', name: channelName }
    });
    
    if (existing) {
      await prisma.channel.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken
        }
      });
    } else {
      await prisma.channel.create({
        data: {
          platform: 'youtube',
          name: channelName,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }
      });
    }

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

const tiktokService = require('../services/tiktok');

// TikTok OAuth flow
router.get('/tiktok', (req, res) => {
  const url = tiktokService.getAuthUrl();
  res.redirect(url);
});

router.get('/tiktok/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const tokens = await tiktokService.getTokens(code);
    const actualName = await tiktokService.getChannelName(tokens.access_token);
    
    const count = await prisma.channel.count({
      where: { platform: 'tiktok' }
    });
    
    const channelName = actualName || `TikTok Account ${count + 1}`;
    
    const existing = await prisma.channel.findFirst({
      where: { platform: 'tiktok', name: channelName }
    });
    
    if (existing) {
      await prisma.channel.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing.refreshToken
        }
      });
    } else {
      await prisma.channel.create({
        data: {
          platform: 'tiktok',
          name: channelName,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        }
      });
    }

    res.send(`
      <html>
        <body>
          <h2>TikTok Authorized Successfully!</h2>
          <p>You can close this window and go back to RawCast.</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('TikTok OAuth Callback Error:', error);
    res.status(500).send('Authentication failed');
  }
});

module.exports = router;
