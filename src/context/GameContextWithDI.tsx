import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Character, Territory, Resource, Mission } from '../types/game';
import { container, ServiceTokens, initializeServices } from '../services/ServiceContainer';
import { LeverageService } from '../services/LeverageService';
import { HoneycombService } from '../services/honeycomb';
import { ResourceManager } from '../services/ResourceManager';
import { CombatSystem } from '../services/CombatSystem';
import { TerritoryManager } from '../services/TerritoryManager';
import { optimizationManager } from '../systems/OptimizationManager';
import { monitoringSystem } from '../systems/MonitoringSystem';
import { validator } from '../utils/validation';
import { SecurityLogger } from '../utils/security';

interface GameState {
  activeCharacter: Character | null;
  territories: Territory[];
  resources: Resource[];
  missions: Mission[];
  isLoading: boolean;
  error: string | null;
}

interface GameActions {
  setActiveCharacter: (character: Character | null) => void;
  updateCharacter: (updates: Partial<Character>) => void;
  addTerritory: (territory: Territory) => void;
  updateTerritory: (id: string, updates: Partial<Territory>) => void;
  addResource: (resource: Resource) => void;
  consumeResource: (type: string, amount: number) => void;
  startMission: (mission: Mission) => Promise<void>;
  completeMission: (missionId: string) => Promise<void>;
  calculateLeverage: (action: any) => Promise<any>;
  gatherResources: (territory: Territory) => Promise<any>;
  initiateCombat: (defender: Character) => Promise<any>;
  // Service accessors
  getLeverageService: () => LeverageService;
  getHoneycombService: () => HoneycombService;
  getResourceManager: () => ResourceManager;
  getCombatSystem: () => CombatSystem;
  getTerritoryManager: () => TerritoryManager;
}

interface GameContextValue extends GameState, GameActions {
  isInitialized: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>({
    activeCharacter: null,
    territories: [],
    resources: [],
    missions: [],
    isLoading: true,
    error: null
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize services and systems
  useEffect(() => {
    const initialize = async () => {
      try {
        setGameState(prev => ({ ...prev, isLoading: true, error: null }));

        // Initialize dependency injection
        initializeServices();

        // Initialize systems
        optimizationManager.initialize();
        monitoringSystem.initialize();

        // Load initial game data
        await loadInitialGameData();

        setIsInitialized(true);
        setGameState(prev => ({ ...prev, isLoading: false }));

        SecurityLogger.logEvent('Game context initialized', {}, 'low');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setGameState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
        SecurityLogger.logEvent('Game context initialization failed', { error: errorMessage }, 'high');
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      optimizationManager.dispose?.();
      monitoringSystem.shutdown();
    };
  }, []);

  const loadInitialGameData = async () => {
    try {
      const honeycomb = container.get<HoneycombService>(ServiceTokens.HONEYCOMB_SERVICE);
      const territoryManager = container.get<TerritoryManager>(ServiceTokens.TERRITORY_MANAGER);
      
      // Load missions
      const missions = await honeycomb.getMissions();
      
      // Load territories
      const territories = await territoryManager.getAllTerritories();

      setGameState(prev => ({
        ...prev,
        missions,
        territories
      }));
    } catch (error) {
      console.error('Failed to load initial game data:', error);
    }
  };

  // Game actions using DI services
  const setActiveCharacter = (character: Character | null) => {
    if (character) {
      const validation = validator.validateCharacter(character);
      if (!validation.isValid) {
        setGameState(prev => ({ ...prev, error: `Invalid character: ${validation.errors.join(', ')}` }));
        return;
      }
    }

    setGameState(prev => ({ ...prev, activeCharacter: character, error: null }));
    SecurityLogger.logEvent('Active character changed', { characterName: character?.name }, 'low');
  };

  const updateCharacter = (updates: Partial<Character>) => {
    if (!gameState.activeCharacter) return;

    const updatedCharacter = { ...gameState.activeCharacter, ...updates };
    const validation = validator.validateCharacter(updatedCharacter);
    
    if (!validation.isValid) {
      setGameState(prev => ({ ...prev, error: `Invalid character update: ${validation.errors.join(', ')}` }));
      return;
    }

    setGameState(prev => ({
      ...prev,
      activeCharacter: updatedCharacter,
      error: null
    }));
  };

  const addTerritory = (territory: Territory) => {
    const validation = validator.validateTerritory(territory);
    if (!validation.isValid) {
      setGameState(prev => ({ ...prev, error: `Invalid territory: ${validation.errors.join(', ')}` }));
      return;
    }

    setGameState(prev => ({
      ...prev,
      territories: [...prev.territories, territory]
    }));
  };

  const updateTerritory = (id: string, updates: Partial<Territory>) => {
    setGameState(prev => ({
      ...prev,
      territories: prev.territories.map(t => 
        t.id === id ? { ...t, ...updates } : t
      )
    }));
  };

  const addResource = async (resource: Resource) => {
    const validation = validator.validateResource(resource);
    if (!validation.isValid) {
      setGameState(prev => ({ ...prev, error: `Invalid resource: ${validation.errors.join(', ')}` }));
      return;
    }

    try {
      const resourceManager = container.get<ResourceManager>(ServiceTokens.RESOURCE_MANAGER);
      await resourceManager.addResource(resource);
      
      setGameState(prev => ({
        ...prev,
        resources: [...prev.resources, resource]
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGameState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  const consumeResource = async (type: string, amount: number) => {
    if (!gameState.activeCharacter) return;

    try {
      const resourceManager = container.get<ResourceManager>(ServiceTokens.RESOURCE_MANAGER);
      await resourceManager.consumeResource(gameState.activeCharacter, type, amount);
      
      // Update character resources
      updateCharacter({
        resources: {
          ...gameState.activeCharacter.resources,
          [type]: (gameState.activeCharacter.resources[type] || 0) - amount
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGameState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  const startMission = async (mission: Mission) => {
    if (!gameState.activeCharacter) return;

    try {
      const honeycomb = container.get<HoneycombService>(ServiceTokens.HONEYCOMB_SERVICE);
      await honeycomb.startMission(gameState.activeCharacter, mission);
      
      // Update missions list
      setGameState(prev => ({
        ...prev,
        missions: prev.missions.map(m => 
          m.id === mission.id ? { ...m, status: 'active' } : m
        )
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGameState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  const completeMission = async (missionId: string) => {
    if (!gameState.activeCharacter) return;

    try {
      const mission = gameState.missions.find(m => m.id === missionId);
      if (!mission) return;

      // Update character with mission rewards
      if (mission.rewards) {
        const experienceGain = mission.rewards.xp || 0;
        const resourceRewards = mission.rewards.resources || [];

        updateCharacter({
          experience: gameState.activeCharacter.experience + experienceGain,
          resources: {
            ...gameState.activeCharacter.resources,
            ...resourceRewards.reduce((acc, r) => ({ ...acc, [r.type]: (gameState.activeCharacter!.resources[r.type] || 0) + r.amount }), {})
          }
        });
      }

      // Update mission status
      setGameState(prev => ({
        ...prev,
        missions: prev.missions.map(m => 
          m.id === missionId ? { ...m, status: 'completed' } : m
        )
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGameState(prev => ({ ...prev, error: errorMessage }));
    }
  };

  const calculateLeverage = async (action: any) => {
    if (!gameState.activeCharacter) throw new Error('No active character');

    const leverageService = container.get<LeverageService>(ServiceTokens.LEVERAGE_SERVICE);
    return await leverageService.calculateLeverage(gameState.activeCharacter, action);
  };

  const gatherResources = async (territory: Territory) => {
    if (!gameState.activeCharacter) throw new Error('No active character');

    const resourceManager = container.get<ResourceManager>(ServiceTokens.RESOURCE_MANAGER);
    const leverageService = container.get<LeverageService>(ServiceTokens.LEVERAGE_SERVICE);

    const leverageResult = await leverageService.calculateLeverage(gameState.activeCharacter, {
      action: 'gather',
      territory: territory.id,
      resources: territory.resources?.map(r => r.type) || []
    });

    return await resourceManager.gatherResources(gameState.activeCharacter, territory, leverageResult);
  };

  const initiateCombat = async (defender: Character) => {
    if (!gameState.activeCharacter) throw new Error('No active character');

    const combatSystem = container.get<CombatSystem>(ServiceTokens.COMBAT_SYSTEM);
    return await combatSystem.resolveCombat(gameState.activeCharacter, defender);
  };

  // Service accessors
  const getLeverageService = () => container.get<LeverageService>(ServiceTokens.LEVERAGE_SERVICE);
  const getHoneycombService = () => container.get<HoneycombService>(ServiceTokens.HONEYCOMB_SERVICE);
  const getResourceManager = () => container.get<ResourceManager>(ServiceTokens.RESOURCE_MANAGER);
  const getCombatSystem = () => container.get<CombatSystem>(ServiceTokens.COMBAT_SYSTEM);
  const getTerritoryManager = () => container.get<TerritoryManager>(ServiceTokens.TERRITORY_MANAGER);

  const contextValue: GameContextValue = {
    ...gameState,
    isInitialized,
    setActiveCharacter,
    updateCharacter,
    addTerritory,
    updateTerritory,
    addResource,
    consumeResource,
    startMission,
    completeMission,
    calculateLeverage,
    gatherResources,
    initiateCombat,
    getLeverageService,
    getHoneycombService,
    getResourceManager,
    getCombatSystem,
    getTerritoryManager
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
};

// Backward compatibility export
export const useGame = useGameContext;
