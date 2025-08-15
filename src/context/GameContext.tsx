import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Character, Resource, Mission } from '../types/game';
import { SERVER_CONFIG, FEATURES } from '../config/appConfig';
import { HoneycombService } from '../services/honeycomb';

interface GameContextType {
  activeCharacter: Character | null;
  character: Character | null; // Alias for activeCharacter
  playerId: string | null;
  territories: any[];
  resources: Resource[];
  missions: Mission[];
  leverageMultiplier: number;
  leverageDetail?: any;
  loading: boolean;
  error: string | null;
  gameState: any; // General game state object
  world: any | null;
  harvestResults: {
    show: boolean;
    results?: {
      territory_name: string;
      multiplier: number;
      resources: Array<{
        type: string;
        base_amount: number;
        bonus_amount: number;
        total_amount: number;
      }>;
      total_value: number;
      mission_updates: Array<{
        id: string;
        type: string;
        previous_progress: number;
        new_progress: number;
        increase: number;
      }>;
    };
  };
  research?: Record<string, number>;
  sendMessage: (message: any) => void;
  getWorld: () => void;
  exploreSystem: (systemId: string) => void;
  moveUnits: (fromId: string, toId: string, amount: number) => void;
  attackPlanet: (fromId: string, planetId: string, amount: number) => void;
  harvestPlanet: (planetId: string) => void;
  buildSatellite: (planetId: string, cost?: number) => void;
  deployResearch: (tech?: string, cost?: number) => void;
  createCharacter: (character: Omit<Character, 'experience' | 'resources'>) => Promise<void>;
  claimTerritory: (territoryId: string) => Promise<void>;
  acceptMission: (missionId: string) => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  harvestResource: (resourceId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connection: _ } = useConnection();
  const { publicKey } = useWallet();
  
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(null);
  const [territories, setTerritories] = useState<any[]>([]);
  const [resources] = useState<Resource[]>([]); // Resource state managed by character
  const [missions, setMissions] = useState<Mission[]>([]);
  const [leverageMultiplier, setLeverageMultiplier] = useState(1.20);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [leverageDetail, setLeverageDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [world, setWorld] = useState<any | null>(null);
  const [harvestResults, setHarvestResults] = useState<{
    show: boolean;
    results?: any; // Made generic to support different result types
  }>({ show: false });

  // Track player id explicitly once the server assigns it
  const [playerIdOverride, setPlayerIdOverride] = useState<string | null>(null);
  // Derive a stable player id; prefer override from server, then wallet, then guest
  const playerId: string = playerIdOverride || (publicKey?.toString()) || (gameState as any)?.character?.wallet || 'guest_local';

  // Track WebSocket connection attempts
  const connectionAttemptsRef = useRef(0);
  
  // WebSocket connection setup
  const {
    sendMessage: wsSendMessage,
    lastMessage,
    readyState,
  } = useWebSocket(SERVER_CONFIG.WEBSOCKET_URL, {
    onOpen: () => {
      console.log('WebSocket Connected');
      connectionAttemptsRef.current = 0; // Reset counter on successful connection
    },
    onClose: () => {
      console.log(`WebSocket closed (attempt ${connectionAttemptsRef.current})`);
      connectionAttemptsRef.current += 1;
    },
    onError: () => {
      console.error(`WebSocket error (attempt ${connectionAttemptsRef.current})`);
      connectionAttemptsRef.current += 1;
    },
    shouldReconnect: () => {
      const shouldReconnect = SERVER_CONFIG.ENABLE_WEBSOCKET && 
        connectionAttemptsRef.current < SERVER_CONFIG.MAX_RECONNECT_ATTEMPTS;
      console.log(`Reconnect decision: ${shouldReconnect} (attempt ${connectionAttemptsRef.current})`);
      return shouldReconnect;
    },
    reconnectAttempts: SERVER_CONFIG.MAX_RECONNECT_ATTEMPTS,
    reconnectInterval: SERVER_CONFIG.RECONNECT_DELAY_MS,
    share: true, // Share a single WebSocket instance across hook instances
  }, SERVER_CONFIG.ENABLE_WEBSOCKET);
  
  // Track message count to limit processing
  const messageCountRef = useRef(0);
  // Late-bound offline handler ref to avoid TDZ when used before initialization
  const offlineHandlerRef = useRef<((message: any) => void) | null>(null);
  
  const handleWebSocketMessage = useCallback((data: any) => {
    // Skip processing after a certain threshold to prevent browser overload
    if (messageCountRef.current > 100 && data.type === 'world_state') {
      // Only process every 10th message after threshold
      if (messageCountRef.current % 10 !== 0) {
        return;
      }
    }
    
    try {
      switch (data.type) {
        case 'connection_status': {
          console.log('Connection status received');
          try {
            const cid = data.payload?.client_id;
            if (cid) {
              setPlayerIdOverride(cid);
              // Ensure gameState uses same wallet identifier for ownership checks
              setGameState((prev: any) => ({ ...(prev || {}), character: { ...(prev?.character || {}), wallet: cid } }));
            }
          } catch {}
          break;
        }
          
        case 'game_state_update':
          if (data.payload) {
            const { character, territories, missions, leverageMultiplier } = data.payload;
            
            // Update character state
            if (character) {
              setActiveCharacter(character);
            }
            
            // Update territories with validation
            if (Array.isArray(territories)) {
              setTerritories(territories);
            }
            
            // Update missions with validation
            if (Array.isArray(missions)) {
              setMissions(missions);
            }
            
            // Update leverage multiplier (server sends object with total)
            try {
              const lm = typeof leverageMultiplier === 'number' ? leverageMultiplier : (leverageMultiplier?.total ?? 1);
              if (typeof lm === 'number' && !isNaN(lm)) setLeverageMultiplier(lm);
              if (leverageMultiplier && typeof leverageMultiplier === 'object') setLeverageDetail(leverageMultiplier);
            } catch {}
          }
          break;

        case 'world_state': {
          const incoming = data.payload || null;
          
          setWorld(() => {
            const g = incoming ? { ...incoming } : null;
            return g;
          });
          
          break;
        }

        case 'world_state_update': {
          if (data.payload) {
            setWorld(data.payload);
          }
          break;
        }

        case 'explore_result':
          console.log('Explore system:', data.payload);
          // Merge into world snapshot
          setWorld((prev: any) => {
            if (!prev) return { galaxies: [{ id: 'galaxy-0', systems: [data.payload] }] };
            const g = { ...prev };
            const galaxy = g.galaxies?.[0];
            if (!galaxy) return { galaxies: [{ id: 'galaxy-0', systems: [data.payload] }] };
            const idx = galaxy.systems.findIndex((s: any) => s.id === data.payload.id);
            if (idx >= 0) galaxy.systems[idx] = data.payload; else galaxy.systems.push(data.payload);
            // Ensure starter ownership after exploration as well
            try {
              const walletId = (publicKey?.toString()) || (gameState?.character?.wallet) || 'guest_local';
              const owned = (galaxy.systems || []).some((s: any) => (s.planets || []).some((p: any) => p.controlledBy === walletId));
              if (!owned) {
                const firstSystem = galaxy.systems?.[0];
                const firstPlanet = firstSystem?.planets?.[0];
                if (firstPlanet) {
                  firstPlanet.controlledBy = walletId;
                  firstPlanet.defense = Math.max(3, Number(firstPlanet.defense) || 3);
                }
              }
            } catch {}
            return { ...g };
          });
          break;

        case 'units_moved':
          console.log('Units moved:', data.payload);
          // Trigger a visual path effect in 3D world
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('units-moved', { detail: data.payload } as any));
          }
          break;

        case 'attack_result': {
          const planetId = data.payload?.planet_id;
          const fromId = data.payload?.from_id || null;
          const currentOwner = data.payload?.current_owner;
          const newDefense = data.payload?.defense;
          const pos = data.payload?.position || null;
          const sourcePos = data.payload?.source_position || null;
          const success = data.payload?.success;
          const attackPower = data.payload?.attack_power;
          const defensePower = data.payload?.defense_power;
          // Log battle details
          console.log(`⚔️ Battle Result: ${success ? 'VICTORY' : 'DEFENSE'} at ${planetId} (${attackPower} vs ${defensePower})`);

          // Apply capture after a short visual delay to let effects play
          setTimeout(() => setWorld((prev: any) => {
            if (!prev) return prev;
            const g = { ...prev };
            const galaxy = g.galaxies?.[0];
            if (!galaxy) return g;
            for (const sys of galaxy.systems || []) {
              const idx = (sys.planets || []).findIndex((p: any) => p.id === planetId);
              if (idx >= 0) {
                const p = { ...sys.planets[idx] };
                // Update defense
                if (typeof newDefense === 'number') p.defense = newDefense;
                
                // Update ownership based on success
                if (success) {
                  p.controlledBy = currentOwner;
                }
                sys.planets[idx] = p;
                break;
              }
            }
            return { ...g };
          }), 2000);

          if (typeof window !== 'undefined') {
            // Broadcast comprehensive attack event with all battle details
            window.dispatchEvent(new CustomEvent('attack-result', { detail: {
              planetId,
              success: !!data.payload.success,
              newOwner: success ? currentOwner : null,  // Only set if attack succeeded
              currentOwner: currentOwner,
              defense: typeof newDefense === 'number' ? newDefense : null,
              position: pos || null,
              source_position: sourcePos,
              from_id: fromId,
              attack_power: data.payload?.attack_power,
              defense_power: data.payload?.defense_power,
              leverage_used: data.payload?.leverage_used,
              attacking_units: data.payload?.attacking_units,
              defending_units: data.payload?.defending_units,
              source_planets: data.payload?.source_planets
            }} as any));

            // Also trigger effect ring explicitly on attack
            window.dispatchEvent(new CustomEvent('territory-action', { detail: {
              territoryId: planetId,
              action: 'attack',
              position: pos || null
            }} as any));
          }
          break;
        }

        case 'battle_started':
          console.log('Battle started:', data.payload);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('battle-started', { detail: data.payload }));
          }
          break;

        case 'battle_update':
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('battle-update', { detail: data.payload } as any));
          }
          break;
          
        case 'error':
          if (typeof data.payload === 'string') {
            setError(data.payload);
            // Clear error after 5 seconds
            setTimeout(() => setError(null), 5000);
          }
          break;
          
        case 'harvest_result':
          if (data.payload) {
            setHarvestResults({
              show: true,
              results: data.payload
            });
            // Hide harvest results after 5 seconds
            setTimeout(() => {
              setHarvestResults(prev => ({ ...prev, show: false }));
            }, 5000);
          }
          break;

        case 'harvest_planet_result': {
          if (data.payload) {
            console.log('Harvested planet:', data.payload);
            
            // Update character resources
            setActiveCharacter(prev => {
              if (!prev) return prev;
              
              return {
                ...prev,
                resources: {
                  energy: (prev.resources?.energy || 0) + (data.payload.resources_gained?.energy || 0),
                  minerals: (prev.resources?.minerals || 0) + (data.payload.resources_gained?.minerals || 0)
                }
              };
            });
            
            // Show harvest results
            const energyGained = data.payload.resources_gained?.energy || 0;
            const mineralsGained = data.payload.resources_gained?.minerals || 0;
            const message = `Harvested ${energyGained} energy and ${mineralsGained} minerals`;
            
            setHarvestResults({ 
              show: true, 
              results: { 
                type: 'harvest', 
                message: message 
              } 
            });
            
            setTimeout(() => setHarvestResults(prev => ({ ...prev, show: false })), 3000);
            
            // Dispatch success notification
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('action-feedback', { 
                detail: { 
                  message: `✅ ${message}`, 
                  type: 'success' 
                } 
              } as any));
            }
            
            // Request fresh world/game state (server also pushes, but ensure sync)
            // try { wsSendMessage(JSON.stringify({ type: 'get_world' })); } catch {}
          }
          break;
        }

        case 'move_units_result': {
          if (data.payload) {
            console.log('Units moved:', data.payload);
            
            // Dispatch success notification
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('action-feedback', { 
                detail: { 
                  message: `✅ Units moved successfully`, 
                  type: 'success' 
                } 
              } as any));
            }
          }
          break;
        }
        
        case 'analysis_result':
          if (data.payload) {
            const { resource_efficiency, mission_efficiency, leverage_efficiency, recommendations } = data.payload;
            console.log('Game Analysis:', {
              resourceEfficiency: resource_efficiency,
              missionEfficiency: mission_efficiency,
              leverageEfficiency: leverage_efficiency,
              recommendations
            });
          }
          break;

        case 'exploration_result':
          if (data.payload) {
            console.log('Exploration completed:', data.payload);
            // Update territories if new sectors were discovered
            if (data.payload.new_territories) {
              setTerritories(prev => [...prev, ...data.payload.new_territories]);
            }
            // Show success message
            setHarvestResults({
              show: true,
              results: {
                type: 'exploration',
                message: `Discovered ${data.payload.sectors_found || 0} new sectors!`,
                territories: data.payload.new_territories || []
              }
            });
            setTimeout(() => {
              setHarvestResults(prev => ({ ...prev, show: false }));
            }, 5000);
          }
          break;

        case 'research_result': {
          if (data.payload) {
            const tech = data.payload.tech;
            const level = data.payload.level ?? data.payload.bonus;
            console.log('Research completed:', tech, 'level', level);
            // UI toast
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('action-feedback', { detail: { message: `🔬 Research ${tech} level ${level}`, type: 'success' } as any }));
            }
            // Visual cue in 3D
            try {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('research-update', { detail: { tech, level } } as any));
              }
            } catch {}
          }
          break;
        }

        case 'planet_updated':
          try {
            // Merge planet changes into world snapshot
            const { planet_id, defense, owner } = data.payload || {};
            setWorld((prev: any) => {
              if (!prev) return prev;
              const g = { ...prev };
              const galaxy = g.galaxies?.[0];
              if (!galaxy) return g;
              for (const sys of galaxy.systems || []) {
                const idx = (sys.planets || []).findIndex((p: any) => p.id === planet_id);
                if (idx >= 0) {
                  const p = { ...(sys.planets[idx] || {}) };
                  if (typeof defense === 'number') p.defense = defense;
                  if (owner) p.controlledBy = owner;
                  sys.planets[idx] = p;
                  break;
                }
              }
              return { ...g };
            });
          } catch {}
          break;

        case 'leverage_calculated':
          if (data.payload && typeof data.payload.total === 'number') {
            console.log('Leverage updated:', data.payload);
            setLeverageMultiplier(data.payload.total);
            setLeverageDetail(data.payload);
          }
          break;

        case 'leverage_changed':
          if (data.payload && typeof data.payload.total === 'number') {
            setLeverageMultiplier(data.payload.total);
            setLeverageDetail(data.payload);
          }
          break;
          
        case 'auto_harvest_result':
          if (data.payload) {
            console.log('Auto-harvest:', data.payload);
            // Optionally surface a toast
            setHarvestResults({
              show: true,
              results: {
                type: 'harvest',
                message: data.payload.message || 'Auto-harvest complete',
                harvested: data.payload.harvested || {}
              } as any
            });
            setTimeout(() => setHarvestResults(prev => ({ ...prev, show: false })), 4000);
          }
          break;

        case 'territory_action_result':
          if (data.payload) {
            console.log('Territory action:', data.payload);
            setHarvestResults({
              show: true,
              results: { type: 'territory', message: data.payload.message } as any
            });
            // Broadcast to world to render a quick effect
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('territory-action', { detail: {
                territoryId: data.payload.territory_id,
                action: data.payload.action,
                position: data.payload.position || null
              }} as any));
            }
            setTimeout(() => setHarvestResults(prev => ({ ...prev, show: false })), 2500);
          }
          break;

        case 'mission_accepted':
          if (data.payload) {
            console.log('Mission accepted:', data.payload);
            const pos = data.payload.target?.position;
            const mission = data.payload.mission;
            
            // Nudge camera toward mission target if provided
            if (pos && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('center-camera', { detail: { x: pos.x, y: pos.y, z: pos.z } } as any));
            }
            
            // Dispatch mission feedback event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('mission-accepted', { 
                detail: { 
                  mission,
                  target: data.payload.target,
                  message: `🎯 Mission "${mission?.title || 'Unknown'}" accepted! Objective: ${mission?.description || 'Check mission details'}`
                } 
              } as any));
            }
            
            setHarvestResults({
              show: true,
              results: { type: 'mission', message: 'Mission accepted. Target highlighted.' } as any
            });
            setTimeout(() => setHarvestResults(prev => ({ ...prev, show: false })), 2500);
          }
          break;

        case 'mission_update':
          if (data.payload) {
            const pos = data.payload.target?.position;
            if (pos && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('center-camera', { detail: { x: pos.x, y: pos.y, z: pos.z, force: true } } as any));
            }
          }
          break;

        case 'defense_result':
          if (data.payload) {
            console.log('Defense completed:', data.payload);
            // Update game state if defense was successful
            if (data.payload.success) {
              // Update territories or character as needed
              if (data.payload.gameState) {
                setGameState(data.payload.gameState);
              }
            }
          }
          break;
          
        case 'new_missions_result':
          if (data.payload && Array.isArray(data.payload.missions)) {
            console.log('New missions received:', data.payload.missions);
            setMissions(prev => [...prev, ...data.payload.missions]);
          }
          break;
          
        case 'execute_strategy':
        case 'strategy_result':
          if (data.payload) {
            console.log('Strategy executed:', data.payload);
            const strategy = data.payload.strategy;
            const message = data.payload.message;
            const success = data.payload.success;
            
            // Update game state based on strategy results
            if (data.payload.gameState) {
              setGameState(data.payload.gameState);
            }
            
            // Dispatch strategy feedback event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('strategy-executed', { 
                detail: { 
                  strategy,
                  message: message || 'Strategy executed successfully',
                  success: success !== false,
                  detailedMessage: `🎯 Strategy "${strategy || 'Unknown'}" executed! Result: ${message || 'No details provided'}`
                } 
              } as any));
            }
            
            if (data.payload.message) {
              console.log('Strategy result:', data.payload.message);
            }
          }
          break;
          
        case 'tutorial_skipped_ack':
          // Acknowledge tutorial skip - no action needed
          break;

        case 'echo':
        case 'server_ack':
          // Silently handle echo and acknowledgment messages from server
          break;
          
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
      setError('Error processing game update');
    }
  }, [publicKey, gameState, playerId]);

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        messageCountRef.current += 1;
        
        // Handle ping/pong separately for performance
        if (data.type === 'ping') {
          wsSendMessage(JSON.stringify({ type: 'pong' }));
          return;
        }
        
        // Log only non-ping/pong messages and limit logging frequency
        if (data.type !== 'echo' && data.type !== 'server_ack' && 
            data.type !== 'world_state' || messageCountRef.current % 100 === 0) {
          console.log(`Processing message #${messageCountRef.current}: ${data.type}`);
        }
        
        handleWebSocketMessage(data);
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    }
  }, [lastMessage, wsSendMessage, handleWebSocketMessage]);

  const createCharacter = async (character: Omit<Character, 'experience' | 'resources'>) => {
    if (readyState !== ReadyState.OPEN) {
      throw new Error('Not connected to game server');
    }

    // Allow guest mode if no wallet is connected
    const walletId = publicKey ? publicKey.toString() : `guest_${Date.now()}`;

    setLoading(true);
    setError(null);

    try {
      wsSendMessage(JSON.stringify({
        type: 'create_character',
        payload: {
          ...character,
          wallet: walletId
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const claimTerritory = async (territoryId: string) => {
    if (readyState !== ReadyState.OPEN) {
      throw new Error('Not connected to game server');
    }
    
    const walletId = publicKey ? publicKey.toString() : `guest_${Date.now()}`;

    setLoading(true);
    setError(null);

    try {
      wsSendMessage(JSON.stringify({
        type: 'claim_territory',
        payload: {
          territoryId,
          wallet: walletId
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to claim territory');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getWorld = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      wsSendMessage(JSON.stringify({ type: 'get_world' }));
    } else {
      // Fallback to offline mock generation so the UI loads even without backend
      try {
        offlineHandlerRef.current?.({ type: 'get_world' });
      } catch {
        // no-op
      }
    }
  }, [readyState, wsSendMessage]);

  // Expose a global helper for GameWorld to request world on toggle without import cycles
  useEffect(() => {
    (window as any).requestWorld = () => {
      try { getWorld(); } catch {}
    };
    return () => { try { delete (window as any).requestWorld; } catch {} };
  }, [readyState, getWorld]);

  // Unified sender placed BEFORE action creators to avoid TDZ on references
  const sendMessage = useCallback((message: any) => {
    // Always use offline mode if configured that way
    if (FEATURES.USE_OFFLINE_SERVICES) {
      if (FEATURES.DEBUG_LOGGING) {
        console.log('Using offline mode for message:', message);
      }
      try { offlineHandlerRef.current?.(message); } catch {}
      return;
    }
    // Otherwise try WebSocket if available
    if (readyState === ReadyState.OPEN) {
      wsSendMessage(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, falling back to offline mode:', message);
      try { offlineHandlerRef.current?.(message); } catch {}
    }
  }, [readyState, wsSendMessage]);

  const exploreSystem = useCallback((systemId: string) => {
    if (readyState !== ReadyState.OPEN) return;
    wsSendMessage(JSON.stringify({ type: 'explore_system', system_id: systemId }));
    
    // Track exploration with Honeycomb Protocol
    const honeycombService = new HoneycombService();
    if (playerId) {
      honeycombService.recordExploration(playerId, systemId)
        .then(() => console.log('Exploration recorded in Honeycomb Protocol'))
        .catch(err => console.error('Error recording exploration:', err));
    }
  }, [readyState, wsSendMessage, playerId]);

  const moveUnits = useCallback((fromId: string, toId: string, amount: number) => {
    // Route through unified sender so offline mode works too
    sendMessage({ type: 'move_units', from_id: fromId, to_id: toId, amount });
  }, [sendMessage]);

  const attackPlanet = useCallback((fromId: string, planetId: string, amount: number) => {
    // Route through unified sender so offline mode works too
    sendMessage({ type: 'attack_planet', from_id: fromId, planet_id: planetId, amount });
    
    // Track combat with Honeycomb Protocol
    const honeycombService = new HoneycombService();
    if (playerId) {
      // We'll update the success status when we get the response from the server
      // For now, just record that an attack was attempted
      honeycombService.recordCombatResult(playerId, null, planetId, true)
        .then(() => console.log('Combat recorded in Honeycomb Protocol'))
        .catch(err => console.error('Error recording combat:', err));
    }
  }, [sendMessage, playerId]);

  const harvestPlanet = useCallback((planetId: string) => {
    // Route through unified sender so offline mode works too
    sendMessage({ type: 'harvest_planet', planet_id: planetId });
    
    // Track harvest with Honeycomb Protocol
    const honeycombService = new HoneycombService();
    if (playerId) {
      honeycombService.recordHarvest(playerId, planetId, { energy: 25, minerals: 15 })
        .then(() => console.log('Harvest recorded in Honeycomb Protocol'))
        .catch(err => console.error('Error recording harvest:', err));
    }
  }, [sendMessage, playerId]);

  const buildSatellite = useCallback((planetId: string, cost: number = 25) => {
    sendMessage({ type: 'build_satellite', planet_id: planetId, cost });
  }, [sendMessage]);

  const deployResearch = useCallback((tech: string = 'attack_boost', cost: number = 20) => {
    sendMessage({ type: 'deploy_research', tech, cost });
  }, [sendMessage]);

  const acceptMission = async (missionId: string) => {
    if (readyState !== ReadyState.OPEN) {
      throw new Error('Not connected to game server');
    }
    
    const walletId = publicKey ? publicKey.toString() : `guest_${Date.now()}`;

    setLoading(true);
    setError(null);

    try {
      wsSendMessage(JSON.stringify({
        type: 'accept_mission',
        payload: {
          missionId,
          wallet: walletId
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept mission');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeMission = async (missionId: string) => {
    if (readyState !== ReadyState.OPEN) {
      throw new Error('Not connected to game server');
    }
    
    const walletId = publicKey ? publicKey.toString() : `guest_${Date.now()}`;

    setLoading(true);
    setError(null);

    try {
      wsSendMessage(JSON.stringify({
        type: 'complete_mission',
        payload: {
          missionId,
          wallet: walletId
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete mission');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const harvestResource = async (resourceId: string) => {
    if (readyState !== ReadyState.OPEN) {
      throw new Error('Not connected to game server');
    }
    
    const walletId = publicKey ? publicKey.toString() : `guest_${Date.now()}`;

    setLoading(true);
    setError(null);

    try {
      wsSendMessage(JSON.stringify({
        type: 'harvest_resource',
        payload: {
          resourceId,
          wallet: walletId
        }
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to harvest resource');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Generate a mock world for offline mode
  const generateMockWorld = useCallback(() => {
    // Create a simple galaxy structure
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
          const controlled = Math.random() > 0.7;
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
    
    return {
      galaxies: [mockGalaxy],
      timestamp: Date.now()
    };
  }, []);

  // Handle messages in offline mode
  const handleOfflineMessage = useCallback((message: any) => {
    switch (message.type) {
      case 'get_world':
        // Generate a mock world response
        setTimeout(() => {
          const mockWorld = generateMockWorld();
          setWorld(mockWorld);
          
          // Dispatch a custom event to notify components
          window.dispatchEvent(new CustomEvent('world-updated', { 
            detail: { world: mockWorld } 
          }));
        }, 300);
        break;
        
      case 'territory_action':
        // Handle territory actions
        setTimeout(() => {
          // Simulate territory action response
          window.dispatchEvent(new CustomEvent('territory-action', { 
            detail: { 
              territoryId: message.territory_id,
              action: message.action,
              success: true
            } 
          }));
        }, 200);
        break;
        
      default:
        if (FEATURES.DEBUG_LOGGING) {
          console.log('Unhandled offline message type:', message.type);
        }
        break;
    }
  }, []);

  // Bind the ref after initialization to avoid TDZ
  useEffect(() => {
    offlineHandlerRef.current = handleOfflineMessage;
  }, [handleOfflineMessage]);

  

  /* Connection status mapping for potential UI use
  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Connecting',
    [ReadyState.OPEN]: 'Open',
    [ReadyState.CLOSING]: 'Closing',
    [ReadyState.CLOSED]: 'Closed',
    [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
  }[readyState as ReadyState];
  */

  const value = {
    activeCharacter,
    character: activeCharacter, // Alias for activeCharacter
    playerId,
    territories,
    resources,
    missions,
    leverageMultiplier,
    leverageDetail,
    loading,
    error,
    gameState,
    world,
    harvestResults,
    sendMessage,
    getWorld,
    exploreSystem,
    moveUnits,
    attackPlanet,
    harvestPlanet,
    buildSatellite,
    deployResearch,
    createCharacter,
    claimTerritory,
    acceptMission,
    completeMission,
    harvestResource
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    // During HMR or transient unmounts, return a benign fallback to avoid crashes
    return {
      activeCharacter: null,
      character: null,
      territories: [],
      resources: [],
      missions: [],
      leverageMultiplier: 1,
      loading: false,
      error: null,
      gameState: null,
      world: null,
      harvestResults: { show: false },
      sendMessage: () => {},
      getWorld: () => {},
      exploreSystem: () => {},
      moveUnits: () => {},
      attackPlanet: () => {},
      createCharacter: async () => {},
      claimTerritory: async () => {},
      acceptMission: async () => {},
      completeMission: async () => {},
      harvestResource: async () => {}
    } as any;
  }
  return context;
};