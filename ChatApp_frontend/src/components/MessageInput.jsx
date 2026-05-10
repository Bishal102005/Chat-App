import React, { useState, useRef } from 'react';
import EmojiPicker from './EmojiPicker';

const MessageInput = ({ 
  placeholder, 
  onSendMessage, 
  isMini = false, 
  onTyping, 
  chatPartner,
  showEmojiPicker,
  setShowEmojiPicker,
  lobbyTypingUsers = []
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (onTyping) onTyping(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (onTyping) onTyping(false);
    }, 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (recordedAudio) {
      onSendMessage({ audio: recordedAudio });
      setRecordedAudio(null);
      return;
    }

    const msgText = text.trim();
    if (!msgText) return;

    onSendMessage({ text: msgText });
    setText('');
    if (onTyping) onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setRecordedAudio(reader.result);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordedAudio(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const inputContent = (
    <>
      {/* Lobby typing indicator - must be inside the relative container */}
      {isMini && lobbyTypingUsers.length > 0 && (
        <div className="lobby-typing-indicator">
          {lobbyTypingUsers.length === 1 
            ? `${lobbyTypingUsers[0]} is typing...`
            : lobbyTypingUsers.length === 2 
              ? `${lobbyTypingUsers[0]} and ${lobbyTypingUsers[1]} are typing...`
              : "Multiple people are typing..."}
        </div>
      )}

      <button 
        className="emoji-trigger"
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
      >
        😊
      </button>

      {showEmojiPicker && <EmojiPicker onSelect={addEmoji} />}

      <button 
        className={`voice-btn ${isMini ? 'mini' : ''} ${isRecording ? 'recording' : ''} ${recordedAudio ? 'ready' : ''}`}
        onClick={toggleRecording}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        {isRecording ? '🛑' : (recordedAudio ? '🎵' : '🎤')}
      </button>

      {recordedAudio && (
        <button 
          className={`clear-audio-btn ${isMini ? 'mini' : ''}`} 
          onClick={() => setRecordedAudio(null)} 
          title="Clear recording"
        >✕</button>
      )}

      <textarea 
        placeholder={isRecording ? "Recording..." : (recordedAudio ? "Voice message ready!" : (placeholder || `Message ${chatPartner || ''}...`))}
        value={recordedAudio ? "" : text}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isRecording || !!recordedAudio}
        rows="2"
      />
      <button className="send-btn" onClick={handleSend} disabled={isRecording}>
        <span>Send</span>
      </button>
    </>
  );

  if (isMini) {
    return (
      <div className="global-chat-input-area">
        {inputContent}
      </div>
    );
  }

  return (
    <footer className="chat-footer">
      <div className="input-container">
        {inputContent}
      </div>
      {isRecording && <div className="recording-hint">Recording... Click mic again to stop</div>}
      {recordedAudio && <div className="recording-hint success">Voice message ready! Click Send to deliver.</div>}
    </footer>
  );
};

export default MessageInput;
