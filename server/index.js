const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Load variables from .env
dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: '*', // Allows all origins (good for local testing)
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('🔗 Admin Panel Connected to Live Tracking:', socket.id);
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB!'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// A simple test route
app.get('/', (req, res) => {
  res.send('Treasure Hunt API is running!');
});

// Import API routes (pass io so routes can emit live updates)
const gameRoutes = require('./routes/game')(io);
app.use('/api/game', gameRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
