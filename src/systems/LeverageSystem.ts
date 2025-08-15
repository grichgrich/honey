import { analytics } from './Analytics';

export interface LeverageBonus {
  value: number;
  description: string;
  source: string;
  max: number;
  progress: number;
}

export interface LeverageMultiplier {
  total: number;
  base_rate: number;
  bonuses: {
    territory_control: LeverageBonus[];
    resource_diversity: LeverageBonus[];
    mission_completion: LeverageBonus[];
    character_level: LeverageBonus[];
    social_achievements: LeverageBonus[];
    alliance_synergy: LeverageBonus[];
    combat_rating: LeverageBonus[];
    research_progress: LeverageBonus[];
    special_events: LeverageBonus[];
  };
  efficiency: number;
  potential_increase: {
    value: number;
    actions: Array<{
      description: string;
      impact: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }>;
  };
}

export interface GameState {
  territories: any[];
  resources: any[];
  missions: any[];
  character: any;
  social: {
    alliances: any[];
    achievements: any[];
    leaderboardRank: number;
  };
  research: {
    completedTechnologies: string[];
    activeResearch: any[];
  };
  combat: {
    rating: number;
    victories: number;
    defenseSuccesses: number;
  };
}

class LeverageSystem {
  private static instance: LeverageSystem;
  private currentMultiplier: LeverageMultiplier | null = null;

  private constructor() {}

  public static getInstance(): LeverageSystem {
    if (!LeverageSystem.instance) {
      LeverageSystem.instance = new LeverageSystem();
    }
    return LeverageSystem.instance;
  }

  public calculateLeverageMultiplier(gameState: GameState): LeverageMultiplier {
    // Base rate starts at 1.0
    const base_rate = 1.0;
    let total = base_rate;
    const bonuses: LeverageMultiplier['bonuses'] = {
      territory_control: this.calculateTerritoryBonuses(gameState),
      resource_diversity: this.calculateResourceBonuses(gameState),
      mission_completion: this.calculateMissionBonuses(gameState),
      character_level: this.calculateLevelBonuses(gameState),
      social_achievements: this.calculateSocialBonuses(gameState),
      alliance_synergy: this.calculateAllianceBonuses(gameState),
      combat_rating: this.calculateCombatBonuses(gameState),
      research_progress: this.calculateResearchBonuses(gameState),
      special_events: this.calculateEventBonuses(gameState)
    };

    // Calculate total from all bonuses
    Object.values(bonuses).forEach(bonusCategory => {
      bonusCategory.forEach(bonus => {
        total += (bonus.value * (bonus.progress / 100));
      });
    });

    // Calculate efficiency based on synergies
    const efficiency = this.calculateEfficiency(bonuses);

    // Apply efficiency multiplier
    total *= efficiency;

    // Calculate potential improvements
    const potential_increase = this.calculatePotentialIncrease(gameState, bonuses);

    // Track analytics
    analytics.trackEvent('leverage', 'calculate', {
      total,
      efficiency,
      potential: potential_increase.value
    });

    this.currentMultiplier = {
      total,
      base_rate,
      bonuses,
      efficiency,
      potential_increase
    };

    return this.currentMultiplier;
  }

  private calculateTerritoryBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Territory count bonus
    bonuses.push({
      value: Math.min(0.5, gameState.territories.length * 0.05),
      description: 'Territory Control',
      source: 'territories',
      max: 0.5,
      progress: Math.min(100, (gameState.territories.length / 10) * 100)
    });

    // Territory clustering bonus
    const clusteredTerritories = this.calculateTerritoryClusters(gameState.territories);
    bonuses.push({
      value: Math.min(0.3, clusteredTerritories * 0.1),
      description: 'Territory Clustering',
      source: 'territory_optimization',
      max: 0.3,
      progress: Math.min(100, (clusteredTerritories / 3) * 100)
    });

    return bonuses;
  }

  private calculateResourceBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Resource diversity bonus
    const uniqueResources = new Set(gameState.resources.map(r => r.type)).size;
    bonuses.push({
      value: Math.min(0.4, uniqueResources * 0.1),
      description: 'Resource Diversity',
      source: 'resources',
      max: 0.4,
      progress: Math.min(100, (uniqueResources / 4) * 100)
    });

    // Resource efficiency bonus
    const resourceEfficiency = this.calculateResourceEfficiency(gameState.resources);
    bonuses.push({
      value: Math.min(0.3, resourceEfficiency * 0.1),
      description: 'Resource Efficiency',
      source: 'resource_optimization',
      max: 0.3,
      progress: Math.min(100, resourceEfficiency * 100)
    });

    return bonuses;
  }

  private calculateMissionBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Mission completion rate bonus
    const completedMissions = gameState.missions.filter(m => m.progress === 100).length;
    bonuses.push({
      value: Math.min(0.4, completedMissions * 0.05),
      description: 'Mission Completion Rate',
      source: 'missions',
      max: 0.4,
      progress: Math.min(100, (completedMissions / 8) * 100)
    });

    // Mission diversity bonus
    const uniqueMissionTypes = new Set(gameState.missions.map(m => m.type)).size;
    bonuses.push({
      value: Math.min(0.3, uniqueMissionTypes * 0.1),
      description: 'Mission Diversity',
      source: 'mission_types',
      max: 0.3,
      progress: Math.min(100, (uniqueMissionTypes / 3) * 100)
    });

    return bonuses;
  }

  private calculateLevelBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Character level bonus
    bonuses.push({
      value: Math.min(0.5, gameState.character.level * 0.01),
      description: 'Character Level',
      source: 'character',
      max: 0.5,
      progress: Math.min(100, (gameState.character.level / 50) * 100)
    });

    // Skill specialization bonus
    const skillSpecialization = this.calculateSkillSpecialization(gameState.character);
    bonuses.push({
      value: Math.min(0.3, skillSpecialization * 0.1),
      description: 'Skill Specialization',
      source: 'skills',
      max: 0.3,
      progress: Math.min(100, skillSpecialization * 100)
    });

    return bonuses;
  }

  private calculateSocialBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Achievement bonus
    const achievementCount = gameState.social.achievements.length;
    bonuses.push({
      value: Math.min(0.3, achievementCount * 0.02),
      description: 'Achievements',
      source: 'achievements',
      max: 0.3,
      progress: Math.min(100, (achievementCount / 15) * 100)
    });

    // Leaderboard position bonus
    const leaderboardBonus = Math.max(0, (100 - gameState.social.leaderboardRank) / 100);
    bonuses.push({
      value: Math.min(0.4, leaderboardBonus),
      description: 'Leaderboard Ranking',
      source: 'leaderboard',
      max: 0.4,
      progress: Math.min(100, (100 - gameState.social.leaderboardRank))
    });

    return bonuses;
  }

  private calculateAllianceBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Alliance size bonus
    const allianceMembers = gameState.social.alliances[0]?.members.length || 0;
    bonuses.push({
      value: Math.min(0.3, allianceMembers * 0.03),
      description: 'Alliance Size',
      source: 'alliance',
      max: 0.3,
      progress: Math.min(100, (allianceMembers / 10) * 100)
    });

    // Alliance territory synergy
    const territorySynergy = this.calculateAllianceTerritorySynergy(gameState);
    bonuses.push({
      value: Math.min(0.4, territorySynergy * 0.1),
      description: 'Alliance Territory Synergy',
      source: 'alliance_territories',
      max: 0.4,
      progress: Math.min(100, territorySynergy * 100)
    });

    return bonuses;
  }

  private calculateCombatBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Combat rating bonus
    bonuses.push({
      value: Math.min(0.4, gameState.combat.rating * 0.001),
      description: 'Combat Rating',
      source: 'combat',
      max: 0.4,
      progress: Math.min(100, (gameState.combat.rating / 400) * 100)
    });

    // Defense success bonus
    const defenseRate = gameState.combat.defenseSuccesses / Math.max(1, gameState.combat.victories);
    bonuses.push({
      value: Math.min(0.3, defenseRate * 0.3),
      description: 'Defense Success Rate',
      source: 'defense',
      max: 0.3,
      progress: Math.min(100, defenseRate * 100)
    });

    return bonuses;
  }

  private calculateResearchBonuses(gameState: GameState): LeverageBonus[] {
    const bonuses: LeverageBonus[] = [];
    
    // Research completion bonus
    const completedResearch = gameState.research.completedTechnologies.length;
    bonuses.push({
      value: Math.min(0.5, completedResearch * 0.05),
      description: 'Research Completion',
      source: 'research',
      max: 0.5,
      progress: Math.min(100, (completedResearch / 10) * 100)
    });

    // Active research bonus
    const activeResearch = gameState.research.activeResearch.length;
    bonuses.push({
      value: Math.min(0.2, activeResearch * 0.1),
      description: 'Active Research',
      source: 'active_research',
      max: 0.2,
      progress: Math.min(100, (activeResearch / 2) * 100)
    });

    return bonuses;
  }

  private calculateEventBonuses(gameState: GameState): LeverageBonus[] {
    // This would be populated with any active special events
    return [];
  }

  private calculateEfficiency(bonuses: LeverageMultiplier['bonuses']): number {
    let efficiency = 1.0;
    
    // Calculate synergies between different bonus categories
    const totalBonuses = Object.values(bonuses).flat();
    const averageProgress = totalBonuses.reduce((sum, bonus) => sum + bonus.progress, 0) / totalBonuses.length;
    
    // Efficiency increases with overall progress balance
    efficiency += Math.min(0.5, averageProgress / 200);
    
    // Bonus for having progress in multiple categories
    const activeCategories = Object.values(bonuses).filter(category => category.length > 0).length;
    efficiency += Math.min(0.3, activeCategories * 0.1);

    return efficiency;
  }

  private calculatePotentialIncrease(
    gameState: GameState,
    currentBonuses: LeverageMultiplier['bonuses']
  ): LeverageMultiplier['potential_increase'] {
    const actions: Array<{
      description: string;
      impact: number;
      difficulty: 'easy' | 'medium' | 'hard';
    }> = [];

    // Analyze each bonus category for improvement opportunities
    Object.entries(currentBonuses).forEach(([category, bonuses]) => {
      bonuses.forEach(bonus => {
        if (bonus.progress < 100) {
          const remaining = 100 - bonus.progress;
          const impact = (bonus.max - bonus.value) * (remaining / 100);
          
          actions.push({
            description: `Improve ${bonus.description} (${Math.round(bonus.progress)}% complete)`,
            impact,
            difficulty: remaining > 70 ? 'hard' : remaining > 30 ? 'medium' : 'easy'
          });
        }
      });
    });

    // Sort actions by impact
    actions.sort((a, b) => b.impact - a.impact);

    // Calculate total potential increase
    const totalPotential = actions.reduce((sum, action) => sum + action.impact, 0);

    return {
      value: totalPotential,
      actions: actions.slice(0, 5) // Return top 5 most impactful actions
    };
  }

  private calculateTerritoryClusters(territories: any[]): number {
    // Simplified clustering calculation
    return territories.length > 0 ? territories.length * 0.3 : 0;
  }

  private calculateResourceEfficiency(resources: any[]): number {
    // Simplified efficiency calculation
    return resources.length > 0 ? resources.length * 0.2 : 0;
  }

  private calculateSkillSpecialization(character: any): number {
    // Simplified skill specialization calculation
    return character.level * 0.02;
  }

  private calculateAllianceTerritorySynergy(gameState: GameState): number {
    // Simplified alliance territory synergy calculation
    return gameState.social.alliances[0]?.members.length || 0 * 0.1;
  }

  public getCurrentMultiplier(): LeverageMultiplier | null {
    return this.currentMultiplier;
  }
}

export const leverageSystem = LeverageSystem.getInstance();