import { Mission, Character, Territory, FactionType, TraitType } from '../types/game';
import { LeverageService } from './LeverageService';
import { TerritoryManager } from './TerritoryManager';

interface MissionTemplate {
  type: 'exploration' | 'combat' | 'gathering' | 'diplomacy' | 'siege';
  baseXP: number;
  baseResources: Array<{ type: string; amount: number }>;
  difficultyMultiplier: number;
  requiredTraits?: Array<{ type: TraitType; minLevel: number }>;
  territoryInfluence: number;
}

export class MissionGenerator {
  private leverageService: LeverageService;
  private territoryManager: TerritoryManager;
  private missionTemplates: Map<string, MissionTemplate>;

  constructor(leverageService: LeverageService, territoryManager: TerritoryManager) {
    this.leverageService = leverageService;
    this.territoryManager = territoryManager;
    this.missionTemplates = this.initializeMissionTemplates();
  }

  private initializeMissionTemplates(): Map<string, MissionTemplate> {
    const templates = new Map<string, MissionTemplate>();

    // Exploration Missions
    templates.set('scout_territory', {
      type: 'exploration',
      baseXP: 100,
      baseResources: [{ type: 'intelligence', amount: 10 }],
      difficultyMultiplier: 1.0,
      territoryInfluence: 0.5
    });

    // Combat Missions
    templates.set('defend_outpost', {
      type: 'combat',
      baseXP: 200,
      baseResources: [
        { type: 'honor_tokens', amount: 20 },
        { type: 'combat_experience', amount: 15 }
      ],
      difficultyMultiplier: 1.5,
      requiredTraits: [
        { type: TraitType.Strength, minLevel: 2 }
      ],
      territoryInfluence: 1.0
    });

    // Gathering Missions
    templates.set('harvest_resources', {
      type: 'gathering',
      baseXP: 150,
      baseResources: [
        { type: 'raw_materials', amount: 30 },
        { type: 'rare_elements', amount: 5 }
      ],
      difficultyMultiplier: 1.2,
      requiredTraits: [
        { type: TraitType.Wisdom, minLevel: 1 }
      ],
      territoryInfluence: 0.7
    });

    // Diplomacy Missions
    templates.set('negotiate_alliance', {
      type: 'diplomacy',
      baseXP: 300,
      baseResources: [
        { type: 'diplomatic_influence', amount: 25 },
        { type: 'faction_reputation', amount: 20 }
      ],
      difficultyMultiplier: 1.8,
      requiredTraits: [
        { type: TraitType.Wisdom, minLevel: 3 }
      ],
      territoryInfluence: 1.5
    });

    // Siege Missions
    templates.set('siege_fortress', {
      type: 'siege',
      baseXP: 500,
      baseResources: [
        { type: 'siege_tokens', amount: 50 },
        { type: 'territory_influence', amount: 40 }
      ],
      difficultyMultiplier: 2.0,
      requiredTraits: [
        { type: TraitType.Strength, minLevel: 4 },
        { type: TraitType.SiegeEngineer, minLevel: 1 }
      ],
      territoryInfluence: 2.0
    });

    return templates;
  }

  async generateMissionsForTerritory(
    territory: Territory,
    character: Character
  ): Promise<Mission[]> {
    const missions: Mission[] = [];
    const analysis = await this.leverageService.analyzeGameState();

    // Get optimal mission path for character
    const optimalPath = await this.leverageService.getOptimalMissionPath(character);

    // Generate missions based on territory state and character level
    for (const [templateId, template] of this.missionTemplates) {
      // Skip if character doesn't meet trait requirements
      if (template.requiredTraits && !this.meetsTraitRequirements(character, template.requiredTraits)) {
        continue;
      }

      // Calculate mission difficulty based on territory state
      const difficultyLevel = this.calculateDifficulty(territory, template.type);
      
      // Apply leverage analysis to rewards
      const leverageMultiplier = await this.leverageService.calculateTraitEvolution(
        character,
        TraitType.Strength // Example trait, could be dynamic
      );

      // Generate mission with scaled rewards
      const mission: Mission = {
        id: `${templateId}_${territory.id}_${Date.now()}`,
        name: this.generateMissionName(template.type, territory),
        description: this.generateMissionDescription(template.type, territory),
        requiredLevel: Math.max(1, Math.floor(difficultyLevel * template.difficultyMultiplier)),
        duration: this.calculateMissionDuration(template.type, difficultyLevel),
        rewards: {
          xp: Math.floor(template.baseXP * difficultyLevel * leverageMultiplier),
          resources: template.baseResources.map(resource => ({
            type: resource.type,
            amount: Math.floor(resource.amount * difficultyLevel * leverageMultiplier)
          }))
        },
        requiredTraits: template.requiredTraits,
        territoryInfluence: template.territoryInfluence * leverageMultiplier
      };

      // Add bonus rewards for optimal path missions
      if (optimalPath.includes(mission.name)) {
        mission.rewards.xp *= 1.2; // 20% bonus XP
        mission.rewards.resources = mission.rewards.resources.map(resource => ({
          ...resource,
          amount: Math.floor(resource.amount * 1.2) // 20% bonus resources
        }));
      }

      missions.push(mission);
    }

    // Sort missions by strategic value
    return this.sortMissionsByStrategicValue(missions, territory, character);
  }

  private meetsTraitRequirements(
    character: Character,
    requirements: Array<{ type: TraitType; minLevel: number }>
  ): boolean {
    return requirements.every(req => {
      const trait = character.traits.find(t => t.type === req.type);
      return trait && trait.level >= req.minLevel;
    });
  }

  private calculateDifficulty(territory: Territory, missionType: string): number {
    let baseDifficulty = 1.0;

    // Increase difficulty for contested territories
    if (territory.contestedBy.length > 0) {
      baseDifficulty *= 1.5;
    }

    // Adjust based on mission type
    switch (missionType) {
      case 'combat':
      case 'siege':
        baseDifficulty *= territory.contestedBy.length > 0 ? 2.0 : 1.5;
        break;
      case 'diplomacy':
        baseDifficulty *= territory.controlledBy ? 1.3 : 1.8;
        break;
      case 'gathering':
        baseDifficulty *= 1.2;
        break;
      case 'exploration':
        baseDifficulty *= territory.controlledBy ? 1.0 : 1.4;
        break;
    }

    return baseDifficulty;
  }

  private calculateMissionDuration(type: string, difficulty: number): number {
    const baseDuration = {
      exploration: 1800, // 30 minutes
      combat: 3600,     // 1 hour
      gathering: 2700,  // 45 minutes
      diplomacy: 7200,  // 2 hours
      siege: 14400      // 4 hours
    }[type] || 3600;

    return Math.floor(baseDuration * difficulty);
  }

  private generateMissionName(type: string, territory: Territory): string {
    const prefixes = {
      exploration: ['Scout', 'Explore', 'Survey', 'Map'],
      combat: ['Defend', 'Attack', 'Secure', 'Raid'],
      gathering: ['Harvest', 'Collect', 'Gather', 'Extract'],
      diplomacy: ['Negotiate', 'Mediate', 'Broker', 'Establish'],
      siege: ['Besiege', 'Storm', 'Assault', 'Conquer']
    };

    const prefix = prefixes[type as keyof typeof prefixes]?.[
      Math.floor(Math.random() * prefixes[type as keyof typeof prefixes].length)
    ] || 'Unknown';

    return `${prefix} ${territory.name}`;
  }

  private generateMissionDescription(type: string, territory: Territory): string {
    const descriptions = {
      exploration: `Explore and map the unknown regions of ${territory.name}, gathering valuable intelligence for your faction.`,
      combat: `Engage in combat operations to strengthen your faction's position in ${territory.name}.`,
      gathering: `Gather essential resources from ${territory.name} to support your faction's efforts.`,
      diplomacy: `Conduct diplomatic missions in ${territory.name} to increase your faction's influence.`,
      siege: `Lead a siege operation to capture strategic positions in ${territory.name}.`
    };

    return descriptions[type as keyof typeof descriptions] || 'Unknown mission type';
  }

  private async sortMissionsByStrategicValue(
    missions: Mission[],
    territory: Territory,
    character: Character
  ): Promise<Mission[]> {
    const analysis = await this.leverageService.analyzeGameState();
    
    return missions.sort((a, b) => {
      let aValue = 0;
      let bValue = 0;

      // Factor in mission rewards
      aValue += a.rewards.xp + a.rewards.resources.reduce((sum, r) => sum + r.amount, 0);
      bValue += b.rewards.xp + b.rewards.resources.reduce((sum, r) => sum + r.amount, 0);

      // Factor in territory influence
      aValue *= a.territoryInfluence;
      bValue *= b.territoryInfluence;

      // Boost value for optimal path missions
      if (analysis.recommendations.some(rec => rec.includes(a.name))) aValue *= 1.5;
      if (analysis.recommendations.some(rec => rec.includes(b.name))) bValue *= 1.5;

      // Consider character traits
      const characterTraits = new Set(character.traits.map(t => t.type));
      a.requiredTraits?.forEach(trait => {
        if (characterTraits.has(trait.type)) aValue *= 1.2;
      });
      b.requiredTraits?.forEach(trait => {
        if (characterTraits.has(trait.type)) bValue *= 1.2;
      });

      return bValue - aValue;
    });
  }
}