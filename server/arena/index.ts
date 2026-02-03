import { Router, Request, Response } from "express";
import { arenaServer } from "./ArenaServer";
import { arenaAIAgent } from "./ArenaAIAgent";

const arenaRouter = Router();

arenaRouter.get("/status", (req: Request, res: Response) => {
  const serverStats = arenaServer.getStats();
  const agentStatus = arenaAIAgent.getStatus();
  
  res.json({
    success: true,
    data: {
      server: serverStats,
      agent: agentStatus,
      timestamp: Date.now()
    }
  });
});

arenaRouter.get("/rooms", (req: Request, res: Response) => {
  const stats = arenaServer.getStats();
  res.json({
    success: true,
    data: stats.roomList
  });
});

arenaRouter.get("/rooms/:roomId", (req: Request, res: Response) => {
  try {
    const roomInfo = arenaServer.getRoomInfo(req.params.roomId);
    
    if (!roomInfo) {
      res.status(404).json({ success: false, error: "Room not found" });
      return;
    }
    
    res.json({ success: true, data: roomInfo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

arenaRouter.get("/players", (req: Request, res: Response) => {
  try {
    const stats = arenaServer.getStats();
    const players: any[] = [];
    
    for (const room of stats.roomList) {
      const roomInfo = arenaServer.getRoomInfo(room.id);
      if (roomInfo && roomInfo.clients) {
        players.push(...roomInfo.clients.map((c: any) => ({
          id: c.id || c.sessionId,
          room: room.id,
          roomName: room.name
        })));
      }
    }
    
    res.json({ 
      success: true, 
      data: {
        totalPlayers: stats.clients,
        players
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

arenaRouter.get("/agent/tasks", (req: Request, res: Response) => {
  const tasks = arenaAIAgent.getTasks();
  res.json({ success: true, data: tasks });
});

arenaRouter.post("/agent/tasks", (req: Request, res: Response) => {
  const { type, description, priority, data } = req.body;
  
  if (!type || !description) {
    res.status(400).json({ success: false, error: "Missing type or description" });
    return;
  }
  
  const task = arenaAIAgent.createTask({
    type,
    description,
    priority: priority || 5,
    data
  });
  
  res.json({ success: true, data: task });
});

arenaRouter.get("/agent/deployments", (req: Request, res: Response) => {
  const deployments = arenaAIAgent.getDeployments();
  res.json({ success: true, data: deployments });
});

arenaRouter.post("/agent/deployments", (req: Request, res: Response) => {
  const { name, gameType, config } = req.body;
  
  if (!name || !gameType) {
    res.status(400).json({ success: false, error: "Missing name or gameType" });
    return;
  }
  
  const deployment = arenaAIAgent.createDeployment({ name, gameType, config });
  res.json({ success: true, data: deployment });
});

arenaRouter.delete("/agent/deployments/:id", (req: Request, res: Response) => {
  const success = arenaAIAgent.stopDeployment(req.params.id);
  res.json({ success });
});

arenaRouter.post("/agent/scaffold", (req: Request, res: Response) => {
  const { template, zones, features } = req.body;
  
  const task = arenaAIAgent.createTask({
    type: "scaffold_metaverse",
    description: `Scaffold new metaverse: ${template || "fantasy"}`,
    priority: 7,
    data: { template, zones, features }
  });
  
  res.json({ success: true, data: { taskId: task.id } });
});

arenaRouter.post("/agent/learn", (req: Request, res: Response) => {
  const { type, data } = req.body;
  
  if (!type || !data) {
    res.status(400).json({ success: false, error: "Missing type or data" });
    return;
  }
  
  arenaAIAgent.learn({ type, data });
  res.json({ success: true });
});

export async function initializeArena(server: any): Promise<Router> {
  arenaServer.start(server);
  
  await arenaAIAgent.initialize();
  
  console.log("[Arena] API routes ready at /api/v1/arena/*");
  
  return arenaRouter;
}

export { arenaRouter, arenaServer, arenaAIAgent };
