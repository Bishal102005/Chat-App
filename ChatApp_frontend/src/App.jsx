import { useEffect, useRef, useState } from 'react'
import { connectWS } from './ws'
import './App.css'

function App() {
  const socket = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const [view, setView] = useState('login');      // 'login' | 'lobby' | 'chat'
  const [userName, setUserName] = useState('');
  const [inputName, setInputName] = useState('');

  const [onlineUsers, setOnlineUsers] = useState([]); // [{ socketId, userName, status }]
  const [incomingRequest, setIncomingRequest] = useState(null); // { fromSocketId, fromName }
  const [pendingRequest, setPendingRequest] = useState(null);  // socketId we sent request to

  const [chatPartner, setChatPartner] = useState('');
  const [roomId, setRoomId] = useState('');
  const [messages, setMessages] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [text, setText] = useState('');
  const [lobbyText, setLobbyText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);

  const getAvatarUrl = (name) => {
    return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
  };

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partnerTyping]);

  function formatTime(ts) {
    const date = new Date(ts);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  const handleLogin = (e) => {
    e.preventDefault();
    const name = inputName.trim();
    if (!name) return;

    socket.current = connectWS();

    socket.current.on('connect', () => {
      socket.current.emit('joinLobby', name);
      setUserName(name);
      setView('lobby');
    });

    socket.current.on('updateUserList', (users) => {
      setOnlineUsers(users);
    });

    // Receive a global group message
    socket.current.on('groupMessage', ({ message }) => {
      setGroupMessages((prev) => [...prev, { ...message, isMe: false }]);
    });

    // Someone sent us a chat request
    socket.current.on('incomingRequest', (data) => {
      setIncomingRequest(data);
    });

    // Our request was declined
    socket.current.on('requestDeclined', ({ byName }) => {
      setPendingRequest(null);
      alert(`${byName} declined your request.`);
    });

    // Chat has started (both accepted)
    socket.current.on('chatStarted', ({ roomId, partnerName }) => {
      setRoomId(roomId);
      setChatPartner(partnerName);
      setMessages([]);
      setIncomingRequest(null);
      setPendingRequest(null);
      setView('chat');
    });

    // Receive a private message
    socket.current.on('privateMessage', ({ message }) => {
      setMessages((prev) => [...prev, { ...message, isMe: false }]);
      setPartnerTyping(false);
    });

    // Partner typing indicator
    socket.current.on('partnerTyping', ({ isTyping }) => {
      setPartnerTyping(isTyping);
    });

    // Partner left the chat
    socket.current.on('partnerLeft', () => {
      alert(`${chatPartner || 'Your chat partner'} has left the chat.`);
      setView('lobby');
      setMessages([]);
      setChatPartner('');
      setRoomId('');
    });
  };

  const sendChatRequest = (toSocketId) => {
    if (pendingRequest) return;
    setPendingRequest(toSocketId);
    socket.current.emit('chatRequest', { toSocketId });
  };

  const handleRequestResponse = (accepted) => {
    socket.current.emit('requestResponse', {
      accepted,
      toSocketId: incomingRequest.fromSocketId
    });
    if (!accepted) setIncomingRequest(null);
  };

  const sendMessage = () => {
    const msgText = text.trim();
    if (!msgText || !roomId) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.current.emit('privateTyping', { roomId, isTyping: false });

    const msgData = {
      id: Date.now(),
      sender: userName,
      text: msgText,
      time: formatTime(Date.now())
    };

    setMessages((prev) => [...prev, { ...msgData, isMe: true }]);
    socket.current.emit('privateMessage', { roomId, message: msgData });
    setText('');
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (socket.current?.connected) {
      socket.current.emit('privateTyping', { roomId, isTyping: true });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (socket.current?.connected) {
        socket.current.emit('privateTyping', { roomId, isTyping: false });
      }
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendGroupMessage = (e) => {
    if (e) e.preventDefault();
    const msgText = lobbyText.trim();
    if (!msgText) return;

    const msgData = {
      id: Date.now(),
      sender: userName,
      text: msgText,
      time: formatTime(Date.now())
    };

    setGroupMessages((prev) => [...prev, { ...msgData, isMe: true }]);
    socket.current.emit('groupMessage', msgData);
    setLobbyText('');
  };

  const handleLobbyKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendGroupMessage();
    }
  };

  const leaveChat = () => {
    socket.current.emit('leaveChat', { roomId });
    setView('lobby');
    setMessages([]);
    setChatPartner('');
    setRoomId('');
  };

  const handleLogout = () => {
    if (socket.current) socket.current.disconnect();
    setView('login');
    setUserName('');
    setInputName('');
    setOnlineUsers([]);
    setMessages([]);
    setChatPartner('');
    setRoomId('');
    setIncomingRequest(null);
    setPendingRequest(null);
  };

  // Filter out ourselves from the user list
  const otherUsers = onlineUsers.filter(u => u.socketId !== socket.current?.id);

  return (
    <div className="app-container">

      {/* ── LOGIN VIEW ── */}
      {view === 'login' && (
        <div className="login-page">
          <div className="logo-icon">💬</div>
          <h1>Chatly</h1>
          <p>Connect privately. Chat securely.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your nickname"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              autoFocus
              required
            />
            <button type="submit">Enter Lobby</button>
          </form>
        </div>
      )}

      {/* ── LOBBY VIEW ── */}
      {view === 'lobby' && (
        <div className="lobby-view">
          <header className="lobby-header">
            <div className="lobby-header-left">
              <h2><span>💬</span> Chatly</h2>
              <div className="status-badge">
                <div className="status-dot"></div>
                {onlineUsers.length} Online
              </div>
            </div>
            <div className="lobby-header-right">
              <img src={getAvatarUrl(userName)} alt={userName} className="header-user-avatar" />
              <div className="user-info">
                <div className="user-name">{userName}</div>
                <div className="user-status">In Lobby</div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>Logout</button>
            </div>
          </header>

          <main className="lobby-main">
            <div className="lobby-content-wrapper">
              {/* Left Sidebar: Online Users */}
              <aside className="lobby-sidebar">
                <h3 className="lobby-title">👥 Online Users</h3>
                {otherUsers.length === 0 ? (
                  <div className="lobby-empty">
                    <p>No one else here yet.</p>
                  </div>
                ) : (
                  <div className="user-cards">
                    {otherUsers.map((user) => (
                      <div key={user.socketId} className={`user-card ${user.status === 'busy' ? 'busy' : ''}`}>
                        <img src={getAvatarUrl(user.userName)} alt={user.userName} className="user-card-avatar" />
                        <div className="user-card-info">
                          <div className="user-card-name">{user.userName}</div>
                          <div className={`user-card-status ${user.status}`}>
                            {user.status === 'busy' ? '🔴 In chat' : '🟢 Available'}
                          </div>
                        </div>
                        <button
                          className={`request-btn ${pendingRequest === user.socketId ? 'pending' : ''}`}
                          onClick={() => sendChatRequest(user.socketId)}
                          disabled={user.status === 'busy' || !!pendingRequest}
                        >
                          {pendingRequest === user.socketId ? '⏳' : '💬'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </aside>

              {/* Right Main: Global Chat */}
              <section className="global-chat-section">
                <div className="global-chat-header">
                  <h3>🌍 Global Group Chat</h3>
                  <p>Chat with everyone in the lobby</p>
                </div>
                <div className="global-message-list">
                  {groupMessages.length === 0 && (
                    <div className="notice">Welcome to the lobby! Say hello to everyone.</div>
                  )}
                  {groupMessages.map((msg, i) => (
                    <div key={msg.id || i} className={`message-wrapper mini ${msg.isMe ? 'me' : 'them'}`}>
                      <img src={getAvatarUrl(msg.sender)} alt={msg.sender} className="message-avatar mini" />
                      <div className="message-content">
                        <span className="sender-name">{msg.isMe ? 'You' : msg.sender}</span>
                        <div className="message-bubble mini">
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="global-chat-input-area">
                  <input 
                    type="text" 
                    placeholder="Message global chat..." 
                    value={lobbyText}
                    onChange={(e) => setLobbyText(e.target.value)}
                    onKeyDown={handleLobbyKeyDown}
                  />
                  <button onClick={sendGroupMessage}>Send</button>
                </div>
              </section>
            </div>
          </main>

          {/* Incoming request popup */}
          {incomingRequest && (
            <div className="request-overlay">
              <div className="request-modal">
                <img src={getAvatarUrl(incomingRequest.fromName)} alt={incomingRequest.fromName} className="request-modal-avatar" />
                <h3>{incomingRequest.fromName}</h3>
                <p>wants to start a private chat with you</p>
                <div className="request-modal-actions">
                  <button className="accept-btn" onClick={() => handleRequestResponse(true)}>✓ Accept</button>
                  <button className="decline-btn" onClick={() => handleRequestResponse(false)}>✗ Decline</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRIVATE CHAT VIEW ── */}
      {view === 'chat' && (
        <div className="chat-view">
          <header className="chat-header">
            <div className="header-left">
              <div className="chat-partner-info">
                <img src={getAvatarUrl(chatPartner)} alt={chatPartner} className="partner-avatar" />
                <div>
                  <div className="user-name">{chatPartner}</div>
                  <div className="user-status">
                    {partnerTyping ? <span className="typing-badge">typing...</span> : '🔒 Private Chat'}
                  </div>
                </div>
              </div>
            </div>
            <div className="header-right">
              <img src={getAvatarUrl(userName)} alt={userName} className="header-user-avatar" />
              <div className="user-info">
                <div className="user-name">{userName}</div>
                <div className="user-status">You</div>
              </div>
              <button className="logout-btn leave" onClick={leaveChat}>Leave Chat</button>
            </div>
          </header>

          <main className="message-list" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="notice">🔒 This is a private conversation. Start chatting!</div>
            )}
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`message-wrapper ${msg.isMe ? 'me' : 'them'}`}>
                <img
                  src={getAvatarUrl(msg.sender)}
                  alt={msg.sender}
                  className="message-avatar"
                />
                <div className="message-content">
                  <span className="sender-name">{msg.isMe ? 'You' : msg.sender}</span>
                  <div className="message-bubble">
                    {msg.text}
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              </div>
            ))}

            {partnerTyping && (
              <div className="typing-indicator">
                <img src={getAvatarUrl(chatPartner)} alt={chatPartner} className="typing-avatar" />
                <div className="dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="typing-text">{chatPartner} is typing...</span>
              </div>
            )}
          </main>

          <footer className="chat-footer">
            <div className="input-container">
              <input
                type="text"
                placeholder={`Message ${chatPartner}...`}
                value={text}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
              />
              <button className="send-btn" onClick={sendMessage}>
                <span>Send</span>
              </button>
            </div>
          </footer>
        </div>
      )}

      {view === 'login' && (
        <footer className="app-footer">
          <div className="footer-content">
            <p>&copy; 2026 BS Creation. All rights reserved.</p>
            <div className="footer-links">
              <span>v2.0.0</span>
              <span className="divider">|</span>
              <span>Private Chat Experience</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default App
