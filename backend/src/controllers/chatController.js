import { v4 as uuidv4 } from 'uuid';
import { ConversationRepository } from '../models/Conversation.js';
import { AIService } from '../services/aiService.js';

/**
 * Handle real-time chat with Server-Sent Events (SSE)
 * Supports:
 * - New message
 * - Message Edit (Feature 2)
 * - Response Regeneration (Feature 2)
 * - Tone switching ("The Vibe Check")
 * - Dynamic suggested follow-ups (Feature 1)
 */
export const streamChat = async (req, res) => {
  let { conversationId, prompt, tone, model, editMessageId, regenerateMessageId } = req.body;

  if (!prompt && !regenerateMessageId) {
    return res.status(400).json({ success: false, error: 'Prompt is required' });
  }

  // Set SSE response headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy buffering
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let conversation;

    if (conversationId) {
      conversation = await ConversationRepository.findById(conversationId);
    }

    if (!conversation) {
      // Create new conversation if none exists or invalid id
      const initialTitle = prompt ? prompt.slice(0, 40).trim() + (prompt.length > 40 ? '...' : '') : 'New Conversation';
      conversation = await ConversationRepository.create({
        title: initialTitle,
        tone: tone || 'professional',
        model: model || 'auto',
        messages: [],
      });
      conversationId = conversation._id ? conversation._id.toString() : conversation.id;
    } else {
      conversationId = conversation._id ? conversation._id.toString() : conversation.id;
      // If tone is explicitly provided, update conversation tone
      if (tone && tone !== conversation.tone) {
        await ConversationRepository.updateById(conversationId, { tone });
      } else {
        tone = conversation.tone || 'professional';
      }
    }

    let messages = conversation.messages ? [...conversation.messages] : [];

    // --- Feature 2: Message Edit handling ---
    if (editMessageId) {
      const editIndex = messages.findIndex((m) => m.id === editMessageId);
      if (editIndex !== -1) {
        // Truncate messages after and including this index, then re-add updated prompt
        messages = messages.slice(0, editIndex);
      }
    }

    // --- Feature 2: Regenerate handling ---
    if (regenerateMessageId) {
      // Locate the assistant message to regenerate
      const regenIndex = messages.findIndex((m) => m.id === regenerateMessageId);
      if (regenIndex !== -1) {
        // Find preceding user prompt
        const prevUserMsg = messages[regenIndex - 1];
        if (prevUserMsg && prevUserMsg.role === 'user') {
          prompt = prevUserMsg.content;
        }
        // Remove from regenIndex onwards
        messages = messages.slice(0, regenIndex);
      } else if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
        const lastUser = messages[messages.length - 2];
        if (lastUser) prompt = lastUser.content;
        messages = messages.slice(0, messages.length - 1);
      }
    }

    // Create user message if not regenerating or if edited
    let userMsg = null;
    if (!regenerateMessageId || editMessageId) {
      userMsg = {
        id: uuidv4(),
        role: 'user',
        content: prompt,
        timestamp: new Date(),
        tone,
      };
      messages.push(userMsg);
    } else {
      userMsg = messages[messages.length - 1];
    }

    // Notify client of start and IDs
    sendEvent('start', {
      conversationId,
      tone,
      userMessage: userMsg,
      title: conversation.title,
    });

    const aiMessageId = uuidv4();

    // Call AIService stream
    await AIService.streamChat({
      prompt,
      tone,
      history: messages.slice(0, -1), // Prior history
      model: model || conversation.model,
      onChunk: (chunk) => {
        sendEvent('chunk', { chunk, messageId: aiMessageId });
      },
      onDone: async (fullText, suggestedFollowUps) => {
        const aiMsg = {
          id: aiMessageId,
          role: 'assistant',
          content: fullText,
          timestamp: new Date(),
          tone,
          suggestedFollowUps: suggestedFollowUps || [],
        };
        messages.push(aiMsg);

        // Auto-generate title if conversation title is generic
        let updatedTitle = conversation.title;
        if (conversation.title === 'New Conversation' && prompt) {
          updatedTitle = prompt.slice(0, 36).trim() + (prompt.length > 36 ? '...' : '');
        }

        // Persist to MongoDB
        await ConversationRepository.updateById(conversationId, {
          title: updatedTitle,
          tone,
          messages,
          lastUserPrompt: prompt,
          lastAiResponse: fullText,
        });

        // Notify client stream completion
        sendEvent('done', {
          conversationId,
          title: updatedTitle,
          aiMessage: aiMsg,
          suggestedFollowUps,
        });
        res.end();
      },
    });
  } catch (err) {
    console.error('[streamChat Error]:', err);
    sendEvent('error', { error: err.message || 'Stream processing failed' });
    res.end();
  }
};
