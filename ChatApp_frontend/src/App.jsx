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

  useEffect(() => {
    socket.current = connectWS();

    socket.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.current.on('roomNotice', (name) => {
      setMessages((prev) => [...prev, { type: 'notice', text: `${name} joined the chat` }]);
    });

    socket.current.on('chatMessage', (data) => {
      const msg = data.chatMessage;
      if (msg) {
        setMessages((prev) => [...prev, { ...msg, type: 'chat', isMe: false }]);
        // If the person who sent the message was typing, clear their typing status
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

    return () => {
      if (socket.current) socket.current.disconnect();
    }
  }, [])

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

  const handleLogin = (e) => {
    e.preventDefault();
    const name = inputName.trim();
    if (!name) return;

    socket.current.emit('joinRoom', name);
    setUserName(name);
    setView('chat');
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Emit typing status
    if (socket.current) {
      socket.current.emit('typing', { userName, isTyping: true });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Set timeout to stop typing status after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socket.current) {
        socket.current.emit('typing', { userName, isTyping: false });
      }
    }, 2000);
  };

  const sendMessage = () => {
    const msgText = text.trim();
    if (!msgText) return;

    // Clear typing timeout and emit stop typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.current.emit('typing', { userName, isTyping: false });

    const msgData = {
      id: Date.now(),
      sender: userName,
      text: msgText,
      time: formatTime(Date.now())
    };

    setMessages((prev) => [...prev, { ...msgData, type: 'chat', isMe: true }]);
    socket.current.emit('chatMessage', msgData);
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
            <div>
              <h2><span>💬</span>Chatly</h2>
              <div className="status-badge">
                <div className="status-dot"></div>
                Live
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--text-bright)', fontWeight: 600 }}>{userName}</div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Connected</div>
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
                  {!msg.isMe && <span className="sender-name">{msg.sender}</span>}
                  <div className="message-bubble">
                    {msg.text}
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              )
            ))}
            
            {typingUser && (
              <div className="typing-indicator">
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
                placeholder="Message #global-chat"
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
    </div>
  )
}

export default App
