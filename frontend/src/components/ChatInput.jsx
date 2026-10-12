import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';

export const ChatInput = ({
  onSend,
  onStop,
  isStreaming = false,
  currentTone = 'professional',
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="chat-input-wrapper">
      <div className="input-box-container">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder={`Message AI Assistant (${currentTone} mode)... Press Enter to send, Shift+Enter for new line`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          id="chat-textarea-input"
        />

        <div className="input-bottom-row">
          <div className="input-meta-hints">
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Sparkles size={11} color="var(--accent-cyan)" />
              <strong style={{ color: 'var(--text-secondary)' }}>Tone:</strong> {currentTone}
            </span>
            <span>•</span>
            <span>{text.length} chars ({wordCount} words)</span>
          </div>

          <div className="input-controls-right">
            {isStreaming ? (
              <button
                className="stop-btn"
                onClick={onStop}
                title="Stop streaming response"
                id="btn-stop-streaming"
              >
                <Square size={12} fill="currentColor" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSubmit}
                disabled={!text.trim() || isStreaming}
                title="Send message"
                id="btn-send-message"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
