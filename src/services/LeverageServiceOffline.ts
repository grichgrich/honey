/**
 * Offline Leverage Service - No backend required
 * Handles all leverage calculations in the frontend
 */

import { Character } from '../types/game';

interface LeverageRequest {
  character: Character;
  action: {
    action: string;
    territory?: string;
    resources?: string[];
    [key: string]: any;
  };
}

interface LeverageAnalysis {
  leverageMultiplier: number;
  efficiency: number;
  recommendations: string[];
  analysis: {
    baseMultiplier: number;
    levelBonus: number;
    experienceBonus: number;
    traitBonus: number;
    actionBonus: number;
    resourceBonus: number;
    factionBonus: number;
    traitAnalysis: Record<string, any>;
    characterLevel: number;
    characterExperience: number;
    actionType: string;
  };
}

export class LeverageServiceOffline {
  private baseMultiplier = 1.0;
  private traitWeights = {
    "Strength": 0.8,
    "Wisdom": 1.2,
    "Charisma": 1.0,
    "Agility": 0.9,
    "Intelligence": 1.1
  };
  private actionWeights = {
    "gather": 1.0,
    "craft": 1.2,
    "combat": 0.9,
    "explore": 1.1,
    "trade": 1.3
  };

  async calculateLeverage(character: Character, action: any): Promise<LeverageAnalysis> {
    // Base calculations
    const levelBonus = character.level * 0.05;
    const experienceBonus = Math.min(character.experience / 10000, 1.0) * 0.3;
    
    // Trait analysis
    let traitBonus = 0;
    const traitAnalysis: Record<string, any> = {};
    
    if (character.traits) {
      character.traits.forEach(trait => {
        const traitType = trait.type;
        const traitLevel = trait.level || 1;
        
        if (this.traitWeights[traitType as keyof typeof this.traitWeights]) {
          const weight = this.traitWeights[traitType as keyof typeof this.traitWeights];
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
    const actionBonus = (this.actionWeights[actionType as keyof typeof this.actionWeights] || 1.0) - 1.0;
    
    // Resource availability bonus
    let resourceBonus = 0;
    if (action.resources && character.resources) {
      const availableResources = action.resources.filter((r: string) => character.resources[r]).length;
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

  private calculateFactionBonus(faction: string, action: any): number {
    const factionBonuses: Record<string, Record<string, number>> = {
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

  private generateRecommendations(character: Character, action: any, traitAnalysis: Record<string, any>): string[] {
    const recommendations: string[] = [];
    
    // Level recommendations
    if (character.level < 10) {
      recommendations.push("Consider focusing on gaining experience to unlock higher leverage multipliers");
    }
    
    // Trait recommendations
    const actionType = action.action || "gather";
    const optimalTraits: Record<string, string[]> = {
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
      const missingResources = action.resources.filter((r: string) => !(character.resources && character.resources[r]));
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

  // Additional methods for compatibility
  async getOptimalMissionPath(character: Character): Promise<any[]> {
    const missions = [];
    const baseLevel = character.level || 1;
    
    // Generate missions based on character capabilities
    for (let i = 0; i < 3; i++) {
      missions.push({
        id: `mission-${baseLevel}-${i}`,
        type: 'gather',
        requiredLevel: baseLevel + i,
        title: `Level ${baseLevel + i} Mission`,
        description: `A mission suitable for level ${baseLevel + i} characters`,
        rewards: {
          xp: (baseLevel + i) * 50,
          resources: [{ type: 'gold', amount: (baseLevel + i) * 10 }]
        }
      });
    }
    
    return missions;
  }

  async analyzeMissionCompletion(mission: any, character: Character): Promise<any> {
    const baseValue = mission.rewards?.xp || 100;
    const characterBonus = character.level * 0.1;
    
    return {
      baseValue,
      characterBonus,
      exponentialValue: baseValue * (1 + characterBonus),
      leverageMultiplier: 1 + characterBonus
    };
  }
}
