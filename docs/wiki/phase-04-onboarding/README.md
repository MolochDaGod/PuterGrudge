# Phase 4: User Onboarding

**Status:** In Progress  
**Last Updated:** 2025-01-11

---

## Overview

Phase 4 implements the complete user onboarding system for CloudPilot AI Studio. When a new user connects via Puter, the system automatically provisions their workspace, creates their first AI agent, integrates with GrudgeChain, and deploys their HelloWorld site.

---

## Onboarding Pipeline

```
New User Detected
      |
      v
+------------------+
| 1. Authenticate  |  <-- Puter OAuth
+------------------+
      |
      v
+------------------+
| 2. Provision     |  <-- Create user folders
|    Workspace     |
+------------------+
      |
      v
+------------------+
| 3. Deploy First  |  <-- AI agent with KB access
|    Agent         |
+------------------+
      |
      v
+------------------+
| 4. GrudgeChain   |  <-- Link to admin account
|    Integration   |
+------------------+
      |
      v
+------------------+
| 5. HelloWorld    |  <-- Deploy first site
|    Deploy        |
+------------------+
      |
      v
+------------------+
| 6. Confirmation  |  <-- Welcome message
+------------------+
```

---

## GRUDACHAIN Folder Structure

When initializing the admin account, the following structure is created:

```
/grudge-core/
  ├── config/       # System configuration
  ├── templates/    # Project templates
  ├── legal/        # TOS, Privacy Policy
  ├── wiki/         # Documentation
  └── backups/      # System backups

/grudge-workers/
  ├── active/       # Running workers
  ├── templates/    # Worker templates
  ├── logs/         # Worker logs
  └── cache/        # Worker cache

/grudge-ai/
  ├── models/       # Model configurations
  ├── knowledge-bases/  # KB storage
  ├── prompts/      # System prompts
  ├── training-data/    # Learning data
  └── cache/        # AI response cache

/grudge-users/
  ├── pending/      # Onboarding queue
  ├── active/       # Active users
  └── archived/     # Deleted users
```

---

## User Workspace Structure

Each user gets their own workspace under `/grudge-users/active/{userId}/`:

```
/grudge-users/active/{userId}/
  ├── agents/       # User's AI agents
  │   └── {agentId}/
  │       ├── config.json
  │       ├── memory.json
  │       └── log.json
  ├── projects/     # User projects
  │   └── hello-world/
  │       └── index.html
  ├── data/         # User data
  ├── logs/         # Activity logs
  └── config/
      └── settings.json
```

---

## Components Created

| File | Purpose |
|------|---------|
| `public/grudgeos/lib/puter-bootstrap.js` | Puter initialization & provisioning |
| `public/grudgeos/lib/user-onboarding.js` | Onboarding pipeline (planned) |

---

## Using the Puter Bootstrap

```javascript
import { puterBootstrap } from './puter-bootstrap.js';

async function onAppStart() {
  const user = await puterBootstrap.ensureAuthenticated();
  
  if (!user) {
    console.log('User not signed in');
    return;
  }
  
  console.log('Welcome:', user.username);
  
  if (await puterBootstrap.isNewUser(user.username)) {
    console.log('Starting onboarding...');
    
    const result = await puterBootstrap.onboardNewUser();
    
    console.log('Onboarding complete!');
    console.log('Agent ID:', result.agent.agentId);
    console.log('Site URL:', result.site.url);
  }
}

onAppStart();
```

---

## First Agent Configuration

New users receive a pre-configured AI agent with:

```javascript
{
  capabilities: [
    'chat',
    'code-generation',
    'document-analysis',
    'task-execution'
  ],
  models: {
    primary: 'openrouter:anthropic/claude-sonnet-4',
    fast: 'openrouter:anthropic/claude-3.5-haiku',
    fallback: 'openrouter:meta-llama/llama-3.3-70b-instruct:free'
  },
  knowledgeBases: [
    'agent-kb',
    'model-kb',
    'worker-kb'
  ],
  settings: {
    enableLearning: true,
    enableCaching: true,
    maxContextTokens: 8000,
    temperature: 0.7
  }
}
```

---

## HelloWorld Deployment

The first deployment includes:

1. **Responsive design** - Works on all devices
2. **Puter integration** - SDK loaded and ready
3. **Authentication check** - Shows login status
4. **AI test button** - Verify AI connectivity
5. **Dark theme** - Modern gradient styling

Deployed URL: `https://{username}-hello.puter.site`

---

## GrudgeChain Integration

New users are linked to the GrudgeChain admin account:

- **Admin Email:** grudgedev@gmail.com
- **Permissions:**
  - Can request help from admin
  - Can access shared resources
  - Requires approval for network publishing

---

## Error Handling

The onboarding process includes:

- Graceful failure recovery
- Detailed error logging
- Fallback to local-only mode if hosting fails
- Automatic retry for transient errors

---

## Next Steps

After Phase 4 is complete:
- Run full production audit
- Test complete onboarding flow
- Deploy to Puter hosting
- Monitor new user signups

---

**Phase 4 In Progress** - User Onboarding implementation
