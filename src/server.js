const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

io.on('connection', (socket) => {
  // Join a room
  socket.on('join room', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user joined', socket.id);
  });

  // Signal to a specific user
  socket.on('signal to user', ({ userId, callerId, signal }) => {
    io.to(userId).emit('user joined signal', { userId: callerId, signal });
  });

  // Remove disconnected users
  socket.on('disconnect', () => {
    io.emit('user left', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});