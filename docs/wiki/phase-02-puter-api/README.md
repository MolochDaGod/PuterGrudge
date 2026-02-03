# Phase 2: Puter.js API Integration

**Status:** In Progress  
**Last Updated:** 2025-01-11

---

## Overview

Phase 2 integrates the complete Puter.js SDK documentation into CloudPilot AI Studio's agent knowledge base. This enables agents to leverage 70+ Puter functions across 10 categories, with access to 500+ free AI models.

---

## Puter.js SDK Summary

| Category | Functions | Key Capabilities |
|----------|-----------|------------------|
| **AI** | 9 | Chat, image gen, speech, video |
| **Apps** | 5 | Create, list, update, delete apps |
| **Auth** | 6 | Sign in/out, user info, usage |
| **Cloud Storage** | 11 | Files, folders, read/write/copy |
| **Workers** | 6 | Serverless functions, routing |
| **Hosting** | 5 | Static site deployment |
| **Key-Value** | 9 | Persistent data storage |
| **Networking** | 3 | WebSocket, fetch |
| **UI** | 25 | Dialogs, windows, menus |
| **Permissions** | 12 | Granular access control |

**Total: 70+ functions**

---

## Key Integration Points

### 1. AI Functions (`puter.ai`)

```javascript
// Chat with any model (500+ available)
const response = await puter.ai.chat("Hello", {model: "gpt-4"});

// Generate images
const image = await puter.ai.txt2img("A sunset over mountains");

// Text-to-speech
const audio = await puter.ai.txt2speech("Hello world");

// OCR - Extract text from images
const text = await puter.ai.img2txt(imageFile);

// Speech-to-text
const transcript = await puter.ai.speech2txt(audioBlob);
```

### 2. Cloud Storage (`puter.fs`)

```javascript
// Write file
await puter.fs.write("data.json", JSON.stringify(data));

// Read file
const content = await puter.fs.read("data.json");

// Create directory
await puter.fs.mkdir("projects/new-project");

// List directory
const files = await puter.fs.readdir("projects");

// Get shareable URL
const url = await puter.fs.getReadURL("public/image.png");
```

### 3. Key-Value Store (`puter.kv`)

```javascript
// Set value
await puter.kv.set("user:preferences", {theme: "dark"});

// Get value
const prefs = await puter.kv.get("user:preferences");

// Increment counter
await puter.kv.incr("page_views");

// Set expiration (seconds)
await puter.kv.expire("session:token", 3600);

// List all keys
const keys = await puter.kv.list();
```

### 4. Hosting (`puter.hosting`)

```javascript
// Deploy static site
const site = await puter.hosting.create("mysite", "/web/mysite");
// URL: https://mysite.puter.site

// Update existing site
await puter.hosting.update("mysite", "/web/mysite-v2");

// List all sites
const sites = await puter.hosting.list();
```

### 5. Serverless Workers (`puter.worker`)

```javascript
// Create worker with API routes
const worker = await puter.worker.create({
  code: `
    export default async (req) => {
      if (req.method === 'POST') {
        return { status: 'ok', data: req.body };
      }
      return { status: 'ok' };
    }
  `
});

// Execute worker
const result = await puter.worker.exec(workerId, { input: "data" });
```

---

## AI Models Available

### Tier 1: Fast/Affordable
- `meta-llama/llama-2-7b-chat`
- `mistralai/mistral-7b-instruct`
- `google/flan-t5-large`

### Tier 2: Balanced
- `meta-llama/llama-2-70b-chat`
- `mistralai/mistral-medium`
- `openai/gpt-3.5-turbo`

### Tier 3: Advanced
- `openai/gpt-4`
- `openai/gpt-4-turbo`
- `anthropic/claude-3-opus`
- `anthropic/claude-3-sonnet`
- `google/gemini-pro`

### Model Selection Guide

| Task | Recommended Model | Why |
|------|-------------------|-----|
| Quick responses | llama-2-7b | Speed |
| General chat | gpt-3.5-turbo | Balance |
| Complex reasoning | gpt-4 | Quality |
| Creative writing | claude-3-opus | Style |
| Code generation | gpt-4-turbo | Accuracy |

---

## Agent Knowledge Base Integration

The Puter.js API Reference is stored in the agent knowledge base:

```javascript
// Access from agent
const kb = window.GrudgeOS?.AgentKnowledgeBase;
const puterDocs = kb?.query('puter.ai.chat');
```

---

## Best Practices

### 1. Always Check Authentication
```javascript
if (!await puter.auth.isSignedIn()) {
  await puter.auth.signIn();
}
```

### 2. Use Caching for AI Responses
```javascript
const cached = await puter.kv.get(`ai:${promptHash}`);
if (!cached) {
  const response = await puter.ai.chat(prompt);
  await puter.kv.set(`ai:${promptHash}`, response);
  await puter.kv.expire(`ai:${promptHash}`, 86400); // 24h
}
```

### 3. Handle Errors Gracefully
```javascript
try {
  const result = await puter.ai.chat(prompt);
} catch (error) {
  console.error('AI error:', error);
  // Fallback to different model
  const fallback = await puter.ai.chat(prompt, {
    model: 'meta-llama/llama-2-70b-chat'
  });
}
```

### 4. Organize Files by Project
```
/agents/{userId}/
  config.json
  knowledge/
  logs/
/web/{userId}/
  index.html
  assets/
```

---

## Files Created

| File | Purpose |
|------|---------|
| `public/grudgeos/lib/agent-knowledge-base.js` | Enhanced with Puter API docs |
| `docs/wiki/phase-02-puter-api/ai-functions.md` | AI functions documentation |
| `docs/wiki/phase-02-puter-api/cloud-storage.md` | Storage documentation |
| `docs/wiki/phase-02-puter-api/model-catalog.md` | All 500+ models |

---

## Next Steps

After Phase 2 is complete:
- Proceed to [Phase 3: Certification Framework](../phase-03-certification/README.md)
- Test all Puter API integrations
- Verify agent knowledge base queries

---

**Phase 2 In Progress** - Puter.js SDK integration
