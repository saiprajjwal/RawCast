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

/** Wait until a container is ready to publish (page-token variant). */
async function waitForIgContainer(creationId, pageAccessToken) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    const statusRes = await axios.get(`${GRAPH_BASE_URL}/${creationId}`, {
      params: { fields: 'status_code', access_token: pageAccessToken }
    });
    const status = statusRes.data.status_code;
    if (status === 'FINISHED') return;
    if (status === 'ERROR') throw new Error('IG Container failed to process the media');
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('IG Container processing timed out');
}

/**
 * Publish one photo, or 2-10 as a carousel, to a page-linked IG account.
 */
async function uploadInstagramPhotos(igAccountId, pageAccessToken, photoUrls, caption) {
  try {
    console.log(`Publishing ${photoUrls.length} IG photo(s) for account ${igAccountId}`);

    if (photoUrls.length === 1) {
      const containerRes = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media`, null, {
        params: { image_url: photoUrls[0], caption, access_token: pageAccessToken }
      });
      await waitForIgContainer(containerRes.data.id, pageAccessToken);
      const publishRes = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media_publish`, null, {
        params: { creation_id: containerRes.data.id, access_token: pageAccessToken }
      });
      return publishRes.data;
    }

    const children = [];
    for (const url of photoUrls) {
      const childRes = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media`, null, {
        params: { image_url: url, is_carousel_item: true, access_token: pageAccessToken }
      });
      await waitForIgContainer(childRes.data.id, pageAccessToken);
      children.push(childRes.data.id);
    }

    const carouselRes = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media`, null, {
      params: {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption,
        access_token: pageAccessToken
      }
    });
    await waitForIgContainer(carouselRes.data.id, pageAccessToken);

    const publishRes = await axios.post(`${GRAPH_BASE_URL}/${igAccountId}/media_publish`, null, {
      params: { creation_id: carouselRes.data.id, access_token: pageAccessToken }
    });
    return publishRes.data;
  } catch (error) {
    console.error('Error publishing IG photos:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Publish one or more photos to a Facebook Page. Multi-photo posts upload
 * each photo unpublished, then attach them to a single feed post.
 */
async function uploadFacebookPhotos(pageId, pageAccessToken, photoUrls, message) {
  try {
    console.log(`Publishing ${photoUrls.length} FB photo(s) for page ${pageId}`);

    if (photoUrls.length === 1) {
      const res = await axios.post(`${GRAPH_BASE_URL}/${pageId}/photos`, null, {
        params: { url: photoUrls[0], message, access_token: pageAccessToken }
      });
      return { id: res.data.post_id || res.data.id };
    }

    const mediaIds = [];
    for (const url of photoUrls) {
      const res = await axios.post(`${GRAPH_BASE_URL}/${pageId}/photos`, null, {
        params: { url, published: false, access_token: pageAccessToken }
      });
      mediaIds.push(res.data.id);
    }

    const params = new URLSearchParams({ message, access_token: pageAccessToken });
    mediaIds.forEach((id, i) => {
      params.append(`attached_media[${i}]`, JSON.stringify({ media_fbid: id }));
    });

    const feedRes = await axios.post(`${GRAPH_BASE_URL}/${pageId}/feed`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return { id: feedRes.data.id };
  } catch (error) {
    console.error('Error publishing FB photos:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getAuthUrl,
  getTokens,
  getPages,
  getInstagramAccountId,
  uploadInstagramVideo,
  uploadInstagramPhotos,
  uploadFacebookVideo,
  uploadFacebookPhotos
};
