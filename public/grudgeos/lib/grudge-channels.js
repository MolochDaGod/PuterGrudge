/**
 * GrudChat - Advanced Communication System
 * Discord-like channels with chat, video, streaming, and camera features
 * Integrated with Puter.js for persistence and AI
 * Based on GrudgeGameZone Discord template structure
 */

class GrudChat {
  constructor() {
    this.namespace = 'grudchat';
    this.channels = new Map();
    this.activeChannel = null;
    this.connections = new Map();
    this.localStream = null;
    this.peerConnections = new Map();
    this.callbacks = {
      onMessage: null,
      onUserJoin: null,
      onUserLeave: null,
      onStreamStart: null,
      onStreamEnd: null
    };
  }

  // ============ CHANNEL TYPES ============
  static TYPES = {
    TEXT: 'text',
    VOICE: 'voice',
    VIDEO: 'video',
    STREAM: 'stream',
    STAGE: 'stage',
    FORUM: 'forum'
  };

  static PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    SPEAK: 'speak',
    VIDEO: 'video',
    STREAM: 'stream',
    MODERATE: 'moderate',
    ADMIN: 'admin'
  };

  // ============ CHANNEL MANAGEMENT ============
  
  async createChannel(config) {
    const channel = {
      id: `ch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      type: config.type || GrudChat.TYPES.TEXT,
      description: config.description || '',
      icon: config.icon || this.getDefaultIcon(config.type),
      color: config.color || '#8b5cf6',
      parent: config.parent || null,
      position: config.position || 0,
      permissions: config.permissions || {},
      settings: {
        slowMode: config.slowMode || 0,
        maxParticipants: config.maxParticipants || 50,
        recordingEnabled: config.recordingEnabled || false,
        aiAssistant: config.aiAssistant || true,
        notifications: config.notifications || 'all'
      },
      members: [],
      messages: [],
      pinnedMessages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.channels.set(channel.id, channel);
    await this.saveChannel(channel);
    
    return channel;
  }

  getDefaultIcon(type) {
    const icons = {
      text: '💬',
      voice: '🎙️',
      video: '📹',
      stream: '📺',
      stage: '🎭',
      forum: '📋'
    };
    return icons[type] || '💬';
  }

  async getChannel(channelId) {
    if (this.channels.has(channelId)) {
      return this.channels.get(channelId);
    }
    
    const channel = await this.loadChannel(channelId);
    if (channel) {
      this.channels.set(channelId, channel);
    }
    return channel;
  }

  async listChannels(parentId = null) {
    const prefix = `${this.namespace}:channel:`;
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      const channels = [];
      
      for (const key of keys) {
        const data = await puter.kv.get(key);
        if (data) {
          const channel = JSON.parse(data);
          if (channel.parent === parentId) {
            channels.push(channel);
          }
        }
      }
      
      return channels.sort((a, b) => a.position - b.position);
    } catch (e) {
      return [];
    }
  }

  async updateChannel(channelId, updates) {
    const channel = await this.getChannel(channelId);
    if (!channel) return null;
    
    Object.assign(channel, updates, { updatedAt: new Date().toISOString() });
    await this.saveChannel(channel);
    return channel;
  }

  async deleteChannel(channelId) {
    const key = `${this.namespace}:channel:${channelId}`;
    await puter.kv.del(key);
    this.channels.delete(channelId);
  }

  // ============ MESSAGING ============

  async sendMessage(channelId, message) {
    const channel = await this.getChannel(channelId);
    if (!channel) throw new Error('Channel not found');

    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channelId,
      content: message.content,
      author: message.author || { id: 'system', name: 'System' },
      type: message.type || 'text',
      attachments: message.attachments || [],
      reactions: [],
      replyTo: message.replyTo || null,
      mentions: this.extractMentions(message.content),
      edited: false,
      pinned: false,
      timestamp: new Date().toISOString()
    };

    // Store message
    const msgKey = `${this.namespace}:messages:${channelId}:${msg.id}`;
    await puter.kv.set(msgKey, JSON.stringify(msg));

    // Trigger callback
    if (this.callbacks.onMessage) {
      this.callbacks.onMessage(msg);
    }

    // AI response if enabled and mentioned
    if (channel.settings.aiAssistant && msg.content.includes('@AI')) {
      this.triggerAIResponse(channel, msg);
    }

    return msg;
  }

  extractMentions(content) {
    const mentions = [];
    const userMentions = content.match(/@(\w+)/g) || [];
    userMentions.forEach(m => mentions.push({ type: 'user', name: m.slice(1) }));
    return mentions;
  }

  async getMessages(channelId, options = {}) {
    const { limit = 50, before = null, after = null } = options;
    const prefix = `${this.namespace}:messages:${channelId}:`;
    
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      const messages = [];
      
      for (const key of keys.slice(-limit)) {
        const data = await puter.kv.get(key);
        if (data) messages.push(JSON.parse(data));
      }
      
      return messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (e) {
      return [];
    }
  }

  async editMessage(channelId, messageId, newContent) {
    const msgKey = `${this.namespace}:messages:${channelId}:${messageId}`;
    const data = await puter.kv.get(msgKey);
    
    if (!data) return null;
    
    const msg = JSON.parse(data);
    msg.content = newContent;
    msg.edited = true;
    msg.editedAt = new Date().toISOString();
    
    await puter.kv.set(msgKey, JSON.stringify(msg));
    return msg;
  }

  async deleteMessage(channelId, messageId) {
    const msgKey = `${this.namespace}:messages:${channelId}:${messageId}`;
    await puter.kv.del(msgKey);
  }

  async addReaction(channelId, messageId, reaction, userId) {
    const msgKey = `${this.namespace}:messages:${channelId}:${messageId}`;
    const data = await puter.kv.get(msgKey);
    
    if (!data) return null;
    
    const msg = JSON.parse(data);
    const existing = msg.reactions.find(r => r.emoji === reaction);
    
    if (existing) {
      if (!existing.users.includes(userId)) {
        existing.users.push(userId);
        existing.count++;
      }
    } else {
      msg.reactions.push({ emoji: reaction, count: 1, users: [userId] });
    }
    
    await puter.kv.set(msgKey, JSON.stringify(msg));
    return msg;
  }

  // ============ VOICE & VIDEO ============

  async joinVoiceChannel(channelId, options = {}) {
    const channel = await this.getChannel(channelId);
    if (!channel) throw new Error('Channel not found');
    if (channel.type !== 'voice' && channel.type !== 'video') {
      throw new Error('Not a voice/video channel');
    }

    try {
      const constraints = {
        audio: true,
        video: options.video || channel.type === 'video'
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add self to channel members
      channel.members.push({
        id: options.userId || 'local',
        name: options.userName || 'You',
        muted: false,
        deafened: false,
        video: constraints.video,
        joinedAt: new Date().toISOString()
      });

      await this.saveChannel(channel);
      this.activeChannel = channelId;

      if (this.callbacks.onUserJoin) {
        this.callbacks.onUserJoin({ channelId, user: channel.members[channel.members.length - 1] });
      }

      return { stream: this.localStream, channel };
    } catch (e) {
      console.error('Failed to join voice channel:', e);
      throw e;
    }
  }

  async leaveVoiceChannel() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    if (this.activeChannel) {
      const channel = await this.getChannel(this.activeChannel);
      if (channel) {
        channel.members = channel.members.filter(m => m.id !== 'local');
        await this.saveChannel(channel);
      }
      
      if (this.callbacks.onUserLeave) {
        this.callbacks.onUserLeave({ channelId: this.activeChannel, userId: 'local' });
      }
    }

    this.activeChannel = null;
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // ============ STREAMING ============

  async startStream(channelId, options = {}) {
    const channel = await this.getChannel(channelId);
    if (!channel) throw new Error('Channel not found');

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: options.audio || true
      });

      const stream = {
        id: `stream_${Date.now()}`,
        channelId,
        streamer: options.userId || 'local',
        title: options.title || 'Live Stream',
        viewers: [],
        startedAt: new Date().toISOString(),
        mediaStream: displayStream
      };

      channel.activeStream = stream.id;
      await this.saveChannel(channel);

      if (this.callbacks.onStreamStart) {
        this.callbacks.onStreamStart(stream);
      }

      // Handle stream end
      displayStream.getVideoTracks()[0].onended = () => {
        this.endStream(channelId);
      };

      return stream;
    } catch (e) {
      console.error('Failed to start stream:', e);
      throw e;
    }
  }

  async endStream(channelId) {
    const channel = await this.getChannel(channelId);
    if (channel && channel.activeStream) {
      const streamId = channel.activeStream;
      channel.activeStream = null;
      await this.saveChannel(channel);

      if (this.callbacks.onStreamEnd) {
        this.callbacks.onStreamEnd({ channelId, streamId });
      }
    }
  }

  // ============ AI INTEGRATION ============

  async triggerAIResponse(channel, userMessage) {
    if (typeof puterAI === 'undefined') return;

    const context = await this.getMessages(channel.id, { limit: 10 });
    const contextStr = context.map(m => `${m.author.name}: ${m.content}`).join('\n');

    const response = await puterAI.chat(
      `You are an AI assistant in a chat channel called "${channel.name}". 
       Recent conversation:\n${contextStr}\n\nUser message: ${userMessage.content.replace('@AI', '').trim()}`,
      { model: 'claude-3-haiku', task: 'quick_chat' }
    );

    if (response.success) {
      await this.sendMessage(channel.id, {
        content: response.content,
        author: { id: 'ai', name: 'AI Assistant', avatar: '🤖' },
        type: 'ai_response'
      });
    }
  }

  // ============ PERSISTENCE ============

  async saveChannel(channel) {
    const key = `${this.namespace}:channel:${channel.id}`;
    const saveData = { ...channel };
    delete saveData.mediaStream; // Don't save media streams
    await puter.kv.set(key, JSON.stringify(saveData));
  }

  async loadChannel(channelId) {
    const key = `${this.namespace}:channel:${channelId}`;
    const data = await puter.kv.get(key);
    return data ? JSON.parse(data) : null;
  }

  // ============ EVENT HANDLERS ============

  on(event, callback) {
    const eventName = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    if (this.callbacks.hasOwnProperty(eventName)) {
      this.callbacks[eventName] = callback;
    }
  }

  off(event) {
    const eventName = `on${event.charAt(0).toUpperCase() + event.slice(1)}`;
    if (this.callbacks.hasOwnProperty(eventName)) {
      this.callbacks[eventName] = null;
    }
  }

  // ============ CHANNEL CATEGORIES ============

  async createCategory(config) {
    return this.createChannel({
      ...config,
      type: 'category',
      icon: config.icon || '📁'
    });
  }

  async getChannelTree() {
    const allChannels = [];
    const prefix = `${this.namespace}:channel:`;
    
    try {
      const keys = await puter.kv.list({ prefix }) || [];
      
      for (const key of keys) {
        const data = await puter.kv.get(key);
        if (data) allChannels.push(JSON.parse(data));
      }
    } catch (e) {}

    // Build tree structure
    const tree = [];
    const categories = allChannels.filter(c => c.type === 'category');
    const channels = allChannels.filter(c => c.type !== 'category');

    // Root level channels
    channels.filter(c => !c.parent).forEach(c => tree.push(c));

    // Categories with their children
    categories.forEach(cat => {
      cat.children = channels.filter(c => c.parent === cat.id);
      tree.push(cat);
    });

    return tree.sort((a, b) => a.position - b.position);
  }

  // ============ QUICK ACCESS ============

  async getDefaultChannels() {
    return this.getTemplateChannels();
  }

  // Discord template-based default channel structure (GrudgeGameZone)
  getTemplateChannels() {
    return {
      categories: [
        {
          id: 'cat-statistics',
          name: 'statistics',
          icon: '📊',
          position: 0,
          readOnly: true,
          channels: [
            { id: 'stat-members', name: '🚀│Members: 0', type: 'stat', icon: '🚀' },
            { id: 'stat-treasure', name: '🔑│Treasure: SOL 0.00', type: 'stat', icon: '🔑' },
            { id: 'stat-website', name: 'grudgestudio.com', type: 'stat', icon: '🌐' }
          ]
        },
        {
          id: 'cat-readonly',
          name: 'READ-ONLY',
          icon: '📋',
          position: 1,
          readOnly: true,
          channels: [
            { id: 'announcements', name: '📢│announcements', type: 'text', icon: '📢', readOnly: true },
            { id: 'roadmap', name: '🌍│roadmap', type: 'text', icon: '🌍', readOnly: true },
            { id: 'the-team', name: '👋🏼│the-team', type: 'text', icon: '👋🏼', readOnly: true },
            { id: 'whitepaper', name: '📃│whitepaper', type: 'text', icon: '📃', readOnly: true }
          ]
        },
        {
          id: 'cat-public',
          name: 'Public channels',
          icon: '💬',
          position: 2,
          channels: [
            { id: 'welcome', name: '👋│welcome', type: 'text', icon: '👋', color: '#8b5cf6' },
            { id: 'general', name: '💬│general', type: 'text', icon: '💬', color: '#8b5cf6' },
            { id: 'dev-sos', name: 'dev-sos', type: 'text', icon: '🆘', color: '#ff6b35' },
            { id: 'lore-masters', name: 'lore-masters', type: 'text', icon: '📖', color: '#00ff88' },
            { id: 'dev-assignments', name: 'dev-assignments', type: 'text', icon: '📋', color: '#00f5ff' },
            { id: 'dev-info', name: 'dev-info', type: 'text', icon: 'ℹ️', color: '#00f5ff' },
            { id: 'devs-idea-votes', name: 'devs-idea-votes', type: 'text', icon: '💡', color: '#ff00aa' },
            { id: 'ai-chat', name: 'ai-chat', type: 'text', icon: '🤖', color: '#ff6b35', settings: { aiAssistant: true } }
          ]
        },
        {
          id: 'cat-voice',
          name: 'Voice Channels',
          icon: '🎤',
          position: 3,
          channels: [
            { id: 'dao-meeting', name: '🎤│DAO Meeting', type: 'voice', icon: '🎤', color: '#00ff88' },
            { id: 'building', name: '🎤│building', type: 'voice', icon: '🎤', color: '#00ff88' },
            { id: 'grudge-gods', name: 'GrudgeGods', type: 'voice', icon: '👑', color: '#ff00aa' },
            { id: 'sw', name: 'SW', type: 'voice', icon: '⚔️', color: '#00f5ff' },
            { id: 'pvp', name: 'PVP', type: 'voice', icon: '🎮', color: '#ff6b35' }
          ]
        }
      ],
      roles: [
        { id: 'everyone', name: '@everyone', color: '#99aab5' },
        { id: 'testers', name: 'Testers', color: '#f1c40f' },
        { id: 'gwadao', name: 'GWADAO', color: '#e67e22', hoist: true },
        { id: 'timelords', name: 'GrudgeTimeLords', color: '#206694', hoist: true },
        { id: 'grudgegods', name: 'GrudgeGods', color: '#e91e63', hoist: true },
        { id: 'admin', name: 'ADMIN', color: '#3498db' }
      ]
    };
  }

  // Initialize default channels from template
  async initializeDefaultChannels() {
    const template = this.getTemplateChannels();
    const existingChannels = await this.getChannelTree();
    
    if (existingChannels.length > 0) {
      return existingChannels;
    }

    // Create categories and their channels
    for (const cat of template.categories) {
      const category = await this.createCategory({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        position: cat.position,
        readOnly: cat.readOnly
      });

      for (const ch of cat.channels) {
        await this.createChannel({
          ...ch,
          parent: category.id,
          position: cat.channels.indexOf(ch)
        });
      }
    }

    return this.getChannelTree();
  }

  // ============ SESSION PERSISTENCE (Keep Me Logged In) ============

  async saveSession(userData) {
    const session = {
      userId: userData.id || userData.username,
      username: userData.username,
      avatar: userData.avatar,
      token: this.generateSessionToken(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      rememberMe: true
    };
    
    await puter.kv.set(`${this.namespace}:session`, JSON.stringify(session));
    return session;
  }

  async getSession() {
    try {
      const data = await puter.kv.get(`${this.namespace}:session`);
      if (!data) return null;
      
      const session = JSON.parse(data);
      
      // Check if session expired
      if (session.expiresAt < Date.now()) {
        await this.clearSession();
        return null;
      }
      
      return session;
    } catch (e) {
      return null;
    }
  }

  async clearSession() {
    await puter.kv.del(`${this.namespace}:session`);
  }

  async refreshSession() {
    const session = await this.getSession();
    if (session) {
      session.expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
      await puter.kv.set(`${this.namespace}:session`, JSON.stringify(session));
    }
    return session;
  }

  generateSessionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  async isLoggedIn() {
    const session = await this.getSession();
    return session !== null;
  }
}

// Backwards compatibility alias
const GrudgeChannels = GrudChat;

// Create global instance
const grudChat = new GrudChat();
const grudgeChannels = grudChat; // Backwards compatibility

// Export
if (typeof window !== 'undefined') {
  window.GrudChat = GrudChat;
  window.GrudgeChannels = GrudgeChannels;
  window.grudChat = grudChat;
  window.grudgeChannels = grudgeChannels;
}

if (typeof module !== 'undefined') {
  module.exports = { GrudChat, GrudgeChannels, grudChat, grudgeChannels };
}
