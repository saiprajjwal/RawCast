require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Start the worker
require('./worker');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const channelsRoutes = require('./routes/channels');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('RawCast Backend API is running!');
});

app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);
app.use('/channels', channelsRoutes);

// TikTok Domain Verification
app.get('/tiktokj4z27LwUGe92MguLiGbzmEniKbDr7xZJ.txt', (req, res) => {
  res.send('tiktok-developers-site-verification=j4z27LwUGe92MguLiGbzmEniKbDr7xZJ');
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message || 'Unknown middleware error', stack: err.stack });
});
