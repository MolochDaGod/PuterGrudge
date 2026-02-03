import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

export class Vector3 extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
}

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") sessionId: string = "";
  @type("string") name: string = "";
  @type("string") characterModel: string = "human";
  @type("string") team: string = "";
  @type("string") role: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotationY: number = 0;
  @type("number") health: number = 100;
  @type("number") score: number = 0;
  @type("boolean") isAlive: boolean = true;
  @type("boolean") isReady: boolean = false;
  @type("string") state: string = "idle";
}

export class GameState extends Schema {
  @type("string") roomId: string = "";
  @type("string") roomName: string = "";
  @type("string") gameType: string = "";
  @type("string") phase: string = "lobby";
  @type("number") countdown: number = 0;
  @type("number") playerCount: number = 0;
  @type("number") maxPlayers: number = 8;
  @type({ map: Player }) players = new MapSchema<Player>();
}

interface ArenaClient {
  id: string;
  ws: WebSocket;
  roomId: string | null;
  player: Player | null;
}

interface ArenaRoom {
  id: string;
  name: string;
  gameType: string;
  state: GameState;
  clients: Map<string, ArenaClient>;
  maxClients: number;
  isPrivate: boolean;
  password?: string;
  createdAt: number;
  simulationInterval?: ReturnType<typeof setInterval>;
}

const ROOM_TYPES = {
  lobby: { maxPlayers: 100, autoStart: false },
  hide_and_seek: { maxPlayers: 8, autoStart: true, minPlayers: 3 },
  catapult_arena: { maxPlayers: 8, autoStart: true, minPlayers: 2 },
  mmo: { maxPlayers: 50, autoStart: false }
};

export class ArenaServer {
  private wss: WebSocketServer | null = null;
  private rooms: Map<string, ArenaRoom> = new Map();
  private clients: Map<string, ArenaClient> = new Map();
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = 2567) {
    this.port = port;
  }

  start(server?: any): void {
    if (server) {
      this.wss = new WebSocketServer({ server, path: "/arena" });
    } else {
      this.wss = new WebSocketServer({ port: this.port, path: "/arena" });
    }

    this.wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });

    this.isRunning = true;
    console.log(`[ArenaServer] WebSocket server ready on path /arena`);

    this.createRoom("lobby", "Main Lobby", "lobby");
  }

  stop(): void {
    this.rooms.forEach((room) => {
      if (room.simulationInterval) {
        clearInterval(room.simulationInterval);
      }
    });

    this.wss?.close();
    this.isRunning = false;
    console.log("[ArenaServer] Stopped");
  }

  private generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const clientId = this.generateId();

    const client: ArenaClient = {
      id: clientId,
      ws,
      roomId: null,
      player: null
    };

    this.clients.set(clientId, client);

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(client, message);
      } catch (e) {
        console.error("[ArenaServer] Invalid message:", e);
      }
    });

    ws.on("close", () => {
      this.handleDisconnect(client);
    });

    ws.on("error", (error) => {
      console.error("[ArenaServer] WebSocket error:", error);
    });

    this.send(client, "connected", { clientId, serverTime: Date.now() });
  }

  private handleDisconnect(client: ArenaClient): void {
    if (client.roomId) {
      this.leaveRoom(client);
    }
    this.clients.delete(client.id);
    console.log(`[ArenaServer] Client disconnected: ${client.id}`);
  }

  private handleMessage(client: ArenaClient, message: { type: string; data?: any }): void {
    const { type, data } = message;

    switch (type) {
      case "join_room":
        this.handleJoinRoom(client, data);
        break;
      case "create_room":
        this.handleCreateRoom(client, data);
        break;
      case "leave_room":
        this.leaveRoom(client);
        break;
      case "move":
        this.handleMove(client, data);
        break;
      case "ready":
        this.handleReady(client);
        break;
      case "action":
        this.handleAction(client, data);
        break;
      case "chat":
        this.handleChat(client, data);
        break;
      case "list_rooms":
        this.handleListRooms(client);
        break;
      case "quick_play":
        this.handleQuickPlay(client, data);
        break;
      default:
        console.log(`[ArenaServer] Unknown message type: ${type}`);
    }
  }

  private handleJoinRoom(client: ArenaClient, data: { roomId?: string; name?: string; characterModel?: string; password?: string }): void {
    const roomId = data.roomId || "lobby";
    const room = this.rooms.get(roomId);

    if (!room) {
      this.send(client, "error", { message: "Room not found" });
      return;
    }

    if (room.clients.size >= room.maxClients) {
      this.send(client, "error", { message: "Room is full" });
      return;
    }

    if (room.isPrivate && room.password && room.password !== data.password) {
      this.send(client, "error", { message: "Invalid password" });
      return;
    }

    if (client.roomId) {
      this.leaveRoom(client);
    }

    const player = new Player();
    player.id = client.id;
    player.sessionId = client.id;
    player.name = data.name || `Player_${client.id.slice(0, 4)}`;
    player.characterModel = data.characterModel || "human";
    player.x = Math.random() * 10 - 5;
    player.z = Math.random() * 10 - 5;

    client.player = player;
    client.roomId = roomId;

    room.clients.set(client.id, client);
    room.state.players.set(client.id, player);
    room.state.playerCount = room.clients.size;

    this.send(client, "joined", {
      roomId,
      roomName: room.name,
      gameType: room.gameType,
      playerId: client.id,
      state: this.serializeState(room.state)
    });

    this.broadcastToRoom(room, "player_joined", {
      playerId: client.id,
      playerName: player.name,
      characterModel: player.characterModel,
      position: { x: player.x, y: player.y, z: player.z }
    }, client.id);

    console.log(`[ArenaServer] ${player.name} joined ${room.name}`);
  }

  private handleCreateRoom(client: ArenaClient, data: { gameType: string; name?: string; maxPlayers?: number; isPrivate?: boolean; password?: string }): void {
    const gameType = data.gameType || "lobby";
    const config = ROOM_TYPES[gameType as keyof typeof ROOM_TYPES] || ROOM_TYPES.lobby;

    const room = this.createRoom(
      gameType,
      data.name || `${client.player?.name || "Player"}'s Game`,
      gameType,
      data.maxPlayers || config.maxPlayers,
      data.isPrivate,
      data.password
    );

    this.send(client, "room_created", {
      roomId: room.id,
      roomName: room.name,
      gameType: room.gameType
    });

    this.handleJoinRoom(client, {
      roomId: room.id,
      name: client.player?.name,
      characterModel: client.player?.characterModel
    });
  }

  private createRoom(gameType: string, name: string, type: string, maxPlayers: number = 8, isPrivate: boolean = false, password?: string): ArenaRoom {
    const roomId = this.generateId();

    const state = new GameState();
    state.roomId = roomId;
    state.roomName = name;
    state.gameType = gameType;
    state.phase = "lobby";
    state.maxPlayers = maxPlayers;

    const room: ArenaRoom = {
      id: roomId,
      name,
      gameType,
      state,
      clients: new Map(),
      maxClients: maxPlayers,
      isPrivate,
      password,
      createdAt: Date.now()
    };

    room.simulationInterval = setInterval(() => {
      this.updateRoom(room);
    }, 50);

    this.rooms.set(roomId, room);
    console.log(`[ArenaServer] Room created: ${name} (${gameType})`);

    return room;
  }

  private leaveRoom(client: ArenaClient): void {
    if (!client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    const playerName = client.player?.name;
    
    room.clients.delete(client.id);
    room.state.players.delete(client.id);
    room.state.playerCount = room.clients.size;

    this.broadcastToRoom(room, "player_left", {
      playerId: client.id,
      playerName
    });

    this.broadcastStateUpdate(room);

    client.roomId = null;
    client.player = null;

    if (room.clients.size === 0 && room.gameType !== "lobby") {
      this.disposeRoom(room);
    }
  }

  private disposeRoom(room: ArenaRoom): void {
    if (room.simulationInterval) {
      clearInterval(room.simulationInterval);
      room.simulationInterval = undefined;
    }
    
    room.state.players.clear();
    room.clients.clear();
    
    this.rooms.delete(room.id);
    console.log(`[ArenaServer] Room disposed: ${room.name}`);
  }

  private broadcastStateUpdate(room: ArenaRoom): void {
    const stateSnapshot = this.serializeState(room.state);
    this.broadcastToRoom(room, "state_update", stateSnapshot);
  }

  private handleMove(client: ArenaClient, data: { x?: number; y?: number; z?: number; rotationY?: number }): void {
    if (!client.player || !client.roomId) return;

    client.player.x = data.x ?? client.player.x;
    client.player.y = data.y ?? client.player.y;
    client.player.z = data.z ?? client.player.z;
    client.player.rotationY = data.rotationY ?? client.player.rotationY;

    const room = this.rooms.get(client.roomId);
    if (room) {
      this.broadcastToRoom(room, "player_moved", {
        playerId: client.id,
        x: client.player.x,
        y: client.player.y,
        z: client.player.z,
        rotationY: client.player.rotationY
      }, client.id);
    }
  }

  private handleReady(client: ArenaClient): void {
    if (!client.player || !client.roomId) return;

    client.player.isReady = true;

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    this.broadcastToRoom(room, "player_ready", { playerId: client.id });

    this.checkGameStart(room);
  }

  private handleAction(client: ArenaClient, data: { action: string; [key: string]: any }): void {
    if (!client.player || !client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    this.processGameAction(room, client, data);
  }

  private handleChat(client: ArenaClient, data: { content: string; channel?: string }): void {
    if (!client.player || !client.roomId) return;

    const room = this.rooms.get(client.roomId);
    if (!room) return;

    this.broadcastToRoom(room, "chat", {
      senderId: client.id,
      senderName: client.player.name,
      content: data.content.slice(0, 500),
      channel: data.channel || "global",
      timestamp: Date.now()
    });
  }

  private handleListRooms(client: ArenaClient): void {
    const roomList = Array.from(this.rooms.values())
      .filter((r) => !r.isPrivate && r.gameType !== "lobby")
      .map((r) => ({
        id: r.id,
        name: r.name,
        gameType: r.gameType,
        playerCount: r.clients.size,
        maxPlayers: r.maxClients,
        phase: r.state.phase
      }));

    this.send(client, "room_list", { rooms: roomList });
  }

  private handleQuickPlay(client: ArenaClient, data: { gameType: string; name?: string; characterModel?: string }): void {
    const gameType = data.gameType;

    const availableRoom = Array.from(this.rooms.values()).find(
      (r) => r.gameType === gameType && r.state.phase === "lobby" && r.clients.size < r.maxClients && !r.isPrivate
    );

    if (availableRoom) {
      this.handleJoinRoom(client, {
        roomId: availableRoom.id,
        name: data.name,
        characterModel: data.characterModel
      });
    } else {
      this.handleCreateRoom(client, { gameType, name: `Quick ${gameType}` });
    }
  }

  private checkGameStart(room: ArenaRoom): void {
    if (room.state.phase !== "lobby") return;

    const config = ROOM_TYPES[room.gameType as keyof typeof ROOM_TYPES];
    if (!config || !config.autoStart) return;

    const minPlayers = (config as any).minPlayers || 2;
    const players = Array.from(room.state.players.values());

    if (players.length < minPlayers) return;
    if (!players.every((p) => p.isReady)) return;

    this.startGame(room);
  }

  private startGame(room: ArenaRoom): void {
    room.state.phase = "countdown";
    room.state.countdown = 5;

    this.broadcastToRoom(room, "game_starting", { countdown: room.state.countdown });

    const countdownInterval = setInterval(() => {
      room.state.countdown--;
      this.broadcastToRoom(room, "countdown", { value: room.state.countdown });

      if (room.state.countdown <= 0) {
        clearInterval(countdownInterval);
        room.state.phase = "playing";
        this.initializeGame(room);
        this.broadcastToRoom(room, "game_started", { gameType: room.gameType });
      }
    }, 1000);
  }

  private initializeGame(room: ArenaRoom): void {
    switch (room.gameType) {
      case "hide_and_seek":
        this.initHideAndSeek(room);
        break;
      case "catapult_arena":
        this.initCatapultArena(room);
        break;
      case "mmo":
        break;
    }
  }

  private initHideAndSeek(room: ArenaRoom): void {
    const players = Array.from(room.state.players.values());
    const seekerIndex = Math.floor(Math.random() * players.length);

    players.forEach((player, idx) => {
      if (idx === seekerIndex) {
        player.role = "seeker";
        player.state = "frozen";
      } else {
        player.role = "hider";
        player.state = "scattering";
      }
      player.isAlive = true;
    });

    this.broadcastToRoom(room, "roles_assigned", {
      seekerId: players[seekerIndex].id,
      roles: players.map((p) => ({ id: p.id, role: p.role }))
    });

    setTimeout(() => {
      if (room.state.phase === "playing") {
        players[seekerIndex].state = "seeking";
        this.broadcastToRoom(room, "hunt_started", {});
      }
    }, 3000);
  }

  private initCatapultArena(room: ArenaRoom): void {
    const players = Array.from(room.state.players.values());
    let redCount = 0;

    players.forEach((player) => {
      if (redCount < Math.ceil(players.length / 2)) {
        player.team = "red";
        player.x = -15;
        redCount++;
      } else {
        player.team = "blue";
        player.x = 15;
      }
      player.z = Math.random() * 10 - 5;
      player.health = 100;
      player.score = 0;
      player.isAlive = true;
    });

    this.broadcastToRoom(room, "teams_assigned", {
      teams: players.map((p) => ({ id: p.id, team: p.team, position: { x: p.x, y: p.y, z: p.z } }))
    });
  }

  private processGameAction(room: ArenaRoom, client: ArenaClient, data: { action: string; [key: string]: any }): void {
    switch (room.gameType) {
      case "catapult_arena":
        if (data.action === "fire") {
          this.broadcastToRoom(room, "catapult_fired", {
            playerId: client.id,
            angle: data.angle,
            power: data.power,
            direction: data.direction
          });
        }
        break;
      case "hide_and_seek":
        if (data.action === "capture" && client.player?.role === "seeker") {
          const target = room.state.players.get(data.targetId);
          if (target && target.role === "hider" && target.isAlive) {
            target.isAlive = false;
            target.state = "captured";
            this.broadcastToRoom(room, "player_captured", {
              seekerId: client.id,
              hiderId: data.targetId,
              hiderName: target.name
            });
          }
        }
        break;
    }
  }

  private updateRoom(room: ArenaRoom): void {
    if (room.state.phase === "playing") {
      this.updateGameLogic(room);
    }
    
    if (room.clients.size > 0) {
      this.broadcastStateUpdate(room);
    }
  }

  private updateGameLogic(room: ArenaRoom): void {
    switch (room.gameType) {
      case "hide_and_seek":
        this.updateHideAndSeek(room);
        break;
      case "catapult_arena":
        this.updateCatapultArena(room);
        break;
    }
  }

  private updateHideAndSeek(room: ArenaRoom): void {
    const players = Array.from(room.state.players.values());
    const seeker = players.find(p => p.role === "seeker");
    const alivehiders = players.filter(p => p.role === "hider" && p.isAlive);
    
    if (alivehiders.length === 0 && seeker) {
      this.endGame(room, "seeker");
    }
  }

  private updateCatapultArena(room: ArenaRoom): void {
    const players = Array.from(room.state.players.values());
    const redAlive = players.filter(p => p.team === "red" && p.isAlive).length;
    const blueAlive = players.filter(p => p.team === "blue" && p.isAlive).length;
    
    if (redAlive === 0 && blueAlive > 0) {
      this.endGame(room, "blue");
    } else if (blueAlive === 0 && redAlive > 0) {
      this.endGame(room, "red");
    }
  }

  private endGame(room: ArenaRoom, winner: string): void {
    room.state.phase = "ended";
    
    this.broadcastToRoom(room, "game_over", { winner });
    
    setTimeout(() => {
      this.resetRoom(room);
    }, 10000);
  }

  private resetRoom(room: ArenaRoom): void {
    room.state.phase = "lobby";
    room.state.countdown = 0;
    
    room.state.players.forEach(player => {
      player.isReady = false;
      player.isAlive = true;
      player.health = 100;
      player.score = 0;
      player.role = "";
      player.team = "";
      player.state = "idle";
      player.x = Math.random() * 10 - 5;
      player.z = Math.random() * 10 - 5;
    });
    
    this.broadcastToRoom(room, "room_reset", {});
    this.broadcastStateUpdate(room);
  }

  private send(client: ArenaClient, type: string, data: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type, data, timestamp: Date.now() }));
    }
  }

  private broadcastToRoom(room: ArenaRoom, type: string, data: any, excludeId?: string): void {
    const message = JSON.stringify({ type, data, timestamp: Date.now() });
    room.clients.forEach((client) => {
      if (client.id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  }

  private serializeState(state: GameState): any {
    const players: any[] = [];
    state.players.forEach((player, id) => {
      players.push({
        id: player.id,
        sessionId: player.sessionId,
        name: player.name,
        characterModel: player.characterModel,
        team: player.team,
        role: player.role,
        x: player.x,
        y: player.y,
        z: player.z,
        rotationY: player.rotationY,
        health: player.health,
        score: player.score,
        isAlive: player.isAlive,
        isReady: player.isReady,
        state: player.state
      });
    });

    return {
      roomId: state.roomId,
      roomName: state.roomName,
      gameType: state.gameType,
      phase: state.phase,
      countdown: state.countdown,
      playerCount: state.playerCount,
      maxPlayers: state.maxPlayers,
      players
    };
  }

  getStats(): { rooms: number; clients: number; roomList: any[] } {
    return {
      rooms: this.rooms.size,
      clients: this.clients.size,
      roomList: Array.from(this.rooms.values()).map((r) => ({
        id: r.id,
        name: r.name,
        gameType: r.gameType,
        players: r.clients.size,
        phase: r.state.phase
      }))
    };
  }

  getRoomInfo(roomId: string): any | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      id: room.id,
      name: room.name,
      gameType: room.gameType,
      state: this.serializeState(room.state),
      createdAt: room.createdAt
    };
  }
}

export const arenaServer = new ArenaServer();
