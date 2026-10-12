import React, { useRef, useEffect, useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  RotateCcw,
  Edit3,
  Lightbulb,
  ArrowRight,
  Code2,
  Cpu,
  FileText,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

export const ChatView = ({
  messages = [],
  isStreaming = false,
  streamingMessageId = null,
  streamingChunk = '',
  onSendMessage,
  onEditMessage,
  onRegenerate,
  currentTone = 'professional',
}) => {
  const scrollEndRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Auto scroll to bottom
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingChunk, isStreaming]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEdit = (msg) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const submitEdit = (id) => {
    if (!editText.trim()) return;
    onEditMessage(id, editText.trim());
    setEditingId(null);
    setEditText('');
  };

  // Starter prompts for empty state
  const starterPrompts = [
    {
      title: 'Real-time Architecture',
      desc: 'Compare Server-Sent Events (SSE) vs WebSockets for streaming LLM tokens.',
      prompt: 'Can you compare Server-Sent Events (SSE) with WebSockets for real-time AI token streaming, including trade-offs?',
      icon: <Cpu size={16} color="var(--accent-cyan)" />,
    },
    {
      title: 'Database Schema Design',
      desc: 'Architect a high-throughput MongoDB schema for conversational AI history.',
      prompt: 'How would you architect a production MongoDB schema and indexing strategy for a scalable AI chat application?',
      icon: <Code2 size={16} color="var(--accent-indigo)" />,
    },
    {
      title: 'Executive Briefing',
      desc: 'Draft a concise status report on integrating GenAI into enterprise workflows.',
      prompt: 'Draft an executive briefing on the key technical advantages of adopting dynamic tone-aware AI assistants.',
      icon: <FileText size={16} color="var(--accent-amber)" />,
    },
    {
      title: 'Vibe Tone Check',
      desc: 'Explain quantum computing in the currently selected tone.',
      prompt: `Explain quantum computing in simple terms, adhering strictly to the ${currentTone.toUpperCase()} tone.`,
      icon: <Sparkles size={16} color="var(--accent-violet)" />,
    },
  ];

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="messages-container">
        <div className="empty-state">
          <div className="empty-state-badge">
            <Sparkles size={14} />
            <span>Real-Time AI Chat Assistant</span>
          </div>
          <h2 className="empty-state-title">How can I assist you today?</h2>
          <p className="empty-state-desc">
            Equipped with real-time streaming, MongoDB conversation persistence, and dynamic Tone Modifiers.
            Select a prompt below or type your question.
          </p>

          <div className="prompt-suggestions-grid">
            {starterPrompts.map((item, idx) => (
              <div
                key={idx}
                className="suggestion-card"
                onClick={() => onSendMessage(item.prompt)}
              >
                <div className="suggestion-card-header">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <div className="suggestion-card-text">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div ref={scrollEndRef} />
      </div>
    );
  }

  return (
    <div className="messages-container" id="chat-messages-container">
      <div className="messages-inner">
        {messages.map((m, index) => {
          const isUser = m.role === 'user';
          const isEditing = editingId === m.id;
          const isLastAssistant = !isUser && index === messages.length - 1;

          return (
            <div key={m.id || index} className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
              <div className="message-content-container">
                {/* Avatar */}
                <div className={`avatar ${isUser ? 'user-avatar' : 'ai-avatar'}`}>
                  {isUser ? <User size={18} /> : <Sparkles size={18} />}
                </div>

                {/* Bubble */}
                <div className="message-bubble">
                  {/* Top Meta info */}
                  <div className="message-top-meta">
                    <span className="message-role-tag">{isUser ? 'You' : 'AI Assistant'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {m.tone && (
                        <span className="message-tone-badge" title="Response tone">
                          {m.tone}
                        </span>
                      )}
                      <span className="message-time">
                        {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  {isUser ? (
                    isEditing ? (
                      <div className="edit-message-box">
                        <textarea
                          className="edit-textarea"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                        />
                        <div className="edit-actions-row">
                          <button className="btn-secondary" onClick={cancelEdit}>
                            Cancel
                          </button>
                          <button className="btn-primary" onClick={() => submitEdit(m.id)}>
                            Save & Regenerate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{m.content}</p>
                        <div className="message-actions-bar">
                          <button
                            className="action-chip-btn"
                            onClick={() => startEdit(m)}
                            title="Edit this prompt and re-run (Feature 2)"
                          >
                            <Edit3 size={11} />
                            <span>Edit prompt</span>
                          </button>
                          <button
                            className="action-chip-btn"
                            onClick={() => handleCopy(m.id, m.content)}
                            title="Copy prompt"
                          >
                            {copiedId === m.id ? <Check size={11} color="var(--accent-emerald)" /> : <Copy size={11} />}
                            <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    )
                  ) : (
                    <div>
                      <MarkdownRenderer content={m.content} />

                      {/* AI Action Bar: Copy & Regenerate (Feature 2) */}
                      <div className="message-actions-bar">
                        <button
                          className="action-chip-btn"
                          onClick={() => handleCopy(m.id, m.content)}
                          title="Copy message"
                        >
                          {copiedId === m.id ? <Check size={11} color="var(--accent-emerald)" /> : <Copy size={11} />}
                          <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                        </button>

                        <button
                          className="action-chip-btn"
                          onClick={() => onRegenerate(m.id)}
                          title="Regenerate this response with current tone (Feature 2)"
                          disabled={isStreaming}
                        >
                          <RotateCcw size={11} />
                          <span>Regenerate response</span>
                        </button>
                      </div>

                      {/* Suggested Follow-up Prompts (Feature 1) */}
                      {m.suggestedFollowUps && m.suggestedFollowUps.length > 0 && (
                        <div className="suggested-followups-container">
                          <div className="suggested-label">
                            <Lightbulb size={12} />
                            <span>Suggested Follow-ups</span>
                          </div>
                          <div className="followup-chips-row">
                            {m.suggestedFollowUps.map((question, qIdx) => (
                              <button
                                key={qIdx}
                                className="followup-chip"
                                onClick={() => onSendMessage(question)}
                                disabled={isStreaming}
                              >
                                <span>{question}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Message Display */}
        {isStreaming && (
          <div className="message-wrapper assistant">
            <div className="message-content-container">
              <div className="avatar ai-avatar">
                <Sparkles size={18} />
              </div>
              <div className="message-bubble">
                <div className="message-top-meta">
                  <span className="message-role-tag">AI Assistant</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="message-tone-badge" style={{ color: 'var(--accent-cyan)' }}>
                      Streaming ({currentTone})
                    </span>
                  </div>
                </div>

                <div className="markdown-body">
                  <MarkdownRenderer content={streamingChunk} />
                  <span className="streaming-cursor" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};
