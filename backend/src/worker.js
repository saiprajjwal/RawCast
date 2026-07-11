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
          // Stub for Facebook
          console.log('Facebook upload not implemented yet.');
        }
        else if (post.channel.platform === 'instagram') {
          // Stub for Instagram
          console.log('Instagram upload not implemented yet.');
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

console.log('Worker started.');
