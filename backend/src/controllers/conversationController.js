import { ConversationRepository } from '../models/Conversation.js';

/**
 * List all conversations sorted by last updated
 */
export const listConversations = async (req, res) => {
  try {
    const list = await ConversationRepository.findAll();
    const formatted = list.map((c) => ({
      id: c._id ? c._id.toString() : c.id,
      title: c.title || 'New Conversation',
      tone: c.tone || 'professional',
      model: c.model || 'auto',
      messageCount: (c.messages || []).length,
      lastUserPrompt: c.lastUserPrompt || (c.messages && c.messages[0]?.content) || '',
      lastAiResponse: c.lastAiResponse || '',
      updatedAt: c.updatedAt,
      createdAt: c.createdAt,
    }));
    res.json({ success: true, conversations: formatted });
  } catch (err) {
    console.error('[listConversations Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Get conversation by ID
 */
export const getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await ConversationRepository.findById(id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({
      success: true,
      conversation: {
        id: conv._id ? conv._id.toString() : conv.id,
        title: conv.title,
        tone: conv.tone,
        model: conv.model,
        messages: conv.messages || [],
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      },
    });
  } catch (err) {
    console.error('[getConversation Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Create a new conversation thread
 */
export const createConversation = async (req, res) => {
  try {
    const { title, tone = 'professional', model = 'auto' } = req.body;
    const newConv = await ConversationRepository.create({
      title: title || 'New Conversation',
      tone,
      model,
      messages: [],
    });
    res.status(201).json({
      success: true,
      conversation: {
        id: newConv._id ? newConv._id.toString() : newConv.id,
        title: newConv.title,
        tone: newConv.tone,
        model: newConv.model,
        messages: newConv.messages || [],
        createdAt: newConv.createdAt,
        updatedAt: newConv.updatedAt,
      },
    });
  } catch (err) {
    console.error('[createConversation Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Update conversation tone preference ("The Vibe Check")
 */
export const updateConversationTone = async (req, res) => {
  try {
    const { id } = req.params;
    const { tone } = req.body;
    if (!['professional', 'casual', 'concise'].includes(tone)) {
      return res.status(400).json({ success: false, error: 'Invalid tone. Must be professional, casual, or concise.' });
    }
    const updated = await ConversationRepository.updateById(id, { tone });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, conversation: updated });
  } catch (err) {
    console.error('[updateConversationTone Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Update conversation title
 */
export const updateConversationTitle = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const updated = await ConversationRepository.updateById(id, { title });
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, conversation: updated });
  } catch (err) {
    console.error('[updateConversationTitle Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Delete conversation
 */
export const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ConversationRepository.deleteById(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('[deleteConversation Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Export conversation to Markdown or JSON (Feature 1)
 */
export const exportConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'markdown' } = req.query;
    const conv = await ConversationRepository.findById(id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="chat-${id}.json"`);
      return res.send(JSON.stringify(conv, null, 2));
    }

    // Markdown export
    let md = `# ${conv.title || 'Conversation'}\n\n`;
    md += `- **Date**: ${new Date(conv.createdAt).toLocaleString()}\n`;
    md += `- **Tone Preference**: ${conv.tone ? conv.tone.toUpperCase() : 'PROFESSIONAL'}\n`;
    md += `- **Model**: ${conv.model || 'Auto'}\n\n`;
    md += `---\n\n`;

    (conv.messages || []).forEach((m) => {
      const roleLabel = m.role === 'user' ? '👤 **User**' : '🤖 **AI Assistant**';
      const timeStr = new Date(m.timestamp).toLocaleTimeString();
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

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="chat-${id}.md"`);
    res.send(md);
  } catch (err) {
    console.error('[exportConversation Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Save partial AI message when user stops streaming mid-way
 */
export const savePartialMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message payload required' });
    }
    const conv = await ConversationRepository.findById(id);
    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }
    const messages = conv.messages ? [...conv.messages] : [];
    messages.push(message);
    const updated = await ConversationRepository.updateById(id, {
      messages,
      lastAiResponse: message.content,
    });
    res.json({ success: true, conversation: updated });
  } catch (err) {
    console.error('[savePartialMessage Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

