import React from 'react';
import {
  Menu,
  Download,
  SlidersHorizontal,
  Briefcase,
  Smile,
  Zap,
  Cpu,
} from 'lucide-react';

export const Header = ({
  sidebarOpen,
  onToggleSidebar,
  currentTitle,
  currentTone = 'professional',
  onChangeTone,
  onOpenExport,
  isStreaming = false,
}) => {
  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide History' : 'Show History'}
          id="btn-toggle-sidebar"
        >
          <Menu size={18} />
        </button>

        <h1 className="header-chat-title" title={currentTitle || 'New Conversation'}>
          {currentTitle || 'New Conversation'}
        </h1>
      </div>

      {/* The Vibe Check: Tone Toggle */}
      <div className="tone-selector-wrapper">
        <div className="tone-label-pill" title="The Vibe Check modifies AI system instructions in real-time">
          <SlidersHorizontal size={13} color="var(--accent-cyan)" />
          <span>Vibe Tone</span>
        </div>

        <div className="tone-segmented-control" role="group" aria-label="Tone Selector">
          <button
            className={`tone-btn ${currentTone === 'professional' ? 'active' : ''}`}
            onClick={() => onChangeTone('professional')}
            title="Professional: Polished, formal, articulate, and well-structured"
            disabled={isStreaming}
            id="tone-btn-professional"
          >
            <Briefcase size={13} />
            <span>Professional</span>
          </button>

          <button
            className={`tone-btn tone-casual ${currentTone === 'casual' ? 'active' : ''}`}
            onClick={() => onChangeTone('casual')}
            title="Casual: Friendly, conversational, approachable, and warm"
            disabled={isStreaming}
            id="tone-btn-casual"
          >
            <Smile size={13} />
            <span>Casual</span>
          </button>

          <button
            className={`tone-btn tone-concise ${currentTone === 'concise' ? 'active' : ''}`}
            onClick={() => onChangeTone('concise')}
            title="Concise: Direct, high-density, zero fluff, straight to the point"
            disabled={isStreaming}
            id="tone-btn-concise"
          >
            <Zap size={13} />
            <span>Concise</span>
          </button>
        </div>
      </div>

      {/* Header Right: Export & Model Info */}
      <div className="header-right">
        <button
          className="header-action-btn"
          onClick={onOpenExport}
          title="Export Conversation to Markdown or JSON"
          id="btn-export-chat"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
