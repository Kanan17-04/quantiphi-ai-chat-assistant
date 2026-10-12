import React from 'react';
import { X, FileDown, FileCode, CheckCircle2 } from 'lucide-react';

export const ExportModal = ({
  isOpen,
  onClose,
  conversation,
}) => {
  if (!isOpen || !conversation) return null;

  const handleExport = (format) => {
    if (format === 'markdown') {
      let md = `# ${conversation.title || 'Conversation'}\n\n`;
      md += `- **Date**: ${new Date(conversation.createdAt || Date.now()).toLocaleString()}\n`;
      md += `- **Tone Preference**: ${(conversation.tone || 'professional').toUpperCase()}\n`;
      md += `- **Model**: ${conversation.model || 'auto'}\n\n`;
      md += `---\n\n`;

      (conversation.messages || []).forEach((m) => {
        const isUser = m.role === 'user';
        const roleLabel = isUser ? '👤 **User**' : '🤖 **AI Assistant**';
        const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '';
        md += `### ${roleLabel} *(${timeStr})*\n\n`;
        md += `${m.content}\n\n`;
        if (m.suggestedFollowUps && m.suggestedFollowUps.length > 0) {
          md += `*Suggested Follow-ups:*\n`;
          m.suggestedFollowUps.forEach((q) => {
            md += `- ${q}\n`;
          });
          md += `\n`;
        }
        md += `---\n\n`;
      });

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(conversation.title || 'chat').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
      return;
    }

    if (format === 'json') {
      const dataStr = JSON.stringify(conversation, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(conversation.title || 'chat').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      onClose();
    }
  };

  const messageCount = (conversation.messages || []).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Export Conversation</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Save this conversation session for documentation or backup
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', padding: '10px 14px', borderRadius: 8, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
          <span><strong>Messages:</strong> {messageCount}</span>
          <span><strong>Tone:</strong> {conversation.tone || 'professional'}</span>
          <span><strong>Format:</strong> MongoDB Object</span>
        </div>

        <div className="export-options-grid">
          <div
            className="export-option-card"
            onClick={() => handleExport('markdown')}
            id="export-option-md"
          >
            <div className="export-icon-box">
              <FileDown size={22} />
            </div>
            <div className="export-card-title">Markdown (.md)</div>
            <div className="export-card-desc">
              Formatted with distinct headers, code snippets, and timestamps. Ideal for docs.
            </div>
          </div>

          <div
            className="export-option-card"
            onClick={() => handleExport('json')}
            id="export-option-json"
          >
            <div className="export-icon-box">
              <FileCode size={22} />
            </div>
            <div className="export-card-title">JSON (.json)</div>
            <div className="export-card-desc">
              Raw MongoDB conversation payload with message schemas and metadata.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
