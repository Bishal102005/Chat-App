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
const users = new Map(); // Track connected users: socketId -> userName

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('joinRoom', async (userName) => {
    socket.userName = userName;
    users.set(socket.id, userName); // Add to online users

    console.log(`${userName} joined the room.`);
    await socket.join(ROOM);

    // Notify others
    socket.to(ROOM).emit("roomNotice", `${userName} joined the chat`);

    // Send updated user list to everyone in the room
    io.to(ROOM).emit("updateUserList", Array.from(users.values()));
  });

  socket.on('chatMessage', (message) => {
    console.log(`Message from ${message.sender}: ${message.text}`);
    socket.to(ROOM).emit("chatMessage", { 'chatMessage': message });
  });

  // Typing Indicator
  socket.on('typing', (data) => {
    socket.to(ROOM).emit('userTyping', data);
  });

  socket.on('disconnect', () => {
    if (socket.userName) {
      console.log(`${socket.userName} disconnected`);
      users.delete(socket.id); // Remove from online users

      socket.to(ROOM).emit("roomNotice", `${socket.userName} left the chat`);

      // Send updated user list to everyone
      io.to(ROOM).emit("updateUserList", Array.from(users.values()));
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