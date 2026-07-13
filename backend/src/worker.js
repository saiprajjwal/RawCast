const cron = require('node-cron');
const fs = require('fs/promises');
const path = require('path');
const prisma = require('./prisma');
const youtubeService = require('./services/youtube');

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://rawcast-production.up.railway.app';

function publicUploadUrl(localPath) {
  return `${PUBLIC_BASE_URL}/uploads/${path.basename(localPath)}`;
}

function photoPathsOf(post) {
  try {
    return post.photoPaths ? JSON.parse(post.photoPaths) : [];
  } catch {
    return [];
  }
}

// Delete all local media for a post and clear the DB pointers
async function cleanupPostFiles(post) {
  const files = [post.localFilePath, post.thumbnailPath, ...photoPathsOf(post)].filter(Boolean);
  for (const file of files) {
    try {
      await fs.unlink(file);
      console.log(`Deleted local file: ${file}`);
    } catch (err) {
      console.error(`Could not delete ${file}:`, err.message);
    }
  }
  if (files.length > 0) {
    await prisma.post.update({
      where: { id: post.id },
      data: { localFilePath: null, thumbnailPath: null, photoPaths: null }
    });
  }
}

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('Worker running: checking for pending posts...');
  
  try {
    const pendingPosts = await prisma.post.findMany({
      where: { status: 'pending' },
      include: { channel: true }
    });

    for (const post of pendingPosts) {
      console.log(`Processing post ${post.id} for channel ${post.channel.platform}`);
      
      try {
        if (post.channel.platform === 'youtube') {
          // Upload to YouTube
          const result = await youtubeService.uploadVideo(post.channel, post);
          console.log(`Successfully uploaded to YouTube. Video ID: ${result.id}`);
          
          // Update DB status to uploaded
          await prisma.post.update({
            where: { id: post.id },
            data: { 
              status: 'uploaded',
              platformPostId: result.id
            }
          });

          // Delete the local files
          if (post.localFilePath) {
            await fs.unlink(post.localFilePath);
            console.log(`Deleted local file: ${post.localFilePath}`);
          }
          if (post.thumbnailPath) {
            await fs.unlink(post.thumbnailPath);
            console.log(`Deleted thumbnail file: ${post.thumbnailPath}`);
          }
          
          if (post.localFilePath || post.thumbnailPath) {
            // Clear paths in DB
            await prisma.post.update({
              where: { id: post.id },
              data: { localFilePath: null, thumbnailPath: null }
            });
          }
        } 
        else if (post.channel.platform === 'facebook') {
          const metaService = require('./services/meta');
          const photos = photoPathsOf(post);

          let result;
          if (photos.length > 0) {
            result = await metaService.uploadFacebookPhotos(
              post.channel.accountId,
              post.channel.accessToken,
              photos.map(publicUploadUrl),
              post.caption || post.title || ''
            );
          } else {
            result = await metaService.uploadFacebookVideo(
              post.channel.accountId, // pageId is saved in accountId
              post.channel.accessToken,
              publicUploadUrl(post.localFilePath),
              post.caption || '',
              post.title || ''
            );
          }

          console.log(`Successfully uploaded to Facebook. ID: ${result.id}`);

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'uploaded',
              platformPostId: result.id
            }
          });

          await cleanupPostFiles(post);
        }
        else if (post.channel.platform === 'instagram') {
          const photos = photoPathsOf(post);
          const directLogin = post.channel.authKind === 'instagram_login';
          const caption = post.caption || '';

          let result;
          if (directLogin) {
            const instagramService = require('./services/instagram');
            result = photos.length > 0
              ? await instagramService.uploadPhotos(
                  post.channel.accountId,
                  post.channel.accessToken,
                  photos.map(publicUploadUrl),
                  caption
                )
              : await instagramService.uploadVideo(
                  post.channel.accountId,
                  post.channel.accessToken,
                  publicUploadUrl(post.localFilePath),
                  caption
                );
          } else {
            // Legacy: IG account linked to a Facebook Page
            const metaService = require('./services/meta');
            result = photos.length > 0
              ? await metaService.uploadInstagramPhotos(
                  post.channel.accountId,
                  post.channel.accessToken,
                  photos.map(publicUploadUrl),
                  caption
                )
              : await metaService.uploadInstagramVideo(
                  post.channel.accountId, // igAccountId
                  post.channel.accessToken, // page access token
                  publicUploadUrl(post.localFilePath),
                  caption
                );
          }

          console.log(`Successfully uploaded to Instagram. Publish ID: ${result.id}`);

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: 'uploaded',
              platformPostId: result.id
            }
          });

          await cleanupPostFiles(post);
        }
        else if (post.channel.platform === 'tiktok') {
          const tiktokService = require('./services/tiktok');
          const result = await tiktokService.uploadVideo(post.channel, post);
          console.log(`Successfully uploaded to TikTok. Publish ID: ${result.id}`);
          
          await prisma.post.update({
            where: { id: post.id },
            data: { 
              status: 'uploaded',
              platformPostId: result.id
            }
          });

          // Delete the local files
          if (post.localFilePath) {
            await fs.unlink(post.localFilePath);
            console.log(`Deleted local file: ${post.localFilePath}`);
          }
          if (post.thumbnailPath) {
            await fs.unlink(post.thumbnailPath);
            console.log(`Deleted thumbnail file: ${post.thumbnailPath}`);
          }
          
          if (post.localFilePath || post.thumbnailPath) {
            await prisma.post.update({
              where: { id: post.id },
              data: { localFilePath: null, thumbnailPath: null }
            });
          }
        }
        else {
          console.log(`Unknown platform: ${post.channel.platform}`);
        }
      } catch (uploadError) {
        console.error(`Failed to upload post ${post.id}:`, uploadError);
        // Optionally set status to failed
        await prisma.post.update({
          where: { id: post.id },
          data: { status: 'failed' }
        });
      }
    }
  } catch (error) {
    console.error('Worker error:', error);
  }
});

// Instagram-login tokens expire after ~60 days; refresh them weekly (Mon 3 AM)
cron.schedule('0 3 * * 1', async () => {
  try {
    const igChannels = await prisma.channel.findMany({
      where: { platform: 'instagram', authKind: 'instagram_login' }
    });
    const instagramService = require('./services/instagram');
    for (const channel of igChannels) {
      try {
        const newToken = await instagramService.refreshToken(channel.accessToken);
        await prisma.channel.update({
          where: { id: channel.id },
          data: { accessToken: newToken }
        });
        console.log(`Refreshed Instagram token for ${channel.name}`);
      } catch (err) {
        console.error(`Failed to refresh Instagram token for ${channel.name}:`, err.response?.data || err.message);
      }
    }
  } catch (error) {
    console.error('Instagram token refresh job error:', error);
  }
});

console.log('Worker started.');
