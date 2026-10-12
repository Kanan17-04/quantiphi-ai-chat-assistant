import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatView } from './components/ChatView';
import { ChatInput } from './components/ChatInput';
import { ExportModal } from './components/ExportModal';

export function App() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [currentTone, setCurrentTone] = useState('professional');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingChunk, setStreamingChunk] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const abortControllerRef = useRef(null);
  const latestChunkRef = useRef('');
  const latestMessageIdRef = useRef(null);
  const wasStoppedRef = useRef(false);

  // Export Modal state
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch conversations list on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for New Chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load conversation details when activeId changes
  useEffect(() => {
    if (activeId) {
      fetchConversationDetails(activeId);
    } else {
      setActiveConversation(null);
    }
  }, [activeId]);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const fetchConversationDetails = async (id) => {
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.success && data.conversation) {
        setActiveConversation(data.conversation);
        if (data.conversation.tone) {
          setCurrentTone(data.conversation.tone);
        }
      }
    } catch (err) {
      console.error(`Failed to load conversation ${id}:`, err);
    }
  };

  const handleSelectConversation = (id) => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveId(id);
  };

  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveId(null);
    setActiveConversation(null);
  };

  const handleDeleteConversation = async (id) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (activeId === id) {
          handleNewChat();
        }
        await fetchConversations();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleChangeTone = async (newTone) => {
    setCurrentTone(newTone);
    if (activeId) {
      try {
        await fetch(`/api/conversations/${activeId}/tone`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tone: newTone }),
        });
        if (activeConversation) {
          setActiveConversation((prev) => ({ ...prev, tone: newTone }));
        }
        fetchConversations();
      } catch (err) {
        console.error('Failed to update tone on server:', err);
      }
    }
  };

  const handleStopStreaming = () => {
    wasStoppedRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    const partialText = latestChunkRef.current;
    if (partialText && partialText.trim()) {
      const partialMsg = {
        id: latestMessageIdRef.current || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        role: 'assistant',
        content: partialText.trim() + ' ⏹ *(Generation stopped)*',
        timestamp: new Date(),
        tone: currentTone,
        suggestedFollowUps: ['Continue where you left off', 'Try a different question'],
      };

      setActiveConversation((prev) => {
        const existingMessages = prev?.messages ? [...prev.messages] : [];
        existingMessages.push(partialMsg);
        return {
          ...prev,
          messages: existingMessages,
        };
      });

      if (activeId) {
        fetch(`/api/conversations/${activeId}/messages/partial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: partialMsg }),
        }).catch((e) => console.warn('Could not save partial message:', e));
      }
    }

    setIsStreaming(false);
    setStreamingChunk('');
    latestChunkRef.current = '';
    setStreamingMessageId(null);
    latestMessageIdRef.current = null;
  };

  /**
   * Core SSE Streaming Handler
   */
  const executeChatStream = async (payload) => {
    setIsStreaming(true);
    setStreamingChunk('');
    latestChunkRef.current = '';
    wasStoppedRef.current = false;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Server responded with status ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete trailing fragment in buffer

        let currentEvent = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.replace('event: ', '').trim();
          } else if (line.startsWith('data: ')) {
            const rawData = line.replace('data: ', '').trim();
            if (!rawData) continue;

            try {
              const parsed = JSON.parse(rawData);

              if (currentEvent === 'start') {
                const { conversationId, userMessage, title } = parsed;
                if (!activeId || activeId !== conversationId) {
                  setActiveId(conversationId);
                }

                setActiveConversation((prev) => {
                  const existingMessages = prev?.messages ? [...prev.messages] : [];
                  // If not already in messages, append user message
                  if (userMessage && !existingMessages.some((m) => m.id === userMessage.id)) {
                    existingMessages.push(userMessage);
                  }
                  return {
                    id: conversationId,
                    title: title || prev?.title || 'New Conversation',
                    tone: payload.tone || currentTone,
                    messages: existingMessages,
                  };
                });
              } else if (currentEvent === 'chunk') {
                setStreamingChunk((prev) => {
                  const updated = prev + (parsed.chunk || '');
                  latestChunkRef.current = updated;
                  return updated;
                });
                if (parsed.messageId) {
                  setStreamingMessageId(parsed.messageId);
                  latestMessageIdRef.current = parsed.messageId;
                }
              } else if (currentEvent === 'done') {
                if (wasStoppedRef.current) return;

                const { aiMessage, title, conversationId } = parsed;

                setActiveConversation((prev) => {
                  const existingMessages = prev?.messages ? [...prev.messages] : [];
                  existingMessages.push(aiMessage);
                  return {
                    ...prev,
                    id: conversationId,
                    title: title || prev?.title,
                    messages: existingMessages,
                  };
                });

                // Refresh sidebar conversation list
                fetchConversations();
              }
            } catch (jsonErr) {
              console.error('Error parsing SSE data line:', jsonErr, rawData);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream generation halted by user.');
      } else {
        console.error('Streaming request failed:', err);
      }
    } finally {
      setIsStreaming(false);
      setStreamingChunk('');
      setStreamingMessageId(null);
      latestChunkRef.current = '';
      latestMessageIdRef.current = null;
      abortControllerRef.current = null;
    }
  };

  // Send a regular new message
  const handleSendMessage = (prompt) => {
    executeChatStream({
      conversationId: activeId,
      prompt,
      tone: currentTone,
    });
  };

  // Feature 2: Edit prompt and re-run
  const handleEditMessage = (messageId, newContent) => {
    executeChatStream({
      conversationId: activeId,
      prompt: newContent,
      editMessageId: messageId,
      tone: currentTone,
    });
  };

  // Feature 2: Regenerate assistant response
  const handleRegenerate = (assistantMessageId) => {
    executeChatStream({
      conversationId: activeId,
      regenerateMessageId: assistantMessageId,
      tone: currentTone,
    });
  };

  const currentMessages = activeConversation?.messages || [];
  const currentTitle = activeConversation?.title || (activeId ? 'Conversation' : 'New Chat');

  return (
    <div className="app-container">
      {/* History Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Chat Area */}
      <main className="chat-main">
        {/* Header with Tone Toggle ("The Vibe Check") */}
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          currentTitle={currentTitle}
          currentTone={currentTone}
          onChangeTone={handleChangeTone}
          onOpenExport={() => setIsExportOpen(true)}
          isStreaming={isStreaming}
        />

        {/* Scrollable Conversation View */}
        <ChatView
          messages={currentMessages}
          isStreaming={isStreaming}
          streamingMessageId={streamingMessageId}
          streamingChunk={streamingChunk}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onRegenerate={handleRegenerate}
          currentTone={currentTone}
        />

        {/* Input Bar */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
          currentTone={currentTone}
        />
      </main>

      {/* Feature 1: Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        conversation={
          activeConversation || {
            title: 'Empty Conversation',
            tone: currentTone,
            messages: [],
            createdAt: new Date(),
          }
        }
      />
    </div>
  );
}

export default App;
