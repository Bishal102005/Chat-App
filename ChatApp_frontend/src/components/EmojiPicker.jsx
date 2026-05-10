import React from 'react';

const emojis = ['😀', '😂', '😍', '😎', '🤔', '👍', '🔥', '✨', '👋', '🙌', '⭐', '🥺', '🤗', '😁', '😒', '😤', '😱', '❤️',  '❤️‍🩹', '💔', '💞', '💓', '💗', '❤️‍🔥', '🫂', '😮‍💨', '😘', '👀', '😞', '🥳', '🙃', '😭', '😕', '😶', '🫠', '😏', '🫤', '☺️', '🙂‍↕️', '🫥', '🥲', '🤤', '🙂‍↔️', '😋', '😜', '😬', '😑', '🤫', '🫡', '🫣', '🤭', '🙄', '😡', '🤯', '🥶', '🥵', '😷', '🤕', '🤒', '😇', '🤮', '🫩', '😴', '😪', '😵', '😵‍💫', '🫨', '🤡', '🌝', '🌚','🎉', '💡', '✅', '❌', '🚀', '👍', '👎', '👋', '🖐️'];

const EmojiPicker = React.memo(({ onSelect }) => {
  return (
    <div className="emoji-picker-popup">
      {emojis.map(e => (
        <span key={e} onClick={() => onSelect(e)}>{e}</span>
      ))}
    </div>
  );
});

EmojiPicker.displayName = 'EmojiPicker';

export default EmojiPicker;
