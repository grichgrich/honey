import { Territory, FactionType, Character } from '../types/game';
import { HoneycombService } from './honeycomb';
import { LeverageService } from './LeverageService';
import { MissionOrchestrator } from './MissionOrchestrator';
import * as THREE from 'three';

interface TerritoryState {
  territory: Territory;
  influenceMap: Map<FactionType, number>;
  contestThreshold: number;
  strategicValue: number;
}

export class TerritoryManager {
  private territories: Map<string, TerritoryState>;
  private honeycomb: HoneycombService;
  private leverageSystem: LeverageService;
  private missionOrchestrator: MissionOrchestrator;

  constructor(
    honeycomb: HoneycombService,
    missionOrchestrator: MissionOrchestrator
  ) {
    this.territories = new Map();
    this.honeycomb = honeycomb;
    this.leverageSystem = new LeverageService();
    this.missionOrchestrator = missionOrchestrator;
  }

  async initializeTerritory(territory: Territory): Promise<void> {
    // Initialize territory missions
    await this.missionOrchestrator.initializeMissionPool(territory);

    // Get current influence state
    const influenceMap = await this.missionOrchestrator.getFactionProgress(territory);

    // Calculate strategic value
    const strategicValue = this.calculateStrategicValue(territory);

    this.territories.set(territory.id, {
      territory,
      influenceMap,
      contestThreshold: 0.3, // 30% of total influence needed to contest
      strategicValue
    });
  }

  private calculateStrategicValue(territory: Territory): number {
    // Base value
    let value = 1.0;

    // Position-based value (central territories are more valuable)
    const distanceFromCenter = new THREE.Vector3(
      territory.position.x,
      territory.position.y,
      territory.position.z
    ).length();
    value *= 1 + (1 / (1 + distanceFromCenter));

    // Contested territories are more valuable
    if (territory.contestedBy.length > 0) {
      value *= 1.5;
    }

    // Resource-rich territories are more valuable
    // This would be based on territory-specific resources
    // For now, using a placeholder calculation
    value *= 1 + (territory.position.y * 0.1); // Higher territories have more resources

    return value;
  }

  async updateTerritoryControl(territoryId: string): Promise<void> {
    const state = this.territories.get(territoryId);
    if (!state) return;

    // Get updated influence data
    const newInfluenceMap = await this.missionOrchestrator.getFactionProgress(
      state.territory
    );

    // Calculate total influence
    const totalInfluence = Array.from(newInfluenceMap.values())
      .reduce((sum, value) => sum + value, 0);

    // Determine control and contestation
    let maxInfluence = 0;
    let dominantFaction: FactionType | null = null;
    const contestingFactions: FactionType[] = [];

    newInfluenceMap.forEach((influence, faction) => {
      if (influence > maxInfluence) {
        maxInfluence = influence;
        dominantFaction = faction;
      }
      if (influence > totalInfluence * state.contestThreshold) {
        contestingFactions.push(faction);
      }
    });

    // Update territory state
    const updatedTerritory: Territory = {
      ...state.territory,
      controlledBy: dominantFaction,
      contestedBy: contestingFactions.filter(f => f !== dominantFaction),
      missionProgress: Object.fromEntries(newInfluenceMap)
    };

    // Update local state
    this.territories.set(territoryId, {
      ...state,
      territory: updatedTerritory,
      influenceMap: newInfluenceMap
    });

    // Update on-chain state
    await this.honeycomb.updateTerritoryState(updatedTerritory);
  }

  async getOptimalStrategy(
    character: Character,
    territoryId: string
  ): Promise<{
    recommendedMissions: string[];
    estimatedInfluence: number;
    strategicValue: number;
  }> {
    const state = this.territories.get(territoryId);
    if (!state) {
      throw new Error('Territory not found');
    }

    // Get optimal mission path
    const optimalPath = await this.missionOrchestrator.getOptimalMissionPath(character);

    // Calculate potential influence gain
    const estimatedInfluence = optimalPath.reduce((total, mission) => {
      const baseInfluence = mission.requiredLevel * 0.1;
      return total + baseInfluence;
    }, 0);

    return {
      recommendedMissions: optimalPath.map(m => m.id),
      estimatedInfluence,
      strategicValue: state.strategicValue
    };
  }

  async getFactionStrategicPositions(faction: FactionType): Promise<Territory[]> {
    const strategicTerritories: Territory[] = [];

    for (const [_, state] of this.territories) {
      const { territory, strategicValue, influenceMap } = state;

      // Calculate faction's current influence
      const factionInfluence = influenceMap.get(faction) || 0;
      const totalInfluence = Array.from(influenceMap.values())
        .reduce((sum, value) => sum + value, 0);
      
      // Territory is strategic if:
      // 1. Controlled by faction but contested
      // 2. Not controlled but close to being captured
      // 3. High strategic value
      if (
        (territory.controlledBy === faction && territory.contestedBy.length > 0) ||
        (territory.controlledBy !== faction && factionInfluence > totalInfluence * 0.4) ||
        strategicValue > 1.5
      ) {
        strategicTerritories.push(territory);
      }
    }

    // Sort by strategic importance
    return strategicTerritories.sort((a, b) => {
      const stateA = this.territories.get(a.id);
      const stateB = this.territories.get(b.id);
      return (stateB?.strategicValue || 0) - (stateA?.strategicValue || 0);
    });
  }

  getVisualData(territoryId: string): {
    position: THREE.Vector3;
    color: THREE.Color;
    scale: number;
  } {
    const state = this.territories.get(territoryId);
    if (!state) {
      throw new Error('Territory not found');
    }

    // Create position vector
    const position = new THREE.Vector3(
      state.territory.position.x,
      state.territory.position.y,
      state.territory.position.z
    );

    // Calculate color based on control and contestation
    let color: THREE.Color;
    if (state.territory.controlledBy === null) {
      color = new THREE.Color(0x808080); // Neutral gray
    } else {
      // Get faction color
      const baseColor = this.getFactionColor(state.territory.controlledBy);
      color = new THREE.Color(baseColor);

      // Adjust color based on contestation
      if (state.territory.contestedBy.length > 0) {
        color.lerp(new THREE.Color(0xff0000), 0.3); // Blend with red for contested
      }
    }

    // Scale based on strategic value
    const scale = 1 + (state.strategicValue - 1) * 0.5;

    return { position, color, scale };
  }

  private getFactionColor(faction: FactionType | string): number {
    if (typeof faction === 'string') {
      // Convert string to FactionType colors
      switch (faction) {
        case 'Sun': return 0xffd700;
        case 'Ocean': return 0x4169e1;
        case 'Forest': return 0x228b22;
        case 'Red': return 0xff4444;
        case 'Blue': return 0x4444ff;
        case 'Green': return 0x44ff44;
        default: return 0x808080;
      }
    }
    
    switch (faction) {
      case FactionType.Sun:
        return 0xffd700; // Gold
      case FactionType.Ocean:
        return 0x4169e1; // Royal Blue
      case FactionType.Forest:
        return 0x228b22; // Forest Green
      default:
        return 0x808080; // Gray
    }
  }

  // Missing methods for FactionDynamics integration
  async getTerritoryById(territoryId: string): Promise<Territory | null> {
    const state = this.territories.get(territoryId);
    return state ? state.territory : null;
  }

  getTerritoryByIdSync(territoryId: string): Territory | null {
    const state = this.territories.get(territoryId);
    return state ? state.territory : null;
  }

  // Missing method for TestEnvironment
  async calculateInfluence(character: Character, territory: Territory): Promise<number> {
    const state = this.territories.get(territory.id);
    if (!state) return 0;

    // Calculate base influence from character level and traits
    let influence = character.level * 10;
    
    // Add trait bonuses
    character.traits?.forEach(trait => {
      switch (trait.type) {
        case 'Charisma':
          influence += (trait.level || 1) * 5;
          break;
        case 'Wisdom':
          influence += (trait.level || 1) * 3;
          break;
      }
    });

    // Territory modifiers
    if (territory.controlledBy === character.faction) {
      influence *= 1.5; // Friendly territory bonus
    }

    return influence;
  }

  // Additional utility methods
  async getAllTerritories(): Promise<Territory[]> {
    return Array.from(this.territories.values()).map(state => state.territory);
  }

  async getTerritoriesByFaction(faction: FactionType | string): Promise<Territory[]> {
    return Array.from(this.territories.values())
      .filter(state => state.territory.controlledBy === faction)
      .map(state => state.territory);
  }
}