/**
 * GrudgeOS Event Bus - Unified communication layer
 * Handles WebSocket connections, message routing, and inter-window coordination
 */

class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.ws = null;
    this.wsReady = false;
    this.wsQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.broadcastChannel = null;
    
    this.initBroadcastChannel();
  }
  
  initBroadcastChannel() {
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('grudgeos-events');
      this.broadcastChannel.onmessage = (event) => {
        this.handleMessage(event.data, 'broadcast');
      };
    }
  }
  
  connectWebSocket(url = null) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    
    const wsUrl = url || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws/events`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        this.wsReady = true;
        this.reconnectAttempts = 0;
        this.emit('connection', { status: 'connected', source: 'websocket' });
        
        while (this.wsQueue.length > 0) {
          const msg = this.wsQueue.shift();
          this.ws.send(JSON.stringify(msg));
        }
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data, 'websocket');
        } catch (e) {
          console.warn('[EventBus] Failed to parse WS message:', e);
        }
      };
      
      this.ws.onclose = () => {
        this.wsReady = false;
        this.emit('connection', { status: 'disconnected', source: 'websocket' });
        this.attemptReconnect();
      };
      
      this.ws.onerror = (err) => {
        console.warn('[EventBus] WebSocket error:', err);
      };
    } catch (e) {
      console.warn('[EventBus] WebSocket not available, using local events only');
    }
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[EventBus] Max reconnect attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }
  
  handleMessage(data, source) {
    if (!data || !data.topic) return;
    
    const handlers = this.subscribers.get(data.topic) || [];
    handlers.forEach(handler => {
      try {
        handler(data.payload, { topic: data.topic, source, timestamp: data.timestamp || Date.now() });
      } catch (e) {
        console.error('[EventBus] Handler error:', e);
      }
    });
    
    const wildcardHandlers = this.subscribers.get('*') || [];
    wildcardHandlers.forEach(handler => {
      try {
        handler(data.payload, { topic: data.topic, source, timestamp: data.timestamp || Date.now() });
      } catch (e) {
        console.error('[EventBus] Wildcard handler error:', e);
      }
    });
  }
  
  subscribe(topic, handler) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, []);
    }
    this.subscribers.get(topic).push(handler);
    
    return () => this.unsubscribe(topic, handler);
  }
  
  unsubscribe(topic, handler) {
    const handlers = this.subscribers.get(topic);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) handlers.splice(index, 1);
    }
  }
  
  emit(topic, payload, options = {}) {
    const message = {
      topic,
      payload,
      timestamp: Date.now(),
      source: options.source || 'local'
    };
    
    this.handleMessage(message, 'local');
    
    if (options.broadcast !== false && this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    }
    
    if (options.remote !== false && this.ws) {
      if (this.wsReady) {
        this.ws.send(JSON.stringify(message));
      } else {
        this.wsQueue.push(message);
      }
    }
  }
  
  emitLocal(topic, payload) {
    this.emit(topic, payload, { broadcast: false, remote: false });
  }
  
  request(topic, payload, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const responseTopic = `${topic}:response:${requestId}`;
      
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error('Request timeout'));
      }, timeout);
      
      const unsubscribe = this.subscribe(responseTopic, (response) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(response);
      });
      
      this.emit(topic, { ...payload, requestId, responseTopic });
    });
  }
  
  respond(requestTopic, handler) {
    return this.subscribe(requestTopic, async (payload, meta) => {
      if (payload.requestId && payload.responseTopic) {
        try {
          const response = await handler(payload, meta);
          this.emit(payload.responseTopic, response);
        } catch (e) {
          this.emit(payload.responseTopic, { error: e.message });
        }
      }
    });
  }
  
  destroy() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    this.subscribers.clear();
  }
}

const TOPICS = {
  TERMINAL_OUTPUT: 'terminal:output',
  TERMINAL_INPUT: 'terminal:input',
  TERMINAL_CLEAR: 'terminal:clear',
  
  FILE_CREATED: 'file:created',
  FILE_UPDATED: 'file:updated',
  FILE_DELETED: 'file:deleted',
  FILE_LIST: 'file:list',
  
  AI_REQUEST: 'ai:request',
  AI_RESPONSE: 'ai:response',
  AI_STREAM: 'ai:stream',
  AI_ERROR: 'ai:error',
  
  DEPLOY_START: 'deploy:start',
  DEPLOY_PROGRESS: 'deploy:progress',
  DEPLOY_COMPLETE: 'deploy:complete',
  DEPLOY_ERROR: 'deploy:error',
  
  AGENT_STATUS: 'agent:status',
  AGENT_TASK: 'agent:task',
  AGENT_COMPLETE: 'agent:complete',
  
  WINDOW_OPEN: 'window:open',
  WINDOW_CLOSE: 'window:close',
  WINDOW_FOCUS: 'window:focus',
  WINDOW_RESIZE: 'window:resize',
  
  SYSTEM_STATUS: 'system:status',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_NOTIFICATION: 'system:notification'
};

const eventBus = new EventBus();

if (typeof window !== 'undefined') {
  window.grudgeEventBus = eventBus;
  window.GRUDGE_TOPICS = TOPICS;
}

export { eventBus, TOPICS, EventBus };
