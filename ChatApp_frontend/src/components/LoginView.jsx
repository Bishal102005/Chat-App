import React, { useState } from 'react';

const LoginView = ({ onLogin }) => {
  const [inputName, setInputName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputName.trim()) {
      onLogin(inputName.trim());
    }
  };

  return (
    <div className="login-page">
      <div className="logo-icon">💬</div>
      <h1>Chatly</h1>
      <p>Connect privately. Chat securely.</p>
      <form className="login-form" onSubmit={handleSubmit}>
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
  );
};

export default LoginView;
