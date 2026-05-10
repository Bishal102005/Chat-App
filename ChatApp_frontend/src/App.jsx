import { useEffect, useRef, useState, useCallback } from 'react'
import { connectWS } from './ws'
import './App.css'

import LoginView from './components/LoginView'
import LobbyView from './components/LobbyView'
import ChatView from './components/ChatView'

function App() {
  const socket = useRef(null);
  const notificationSound = useRef(null);

  const [view, setView] = useState('login');      // 'login' | 'lobby' | 'chat'
  const [userName, setUserName] = useState('');

  const [onlineUsers, setOnlineUsers] = useState([]); // [{ socketId, userName, status }]
  const [incomingRequest, setIncomingRequest] = useState(null); // { fromSocketId, fromName }
  const [pendingRequest, setPendingRequest] = useState(null);  // socketId we sent request to

  const [chatPartner, setChatPartner] = useState('');
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [notification, setNotification] = useState(null); // { title, message, type }
  const [lobbyTypingUsers, setLobbyTypingUsers] = useState([]); // Array of names

  // Initialize sound
  useEffect(() => {
    notificationSound.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    notificationSound.current.volume = 0.5;
  }, []);

  const playSound = useCallback(() => {
    if (notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(e => console.log('Sound blocked by browser:', e));
    }
  }, []);

  function formatTime(ts) {
    const date = new Date(ts);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  const handleLogin = useCallback((name) => {
    socket.current = connectWS();

    socket.current.on('connect', () => {
      socket.current.emit('joinLobby', name);
      setUserName(name);
      setView('lobby');
    });

    socket.current.on('updateUserList', (users) => {
      setOnlineUsers(users);
    });

    socket.current.on('groupMessage', ({ message }) => {
      setGroupMessages((prev) => [...prev, { ...message, isMe: false }]);
      setLobbyTypingUsers(prev => prev.filter(u => u !== message.sender));
      playSound();
    });

    socket.current.on('groupTyping', ({ userName, isTyping }) => {
      setLobbyTypingUsers(prev => {
        if (isTyping) {
          if (!prev.includes(userName)) return [...prev, userName];
          return prev;
        } else {
          return prev.filter(u => u !== userName);
        }
      });
    });

    socket.current.on('incomingRequest', (data) => {
      setIncomingRequest(data);
      playSound();
    });

    socket.current.on('requestDeclined', ({ byName }) => {
      setPendingRequest(null);
      setNotification({
        title: 'Request Declined',
        message: `${byName} is not available to chat right now.`,
        type: 'error'
      });
    });

    socket.current.on('chatStarted', ({ roomId, partnerName }) => {
      setRoomId(roomId);
      setChatPartner(partnerName);
      setMessages([]);
      setIncomingRequest(null);
      setPendingRequest(null);
      setView('chat');
    });

    socket.current.on('privateMessage', ({ message }) => {
      setMessages((prev) => [...prev, { ...message, isMe: false }]);
      setPartnerTyping(false);
      playSound();
    });

    socket.current.on('partnerTyping', ({ isTyping }) => {
      setPartnerTyping(isTyping);
    });

    socket.current.on('partnerLeft', () => {
      setNotification({
        title: 'Chat Ended',
        message: `Your chat partner has left the conversation.`,
        type: 'info'
      });
      setView('lobby');
      setMessages([]);
      setChatPartner('');
      setRoomId('');
    });
  }, [playSound]);

  const sendChatRequest = useCallback((toSocketId) => {
    if (pendingRequest) return;
    setPendingRequest(toSocketId);
    socket.current.emit('chatRequest', { toSocketId });
  }, [pendingRequest]);

  const handleRequestResponse = useCallback((accepted) => {
    if (incomingRequest) {
      socket.current.emit('requestResponse', {
        accepted,
        toSocketId: incomingRequest.fromSocketId
      });
      if (!accepted) setIncomingRequest(null);
    }
  }, [incomingRequest]);

  const sendMessage = useCallback((msgDataInput) => {
    if (!roomId) return;

    const msgData = {
      id: Date.now(),
      sender: userName,
      text: msgDataInput.text || '',
      audio: msgDataInput.audio || null,
      time: formatTime(Date.now())
    };

    setMessages((prev) => [...prev, { ...msgData, isMe: true }]);
    socket.current.emit('privateMessage', { roomId, message: msgData });
  }, [roomId, userName]);

  const handlePrivateTyping = useCallback((isTyping) => {
    if (socket.current?.connected && roomId) {
      socket.current.emit('privateTyping', { roomId, isTyping });
    }
  }, [roomId]);

  const sendGroupMessage = useCallback((msgDataInput) => {
    const msgData = {
      id: Date.now(),
      sender: userName,
      text: msgDataInput.text || '',
      audio: msgDataInput.audio || null,
      time: formatTime(Date.now())
    };

    setGroupMessages((prev) => [...prev, { ...msgData, isMe: true }]);
    socket.current.emit('groupMessage', msgData);
  }, [userName]);

  const handleGroupTyping = useCallback((isTyping) => {
    if (socket.current?.connected) {
      socket.current.emit('groupTyping', { isTyping });
    }
  }, []);

  const leaveChat = useCallback(() => {
    socket.current.emit('leaveChat', { roomId });
    setView('lobby');
    setMessages([]);
    setChatPartner('');
    setRoomId('');
  }, [roomId]);

  const handleLogout = useCallback(() => {
    if (socket.current) socket.current.disconnect();
    setView('login');
    setUserName('');
    setOnlineUsers([]);
    setMessages([]);
    setChatPartner('');
    setRoomId('');
    setIncomingRequest(null);
    setPendingRequest(null);
  }, []);

  return (
    <div className="app-container">
      {view === 'login' && <LoginView onLogin={handleLogin} />}

      {view === 'lobby' && (
        <LobbyView 
          userName={userName}
          onlineUsers={onlineUsers}
          groupMessages={groupMessages}
          onLogout={handleLogout}
          onSendChatRequest={sendChatRequest}
          pendingRequest={pendingRequest}
          onSendGroupMessage={sendGroupMessage}
          onGroupTyping={handleGroupTyping}
          lobbyTypingUsers={lobbyTypingUsers}
          incomingRequest={incomingRequest}
          onHandleRequestResponse={handleRequestResponse}
          notification={notification}
          onDismissNotification={() => setNotification(null)}
        />
      )}

      {view === 'chat' && (
        <ChatView 
          userName={userName}
          chatPartner={chatPartner}
          messages={messages}
          partnerTyping={partnerTyping}
          onLeaveChat={leaveChat}
          onSendMessage={sendMessage}
          onTyping={handlePrivateTyping}
        />
      )}

      {view === 'login' && (
        <footer className="app-footer">
          <div className="footer-content">
            <p>&copy; 2026 BS Creation. All rights reserved.</p>
            <div className="footer-links">
              <span>v2.1.0</span>
              <span className="divider">|</span>
              <span>Optimized Chat Experience</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App

