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

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
