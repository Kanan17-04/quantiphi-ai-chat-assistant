import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    default: () => uuidv4(),
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'concise'],
    default: 'professional',
  },
  suggestedFollowUps: {
    type: [String],
    default: [],
  },
});

const conversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    tone: {
      type: String,
      enum: ['professional', 'casual', 'concise'],
      default: 'professional',
    },
    model: {
      type: String,
      default: 'auto',
    },
    messages: [messageSchema],
    lastUserPrompt: {
      type: String,
      default: '',
    },
    lastAiResponse: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Fallback in-memory store in case mongoose is not connected
const memoryConversations = new Map();

export const ConversationModel = mongoose.model('Conversation', conversationSchema);

export class ConversationRepository {
  static isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }

  static async create(data = {}) {
    if (this.isMongoConnected()) {
      const conv = new ConversationModel(data);
      return await conv.save();
    }

    const id = new mongoose.Types.ObjectId().toString();
    const now = new Date();
    const doc = {
      _id: id,
      id,
      title: data.title || 'New Conversation',
      tone: data.tone || 'professional',
      model: data.model || 'auto',
      messages: (data.messages || []).map((m) => ({
        id: m.id || uuidv4(),
        role: m.role,
        content: m.content,
        timestamp: m.timestamp || new Date(),
        tone: m.tone || data.tone || 'professional',
        suggestedFollowUps: m.suggestedFollowUps || [],
      })),
      lastUserPrompt: data.lastUserPrompt || '',
      lastAiResponse: data.lastAiResponse || '',
      createdAt: now,
      updatedAt: now,
    };
    memoryConversations.set(id, doc);
    return doc;
  }

  static async findById(id) {
    if (this.isMongoConnected()) {
      return await ConversationModel.findById(id);
    }
    return memoryConversations.get(id) || null;
  }

  static async findAll() {
    if (this.isMongoConnected()) {
      return await ConversationModel.find().sort({ updatedAt: -1 });
    }
    return Array.from(memoryConversations.values()).sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  static async updateById(id, updateData) {
    if (this.isMongoConnected()) {
      return await ConversationModel.findByIdAndUpdate(id, updateData, { new: true });
    }
    const existing = memoryConversations.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updateData,
      updatedAt: new Date(),
    };
    memoryConversations.set(id, updated);
    return updated;
  }

  static async deleteById(id) {
    if (this.isMongoConnected()) {
      return await ConversationModel.findByIdAndDelete(id);
    }
    const existed = memoryConversations.has(id);
    memoryConversations.delete(id);
    return existed ? { _id: id } : null;
  }
}
