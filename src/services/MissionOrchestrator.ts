import { HoneycombService } from './honeycomb';
import { LeverageService } from './LeverageService';
import { Character, Mission, Territory, FactionType } from '../types/game';
import { PublicKey } from '@solana/web3.js';

interface MissionResult {
  success: boolean;
  leverageMultiplier: number;
  rewards: {
    xp: number;
    resources: Array<{ type: string; amount: number }>;
  };
  traitGains: Array<{ type: string; increase: number }>;
  territoryInfluence?: number;
}

export class MissionOrchestrator {
  private honeycomb: HoneycombService;
  private leverageSystem: LeverageService;
  private missionCache: Map<string, Mission>;
  private territoryStates: Map<string, Territory>;

  constructor(honeycomb: HoneycombService) {
    this.honeycomb = honeycomb;
    this.leverageSystem = new LeverageService();
    this.missionCache = new Map();
    this.territoryStates = new Map();
  }

  async initializeMissionPool(territory: Territory): Promise<void> {
    // Generate dynamic missions based on territory state
    const baseMissions = await this.honeycomb.getMissions();
    const territoryMissions = baseMissions.map(mission => ({
      ...mission,
      territoryInfluence: this.calculateTerritoryInfluence(mission, territory)
    }));

    // Cache the missions
    territoryMissions.forEach(mission => {
      this.missionCache.set(mission.id, mission);
    });

    // Update territory state
    this.territoryStates.set(territory.id, territory);
  }

  private calculateTerritoryInfluence(mission: Mission, territory: Territory): number {
    // Calculate how much this mission affects territory control
    const baseInfluence = mission.requiredLevel * 0.1;
    const contestedMultiplier = territory.contestedBy.length > 0 ? 1.5 : 1;
    return baseInfluence * contestedMultiplier;
  }

  async orchestrateMission(
    character: Character,
    missionId: string
  ): Promise<MissionResult> {
    const mission = this.missionCache.get(missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }

    try {
      // Get leverage analysis
      const analysis = await this.leverageSystem.analyzeMissionCompletion(
        character,
        mission
      );

      // Calculate trait evolution potential
      const traitMultiplier = await this.leverageSystem.calculateTraitEvolution(
        character,
        character.traits[0].type // Use primary trait for now
      );

      // Apply intelligent scaling based on character state
      const scaledRewards = this.calculateScaledRewards(
        mission.rewards,
        analysis.exponentialValue,
        traitMultiplier
      );

      // Calculate trait gains
      const traitGains = this.calculateTraitGains(
        character,
        mission,
        traitMultiplier
      );

      // Calculate territory influence if applicable
      const territoryInfluence = mission.territoryInfluence 
        ? mission.territoryInfluence * analysis.exponentialValue 
        : 0;

      // Execute mission on-chain
      const tx = await this.honeycomb.startMission(character, {
        ...mission,
        rewards: scaledRewards
      });

      return {
        success: true,
        leverageMultiplier: analysis.exponentialValue,
        rewards: scaledRewards,
        traitGains,
        territoryInfluence
      };
    } catch (error) {
      console.error('Mission orchestration failed:', error);
      return {
        success: false,
        leverageMultiplier: 1,
        rewards: { xp: 0, resources: [] },
        traitGains: []
      };
    }
  }

  private calculateScaledRewards(
    baseRewards: Mission['rewards'],
    leverageMultiplier: number,
    traitMultiplier: number
  ) {
    const combinedMultiplier = leverageMultiplier * traitMultiplier;
    return {
      xp: Math.floor(baseRewards.xp * combinedMultiplier),
      resources: baseRewards.resources.map(resource => ({
        type: resource.type,
        amount: Math.floor(resource.amount * combinedMultiplier)
      }))
    };
  }

  private calculateTraitGains(
    character: Character,
    mission: Mission,
    traitMultiplier: number
  ) {
    return character.traits.map(trait => {
      // Base gain is level-dependent
      const baseGain = 0.1 * character.level;
      
      // Apply mission-specific bonuses
      const missionBonus = mission.requiredTraits?.some(req => req.type === trait.type)
        ? 0.2  // 20% bonus for required traits
        : 0.1; // 10% for others

      return {
        type: trait.type,
        increase: baseGain * missionBonus * traitMultiplier
      };
    });
  }

  async updateTerritoryControl(
    territory: Territory,
    factionResults: Map<FactionType, number>
  ): Promise<Territory> {
    // Calculate total influence
    const totalInfluence = Array.from(factionResults.values())
      .reduce((sum, value) => sum + value, 0);

    // Find faction with highest influence
    let maxInfluence = 0;
    let dominantFaction: FactionType | null = null;

    factionResults.forEach((influence, faction) => {
      if (influence > maxInfluence) {
        maxInfluence = influence;
        dominantFaction = faction;
      }
    });

    // Update territory state
    const updatedTerritory = {
      ...territory,
      controlledBy: dominantFaction,
      contestedBy: Array.from(factionResults.keys()).filter(faction => 
        faction !== dominantFaction && 
        factionResults.get(faction)! > totalInfluence * 0.3 // Contest threshold: 30%
      )
    };

    // Update cache
    this.territoryStates.set(territory.id, updatedTerritory);

    // Update on-chain state
    await this.honeycomb.updateTerritoryState(updatedTerritory);

    return updatedTerritory;
  }

  async getFactionProgress(territory: Territory): Promise<Map<FactionType, number>> {
    const progress = new Map<FactionType, number>();
    
    // Get all mission completions for this territory
    const completions = await this.honeycomb.getMissionCompletions(territory.id);
    
    // Aggregate results by faction
    completions.forEach(completion => {
      const currentInfluence = progress.get(completion.faction) || 0;
      progress.set(
        completion.faction,
        currentInfluence + (completion.territoryInfluence || 0)
      );
    });

    return progress;
  }

  async getOptimalMissionPath(character: Character): Promise<Mission[]> {
    // Get recommended mission path from leverage system
    const optimalPath = await this.leverageSystem.getOptimalMissionPath(character);
    
    // Map path names to actual mission objects
    return optimalPath
      .map(missionName => 
        Array.from(this.missionCache.values())
          .find(m => m.name === missionName)
      )
      .filter((mission): mission is Mission => mission !== undefined);
  }
}