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

const metaService = require('../services/meta');

// Facebook & Instagram OAuth flow
router.get('/facebook', (req, res) => {
  const url = metaService.getAuthUrl();
  res.redirect(url);
});

router.get('/facebook/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const tokens = await metaService.getTokens(code);
    const pages = await metaService.getPages(tokens.access_token);
    
    // We will save each Facebook Page as a channel, and if it has an IG account, save that too
    for (const page of pages) {
      // Save Facebook Page
      const fbExisting = await prisma.channel.findFirst({
        where: { platform: 'facebook', name: page.name }
      });
      
      let fbChannelId;
      if (fbExisting) {
        await prisma.channel.update({
          where: { id: fbExisting.id },
          data: { accessToken: page.access_token, accountId: page.id }
        });
        fbChannelId = fbExisting.id;
      } else {
        const newFb = await prisma.channel.create({
          data: {
            platform: 'facebook',
            name: page.name,
            accessToken: page.access_token,
            accountId: page.id
          }
        });
        fbChannelId = newFb.id;
      }

      // Check for connected Instagram account
      const igAccountId = await metaService.getInstagramAccountId(page.id, page.access_token);
      if (igAccountId) {
        const igName = `IG: ${page.name}`; // We use the page name as we don't fetch the IG username directly to save API calls
        const igExisting = await prisma.channel.findFirst({
          where: { platform: 'instagram', name: igName }
        });

        if (igExisting) {
          await prisma.channel.update({
            where: { id: igExisting.id },
            data: { accessToken: page.access_token, accountId: igAccountId }
          });
        } else {
          await prisma.channel.create({
            data: {
              platform: 'instagram',
              name: igName,
              accessToken: page.access_token,
              accountId: igAccountId
            }
          });
        }
      }
    }

    res.send(`
      <html>
        <body>
          <h2>Facebook & Instagram Authorized Successfully!</h2>
          <p>You can close this window and go back to RawCast.</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Facebook OAuth Callback Error:', error);
    res.status(500).send('Authentication failed');
  }
});

module.exports = router;
