import React, { useRef, useEffect, useState } from 'react';
import UserCard from './UserCard';
import MessageItem from './MessageItem';
import MessageInput from './MessageInput';

const getAvatarUrl = (name) => {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
};

const LobbyView = ({ 
  userName, 
  onlineUsers, 
  groupMessages, 
  onLogout, 
  onSendChatRequest, 
  pendingRequest,
  onSendGroupMessage,
  onGroupTyping,
  lobbyTypingUsers,
  incomingRequest,
  onHandleRequestResponse,
  notification,
  onDismissNotification
}) => {
  const globalScrollRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (globalScrollRef.current) {
      globalScrollRef.current.scrollTop = globalScrollRef.current.scrollHeight;
    }
  }, [groupMessages]);

  const otherUsers = onlineUsers.filter(u => u.userName !== userName);

  return (
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
          <button className="logout-btn" onClick={onLogout}>Logout</button>
        </div>
      </header>

      <main className="lobby-main">
        <div className="lobby-content-wrapper">
          <aside className="lobby-sidebar">
            <h3 className="lobby-title">👥 Online Users</h3>
            {otherUsers.length === 0 ? (
              <div className="lobby-empty">
                <p>No one else here yet.</p>
              </div>
            ) : (
              <div className="user-cards">
                {otherUsers.map((user) => (
                  <UserCard 
                    key={user.socketId} 
                    user={user} 
                    pendingRequest={pendingRequest} 
                    onSendRequest={onSendChatRequest} 
                  />
                ))}
              </div>
            )}
          </aside>

          <section className="global-chat-section">
            <div className="global-chat-header">
              <h3>🌍 Global Group Chat</h3>
              <p>Chat with everyone in the lobby</p>
            </div>
            <div className="global-message-list" ref={globalScrollRef}>
              {groupMessages.length === 0 && (
                <div className="notice">Welcome to the lobby! Say hello to everyone.</div>
              )}
              {groupMessages.map((msg, i) => (
                <MessageItem key={msg.id || i} msg={msg} isMini={true} />
              ))}
            </div>
            
            <MessageInput 
              isMini={true}
              onSendMessage={onSendGroupMessage}
              onTyping={onGroupTyping}
              placeholder="Message global chat..."
              showEmojiPicker={showEmojiPicker}
              setShowEmojiPicker={setShowEmojiPicker}
              lobbyTypingUsers={lobbyTypingUsers}
            />
          </section>
        </div>
      </main>

      {incomingRequest && (
        <div className="request-overlay">
          <div className="request-modal">
            <img src={getAvatarUrl(incomingRequest.fromName)} alt={incomingRequest.fromName} className="request-modal-avatar" />
            <h3>{incomingRequest.fromName}</h3>
            <p>wants to start a private chat with you</p>
            <div className="request-modal-actions">
              <button className="accept-btn" onClick={() => onHandleRequestResponse(true)}>✓ Accept</button>
              <button className="decline-btn" onClick={() => onHandleRequestResponse(false)}>✗ Decline</button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="request-overlay">
          <div className="request-modal notification">
            <div className={`notification-icon ${notification.type}`}>
              {notification.type === 'error' ? '🚫' : 'ℹ️'}
            </div>
            <h3>{notification.title}</h3>
            <p>{notification.message}</p>
            <button className="dismiss-btn" onClick={onDismissNotification}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyView;
