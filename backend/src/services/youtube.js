const { google } = require('googleapis');
const fs = require('fs');
const prisma = require('../prisma');

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET,
    process.env.YOUTUBE_REDIRECT_URI
  );
}

// Generate the URL to authorize the app
function getAuthUrl() {
  const oauth2Client = getOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent select_account',
    scope: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly'
    ]
  });
}

// Exchange code for tokens
async function getTokens(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

// Upload a video
async function uploadVideo(channel, post) {
  const oauth2Client = getOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: channel.accessToken,
    refresh_token: channel.refreshToken,
  });

  // Automatically save new tokens if they are refreshed during the request
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      // update both
      await prisma.channel.update({
        where: { id: channel.id },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        },
      });
    } else {
      // update only access token
      await prisma.channel.update({
        where: { id: channel.id },
        data: {
          accessToken: tokens.access_token,
        },
      });
    }
  });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client
  });

  // Calculate publishAt date
  // scheduledDate is YYYY-MM-DD, scheduledTime is HH:MM
  const publishAt = new Date(`${post.scheduledDate}T${post.scheduledTime}:00Z`).toISOString();

  const res = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: post.title,
        description: post.caption || '',
        tags: post.tags ? post.tags.split(',').map(t => t.trim()) : [],
        categoryId: post.categoryId || '22'
      },
      status: {
        privacyStatus: 'private',
        publishAt: publishAt,
        selfDeclaredMadeForKids: post.madeForKids
      },
    },
    media: {
      body: fs.createReadStream(post.localFilePath),
    },
  });

  if (post.thumbnailPath) {
    try {
      await youtube.thumbnails.set({
        videoId: res.data.id,
        media: {
          body: fs.createReadStream(post.thumbnailPath)
        }
      });
      console.log(`Successfully uploaded thumbnail for video ${res.data.id}`);
    } catch (thumbErr) {
      console.error(`Failed to upload thumbnail for video ${res.data.id}:`, thumbErr);
    }
  }

  return res.data;
}

async function getChannelName(tokens) {
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    const res = await youtube.channels.list({ part: 'snippet', mine: true });
    if (res.data.items && res.data.items.length > 0) {
      const channel = res.data.items[0];
      const title = channel.snippet.title;
      const handle = channel.snippet.customUrl || channel.id.substring(0, 8) + '...';
      return `${title} (${handle})`;
    }
  } catch (err) {
    console.error('Error fetching channel name:', err);
  }
  return null;
}

module.exports = {
  getAuthUrl,
  getTokens,
  uploadVideo,
  getChannelName
};
