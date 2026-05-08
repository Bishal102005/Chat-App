import { useEffect, useRef, useState } from 'react'
import { connectWS } from './ws'
import './App.css'

function App() {
  const socket = useRef(null);
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  const [view, setView] = useState('login');
  const [userName, setUserName] = useState('');
  const [inputName, setInputName] = useState('');

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const getAvatarUrl = (name) => {
    // Using 'avataaars' style for a professional and polished look
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  };



  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUser]);

  function formatTime(ts) {
    const date = new Date(ts);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const handleLogout = () => {
    if (socket.current) {
      socket.current.disconnect();
    }
    setUserName('');
    setInputName('');
    setMessages([]);
    setView('login');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const name = inputName.trim();
    if (!name) return;

    // Connect when logging in
    socket.current = connectWS();
    
    socket.current.on('connect', () => {
      console.log('Connected to socket server');
      socket.current.emit('joinRoom', name);
      setUserName(name);
      setView('chat');
    });

    socket.current.on('roomNotice', (msg) => {
      setMessages((prev) => [...prev, { type: 'notice', text: msg }]);
    });

    socket.current.on('chatMessage', (data) => {
      const msg = data.chatMessage;
      if (msg) {
        setMessages((prev) => [...prev, { ...msg, type: 'chat', isMe: false }]);
        setTypingUser(null);
      }
    });

    socket.current.on('userTyping', (data) => {
      if (data.isTyping) {
        setTypingUser(data.userName);
      } else {
        setTypingUser(null);
      }
    });

    socket.current.on('updateUserList', (users) => {
      setOnlineUsers(users);
    });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    if (socket.current && socket.current.connected) {
      socket.current.emit('typing', { userName, isTyping: true });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (socket.current && socket.current.connected) {
        socket.current.emit('typing', { userName, isTyping: false });
      }
    }, 2000);
  };

  const sendMessage = () => {
    const msgText = text.trim();
    if (!msgText) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (socket.current) socket.current.emit('typing', { userName, isTyping: false });

    const msgData = {
      id: Date.now(),
      sender: userName,
      text: msgText,
      time: formatTime(Date.now())
    };

    setMessages((prev) => [...prev, { ...msgData, type: 'chat', isMe: true }]);
    if (socket.current) socket.current.emit('chatMessage', msgData);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      {view === 'login' ? (
        <div className="login-page">
          <div className="logo-icon">💬</div>
          <h1>Chatly</h1>
          <p>The simplest way to connect with friends.</p>
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your nickname"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              autoFocus
              required
            />
            <button type="submit">Start Chatting</button>
          </form>
        </div>
      ) : (
        <div className="chat-view">
          <header className="chat-header">
            <div className="header-left">
              <h2><span>💬</span>Chatly</h2>
              <div className="online-status-container">
                <div className="status-badge">
                  <div className="status-dot"></div>
                  {onlineUsers.length} Online
                </div>
                <div className="online-details">
                  <div className="online-avatars">
                    {onlineUsers.slice(0, 5).map((user, i) => (
                      <div key={i} className="mini-avatar-wrapper" title={user}>
                        <img 
                          src={getAvatarUrl(user)} 
                          alt={user} 
                          className="mini-avatar" 
                        />
                        <span className="avatar-tooltip">{user}</span>
                      </div>
                    ))}
                    {onlineUsers.length > 5 && (
                      <div className="more-users">+{onlineUsers.length - 5}</div>
                    )}
                  </div>
                  <div className="online-names-list">
                    {onlineUsers.map((user, i) => (
                      <span key={i} className="online-user-tag">
                        {user}{i < onlineUsers.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="header-right">
              <img 
                src={getAvatarUrl(userName)} 
                alt={userName} 
                className="header-user-avatar"
              />
              <div className="user-info">
                <div className="user-name">{userName}</div>
                <div className="user-status">Connected</div>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          <main className="message-list" ref={scrollRef}>
            {messages.length === 0 && !typingUser && (
              <div className="notice">No messages yet. Start the conversation!</div>
            )}
            {messages.map((msg, i) => (
              msg.type === 'notice' ? (
                <div key={i} className="notice">{msg.text}</div>
              ) : (
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
              )
            ))}
            
            {typingUser && (
              <div className="typing-indicator">
                <img 
                  src={getAvatarUrl(typingUser)} 
                  alt={typingUser} 
                  className="typing-avatar"
                />
                <div className="dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">{typingUser} is typing...</span>
              </div>
            )}
          </main>

          <footer className="chat-footer">
            <div className="input-container">
              <input
                type="text"
                placeholder="Message #Chatly"
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
              <span>v1.0.0</span>
              <span className="divider">|</span>
              <span>Real-time Chat Experience</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

export default App
