import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  // 1. If explicit URI is provided (Atlas or local), try connecting
  if (uri) {
    try {
      console.log(`[Database] Attempting connection to MongoDB at: ${uri.replace(/\/\/[^@]*@/, '//***:***@')}`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log('[Database] Successfully connected to configured MongoDB');
      return;
    } catch (err) {
      console.warn(`[Database] Failed to connect to configured MongoDB URI: ${err.message}. Falling back to In-Memory MongoDB.`);
    }
  } else {
    // Try default local MongoDB first
    try {
      const defaultLocalUri = 'mongodb://127.0.0.1:27017/ai_chat_assistant';
      console.log(`[Database] Checking for local MongoDB service at ${defaultLocalUri}...`);
      await mongoose.connect(defaultLocalUri, {
        serverSelectionTimeoutMS: 2000,
      });
      console.log('[Database] Connected to local MongoDB instance');
      return;
    } catch (err) {
      console.log('[Database] Local MongoDB not detected. Starting In-Memory MongoDB instance...');
    }
  }

  // 2. Start MongoMemoryServer as fallback
  try {
    memoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'ai_chat_assistant',
      },
    });
    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[Database] Connected to In-Memory MongoDB instance at: ${memoryUri}`);
    console.log('[Database] (Note: Persistence is active in-memory for this session. Connect MONGODB_URI in .env for persistent Atlas/Local MongoDB)');
  } catch (memoryErr) {
    console.error('[Database] Could not start In-Memory MongoDB instance:', memoryErr.message);
    console.log('[Database] Using internal in-memory data store fallback.');
  }
};

export const disconnectDB = async () => {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
  }
};
