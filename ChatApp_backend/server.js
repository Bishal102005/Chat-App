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

// Track users: socketId -> { userName, status: 'lobby' | 'busy' }
const users = new Map();
const GLOBAL_ROOM = 'global_lobby';

function broadcastUserList() {
  const userList = Array.from(users.entries()).map(([id, data]) => ({
    socketId: id,
    userName: data.userName,
    status: data.status
  }));
  io.emit("updateUserList", userList);
}

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  // User joins the lobby
  socket.on('joinLobby', (userName) => {
    socket.userName = userName;
    users.set(socket.id, { userName, status: 'lobby' });
    socket.join(GLOBAL_ROOM); // Join global chat
    console.log(`${userName} joined the lobby.`);
    broadcastUserList();
  });

  // Global Group Message
  socket.on('groupMessage', (message) => {
    // Broadcast to everyone in the lobby EXCEPT the sender
    socket.to(GLOBAL_ROOM).emit('groupMessage', { message });
  });

  // User A sends a chat request to User B
  socket.on('chatRequest', ({ toSocketId }) => {
    const from = users.get(socket.id);
    const to = users.get(toSocketId);
    if (!from || !to || to.status === 'busy') return;

    // Forward the request to User B
    io.to(toSocketId).emit('incomingRequest', {
      fromSocketId: socket.id,
      fromName: from.userName
    });
  });

  // User B responds to a chat request
  socket.on('requestResponse', ({ accepted, toSocketId }) => {
    const responder = users.get(socket.id);
    const requester = users.get(toSocketId);

    if (!responder || !requester) return;

    if (accepted) {
      // Create a unique private room
      const roomId = `private_${socket.id}_${toSocketId}`;

      // Mark both users as busy
      users.set(socket.id, { ...responder, status: 'busy', roomId });
      users.set(toSocketId, { ...requester, status: 'busy', roomId });

      // Add both to the private room
      socket.join(roomId);
      const requesterSocket = io.sockets.sockets.get(toSocketId);
      if (requesterSocket) requesterSocket.join(roomId);

      // Notify both users to enter the chat
      io.to(roomId).emit('chatStarted', {
        roomId,
        partnerName: null // each side will derive partner from their own state
      });

      // Tell User A specifically who they're chatting with
      io.to(toSocketId).emit('chatStarted', { roomId, partnerName: responder.userName });
      io.to(socket.id).emit('chatStarted', { roomId, partnerName: requester.userName });

      broadcastUserList();
    } else {
      // Notify User A that the request was declined
      io.to(toSocketId).emit('requestDeclined', { byName: responder.userName });
    }
  });

  // Private message inside a room
  socket.on('privateMessage', ({ roomId, message }) => {
    socket.to(roomId).emit('privateMessage', { message });
  });

  // Typing indicator inside a private room
  socket.on('privateTyping', ({ roomId, isTyping }) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(roomId).emit('partnerTyping', { isTyping, userName: user.userName });
  });

  // Typing indicator for global lobby
  socket.on('groupTyping', ({ isTyping }) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.to(GLOBAL_ROOM).emit('groupTyping', { 
      userName: user.userName, 
      isTyping,
      socketId: socket.id
    });
  });

  // User leaves private chat, goes back to lobby
  socket.on('leaveChat', ({ roomId }) => {
    const user = users.get(socket.id);
    if (user) {
      socket.leave(roomId);
      users.set(socket.id, { userName: user.userName, status: 'lobby' });

      // Notify partner that the user left
      socket.to(roomId).emit('partnerLeft');

      // Set partner back to lobby too
      io.in(roomId).sockets.forEach((partnerSocket) => {
        const partnerData = users.get(partnerSocket.id);
        if (partnerData) {
          partnerSocket.leave(roomId);
          users.set(partnerSocket.id, { userName: partnerData.userName, status: 'lobby' });
        }
      });

      broadcastUserList();
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`${user.userName} disconnected`);
      // Notify partner if in a private chat
      if (user.roomId) {
        socket.to(user.roomId).emit('partnerLeft');
        // Reset partner to lobby
        io.in(user.roomId).sockets.forEach((partnerSocket) => {
          const partnerData = users.get(partnerSocket.id);
          if (partnerData) {
            users.set(partnerSocket.id, { userName: partnerData.userName, status: 'lobby' });
          }
        });
      }
      users.delete(socket.id);
      broadcastUserList();
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