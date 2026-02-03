/**
 * Workflow Templates Gallery
 * Pre-built templates for AI agents to scaffold projects
 * Ensures projects "start with end in mind" for resolvable outcomes
 */

const WorkflowTemplates = {
  categories: [
    { id: 'web', name: 'Web Applications', icon: '🌐' },
    { id: 'api', name: 'API & Backend', icon: '⚡' },
    { id: 'ai', name: 'AI & Machine Learning', icon: '🤖' },
    { id: 'automation', name: 'Automation', icon: '🔄' },
    { id: 'game', name: 'Game Development', icon: '🎮' },
    { id: 'data', name: 'Data Processing', icon: '📊' }
  ],

  templates: [
    {
      id: 'fullstack-react',
      name: 'Full-Stack React App',
      category: 'web',
      complexity: 'medium',
      description: 'Complete React frontend with Express backend, database, and authentication',
      tags: ['react', 'express', 'postgres', 'auth'],
      estimatedTime: '30-60 min',
      completionCriteria: [
        'User registration and login working',
        'Protected routes implemented',
        'Database CRUD operations functional',
        'Responsive design complete'
      ],
      structure: {
        'client/': 'React frontend with Vite',
        'server/': 'Express API server',
        'shared/': 'Shared types and schemas',
        'package.json': 'Root package configuration'
      },
      requiredServices: ['postgresql'],
      agentSequence: ['Orchestrator', 'Code Agent', 'Art Agent'],
      checkpoints: [
        { phase: 'setup', description: 'Project structure created' },
        { phase: 'backend', description: 'API routes implemented' },
        { phase: 'frontend', description: 'UI components built' },
        { phase: 'integration', description: 'Frontend-backend connected' },
        { phase: 'polish', description: 'Styling and UX refined' }
      ]
    },
    {
      id: 'rest-api',
      name: 'REST API Service',
      category: 'api',
      complexity: 'easy',
      description: 'RESTful API with validation, error handling, and documentation',
      tags: ['express', 'zod', 'swagger', 'rest'],
      estimatedTime: '15-30 min',
      completionCriteria: [
        'CRUD endpoints working',
        'Input validation active',
        'Error responses consistent',
        'API documented'
      ],
      structure: {
        'server/routes/': 'API route handlers',
        'server/middleware/': 'Auth and validation',
        'shared/schema.ts': 'Zod schemas',
        'docs/api.md': 'API documentation'
      },
      requiredServices: ['postgresql'],
      agentSequence: ['Code Agent'],
      checkpoints: [
        { phase: 'schema', description: 'Data models defined' },
        { phase: 'routes', description: 'Endpoints implemented' },
        { phase: 'validation', description: 'Input validation added' },
        { phase: 'docs', description: 'Documentation generated' }
      ]
    },
    {
      id: 'ai-chatbot',
      name: 'AI Chatbot',
      category: 'ai',
      complexity: 'medium',
      description: 'Conversational AI with context memory and multi-model support',
      tags: ['puter-ai', 'chat', 'context', 'streaming'],
      estimatedTime: '20-40 min',
      completionCriteria: [
        'Chat interface functional',
        'Context maintained across messages',
        'Model selection working',
        'Conversation history saved'
      ],
      structure: {
        'client/components/Chat.tsx': 'Chat UI component',
        'server/routes/chat.ts': 'Chat API endpoint',
        'lib/ai-service.js': 'Puter AI wrapper'
      },
      requiredServices: ['puter-ai'],
      agentSequence: ['Orchestrator', 'Code Agent'],
      checkpoints: [
        { phase: 'ui', description: 'Chat interface built' },
        { phase: 'ai', description: 'AI integration working' },
        { phase: 'memory', description: 'Context persistence added' },
        { phase: 'polish', description: 'UX improvements' }
      ]
    },
    {
      id: 'data-dashboard',
      name: 'Data Dashboard',
      category: 'data',
      complexity: 'medium',
      description: 'Interactive dashboard with charts, filters, and real-time updates',
      tags: ['recharts', 'dashboard', 'realtime', 'filters'],
      estimatedTime: '30-45 min',
      completionCriteria: [
        'Charts rendering correctly',
        'Filters working',
        'Data refreshing automatically',
        'Responsive layout complete'
      ],
      structure: {
        'client/components/Dashboard.tsx': 'Main dashboard',
        'client/components/charts/': 'Chart components',
        'server/routes/data.ts': 'Data API'
      },
      requiredServices: ['postgresql'],
      agentSequence: ['Art Agent', 'Code Agent', 'Analyst'],
      checkpoints: [
        { phase: 'data', description: 'Data model designed' },
        { phase: 'charts', description: 'Visualizations built' },
        { phase: 'interactivity', description: 'Filters and controls' },
        { phase: 'realtime', description: 'Auto-refresh enabled' }
      ]
    },
    {
      id: 'automation-pipeline',
      name: 'Automation Pipeline',
      category: 'automation',
      complexity: 'advanced',
      description: 'Multi-step automation workflow with scheduling and notifications',
      tags: ['xstate', 'workflow', 'scheduling', 'notifications'],
      estimatedTime: '45-90 min',
      completionCriteria: [
        'Workflow states defined',
        'Transitions working correctly',
        'Scheduling functional',
        'Notifications sent'
      ],
      structure: {
        'lib/workflows/': 'XState workflow definitions',
        'server/scheduler.ts': 'Job scheduling',
        'server/notifications.ts': 'Alert system'
      },
      requiredServices: [],
      agentSequence: ['Orchestrator', 'Code Agent'],
      checkpoints: [
        { phase: 'design', description: 'Workflow diagrammed' },
        { phase: 'states', description: 'State machine built' },
        { phase: 'scheduler', description: 'Timing logic added' },
        { phase: 'notifications', description: 'Alerts configured' }
      ]
    },
    {
      id: 'multiplayer-game',
      name: 'Multiplayer Game',
      category: 'game',
      complexity: 'advanced',
      description: 'Real-time multiplayer game with WebSocket sync and game state',
      tags: ['websocket', 'game', 'realtime', 'state-sync'],
      estimatedTime: '60-120 min',
      completionCriteria: [
        'Game renders correctly',
        'Players can connect',
        'State syncs in real-time',
        'Game logic complete'
      ],
      structure: {
        'client/game/': 'Game client code',
        'server/game/': 'Game server logic',
        'shared/game-types.ts': 'Shared game types'
      },
      requiredServices: ['websocket'],
      agentSequence: ['Orchestrator', 'Code Agent', 'Three.js Agent'],
      checkpoints: [
        { phase: 'protocol', description: 'Network protocol defined' },
        { phase: 'server', description: 'Game server running' },
        { phase: 'client', description: 'Game client rendering' },
        { phase: 'sync', description: 'Real-time sync working' },
        { phase: 'gameplay', description: 'Game mechanics complete' }
      ]
    },
    {
      id: 'landing-page',
      name: 'Landing Page',
      category: 'web',
      complexity: 'easy',
      description: 'Beautiful landing page with hero, features, and CTA sections',
      tags: ['landing', 'marketing', 'responsive', 'animations'],
      estimatedTime: '15-30 min',
      completionCriteria: [
        'Hero section compelling',
        'Features clearly presented',
        'CTAs prominent',
        'Mobile-responsive'
      ],
      structure: {
        'client/pages/Landing.tsx': 'Landing page component',
        'client/components/Hero.tsx': 'Hero section',
        'client/components/Features.tsx': 'Feature cards'
      },
      requiredServices: [],
      agentSequence: ['Art Agent', 'Code Agent'],
      checkpoints: [
        { phase: 'design', description: 'Layout designed' },
        { phase: 'hero', description: 'Hero section built' },
        { phase: 'content', description: 'All sections complete' },
        { phase: 'responsive', description: 'Mobile optimized' }
      ]
    },
    {
      id: 'crud-app',
      name: 'CRUD Application',
      category: 'web',
      complexity: 'easy',
      description: 'Basic Create, Read, Update, Delete app with forms and tables',
      tags: ['crud', 'forms', 'tables', 'validation'],
      estimatedTime: '20-40 min',
      completionCriteria: [
        'Create operation working',
        'Read/list displaying data',
        'Update editing correctly',
        'Delete with confirmation'
      ],
      structure: {
        'client/components/ItemList.tsx': 'Data table',
        'client/components/ItemForm.tsx': 'Create/Edit form',
        'server/routes/items.ts': 'CRUD endpoints'
      },
      requiredServices: ['postgresql'],
      agentSequence: ['Code Agent'],
      checkpoints: [
        { phase: 'schema', description: 'Data model created' },
        { phase: 'api', description: 'CRUD endpoints ready' },
        { phase: 'ui', description: 'Forms and tables built' },
        { phase: 'validation', description: 'Input validation added' }
      ]
    },
    {
      id: 'ecommerce-store',
      name: 'E-Commerce Store',
      category: 'web',
      complexity: 'advanced',
      description: 'Complete online store with product catalog, cart, and checkout',
      tags: ['ecommerce', 'stripe', 'cart', 'products'],
      estimatedTime: '90-180 min',
      completionCriteria: [
        'Product listing working',
        'Shopping cart functional',
        'Checkout process complete',
        'Order management ready'
      ],
      structure: {
        'client/pages/Products.tsx': 'Product catalog',
        'client/pages/Cart.tsx': 'Shopping cart',
        'client/pages/Checkout.tsx': 'Checkout flow',
        'server/routes/orders.ts': 'Order processing'
      },
      requiredServices: ['postgresql', 'stripe'],
      agentSequence: ['Orchestrator', 'Code Agent', 'Art Agent'],
      checkpoints: [
        { phase: 'catalog', description: 'Product display ready' },
        { phase: 'cart', description: 'Cart management working' },
        { phase: 'checkout', description: 'Payment flow complete' },
        { phase: 'orders', description: 'Order tracking active' }
      ]
    },
    {
      id: 'realtime-collab',
      name: 'Real-Time Collaboration',
      category: 'web',
      complexity: 'advanced',
      description: 'Collaborative document editing with presence and cursors',
      tags: ['websocket', 'collaboration', 'realtime', 'presence'],
      estimatedTime: '60-120 min',
      completionCriteria: [
        'Multiple users can edit',
        'Changes sync instantly',
        'User cursors visible',
        'Conflict resolution works'
      ],
      structure: {
        'client/components/Editor.tsx': 'Collaborative editor',
        'server/ws/collaboration.ts': 'WebSocket handler',
        'shared/operations.ts': 'OT operations'
      },
      requiredServices: ['websocket'],
      agentSequence: ['Orchestrator', 'Code Agent', 'Network Agent'],
      checkpoints: [
        { phase: 'sync', description: 'Basic sync working' },
        { phase: 'presence', description: 'User presence shown' },
        { phase: 'cursors', description: 'Cursor tracking active' },
        { phase: 'conflicts', description: 'Conflict handling complete' }
      ]
    }
  ],

  getByCategory(categoryId) {
    return this.templates.filter(t => t.category === categoryId);
  },

  getByComplexity(level) {
    return this.templates.filter(t => t.complexity === level);
  },

  getByTag(tag) {
    return this.templates.filter(t => t.tags.includes(tag));
  },

  search(query) {
    const q = query.toLowerCase();
    return this.templates.filter(t => 
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.includes(q))
    );
  },

  getTemplate(id) {
    return this.templates.find(t => t.id === id);
  },

  async selectTemplate(id) {
    const template = this.getTemplate(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    return {
      template,
      startProject: () => this.initializeProject(template),
      getAgentPlan: () => this.generateAgentPlan(template),
      getChecklist: () => template.completionCriteria
    };
  },

  async initializeProject(template) {
    const project = {
      id: `project_${Date.now()}`,
      templateId: template.id,
      name: template.name,
      status: 'initializing',
      currentPhase: 0,
      startedAt: Date.now(),
      checkpoints: template.checkpoints.map((cp, i) => ({
        ...cp,
        index: i,
        completed: false,
        completedAt: null
      }))
    };

    try {
      if (typeof puter !== 'undefined' && puter.kv) {
        await puter.kv.set(`project:${project.id}`, JSON.stringify(project));
      }
    } catch (e) {
      console.warn('Failed to save project:', e);
    }

    return project;
  },

  generateAgentPlan(template) {
    return {
      agents: template.agentSequence,
      phases: template.checkpoints,
      estimatedTime: template.estimatedTime,
      criticalPath: template.checkpoints.map((cp, i) => ({
        phase: i + 1,
        name: cp.phase,
        description: cp.description,
        agent: template.agentSequence[Math.min(i, template.agentSequence.length - 1)]
      }))
    };
  },

  getRecommended(context = {}) {
    const { userSkill, projectType, timeAvailable } = context;
    
    let filtered = [...this.templates];

    if (userSkill === 'beginner') {
      filtered = filtered.filter(t => t.complexity === 'easy');
    } else if (userSkill === 'intermediate') {
      filtered = filtered.filter(t => t.complexity !== 'advanced');
    }

    if (projectType) {
      const categoryMatch = filtered.filter(t => t.category === projectType);
      if (categoryMatch.length > 0) {
        filtered = categoryMatch;
      }
    }

    if (timeAvailable) {
      const maxMinutes = parseInt(timeAvailable);
      filtered = filtered.filter(t => {
        const [min] = t.estimatedTime.split('-').map(s => parseInt(s));
        return min <= maxMinutes;
      });
    }

    return filtered.slice(0, 5);
  },

  getAllTags() {
    const tags = new Set();
    this.templates.forEach(t => t.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  },

  getComplexityLevels() {
    return ['easy', 'medium', 'advanced'];
  }
};

window.WorkflowTemplates = WorkflowTemplates;
export { WorkflowTemplates };
