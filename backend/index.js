const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Vite dev server
    methods: ["GET", "POST"]
  }
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: "*"
}));
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://siddharamsutar23:QtnY0MLBA2jiCyYg@cluster0.raeqng9.mongodb.net/sports?retryWrites=true&w=majority&appName=Cluster0';

// Helpful diagnostics


mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000, // quicker fail if unreachable
    socketTimeoutMS: 20000,          // idle socket timeout
    family: 4,                       // force IPv4
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

// Import Models
const Umpire = require('./models/Umpire');
const Match = require('./models/Match');
const Score = require('./models/Score');

// Import Routes
const umpireRoutes = require('./routes/umpires');
const matchRoutes = require('./routes/matches');
const scoreRoutes = require('./routes/scores');
const venueRoutes = require('./routes/venues');
const bookingRoutes = require('./routes/bookings');

// Use Routes
app.use('/api/umpires', umpireRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/bookings', bookingRoutes);

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a match room for real-time updates
  socket.on('joinMatch', (matchId) => {
    socket.join(matchId);
    console.log(`Socket ${socket.id} joined match ${matchId}`);
  });

  // Handle score updates
  socket.on('updateScore', async (data) => {
    try {
      const { matchId, scoreData } = data;
      
      // Update score in database
      const updatedScore = await Score.findOneAndUpdate(
        { matchId },
        scoreData,
        { new: true, upsert: true }
      ).populate('matchId');

      // Broadcast to all clients in the match room
      io.to(matchId).emit('scoreUpdated', updatedScore);
      console.log('Score updated for match:', matchId);
    } catch (error) {
      console.error('Error updating score:', error);
      socket.emit('error', { message: 'Failed to update score' });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Sports Scoring API Server' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT,"0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
