import React from 'react';

const getAvatarUrl = (name) => {
  return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
};

const UserCard = React.memo(({ user, pendingRequest, onSendRequest }) => {
  return (
    <div className={`user-card ${user.status === 'busy' ? 'busy' : ''}`}>
      <img 
        src={getAvatarUrl(user.userName)} 
        alt={user.userName} 
        className="user-card-avatar" 
        loading="lazy"
      />
      <div className="user-card-info">
        <div className="user-card-name">{user.userName}</div>
        <div className={`user-card-status ${user.status}`}>
          {user.status === 'busy' ? '🔴 In chat' : '🟢 Available'}
        </div>
      </div>
      <button
        className={`request-btn ${pendingRequest === user.socketId ? 'pending' : ''}`}
        onClick={() => onSendRequest(user.socketId)}
        disabled={user.status === 'busy' || !!pendingRequest}
      >
        {pendingRequest === user.socketId ? '⏳' : '💬'}
      </button>
    </div>
  );
});

UserCard.displayName = 'UserCard';

export default UserCard;
