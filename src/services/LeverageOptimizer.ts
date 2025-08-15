import { Character, Territory, FactionType, TraitType } from '../types/game';
import { LeverageService } from './LeverageService';
import { HoneycombService } from './honeycomb';
import * as THREE from 'three';

interface LeverageOpportunity {
  type: 'combat' | 'craft' | 'resource' | 'territory' | 'trait';
  potentialValue: number;
  multiplier: number;
  requirements: any;
  recommendation: string;
}

interface OptimizationResult {
  leverageMultiplier: number;
  recommendations: string[];
  optimalPath: string[];
  synergies: Map<string, number>;
}

export class LeverageOptimizer {
  private leverageService: LeverageService;
  private honeycomb: HoneycombService;
  private optimizationCache: Map<string, OptimizationResult>;
  private lastAnalysis: number;
  private updateInterval: number = 60000; // 1 minute

  constructor(leverageService: LeverageService, honeycomb: HoneycombService) {
    this.leverageService = leverageService;
    this.honeycomb = honeycomb;
    this.optimizationCache = new Map();
    this.lastAnalysis = 0;
  }

  async optimizeAction(
    actionType: string,
    character: Character,
    context: any
  ): Promise<OptimizationResult> {
    const cacheKey = `${actionType}_${character.publicKey.toString()}_${JSON.stringify(context)}`;
    
    // Check cache
    if (this.shouldUseCache(cacheKey)) {
      const cached = this.optimizationCache.get(cacheKey);
      if (cached) return cached;
    }

    // Get fresh leverage analysis
    const analysis = await this.leverageService.analyzeGameState();
    
    // Find all leverage opportunities
    const opportunities = await this.findLeverageOpportunities(
      actionType,
      character,
      context,
      analysis
    );

    // Calculate optimal path
    const optimalPath = await this.calculateOptimalPath(
      opportunities,
      character,
      analysis
    );

    // Calculate synergies
    const synergies = this.calculateSystemSynergies(
      actionType,
      character,
      context
    );

    // Generate final multiplier
    const leverageMultiplier = this.calculateFinalMultiplier(
      opportunities,
      synergies,
      analysis
    );

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(
      opportunities,
      optimalPath,
      synergies
    );

    const result: OptimizationResult = {
      leverageMultiplier,
      recommendations,
      optimalPath,
      synergies
    };

    // Cache result
    this.optimizationCache.set(cacheKey, result);
    
    return result;
  }

  private async findLeverageOpportunities(
    actionType: string,
    character: Character,
    context: any,
    analysis: any
  ): Promise<LeverageOpportunity[]> {
    const opportunities: LeverageOpportunity[] = [];

    switch (actionType) {
      case 'combat':
        opportunities.push(
          ...(await this.findCombatOpportunities(character, context))
        );
        break;
      case 'craft':
        opportunities.push(
          ...(await this.findCraftingOpportunities(character, context))
        );
        break;
      case 'resource':
        opportunities.push(
          ...(await this.findResourceOpportunities(character, context))
        );
        break;
      case 'territory':
        opportunities.push(
          ...(await this.findTerritoryOpportunities(character, context))
        );
        break;
      case 'trait':
        opportunities.push(
          ...(await this.findTraitOpportunities(character, context))
        );
        break;
    }

    // Apply leverage analysis to opportunities
    return opportunities.map(opp => ({
      ...opp,
      multiplier: opp.multiplier * analysis.exponentialValue
    }));
  }

  private async findCombatOpportunities(
    character: Character,
    context: any
  ): Promise<LeverageOpportunity[]> {
    const opportunities: LeverageOpportunity[] = [];

    // Trait-based combat opportunities
    character.traits.forEach(trait => {
      if (trait.type === TraitType.Strength || trait.type === TraitType.BladeMaster) {
        opportunities.push({
          type: 'combat',
          potentialValue: trait.level * 10,
          multiplier: 1 + (trait.level * 0.1),
          requirements: { trait: trait.type, level: trait.level },
          recommendation: `Leverage ${trait.type} level ${trait.level} for combat bonus`
        });
      }
    });

    // Territory-based combat opportunities
    if (context.territory) {
      const territory = context.territory as Territory;
      if (territory.controlledBy === character.faction) {
        opportunities.push({
          type: 'combat',
          potentialValue: 20,
          multiplier: 1.2,
          requirements: { territory: territory.id },
          recommendation: 'Use territory control advantage in combat'
        });
      }
    }

    return opportunities;
  }

  private async findCraftingOpportunities(
    character: Character,
    context: any
  ): Promise<LeverageOpportunity[]> {
    const opportunities: LeverageOpportunity[] = [];

    // Wisdom-based crafting opportunities
    const wisdomTrait = character.traits.find(t => t.type === TraitType.Wisdom);
    if (wisdomTrait) {
      opportunities.push({
        type: 'craft',
        potentialValue: wisdomTrait.level * 15,
        multiplier: 1 + (wisdomTrait.level * 0.15),
        requirements: { trait: TraitType.Wisdom, level: wisdomTrait.level },
        recommendation: `Use Wisdom ${wisdomTrait.level} for crafting quality bonus`
      });
    }

    // Resource-based crafting opportunities
    if (context.resources) {
      const rareResources = context.resources.filter((r: any) => r.type === 'rare');
      if (rareResources.length > 0) {
        opportunities.push({
          type: 'craft',
          potentialValue: rareResources.length * 25,
          multiplier: 1 + (rareResources.length * 0.1),
          requirements: { resources: rareResources },
          recommendation: 'Use rare resources for enhanced crafting results'
        });
      }
    }

    return opportunities;
  }

  private async findResourceOpportunities(
    character: Character,
    context: any
  ): Promise<LeverageOpportunity[]> {
    const opportunities: LeverageOpportunity[] = [];

    // Territory-based resource opportunities
    if (context.territory) {
      const territory = context.territory as Territory;
      const height = territory.position.y;
      
      opportunities.push({
        type: 'resource',
        potentialValue: Math.floor(height * 10),
        multiplier: 1 + (height / 100),
        requirements: { territory: territory.id },
        recommendation: `Exploit elevation bonus for resource gathering`
      });
    }

    // Trait-based resource opportunities
    character.traits.forEach(trait => {
      if (trait.type === TraitType.Strength) {
        opportunities.push({
          type: 'resource',
          potentialValue: trait.level * 8,
          multiplier: 1 + (trait.level * 0.08),
          requirements: { trait: trait.type, level: trait.level },
          recommendation: `Use ${trait.type} for improved resource gathering`
        });
      }
    });

    return opportunities;
  }

  private async findTerritoryOpportunities(
    character: Character,
    context: any
  ): Promise<LeverageOpportunity[]> {
    const opportunities: LeverageOpportunity[] = [];

    // Faction-based territory opportunities
    if (context.territory) {
      const territory = context.territory as Territory;
      
      if (territory.contestedBy.includes(character.faction)) {
        opportunities.push({
          type: 'territory',
          potentialValue: 30,
          multiplier: 1.3,
          requirements: { faction: character.faction },
          recommendation: 'Contest territory for increased influence gain'
        });
      }
    }

    // Trait-based territory opportunities
    const siegeTrait = character.traits.find(t => t.type === TraitType.SiegeEngineer);
    if (siegeTrait) {
      opportunities.push({
        type: 'territory',
        potentialValue: siegeTrait.level * 20,
        multiplier: 1 + (siegeTrait.level * 0.2),
        requirements: { trait: TraitType.SiegeEngineer, level: siegeTrait.level },
        recommendation: `Use Siege Engineer expertise for territory control`
      });
    }

    return opportunities;
  }

  private async findTraitOpportunities(
    character: Character,
    context: any
  ): Promise<LeverageOpportunity[]> {
    const opportunities: LeverageOpportunity[] = [];

    // Find trait synergies
    character.traits.forEach(trait1 => {
      character.traits.forEach(trait2 => {
        if (trait1.type !== trait2.type) {
          const synergy = this.calculateTraitSynergy(trait1.type, trait2.type);
          if (synergy > 1) {
            opportunities.push({
              type: 'trait',
              potentialValue: (trait1.level + trait2.level) * 5,
              multiplier: synergy,
              requirements: {
                traits: [
                  { type: trait1.type, level: trait1.level },
                  { type: trait2.type, level: trait2.level }
                ]
              },
              recommendation: `Leverage ${trait1.type} and ${trait2.type} synergy`
            });
          }
        }
      });
    });

    return opportunities;
  }

  private calculateTraitSynergy(trait1: TraitType, trait2: TraitType): number {
    // Define trait synergy pairs
    const synergies = new Map<string, number>([
      [`${TraitType.Strength}_${TraitType.BladeMaster}`, 1.3],
      [`${TraitType.Wisdom}_${TraitType.SiegeEngineer}`, 1.25],
      [`${TraitType.Strength}_${TraitType.DragonSlayer}`, 1.4],
      [`${TraitType.Wisdom}_${TraitType.Strength}`, 1.15]
    ]);

    const key1 = `${trait1}_${trait2}`;
    const key2 = `${trait2}_${trait1}`;

    return synergies.get(key1) || synergies.get(key2) || 1.0;
  }

  private async calculateOptimalPath(
    opportunities: LeverageOpportunity[],
    character: Character,
    analysis: any
  ): Promise<string[]> {
    // Sort opportunities by potential value * multiplier
    const sortedOpportunities = opportunities.sort(
      (a, b) => (b.potentialValue * b.multiplier) - (a.potentialValue * a.multiplier)
    );

    // Generate path steps
    return sortedOpportunities.map(opp => {
      switch (opp.type) {
        case 'combat':
          return `Engage in combat using ${opp.requirements.trait || 'territory advantage'}`;
        case 'craft':
          return `Craft using ${opp.requirements.trait || 'rare resources'}`;
        case 'resource':
          return `Gather resources at ${opp.requirements.territory || 'optimal locations'}`;
        case 'territory':
          return `Control territory using ${opp.requirements.trait || 'faction advantage'}`;
        case 'trait':
          return `Develop trait synergy between ${opp.requirements.traits.map((t: any) => t.type).join(' and ')}`;
        default:
          return '';
      }
    }).filter(step => step !== '');
  }

  private calculateSystemSynergies(
    actionType: string,
    character: Character,
    context: any
  ): Map<string, number> {
    const synergies = new Map<string, number>();

    // Combat synergies
    if (actionType === 'combat' || actionType === 'territory') {
      synergies.set('combat_territory', 1.2);
      if (context.territory?.controlledBy === character.faction) {
        synergies.set('faction_control', 1.3);
      }
    }

    // Crafting synergies
    if (actionType === 'craft' || actionType === 'resource') {
      synergies.set('craft_resource', 1.15);
      if (context.resources?.some((r: any) => r.type === 'rare')) {
        synergies.set('rare_resource', 1.25);
      }
    }

    // Trait synergies
    character.traits.forEach(trait => {
      if (this.isTraitRelevantForAction(trait.type, actionType)) {
        synergies.set(`trait_${trait.type}`, 1 + (trait.level * 0.05));
      }
    });

    return synergies;
  }

  private isTraitRelevantForAction(trait: TraitType, actionType: string): boolean {
    const relevance = {
      combat: [TraitType.Strength, TraitType.BladeMaster, TraitType.DragonSlayer],
      craft: [TraitType.Wisdom],
      resource: [TraitType.Strength],
      territory: [TraitType.SiegeEngineer],
      trait: [TraitType.Wisdom]
    };

    return relevance[actionType as keyof typeof relevance]?.includes(trait) || false;
  }

  private calculateFinalMultiplier(
    opportunities: LeverageOpportunity[],
    synergies: Map<string, number>,
    analysis: any
  ): number {
    // Base multiplier from opportunities
    const opportunityMultiplier = opportunities.reduce(
      (mult, opp) => mult * opp.multiplier,
      1
    );

    // Synergy multiplier
    const synergyMultiplier = Array.from(synergies.values()).reduce(
      (mult, val) => mult * val,
      1
    );

    // Combine with leverage analysis
    return opportunityMultiplier * synergyMultiplier * analysis.exponentialValue;
  }

  private generateOptimizationRecommendations(
    opportunities: LeverageOpportunity[],
    optimalPath: string[],
    synergies: Map<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Add high-value opportunities
    opportunities
      .filter(opp => opp.potentialValue * opp.multiplier > 20)
      .forEach(opp => recommendations.push(opp.recommendation));

    // Add synergy recommendations
    synergies.forEach((value, key) => {
      if (value > 1.2) {
        recommendations.push(
          `Leverage ${key.replace('_', ' ')} synergy for ${Math.floor((value - 1) * 100)}% bonus`
        );
      }
    });

    // Add optimal path steps
    recommendations.push(...optimalPath.slice(0, 3));

    return recommendations;
  }

  private shouldUseCache(cacheKey: string): boolean {
    const now = Date.now();
    const cached = this.optimizationCache.get(cacheKey);
    
    return cached && (now - this.lastAnalysis < this.updateInterval);
  }

  // Public methods for analytics
  async getOptimizationAnalytics(): Promise<{
    activeOptimizations: number;
    averageMultiplier: number;
    topSynergies: Array<{ type: string; value: number }>;
    systemUtilization: Record<string, number>;
  }> {
    const multipliers = Array.from(this.optimizationCache.values())
      .map(result => result.leverageMultiplier);

    const synergies = new Map<string, number>();
    this.optimizationCache.forEach(result => {
      result.synergies.forEach((value, key) => {
        synergies.set(key, (synergies.get(key) || 0) + value);
      });
    });

    return {
      activeOptimizations: this.optimizationCache.size,
      averageMultiplier: multipliers.reduce((sum, val) => sum + val, 0) / multipliers.length,
      topSynergies: Array.from(synergies.entries())
        .map(([type, value]) => ({ type, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      systemUtilization: {
        combat: 0.8,
        craft: 0.7,
        resource: 0.9,
        territory: 0.85,
        trait: 0.95
      }
    };
  }
}