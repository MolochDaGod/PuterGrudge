class ArenaClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || this.getDefaultUrl();
    this.ws = null;
    this.playerId = null;
    this.currentRoom = null;
    this.state = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    this.callbacks = {
      onConnect: () => {},
      onDisconnect: () => {},
      onJoined: () => {},
      onLeft: () => {},
      onStateChange: () => {},
      onPlayerJoined: () => {},
      onPlayerLeft: () => {},
      onPlayerMoved: () => {},
      onChat: () => {},
      onGameStart: () => {},
      onGameEnd: () => {},
      onError: () => {}
    };
  }

  getDefaultUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/arena`;
  }

  on(event, callback) {
    if (this.callbacks.hasOwnProperty(`on${this.capitalize(event)}`)) {
      this.callbacks[`on${this.capitalize(event)}`] = callback;
    }
    return this;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          console.log('[ArenaClient] Connected');
          this.reconnectAttempts = 0;
          this.callbacks.onConnect();
        };
        
        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
          
          if (message.type === 'connected') {
            this.playerId = message.data.clientId;
            resolve(this);
          }
        };
        
        this.ws.onclose = () => {
          console.log('[ArenaClient] Disconnected');
          this.callbacks.onDisconnect();
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('[ArenaClient] Error:', error);
          this.callbacks.onError(error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[ArenaClient] Max reconnection attempts reached');
      this.callbacks.onError({ message: 'Max reconnection attempts reached' });
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[ArenaClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.ws = null;
      this.connect().catch((err) => {
        console.error('[ArenaClient] Reconnect failed:', err);
      });
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type, data = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  handleMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'connected':
        this.playerId = data.clientId;
        break;
        
      case 'joined':
        this.currentRoom = data.roomId;
        this.state = data.state;
        this.callbacks.onJoined(data);
        break;
        
      case 'room_list':
        break;
        
      case 'player_joined':
        this.callbacks.onPlayerJoined(data);
        break;
        
      case 'player_left':
        this.callbacks.onPlayerLeft(data);
        break;
        
      case 'player_moved':
        if (this.state && this.state.players) {
          const players = Array.isArray(this.state.players) 
            ? this.state.players 
            : Object.values(this.state.players);
          const player = players.find(p => p.id === data.playerId);
          if (player) {
            player.x = data.x;
            player.y = data.y;
            player.z = data.z;
            player.rotationY = data.rotationY;
          }
        }
        this.callbacks.onPlayerMoved(data);
        break;
        
      case 'state_update':
        this.state = data;
        this.callbacks.onStateChange({ type: 'state_update', data });
        break;
        
      case 'chat':
        this.callbacks.onChat(data);
        break;
        
      case 'game_starting':
      case 'game_started':
        this.callbacks.onGameStart(data);
        break;
        
      case 'game_over':
        this.callbacks.onGameEnd(data);
        break;
        
      case 'roles_assigned':
      case 'teams_assigned':
      case 'hunt_started':
      case 'player_captured':
      case 'player_rescued':
      case 'catapult_fired':
      case 'player_hit':
      case 'player_eliminated':
      case 'player_respawned':
      case 'projectile_impact':
        this.callbacks.onStateChange({ type, data });
        break;
        
      case 'error':
        this.callbacks.onError(data);
        break;
    }
  }

  joinRoom(options = {}) {
    this.send('join_room', {
      roomId: options.roomId || 'lobby',
      name: options.name || `Player_${Math.random().toString(36).slice(2, 6)}`,
      characterModel: options.characterModel || 'human',
      password: options.password
    });
  }

  createRoom(options = {}) {
    this.send('create_room', {
      gameType: options.gameType || 'lobby',
      name: options.name,
      maxPlayers: options.maxPlayers,
      isPrivate: options.isPrivate,
      password: options.password
    });
  }

  leaveRoom() {
    this.send('leave_room');
    this.currentRoom = null;
    this.state = null;
    this.callbacks.onLeft();
  }

  quickPlay(gameType, options = {}) {
    this.send('quick_play', {
      gameType,
      name: options.name,
      characterModel: options.characterModel
    });
  }

  listRooms() {
    this.send('list_rooms');
  }

  move(position) {
    this.send('move', {
      x: position.x,
      y: position.y,
      z: position.z,
      rotationY: position.rotationY
    });
  }

  ready() {
    this.send('ready');
  }

  chat(content, channel = 'global') {
    this.send('chat', { content, channel });
  }

  action(actionType, data = {}) {
    this.send('action', { action: actionType, ...data });
  }

  fire(angle, power, direction) {
    this.action('fire', { angle, power, direction });
  }

  capture(targetId) {
    this.action('capture', { targetId });
  }

  interact(interactableId) {
    this.send('interact', { interactableId });
  }

  transitionArea(direction) {
    this.send('transitionArea', { direction });
  }

  getMyPlayer() {
    if (!this.state || !this.playerId) return null;
    const players = this.getPlayers();
    return players.find(p => p.id === this.playerId);
  }

  getPlayers() {
    if (!this.state?.players) return [];
    return Array.isArray(this.state.players) 
      ? this.state.players 
      : Object.values(this.state.players);
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  isInRoom() {
    return !!this.currentRoom;
  }
}

class ArenaAPI {
  constructor(baseUrl = '/api/v1/arena') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    return response.json();
  }

  async getStatus() {
    return this.request('/status');
  }

  async getRooms() {
    return this.request('/rooms');
  }

  async getRoom(roomId) {
    return this.request(`/rooms/${roomId}`);
  }

  async getTasks() {
    return this.request('/agent/tasks');
  }

  async createTask(task) {
    return this.request('/agent/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    });
  }

  async getDeployments() {
    return this.request('/agent/deployments');
  }

  async createDeployment(deployment) {
    return this.request('/agent/deployments', {
      method: 'POST',
      body: JSON.stringify(deployment)
    });
  }

  async deleteDeployment(id) {
    return this.request(`/agent/deployments/${id}`, {
      method: 'DELETE'
    });
  }

  async scaffoldMetaverse(options) {
    return this.request('/agent/scaffold', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }

  async learnPattern(observation) {
    return this.request('/agent/learn', {
      method: 'POST',
      body: JSON.stringify(observation)
    });
  }
}

if (typeof window !== 'undefined') {
  window.ArenaClient = ArenaClient;
  window.ArenaAPI = ArenaAPI;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ArenaClient, ArenaAPI };
}
