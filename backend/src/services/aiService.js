import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Base system instructions per tone ("The Vibe Check")
export const TONE_INSTRUCTIONS = {
  professional: `You are an intelligent, authoritative, and polished AI assistant.
Tone Requirement: PROFESSIONAL.
- Maintain formal, objective, and polite language.
- Structure your response clearly using headers, bullet points, or numbered steps when appropriate.
- Provide comprehensive reasoning, well-researched insights, and business-ready or academic precision.
- Avoid slang or overly casual colloquialisms.`,

  casual: `You are a friendly, upbeat, and approachable AI assistant.
Tone Requirement: CASUAL.
- Speak naturally and warmly, like a helpful tech-savvy colleague or mentor having a chat.
- Use conversational language, approachable explanations, and appropriate emojis to keep the vibe friendly.
- Feel free to use relatable metaphors, quick banter, and an encouraging tone.
- Keep explanations easy to digest without unnecessary academic jargon.`,

  concise: `You are a hyper-efficient, precision-focused AI assistant.
Tone Requirement: CONCISE.
- Deliver direct, high-density information with ZERO fluff, pleasantries, or preamble.
- Get straight to the key points immediately.
- Use brief bullet points or short, punchy sentences.
- Prioritize brevity, speed, and actionable takeaways over length.`,
};

// Generates suggested follow-up questions based on tone and message context
export const generateSuggestedFollowUps = (prompt, tone, responseText) => {
  const p = prompt.toLowerCase();
  if (p.includes('react') || p.includes('javascript') || p.includes('frontend')) {
    return [
      'Can you show a complete code example for this?',
      'What are the common performance pitfalls to avoid?',
      'How does this integrate with backend APIs?',
    ];
  }
  if (p.includes('database') || p.includes('mongo') || p.includes('sql')) {
    return [
      'How does indexing work for this in MongoDB?',
      'What are the best practices for scaling this database?',
      'Can you explain data modeling with an example schema?',
    ];
  }
  if (p.includes('python') || p.includes('ai') || p.includes('machine learning')) {
    return [
      'What libraries are recommended for implementing this?',
      'How do we handle edge cases and model drift?',
      'Can you optimize this code snippet for lower latency?',
    ];
  }
  if (tone === 'concise') {
    return [
      'Give me 3 key action steps.',
      'What is the biggest risk with this?',
      'Show a minimal code snippet.',
    ];
  }
  if (tone === 'casual') {
    return [
      'Can you explain that with a fun analogy? 😊',
      'What is the easiest way to try this out?',
      'Got any cool real-world examples?',
    ];
  }
  return [
    'Could you elaborate on the architecture details?',
    'What are the key trade-offs of this approach?',
    'How would you deploy and test this in production?',
  ];
};

export class AIService {
  static getOpenAIClient() {
    if (process.env.OPENAI_API_KEY) {
      return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return null;
  }

  static getAnthropicClient() {
    if (process.env.ANTHROPIC_API_KEY) {
      return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return null;
  }

  static getGroqClient() {
    if (process.env.GROQ_API_KEY) {
      return new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }
    return null;
  }

  /**
   * Determine available AI provider: 'openai' | 'anthropic' | 'groq' | 'free-ai' | 'mock'
   */
  static getActiveProvider(requestedModel) {
    if (requestedModel && requestedModel.startsWith('claude') && process.env.ANTHROPIC_API_KEY) {
      return 'anthropic';
    }
    if (requestedModel && requestedModel.startsWith('gpt') && process.env.OPENAI_API_KEY) {
      return 'openai';
    }
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.GROQ_API_KEY) return 'groq';
    return 'free-ai'; // Zero-cost live AI (No credit card / No key needed)
  }

  /**
   * Stream response to callback
   */
  static async streamChat({ prompt, tone = 'professional', history = [], model, onChunk, onDone }) {
    const systemInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professional;
    const provider = this.getActiveProvider(model);

    console.log(`[AI Service] Generating streaming response | Provider: ${provider} | Tone: ${tone}`);

    try {
      // 1. Paid OpenAI (if user provided OPENAI_API_KEY)
      if (provider === 'openai') {
        const client = this.getOpenAIClient();
        const messages = [
          { role: 'system', content: systemInstruction },
          ...history.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: prompt },
        ];

        const stream = await client.chat.completions.create({
          model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages,
          stream: true,
          temperature: tone === 'concise' ? 0.3 : tone === 'casual' ? 0.8 : 0.6,
        });

        let fullText = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            onChunk(content);
          }
        }
        const followUps = generateSuggestedFollowUps(prompt, tone, fullText);
        onDone(fullText, followUps);
        return;
      }

      // 2. Paid Anthropic Claude (if user provided ANTHROPIC_API_KEY)
      if (provider === 'anthropic') {
        const client = this.getAnthropicClient();
        const stream = client.messages.stream({
          messages: [
            ...history.map((m) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content,
            })),
            { role: 'user', content: prompt },
          ],
          model: model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          system: systemInstruction,
          max_tokens: 2048,
        });

        let fullText = '';
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            const text = event.delta.text;
            fullText += text;
            onChunk(text);
          }
        }
        const followUps = generateSuggestedFollowUps(prompt, tone, fullText);
        onDone(fullText, followUps);
        return;
      }

      // 3. Free Groq API (if user provided free GROQ_API_KEY from console.groq.com)
      if (provider === 'groq') {
        const client = this.getGroqClient();
        const messages = [
          { role: 'system', content: systemInstruction },
          ...history.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: prompt },
        ];

        const stream = await client.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          stream: true,
          temperature: tone === 'concise' ? 0.3 : tone === 'casual' ? 0.8 : 0.6,
        });

        let fullText = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            onChunk(content);
          }
        }
        const followUps = generateSuggestedFollowUps(prompt, tone, fullText);
        onDone(fullText, followUps);
        return;
      }

      // 4. Zero-Cost Live Cloud AI (100% Free, NO credit card, NO API key required)
      if (provider === 'free-ai') {
        const success = await this.streamFreeLiveAI({ prompt, tone, systemInstruction, history, onChunk, onDone });
        if (success) return;
      }

      // 5. Offline Fallback
      await this.streamMockResponse({ prompt, tone, history, onChunk, onDone });
    } catch (err) {
      console.error('[AI Service Error]:', err.message);
      console.log('[AI Service] Falling back to offline response generator...');
      await this.streamMockResponse({ prompt, tone, history, onChunk, onDone, fallbackError: err.message });
    }
  }

  /**
   * Free Live AI Stream: fetches real dynamic AI completion and streams it token-by-token
   */
  /**
   * Free Live AI Stream: fetches real dynamic AI completion and streams it token-by-token
   */
  static async streamFreeLiveAI({ prompt, tone, systemInstruction, history, onChunk, onDone }) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const messages = [
        { role: 'system', content: systemInstruction },
        ...history.slice(-6).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: prompt },
      ];

      const res = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: 'openai',
          seed: Math.floor(Math.random() * 100000),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`AI gateway responded with HTTP ${res.status}`);
      }

      const fullText = await res.text();
      if (!fullText || fullText.trim().length === 0) {
        throw new Error('Empty response from AI gateway');
      }

      // Stream out the real AI response words smoothly
      const words = fullText.split(' ');
      for (let i = 0; i < words.length; i++) {
        const piece = (i === 0 ? '' : ' ') + words[i];
        onChunk(piece);
        await new Promise((resolve) => setTimeout(resolve, 18));
      }

      const followUps = generateSuggestedFollowUps(prompt, tone, fullText);
      onDone(fullText, followUps);
      return true;
    } catch (err) {
      console.warn('[Free Live AI Gateway]:', err.message);
      return false;
    }
  }

  /**
   * High fidelity intelligent fallback tailored specifically to prompt and tone
   */
  static async streamMockResponse({ prompt, tone, history, onChunk, onDone, fallbackError }) {
    let responseText = '';
    const followUps = generateSuggestedFollowUps(prompt, tone, '');
    const p = prompt.trim().toLowerCase();

    // Natural greeting or personal check-in
    const isGreeting =
      p.includes('how are you') ||
      p.includes('how was your day') ||
      p.includes('how was you day') ||
      p === 'hi' ||
      p === 'hello' ||
      p === 'hey' ||
      p.includes('who are you') ||
      p.includes('good morning') ||
      p.includes('good evening');

    if (isGreeting) {
      if (tone === 'concise') {
        responseText = 'Operating normally. Ready to assist. What can I do for you?';
      } else if (tone === 'casual') {
        responseText = `Hey! 😊 It's been going great on my end — just helping out with conversations and code! Thanks for asking. How has your day been? What are you working on right now?`;
      } else {
        responseText = `Hello. I am functioning optimally and ready to assist you. I am an intelligent assistant configured in Professional mode. Please let me know what subject, analysis, or inquiry you would like to explore.`;
      }
    } else if (p.includes('react') || p.includes('state')) {
      if (tone === 'concise') {
        responseText = `### React State Summary\n• State holds component data that triggers re-renders on change.\n• Managed via \`useState\` or \`useReducer\` hooks.\n• Keep state minimal and lift state up when shared across components.`;
      } else if (tone === 'casual') {
        responseText = `State in React is basically a component's memory! 🧠\n\nWhenever the state changes (like when someone clicks a button or types in an input), React automatically re-renders the component to show the update. You use \`useState\` to handle it:\n\n\`\`\`javascript\nconst [count, setCount] = useState(0);\n\`\`\`\nSuper clean and intuitive! 🚀`;
      } else {
        responseText = `### React State Management Overview\n\nIn React, **state** represents encapsulated data that dictates the rendered output of a component over time.\n\n#### Key Architectural Principles:\n1. **Immutability**: State must not be mutated directly; invoke the setter function dispatched by hooks such as \`useState\` or \`useReducer\`.\n2. **Reconciliation**: State mutations enqueue a re-render phase, triggering virtual DOM diffing to update the host DOM with minimal operations.\n3. **Component Colocation**: State should be scoped as locally as possible, and lifted only when required by sibling hierarchies.`;
      }
    } else {
      if (tone === 'concise') {
        responseText = `Processing query: "${prompt}". Ready to assist. Please specify if you need code, explanations, or step-by-step guidance.`;
      } else if (tone === 'casual') {
        responseText = `I'm right here chatting with you and ready to help! 😊 What would you like to build, explore, or talk about next?`;
      } else {
        responseText = `I am actively available and ready to assist you. Please specify how you would like me to assist you with "${prompt}".`;
      }
    }

    const words = responseText.split(' ');
    let full = '';
    for (let i = 0; i < words.length; i++) {
      const piece = (i === 0 ? '' : ' ') + words[i];
      full += piece;
      onChunk(piece);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    onDone(full, followUps);
  }
}

