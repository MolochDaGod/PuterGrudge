import type { Request, Response } from 'express';
import { terminalSessionSchema, terminalScreenSchema, terminalWriteSchema } from '@shared/schema';

interface VirtualScreen {
  id: string;
  title: string;
  width: number;
  height: number;
  content: string[][];
  cursorX: number;
  cursorY: number;
  style: {
    fg: string;
    bg: string;
  };
}

interface TerminalSession {
  id: string;
  type: 'blessed' | 'xterm';
  status: 'active' | 'paused' | 'closed';
  screens: Map<string, VirtualScreen>;
  createdAt: Date;
}

const sessions = new Map<string, TerminalSession>();

export class TerminalUIService {
  private blessed: any = null;
  
  constructor() {
    this.initBlessed();
  }
  
  private async initBlessed() {
    try {
      const blessedModule = await import('@pm2/blessed');
      this.blessed = blessedModule.default || blessedModule;
      console.log('[TerminalUI] PM2 Blessed service initialized');
    } catch (e) {
      console.log('[TerminalUI] Running in simulation mode (blessed not in browser)');
    }
  }
  
  createSession(sessionId: string, type: 'blessed' | 'xterm' = 'blessed'): TerminalSession {
    const session: TerminalSession = {
      id: sessionId,
      type,
      status: 'active',
      screens: new Map(),
      createdAt: new Date()
    };
    
    sessions.set(sessionId, session);
    return session;
  }
  
  createVirtualScreen(sessionId: string, screenId: string, options: Partial<VirtualScreen> = {}): VirtualScreen | null {
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    const screen: VirtualScreen = {
      id: screenId,
      title: options.title || 'Virtual Screen',
      width: options.width || 80,
      height: options.height || 24,
      content: Array(options.height || 24).fill(null).map(() => 
        Array(options.width || 80).fill(' ')
      ),
      cursorX: 0,
      cursorY: 0,
      style: options.style || { fg: '#00ff88', bg: '#0a0a12' }
    };
    
    session.screens.set(screenId, screen);
    return screen;
  }
  
  writeToScreen(sessionId: string, screenId: string, text: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;
    
    const screen = session.screens.get(screenId);
    if (!screen) return false;
    
    for (const char of text) {
      if (char === '\n') {
        screen.cursorY++;
        screen.cursorX = 0;
      } else if (char === '\r') {
        screen.cursorX = 0;
      } else {
        if (screen.cursorY < screen.height && screen.cursorX < screen.width) {
          screen.content[screen.cursorY][screen.cursorX] = char;
          screen.cursorX++;
          if (screen.cursorX >= screen.width) {
            screen.cursorX = 0;
            screen.cursorY++;
          }
        }
      }
      
      if (screen.cursorY >= screen.height) {
        screen.content.shift();
        screen.content.push(Array(screen.width).fill(' '));
        screen.cursorY = screen.height - 1;
      }
    }
    
    return true;
  }
  
  getScreenContent(sessionId: string, screenId: string): string | null {
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    const screen = session.screens.get(screenId);
    if (!screen) return null;
    
    return screen.content.map(row => row.join('')).join('\n');
  }
  
  getSession(sessionId: string): TerminalSession | undefined {
    return sessions.get(sessionId);
  }
  
  getAllSessions(): TerminalSession[] {
    return Array.from(sessions.values());
  }
  
  closeSession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;
    
    session.status = 'closed';
    return true;
  }
}

export const terminalUIService = new TerminalUIService();

export function registerTerminalUIRoutes(app: any) {
  app.post('/api/v1/terminal/session', (req: Request, res: Response) => {
    try {
      const parsed = terminalSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Validation error', details: parsed.error.issues });
      }
      const { sessionId, type } = parsed.data;
      const session = terminalUIService.createSession(
        sessionId || `term_${Date.now()}`,
        type
      );
      res.json({ success: true, session: { id: session.id, type: session.type, status: session.status } });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  
  app.post('/api/v1/terminal/screen', (req: Request, res: Response) => {
    try {
      const parsed = terminalScreenSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Validation error', details: parsed.error.issues });
      }
      const { sessionId, screenId, title, width, height } = parsed.data;
      const screen = terminalUIService.createVirtualScreen(sessionId, screenId, { title, width, height });
      if (!screen) {
        return res.status(404).json({ success: false, error: 'Session not found' });
      }
      res.json({ success: true, screen });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  
  app.post('/api/v1/terminal/write', (req: Request, res: Response) => {
    try {
      const parsed = terminalWriteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Validation error', details: parsed.error.issues });
      }
      const { sessionId, screenId, text } = parsed.data;
      const success = terminalUIService.writeToScreen(sessionId, screenId, text);
      res.json({ success });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  
  app.get('/api/v1/terminal/screen/:sessionId/:screenId', (req: Request, res: Response) => {
    try {
      const { sessionId, screenId } = req.params;
      const content = terminalUIService.getScreenContent(sessionId, screenId);
      if (content === null) {
        return res.status(404).json({ success: false, error: 'Screen not found' });
      }
      res.json({ success: true, content });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  
  app.get('/api/v1/terminal/sessions', (_req: Request, res: Response) => {
    const sessions = terminalUIService.getAllSessions().map(s => ({
      id: s.id,
      type: s.type,
      status: s.status,
      screenCount: s.screens.size,
      createdAt: s.createdAt
    }));
    res.json({ success: true, sessions });
  });
}
