const axios = require('axios');
const fs = require('fs');
const prisma = require('../prisma');

function getAuthUrl() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://rawcast-production.up.railway.app/auth/tiktok/callback';
  
  // Generating a random CSRF state token
  const state = Math.random().toString(36).substring(2);
  
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: 'user.info.basic,video.upload',
    redirect_uri: redirectUri,
    state: state,
  });

  return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
}

async function getTokens(code) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI || 'https://rawcast-production.up.railway.app/auth/tiktok/callback';

  const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  }).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  return response.data; // access_token, refresh_token, open_id
}

async function getChannelName(accessToken) {
  try {
    const response = await axios.get('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (response.data && response.data.data && response.data.data.user) {
      return response.data.data.user.display_name;
    }
  } catch (error) {
    console.error('Error fetching TikTok user info:', error.response?.data || error.message);
  }
  return null;
}

async function uploadVideo(channel, post) {
  try {
    // Note: A robust TikTok integration would check the refresh token if the access token is expired.
    // For this prototype, we'll try to use the access token directly.
    
    const accessToken = channel.accessToken;
    const stat = fs.statSync(post.localFilePath);
    const fileSize = stat.size;

    // 1. Initialize Post
    const initResponse = await axios.post('https://open.tiktokapis.com/v2/post/publish/inbox/video/init/', {
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: fileSize,
        total_chunk_count: 1
      }
    }, {
      headers: { 
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json' 
      }
    });

    if (initResponse.data.error.code !== 'ok') {
      throw new Error(`TikTok Init Error: ${initResponse.data.error.message}`);
    }

    const { publish_id, upload_url } = initResponse.data.data;

    // 2. Upload Video chunk (PUT)
    const videoStream = fs.createReadStream(post.localFilePath);
    
    await axios.put(upload_url, videoStream, {
      headers: {
        'Content-Type': 'video/mp4', // Assuming mp4
        'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log(`TikTok Video uploaded successfully to inbox! Publish ID: ${publish_id}`);
    
    // TikTok videos sent to the inbox need to be finalized by the user in the app,
    // so returning the publish_id signifies the upload to the inbox was successful.
    return { id: publish_id };
    
  } catch (error) {
    console.error('TikTok Upload Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  getTokens,
  getChannelName,
  uploadVideo
};
