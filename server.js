#!/usr/bin/env node
/**
 * Honey Comb Protocol - Node.js Backend Server
 * Handles leverage calculations and game analytics
 */

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors({
  origin: ['http://localhost:5001', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// WebSocket connection tracking
const connections = new Set();
const clientData = new Map();

// Cache the generated world to prevent excessive updates
let cachedMockWorld = null;
let lastWorldGenTime = 0;
const WORLD_CACHE_TIME = 5000; // 5 seconds

// --- Mock world generation (simple structure compatible with frontend) ---
function generateMockWorld() {
  // Return cached world if it's recent enough
  const now = Date.now();
  if (cachedMockWorld && (now - lastWorldGenTime) < WORLD_CACHE_TIME) {
    return cachedMockWorld;
  }
  
  // Generate a new world
  const mockGalaxy = {
    id: 'galaxy-1',
    name: 'Milky Way',
    systems: Array(5).fill(0).map((_, sysIndex) => ({
      id: `system-${sysIndex + 1}`,
      name: `System ${sysIndex + 1}`,
      position: {
        x: (Math.random() * 100 - 50) * 2,
        y: (Math.random() * 20 - 10),
        z: (Math.random() * 100 - 50) * 2
      },
      sun: {
        color: ['#ffff66', '#ffaa66', '#ff8866', '#ffddaa', '#ffcccc'][sysIndex % 5],
        intensity: 0.8 + Math.random() * 0.4
      },
      planets: Array(3 + Math.floor(Math.random() * 4)).fill(0).map((_, planetIndex) => {
        // First planet of first system is always controlled by the player
        // Other planets have a chance to be controlled
        const controlled = (sysIndex === 0 && planetIndex === 0) || Math.random() > 0.7;
        return {
          id: `planet-${sysIndex + 1}-${planetIndex + 1}`,
          name: `Planet ${sysIndex + 1}-${planetIndex + 1}`,
          systemId: `system-${sysIndex + 1}`,
          controlledBy: controlled ? 'player' : null,
          position: {
            x: (Math.random() * 40 - 20) + (sysIndex * 30),
            y: (Math.random() * 10 - 5),
            z: (Math.random() * 40 - 20) + (sysIndex * 30)
          },
          defense: controlled ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * 3),
          population: Math.floor(Math.random() * 1000),
          resources: [
            { type: 'energy', amount: Math.floor(Math.random() * 200) },
            { type: 'minerals', amount: Math.floor(Math.random() * 150) }
          ]
        };
      })
    }))
  };

  // Cache the world and update the timestamp
  cachedMockWorld = {
    galaxies: [mockGalaxy],
    timestamp: Date.now()
  };
  lastWorldGenTime = now;
  
  return cachedMockWorld;
}

// Leverage calculation engine
class LeverageEngine {
  constructor() {
    this.baseMultiplier = 1.0;
    this.traitWeights = {
      "Strength": 0.8,
      "Wisdom": 1.2,
      "Charisma": 1.0,
      "Agility": 0.9,
      "Intelligence": 1.1
    };
    this.actionWeights = {
      "gather": 1.0,
      "craft": 1.2,
      "combat": 0.9,
      "explore": 1.1,
      "trade": 1.3
    };
  }

  calculateLeverage(character, action) {
    // Base calculations
    const levelBonus = character.level * 0.05;
    const experienceBonus = Math.min(character.experience / 10000, 1.0) * 0.3;
    
    // Trait analysis
    let traitBonus = 0;
    const traitAnalysis = {};
    
    if (character.traits) {
      character.traits.forEach(trait => {
        const traitType = trait.type;
        const traitLevel = trait.level || 1;
        
        if (this.traitWeights[traitType]) {
          const weight = this.traitWeights[traitType];
          const bonus = (traitLevel * 0.1) * weight;
          traitBonus += bonus;
          traitAnalysis[traitType] = {
            level: traitLevel,
            bonus,
            weight
          };
        }
      });
    }

    // Action type bonus
    const actionType = action.action || "gather";
    const actionBonus = (this.actionWeights[actionType] || 1.0) - 1.0;
    
    // Resource availability bonus
    let resourceBonus = 0;
    if (action.resources && character.resources) {
      const availableResources = action.resources.filter(r => character.resources[r]).length;
      const totalResources = action.resources.length;
      if (totalResources > 0) {
        resourceBonus = (availableResources / totalResources) * 0.2;
      }
    }

    // Faction synergy bonus
    const factionBonus = this.calculateFactionBonus(character.faction, action);
    
    // Calculate final multiplier
    const finalMultiplier = (
      this.baseMultiplier + 
      levelBonus + 
      experienceBonus + 
      traitBonus + 
      actionBonus + 
      resourceBonus + 
      factionBonus
    );
    
    // Efficiency calculation
    const efficiency = Math.min(finalMultiplier / 2.0, 1.0);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(character, action, traitAnalysis);
    
    // Detailed analysis
    const analysis = {
      baseMultiplier: this.baseMultiplier,
      levelBonus,
      experienceBonus,
      traitBonus,
      actionBonus,
      resourceBonus,
      factionBonus,
      traitAnalysis,
      characterLevel: character.level,
      characterExperience: character.experience,
      actionType
    };
    
    return {
      leverageMultiplier: Math.round(finalMultiplier * 10000) / 10000,
      efficiency: Math.round(efficiency * 10000) / 10000,
      recommendations,
      analysis
    };
  }

  calculateFactionBonus(faction, action) {
    const factionBonuses = {
      "Sun": {"gather": 0.1, "combat": 0.15},
      "Ocean": {"explore": 0.15, "trade": 0.1},
      "Forest": {"craft": 0.15, "gather": 0.1},
      "Red": {"combat": 0.2},
      "Blue": {"explore": 0.15},
      "Green": {"gather": 0.15}
    };
    
    const actionType = action.action || "gather";
    return (factionBonuses[faction] && factionBonuses[faction][actionType]) || 0.0;
  }

  generateRecommendations(character, action, traitAnalysis) {
    const recommendations = [];
    
    // Level recommendations
    if (character.level < 10) {
      recommendations.push("Consider focusing on gaining experience to unlock higher leverage multipliers");
    }
    
    // Trait recommendations
    const actionType = action.action || "gather";
    const optimalTraits = {
      "gather": ["Wisdom", "Strength"],
      "craft": ["Intelligence", "Wisdom"],
      "combat": ["Strength", "Agility"],
      "explore": ["Agility", "Intelligence"],
      "trade": ["Charisma", "Intelligence"]
    };
    
    if (optimalTraits[actionType]) {
      optimalTraits[actionType].forEach(trait => {
        if (!traitAnalysis[trait] || traitAnalysis[trait].level < 5) {
          recommendations.push(`Improve ${trait} trait for better ${actionType} performance`);
        }
      });
    }
    
    // Resource recommendations
    if (action.resources) {
      const missingResources = action.resources.filter(r => !(character.resources && character.resources[r]));
      if (missingResources.length > 0) {
        recommendations.push(`Acquire these resources for optimal performance: ${missingResources.join(', ')}`);
      }
    }
    
    // Faction recommendations
    const factionBonus = this.calculateFactionBonus(character.faction, action);
    if (factionBonus === 0) {
      recommendations.push(`Consider actions that synergize with your ${character.faction} faction`);
    }
    
    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }
}

const leverageEngine = new LeverageEngine();

// API Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    activeConnections: connections.size,
    service: 'Honey Comb Protocol Backend'
  });
});

app.post('/calculate-leverage', (req, res) => {
  try {
    const { character, action } = req.body;
    
    if (!character || !action) {
      return res.status(400).json({ error: 'Character and action are required' });
    }
    
    const result = leverageEngine.calculateLeverage(character, action);
    console.log(`Leverage calculated for ${character.name}: ${result.leverageMultiplier}`);
    
    res.json(result);
  } catch (error) {
    console.error('Error calculating leverage:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/analytics/character/:characterName', (req, res) => {
  const { characterName } = req.params;
  
  // Mock analytics data
  res.json({
    characterName,
    totalActions: 0,
    averageLeverage: 1.0,
    optimizationScore: 75.5,
    recommendations: [
      "Focus on improving Wisdom trait",
      "Consider diversifying action types"
    ]
  });
});

app.get('/stats', (req, res) => {
  res.json({
    activeConnections: connections.size,
    totalCalculations: 0,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage()
  });
});

// WebSocket handling
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  connections.add(ws);
  clientData.set(ws, {
    id: clientId,
    connectedAt: new Date(),
    messageCount: 0,
    world: generateMockWorld(),
    research: { attack: 0, defense: 0, fleet: 0, logistics: 0 }
  });
  
  console.log(`Client ${clientId} connected. Total connections: ${connections.size}`);
  
  // Inform client of connection details
  try {
    ws.send(JSON.stringify({
      type: 'connection_status',
      payload: { client_id: clientId }
    }));
    // Also push initial world snapshot immediately
    const world = clientData.get(ws)?.world || generateMockWorld();
    ws.send(JSON.stringify({ type: 'world_state', payload: world }));
  } catch {}

  // Periodically push world updates as a fallback to ensure client receives data
  // const pushTimer = setInterval(() => {
  //   try {
  //     const w = clientData.get(ws)?.world;
  //     if (w) {
  //       ws.send(JSON.stringify({ type: 'world_state_update', payload: w }));
  //     }
  //   } catch {}
  // }, 3000);
  
  // Rate limiting for WebSocket messages
  const lastMessageTime = Date.now();
  let messageCount = 0;
  const MESSAGE_RATE_LIMIT = 20; // Max 20 messages per second
  const RATE_WINDOW = 1000; // 1 second window
  
  ws.on('message', (message) => {
    try {
      // Apply basic rate limiting
      const now = Date.now();
      if (now - lastMessageTime < RATE_WINDOW) {
        messageCount++;
        if (messageCount > MESSAGE_RATE_LIMIT) {
          // Skip processing but don't disconnect
          return;
        }
      } else {
        // Reset counter for new time window
        messageCount = 1;
      }
      
      const data = JSON.parse(message);
      const client = clientData.get(ws);
      
      if (client) {
        client.messageCount++;
      }
      
      switch (data.type) {
        case 'get_world': {
          // Only log every 10th get_world request to reduce console spam
          if (client && client.messageCount % 10 === 0) {
            console.log(`get_world from ${clientId} (request #${client.messageCount})`);
          }
          
          // Use cached world when possible to reduce server load
          const world = client?.world || generateMockWorld();
          ws.send(JSON.stringify({ type: 'world_state', payload: world }));
          break;
        }

        case 'explore_system': {
          // Return a single system snapshot; client will merge
          const sysIndex = Math.floor(Math.random() * 5);
          const system = (client?.world?.galaxies?.[0]?.systems?.[sysIndex]) || generateMockWorld().galaxies[0].systems[0];
          ws.send(JSON.stringify({ type: 'explore_result', payload: system }));
          break;
        }

        case 'attack_planet': {
          const planetId = data.planet_id;
          const fromId = data.from_id;
          const unitsSent = Number(data.amount || 0);
          
          // Resolve world references

          // Try to resolve precise positions from the cached world
          const world = client?.world || generateMockWorld();
          let targetPlanet = null;
          let sourcePlanet = null;
          try {
            const systems = world?.galaxies?.[0]?.systems || [];
            for (const sys of systems) {
              for (const p of sys.planets || []) {
                if (p.id === planetId) targetPlanet = p;
                if (fromId && p.id === fromId) sourcePlanet = p;
              }
            }
          } catch {}

          const targetPosition = targetPlanet?.position || { x: 0, y: 0, z: 0 };
          const sourcePosition = sourcePlanet?.position || null;

          // Combat formula (AAA-friendly, deterministic enough for visuals)
          const research = (clientData.get(ws)?.research) || { attack: 0, defense: 0, fleet: 0, logistics: 0 };
          const atkLevel = Number(research.attack || 0);
          const fleetLevel = Number(research.fleet || 0);
          const defLevel = Number(research.defense || 0);
          const planetDefense = Number(targetPlanet?.defense || 0);
          
          // Effective strengths
          // Attack: units + research scaling; Defense: planet defense + defender research
          const effectiveAttack = Math.max(1, unitsSent) * (1.0 + atkLevel * 0.12 + fleetLevel * 0.08) + (5 + Math.random()*10);
          const effectiveDefense = Math.max(1, planetDefense) * (11 + defLevel * 1.5) + (5 + Math.random()*8);
          
          // Outcome
          const success = effectiveAttack >= effectiveDefense;
          const attackPower = Math.floor(effectiveAttack);
          const defensePower = Math.floor(effectiveDefense);
          
          // New defense (chip away even if failed)
          const defenseLoss = Math.max(0, Math.floor((effectiveAttack / (effectiveDefense+1)) * 2));
          const newDefense = Math.max(0, planetDefense - defenseLoss);
          if (targetPlanet) targetPlanet.defense = newDefense;
          if (success && targetPlanet) {
            // Transfer control in server snapshot so next world push is consistent
            targetPlanet.controlledBy = client?.id || 'player';
          }
          
          const battleTimeMs = 2000; // client shows battle window for this duration

          ws.send(JSON.stringify({
            type: 'attack_result',
            payload: {
              planet_id: planetId,
              from_id: fromId || null,
              current_owner: success ? (client?.id || 'player') : 'defender',
              defense: newDefense,
              success,
              attack_power: attackPower,
              defense_power: defensePower,
              position: targetPosition,
              source_position: sourcePosition,
              attacking_units: unitsSent,
              battle_time_ms: battleTimeMs
            }
          }));
          break;
        }

        case 'harvest_planet': {
          const world = clientData.get(ws)?.world || null;
          const planetId = data.planet_id;
          let energyGained = 0; let mineralsGained = 0;
          try {
            for (const sys of world.galaxies?.[0]?.systems || []) {
              const p = (sys.planets || []).find((pl) => pl.id === planetId);
              if (p) {
                const res = p.resources || [];
                const energy = res.find(r => r.type === 'energy');
                const minerals = res.find(r => r.type === 'minerals');
                energyGained = Math.max(0, Math.min(40, Math.floor(10 + Math.random() * 30), energy?.amount || 0));
                mineralsGained = Math.max(0, Math.min(25, Math.floor(5 + Math.random() * 20), minerals?.amount || 0));
                if (energy) energy.amount = Math.max(0, (energy.amount || 0) - energyGained);
                if (minerals) minerals.amount = Math.max(0, (minerals.amount || 0) - mineralsGained);
                break;
              }
            }
          } catch {}
          ws.send(JSON.stringify({
            type: 'harvest_planet_result',
            payload: {
              planet_id: planetId,
              resources_gained: { energy: energyGained, minerals: mineralsGained },
              success: true
            }
          }));
          break;
        }

        case 'deploy_research': {
          const research = (clientData.get(ws)?.research) || { attack: 0, defense: 0, fleet: 0, logistics: 0 };
          const tech = (data.tech || 'attack');
          const valid = ['attack', 'defense', 'fleet', 'logistics'];
          const key = valid.includes(tech) ? tech : 'attack';
          research[key] = (research[key] || 0) + 1;
          // Persist back
          const c = clientData.get(ws);
          if (c) c.research = research;
          ws.send(JSON.stringify({
            type: 'research_result',
            payload: { tech: key, level: research[key] }
          }));
          break;
        }
        
        case 'harvest_planet': {
          const planetId = data.planet_id;
          const energyGained = Math.floor(10 + Math.random() * 40);
          const mineralsGained = Math.floor(5 + Math.random() * 20);
          
          ws.send(JSON.stringify({
            type: 'harvest_planet_result',
            payload: {
              planet_id: planetId,
              resources_gained: {
                energy: energyGained,
                minerals: mineralsGained
              },
              success: true
            }
          }));
          break;
        }
        
        case 'move_units': {
          const fromId = data.from_id;
          const toId = data.to_id;
          const amount = data.amount || 10;
          
          ws.send(JSON.stringify({
            type: 'move_units_result',
            payload: {
              from_id: fromId,
              to_id: toId,
              amount: amount,
              success: true
            }
          }));
          break;
        }
        
        case 'leverage_request':
          const { character, action } = data;
          const result = leverageEngine.calculateLeverage(character, action);
          
          ws.send(JSON.stringify({
            type: 'leverage_response',
            id: data.id,
            data: result
          }));
          break;
          
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: new Date().toISOString()
          }));
          break;
          
        default:
          // Send a proper response instead of echo to reduce client console noise
          ws.send(JSON.stringify({
            type: 'server_ack',
            timestamp: new Date().toISOString(),
            received: data.type || 'unknown'
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid JSON format'
      }));
    }
  });
  
  ws.on('close', () => {
    connections.delete(ws);
    clientData.delete(ws);
    // try { clearInterval(pushTimer); } catch {}
    console.log(`Client ${clientId} disconnected. Total connections: ${connections.size}`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    connections.delete(ws);
    clientData.delete(ws);
  });
});

// Start server
const PORT = process.env.PORT || 8001; // Changed to port 8001 to avoid conflicts
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Honey Comb Protocol Backend Server Started!');
  console.log(`📊 Leverage calculation engine initialized`);
  console.log(`🔌 WebSocket support enabled`);
  console.log(`🌐 CORS configured for frontend integration`);
  console.log(`🎯 Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 WebSocket: ws://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ FATAL ERROR: Port ${PORT} is already in use.`);
    console.error(`Please close the other process or use "npm run start:backend" to automatically kill it.`);
  } else {
    console.error('❌ An unexpected error occurred:', err);
  }
});
