# Puter Monitor AI - Collaborative WebOS 🚀

## 🌟 What is This?

Puter Monitor AI has evolved from a monitoring dashboard into a **fully collaborative AI-powered WebOS** that works *with* you, not just *for* you. Think of it as having an intelligent coding partner that:

- 🧠 Understands context: knows what you're working on, recent errors, system state
- 💬 Communicates naturally: chat with AI using 60+ models (Claude, GPT, Gemini, DeepSeek, etc.)
- 🎯 Anticipates needs: proactive suggestions based on your activity
- 🆓 Completely free: powered by Puter Cloud's free AI API (no API keys needed!)
- 🌐 Works everywhere: runs in your browser, deploys to Puter Cloud

---

## 🎨 Features

### 1. AI Companion (Always-Present Assistant)

The AI Companion is a **floating, draggable panel** that stays with you throughout your session.

#### Features:
- **Minimizable to Orb**: Shrinks to a pulsing orb when not in use
- **Context-Aware**: Automatically includes your current route, files, errors, and system metrics in conversations
- **60+ AI Models**: Switch between Claude Sonnet 4, GPT-4o, Gemini, DeepSeek, o1, and more
- **Persistent Conversations**: Saves to Puter KV storage, resumes across sessions
- **Export/Import**: Save conversations as JSON for backup or sharing
- **Voice Ready**: UI for voice interaction (coming soon)

#### How to Use:
```tsx
// AI Companion is automatically loaded in App.tsx
// Access from anywhere using the useAI hook

import { useAI } from '@/contexts/AIContext';

function MyComponent() {
  const ai = useAI();
  
  // Send a message
  await ai.sendMessage("Help me debug this code");
  
  // Generate code
  const code = await ai.generateCode("Create a React component for a todo list");
  
  // Analyze code
  const analysis = await ai.analyzeCode(myCode, "What does this do?");
  
  // Fix code
  const fixed = await ai.fixCode(brokenCode, errorMessage, "javascript");
}
```

### 2. Context Engine (Situational Awareness)

The Context Engine **tracks everything you do** to give AI full awareness of your work.

#### Tracks:
- 📍 **Navigation**: Current route, route history
- 📄 **Files**: Open files, current file, recent files
- ⚠️ **Errors**: Recent error messages with timestamps
- 💻 **System**: CPU, memory usage
- 🎯 **Activity**: Mouse, keyboard, clicks, session duration
- 🗣️ **Conversations**: Recent AI interactions

#### Example:
```typescript
import { ContextEngine } from '@/services/context/ContextEngine';

// Track file opening
ContextEngine.openFile('/src/components/MyComponent.tsx');

// Add error
ContextEngine.addError('TypeError: Cannot read property...');

// Add command
ContextEngine.addCommand('npm run build');

// Update system metrics
ContextEngine.updateSystemMetrics({ cpu: 45.2, memory: 68.1 });

// Get context summary (automatically sent to AI)
const summary = ContextEngine.getContextSummary();
// Returns: "Current location: /dashboard\nWorking on: /src/App.tsx\nRecent errors (2): ...\"
```

### 3. Privacy Controls

You control what AI can see:

```typescript
ContextEngine.setPrivacy({
  allowFileAccess: true,      // AI can see file names
  allowSystemAccess: true,     // AI can see CPU/memory
  allowHistoryAccess: true,    // AI can see command history
});

// Check current settings
const privacy = ContextEngine.getPrivacySettings();
```

### 4. AI Evolution System (Self-Improving AI)

The AI Evolution System is a **self-improving infrastructure** that learns from every interaction:

- 🧠 **Unified Memory**: Vector DB + Redis + PostgreSQL for semantic search
- 🎯 **AI Orchestrator**: Routes tasks to 5 specialized agents (code, review, debug, docs, reasoning)
- 📊 **Telemetry**: Tracks performance metrics with Prometheus export
- 🔮 **Predictive UX**: Anticipates user needs with pattern detection
- 👍 **Feedback Learning**: Thumbs up/down buttons on AI responses improve future interactions

See [`AI_EVOLUTION_GUIDE.md`](./AI_EVOLUTION_GUIDE.md) for full documentation.

---

## 🚀 Getting Started

### Installation

1. **Clone the repo** (already done ✅)

2. **Install dependencies**:
```bash
npm install
```

3. **Run development server**:
```bash
npm run dev
```

4. **Open in browser**:
```
http://localhost:5000
```

### First Time Setup

1. The AI Companion will appear in the **bottom-right corner**
2. It will auto-initialize with **Puter.js SDK**
3. Start chatting! Try:
   - "What can you help me with?"
   - "Generate a React component"
   - "Explain this error: [paste error]"

---

## 📖 API Reference

### `useAI()` Hook

```typescript
const {
  // State
  initialized,      // boolean - Is AI ready?
  available,        // boolean - Is Puter AI available?
  currentModel,     // string - Current AI model
  messages,         // AIMessage[] - Conversation history
  isThinking,       // boolean - Is AI processing?
  error,            // string | null - Last error
  context,          // UserContext | null - Current context
  
  // Actions
  sendMessage,      // (content, options?) => Promise<void>
  setModel,         // (model: string) => void
  clearConversation, // () => void
  
  // Specialized
  generateCode,     // (prompt, language?) => Promise<string | null>
  analyzeCode,      // (code, question?) => Promise<string | null>
  fixCode,          // (code, error, language?) => Promise<string | null>
  askQuestion,      // (question) => Promise<string | null>
  
  // Context
  getContextSummary, // () => string
  
  // Data
  exportConversation, // () => any
  importConversation, // (data: any) => void
} = useAI();
```

### Available AI Models

| Model | Provider | Best For | Speed |
|-------|----------|----------|-------|
| `claude-sonnet-4` | Anthropic | Code, Analysis | Fast |
| `claude-3-5-sonnet` | Anthropic | Creative Writing | Fast |
| `gpt-4o` | OpenAI | Vision, Multimodal | Medium |
| `gpt-4o-mini` | OpenAI | Quick Tasks | Very Fast |
| `gemini-2.0-flash` | Google | Long Context | Fast |
| `deepseek-chat` | DeepSeek | Code, Chinese | Fast |
| `o1` | OpenAI | Reasoning, Math | Slow |
| `llama-3.1-70b` | Meta | Open Source | Medium |
| `mistral-large` | Mistral | Multilingual | Fast |

---

## 🎯 Use Cases

### 1. **Debugging**

Paste errors into the AI Companion. The Context Engine automatically includes:
- Recent error history
- Current file
- System state

```
You: "I'm getting 'Cannot read property of undefined'"

AI: *sees you're in ProfilePage.tsx, notices 3 similar errors in last 5 minutes*
"Based on your recent errors in ProfilePage.tsx, it looks like you're accessing
user.profile before checking if user exists. Try adding optional chaining..."
```

### 2. **Code Generation**

```
You: "Generate a React hook for managing form state with validation"

AI: *uses claude-sonnet-4 (best for code)*
[Returns complete, production-ready code]
```

### 3. **Learning**

```
You: "Explain how React Context works"

AI: *adapts to your current project context*
"I see you're building a WebOS. React Context is perfect for sharing state like
your AI conversation history across components. Here's how..."
```

### 4. **Pair Programming**

```
You: "Review this component for bugs"
[paste code]

AI: *analyzes code with awareness of your project*
"I notice you're using similar patterns to your CloudPilotShell. Here are 3
potential issues..."
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│          User Interface (React)         │
│  ┌───────────┐  ┌──────────────┐        │
│  │ AI Companion│  │  Your App   │       │
│  └─────┬─────┘  └──────┬───────┘        │
│        │                │               │
│  ┌─────▼────────────────▼─────┐         │
│  │      AIContext (Provider)   │        │
│  └──────┬──────────────────────┘        │
│         │                               │
│  ┌──────▼──────────┐ ┌────────────┐     │
│  │ ContextEngine   │ │ PuterAI    │     │
│  │  (Awareness)    │ │(60+ Models)│     │
│  └─────────────────┘ └────────────┘     │
└─────────────────────────────────────────┘
                  │
          ┌───────▼───────┐
          │  Puter Cloud  │
          │   (Free AI)   │
          └───────────────┘
```

### Data Flow:

1. **User types** in AI Companion
2. **ContextEngine** builds summary of current state
3. **AIContext** combines user message + context
4. **PuterAI** selects best model and sends request
5. **Puter Cloud** processes with free AI
6. **Response** saved to Puter KV, displayed in UI

---

## 🔮 What's Next (Roadmap)

We created a detailed plan for the full WebOS transformation. Check `docs/plans/` for the complete vision.

### Phase 1: ✅ Complete
- ✅ AI Companion UI
- ✅ Context Engine
- ✅ PuterAI Integration
- ✅ Conversation Persistence

### Phase 2: 🚧 In Progress
- Voice Interface (Web Speech API)
- Emotional Intelligence (detects frustration, celebrates wins)
- Code Editor with inline AI suggestions
- Desktop Environment (file browser, terminal, window manager)

### Phase 3: 📅 Planned
- Autonomous Agent Workers (background tasks)
- Multi-agent orchestration
- Natural language system control
- Monitoring dashboard with AI commentary

---

## 🤝 How AI Works With You

### Traditional AI:
```
You ask → AI responds → Done
```

### Collaborative AI (This Project):
```
You work → Context Engine tracks everything
         ↓
AI watches → Builds understanding
         ↓
You ask → AI responds with full context
       ↓
AI suggests proactively → "Looks like you're stuck, want help?"
```

### Example Session:

```
09:00 - You open App.tsx
09:02 - Error: "Cannot find module '@/components/ai/AICompanion'"
09:02 - Context Engine records error
09:03 - AI Companion notices repeated errors, suggests:
        "👋 I see you're getting import errors. Want me to check your
        tsconfig paths?"
09:05 - You ask: "yes, fix it"
09:05 - AI analyzes tsconfig, finds missing path, provides fix
09:06 - Error resolved!
09:06 - AI: "🎉 Great! The import is working now. What's next?"
```

---

## 💡 Tips & Tricks

### 1. **Use Specific Models**

```typescript
// For code generation
await ai.sendMessage("Generate a component", { model: 'claude-sonnet-4' });

// For quick questions
await ai.sendMessage("What's this?", { model: 'gpt-4o-mini' });

// For math/reasoning
await ai.sendMessage("Solve this algorithm", { model: 'o1' });
```

### 2. **Minimize AI When Coding**

Click the minimize button. AI becomes a small orb that:
- Glows when thinking
- Pings when it has a suggestion
- Stays out of your way

### 3. **Export Important Conversations**

```typescript
// In AI Companion settings panel
Click "Export" → Saves JSON with full conversation

// Import later
Click "Import" → Load previous conversations
```

### 4. **Clear Context**

If AI seems confused:
```typescript
ai.clearConversation();
ContextEngine.clearConversationContext();
```

---

## 🐛 Troubleshooting

### AI Not Loading?

1. Check browser console for errors
2. Verify Puter.js loaded: `window.puter` should exist
3. Verify PuterAI loaded: `window.puterAI` should exist
4. Try reloading page

### AI Says "Offline"?

- Puter.js SDK may not be loaded
- Check `/grudgeos/lib/puter-ai-service.js` exists
- Check network connectivity

### Context Not Working?

```typescript
// Check context status
const context = ContextEngine.getContext();
console.log(context);

// Verify privacy settings
const privacy = ContextEngine.getPrivacySettings();
```

---

## 📜 License

This project is part of the Puter Monitor AI suite. All AI features are powered by Puter Cloud's free tier.

## 🙏 Credits

- **Puter.js**: Free AI API, cloud storage, hosting
- **React**: UI framework
- **Tailwind CSS**: Styling
- **Lucide Icons**: Beautiful icons
- **60+ AI Models**: Via Puter's OpenRouter integration

---

## 🎉 You're Ready!

Start your development server and experience collaborative AI:

```bash
npm run dev
```

The AI Companion is waiting for you. Ask it anything! 🚀✨
