import React, { useState } from 'react';
import { marked } from 'marked';
import { Copy, Check } from 'lucide-react';

// Configure marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

export const MarkdownRenderer = ({ content }) => {
  const [copied, setCopied] = useState(false);

  // Parse markdown into HTML string
  const rawHtml = React.useMemo(() => {
    try {
      return marked.parse(content || '');
    } catch {
      return content || '';
    }
  }, [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: rawHtml }}
      />
    </div>
  );
};
