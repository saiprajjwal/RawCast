const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

// Get all channels grouped by platform
router.get('/', async (req, res) => {
  try {
    const channels = await prisma.channel.findMany();
    
    // Group them like the frontend expects:
    // { youtube: ['name1', 'name2'], instagram: [...], etc }
    // Wait, the frontend wants an array of names. But if we need IDs for posting,
    // we should return objects: { id, name, platform }
    // Let's just return the raw array and let frontend format it, 
    // or format it to match frontend's expected DEFAULT_CHANNELS structure but with IDs.
    
    // Frontend expects: { youtube: [{id: '...', name: '...'}], instagram: [] }
    // We'll return it this way, and update frontend to handle objects instead of strings
    const grouped = {
      youtube: [],
      instagram: [],
      facebook: [],
      tiktok: []
    };
    
    channels.forEach(c => {
      if (grouped[c.platform]) {
        grouped[c.platform].push({ id: c.id, name: c.name });
      }
    });

    res.json(grouped);
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a channel's name
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    const channel = await prisma.channel.update({
      where: { id: req.params.id },
      data: { name }
    });
    res.json(channel);
  } catch (err) {
    console.error('Error updating channel:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
