import { Character, Mission, Resource, TraitType } from "../types/game";

/**
 * Mock implementation of Honeycomb Protocol's core offerings:
 * - Edge Toolkit: Blockchain interaction abstraction
 * - Hive Control: Game/user/profile management
 * - Character Manager: Character models and minting
 * - Resource Manager: Resource and crafting system
 * - Nectar Missions: Time-based challenges and quests
 * - Nectar Staking: Long-term engagement rewards
 * 
 * @see https://docs.honeycombprotocol.com/
 */
export class MockHiveControl {
  // Edge Toolkit & Hive Control
  private profiles: Map<string, Character> = new Map();
  private gameState: Map<string, any> = new Map();
  
  // Character Manager
  private characters: Map<string, {
    model: string,
    traits: any[],
    experience: number,
    level: number,
    mintTimestamp: number
  }> = new Map();
  
  // Resource Manager
  private resources: Map<string, Resource[]> = new Map();
  private craftingRecipes: Map<string, {
    inputs: { resource: string, amount: number }[],
    outputs: { resource: string, amount: number }[],
    craftingTime: number
  }> = new Map();
  
  // Nectar Missions
  private missions: Map<string, Mission[]> = new Map();
  private missionProgress: Map<string, Map<string, number>> = new Map();
  private activeMissions: Map<string, {
    characterId: string,
    missionId: string,
    startTime: number,
    endTime: number
  }[]> = new Map();
  
  // Nectar Staking
  private stakingPools: Map<string, {
    rewardRate: number,
    minStakeDuration: number,
    earlyUnstakePenalty: number
  }> = new Map();
  private stakedCharacters: Map<string, {
    characterId: string,
    poolId: string,
    stakeTime: number,
    accumulatedRewards: number
  }[]> = new Map();
  
  // Achievement & Leaderboard System
  private playerAchievements: Map<string, string[]> = new Map();
  private leaderboard: { playerId: string, score: number, name: string }[] = [];

  async getProfile(publicKey: string): Promise<Character | null> {
    return this.profiles.get(publicKey) || null;
  }

  async initializeProfile(publicKey: string): Promise<void> {
    // Create character model using Character Manager
    const characterModel = {
      model: "space_commander",
      traits: [
        { type: TraitType.COMBAT, level: 1, experience: 0 },
        { type: TraitType.EXPLORATION, level: 1, experience: 0 },
        { type: TraitType.HARVESTING, level: 1, experience: 0 },
        { type: TraitType.RESEARCH, level: 1, experience: 0 }
      ],
      experience: 0,
      level: 1,
      mintTimestamp: Date.now()
    };
    this.characters.set(publicKey, characterModel);

    // Initialize profile with Hive Control
    const mockCharacter: Character = {
      id: publicKey,
      name: "Space Explorer",
      publicKey,
      faction: "neutral",
      level: 1,
      experience: 0,
      resources: { energy: 200, minerals: 100 },
      traits: characterModel.traits,
      position: { x: 0, y: 0, z: 0 }
    };
    this.profiles.set(publicKey, mockCharacter);

    // Setup Resource Manager
    this.resources.set(publicKey, [
      { type: "energy", amount: 200 },
      { type: "minerals", amount: 100 }
    ]);

    // Initialize crafting recipes
    this.craftingRecipes.set("research_module", {
      inputs: [
        { resource: "energy", amount: 50 },
        { resource: "minerals", amount: 25 }
      ],
      outputs: [
        { resource: "research_points", amount: 1 }
      ],
      craftingTime: 300 // 5 minutes
    });

    // Setup Nectar Missions progress tracking
    this.missionProgress.set(publicKey, new Map());
    this.activeMissions.set(publicKey, []);

    // Create staking pool for the player
    const poolId = `pool_${publicKey}`;
    this.stakingPools.set(poolId, {
      rewardRate: 0.1, // 10% rewards
      minStakeDuration: 86400, // 24 hours
      earlyUnstakePenalty: 0.5 // 50% penalty
    });
    this.stakedCharacters.set(publicKey, []);

    // Initialize achievements
    this.playerAchievements.set(publicKey, []);
    
    // Add to leaderboard
    this.leaderboard.push({
      playerId: publicKey,
      score: 0,
      name: "Space Explorer"
    });

    // Initialize game state
    this.gameState.set(publicKey, {
      lastLogin: Date.now(),
      activeQuests: [],
      discoveredPlanets: new Set(),
      controlledPlanets: new Set(),
      researchLevels: {
        attack: 1,
        defense: 1,
        fleet: 1,
        logistics: 1
      }
    });
  }

  async getResources(publicKey: string): Promise<Resource[]> {
    return this.resources.get(publicKey) || [];
  }

  async getMissions(publicKey: string): Promise<Mission[]> {
    return this.missions.get(publicKey) || [];
  }
  
  async updateMissionProgress(publicKey: string, missionId: string, progress: number): Promise<void> {
    if (!this.missionProgress.has(publicKey)) {
      this.missionProgress.set(publicKey, new Map());
    }
    
    const playerMissions = this.missionProgress.get(publicKey)!;
    const currentProgress = playerMissions.get(missionId) || 0;
    playerMissions.set(missionId, currentProgress + progress);
    
    // Update player experience
    const profile = await this.getProfile(publicKey);
    if (profile) {
      profile.experience += Math.floor(progress * 10);
      profile.level = Math.floor(profile.experience / 1000) + 1;
      
      // Update leaderboard
      const leaderboardEntry = this.leaderboard.find(entry => entry.playerId === publicKey);
      if (leaderboardEntry) {
        leaderboardEntry.score = profile.experience;
      }
    }
  }
  
  async getPlayerMissionProgress(publicKey: string): Promise<Map<string, number>> {
    return this.missionProgress.get(publicKey) || new Map();
  }
  
  async awardAchievement(publicKey: string, achievement: string): Promise<void> {
    if (!this.playerAchievements.has(publicKey)) {
      this.playerAchievements.set(publicKey, []);
    }
    
    const achievements = this.playerAchievements.get(publicKey)!;
    if (!achievements.includes(achievement)) {
      achievements.push(achievement);
    }
  }
  
  async getPlayerAchievements(publicKey: string): Promise<string[]> {
    return this.playerAchievements.get(publicKey) || [];
  }
  
  async getLeaderboard(): Promise<{ playerId: string, score: number, name: string }[]> {
    return [...this.leaderboard].sort((a, b) => b.score - a.score);
  }
}

export class HoneycombService {
  private hiveControl: MockHiveControl;
  private defaultMissions: Mission[];

  constructor() {
    this.hiveControl = new MockHiveControl();
    
    // Define mission chains that unlock progressively
    this.defaultMissions = [
      // Harvesting Mission Chain
      {
        id: 'mission-harvest-1',
        name: 'Resource Initiate',
        description: 'Begin your resource empire: Harvest from 3 different planets',
        requiredLevel: 1,
        status: "AVAILABLE",
        rewards: [
          { type: 'experience', amount: 100 },
          { type: 'trait', traitType: TraitType.HARVESTING, amount: 50 },
          { type: 'achievement', name: 'Resource Pioneer', amount: 1 }
        ],
        targetProgress: 3,
        chain: 'harvest',
        chainStep: 1
      },
      {
        id: 'mission-harvest-2',
        name: 'Resource Magnate',
        description: 'Expand your operations: Harvest 1000 total resources',
        requiredLevel: 2,
        status: "LOCKED",
        rewards: [
          { type: 'experience', amount: 200 },
          { type: 'trait', traitType: TraitType.HARVESTING, amount: 100 },
          { type: 'achievement', name: 'Resource Baron', amount: 1 }
        ],
        targetProgress: 1000,
        chain: 'harvest',
        chainStep: 2
      },
      // Combat Mission Chain
      {
        id: 'mission-combat-1',
        name: 'Tactical Commander',
        description: 'Prove your worth: Capture your first enemy planet',
        requiredLevel: 1,
        status: "AVAILABLE",
        rewards: [
          { type: 'experience', amount: 150 },
          { type: 'trait', traitType: TraitType.COMBAT, amount: 75 },
          { type: 'achievement', name: 'First Blood', amount: 1 }
        ],
        targetProgress: 1,
        chain: 'combat',
        chainStep: 1
      },
      {
        id: 'mission-combat-2',
        name: 'Fleet Admiral',
        description: 'Build your armada: Successfully attack with 50+ units',
        requiredLevel: 2,
        status: "LOCKED",
        rewards: [
          { type: 'experience', amount: 300 },
          { type: 'trait', traitType: TraitType.COMBAT, amount: 150 },
          { type: 'achievement', name: 'Master Tactician', amount: 1 }
        ],
        targetProgress: 1,
        chain: 'combat',
        chainStep: 2
      },
      {
        id: 'mission-combat-3',
        name: 'Supreme Commander',
        description: 'Ultimate dominance: Control 5 planets simultaneously',
        requiredLevel: 3,
        status: "LOCKED",
        rewards: [
          { type: 'experience', amount: 500 },
          { type: 'trait', traitType: TraitType.COMBAT, amount: 250 },
          { type: 'achievement', name: 'Galactic Overlord', amount: 1 }
        ],
        targetProgress: 5,
        chain: 'combat',
        chainStep: 3
      },
      // Research Mission Chain
      {
        id: 'mission-research-1',
        name: 'Research Initiate',
        description: 'Begin technological advancement: Complete your first research',
        requiredLevel: 1,
        status: "AVAILABLE",
        rewards: [
          { type: 'experience', amount: 100 },
          { type: 'trait', traitType: TraitType.RESEARCH, amount: 50 },
          { type: 'achievement', name: 'Tech Pioneer', amount: 1 }
        ],
        targetProgress: 1,
        chain: 'research',
        chainStep: 1
      },
      {
        id: 'mission-research-2',
        name: 'Research Director',
        description: 'Advance your civilization: Reach Research Level 3 in any field',
        requiredLevel: 2,
        status: "LOCKED",
        rewards: [
          { type: 'experience', amount: 250 },
          { type: 'trait', traitType: TraitType.RESEARCH, amount: 125 },
          { type: 'achievement', name: 'Tech Master', amount: 1 }
        ],
        targetProgress: 3,
        chain: 'research',
        chainStep: 2
      },
      // Exploration Chain
      {
        id: 'mission-explorer-1',
        name: 'System Scout',
        description: 'Map your local system: Visit 5 different planets',
        requiredLevel: 1,
        status: "AVAILABLE",
        rewards: [
          { type: 'experience', amount: 150 },
          { type: 'trait', traitType: TraitType.EXPLORATION, amount: 75 },
          { type: 'achievement', name: 'System Cartographer', amount: 1 }
        ],
        targetProgress: 5,
        chain: 'explore',
        chainStep: 1
      },
      {
        id: 'mission-explorer-2',
        name: 'Stellar Explorer',
        description: 'Chart the galaxy: Discover all planets',
        requiredLevel: 2,
        status: "LOCKED",
        rewards: [
          { type: 'experience', amount: 400 },
          { type: 'trait', traitType: TraitType.EXPLORATION, amount: 200 },
          { type: 'achievement', name: 'Master Explorer', amount: 1 }
        ],
        targetProgress: 15,
        chain: 'explore',
        chainStep: 2
      }
    ];
  }

  private resolveMissionId(requestedId: string): string {
    const aliasMap: Record<string, string> = {
      'mission-harvest': 'mission-harvest-1',
      'mission-combat': 'mission-combat-1',
      'mission-explorer': 'mission-explorer-1',
      'mission-research': 'mission-research-1'
    };
    const mapped = aliasMap[requestedId] || requestedId;
    if (this.defaultMissions.some(m => m.id === mapped)) return mapped;
    const chain = requestedId.replace('mission-', '');
    const first = this.defaultMissions.find(m => m.chain === chain && (m.chainStep ?? 0) === 1);
    return first?.id || requestedId;
  }

  async getProfile(publicKey: string): Promise<Character | null> {
    return this.hiveControl.getProfile(publicKey);
  }

  async initializeProfile(publicKey: string): Promise<void> {
    await this.hiveControl.initializeProfile(publicKey);
  }

  private async getOrInitProfile(publicKey: string): Promise<Character> {
    let profile = await this.getProfile(publicKey);
    if (!profile) {
      await this.initializeProfile(publicKey);
      profile = await this.getProfile(publicKey);
    }
    // Fallback mock if still missing (shouldn't happen with MockHiveControl)
    if (!profile) {
      profile = {
        id: publicKey,
        name: 'Player',
        publicKey,
        faction: 'neutral',
        level: 1,
        experience: 0,
        resources: {},
        traits: [],
        position: { x: 0, y: 0, z: 0 }
      };
    }
    return profile;
  }

  async updateTrait(publicKey: string, traitType: TraitType, experience: number): Promise<void> {
    const profile = await this.getOrInitProfile(publicKey);

    const trait = (profile.traits || []).find(t => t.type === traitType);
    if (trait) {
      const currentExp = (trait.experience || 0) + experience;
      trait.experience = currentExp;
      trait.level = Math.floor(currentExp / 1000) + 1;
      
      // Award achievement for trait milestones
      if (trait.level >= 5) {
        await this.hiveControl.awardAchievement(publicKey, `${traitType} Master`);
      } else if (trait.level >= 3) {
        await this.hiveControl.awardAchievement(publicKey, `${traitType} Expert`);
      }
    } else {
      profile.traits.push({
        type: traitType,
        level: 1,
        experience
      });
    }
  }

  async createMission(
    publicKey: string,
    name: string,
    description: string,
    rewards: any[],
    targetProgress: number = 1
  ): Promise<Mission> {
    const mission: Mission = {
      id: `mission-${Date.now()}`,
      name,
      description,
      requiredLevel: 1,
      status: "AVAILABLE",
      rewards,
      targetProgress
    };

    const existingMissions = await this.hiveControl.getMissions(publicKey) || [];
    existingMissions.push(mission);
    return mission;
  }

  async getResources(publicKey: string): Promise<Resource[]> {
    return this.hiveControl.getResources(publicKey);
  }
  
  async getMissionProgress(publicKey: string, missionId: string): Promise<number> {
    const progress = await this.hiveControl.getPlayerMissionProgress(publicKey);
    return progress.get(missionId) || 0;
  }
  
  async updateMissionProgress(publicKey: string, missionId: string, progress: number): Promise<void> {
    const character = await this.getOrInitProfile(publicKey);
    const resolved = this.resolveMissionId(missionId);
    const now = Date.now();
    const defaultDuration = 30 * 60 * 1000;
    const activeList: any[] = ((this.hiveControl as any).activeMissions?.get?.(publicKey)) || [];
    let activeMission = activeList.find((m: any) => m.missionId === resolved);
    if (!activeMission) {
      activeMission = { characterId: publicKey, missionId: resolved, startTime: now, endTime: now + defaultDuration };
      activeList.push(activeMission);
      (this.hiveControl as any).activeMissions.set(publicKey, activeList);
    }

    await this.hiveControl.updateMissionProgress(publicKey, resolved, progress);
    const currentProgress = await this.getMissionProgress(publicKey, resolved);
    const mission = this.defaultMissions.find(m => m.id === resolved);
    
    if (mission && currentProgress >= (mission.targetProgress || 1)) {
      // Calculate time-based bonus (faster completion = better rewards)
      const denom = Math.max(1, (activeMission.endTime - activeMission.startTime));
      const timeBonus = Math.max(0, (activeMission.endTime - now) / denom);
      
      // Award experience with time bonus
      const expReward = mission.rewards.find(r => r.type === 'experience');
      if (expReward) {
        const bonusExp = Math.floor(expReward.amount * (1 + timeBonus));
        character.experience += bonusExp;
        character.level = Math.floor(character.experience / 1000) + 1;
      }
      
      // Award trait experience with time bonus
      const traitReward = mission.rewards.find(r => r.type === 'trait');
      if (traitReward && (traitReward as any).traitType) {
        const bonusTraitExp = Math.floor(traitReward.amount * (1 + timeBonus));
        await this.updateTrait(publicKey, (traitReward as any).traitType as TraitType, bonusTraitExp);
      }
      
      // Award achievement if applicable
      const achievementReward = mission.rewards.find(r => r.type === 'achievement');
      if (achievementReward && (achievementReward as any).name) {
        await this.hiveControl.awardAchievement(publicKey, (achievementReward as any).name as string);
      }

      // Update character's staking eligibility
      const characterData = (this.hiveControl as any).characters?.get?.(publicKey);
      if (characterData) {
        characterData.experience += Math.floor(100 * (1 + timeBonus));
        // Higher level characters get better staking rates
        const poolId = `pool_${publicKey}`;
        const pool = (this.hiveControl as any).stakingPools?.get?.(poolId);
        if (pool) {
          pool.rewardRate = 0.1 + (characterData.level * 0.01); // +1% per level
        }
      }

      // Unlock next mission in chain using Nectar Missions
      if (mission.chain && mission.chainStep != null) {
        const nextStep = (mission.chainStep ?? 0) + 1;
        const nextMission = this.defaultMissions.find(m => 
          m.chain === mission.chain && 
          m.chainStep === nextStep
        );
        if (nextMission && (!nextMission.requiredLevel || character.level >= (nextMission.requiredLevel || 1))) {
          nextMission.status = "AVAILABLE";
          
          // Create time-based challenge for next mission
          const missionDuration = 3600000; // 1 hour
          const newActiveMission = {
            characterId: publicKey,
            missionId: nextMission.id,
            startTime: now,
            endTime: now + missionDuration
          };
          
          const existingActive: any[] = (this.hiveControl as any).activeMissions?.get?.(publicKey) || [];
          existingActive.push(newActiveMission);
          (this.hiveControl as any).activeMissions.set(publicKey, existingActive);

          // Dispatch event for UI update
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mission-unlocked', { 
              detail: { 
                missionId: nextMission.id,
                name: nextMission.name,
                chain: nextMission.chain,
                duration: missionDuration,
                timeBonus: true
              }
            }));
          }
        }
      }

      // Remove completed mission from active missions
      const remainingMissions = (((this.hiveControl as any).activeMissions?.get?.(publicKey) || []) as any[])
        .filter((m: any) => m.missionId !== resolved);
      (this.hiveControl as any).activeMissions.set(publicKey, remainingMissions);

      // Update game state
      const gameState = (this.hiveControl as any).gameState?.get?.(publicKey);
      if (gameState) {
        gameState.activeQuests = remainingMissions.map(m => m.missionId);
      }

      // Dispatch completion event with time bonus info
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mission-completed', { 
          detail: { 
            missionId: mission.id,
            name: mission.name,
            rewards: mission.rewards,
            chain: mission.chain,
            timeBonus: timeBonus,
            bonusMultiplier: 1 + timeBonus
          }
        }));
      }
    }
  }
  
  async getPlayerAchievements(publicKey: string): Promise<string[]> {
    return this.hiveControl.getPlayerAchievements(publicKey);
  }
  
  async getLeaderboard(): Promise<{ playerId: string, score: number, name: string }[]> {
    return this.hiveControl.getLeaderboard();
  }

  // --- Game action tracking methods ---
  async recordHarvest(publicKey: string, planetId: string, resources: any): Promise<void> {
    // Update HARVESTING trait
    await this.updateTrait(publicKey, TraitType.HARVESTING, 10);
    // Try real on-chain write via ResourceManager if available
    try {
      const { useHoneycomb } = await import('./honeycomb/HoneycombProvider');
      const ctx: any = (useHoneycomb as any)();
      if (ctx?.client && ctx?.projectAddress) {
        const { ResourceManager } = await import('./honeycomb/ResourceManager');
        const rm = new (ResourceManager as any)(ctx.client, ctx.projectAddress);
        // Mint a tiny amount to simulate on-chain harvest (dev/demo)
        await rm.mintResource('ENERGY', String(resources?.energy || 1), publicKey, publicKey);
      }
    } catch {}
    // Update mission progress
    await this.updateMissionProgress(publicKey, 'mission-harvest', 1);
    
    // In a real implementation, persist harvest results on-chain
    console.log(`Player ${publicKey} harvested planet ${planetId} for ${JSON.stringify(resources)}`);
  }

  async recordCombatResult(attackerId: string, _defenderId: string | null, planetId: string, success: boolean): Promise<void> {
    // Update COMBAT trait
    await this.updateTrait(attackerId, TraitType.COMBAT, success ? 20 : 5);
    
    // Update mission progress if successful
    if (success) {
      await this.updateMissionProgress(attackerId, 'mission-combat', 1);
      
      // Award achievement for first conquest
      const combatMissionProgress = await this.getMissionProgress(attackerId, 'mission-combat');
      if (combatMissionProgress === 1) {
        await this.hiveControl.awardAchievement(attackerId, 'First Conquest');
      }
    }
    
    // In a real implementation, persist combat results on-chain
    console.log(`Player ${attackerId} ${success ? 'conquered' : 'failed to conquer'} planet ${planetId}`);
  }

  async recordExploration(publicKey: string, planetId: string): Promise<void> {
    // Update EXPLORATION trait
    await this.updateTrait(publicKey, TraitType.EXPLORATION, 15);
    
    // Update mission progress
    await this.updateMissionProgress(publicKey, 'mission-explorer', 1);
    
    // In a real implementation, persist exploration data on-chain
    console.log(`Player ${publicKey} explored planet ${planetId}`);
  }

  // --- Methods for MissionOrchestrator integration ---
  async getMissions(): Promise<Mission[]> {
    return this.defaultMissions;
  }

  async startMission(_character: any, _missionData: any): Promise<any> {
    // In a real implementation, start mission on-chain
    return { success: true, transactionId: 'mock-tx-' + Date.now() };
  }

  async updateTerritoryState(_territory: any): Promise<void> {
    // In a real implementation, update territory state on-chain
    return;
  }

  async getMissionCompletions(_territoryId: string): Promise<any[]> {
    // Return mock completion data
    return [];
  }

  // --- Methods for CraftingSystem integration ---
  async awardItem(_character: any, _item: any): Promise<void> {
    // In a real implementation, award item on-chain
    return;
  }

  // --- Methods for TraitEvolutionSystem integration ---
  async updateCharacterAttributes(_publicKey: string, _attributes: any): Promise<void> {
    // In a real implementation, update character attributes on-chain
    return;
  }
}