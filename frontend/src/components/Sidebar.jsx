import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Sparkles,
  Bot,
  Database,
  X,
} from 'lucide-react';

export const Sidebar = ({
  conversations = [],
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isOpen,
  onClose,
  dbStatus = 'connected',
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) =>
    (c.title || 'New Conversation').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-badge">
          <div className="brand-logo-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="brand-text-title">AI Assistant</div>
            <div className="brand-text-sub">Real-Time Core</div>
          </div>
        </div>
        <button
          className="sidebar-toggle-btn"
          style={{ width: 28, height: 28 }}
          onClick={onClose}
          title="Close Sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Action & Search */}
      <div className="sidebar-actions">
        <button className="new-chat-btn" onClick={onNewChat} id="btn-new-chat">
          <span>
            <Plus size={16} />
            New Chat
          </span>
          <span className="kbd-shortcut">Ctrl+K</span>
        </button>

        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* History List */}
      <div className="threads-container">
        <div className="threads-label">Past Conversations ({filtered.length})</div>

        {filtered.length === 0 ? (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            {searchQuery ? 'No matching chats found' : 'No chats yet. Start a new conversation!'}
          </div>
        ) : (
          filtered.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                className={`thread-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectConversation(c.id)}
              >
                <div className="thread-meta">
                  <div className="thread-title">{c.title || 'New Conversation'}</div>
                  <div className="thread-sub">
                    <span className="thread-tone-tag">{c.tone || 'pro'}</span>
                    <span>•</span>
                    <span>{formatTime(c.updatedAt)}</span>
                  </div>
                </div>

                <button
                  className="thread-delete-btn"
                  title="Delete Conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this conversation thread?')) {
                      onDeleteConversation(c.id);
                    }
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Persistence & System Status Footer */}
      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="status-dot" />
          <span>MongoDB: {dbStatus === 'connected' ? 'Connected & Synced' : 'Ready'}</span>
        </div>
      </div>
    </aside>
  );
};
