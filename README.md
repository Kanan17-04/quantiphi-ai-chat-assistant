# AI Chat Assistant — Real-Time Conversational Interface

> Built for the **Quantiphi Vibe Coding Round**. An intelligent, real-time AI chat interface featuring token streaming, MongoDB persistence, and dynamic Tone Modifiers ("The Vibe Check"), plus advanced productivity and interaction capabilities.

---

## 🌟 Highlights & Key Features

### 1. Frontend UI & User Interaction
- **Chat Interface**: Clean, accessible, modern conversation view featuring distinct bubbles and avatars for User and AI Assistant. Styled using modern CSS design tokens, frosted glassmorphism, responsive typography, and glowing cyber accents.
- **Real-Time Streaming View**: Text streams token-by-token using **Server-Sent Events (SSE)** with a blinking cursor animation (`typing-cursor`) to simulate live AI thinking and typing. Includes a **Stop Generation** button to halt active streams.
- **History Sidebar**: Sidebar listing past conversation threads sorted chronologically, with search filtering, active indicators, and deletion options. Can be toggled open/closed.
- **Starter Prompt Gallery**: Quick-start templates in empty state to immediately test real-time capabilities.

### 2. The Vibe Check: "Tone Toggle"
- Prominent 3-way segmented control in the top bar:
  - 👔 **Professional**: Polished, formal, articulate, and well-structured with business/academic precision.
  - 😊 **Casual**: Friendly, warm, approachable, conversational, and emoji-enhanced.
  - ⚡ **Concise**: Direct, high-density, zero fluff, straight to the point.
- **Backend Architecture**: The tone selection is passed directly to the backend and injected into the AI request as a **dynamic system instruction modifier**, shaping the AI persona instantly.

### 3. Extra Features (Approved & Implemented)
- 📥 **Feature 1: Export Conversation (Markdown & JSON) + AI Suggested Follow-up Prompts**:
  - **Export Modal**: Download any conversation as formatted Markdown (`.md`) or raw MongoDB JSON (`.json`) with timestamps, roles, and tone metadata.
  - **Suggested Follow-up Prompts**: 2–3 dynamic, context-aware prompt chips generated at the end of each AI response. Clicking any chip immediately populates and sends the next query.
- 🔁 **Feature 2: Message Edit & Regenerate Response (with Tone Re-evaluation)**:
  - **Inline Message Edit**: Edit any previous user prompt directly in the chat bubble to refine the question and re-stream an updated answer.
  - **Regenerate Response**: Re-run the last prompt with a single click, allowing users to toggle between **Professional**, **Casual**, and **Concise** and compare the answers side-by-side.

### 4. Backend Logic & State Management
- **API Integration**: Multi-provider support for **OpenAI** (`OPENAI_API_KEY`), **Anthropic Claude** (`ANTHROPIC_API_KEY`), and an **Intelligent Offline Streaming Engine** that runs out of the box with zero external API dependencies or costs during evaluation!
- **Resilient MongoDB Persistence**:
  - Connects to local MongoDB (`mongodb://127.0.0.1:27017/ai_chat_assistant`) or MongoDB Atlas via `MONGODB_URI`.
  - Includes **automatic embedded in-memory database fallback** (`MongoMemoryServer` / internal document store) so the project **starts and persists instantly on any machine** without requiring a pre-installed MongoDB service!
  - Stores conversations with title, tone, timestamps, roles, prompt, response, and suggested follow-ups.

---

## 🛠️ Architecture & Tech Stack

```
quantiphi/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB & In-Memory fallback connection
│   │   ├── models/
│   │   │   └── Conversation.js       # Mongoose Schema & Resilient Repository
│   │   ├── services/
│   │   │   └── aiService.js          # AI streaming, Tone prompt injection, Follow-ups
│   │   ├── controllers/
│   │   │   ├── chatController.js     # SSE streaming, Edit & Regenerate handlers
│   │   │   └── conversationController.js # CRUD & Export endpoints
│   │   ├── routes/
│   │   │   ├── chatRoutes.js         # POST /api/chat/stream
│   │   │   └── conversationRoutes.js # GET/POST/PATCH/DELETE /api/conversations
│   │   └── server.js                 # Express app, CORS, error handling
│   ├── .env                          # Configuration & API keys
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx           # Conversation history & search
│   │   │   ├── Header.jsx            # Tone toggle ("The Vibe Check") & Export
│   │   │   ├── ChatView.jsx          # Message bubbles, follow-up chips, edit & regen
│   │   │   ├── ChatInput.jsx         # Auto-growing input, tone badge, stop button
│   │   │   ├── ExportModal.jsx       # Markdown & JSON download modal
│   │   │   └── MarkdownRenderer.jsx  # Formatted markdown & code styling
│   │   ├── App.jsx                   # Main state & SSE stream reader
│   │   ├── index.css                 # Cyber-glassmorphic styling system
│   │   └── main.jsx
│   ├── vite.config.js                # Vite config with backend proxy
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### 1. Start the Backend
Open a terminal in the project directory:
```bash
cd backend
npm install
node src/server.js
```
The backend starts at `http://localhost:5000`.

### 2. Start the Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend starts at `http://localhost:3000`.

---

## ⚙️ Environment Variables (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend server port | `5000` |
| `MONGODB_URI` | MongoDB Connection URI (Atlas or Local) | `mongodb://127.0.0.1:27017/ai_chat_assistant` (auto falls back to embedded in-memory if offline) |
| `OPENAI_API_KEY` | Optional OpenAI API Key | None (uses intelligent local streaming engine) |
| `OPENAI_MODEL` | OpenAI Model | `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | Optional Anthropic API Key | None |
| `ANTHROPIC_MODEL` | Anthropic Model | `claude-3-5-sonnet-20241022` |

---

## 📡 API Reference

### Real-Time Chat Streaming
- **`POST /api/chat/stream`**
  - **Headers**: `Content-Type: application/json`
  - **Body**:
    ```json
    {
      "conversationId": "optional-mongo-id",
      "prompt": "Explain React state",
      "tone": "professional", // "professional" | "casual" | "concise"
      "editMessageId": "optional-id-to-edit",
      "regenerateMessageId": "optional-id-to-regenerate"
    }
    ```
  - **Response**: Server-Sent Events (SSE):
    - `event: start` -> `{ conversationId, tone, title, userMessage }`
    - `event: chunk` -> `{ chunk: "..." }`
    - `event: done`  -> `{ done: true, aiMessage, suggestedFollowUps: [...] }`

### Conversations Management
- **`GET /api/conversations`**: Returns list of all conversation threads sorted by `updatedAt` descending.
- **`POST /api/conversations`**: Create a new conversation thread.
- **`GET /api/conversations/:id`**: Retrieve conversation by ID with all messages and tone history.
- **`PATCH /api/conversations/:id/tone`**: Update tone preference for the conversation (`"professional"`, `"casual"`, `"concise"`).
- **`DELETE /api/conversations/:id`**: Delete a conversation thread.
- **`GET /api/conversations/:id/export?format=markdown|json`**: Export formatted conversation file.

---

## 💡 Viva & Evaluation Talking Points

1. **How is the "Vibe Check" Tone Toggle implemented?**
   - The user selects their tone preference in the UI.
   - When sending a message (or regenerating an existing one), the frontend transmits the chosen tone (`professional`, `casual`, or `concise`) along with the conversation ID.
   - The server selects a tailored system instruction modifier (`TONE_INSTRUCTIONS[tone]`), altering temperature and persona before sending to OpenAI/Claude or the streaming engine.
2. **How does real-time token streaming work?**
   - Implemented via Server-Sent Events (SSE) using HTTP chunked transfer encoding (`text/event-stream`).
   - The frontend reads the stream via the Streams API (`response.body.getReader()`) and renders text chunk-by-chunk with typewriter animation and blinking cursor.
   - Supports user-initiated cancellation via `AbortController`.
3. **How is data persistence guaranteed?**
   - After the stream completes, the conversation document in MongoDB is updated atomically with the prompt, the full AI response, tone metadata, timestamps, and suggested follow-ups.
   - If an external MongoDB service is unavailable, an embedded in-memory MongoDB instance automatically boots up, ensuring 100% operational reliability.
