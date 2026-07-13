const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const prisma = require('../prisma');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { channel: true },
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' }
      ]
    });
    // Format them for the frontend
    const formatted = posts.map(p => {
      let photoCount = 0;
      try { photoCount = p.photoPaths ? JSON.parse(p.photoPaths).length : 0; } catch { /* legacy */ }
      return {
        id: p.id,
        title: p.title,
        caption: p.caption,
        date: p.scheduledDate,
        time: p.scheduledTime,
        status: p.status,
        mediaType: photoCount > 0 ? 'photos' : 'video',
        photoCount,
        selections: [`${p.channel.platform}:${p.channel.id}`]
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new post — media is a video, OR photos (IG carousel / FB multi-photo)
router.post('/', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, caption, date, time, channelId, tags, madeForKids, categoryId } = req.body;

    if (!channelId) {
      return res.status(400).json({ error: 'channelId is required' });
    }

    const channel = await prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) {
      return res.status(400).json({ error: 'Unknown channel' });
    }

    const videoPath = req.files?.['video'] ? req.files['video'][0].path : null;
    const thumbnailPath = req.files?.['thumbnail'] ? req.files['thumbnail'][0].path : null;
    const photoPaths = (req.files?.['photos'] ?? []).map(f => f.path);

    if (!videoPath && photoPaths.length === 0) {
      return res.status(400).json({ error: 'A video or at least one photo is required' });
    }
    if (videoPath && photoPaths.length > 0) {
      return res.status(400).json({ error: 'Choose either a video or photos, not both' });
    }
    // Photos only make sense on Instagram / Facebook
    if (photoPaths.length > 0 && !['instagram', 'facebook'].includes(channel.platform)) {
      return res.status(400).json({ error: `${channel.platform} posts need a video` });
    }

    const post = await prisma.post.create({
      data: {
        title,
        caption,
        scheduledDate: date,
        scheduledTime: time,
        localFilePath: videoPath,
        thumbnailPath: thumbnailPath,
        photoPaths: photoPaths.length > 0 ? JSON.stringify(photoPaths) : null,
        tags: tags || '',
        madeForKids: madeForKids === 'true',
        categoryId: categoryId || '22',
        channelId: channelId,
        status: 'pending'
      }
    });

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Update a post's schedule or copy (only while still pending)
router.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ error: 'Post not found' });
    }
    if (existing.status !== 'pending') {
      return res.status(409).json({ error: 'Only pending posts can be rescheduled' });
    }

    const { date, time, title, caption } = req.body;
    const post = await prisma.post.update({
      where: { id: req.params.id },
      data: {
        ...(date ? { scheduledDate: date } : {}),
        ...(time ? { scheduledTime: time } : {}),
        ...(title ? { title } : {}),
        ...(caption !== undefined ? { caption } : {})
      }
    });
    res.json(post);
  } catch (err) {
    console.error('Error updating post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a post
router.delete('/:id', async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id }
    });
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
