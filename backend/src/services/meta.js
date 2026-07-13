const axios = require('axios');

const CLIENT_ID = process.env.FACEBOOK_CLIENT_ID;
const CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET;
const REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI; // e.g. https://rawcast-production.up.railway.app/auth/facebook/callback

const GRAPH_VERSION = 'v19.0';
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Generate OAuth URL for Facebook Login
 */
function getAuthUrl() {
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish'
  ].join(',');

  const state = Math.random().toString(36).substring(7);
  
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    state: state,
    response_type: 'code'
  });

  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange code for user access token
 */
async function getTokens(code) {
  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code
    });

    const url = `${GRAPH_BASE_URL}/oauth/access_token?${params.toString()}`;
    const response = await axios.get(url);
    const shortLivedToken = response.data.access_token;

    // Exchange short-lived token for a long-lived one
    const longLivedParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      fb_exchange_token: shortLivedToken
    });

    const longLivedResponse = await axios.get(`${GRAPH_BASE_URL}/oauth/access_token?${longLivedParams.toString()}`);
    return longLivedResponse.data; // contains access_token
  } catch (error) {
    console.error('Error in Facebook token exchange:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get the user's Facebook Pages and their Page Access Tokens
 */
async function getPages(userAccessToken) {
  try {
    const response = await axios.get(`${GRAPH_BASE_URL}/me/accounts`, {
      params: {
        access_token: userAccessToken
      }
    });
    return response.data.data; // Array of pages: { id, name, access_token }
  } catch (error) {
    console.error('Error fetching Facebook Pages:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get the connected Instagram Professional Account ID for a Facebook Page
 */
async function getInstagramAccountId(pageId, pageAccessToken) {
  try {
    const response = await axios.get(`${GRAPH_BASE_URL}/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageAccessToken
      }
    });
    return response.data.instagram_business_account?.id || null;
  } catch (error) {
    console.error(`Error fetching IG Account for page ${pageId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Upload a video to Instagram (Note: requires a publicly accessible video URL)
 */
async function uploadInstagramVideo(igAccountId, pageAccessToken, videoUrl, caption) {
  try {
    console.log(`Starting IG upload for account ${igAccountId}`);
    console.log(`Video URL: ${videoUrl}`);

    // Step 1: Create media container
    const createContainerResponse = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media`, null, {
      params: {
        video_url: videoUrl,
        media_type: 'VIDEO',
        caption: caption,
        access_token: pageAccessToken
      }
    });

    const creationId = createContainerResponse.data.id;
    console.log(`IG Media Container created: ${creationId}`);

    // Step 2: Poll for completion (Wait until container is FINISHED)
    let isFinished = false;
    let attempts = 0;
    while (!isFinished && attempts < 15) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds
      attempts++;
      
      const statusResponse = await axios.get(`${GRAPH_BASE_URL}/${creationId}`, {
        params: {
          fields: 'status_code',
          access_token: pageAccessToken
        }
      });

      const status = statusResponse.data.status_code;
      console.log(`IG Container status [${attempts}]: ${status}`);
      
      if (status === 'FINISHED') {
        isFinished = true;
      } else if (status === 'ERROR') {
        throw new Error('IG Container failed to process the video');
      }
    }

    if (!isFinished) {
      throw new Error('IG Container processing timed out');
    }

    // Step 3: Publish the container
    const publishResponse = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media_publish`, null, {
      params: {
        creation_id: creationId,
        access_token: pageAccessToken
      }
    });

    console.log('IG Publish success:', publishResponse.data);
    return publishResponse.data;
  } catch (error) {
    console.error('Error uploading to Instagram:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Upload a video to Facebook Page
 * Facebook allows uploading directly with a video file OR URL. Let's use URL for consistency.
 */
async function uploadFacebookVideo(pageId, pageAccessToken, videoUrl, description, title) {
  try {
    console.log(`Starting FB upload for page ${pageId}`);
    
    const response = await axios.post(`https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/videos`, null, {
      params: {
        file_url: videoUrl,
        description: description,
        title: title,
        access_token: pageAccessToken
      }
    });

    console.log('FB Publish success:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading to Facebook:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  getTokens,
  getPages,
  getInstagramAccountId,
  uploadInstagramVideo,
  uploadFacebookVideo
};
