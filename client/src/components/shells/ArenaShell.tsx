import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gamepad2, Users, MessageSquare, Zap, Trophy, Sword, Shield, Target } from 'lucide-react';

const CHARACTERS = [
  { id: 'orc', name: 'Orc', icon: '👹', color: '#22c55e' },
  { id: 'human', name: 'Human', icon: '🧑', color: '#3b82f6' },
  { id: 'barbarian', name: 'Barbarian', icon: '⚔️', color: '#ef4444' },
  { id: 'elf', name: 'Elf', icon: '🧝', color: '#a855f7' },
  { id: 'dwarf', name: 'Dwarf', icon: '🧔', color: '#f59e0b' },
];

const GAMES = [
  { 
    id: 'hide_and_seek', 
    name: 'Hide and Seek', 
    icon: Target,
    players: '3-8',
    tags: ['PvP', 'Asymmetric'],
    status: 'live',
    playerCount: 12
  },
  { 
    id: 'catapult_arena', 
    name: 'Catapult Arena', 
    icon: Sword,
    players: '2-8',
    tags: ['PvP', 'Physics'],
    status: 'live',
    playerCount: 8
  },
  { 
    id: 'mmo', 
    name: 'Grudge MMO', 
    icon: Shield,
    players: 'Massive',
    tags: ['MMO', 'RPG'],
    status: 'live',
    playerCount: 47
  },
];

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

interface Lobby {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  gameType: string;
}

export function ArenaShell() {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState('orc');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', author: 'System', text: 'Welcome to the Arena!', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [lobbies, setLobbies] = useState<Lobby[]>([
    { id: '1', name: 'Hide & Seek #1', players: 4, maxPlayers: 8, gameType: 'hide_and_seek' },
    { id: '2', name: 'Catapult Battle', players: 6, maxPlayers: 8, gameType: 'catapult_arena' },
  ]);
  const [stats, setStats] = useState({ rooms: 0, players: 0, uptime: '0m' });
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/arena`;
    
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('[ArenaShell] Connected to game server');
      addChatMessage('System', 'Connected to game server');
    };
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };
    
    socket.onclose = () => {
      console.log('[ArenaShell] Disconnected');
      addChatMessage('System', 'Disconnected from server');
    };
    
    setWs(socket);
    
    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/v1/arena/status');
        const data = await res.json();
        if (data.success) {
          setStats(prev => ({
            ...prev,
            rooms: data.data.server.rooms,
            players: data.data.server.clients
          }));
        }
      } catch (e) {
        console.log('[ArenaShell] Stats fetch failed');
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      setStats(prev => ({ ...prev, uptime: `${m}m ${s}s` }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMessage = useCallback((message: { type: string; data: any }) => {
    switch (message.type) {
      case 'connected':
        setPlayerId(message.data.clientId);
        break;
      case 'room_list':
        setLobbies(message.data.rooms.map((r: any) => ({
          id: r.id,
          name: r.name,
          players: r.playerCount,
          maxPlayers: r.maxPlayers,
          gameType: r.gameType
        })));
        break;
      case 'chat':
        addChatMessage(message.data.senderName, message.data.content);
        break;
      case 'joined':
        addChatMessage('System', `Joined ${message.data.roomName}`);
        break;
      case 'player_joined':
        addChatMessage('System', `${message.data.playerName} joined the game`);
        break;
      case 'player_left':
        addChatMessage('System', `${message.data.playerName} left`);
        break;
    }
  }, []);

  const addChatMessage = (author: string, text: string) => {
    setChatMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      author,
      text,
      timestamp: Date.now()
    }]);
  };

  const sendChat = () => {
    if (!chatInput.trim() || !ws) return;
    ws.send(JSON.stringify({ type: 'chat', data: { content: chatInput } }));
    addChatMessage('You', chatInput);
    setChatInput('');
  };

  const quickPlay = () => {
    if (!selectedGame || !ws) {
      addChatMessage('System', 'Please select a game first');
      return;
    }
    ws.send(JSON.stringify({
      type: 'quick_play',
      data: {
        gameType: selectedGame,
        name: `Player_${playerId?.slice(0, 4) || 'Guest'}`,
        characterModel: selectedCharacter
      }
    }));
  };

  const joinLobby = (lobbyId: string) => {
    if (!ws) return;
    ws.send(JSON.stringify({
      type: 'join_room',
      data: {
        roomId: lobbyId,
        name: `Player_${playerId?.slice(0, 4) || 'Guest'}`,
        characterModel: selectedCharacter
      }
    }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" data-testid="shell-arena">
      <div className="grid grid-cols-[280px_1fr_320px] min-h-screen">
        <nav className="bg-[#12121a] border-r border-[#2a2a3a] flex flex-col">
          <div className="p-6 border-b border-[#2a2a3a]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e94560, #ff6b8a)' }}>
                <Gamepad2 className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold">Arena Games</span>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <div className="text-xs uppercase text-[#8b8b9b] px-2 mb-2">Browse</div>
            {['All Games', 'PvP Arena', 'PvE / Co-op', 'MMO Worlds'].map((item, i) => (
              <div 
                key={item}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${i === 0 ? 'bg-[#252535] text-white border-l-2 border-[#e94560]' : 'text-[#8b8b9b] hover:bg-[#252535] hover:text-white'}`}
              >
                <span>{item}</span>
                {i === 1 && <Badge className="ml-auto bg-[#e94560] text-white text-xs">3</Badge>}
              </div>
            ))}
          </div>

          <div className="p-4 space-y-2">
            <div className="text-xs uppercase text-[#8b8b9b] px-2 mb-2">My Games</div>
            {['Favorites', 'Recently Played'].map(item => (
              <div 
                key={item}
                className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer text-[#8b8b9b] hover:bg-[#252535] hover:text-white transition-colors"
              >
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto p-4 border-t border-[#2a2a3a]">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1a1a25] rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-[#e94560]">{stats.rooms}</div>
                <div className="text-xs text-[#8b8b9b]">Rooms</div>
              </div>
              <div className="bg-[#1a1a25] rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-[#e94560]">{stats.players}</div>
                <div className="text-xs text-[#8b8b9b]">Players</div>
              </div>
              <div className="bg-[#1a1a25] rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-[#e94560]">{stats.uptime}</div>
                <div className="text-xs text-[#8b8b9b]">Uptime</div>
              </div>
            </div>
          </div>
        </nav>

        <main className="p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Arena Games</h1>
            <div className="flex items-center gap-2 bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-4 py-2">
              <span className="text-[#8b8b9b]">Search</span>
              <Input 
                type="text" 
                placeholder="Search games..." 
                className="bg-transparent border-0 text-white placeholder:text-[#8b8b9b] focus-visible:ring-0 w-48"
                data-testid="input-search-games"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {GAMES.map(game => (
              <Card 
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className={`bg-[#1a1a25] border-[#2a2a3a] cursor-pointer transition-all hover:translate-y-[-4px] hover:shadow-lg ${selectedGame === game.id ? 'ring-2 ring-[#e94560]' : ''}`}
                data-testid={`card-game-${game.id}`}
              >
                <div className="h-40 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center relative">
                  <game.icon className="w-16 h-16 text-[#e94560]" />
                  <Badge className="absolute top-3 right-3 bg-[#10b981] text-white text-xs">
                    {game.status}
                  </Badge>
                  <Badge className="absolute bottom-3 right-3 bg-white/15 text-white text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {game.playerCount}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1">{game.name}</h3>
                  <p className="text-sm text-[#8b8b9b] mb-3">{game.players} Players</p>
                  <div className="flex gap-2 flex-wrap">
                    {game.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-[#252535] text-[#8b8b9b] text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Select Character</h2>
            <div className="grid grid-cols-5 gap-3">
              {CHARACTERS.map(char => (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharacter(char.id)}
                  className={`aspect-square bg-[#1a1a25] border-2 rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2 transition-all hover:border-[#e94560] ${selectedCharacter === char.id ? 'border-[#e94560] bg-[#e94560]/10' : 'border-[#2a2a3a]'}`}
                  data-testid={`btn-character-${char.id}`}
                >
                  <span className="text-3xl">{char.icon}</span>
                  <span className="text-xs capitalize">{char.name}</span>
                </div>
              ))}
            </div>
          </div>
        </main>

        <aside className="bg-[#12121a] border-l border-[#2a2a3a] flex flex-col">
          <div className="p-5 border-b border-[#2a2a3a]">
            <div className="flex items-center gap-2 text-sm font-semibold mb-4">
              <Users className="w-4 h-4" />
              Active Lobbies
            </div>
            <div className="space-y-2">
              {lobbies.map(lobby => (
                <div 
                  key={lobby.id}
                  onClick={() => joinLobby(lobby.id)}
                  className="flex items-center gap-3 p-3 bg-[#1a1a25] rounded-lg cursor-pointer hover:bg-[#252535] transition-colors"
                  data-testid={`lobby-${lobby.id}`}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: 'linear-gradient(135deg, #e94560, #ff6b8a)' }}>
                    {lobby.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{lobby.name}</div>
                    <div className="text-xs text-[#8b8b9b]">{lobby.players}/{lobby.maxPlayers} players</div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col p-5 min-h-0">
            <div className="flex items-center gap-2 text-sm font-semibold mb-4">
              <MessageSquare className="w-4 h-4" />
              Lobby Chat
            </div>
            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-3">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#252535] flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold">{msg.author}</div>
                      <div className="text-sm text-[#8b8b9b]">{msg.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-4">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Type a message..."
                className="bg-[#1a1a25] border-[#2a2a3a] text-white placeholder:text-[#8b8b9b]"
                data-testid="input-chat"
              />
              <Button 
                onClick={sendChat}
                className="bg-[#e94560] hover:bg-[#ff6b8a] text-white"
                data-testid="btn-send-chat"
              >
                Send
              </Button>
            </div>
          </div>

          <div className="p-5 border-t border-[#2a2a3a]">
            <Button 
              onClick={quickPlay}
              className="w-full py-6 text-lg font-semibold"
              style={{ background: 'linear-gradient(135deg, #e94560, #ff6b8a)' }}
              data-testid="btn-quick-play"
            >
              <Zap className="w-5 h-5 mr-2" />
              Quick Play
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
