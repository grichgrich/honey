// Web Worker for heavy computations
import { LeverageMultiplier } from '../systems/LeverageSystem';

interface ComputeTask {
  type: 'leverage_calculation' | 'path_finding' | 'combat_simulation' | 'resource_optimization';
  data: any;
  taskId: string;
}

interface ComputeResult {
  type: string;
  result: any;
  taskId: string;
  computeTime: number;
}

// Cache for computed results
const computeCache = new Map<string, {
  result: any;
  timestamp: number;
  computeTime: number;
}>();

const CACHE_DURATION = 5000; // 5 seconds cache duration

// Handle incoming compute tasks
self.onmessage = (event: MessageEvent<ComputeTask>) => {
  const startTime = performance.now();
  const { type, data, taskId } = event.data;

  // Check cache first
  const cacheKey = `${type}-${JSON.stringify(data)}`;
  const cachedResult = computeCache.get(cacheKey);
  if (cachedResult && (performance.now() - cachedResult.timestamp) < CACHE_DURATION) {
    self.postMessage({
      type,
      result: cachedResult.result,
      taskId,
      computeTime: cachedResult.computeTime,
      fromCache: true
    });
    return;
  }

  let result;
  switch (type) {
    case 'leverage_calculation':
      result = calculateLeverageMultiplier(data);
      break;
    case 'path_finding':
      result = findOptimalPath(data);
      break;
    case 'combat_simulation':
      result = simulateCombat(data);
      break;
    case 'resource_optimization':
      result = optimizeResources(data);
      break;
    default:
      throw new Error(`Unknown compute task type: ${type}`);
  }

  const computeTime = performance.now() - startTime;

  // Cache the result
  computeCache.set(cacheKey, {
    result,
    timestamp: performance.now(),
    computeTime
  });

  // Send back the result
  self.postMessage({
    type,
    result,
    taskId,
    computeTime
  });
};

function calculateLeverageMultiplier(data: any): LeverageMultiplier {
  // Complex leverage calculations moved to worker
  const {
    territories,
    resources,
    missions,
    character,
    social,
    research,
    combat
  } = data;

  // Territory calculations
  const territoryBonus = territories.reduce((acc: number, territory: any) => {
    const controlBonus = territory.controlLevel * 0.05;
    const resourceBonus = territory.resources.length * 0.02;
    const defenseBonus = territory.defenseRating * 0.01;
    return acc + controlBonus + resourceBonus + defenseBonus;
  }, 0);

  // Resource optimization
  const resourceEfficiency = resources.reduce((acc: number, resource: any) => {
    const extractionRate = resource.extractionRate * 0.1;
    const qualityBonus = resource.quality * 0.05;
    const processingBonus = resource.processingLevel * 0.03;
    return acc + extractionRate + qualityBonus + processingBonus;
  }, 0);

  // Mission synergy calculations
  const missionMultiplier = missions.reduce((acc: number, mission: any) => {
    const progressBonus = mission.progress * 0.01;
    const difficultyBonus = mission.difficulty * 0.2;
    const typeBonus = getMissionTypeBonus(mission.type);
    return acc + progressBonus + difficultyBonus + typeBonus;
  }, 1);

  // Research impact
  const researchBonus = research.completedTechnologies.reduce((acc: number, tech: any) => {
    const levelBonus = tech.level * 0.1;
    const synergyBonus = calculateTechSynergy(tech, research.completedTechnologies);
    return acc + levelBonus + synergyBonus;
  }, 0);

  // Combat effectiveness
  const combatMultiplier = calculateCombatMultiplier(combat);

  // Social influence
  const socialBonus = calculateSocialBonus(social);

  // Character progression
  const characterMultiplier = calculateCharacterMultiplier(character);

  // Combine all factors with weighted importance
  const total = (
    territoryBonus * 1.5 +
    resourceEfficiency * 1.2 +
    missionMultiplier * 1.3 +
    researchBonus * 1.4 +
    combatMultiplier * 1.1 +
    socialBonus * 1.0 +
    characterMultiplier * 1.2
  );

  return {
    total,
    base_rate: 1.0,
    bonuses: {
      territory_control: [{
        value: territoryBonus,
        description: 'Territory Control',
        source: 'territories',
        max: 2.0,
        progress: (territoryBonus / 2.0) * 100
      }],
      resource_diversity: [{
        value: resourceEfficiency,
        description: 'Resource Efficiency',
        source: 'resources',
        max: 1.5,
        progress: (resourceEfficiency / 1.5) * 100
      }],
      mission_completion: [{
        value: missionMultiplier - 1,
        description: 'Mission Synergy',
        source: 'missions',
        max: 2.0,
        progress: ((missionMultiplier - 1) / 2.0) * 100
      }],
      character_level: [{
        value: characterMultiplier - 1,
        description: 'Character Progress',
        source: 'character',
        max: 1.5,
        progress: ((characterMultiplier - 1) / 1.5) * 100
      }],
      social_achievements: [{
        value: socialBonus,
        description: 'Social Influence',
        source: 'social',
        max: 1.0,
        progress: (socialBonus / 1.0) * 100
      }],
      alliance_synergy: [],
      combat_rating: [{
        value: combatMultiplier - 1,
        description: 'Combat Effectiveness',
        source: 'combat',
        max: 1.5,
        progress: ((combatMultiplier - 1) / 1.5) * 100
      }],
      research_progress: [{
        value: researchBonus,
        description: 'Research Impact',
        source: 'research',
        max: 2.0,
        progress: (researchBonus / 2.0) * 100
      }],
      special_events: []
    },
    efficiency: calculateEfficiency({
      territoryBonus,
      resourceEfficiency,
      missionMultiplier,
      researchBonus,
      combatMultiplier,
      socialBonus,
      characterMultiplier
    }),
    potential_increase: calculatePotentialIncrease(data)
  };
}

function findOptimalPath(data: any) {
  // A* pathfinding implementation for territory navigation
  // ... implementation
  return { path: [], cost: 0 };
}

function simulateCombat(data: any) {
  // Monte Carlo combat simulation
  // ... implementation
  return { outcome: 'victory', probability: 0.75 };
}

function optimizeResources(data: any) {
  // Resource allocation optimization
  // ... implementation
  return { allocation: [], efficiency: 0.8 };
}

// Helper functions
function getMissionTypeBonus(type: string): number {
  const bonuses: Record<string, number> = {
    exploration: 0.2,
    combat: 0.3,
    research: 0.25,
    diplomacy: 0.15
  };
  return bonuses[type] || 0.1;
}

function calculateTechSynergy(tech: any, allTech: any[]): number {
  // Calculate how well technologies work together
  return allTech.reduce((acc: number, other: any) => {
    if (tech.id === other.id) return acc;
    return acc + (tech.synergy[other.type] || 0);
  }, 0);
}

function calculateCombatMultiplier(combat: any): number {
  const baseMultiplier = 1.0;
  const victoryBonus = combat.victories * 0.05;
  const defenseBonus = combat.defenseSuccesses * 0.03;
  const ratingBonus = combat.rating * 0.001;
  return baseMultiplier + victoryBonus + defenseBonus + ratingBonus;
}

function calculateSocialBonus(social: any): number {
  const allianceBonus = social.alliances.length * 0.1;
  const achievementBonus = social.achievements.length * 0.05;
  const rankBonus = Math.max(0, (100 - social.leaderboardRank) / 100);
  return allianceBonus + achievementBonus + rankBonus;
}

function calculateCharacterMultiplier(character: any): number {
  const baseMultiplier = 1.0;
  const levelBonus = character.level * 0.02;
  const skillBonus = Object.values(character.skills).reduce((acc: number, level: number) => {
    return acc + level * 0.01;
  }, 0);
  return baseMultiplier + levelBonus + skillBonus;
}

function calculateEfficiency(factors: any): number {
  // Calculate overall system efficiency based on factor balance
  const values = Object.values(factors);
  const average = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  const variance = values.reduce((acc: number, val: number) => {
    return acc + Math.pow(val - average, 2);
  }, 0) / values.length;
  
  // Higher efficiency when factors are balanced
  return Math.max(0.5, 1.0 - Math.sqrt(variance) * 0.2);
}

function calculatePotentialIncrease(data: any): any {
  // Analyze current state and identify improvement opportunities
  const actions = [];
  const maxPotential = 0.5;

  // ... implementation

  return {
    value: maxPotential,
    actions
  };
}