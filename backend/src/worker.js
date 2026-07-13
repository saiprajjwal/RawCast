const cron = require('node-cron');
const fs = require('fs/promises');
const prisma = require('./prisma');
const youtubeService = require('./services/youtube');

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
          const path = require('path');
          const filename = path.basename(post.localFilePath);
          // TODO: In a real prod environment, use the dynamic base URL from env
          const videoUrl = 'https://rawcast-production.up.railway.app/uploads/' + filename;
          
          const result = await metaService.uploadFacebookVideo(
            post.channel.accountId, // pageId is saved in accountId
            post.channel.accessToken,
            videoUrl,
            post.caption || '',
            post.title || ''
          );
          
          console.log(`Successfully uploaded to Facebook. Video ID: ${result.id}`);
          
          await prisma.post.update({
            where: { id: post.id },
            data: { 
              status: 'uploaded',
              platformPostId: result.id
            }
          });

          // Delete the local files
          if (post.localFilePath) await fs.unlink(post.localFilePath);
          if (post.thumbnailPath) await fs.unlink(post.thumbnailPath);
          await prisma.post.update({
            where: { id: post.id },
            data: { localFilePath: null, thumbnailPath: null }
          });
        }
        else if (post.channel.platform === 'instagram') {
          const path = require('path');
          const filename = path.basename(post.localFilePath);
          const videoUrl = 'https://rawcast-production.up.railway.app/uploads/' + filename;

          let result;
          if (post.channel.authKind === 'instagram_login') {
            // Connected directly with Instagram business login
            const instagramService = require('./services/instagram');
            result = await instagramService.uploadVideo(
              post.channel.accountId,
              post.channel.accessToken,
              videoUrl,
              post.caption || ''
            );
          } else {
            // Legacy: IG account linked to a Facebook Page
            const metaService = require('./services/meta');
            result = await metaService.uploadInstagramVideo(
              post.channel.accountId, // igAccountId
              post.channel.accessToken, // page access token
              videoUrl,
              post.caption || ''
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

          // Delete the local files
          if (post.localFilePath) await fs.unlink(post.localFilePath);
          if (post.thumbnailPath) await fs.unlink(post.thumbnailPath);
          await prisma.post.update({
            where: { id: post.id },
            data: { localFilePath: null, thumbnailPath: null }
          });
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
