import React, { useRef, useEffect, useState } from 'react';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';

const getAvatarUrl = (name) => {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
};

const ChatView = ({ 
  userName, 
  chatPartner, 
  messages, 
  partnerTyping, 
  onLeaveChat, 
  onSendMessage, 
  onTyping 
}) => {
  const scrollRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, partnerTyping]);

  return (
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
          <button className="logout-btn leave" onClick={onLeaveChat}>Leave Chat</button>
        </div>
      </header>

      <main className="message-list" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="notice">🔒 This is a private conversation. Start chatting!</div>
        )}
        {messages.map((msg, i) => (
          <MessageItem key={msg.id || i} msg={msg} />
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

      <MessageInput 
        onSendMessage={onSendMessage} 
        onTyping={onTyping} 
        chatPartner={chatPartner}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
      />
    </div>
  );
};

export default ChatView;
