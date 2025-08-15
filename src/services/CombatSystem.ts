import { Character, TraitType, Territory } from '../types/game';
import { LeverageService } from './LeverageService';
import { HoneycombService } from './honeycomb';
import { TraitEvolutionSystem } from './TraitEvolutionSystem';
import { ResourceManager } from './ResourceManager';
import * as THREE from 'three';

interface CombatStats {
  attack: number;
  defense: number;
  speed: number;
  criticalChance: number;
  criticalDamage: number;
  specialAbilities: Map<string, number>;
}

interface CombatModifiers {
  environmental: number;
  territorial: number;
  factionBonus: number;
  equipmentBonus: number;
  leverageMultiplier: number;
}

interface CombatResult {
  winner: Character;
  loser: Character;
  damageDealt: number;
  experienceGained: number;
  territoryInfluence: number;
  rewards: {
    resources: Array<{ type: string; amount: number }>;
    traits: Array<{ type: TraitType; experience: number }>;
  };
}

interface CombatLog {
  timestamp: number;
  type: 'attack' | 'ability' | 'critical' | 'dodge' | 'effect';
  attacker: string;
  defender: string;
  damage: number;
  effects?: string[];
}

export class CombatSystem {
  private leverageService: LeverageService;
  private honeycomb: HoneycombService;
  private traitSystem: TraitEvolutionSystem;
  private resourceManager: ResourceManager;
  private activeCombats: Map<string, {
    participants: Character[];
    logs: CombatLog[];
    territory?: Territory;
  }>;

  constructor(
    leverageService: LeverageService,
    honeycomb: HoneycombService,
    traitSystem: TraitEvolutionSystem,
    resourceManager: ResourceManager
  ) {
    this.leverageService = leverageService;
    this.honeycomb = honeycomb;
    this.traitSystem = traitSystem;
    this.resourceManager = resourceManager;
    this.activeCombats = new Map();
  }

  async initiateCombat(
    attacker: Character,
    defender: Character,
    territory?: Territory
  ): Promise<{
    combatId: string;
    initialState: any;
    estimatedDuration: number;
  }> {
    try {
      // Get combat analysis from leverage system
      const analysis = await this.leverageService.analyzeGameState();

      // Calculate initial stats
      const attackerStats = await this.calculateCombatStats(attacker);
      const defenderStats = await this.calculateCombatStats(defender);

      // Calculate modifiers
      const modifiers = await this.calculateCombatModifiers(
        attacker,
        defender,
        territory
      );

      // Create combat session
      const combatId = `combat_${Date.now()}_${attacker.publicKey.toString()}`;
      
      this.activeCombats.set(combatId, {
        participants: [attacker, defender],
        logs: [],
        territory
      });

      // Start combat processing
      this.processCombat(combatId, attackerStats, defenderStats, modifiers);

      return {
        combatId,
        initialState: {
          attackerStats,
          defenderStats,
          modifiers
        },
        estimatedDuration: this.estimateCombatDuration(
          attackerStats,
          defenderStats
        )
      };
    } catch (error) {
      console.error('Failed to initiate combat:', error);
      throw error;
    }
  }

  private async calculateCombatStats(character: Character): Promise<CombatStats> {
    const stats: CombatStats = {
      attack: 10,
      defense: 10,
      speed: 10,
      criticalChance: 0.05,
      criticalDamage: 1.5,
      specialAbilities: new Map()
    };

    // Apply trait bonuses
    character.traits.forEach(trait => {
      switch (trait.type) {
        case TraitType.Strength:
          stats.attack += trait.level * 5;
          stats.defense += trait.level * 2;
          break;
        case TraitType.Agility:
          stats.speed += trait.level * 3;
          stats.criticalChance += trait.level * 0.02;
          break;
        case TraitType.DragonSlayer:
          stats.specialAbilities.set('dragon_slaying', trait.level * 10);
          break;
        case TraitType.BladeMaster:
          stats.attack += trait.level * 8;
          stats.criticalDamage += trait.level * 0.1;
          break;
      }
    });

    // Apply equipment bonuses (would come from inventory system)
    // For now, using placeholder values
    stats.attack += 10;
    stats.defense += 10;

    return stats;
  }

  private async calculateCombatModifiers(
    attacker: Character,
    defender: Character,
    territory?: Territory
  ): Promise<CombatModifiers> {
    const modifiers: CombatModifiers = {
      environmental: 1.0,
      territorial: 1.0,
      factionBonus: 1.0,
      equipmentBonus: 1.0,
      leverageMultiplier: 1.0
    };

    // Environmental modifiers based on territory
    if (territory) {
      modifiers.environmental *= 1 + (territory.position.y / 100);
      
      // Territory control bonus
      if (territory.controlledBy === attacker.faction) {
        modifiers.territorial *= 1.2;
      } else if (territory.contestedBy.includes(attacker.faction)) {
        modifiers.territorial *= 1.1;
      }
    }

    // Faction relationship modifiers
    if (attacker.faction === defender.faction) {
      modifiers.factionBonus *= 0.5; // Reduced damage to same faction
    }

    // Get leverage multiplier
    modifiers.leverageMultiplier = await this.leverageService.calculateTraitEvolution(
      attacker,
      TraitType.Strength
    );

    return modifiers;
  }

  private estimateCombatDuration(
    attackerStats: CombatStats,
    defenderStats: CombatStats
  ): number {
    // Base duration is 30 seconds
    let duration = 30000;

    // Modify based on speed difference
    const speedRatio = attackerStats.speed / defenderStats.speed;
    duration *= 1 / speedRatio;

    // Modify based on defense/attack ratio
    const defenseRatio = defenderStats.defense / attackerStats.attack;
    duration *= defenseRatio;

    return Math.min(Math.max(duration, 10000), 60000); // Between 10s and 60s
  }

  private async processCombat(
    combatId: string,
    attackerStats: CombatStats,
    defenderStats: CombatStats,
    modifiers: CombatModifiers
  ): Promise<void> {
    const combat = this.activeCombats.get(combatId);
    if (!combat) return;

    const [attacker, defender] = combat.participants;
    let attackerHealth = 100;
    let defenderHealth = 100;
    let round = 0;

    const processRound = async () => {
      round++;

      // Process attacker's turn
      const attackerDamage = this.calculateDamage(
        attackerStats,
        defenderStats,
        modifiers
      );
      defenderHealth -= attackerDamage;

      combat.logs.push({
        timestamp: Date.now(),
        type: 'attack',
        attacker: attacker.name,
        defender: defender.name,
        damage: attackerDamage
      });

      // Process defender's turn if still alive
      if (defenderHealth > 0) {
        const defenderDamage = this.calculateDamage(
          defenderStats,
          attackerStats,
          {
            ...modifiers,
            leverageMultiplier: 1 / modifiers.leverageMultiplier
          }
        );
        attackerHealth -= defenderDamage;

        combat.logs.push({
          timestamp: Date.now(),
          type: 'attack',
          attacker: defender.name,
          defender: attacker.name,
          damage: defenderDamage
        });
      }

      // Check for combat end
      if (attackerHealth <= 0 || defenderHealth <= 0) {
        await this.resolveCombat(
          combatId,
          attackerHealth > defenderHealth ? attacker : defender,
          attackerHealth > defenderHealth ? defender : attacker,
          round
        );
      } else {
        // Continue combat
        setTimeout(processRound, 1000); // 1 second per round
      }
    };

    // Start combat
    processRound();
  }

  private calculateDamage(
    attackerStats: CombatStats,
    defenderStats: CombatStats,
    modifiers: CombatModifiers
  ): number {
    // Base damage
    let damage = (attackerStats.attack * modifiers.leverageMultiplier) -
                (defenderStats.defense * 0.5);

    // Critical hit
    if (Math.random() < attackerStats.criticalChance) {
      damage *= attackerStats.criticalDamage;
    }

    // Apply modifiers
    damage *= modifiers.environmental;
    damage *= modifiers.territorial;
    damage *= modifiers.factionBonus;
    damage *= modifiers.equipmentBonus;

    return Math.max(1, Math.floor(damage));
  }

  private async resolveCombat(
    combatId: string,
    winner: Character,
    loser: Character,
    rounds: number
  ): Promise<void> {
    const combat = this.activeCombats.get(combatId);
    if (!combat) return;

    try {
      // Calculate experience and rewards
      const baseXP = 100 + (rounds * 10);
      const experienceGained = Math.floor(baseXP * combat.logs.length);

      // Calculate territory influence if applicable
      let territoryInfluence = 0;
      if (combat.territory) {
        territoryInfluence = this.calculateTerritoryInfluence(
          winner,
          combat.territory,
          rounds
        );
      }

      // Generate rewards
      const rewards = await this.generateCombatRewards(
        winner,
        loser,
        rounds,
        combat.territory
      );

      // Update winner's progression
      await this.updateCombatProgression(
        winner,
        experienceGained,
        rewards,
        territoryInfluence
      );

      // Record combat result on-chain
      const result: CombatResult = {
        winner,
        loser,
        damageDealt: combat.logs.reduce(
          (total, log) => total + log.damage,
          0
        ),
        experienceGained,
        territoryInfluence,
        rewards
      };

      await this.honeycomb.recordCombatResult(
        winner.publicKey,
        loser.publicKey,
        result
      );

      // Clean up
      this.activeCombats.delete(combatId);

    } catch (error) {
      console.error('Failed to resolve combat:', error);
      this.activeCombats.delete(combatId);
    }
  }

  private calculateTerritoryInfluence(
    winner: Character,
    territory: Territory,
    rounds: number
  ): number {
    let influence = 10 + (rounds * 2);

    // Bonus for quick victories
    if (rounds < 5) {
      influence *= 1.5;
    }

    // Bonus for contested territories
    if (territory.contestedBy.length > 0) {
      influence *= 1.3;
    }

    // Penalty for fighting in enemy territory
    if (territory.controlledBy && territory.controlledBy !== winner.faction) {
      influence *= 0.7;
    }

    return Math.floor(influence);
  }

  private async generateCombatRewards(
    winner: Character,
    loser: Character,
    rounds: number,
    territory?: Territory
  ): Promise<{
    resources: Array<{ type: string; amount: number }>;
    traits: Array<{ type: TraitType; experience: number }>;
  }> {
    const rewards = {
      resources: [] as Array<{ type: string; amount: number }>,
      traits: [] as Array<{ type: TraitType; experience: number }>
    };

    // Base resources
    rewards.resources.push(
      { type: 'honor_tokens', amount: 10 + rounds },
      { type: 'combat_experience', amount: 5 + Math.floor(rounds / 2) }
    );

    // Territory-based resources
    if (territory) {
      const territoryResources = await this.resourceManager.getTerritoryResources(
        territory
      );
      rewards.resources.push(...territoryResources.map(r => ({
        type: r.type,
        amount: Math.floor(r.amount * 0.1) // 10% of territory resources
      })));
    }

    // Trait experience
    const combatTraits = [
      TraitType.Strength,
      TraitType.Agility,
      TraitType.BladeMaster
    ];

    for (const trait of combatTraits) {
      if (winner.traits.some(t => t.type === trait)) {
        rewards.traits.push({
          type: trait,
          experience: 20 + Math.floor(rounds * 1.5)
        });
      }
    }

    return rewards;
  }

  private async updateCombatProgression(
    character: Character,
    experience: number,
    rewards: {
      resources: Array<{ type: string; amount: number }>;
      traits: Array<{ type: TraitType; experience: number }>;
    },
    territoryInfluence: number
  ): Promise<void> {
    // Update traits
    for (const traitReward of rewards.traits) {
      await this.traitSystem.gainTraitExperience(
        character,
        traitReward.type,
        traitReward.experience
      );
    }

    // Award resources
    for (const resource of rewards.resources) {
      await this.resourceManager.awardResource(
        character,
        resource.type,
        resource.amount
      );
    }

    // Update territory influence if applicable
    if (territoryInfluence > 0) {
      await this.honeycomb.updateTerritoryInfluence(
        character.publicKey,
        character.faction,
        territoryInfluence
      );
    }

    // Update character progression
    await this.honeycomb.updateCharacterProgress(
      character.publicKey,
      {
        combatXP: experience,
        battlesWon: 1,
        territoryInfluence
      }
    );
  }

  async getCombatAnalytics(character: Character): Promise<{
    combatPotential: number;
    recommendedTargets: string[];
    optimalStrategy: string[];
  }> {
    const analysis = await this.leverageService.analyzeGameState();
    const stats = await this.calculateCombatStats(character);

    // Calculate combat potential
    const potential = (
      stats.attack +
      stats.defense +
      stats.speed +
      (stats.criticalChance * 100) +
      stats.criticalDamage
    ) / 5;

    // Get recommended targets based on level and stats
    const recommendedTargets = await this.findRecommendedTargets(
      character,
      stats
    );

    // Generate optimal strategy
    const strategy = this.generateCombatStrategy(character, stats, analysis);

    return {
      combatPotential: potential,
      recommendedTargets,
      optimalStrategy: strategy
    };
  }

  private async findRecommendedTargets(
    character: Character,
    stats: CombatStats
  ): Promise<string[]> {
    // This would integrate with a matchmaking system
    // For now, returning placeholder recommendations
    return [
      'Similar level opponents in contested territories',
      'Defense missions for controlled territories',
      'PvE encounters matching your combat potential'
    ];
  }

  private generateCombatStrategy(
    character: Character,
    stats: CombatStats,
    analysis: any
  ): string[] {
    const strategy: string[] = [];

    // Analyze combat style based on stats
    if (stats.attack > stats.defense * 1.5) {
      strategy.push('Focus on aggressive tactics');
      strategy.push('Prioritize quick victories for bonus influence');
    } else if (stats.defense > stats.attack * 1.5) {
      strategy.push('Adopt defensive combat style');
      strategy.push('Excel in territory defense missions');
    }

    // Special ability recommendations
    stats.specialAbilities.forEach((value, ability) => {
      strategy.push(`Leverage ${ability} ability for ${value}% bonus damage`);
    });

    // Territory-based strategy
    if (analysis.recommendations?.some(r => r.includes('territory'))) {
      strategy.push('Focus on combat in contested territories');
      strategy.push('Coordinate attacks with faction members');
    }

    return strategy;
  }

  // Missing methods for TestEnvironment integration
  async simulateCombat(attacker: any, defender: any): Promise<any> {
    // Simulate combat without actually affecting character state
    const attackerStrength = this.calculateCombatStrength(attacker);
    const defenderStrength = this.calculateCombatStrength(defender);
    
    const winner = attackerStrength > defenderStrength ? attacker : defender;
    const damage = Math.abs(attackerStrength - defenderStrength);
    
    return {
      winner,
      loser: winner === attacker ? defender : attacker,
      damage,
      experience: Math.floor(damage * 0.1),
      simulation: true
    };
  }

  // Event system integration
  async updateState(event: any): Promise<void> {
    switch (event.type) {
      case 'COMBAT_INITIATED':
        // Handle combat initiation
        break;
      case 'COMBAT_RESOLVED':
        // Handle combat resolution
        if (event.payload.winner && event.payload.loser) {
          await this.processCombatReward(event.payload.winner, event.payload);
        }
        break;
      case 'CHARACTER_LEVELED':
        // Recalculate combat capabilities
        break;
    }
  }
}