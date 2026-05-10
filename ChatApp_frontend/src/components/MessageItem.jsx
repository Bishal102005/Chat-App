import React from 'react';

const getAvatarUrl = (name) => {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
};

const MessageItem = React.memo(({ msg, isMini = false }) => {
  return (
    <div className={`message-wrapper ${isMini ? 'mini' : ''} ${msg.isMe ? 'me' : 'them'}`}>
      <img
        src={getAvatarUrl(msg.sender)}
        alt={msg.sender}
        className={`message-avatar ${isMini ? 'mini' : ''}`}
        loading="lazy"
      />
      <div className="message-content">
        <span className="sender-name">{msg.isMe ? 'You' : msg.sender}</span>
        <div className={`message-bubble ${isMini ? 'mini' : ''}`}>
          {msg.audio ? (
            <div className={`voice-message ${isMini ? 'mini' : ''}`}>
              <audio src={msg.audio} controls />
            </div>
          ) : (
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
          )}
          {!isMini && <span className="message-time">{msg.time}</span>}
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export default MessageItem;
