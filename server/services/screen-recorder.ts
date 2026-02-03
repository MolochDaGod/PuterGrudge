import type { Request, Response } from 'express';
import { screenRecordingStartSchema, screenRecordingStopSchema } from '@shared/schema';

interface RecordingSession {
  id: string;
  status: 'pending' | 'recording' | 'stopped';
  startTime?: Date;
  endTime?: Date;
  outputPath?: string;
}

const sessions = new Map<string, RecordingSession>();

export class ScreenRecorderService {
  private puppeteer: any = null;
  private PuppeteerScreenRecorder: any = null;
  
  constructor() {
    this.initRecorder();
  }
  
  private async initRecorder() {
    try {
      const puppeteerModule = await import('puppeteer-screen-recorder');
      this.PuppeteerScreenRecorder = puppeteerModule.PuppeteerScreenRecorder;
      console.log('[ScreenRecorder] Service initialized');
    } catch (e) {
      console.log('[ScreenRecorder] Running in lightweight mode (puppeteer not available)');
    }
  }
  
  async startRecording(sessionId: string, url: string): Promise<RecordingSession> {
    const session: RecordingSession = {
      id: sessionId,
      status: 'pending',
      startTime: new Date()
    };
    
    sessions.set(sessionId, session);
    
    if (!this.PuppeteerScreenRecorder) {
      session.status = 'stopped';
      session.outputPath = `[Simulated] Recording of ${url}`;
      return session;
    }
    
    session.status = 'recording';
    return session;
  }
  
  async stopRecording(sessionId: string): Promise<RecordingSession | null> {
    const session = sessions.get(sessionId);
    if (!session) return null;
    
    session.status = 'stopped';
    session.endTime = new Date();
    return session;
  }
  
  getSession(sessionId: string): RecordingSession | null {
    return sessions.get(sessionId) || null;
  }
  
  getAllSessions(): RecordingSession[] {
    return Array.from(sessions.values());
  }
}

export const screenRecorderService = new ScreenRecorderService();

export function registerScreenRecorderRoutes(app: any) {
  app.post('/api/v1/screen-recorder/start', async (req: Request, res: Response) => {
    try {
      const parsed = screenRecordingStartSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Validation error', details: parsed.error.issues });
      }
      const { sessionId, url } = parsed.data;
      const session = await screenRecorderService.startRecording(
        sessionId || `session_${Date.now()}`,
        url
      );
      res.json({ success: true, session });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  
  app.post('/api/v1/screen-recorder/stop', async (req: Request, res: Response) => {
    try {
      const parsed = screenRecordingStopSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: 'Validation error', details: parsed.error.issues });
      }
      const { sessionId } = parsed.data;
      const session = await screenRecorderService.stopRecording(sessionId);
      res.json({ success: true, session });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  
  app.get('/api/v1/screen-recorder/sessions', (_req: Request, res: Response) => {
    res.json({ success: true, sessions: screenRecorderService.getAllSessions() });
  });
}
