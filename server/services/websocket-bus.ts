import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { z } from 'zod';

const eventMessageSchema = z.object({
  topic: z.string(),
  payload: z.any(),
  timestamp: z.number().optional(),
  source: z.string().optional(),
  requestId: z.string().optional(),
  responseTopic: z.string().optional()
});

type EventMessage = z.infer<typeof eventMessageSchema>;

interface Client {
  ws: WebSocket;
  id: string;
  subscriptions: Set<string>;
  lastPing: number;
}

class WebSocketEventBus {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Client> = new Map();
  private topics: Map<string, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  
  initialize(server: Server, path: string = '/ws/events') {
    this.wss = new WebSocketServer({ server, path });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const client: Client = {
        ws,
        id: clientId,
        subscriptions: new Set(),
        lastPing: Date.now()
      };
      
      this.clients.set(clientId, client);
      console.log(`[WSBus] Client connected: ${clientId}`);
      
      this.send(ws, {
        topic: 'connection',
        payload: { status: 'connected', clientId },
        timestamp: Date.now()
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (e) {
          console.warn('[WSBus] Invalid message:', e);
        }
      });
      
      ws.on('close', () => {
        this.removeClient(clientId);
        console.log(`[WSBus] Client disconnected: ${clientId}`);
      });
      
      ws.on('error', (err) => {
        console.error(`[WSBus] Client error: ${clientId}`, err);
        this.removeClient(clientId);
      });
      
      ws.on('pong', () => {
        client.lastPing = Date.now();
      });
    });
    
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000);
    
    console.log(`[WSBus] WebSocket Event Bus initialized on ${path}`);
  }
  
  private handleMessage(client: Client, message: any) {
    const parsed = eventMessageSchema.safeParse(message);
    if (!parsed.success) {
      this.send(client.ws, {
        topic: 'error',
        payload: { error: 'Invalid message format' },
        timestamp: Date.now()
      });
      return;
    }
    
    const { topic, payload, requestId, responseTopic } = parsed.data;
    
    if (topic === 'subscribe') {
      const topics = Array.isArray(payload) ? payload : [payload];
      topics.forEach((t: string) => {
        client.subscriptions.add(t);
        if (!this.topics.has(t)) {
          this.topics.set(t, new Set());
        }
        this.topics.get(t)!.add(client.id);
      });
      return;
    }
    
    if (topic === 'unsubscribe') {
      const topics = Array.isArray(payload) ? payload : [payload];
      topics.forEach((t: string) => {
        client.subscriptions.delete(t);
        this.topics.get(t)?.delete(client.id);
      });
      return;
    }
    
    this.broadcast(topic, payload, client.id);
  }
  
  private removeClient(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.forEach(topic => {
        this.topics.get(topic)?.delete(clientId);
      });
      this.clients.delete(clientId);
    }
  }
  
  private pingClients() {
    const now = Date.now();
    this.clients.forEach((client, id) => {
      if (now - client.lastPing > 60000) {
        console.log(`[WSBus] Client timeout: ${id}`);
        client.ws.terminate();
        this.removeClient(id);
      } else {
        client.ws.ping();
      }
    });
  }
  
  private send(ws: WebSocket, message: EventMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  
  broadcast(topic: string, payload: any, excludeClientId?: string) {
    const message: EventMessage = {
      topic,
      payload,
      timestamp: Date.now(),
      source: 'server'
    };
    
    const subscribers = this.topics.get(topic) || new Set();
    const wildcardSubscribers = this.topics.get('*') || new Set();
    
    const allSubscribers = new Set([...Array.from(subscribers), ...Array.from(wildcardSubscribers)]);
    
    if (allSubscribers.size === 0) {
      this.clients.forEach((client) => {
        if (client.id !== excludeClientId) {
          this.send(client.ws, message);
        }
      });
    } else {
      allSubscribers.forEach(clientId => {
        if (clientId !== excludeClientId) {
          const client = this.clients.get(clientId);
          if (client) {
            this.send(client.ws, message);
          }
        }
      });
    }
  }
  
  emit(topic: string, payload: any) {
    this.broadcast(topic, payload);
  }
  
  getStats() {
    return {
      clients: this.clients.size,
      topics: this.topics.size,
      subscriptions: Array.from(this.topics.entries()).map(([topic, subs]) => ({
        topic,
        subscribers: subs.size
      }))
    };
  }
  
  shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.clients.forEach(client => {
      client.ws.close();
    });
    this.clients.clear();
    this.topics.clear();
    if (this.wss) {
      this.wss.close();
    }
    console.log('[WSBus] Shutdown complete');
  }
}

export const wsEventBus = new WebSocketEventBus();

export function registerWebSocketBus(server: Server) {
  wsEventBus.initialize(server, '/ws/events');
}
