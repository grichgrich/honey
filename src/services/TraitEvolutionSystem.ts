import { Character, TraitType, Mission } from '../types/game';
import { LeverageService } from './LeverageService';
import { HoneycombService } from './honeycomb';
import * as THREE from 'three';

interface TraitEvolutionPath {
  trait: TraitType;
  levels: Array<{
    level: number;
    requirements: {
      xp: number;
      traits?: Array<{ type: TraitType; minLevel: number }>;
      missions?: string[];
    };
    bonuses: {
      type: 'multiplicative' | 'additive';
      value: number;
      affects: string[];
    }[];
  }>;
}

interface EvolutionOpportunity {
  trait: TraitType;
  currentLevel: number;
  nextLevel: number;
  progress: number;
  requirements: {
    met: boolean;
    missing: string[];
  };
  potentialValue: number;
}

export class TraitEvolutionSystem {
  private leverageService: LeverageService;
  private honeycomb: HoneycombService;
  private evolutionPaths: Map<TraitType, TraitEvolutionPath>;
  private traitSynergies: Map<string, number>;

  constructor(leverageService: LeverageService, honeycomb: HoneycombService) {
    this.leverageService = leverageService;
    this.honeycomb = honeycomb;
    this.evolutionPaths = this.initializeEvolutionPaths();
    this.traitSynergies = this.initializeTraitSynergies();
  }

  private initializeEvolutionPaths(): Map<TraitType, TraitEvolutionPath> {
    const paths = new Map<TraitType, TraitEvolutionPath>();

    // Strength Evolution Path
    paths.set(TraitType.Strength, {
      trait: TraitType.Strength,
      levels: [
        {
          level: 1,
          requirements: { xp: 100 },
          bonuses: [{
            type: 'multiplicative',
            value: 1.1,
            affects: ['combat_damage', 'resource_gathering']
          }]
        },
        {
          level: 2,
          requirements: {
            xp: 300,
            missions: ['complete_combat_training']
          },
          bonuses: [{
            type: 'multiplicative',
            value: 1.2,
            affects: ['combat_damage', 'territory_influence']
          }]
        },
        {
          level: 3,
          requirements: {
            xp: 600,
            traits: [{ type: TraitType.Agility, minLevel: 2 }]
          },
          bonuses: [
            {
              type: 'multiplicative',
              value: 1.3,
              affects: ['combat_damage', 'resource_gathering']
            },
            {
              type: 'additive',
              value: 10,
              affects: ['max_carry_weight']
            }
          ]
        }
      ]
    });

    // Wisdom Evolution Path
    paths.set(TraitType.Wisdom, {
      trait: TraitType.Wisdom,
      levels: [
        {
          level: 1,
          requirements: { xp: 100 },
          bonuses: [{
            type: 'multiplicative',
            value: 1.1,
            affects: ['xp_gain', 'mission_success_rate']
          }]
        },
        {
          level: 2,
          requirements: {
            xp: 300,
            missions: ['study_ancient_texts']
          },
          bonuses: [
            {
              type: 'multiplicative',
              value: 1.2,
              affects: ['xp_gain', 'diplomatic_influence']
            },
            {
              type: 'additive',
              value: 5,
              affects: ['trait_evolution_speed']
            }
          ]
        },
        {
          level: 3,
          requirements: {
            xp: 600,
            traits: [{ type: TraitType.Strength, minLevel: 2 }]
          },
          bonuses: [{
            type: 'multiplicative',
            value: 1.3,
            affects: ['all_attributes']
          }]
        }
      ]
    });

    // Special Trait: SiegeEngineer
    paths.set(TraitType.SiegeEngineer, {
      trait: TraitType.SiegeEngineer,
      levels: [
        {
          level: 1,
          requirements: {
            xp: 500,
            traits: [
              { type: TraitType.Strength, minLevel: 3 },
              { type: TraitType.Wisdom, minLevel: 2 }
            ]
          },
          bonuses: [{
            type: 'multiplicative',
            value: 1.5,
            affects: ['siege_damage', 'fortification_bonus']
          }]
        },
        {
          level: 2,
          requirements: {
            xp: 1000,
            missions: ['master_siege_tactics']
          },
          bonuses: [
            {
              type: 'multiplicative',
              value: 2.0,
              affects: ['siege_damage', 'territory_capture_speed']
            },
            {
              type: 'additive',
              value: 20,
              affects: ['siege_resource_efficiency']
            }
          ]
        }
      ]
    });

    return paths;
  }

  private initializeTraitSynergies(): Map<string, number> {
    const synergies = new Map<string, number>();
    
    // Format: 'trait1:trait2' -> synergy multiplier
    synergies.set('Strength:Agility', 1.2);
    synergies.set('Wisdom:Strength', 1.15);
    synergies.set('SiegeEngineer:Strength', 1.3);
    synergies.set('DragonSlayer:Strength', 1.25);
    
    return synergies;
  }

  async analyzeEvolutionOpportunities(
    character: Character
  ): Promise<EvolutionOpportunity[]> {
    const opportunities: EvolutionOpportunity[] = [];
    const leverageAnalysis = await this.leverageService.analyzeGameState();

    for (const characterTrait of character.traits) {
      const evolutionPath = this.evolutionPaths.get(characterTrait.type);
      if (!evolutionPath) continue;

      const currentLevelIndex = evolutionPath.levels.findIndex(
        l => l.level === characterTrait.level
      );
      
      if (currentLevelIndex < evolutionPath.levels.length - 1) {
        const nextLevel = evolutionPath.levels[currentLevelIndex + 1];
        const progress = this.calculateEvolutionProgress(
          character,
          characterTrait,
          nextLevel
        );

        const requirements = this.checkRequirements(character, nextLevel.requirements);
        
        // Calculate potential value using leverage system
        const potentialValue = await this.leverageService.calculateTraitEvolution(
          character,
          characterTrait.type
        );

        opportunities.push({
          trait: characterTrait.type,
          currentLevel: characterTrait.level,
          nextLevel: nextLevel.level,
          progress,
          requirements,
          potentialValue
        });
      }
    }

    // Sort by strategic value
    return opportunities.sort((a, b) => b.potentialValue - a.potentialValue);
  }

  private calculateEvolutionProgress(
    character: Character,
    trait: { type: TraitType; level: number },
    nextLevel: {
      requirements: {
        xp: number;
        traits?: Array<{ type: TraitType; minLevel: number }>;
        missions?: string[];
      };
    }
  ): number {
    let progress = 0;

    // XP Progress
    const xpProgress = Math.min(character.xp / nextLevel.requirements.xp, 1);
    progress += xpProgress * 0.4; // XP is 40% of progress

    // Trait Requirements Progress
    if (nextLevel.requirements.traits) {
      const traitProgress = nextLevel.requirements.traits.reduce(
        (sum, req) => {
          const characterTrait = character.traits.find(t => t.type === req.type);
          if (!characterTrait) return sum;
          return sum + Math.min(characterTrait.level / req.minLevel, 1);
        },
        0
      ) / (nextLevel.requirements.traits.length || 1);
      
      progress += traitProgress * 0.3; // Traits are 30% of progress
    } else {
      progress += 0.3; // No trait requirements = full progress for this component
    }

    // Mission Requirements Progress (would need mission completion data)
    // For now, assuming missions are 30% of progress and completed
    progress += 0.3;

    return Math.min(progress, 1);
  }

  private checkRequirements(
    character: Character,
    requirements: {
      xp: number;
      traits?: Array<{ type: TraitType; minLevel: number }>;
      missions?: string[];
    }
  ): { met: boolean; missing: string[] } {
    const missing: string[] = [];

    // Check XP
    if (character.xp < requirements.xp) {
      missing.push(`${requirements.xp - character.xp} more XP required`);
    }

    // Check Traits
    if (requirements.traits) {
      for (const req of requirements.traits) {
        const characterTrait = character.traits.find(t => t.type === req.type);
        if (!characterTrait || characterTrait.level < req.minLevel) {
          missing.push(`${req.type} level ${req.minLevel} required`);
        }
      }
    }

    // Check Missions (would need mission completion data)
    if (requirements.missions) {
      // For now, assuming missions are not completed
      missing.push(...requirements.missions.map(m => `Complete mission: ${m}`));
    }

    return {
      met: missing.length === 0,
      missing
    };
  }

  async evolveTrait(
    character: Character,
    trait: TraitType
  ): Promise<{
    success: boolean;
    newLevel?: number;
    bonuses?: any[];
    error?: string;
  }> {
    try {
      const characterTrait = character.traits.find(t => t.type === trait);
      if (!characterTrait) {
        return { success: false, error: 'Trait not found' };
      }

      const evolutionPath = this.evolutionPaths.get(trait);
      if (!evolutionPath) {
        return { success: false, error: 'No evolution path found' };
      }

      const currentLevelIndex = evolutionPath.levels.findIndex(
        l => l.level === characterTrait.level
      );
      
      if (currentLevelIndex >= evolutionPath.levels.length - 1) {
        return { success: false, error: 'Maximum level reached' };
      }

      const nextLevel = evolutionPath.levels[currentLevelIndex + 1];
      const requirements = this.checkRequirements(character, nextLevel.requirements);

      if (!requirements.met) {
        return {
          success: false,
          error: `Missing requirements: ${requirements.missing.join(', ')}`
        };
      }

      // Calculate evolution multiplier using leverage system
      const leverageMultiplier = await this.leverageService.calculateTraitEvolution(
        character,
        trait
      );

      // Apply synergy bonuses
      const synergyMultiplier = this.calculateSynergyMultiplier(character, trait);
      const totalMultiplier = leverageMultiplier * synergyMultiplier;

      // Scale bonuses with multiplier
      const scaledBonuses = nextLevel.bonuses.map(bonus => ({
        ...bonus,
        value: bonus.type === 'multiplicative'
          ? 1 + ((bonus.value - 1) * totalMultiplier)
          : bonus.value * totalMultiplier
      }));

      // Update trait on-chain using Honeycomb
      await this.honeycomb.updateCharacterAttributes(character.publicKey, {
        traits: character.traits.map(t => 
          t.type === trait
            ? { ...t, level: nextLevel.level }
            : t
        )
      });

      return {
        success: true,
        newLevel: nextLevel.level,
        bonuses: scaledBonuses
      };
    } catch (error) {
      console.error('Trait evolution failed:', error);
      return {
        success: false,
        error: 'Evolution failed: ' + (error as Error).message
      };
    }
  }

  private calculateSynergyMultiplier(character: Character, evolvingTrait: TraitType): number {
    let synergyMultiplier = 1.0;

    // Check each trait for synergies
    character.traits.forEach(trait => {
      if (trait.type !== evolvingTrait) {
        const synergyKey = `${evolvingTrait}:${trait.type}`;
        const reverseSynergyKey = `${trait.type}:${evolvingTrait}`;
        
        const synergy = this.traitSynergies.get(synergyKey) || 
                       this.traitSynergies.get(reverseSynergyKey) ||
                       1.0;
        
        synergyMultiplier *= synergy;
      }
    });

    return synergyMultiplier;
  }

  async getRecommendedEvolutionPath(character: Character): Promise<{
    nextTrait: TraitType;
    path: Array<{
      trait: TraitType;
      targetLevel: number;
      estimatedValue: number;
    }>;
  }> {
    const opportunities = await this.analyzeEvolutionOpportunities(character);
    const analysis = await this.leverageService.analyzeGameState();

    // Get optimal mission path
    const optimalPath = await this.leverageService.getOptimalMissionPath(character);

    // Calculate which traits would be most valuable for the optimal path
    const traitValues = new Map<TraitType, number>();
    
    for (const trait of character.traits) {
      let value = 0;

      // Base value from leverage analysis
      value += opportunities.find(o => o.trait === trait.type)?.potentialValue || 1;

      // Value for optimal mission path
      optimalPath.forEach(missionName => {
        const missionTraits = this.getMissionTraitRequirements(missionName);
        if (missionTraits.includes(trait.type)) {
          value *= 1.2; // 20% bonus for traits needed in optimal path
        }
      });

      traitValues.set(trait.type, value);
    }

    // Sort traits by value
    const sortedTraits = Array.from(traitValues.entries())
      .sort(([, a], [, b]) => b - a);

    return {
      nextTrait: sortedTraits[0][0],
      path: sortedTraits.map(([trait, value]) => ({
        trait,
        targetLevel: this.getOptimalTargetLevel(character, trait),
        estimatedValue: value
      }))
    };
  }

  private getMissionTraitRequirements(missionName: string): TraitType[] {
    // This would need to be implemented based on your mission system
    // For now, returning some example requirements
    if (missionName.toLowerCase().includes('combat')) {
      return [TraitType.Strength, TraitType.Agility];
    }
    if (missionName.toLowerCase().includes('siege')) {
      return [TraitType.Strength, TraitType.SiegeEngineer];
    }
    return [TraitType.Wisdom];
  }

  private getOptimalTargetLevel(character: Character, trait: TraitType): number {
    const currentLevel = character.traits.find(t => t.type === trait)?.level || 0;
    const evolutionPath = this.evolutionPaths.get(trait);
    
    if (!evolutionPath) return currentLevel;

    // Find the highest level where we meet at least 50% of requirements
    for (let i = evolutionPath.levels.length - 1; i >= 0; i--) {
      const level = evolutionPath.levels[i];
      const progress = this.calculateEvolutionProgress(
        character,
        { type: trait, level: currentLevel },
        level
      );

      if (progress >= 0.5) {
        return level.level;
      }
    }

    return currentLevel + 1;
  }
}