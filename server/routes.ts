import type { Express, Router } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { storage } from "./storage";
import path from "path";
import fs from "fs";
import multer from "multer";
import sharp from "sharp";
import { initializeArena, arenaRouter } from "./arena";
import { registerTerminalUIRoutes } from "./services/terminal-ui";
import { registerScreenRecorderRoutes } from "./services/screen-recorder";
import { registerSandboxedExecutorRoutes } from "./services/sandboxed-executor";
import { registerWebSocketBus } from "./services/websocket-bus";
import authRoutes from "./routes/auth";
import apiHealthRoutes from "./routes/api-health";
import aiEvolutionRoutes from "./routes/ai-evolution";
import { 
  createApiResponse, 
  createApiError, 
  ERROR_CODES,
  insertAgentJobSchema,
  insertExtensionSchema,
  updateExtensionSchema,
  imageConvertRequestSchema,
  model3dConvertRequestSchema,
  artGenerateRequestSchema,
  grudgeOSRequestSchema,
  GrudgeOSAsset
} from "@shared/schema";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Simplified routing - Puter handles auth, we just serve static + arena

  // Create versioned API router
  const v1Router = express.Router();

  // Serve GrudgeOS Desktop as the default webapp
  app.get('/', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'desktop.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('GrudgeOS Desktop not found');
    }
  });

  // Serve API documentation
  app.get('/aboutmyapi.html', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'aboutmyapi.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('API documentation not found');
    }
  });

  app.get('/aboutmyapi.txt', (_req, res) => {
    const txtPath = path.resolve(process.cwd(), 'public', 'aboutmyapi.txt');
    if (fs.existsSync(txtPath)) {
      res.setHeader('Content-Type', 'text/plain');
      res.sendFile(txtPath);
    } else {
      res.status(404).send('API documentation not found');
    }
  });

  // Also serve at /cloudpilot for legacy
  app.get('/cloudpilot', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('CloudPilot app not found');
    }
  });

  // Serve GrudgeOS - Game Development Platform
  // Handle /grudgeos and /grudgeos/ before static middleware to serve desktop.html
  app.get('/grudgeos', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'desktop.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('GrudgeOS Desktop not found');
    }
  });
  
  // Also handle /grudgeos/ with trailing slash explicitly
  app.get('/grudgeos/', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'desktop.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('GrudgeOS Desktop not found');
    }
  });
  
  // Static files for GrudgeOS assets (styles, scripts, images)
  app.use('/grudgeos', express.static(path.resolve(process.cwd(), 'public', 'grudgeos')));
  
  // GrudgeOS AI Studio
  app.get('/grudgeos/ai', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'ai-studio.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('GrudgeOS AI Studio not found');
    }
  });
  
  // GrudgeOS Desktop Environment
  app.get('/grudgeos/desktop', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'desktop.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('GrudgeOS Desktop not found');
    }
  });
  
  // GrudgeOS Games Launcher
  app.get('/grudgeos/games', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'games-launcher.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('Games Launcher not found');
    }
  });
  
  // GrudgeOS Onboarding for new users
  app.get('/grudgeos/welcome', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'onboarding.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('GrudgeOS Onboarding not found');
    }
  });
  
  // GrudgeOS Agent Swarm
  app.get('/grudgeos/agents', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'agent-swarm.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('Agent Swarm not found');
    }
  });
  
  // GrudgeOS Observer Agent
  app.get('/grudgeos/observer', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'observer-agent.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('Observer Agent not found');
    }
  });
  
  // GrudgeOS API Tester
  app.get('/grudgeos/api-tester', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'api-tester.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('API Tester not found');
    }
  });
  
  // GrudgeOS Compute Pods
  app.get('/grudgeos/compute', (_req, res) => {
    const htmlPath = path.resolve(process.cwd(), 'public', 'grudgeos', 'compute-pods.html');
    if (fs.existsSync(htmlPath)) {
      res.sendFile(htmlPath);
    } else {
      res.status(404).send('Compute Pods not found');
    }
  });

  // Serve GrudgeOS assets with correct paths
  app.get('/grudgeos/*', (req, res, next) => {
    const requestedPath = req.path.replace('/grudgeos/', '');
    const filePath = path.resolve(process.cwd(), 'public', 'grudgeos', requestedPath);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      next();
    }
  });

  // ============ AUTHENTICATION & ADMIN API ============
  // Mount authentication routes
  app.use('/api', authRoutes);

  // Mount API health monitoring routes
  app.use('/api/health', apiHealthRoutes);

  // Mount AI Evolution routes
  app.use('/api/ai', aiEvolutionRoutes);

  // ============ CORE API (v1) ============
  
  // API route to get app info
  v1Router.get('/info', (req, res) => {
    res.json(createApiResponse({
      name: 'CloudPilot AI',
      version: '2.0.0',
      description: 'Autonomous AI Cloud Agent with multi-model support',
      environment: process.env.NODE_ENV || 'development'
    }, req.requestId));
  });

  // Legacy non-versioned endpoint
  app.get('/api/info', (_req, res) => {
    res.json({
      name: 'CloudPilot AI',
      version: '2.0.0',
      description: 'Autonomous AI Cloud Agent with multi-model support'
    });
  });

  // AI Chat - Use Puter AI from frontend (free)
  v1Router.post('/ai/chat', async (req, res) => {
    res.json(createApiResponse({ 
      message: 'Use Puter AI from frontend: puter.ai.chat()',
      info: 'Puter provides free AI models including GPT-4o, Claude, Gemini, DeepSeek'
    }, req.requestId));
  });

  // Legacy endpoint
  app.post('/api/ai/chat', async (_req, res) => {
    res.json({ 
      message: 'Use Puter AI from frontend: puter.ai.chat()',
      info: 'Puter provides free AI models including GPT-4o, Claude, Gemini, DeepSeek'
    });
  });

  // CryptoPanic News API
  app.get('/api/crypto/news', async (req, res) => {
    const apiKey = process.env.CRYPTOPANIC_API;
    if (!apiKey) {
      return res.status(500).json({ error: 'CryptoPanic API key not configured' });
    }

    try {
      const { filter = 'hot', currencies } = req.query;
      let url = `https://cryptopanic.com/api/v1/posts/?auth_token=${apiKey}&filter=${filter}&public=true`;
      if (currencies) url += `&currencies=${currencies}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('CryptoPanic API error');
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('CryptoPanic error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generative Art API
  app.post('/api/art/generate', async (req, res) => {
    const apiKey = process.env.GENERATIVE_ART_API;
    if (!apiKey) {
      return res.status(500).json({ error: 'Generative Art API key not configured' });
    }

    const { prompt, style, width = 512, height = 512 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt required' });
    }

    try {
      // Generic image generation API structure - adjust based on actual API
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: style ? `${prompt}, ${style} style` : prompt,
          n: 1,
          size: `${width}x${height}`
        })
      });

      if (!response.ok) {
        const error = await response.text();
        return res.status(response.status).json({ error: 'Art generation failed', details: error });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Art generation error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GBUX Token API endpoint
  app.get('/api/gbux/balance', async (req, res) => {
    const token = process.env.GBUX_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'GBUX token not configured' });
    }

    try {
      // Return token status (actual API calls would go here)
      res.json({ 
        configured: true, 
        message: 'GBUX token is configured and ready for use'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Discord OAuth - Get authorization URL
  app.get('/api/discord/auth-url', (req, res) => {
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    if (!clientSecret) {
      return res.status(500).json({ error: 'Discord not configured' });
    }

    // In a real implementation, you'd also need DISCORD_CLIENT_ID
    res.json({ 
      configured: true,
      message: 'Discord OAuth is configured'
    });
  });

  // Health check with API status (v1)
  v1Router.get('/health', (req, res) => {
    res.json(createApiResponse({
      status: 'healthy',
      services: {
        puterAI: true,
        cryptopanic: !!process.env.CRYPTOPANIC_API,
        generativeArt: !!process.env.GENERATIVE_ART_API,
        gbux: !!process.env.GBUX_TOKEN,
        discord: !!process.env.DISCORD_CLIENT_SECRET
      },
      version: '2.0.0'
    }, req.requestId));
  });

  // Legacy health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      services: {
        puterAI: true,
        cryptopanic: !!process.env.CRYPTOPANIC_API,
        generativeArt: !!process.env.GENERATIVE_ART_API,
        gbux: !!process.env.GBUX_TOKEN,
        discord: !!process.env.DISCORD_CLIENT_SECRET
      },
      timestamp: new Date().toISOString()
    });
  });

  // ============ IMAGE CONVERSION API ============
  app.post('/api/image/convert', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const format = (req.body.format || 'webp') as keyof sharp.FormatEnum;
      const width = req.body.width ? parseInt(req.body.width) : undefined;
      const height = req.body.height ? parseInt(req.body.height) : undefined;
      const quality = req.body.quality ? parseInt(req.body.quality) : 80;

      let pipeline = sharp(req.file.buffer);

      // Resize if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize(width, height, { fit: 'inside' });
      }

      // Convert to target format with quality
      let outputBuffer: Buffer;
      switch (format) {
        case 'webp':
          outputBuffer = await pipeline.webp({ quality }).toBuffer();
          break;
        case 'png':
          outputBuffer = await pipeline.png({ compressionLevel: Math.floor((100 - quality) / 10) }).toBuffer();
          break;
        case 'jpeg':
        case 'jpg':
          outputBuffer = await pipeline.jpeg({ quality }).toBuffer();
          break;
        case 'avif':
          outputBuffer = await pipeline.avif({ quality }).toBuffer();
          break;
        default:
          outputBuffer = await pipeline.webp({ quality }).toBuffer();
      }

      const mimeTypes: Record<string, string> = {
        webp: 'image/webp',
        png: 'image/png',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        avif: 'image/avif'
      };

      res.set('Content-Type', mimeTypes[format] || 'image/webp');
      res.send(outputBuffer);
    } catch (error: any) {
      console.error('Image conversion error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ 3D MODEL CONVERSION API ============
  app.post('/api/3d/convert', upload.single('model'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No 3D model file provided' });
      }

      const format = req.body.format || 'glb';
      const optimize = req.body.optimize || 'none';
      const originalName = req.file.originalname;
      const ext = originalName.split('.').pop()?.toLowerCase();

      // For now, we'll use @gltf-transform for basic GLTF/GLB handling
      // Full OBJ/FBX conversion would require additional libraries
      const { Document, NodeIO } = await import('@gltf-transform/core');
      const { dedup, prune } = await import('@gltf-transform/functions');

      // Only support GLTF/GLB input
      if (ext !== 'gltf' && ext !== 'glb') {
        return res.status(400).json({ 
          error: 'Unsupported input format',
          message: `Input format .${ext} is not supported. Please upload GLTF or GLB files.`,
          supported: ['gltf', 'glb']
        });
      }

      const io = new NodeIO();
      let document: any;
      
      // Read the input file
      if (ext === 'glb') {
        document = await io.readBinary(new Uint8Array(req.file.buffer));
      } else {
        // For GLTF, parse as JSON
        const jsonContent = JSON.parse(req.file.buffer.toString('utf-8'));
        document = await io.readJSON({ json: jsonContent, resources: {} });
      }
      
      // Apply optimizations if requested
      if (optimize === 'optimize') {
        await document.transform(dedup(), prune());
      }

      // Output as requested format
      let outputBuffer: Uint8Array | Buffer;
      if (format === 'glb') {
        outputBuffer = await io.writeBinary(document);
      } else {
        const jsonOutput = await io.writeJSON(document);
        outputBuffer = Buffer.from(JSON.stringify(jsonOutput.json, null, 2));
      }

      const mimeType = format === 'glb' ? 'model/gltf-binary' : 'application/json';
      res.set('Content-Type', mimeType);
      res.set('Content-Disposition', `attachment; filename="model.${format}"`);
      res.send(Buffer.from(outputBuffer));
    } catch (error: any) {
      console.error('3D conversion error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============ AI AGENT SOLVE API ============
  // In-memory job store for agent solve requests
  const agentJobs: Map<string, {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    prompt: string;
    context?: string;
    model?: string;
    result?: string;
    toolsUsed?: string[];
    createdAt: Date;
    completedAt?: Date;
  }> = new Map();

  // Extension registry for agent tools
  const extensionRegistry: Map<string, {
    id: string;
    name: string;
    description: string;
    version: string;
    category: string;
    enabled: boolean;
    config: any;
    execute: string; // JSON-serialized function template
  }> = new Map();

  // Initialize default extensions
  const defaultExtensions = [
    { id: 'deploy_site', name: 'Site Deployer', description: 'Deploy static websites to Puter hosting', version: '1.0.0', category: 'deployment', enabled: true, config: {}, execute: 'puter.hosting.create' },
    { id: 'ai_chat', name: 'AI Chat', description: 'Multi-model AI conversation with GPT, Claude, Gemini', version: '1.0.0', category: 'ai', enabled: true, config: {}, execute: 'puter.ai.chat' },
    { id: 'file_manager', name: 'File Manager', description: 'Cloud file operations (read, write, delete)', version: '1.0.0', category: 'storage', enabled: true, config: {}, execute: 'puter.fs' },
    { id: 'kv_store', name: 'KV Database', description: 'Key-value storage for persistent data', version: '1.0.0', category: 'storage', enabled: true, config: {}, execute: 'puter.kv' },
    { id: 'code_generator', name: 'Code Generator', description: 'AI-powered code generation and refactoring', version: '1.0.0', category: 'ai', enabled: true, config: {}, execute: 'ai_code_gen' },
    { id: 'game_deployer', name: 'Game Deployer', description: 'Deploy multiplayer game servers', version: '1.0.0', category: 'deployment', enabled: true, config: {}, execute: 'deploy_game_server' },
    { id: 'workflow_runner', name: 'Workflow Runner', description: 'Execute automated workflow sequences', version: '1.0.0', category: 'automation', enabled: true, config: {}, execute: 'run_workflow' },
    { id: 'image_processor', name: 'Image Processor', description: 'Convert and optimize images', version: '1.0.0', category: 'tools', enabled: true, config: {}, execute: 'process_image' },
    { id: 'model_optimizer', name: '3D Optimizer', description: 'Optimize GLTF/GLB 3D models', version: '1.0.0', category: 'tools', enabled: true, config: {}, execute: 'optimize_3d' },
    { id: 'memory_manager', name: 'Memory Manager', description: 'Manage AI learning and preferences', version: '1.0.0', category: 'ai', enabled: true, config: {}, execute: 'manage_memory' }
  ];
  
  defaultExtensions.forEach(ext => extensionRegistry.set(ext.id, ext));

  // POST /api/agent/solve - Submit a problem for AI agent to solve
  app.post('/api/agent/solve', async (req, res) => {
    const { prompt, context, model = 'gpt-4o-mini', tools = [] } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    agentJobs.set(jobId, {
      id: jobId,
      status: 'pending',
      prompt,
      context,
      model,
      toolsUsed: [],
      createdAt: new Date()
    });

    // Process asynchronously
    (async () => {
      const job = agentJobs.get(jobId)!;
      job.status = 'processing';
      
      try {
        // Build system prompt with available tools
        const enabledTools = Array.from(extensionRegistry.values())
          .filter(e => e.enabled)
          .map(e => `- ${e.name}: ${e.description}`);
        
        const systemPrompt = `You are an autonomous AI agent for CloudPilot. You help users with cloud management, code development, and deployments.

Available Tools:
${enabledTools.join('\n')}

Context: ${context || 'No additional context provided.'}

Respond with actionable solutions. If tools are needed, specify which ones and how to use them.`;

        const apiKey = process.env.ALE_AI;
        if (apiKey) {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 2000
            })
          });

          if (response.ok) {
            const data = await response.json();
            job.result = data.choices[0]?.message?.content || 'No response generated';
            job.status = 'completed';
          } else {
            throw new Error('AI API request failed');
          }
        } else {
          // Fallback: Generate a structured response without API
          job.result = `Agent Analysis for: "${prompt.substring(0, 100)}..."

Recommended Approach:
1. Analyze the problem requirements
2. Select appropriate tools from the extension registry
3. Execute the solution step by step

Suggested Tools:
${tools.length > 0 ? tools.join(', ') : 'Auto-select based on context'}

Note: For enhanced AI processing, configure OpenAI API (ALE_AI) or use Puter AI from the frontend.`;
          job.status = 'completed';
        }
        
        job.completedAt = new Date();
      } catch (error: any) {
        job.status = 'failed';
        job.result = `Error: ${error.message}`;
        job.completedAt = new Date();
      }
    })();

    res.json({ jobId, status: 'pending', message: 'Job submitted successfully' });
  });

  // GET /api/agent/solve/:id - Get job status
  app.get('/api/agent/solve/:id', (req, res) => {
    const job = agentJobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  });

  // GET /api/agent/jobs - List all jobs
  app.get('/api/agent/jobs', (req, res) => {
    const jobs = Array.from(agentJobs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50);
    res.json(jobs);
  });

  // ============ EXTENSIONS API ============
  // GET /api/extensions - List all extensions
  app.get('/api/extensions', (req, res) => {
    const extensions = Array.from(extensionRegistry.values());
    res.json(extensions);
  });

  // GET /api/extensions/:id - Get specific extension
  app.get('/api/extensions/:id', (req, res) => {
    const ext = extensionRegistry.get(req.params.id);
    if (!ext) {
      return res.status(404).json({ error: 'Extension not found' });
    }
    res.json(ext);
  });

  // POST /api/extensions - Register new extension
  app.post('/api/extensions', (req, res) => {
    const { id, name, description, version, category, config, execute } = req.body;
    
    if (!id || !name || !description) {
      return res.status(400).json({ error: 'id, name, and description are required' });
    }

    const extension = {
      id,
      name,
      description,
      version: version || '1.0.0',
      category: category || 'custom',
      enabled: true,
      config: config || {},
      execute: execute || ''
    };

    extensionRegistry.set(id, extension);
    res.json({ success: true, extension });
  });

  // PATCH /api/extensions/:id - Update extension (enable/disable, config)
  app.patch('/api/extensions/:id', (req, res) => {
    const ext = extensionRegistry.get(req.params.id);
    if (!ext) {
      return res.status(404).json({ error: 'Extension not found' });
    }

    const { enabled, config } = req.body;
    if (typeof enabled === 'boolean') ext.enabled = enabled;
    if (config) ext.config = { ...ext.config, ...config };

    res.json({ success: true, extension: ext });
  });

  // DELETE /api/extensions/:id - Remove extension
  app.delete('/api/extensions/:id', (req, res) => {
    if (!extensionRegistry.has(req.params.id)) {
      return res.status(404).json({ error: 'Extension not found' });
    }
    extensionRegistry.delete(req.params.id);
    res.json({ success: true });
  });

  // ============ DEPLOYMENT API ============
  // In-memory deployment store
  const deployments: Map<string, {
    id: string;
    type: 'site' | 'game' | 'app';
    name: string;
    subdomain: string;
    status: 'pending' | 'deploying' | 'live' | 'failed' | 'stopped';
    url?: string;
    template?: string;
    config: any;
    logs: string[];
    createdAt: Date;
    updatedAt: Date;
  }> = new Map();

  // Game templates for PVP/multiplayer hosting
  const gameTemplates = [
    {
      id: 'websocket-chat',
      name: 'WebSocket Chat Room',
      description: 'Real-time multiplayer chat room with WebSocket support',
      category: 'social',
      files: {
        'index.html': `<!DOCTYPE html>
<html>
<head><title>Multiplayer Chat</title>
<style>
body { font-family: system-ui; max-width: 600px; margin: 40px auto; padding: 20px; background: #0a0a0f; color: #fff; }
#messages { height: 300px; overflow-y: auto; border: 1px solid #333; padding: 10px; margin-bottom: 10px; border-radius: 8px; }
.msg { padding: 8px; margin: 4px 0; background: #1a1a2e; border-radius: 4px; }
input, button { padding: 10px; font-size: 14px; }
input { flex: 1; background: #1a1a2e; border: 1px solid #333; color: #fff; border-radius: 4px; }
button { background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; }
.controls { display: flex; gap: 8px; }
</style>
</head>
<body>
<h2>CloudPilot Multiplayer Chat</h2>
<div id="messages"></div>
<div class="controls">
<input type="text" id="msgInput" placeholder="Type message...">
<button onclick="sendMsg()">Send</button>
</div>
<script>
const msgs = document.getElementById('messages');
const input = document.getElementById('msgInput');
const users = new Map();
let myId = 'user_' + Math.random().toString(36).substr(2,6);

function addMsg(user, text) {
  msgs.innerHTML += '<div class="msg"><b>' + user + ':</b> ' + text + '</div>';
  msgs.scrollTop = msgs.scrollHeight;
}

function sendMsg() {
  const text = input.value.trim();
  if (text) {
    addMsg(myId, text);
    // In production, this would use WebSocket/Puter realtime
    input.value = '';
  }
}

input.addEventListener('keypress', e => { if(e.key === 'Enter') sendMsg(); });
addMsg('System', 'Welcome! Your ID: ' + myId);
</script>
</body>
</html>`
      }
    },
    {
      id: 'turn-based-game',
      name: 'Turn-Based Game Arena',
      description: 'Turn-based multiplayer game framework with state sync',
      category: 'game',
      files: {
        'index.html': `<!DOCTYPE html>
<html>
<head><title>PVP Game Arena</title>
<style>
body { font-family: system-ui; background: linear-gradient(135deg, #0a0a0f, #1a1a2e); min-height: 100vh; color: #fff; padding: 20px; }
.arena { display: grid; grid-template-columns: repeat(8, 50px); gap: 2px; margin: 20px auto; width: fit-content; }
.cell { width: 50px; height: 50px; background: #2a2a3e; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 24px; cursor: pointer; transition: all 0.2s; }
.cell:hover { background: #3a3a5e; transform: scale(1.05); }
.cell.p1 { background: #ef4444; }
.cell.p2 { background: #3b82f6; }
.status { text-align: center; font-size: 18px; margin: 20px; }
h1 { text-align: center; color: #6366f1; }
</style>
</head>
<body>
<h1>CloudPilot PVP Arena</h1>
<div class="status">Player 1's Turn (Red)</div>
<div class="arena" id="arena"></div>
<script>
let currentPlayer = 1;
let board = Array(64).fill(0);

function render() {
  const arena = document.getElementById('arena');
  arena.innerHTML = '';
  for(let i = 0; i < 64; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (board[i] ? ' p' + board[i] : '');
    cell.textContent = board[i] ? (board[i] === 1 ? '⚔️' : '🛡️') : '';
    cell.onclick = () => makeMove(i);
    arena.appendChild(cell);
  }
}

function makeMove(i) {
  if(board[i] === 0) {
    board[i] = currentPlayer;
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    document.querySelector('.status').textContent = 'Player ' + currentPlayer + "'s Turn (" + (currentPlayer === 1 ? 'Red' : 'Blue') + ')';
    render();
  }
}

render();
</script>
</body>
</html>`
      }
    },
    {
      id: 'realtime-canvas',
      name: 'Collaborative Canvas',
      description: 'Real-time collaborative drawing canvas for multiple users',
      category: 'creative',
      files: {
        'index.html': `<!DOCTYPE html>
<html>
<head><title>Collaborative Canvas</title>
<style>
body { margin: 0; background: #0a0a0f; display: flex; flex-direction: column; align-items: center; padding: 20px; }
h1 { color: #6366f1; font-family: system-ui; }
canvas { border: 2px solid #333; border-radius: 8px; cursor: crosshair; }
.tools { margin: 10px; display: flex; gap: 10px; }
.tools button { padding: 10px 20px; background: #1a1a2e; color: white; border: 1px solid #333; border-radius: 4px; cursor: pointer; }
.tools button:hover { background: #2a2a3e; }
.tools input[type="color"] { width: 50px; height: 35px; border: none; cursor: pointer; }
</style>
</head>
<body>
<h1>CloudPilot Collaborative Canvas</h1>
<div class="tools">
<input type="color" id="color" value="#6366f1">
<button onclick="clearCanvas()">Clear</button>
<button onclick="saveCanvas()">Save</button>
</div>
<canvas id="canvas" width="800" height="500"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let drawing = false;
let lastX = 0, lastY = 0;

ctx.fillStyle = '#1a1a2e';
ctx.fillRect(0, 0, 800, 500);
ctx.strokeStyle = '#6366f1';
ctx.lineWidth = 3;
ctx.lineCap = 'round';

canvas.addEventListener('mousedown', e => { drawing = true; [lastX, lastY] = [e.offsetX, e.offsetY]; });
canvas.addEventListener('mouseup', () => drawing = false);
canvas.addEventListener('mouseout', () => drawing = false);
canvas.addEventListener('mousemove', e => {
  if(!drawing) return;
  ctx.strokeStyle = document.getElementById('color').value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
  [lastX, lastY] = [e.offsetX, e.offsetY];
});

function clearCanvas() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 800, 500);
}

function saveCanvas() {
  const link = document.createElement('a');
  link.download = 'canvas.png';
  link.href = canvas.toDataURL();
  link.click();
}
</script>
</body>
</html>`
      }
    },
    {
      id: 'leaderboard-app',
      name: 'Gaming Leaderboard',
      description: 'Persistent leaderboard system with Puter KV storage',
      category: 'game',
      files: {
        'index.html': `<!DOCTYPE html>
<html>
<head><title>Gaming Leaderboard</title>
<script src="https://js.puter.com/v2/"></script>
<style>
body { font-family: system-ui; background: linear-gradient(135deg, #0a0a0f, #1a1a2e); min-height: 100vh; color: #fff; padding: 40px; }
.container { max-width: 500px; margin: 0 auto; }
h1 { text-align: center; color: #f59e0b; }
.leaderboard { background: #1a1a2e; border-radius: 12px; padding: 20px; }
.entry { display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #333; }
.entry:last-child { border: none; }
.rank { color: #f59e0b; font-weight: bold; width: 30px; }
.name { flex: 1; }
.score { color: #22c55e; font-weight: bold; }
.add-score { margin-top: 20px; display: flex; gap: 10px; }
input { flex: 1; padding: 10px; background: #0a0a0f; border: 1px solid #333; color: white; border-radius: 4px; }
button { padding: 10px 20px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; }
</style>
</head>
<body>
<div class="container">
<h1>🏆 Leaderboard</h1>
<div class="leaderboard" id="board">Loading...</div>
<div class="add-score">
<input type="text" id="name" placeholder="Your name">
<input type="number" id="score" placeholder="Score">
<button onclick="addScore()">Submit</button>
</div>
</div>
<script>
async function loadBoard() {
  try {
    const data = await puter.kv.get('leaderboard') || '[]';
    const scores = JSON.parse(data);
    const board = document.getElementById('board');
    if(scores.length === 0) {
      board.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">No scores yet. Be the first!</div>';
      return;
    }
    board.innerHTML = scores.sort((a,b) => b.score - a.score).slice(0,10).map((s,i) => 
      '<div class="entry"><span class="rank">#' + (i+1) + '</span><span class="name">' + s.name + '</span><span class="score">' + s.score + '</span></div>'
    ).join('');
  } catch(e) {
    document.getElementById('board').innerHTML = '<div style="color:#f87171;">Sign in with Puter to view leaderboard</div>';
  }
}

async function addScore() {
  const name = document.getElementById('name').value.trim();
  const score = parseInt(document.getElementById('score').value);
  if(!name || !score) return alert('Enter name and score');
  try {
    const data = await puter.kv.get('leaderboard') || '[]';
    const scores = JSON.parse(data);
    scores.push({ name, score, date: new Date().toISOString() });
    await puter.kv.set('leaderboard', JSON.stringify(scores));
    loadBoard();
    document.getElementById('name').value = '';
    document.getElementById('score').value = '';
  } catch(e) { alert('Sign in with Puter first'); }
}

loadBoard();
</script>
</body>
</html>`
      }
    }
  ];

  // GET /api/deploy/templates - Get available game templates
  app.get('/api/deploy/templates', (req, res) => {
    res.json(gameTemplates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category
    })));
  });

  // GET /api/deploy/templates/:id - Get template details with files
  app.get('/api/deploy/templates/:id', (req, res) => {
    const template = gameTemplates.find(t => t.id === req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  });

  // POST /api/deploy/site - Deploy a static site
  app.post('/api/deploy/site', (req, res) => {
    const { name, subdomain, files, sourcePath } = req.body;
    
    if (!name || !subdomain) {
      return res.status(400).json({ error: 'name and subdomain are required' });
    }

    const deployId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const deployment = {
      id: deployId,
      type: 'site' as const,
      name,
      subdomain,
      status: 'pending' as const,
      config: { files, sourcePath },
      logs: [`[${new Date().toISOString()}] Deployment job created`],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    deployments.set(deployId, deployment);

    // Simulate deployment process
    setTimeout(() => {
      const dep = deployments.get(deployId);
      if (dep) {
        dep.status = 'deploying';
        dep.logs.push(`[${new Date().toISOString()}] Preparing files...`);
        dep.updatedAt = new Date();
      }
    }, 500);

    setTimeout(() => {
      const dep = deployments.get(deployId);
      if (dep) {
        dep.status = 'live';
        dep.url = `https://${subdomain}.puter.site`;
        dep.logs.push(`[${new Date().toISOString()}] Deployed successfully to ${dep.url}`);
        dep.updatedAt = new Date();
      }
    }, 2000);

    res.json({ 
      deployId, 
      status: 'pending',
      message: 'Deployment initiated. Use puter.hosting.create() from frontend for live deployment.',
      instructions: `
To deploy from frontend:
1. Create directory: await puter.fs.mkdir('${subdomain}')
2. Write files: await puter.fs.write('${subdomain}/index.html', content)
3. Deploy: await puter.hosting.create('${subdomain}', '${subdomain}')
4. Site live at: https://${subdomain}.puter.site`
    });
  });

  // POST /api/deploy/game - Deploy a game server from template
  app.post('/api/deploy/game', (req, res) => {
    const { templateId, name, subdomain, customConfig } = req.body;
    
    const template = gameTemplates.find(t => t.id === templateId);
    if (!template) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    if (!name || !subdomain) {
      return res.status(400).json({ error: 'name and subdomain are required' });
    }

    const deployId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const deployment = {
      id: deployId,
      type: 'game' as const,
      name,
      subdomain,
      status: 'pending' as const,
      template: templateId,
      config: { ...template, customConfig },
      logs: [
        `[${new Date().toISOString()}] Game deployment initiated`,
        `[${new Date().toISOString()}] Template: ${template.name}`
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    deployments.set(deployId, deployment);

    res.json({
      deployId,
      status: 'pending',
      template: template.name,
      message: 'Game deployment prepared. Execute from frontend to go live.',
      files: template.files,
      deployScript: `
// Execute this in CloudPilot to deploy:
async function deployGame() {
  const dir = '${subdomain}';
  await puter.fs.mkdir(dir);
  ${Object.entries(template.files).map(([filename, content]) => 
    `await puter.fs.write(dir + '/${filename}', \`${(content as string).replace(/`/g, '\\`').substring(0, 100)}...\`);`
  ).join('\n  ')}
  const site = await puter.hosting.create('${subdomain}', dir);
  console.log('Game live at:', site.subdomain + '.puter.site');
}
deployGame();`
    });
  });

  // GET /api/deploy/list - List all deployments
  app.get('/api/deploy/list', (req, res) => {
    const deps = Array.from(deployments.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    res.json(deps);
  });

  // GET /api/deploy/:id - Get deployment status
  app.get('/api/deploy/:id', (req, res) => {
    const dep = deployments.get(req.params.id);
    if (!dep) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    res.json(dep);
  });

  // PATCH /api/deploy/:id - Update deployment (stop/restart)
  app.patch('/api/deploy/:id', (req, res) => {
    const dep = deployments.get(req.params.id);
    if (!dep) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const { action } = req.body;
    if (action === 'stop') {
      dep.status = 'stopped';
      dep.logs.push(`[${new Date().toISOString()}] Deployment stopped`);
    } else if (action === 'restart') {
      dep.status = 'live';
      dep.logs.push(`[${new Date().toISOString()}] Deployment restarted`);
    }
    dep.updatedAt = new Date();

    res.json(dep);
  });

  // DELETE /api/deploy/:id - Delete deployment
  app.delete('/api/deploy/:id', (req, res) => {
    if (!deployments.has(req.params.id)) {
      return res.status(404).json({ error: 'Deployment not found' });
    }
    deployments.delete(req.params.id);
    res.json({ success: true });
  });

  // ============ GRUDACHAIN ACCOUNT API ============
  const grudaAccounts: Map<string, {
    id: string;
    puterUsername: string;
    chainId: string;
    walletAddress?: string;
    capabilities: string[];
    linkedAt: Date;
    lastSync: Date;
  }> = new Map();

  // POST /api/accounts/gruda - Link GRUDACHAIN account
  app.post('/api/accounts/gruda', (req, res) => {
    const { puterUsername, chainId, walletAddress, capabilities } = req.body;
    
    if (!puterUsername || !chainId) {
      return res.status(400).json({ error: 'puterUsername and chainId are required' });
    }

    const accountId = `gruda_${Date.now()}`;
    const account = {
      id: accountId,
      puterUsername,
      chainId,
      walletAddress,
      capabilities: capabilities || ['deploy', 'ai', 'storage'],
      linkedAt: new Date(),
      lastSync: new Date()
    };

    grudaAccounts.set(puterUsername, account);
    res.json({ success: true, account });
  });

  // GET /api/accounts/gruda/:username - Get account info
  app.get('/api/accounts/gruda/:username', (req, res) => {
    const account = grudaAccounts.get(req.params.username);
    if (!account) {
      return res.status(404).json({ error: 'Account not linked', linked: false });
    }
    res.json(account);
  });

  // POST /api/accounts/gruda/:username/sync - Sync capabilities
  app.post('/api/accounts/gruda/:username/sync', (req, res) => {
    const account = grudaAccounts.get(req.params.username);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const { capabilities } = req.body;
    if (capabilities) {
      account.capabilities = capabilities;
    }
    account.lastSync = new Date();

    res.json({ success: true, account });
  });

  // ============ TERMINAL COMMAND API (Sandboxed) ============
  app.post('/api/terminal/exec', async (req, res) => {
    const { command, type = 'bash' } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: 'Command required' });
    }

    // Only allow safe, sandboxed commands
    const safeCommands = ['echo', 'date', 'whoami', 'pwd', 'node', 'python3'];
    const baseCmd = command.split(' ')[0];
    
    if (!safeCommands.includes(baseCmd)) {
      return res.json({ 
        output: `Command '${baseCmd}' is not available in sandboxed mode.`,
        error: true 
      });
    }

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const { stdout, stderr } = await execAsync(command, { timeout: 5000 });
      res.json({ output: stdout || stderr, error: !!stderr });
    } catch (error: any) {
      res.json({ output: error.message, error: true });
    }
  });

  // ============ GRUDGEOS AI API ============
  
  // Get available GrudgeOS assets catalog
  v1Router.get('/grudgeos/assets', (req, res) => {
    const assetsDir = path.resolve(process.cwd(), 'public', 'grudgeos');
    const assets: GrudgeOSAsset[] = [];
    
    // Scan maps
    const mapsDir = path.join(assetsDir, 'maps');
    if (fs.existsSync(mapsDir)) {
      fs.readdirSync(mapsDir).forEach(mapName => {
        const mapPath = path.join(mapsDir, mapName);
        if (fs.statSync(mapPath).isDirectory()) {
          assets.push({
            id: `map_${mapName}`,
            name: mapName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            path: `/grudgeos/maps/${mapName}/scene.gltf`,
            type: 'map',
            category: 'environment',
            tags: ['3d', 'scene', mapName],
          });
        }
      });
    }
    
    // Scan models
    const modelsDir = path.join(assetsDir, 'models');
    if (fs.existsSync(modelsDir)) {
      const scanModels = (dir: string, category: string) => {
        fs.readdirSync(dir).forEach(item => {
          const itemPath = path.join(dir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            scanModels(itemPath, item);
          } else if (item.endsWith('.glb') || item.endsWith('.gltf')) {
            const name = item.replace(/\.(glb|gltf)$/, '').replace(/_/g, ' ');
            assets.push({
              id: `model_${category}_${name}`.toLowerCase().replace(/\s/g, '_'),
              name,
              path: `/grudgeos/models/${category}/${item}`,
              type: 'model',
              category,
              tags: ['3d', 'model', category],
            });
          }
        });
      };
      scanModels(modelsDir, 'general');
    }
    
    // Scan textures
    const texturesDir = path.join(assetsDir, 'textures');
    if (fs.existsSync(texturesDir)) {
      fs.readdirSync(texturesDir).forEach(tex => {
        if (tex.match(/\.(jpg|png|jpeg)$/i)) {
          const name = tex.replace(/\.\w+$/, '').replace(/_/g, ' ');
          assets.push({
            id: `texture_${name}`.toLowerCase().replace(/\s/g, '_'),
            name,
            path: `/grudgeos/textures/${tex}`,
            type: 'texture',
            category: 'material',
            tags: ['texture', 'material'],
          });
        }
      });
    }
    
    // Scan sounds
    const soundsDir = path.join(assetsDir, 'sounds');
    if (fs.existsSync(soundsDir)) {
      fs.readdirSync(soundsDir).forEach(sound => {
        if (sound.match(/\.(mp3|wav|ogg)$/i)) {
          const name = sound.replace(/\.\w+$/, '').replace(/_/g, ' ');
          assets.push({
            id: `sound_${name}`.toLowerCase().replace(/\s/g, '_'),
            name,
            path: `/grudgeos/sounds/${sound}`,
            type: 'sound',
            category: 'audio',
            tags: ['sound', 'audio'],
          });
        }
      });
    }
    
    res.json(createApiResponse({ assets, count: assets.length }, req.requestId));
  });
  
  // GrudgeOS AI task processing info (actual AI calls happen on frontend via Puter)
  v1Router.post('/grudgeos/ai', (req, res) => {
    const result = grudgeOSRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(createApiError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid GrudgeOS request',
        result.error.format(),
        req.requestId
      ));
    }
    
    // Return AI system prompts for frontend to use with Puter AI
    const { task, prompt, context } = result.data;
    const systemPrompts: Record<string, string> = {
      generate_game: `You are GrudgeOS, an expert game developer AI. Generate complete, working game code based on the user's request. Use JavaScript/TypeScript with Three.js for 3D games. Include all necessary code: scene setup, game loop, player controls, physics, and game logic. The code should be ready to run.`,
      generate_scene: `You are GrudgeOS scene builder. Generate Three.js scene code with proper lighting, camera, and environment. Use available assets from /grudgeos/maps/ and /grudgeos/models/. Return complete, runnable code.`,
      generate_code: `You are GrudgeOS code generator. Write clean, efficient game development code. Use modern JavaScript/TypeScript patterns. Include comments explaining key logic. Return only code, no explanations unless asked.`,
      fix_code: `You are GrudgeOS debugger. Analyze the provided code, identify bugs and issues, and return the fixed version. Explain what was wrong briefly.`,
      add_feature: `You are GrudgeOS feature engineer. Add the requested feature to the existing code. Maintain code style and integrate seamlessly. Return the complete updated code.`,
      explain_code: `You are GrudgeOS teacher. Explain the provided code in simple terms. Break down complex logic, explain game development concepts, and suggest improvements.`,
      suggest_assets: `You are GrudgeOS asset advisor. Based on the game description, suggest appropriate assets from the GrudgeOS library. Available categories: maps (highway, crime_city, la_gang), models (rpg items, vehicles, characters), textures (grass, asphalt, wood, etc.), sounds (background, hit, success).`,
      optimize_code: `You are GrudgeOS optimizer. Analyze the code for performance issues. Suggest and implement optimizations for better frame rate, memory usage, and load times.`,
      generate_npc: `You are GrudgeOS NPC designer. Generate NPC behavior code including AI pathfinding, dialog systems, state machines, and interaction logic. Use provided context for game type.`,
      generate_quest: `You are GrudgeOS quest designer. Create quest/mission systems with objectives, rewards, progress tracking, and narrative. Return both the quest data structure and the implementation code.`,
    };
    
    const systemPrompt = systemPrompts[task] || systemPrompts.generate_code;
    const gameContext = context?.gameType ? `\nGame Type: ${context.gameType}` : '';
    const codeContext = context?.currentCode ? `\n\nExisting Code:\n\`\`\`\n${context.currentCode}\n\`\`\`` : '';
    
    res.json(createApiResponse({
      task,
      systemPrompt: systemPrompt + gameContext,
      userPrompt: prompt + codeContext,
      suggestedModel: task === 'fix_code' || task === 'generate_code' || task === 'optimize_code' 
        ? 'claude-sonnet-4' 
        : 'gpt-4o',
      info: 'Use Puter AI on frontend: puter.ai.chat([{role: "system", content: systemPrompt}, {role: "user", content: userPrompt}], {model: suggestedModel})'
    }, req.requestId));
  });
  
  // Quick one-click game templates
  v1Router.get('/grudgeos/templates', (req, res) => {
    const templates = [
      {
        id: 'fps_shooter',
        name: 'FPS Shooter',
        description: 'First-person shooter with weapons and enemies',
        gameType: 'fps',
        suggestedAssets: ['maps/crime_city', 'models/rpg/Sword.glb'],
        prompt: 'Create a first-person shooter game with WASD movement, mouse look, shooting mechanics, and basic enemy AI.'
      },
      {
        id: 'rpg_adventure',
        name: 'RPG Adventure',
        description: 'Fantasy RPG with quests and inventory',
        gameType: 'rpg',
        suggestedAssets: ['models/rpg/Dragon.glb', 'models/rpg/Castle.glb', 'models/rpg/Sword.glb'],
        prompt: 'Create an RPG game with character stats, inventory system, combat, and quest tracking.'
      },
      {
        id: 'racing_game',
        name: 'Racing Game',
        description: 'Vehicle racing with physics',
        gameType: 'racing',
        suggestedAssets: ['maps/highway', 'models/minecraft_car.glb'],
        prompt: 'Create a racing game with vehicle physics, acceleration, steering, and lap timing.'
      },
      {
        id: 'sandbox_builder',
        name: 'Sandbox Builder',
        description: 'Minecraft-style building game',
        gameType: 'sandbox',
        suggestedAssets: ['textures/block1.jpg', 'textures/grass.png', 'models/terrain_chunk.glb'],
        prompt: 'Create a voxel-based sandbox game with block placement, destruction, and inventory.'
      },
      {
        id: 'platformer_2d',
        name: '2D Platformer',
        description: 'Side-scrolling platformer with jumping',
        gameType: 'platformer',
        suggestedAssets: ['textures/grass.png', 'models/rpg/Slime Enemy.glb'],
        prompt: 'Create a 2D platformer with jumping, platforms, collectibles, and enemies.'
      }
    ];
    
    res.json(createApiResponse({ templates }, req.requestId));
  });

  // ============ INTERNAL API TEST COMMANDS ============
  
  // In-memory cache for testing
  const testCache = new Map<string, { value: any; expires: number }>();
  const testLogs: Array<{ timestamp: string; level: string; message: string; source: string }> = [];
  const testTasks: Map<string, { id: string; status: string; description: string; created: string }> = new Map();
  
  // Ping - basic connectivity test
  v1Router.get('/internal/ping', (req, res) => {
    res.json(createApiResponse({
      pong: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }, req.requestId));
  });
  
  // Create - test object creation
  v1Router.post('/internal/create', (req, res) => {
    const { type, data } = req.body;
    const id = `${type || 'obj'}_${Date.now()}`;
    testCache.set(id, { value: { id, type, data, created: new Date().toISOString() }, expires: Date.now() + 3600000 });
    testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Created ${type}: ${id}`, source: 'internal' });
    res.json(createApiResponse({ id, created: true, type }, req.requestId));
  });
  
  // Render - simulate rendering an asset/component
  v1Router.post('/internal/render', (req, res) => {
    const { template, data } = req.body;
    const rendered = { template: template || 'default', data, renderedAt: new Date().toISOString(), html: `<div data-template="${template}">${JSON.stringify(data)}</div>` };
    testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Rendered template: ${template}`, source: 'render' });
    res.json(createApiResponse({ rendered, success: true }, req.requestId));
  });
  
  // Show - retrieve and display cached item
  v1Router.get('/internal/show/:id', (req, res) => {
    const { id } = req.params;
    const item = testCache.get(id);
    if (item && item.expires > Date.now()) {
      res.json(createApiResponse({ found: true, item: item.value }, req.requestId));
    } else {
      res.json(createApiResponse({ found: false, id }, req.requestId));
    }
  });
  
  // Remove - delete cached item
  v1Router.delete('/internal/remove/:id', (req, res) => {
    const { id } = req.params;
    const existed = testCache.delete(id);
    testLogs.push({ timestamp: new Date().toISOString(), level: 'warn', message: `Removed: ${id}`, source: 'internal' });
    res.json(createApiResponse({ removed: existed, id }, req.requestId));
  });
  
  // Cache - get/set cache operations
  v1Router.get('/internal/cache', (req, res) => {
    const entries: any[] = [];
    testCache.forEach((v, k) => entries.push({ key: k, expires: new Date(v.expires).toISOString() }));
    res.json(createApiResponse({ count: testCache.size, entries }, req.requestId));
  });
  
  v1Router.post('/internal/cache', (req, res) => {
    const { key, value, ttl = 3600 } = req.body;
    testCache.set(key, { value, expires: Date.now() + (ttl * 1000) });
    res.json(createApiResponse({ cached: true, key, expiresIn: ttl }, req.requestId));
  });
  
  v1Router.delete('/internal/cache', (req, res) => {
    const count = testCache.size;
    testCache.clear();
    res.json(createApiResponse({ cleared: true, entriesRemoved: count }, req.requestId));
  });
  
  // Log - internal logging operations
  v1Router.get('/internal/log', (req, res) => {
    const { level, limit = 50 } = req.query;
    let logs = [...testLogs].reverse().slice(0, Number(limit));
    if (level) logs = logs.filter(l => l.level === level);
    res.json(createApiResponse({ logs, total: testLogs.length }, req.requestId));
  });
  
  v1Router.post('/internal/log', (req, res) => {
    const { level = 'info', message, source = 'api' } = req.body;
    const log = { timestamp: new Date().toISOString(), level, message, source };
    testLogs.push(log);
    if (testLogs.length > 1000) testLogs.shift();
    res.json(createApiResponse({ logged: true, log }, req.requestId));
  });
  
  // Save - local save operation
  v1Router.post('/internal/save', (req, res) => {
    const { key, data, namespace = 'default' } = req.body;
    const id = `${namespace}:${key}`;
    testCache.set(id, { value: { data, savedAt: new Date().toISOString(), namespace }, expires: Date.now() + 86400000 });
    testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Saved ${id}`, source: 'save' });
    res.json(createApiResponse({ saved: true, id, namespace }, req.requestId));
  });
  
  // SaveCloud - simulated cloud save with Puter KV hint
  v1Router.post('/internal/savecloud', (req, res) => {
    const { key, data } = req.body;
    testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Cloud save requested: ${key}`, source: 'cloud' });
    res.json(createApiResponse({ 
      saved: true, 
      key,
      cloud: true,
      hint: 'Use puter.kv.set() from frontend for actual cloud persistence'
    }, req.requestId));
  });
  
  // SaveAI - AI memory save operation
  v1Router.post('/internal/saveai', (req, res) => {
    const { context, memory, agentId } = req.body;
    const id = `ai_memory_${agentId || 'default'}_${Date.now()}`;
    testCache.set(id, { value: { context, memory, agentId, learnedAt: new Date().toISOString() }, expires: Date.now() + 604800000 });
    testLogs.push({ timestamp: new Date().toISOString(), level: 'ai', message: `AI memory saved: ${id}`, source: 'ai' });
    res.json(createApiResponse({ saved: true, id, agentId, memoryType: 'context' }, req.requestId));
  });
  
  // Recall - retrieve saved data
  v1Router.get('/internal/recall', (req, res) => {
    const { key, namespace = 'default' } = req.query;
    const id = `${namespace}:${key}`;
    const item = testCache.get(id as string);
    if (item) {
      res.json(createApiResponse({ found: true, data: item.value }, req.requestId));
    } else {
      res.json(createApiResponse({ found: false, key, namespace }, req.requestId));
    }
  });
  
  v1Router.post('/internal/recall', (req, res) => {
    const { pattern, limit = 10 } = req.body;
    const matches: any[] = [];
    testCache.forEach((v, k) => {
      if (!pattern || k.includes(pattern)) {
        matches.push({ key: k, value: v.value });
      }
    });
    res.json(createApiResponse({ matches: matches.slice(0, limit), total: matches.length }, req.requestId));
  });
  
  // Task - task management operations
  v1Router.get('/internal/task', (req, res) => {
    const tasks = Array.from(testTasks.values());
    res.json(createApiResponse({ tasks, count: tasks.length }, req.requestId));
  });
  
  v1Router.post('/internal/task', (req, res) => {
    const { description, priority = 'normal' } = req.body;
    const id = `task_${Date.now()}`;
    const task = { id, status: 'pending', description, priority, created: new Date().toISOString() };
    testTasks.set(id, task);
    testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Task created: ${id}`, source: 'task' });
    res.json(createApiResponse({ created: true, task }, req.requestId));
  });
  
  v1Router.patch('/internal/task/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const task = testTasks.get(id);
    if (task) {
      task.status = status || task.status;
      testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Task ${id} updated to ${status}`, source: 'task' });
      res.json(createApiResponse({ updated: true, task }, req.requestId));
    } else {
      res.json(createApiResponse({ found: false, id }, req.requestId));
    }
  });
  
  v1Router.delete('/internal/task/:id', (req, res) => {
    const { id } = req.params;
    const removed = testTasks.delete(id);
    res.json(createApiResponse({ removed, id }, req.requestId));
  });
  
  // Status - overall internal API status
  v1Router.get('/internal/status', (req, res) => {
    res.json(createApiResponse({
      status: 'operational',
      cache: { entries: testCache.size },
      logs: { count: testLogs.length },
      tasks: { count: testTasks.size, pending: Array.from(testTasks.values()).filter(t => t.status === 'pending').length },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }, req.requestId));
  });

  // ============ COMPUTE PODS / MICRO CONTAINERS ============
  
  interface ComputePod {
    id: string;
    name: string;
    status: 'idle' | 'warming' | 'busy' | 'cooling' | 'terminated';
    runtime: 'node' | 'wasm' | 'deno' | 'browser';
    currentJob?: string;
    stats: { jobsCompleted: number; jobsFailed: number; totalCpuMs: number; uptime: number };
    createdAt: string;
    lastActiveAt?: string;
  }
  
  interface Job {
    id: string;
    type: string;
    runtime: string;
    status: 'pending' | 'queued' | 'running' | 'completed' | 'failed';
    input: any;
    output?: any;
    error?: string;
    logs: string[];
    podId?: string;
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
  }
  
  const computePods: Map<string, ComputePod> = new Map();
  const jobQueue: Map<string, Job> = new Map();
  
  const defaultPods: ComputePod[] = [
    { id: 'pod-node-1', name: 'Node Runner', status: 'idle', runtime: 'node', stats: { jobsCompleted: 0, jobsFailed: 0, totalCpuMs: 0, uptime: 0 }, createdAt: new Date().toISOString() },
    { id: 'pod-wasm-1', name: 'WASM Sandbox', status: 'idle', runtime: 'wasm', stats: { jobsCompleted: 0, jobsFailed: 0, totalCpuMs: 0, uptime: 0 }, createdAt: new Date().toISOString() },
    { id: 'pod-browser-1', name: 'Browser VM', status: 'idle', runtime: 'browser', stats: { jobsCompleted: 0, jobsFailed: 0, totalCpuMs: 0, uptime: 0 }, createdAt: new Date().toISOString() },
  ];
  defaultPods.forEach(p => computePods.set(p.id, p));
  
  v1Router.get('/compute/pods', (req, res) => {
    const pods = Array.from(computePods.values());
    res.json(createApiResponse({ pods, count: pods.length }, req.requestId));
  });
  
  v1Router.get('/compute/pods/:id', (req, res) => {
    const pod = computePods.get(req.params.id);
    if (pod) {
      res.json(createApiResponse({ pod }, req.requestId));
    } else {
      res.status(404).json(createApiResponse({ error: 'Pod not found' }, req.requestId));
    }
  });
  
  v1Router.post('/compute/pods', (req, res) => {
    const { name, runtime = 'node' } = req.body;
    const id = `pod-${runtime}-${Date.now()}`;
    const pod: ComputePod = {
      id, name: name || `${runtime} Pod`, status: 'idle', runtime,
      stats: { jobsCompleted: 0, jobsFailed: 0, totalCpuMs: 0, uptime: 0 },
      createdAt: new Date().toISOString()
    };
    computePods.set(id, pod);
    testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Pod created: ${id}`, source: 'compute' });
    res.json(createApiResponse({ pod, created: true }, req.requestId));
  });
  
  v1Router.delete('/compute/pods/:id', (req, res) => {
    const pod = computePods.get(req.params.id);
    if (pod) {
      pod.status = 'terminated';
      computePods.delete(req.params.id);
      res.json(createApiResponse({ terminated: true, id: req.params.id }, req.requestId));
    } else {
      res.status(404).json(createApiResponse({ error: 'Pod not found' }, req.requestId));
    }
  });
  
  v1Router.get('/compute/jobs', (req, res) => {
    const jobs = Array.from(jobQueue.values());
    res.json(createApiResponse({ jobs, count: jobs.length }, req.requestId));
  });
  
  v1Router.post('/compute/jobs', async (req, res) => {
    const { type = 'code', runtime = 'node', input, priority = 'normal' } = req.body;
    const id = `job-${Date.now()}`;
    
    const job: Job = {
      id, type, runtime, status: 'pending',
      input: input || {},
      logs: [`[${new Date().toISOString()}] Job created`],
      createdAt: new Date().toISOString()
    };
    
    jobQueue.set(id, job);
    
    const availablePod = Array.from(computePods.values()).find(p => p.status === 'idle' && p.runtime === runtime);
    
    if (availablePod) {
      job.status = 'running';
      job.podId = availablePod.id;
      job.startedAt = new Date().toISOString();
      job.logs.push(`[${new Date().toISOString()}] Assigned to pod ${availablePod.name}`);
      
      availablePod.status = 'busy';
      availablePod.currentJob = id;
      availablePod.lastActiveAt = new Date().toISOString();
      
      setTimeout(() => {
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
        job.output = { result: 'Execution complete', echo: input };
        job.logs.push(`[${new Date().toISOString()}] Job completed successfully`);
        
        availablePod.status = 'idle';
        availablePod.currentJob = undefined;
        availablePod.stats.jobsCompleted++;
        availablePod.stats.totalCpuMs += 100;
      }, 1000 + Math.random() * 2000);
    } else {
      job.status = 'queued';
      job.logs.push(`[${new Date().toISOString()}] No available pods, queued`);
    }
    
    testLogs.push({ timestamp: new Date().toISOString(), level: 'info', message: `Job submitted: ${id}`, source: 'compute' });
    res.json(createApiResponse({ job, submitted: true }, req.requestId));
  });
  
  v1Router.get('/compute/jobs/:id', (req, res) => {
    const job = jobQueue.get(req.params.id);
    if (job) {
      res.json(createApiResponse({ job }, req.requestId));
    } else {
      res.status(404).json(createApiResponse({ error: 'Job not found' }, req.requestId));
    }
  });
  
  v1Router.delete('/compute/jobs/:id', (req, res) => {
    const job = jobQueue.get(req.params.id);
    if (job) {
      if (job.status === 'running' && job.podId) {
        const pod = computePods.get(job.podId);
        if (pod) {
          pod.status = 'idle';
          pod.currentJob = undefined;
        }
      }
      job.status = 'failed';
      job.error = 'Cancelled by user';
      res.json(createApiResponse({ cancelled: true, id: req.params.id }, req.requestId));
    } else {
      res.status(404).json(createApiResponse({ error: 'Job not found' }, req.requestId));
    }
  });
  
  v1Router.get('/compute/stats', (req, res) => {
    const pods = Array.from(computePods.values());
    const jobs = Array.from(jobQueue.values());
    res.json(createApiResponse({
      pods: {
        total: pods.length,
        idle: pods.filter(p => p.status === 'idle').length,
        busy: pods.filter(p => p.status === 'busy').length,
      },
      jobs: {
        total: jobs.length,
        pending: jobs.filter(j => j.status === 'pending').length,
        running: jobs.filter(j => j.status === 'running').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
      },
      totalJobsProcessed: pods.reduce((sum, p) => sum + p.stats.jobsCompleted, 0),
    }, req.requestId));
  });

  // ============ MOUNT V1 API ROUTER ============
  app.use('/api/v1', v1Router);

  // ============ TERMINAL UI SERVICE (pm2/blessed) ============
  registerTerminalUIRoutes(app);
  console.log('[TerminalUI] Routes registered');
  
  // ============ SCREEN RECORDER SERVICE ============
  registerScreenRecorderRoutes(app);
  console.log('[ScreenRecorder] Routes registered');

  // ============ SANDBOXED EXECUTOR SERVICE ============
  registerSandboxedExecutorRoutes(app);
  console.log('[SandboxedExecutor] Routes registered');

  // ============ WEBSOCKET EVENT BUS ============
  registerWebSocketBus(httpServer);
  console.log('[WSBus] WebSocket Event Bus registered');

  // ============ ARENA GAME SERVER ============
  try {
    const arenaRoutes = await initializeArena(httpServer);
    app.use('/api/v1/arena', arenaRoutes);
    console.log('[Arena] Game server initialized with WebSocket support');
  } catch (error) {
    console.error('[Arena] Failed to initialize game server:', error);
  }

  return httpServer;
}
