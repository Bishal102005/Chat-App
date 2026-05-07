import { createServer } from 'node:http';
import express from 'express';
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const ROOM = 'group';

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('joinRoom', async (userName) => {
    socket.userName = userName; // Store the name for disconnect event
    console.log(`${userName} joined the room.`);
    await socket.join(ROOM);
    socket.to(ROOM).emit("roomNotice", `${userName} joined the chat`);
  });

  socket.on('chatMessage', (message) => {
    console.log(`Message from ${message.sender}: ${message.text}`);
    socket.to(ROOM).emit("chatMessage", { 'chatMessage': message });
  });

  // Typing Indicator
  socket.on('typing', (data) => {
    // Broadcast to others: { userName, isTyping }
    socket.to(ROOM).emit('userTyping', data);
  });

  socket.on('disconnect', () => {
    if (socket.userName) {
      console.log(`${socket.userName} disconnected`);
      socket.to(ROOM).emit("roomNotice", `${socket.userName} left the chat`);
    }
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Chat Server is Running</h1>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`server running at port ${PORT}`);
});