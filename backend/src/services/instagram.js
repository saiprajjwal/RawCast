const axios = require('axios');

// "Instagram API with Instagram Login" — users log in with their Instagram
// account directly. No Facebook Page required. Uses the separate Instagram
// app credentials (Meta dashboard → Instagram → API setup with Instagram
// business login), NOT the Facebook app ones.
const CLIENT_ID = process.env.INSTAGRAM_CLIENT_ID;
const CLIENT_SECRET = process.env.INSTAGRAM_CLIENT_SECRET;
const REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI; // e.g. https://rawcast-production.up.railway.app/auth/instagram/callback

const GRAPH_VERSION = 'v21.0';
const IG_GRAPH = 'https://graph.instagram.com';

/**
 * Generate the Instagram business login URL
 */
function getAuthUrl() {
  const scopes = [
    'instagram_business_basic',
    'instagram_business_content_publish'
  ].join(',');

  const state = Math.random().toString(36).substring(7);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    response_type: 'code',
    state: state
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange the auth code for a long-lived Instagram user token.
 * Returns { access_token, user_id }
 */
async function getTokens(code) {
  try {
    // Instagram appends '#_' to the code in some redirects — strip it.
    const cleanCode = code.replace(/#_$/, '');

    // Step 1: code -> short-lived token (must be POST form-encoded)
    const form = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code: cleanCode
    });

    const shortRes = await axios.post('https://api.instagram.com/oauth/access_token', form.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const shortLivedToken = shortRes.data.access_token;
    const userId = String(shortRes.data.user_id);

    // Step 2: short-lived -> long-lived (~60 days)
    const longRes = await axios.get(`${IG_GRAPH}/access_token`, {
      params: {
        grant_type: 'ig_exchange_token',
        client_secret: CLIENT_SECRET,
        access_token: shortLivedToken
      }
    });

    return { access_token: longRes.data.access_token, user_id: userId };
  } catch (error) {
    console.error('Error in Instagram token exchange:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Refresh a long-lived token (valid tokens can be refreshed after 24h,
 * before the 60-day expiry). Returns the new token.
 */
async function refreshToken(accessToken) {
  const res = await axios.get(`${IG_GRAPH}/refresh_access_token`, {
    params: {
      grant_type: 'ig_refresh_token',
      access_token: accessToken
    }
  });
  return res.data.access_token;
}

/**
 * Get the logged-in Instagram account's profile
 */
async function getProfile(accessToken) {
  const res = await axios.get(`${IG_GRAPH}/${GRAPH_VERSION}/me`, {
    params: {
      fields: 'user_id,username,account_type',
      access_token: accessToken
    }
  });
  return res.data; // { user_id, username, account_type }
}

/**
 * Publish a video (as a Reel) to the Instagram account.
 * videoUrl must be publicly reachable.
 */
async function uploadVideo(igUserId, accessToken, videoUrl, caption) {
  try {
    console.log(`[IG Login] Starting upload for account ${igUserId}`);

    // Step 1: create media container (videos publish as Reels)
    const containerRes = await axios.post(`${IG_GRAPH}/${GRAPH_VERSION}/${igUserId}/media`, null, {
      params: {
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken
      }
    });

    const creationId = containerRes.data.id;
    console.log(`[IG Login] Container created: ${creationId}`);

    // Step 2: poll until the container is ready
    let finished = false;
    for (let attempt = 1; attempt <= 20 && !finished; attempt++) {
      await new Promise((r) => setTimeout(r, 5000));
      const statusRes = await axios.get(`${IG_GRAPH}/${GRAPH_VERSION}/${creationId}`, {
        params: { fields: 'status_code', access_token: accessToken }
      });
      const status = statusRes.data.status_code;
      console.log(`[IG Login] Container status [${attempt}]: ${status}`);
      if (status === 'FINISHED') finished = true;
      else if (status === 'ERROR') throw new Error('Instagram could not process the video');
    }
    if (!finished) throw new Error('Instagram container processing timed out');

    // Step 3: publish
    const publishRes = await axios.post(`${IG_GRAPH}/${GRAPH_VERSION}/${igUserId}/media_publish`, null, {
      params: { creation_id: creationId, access_token: accessToken }
    });

    console.log('[IG Login] Publish success:', publishRes.data);
    return publishRes.data; // { id }
  } catch (error) {
    console.error('[IG Login] Error uploading:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  getTokens,
  refreshToken,
  getProfile,
  uploadVideo
};
