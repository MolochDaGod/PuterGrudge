class GrudChatService {
  constructor(options = {}) {
    this.channels = new Map();
    this.messages = new Map();
    this.subscribers = new Map();
    this.userId = options.userId || 'user_' + Date.now();
    this.userName = options.userName || 'User';
    this.useStreamChat = false;
    this.streamClient = null;
    this.puterReady = false;
    
    this.init();
  }
  
  async init() {
    // Use unified PuterService if available
    if (typeof window !== 'undefined' && window.PuterService) {
      await window.PuterService.init();
      this.puterReady = window.PuterService.isOnline();
      console.log('[GrudChat] Using PuterService, online:', this.puterReady);
    } else if (typeof puter !== 'undefined') {
      try {
        await puter.kv.get('grudchat_test');
        this.puterReady = true;
        console.log('[GrudChat] Puter KV storage ready');
      } catch (e) {
        console.log('[GrudChat] Puter KV not available, using local storage');
      }
    }
    
    await this.loadChannels();
  }
  
  // Use PuterService wrapper methods when available (handles offline fallback internally)
  async _kvGet(key, defaultValue = null) {
    if (window.PuterService?.ready) {
      // PuterService handles localStorage fallback when offline
      return window.PuterService.kvGet(key, defaultValue);
    }
    // Direct localStorage fallback if PuterService not available
    return this._localGet(key, defaultValue);
  }
  
  async _kvSet(key, value) {
    if (window.PuterService?.ready) {
      // PuterService handles localStorage fallback when offline
      return window.PuterService.kvSet(key, value);
    }
    // Direct localStorage fallback if PuterService not available
    return this._localSet(key, value);
  }
  
  // Local storage fallback methods
  _localGet(key, defaultValue) {
    try {
      const val = localStorage.getItem(`puter_kv_${key}`);
      if (!val) return defaultValue;
      try { return JSON.parse(val); } catch { return val; }
    } catch { return defaultValue; }
  }
  
  _localSet(key, value) {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(`puter_kv_${key}`, serialized);
      return true;
    } catch { return false; }
  }
  
  async loadChannels() {
    try {
      const channelList = await this._kvGet('grudchat_channels', []);
      if (channelList && channelList.length > 0) {
        channelList.forEach(ch => this.channels.set(ch.id, ch));
      }
    } catch (e) {
      console.log('[GrudChat] Error loading channels:', e.message);
    }
    
    if (this.channels.size === 0) {
      this.createChannel('agent-swarm', 'Agent Swarm', 'Main agent communication channel');
      this.createChannel('general', 'General', 'General discussion');
      this.createChannel('ai-tasks', 'AI Tasks', 'AI task results and logs');
    }
  }
  
  createChannel(id, name, description = '') {
    const channel = {
      id,
      name,
      description,
      createdAt: new Date().toISOString(),
      memberCount: 1
    };
    
    this.channels.set(id, channel);
    this.messages.set(id, []);
    this.saveChannels();
    
    return channel;
  }
  
  async saveChannels() {
    try {
      await this._kvSet('grudchat_channels', Array.from(this.channels.values()));
    } catch (e) {
      console.log('[GrudChat] Error saving channels:', e.message);
    }
  }
  
  getChannels() {
    return Array.from(this.channels.values());
  }
  
  getChannel(id) {
    return this.channels.get(id);
  }
  
  async sendMessage(channelId, content, options = {}) {
    const message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      channelId,
      userId: options.userId || this.userId,
      userName: options.userName || this.userName,
      content,
      type: options.type || 'text',
      attachments: options.attachments || [],
      timestamp: new Date().toISOString(),
      isAgent: options.isAgent || false,
      agentId: options.agentId || null
    };
    
    let channelMessages = this.messages.get(channelId);
    if (!channelMessages) {
      channelMessages = [];
      this.messages.set(channelId, channelMessages);
    }
    
    channelMessages.push(message);
    
    if (channelMessages.length > 100) {
      channelMessages.shift();
    }
    
    await this.saveMessages(channelId);
    
    this.notifySubscribers(channelId, message);
    
    return message;
  }
  
  async saveMessages(channelId) {
    try {
      const messages = this.messages.get(channelId) || [];
      await this._kvSet(`grudchat_messages_${channelId}`, messages.slice(-50));
    } catch (e) {
      console.log('[GrudChat] Error saving messages:', e.message);
    }
  }
  
  async loadMessages(channelId) {
    try {
      const messages = await this._kvGet(`grudchat_messages_${channelId}`, []);
      if (messages && messages.length > 0) {
        this.messages.set(channelId, messages);
        return messages;
      }
    } catch (e) {
      console.log('[GrudChat] Error loading messages:', e.message);
    }
    
    return this.messages.get(channelId) || [];
  }
  
  getMessages(channelId, limit = 50) {
    const messages = this.messages.get(channelId) || [];
    return messages.slice(-limit);
  }
  
  subscribe(channelId, callback) {
    let subs = this.subscribers.get(channelId);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(channelId, subs);
    }
    subs.add(callback);
    
    return () => subs.delete(callback);
  }
  
  notifySubscribers(channelId, message) {
    const subs = this.subscribers.get(channelId);
    if (subs) {
      subs.forEach(cb => {
        try {
          cb(message);
        } catch (e) {
          console.log('[GrudChat] Subscriber error:', e.message);
        }
      });
    }
  }
  
  async sendAgentMessage(channelId, agentId, agentName, content) {
    return this.sendMessage(channelId, content, {
      userId: agentId,
      userName: agentName,
      isAgent: true,
      agentId
    });
  }
  
  async sendSystemMessage(channelId, content) {
    return this.sendMessage(channelId, content, {
      userId: 'system',
      userName: 'System',
      type: 'system'
    });
  }
  
  async broadcastToAllChannels(content, options = {}) {
    const results = [];
    for (const [channelId] of this.channels) {
      const msg = await this.sendMessage(channelId, content, options);
      results.push(msg);
    }
    return results;
  }
  
  async deleteChannel(channelId) {
    this.channels.delete(channelId);
    this.messages.delete(channelId);
    this.subscribers.delete(channelId);
    
    if (this.puterReady) {
      try {
        await puter.kv.del(`grudchat_messages_${channelId}`);
      } catch (e) {}
    }
    
    await this.saveChannels();
  }
  
  async clearChannel(channelId) {
    this.messages.set(channelId, []);
    await this.saveMessages(channelId);
  }
  
  setUser(userId, userName) {
    this.userId = userId;
    this.userName = userName;
  }
}

if (typeof window !== 'undefined') {
  window.GrudChatService = GrudChatService;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GrudChatService;
}
