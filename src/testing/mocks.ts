import { Character, Territory, Mission, Resource, FactionType } from '../types/game';

export class MockHiveControl {
  private profiles: Map<string, Character> = new Map();
  private resources: Map<string, Resource[]> = new Map();
  private missions: Map<string, Mission[]> = new Map();

  async getProfile(publicKey: string): Promise<Character | null> {
    return this.profiles.get(publicKey) || null;
  }

  async initializeProfile(publicKey: string): Promise<void> {
    const mockCharacter: Character = {
      id: publicKey,
      name: 'Test Character',
      publicKey,
      faction: 'neutral',
      level: 1,
      experience: 0,
      resources: { gold: 100, iron: 50 },
      traits: [],
      inventory: [],
      position: { x: 0, y: 0, z: 0 }
    };
    this.profiles.set(publicKey, mockCharacter);
  }

  async getResources(publicKey: string): Promise<Resource[]> {
    return this.resources.get(publicKey) || [];
  }

  async getMissions(publicKey: string): Promise<Mission[]> {
    return this.missions.get(publicKey) || [];
  }
}

export class MockSolanaPay {
  async processInGamePurchase(
    amount: number,
    publicKey: string,
    itemId: string
  ): Promise<{ paymentUrl: string; reference: string }> {
    return {
      paymentUrl: `https://mock.solana.pay/${itemId}`,
      reference: `mock-ref-${Date.now()}`
    };
  }

  async confirmPayment(reference: string): Promise<string> {
    return `mock-signature-${reference}`;
  }
}

export class MockVerxioService {
  private streaks: Map<string, number> = new Map();
  private points: Map<string, number> = new Map();

  async updateStreak(publicKey: string): Promise<number> {
    const currentStreak = (this.streaks.get(publicKey) || 0) + 1;
    this.streaks.set(publicKey, currentStreak);
    return currentStreak;
  }

  async addPoints(publicKey: string, amount: number): Promise<number> {
    const currentPoints = (this.points.get(publicKey) || 0) + amount;
    this.points.set(publicKey, currentPoints);
    return currentPoints;
  }
}

export class MockTerritoryManager {
  private territories: Map<string, Territory> = new Map();

  async claimTerritory(
    territoryId: string,
    faction: FactionType
  ): Promise<Territory> {
    const territory = this.territories.get(territoryId);
    if (!territory) throw new Error('Territory not found');

    const updatedTerritory = {
      ...territory,
      controlledBy: faction
    };
    this.territories.set(territoryId, updatedTerritory);
    return updatedTerritory;
  }

  async getTerritories(): Promise<Territory[]> {
    return Array.from(this.territories.values());
  }
}

export class MockCombatSystem {
  async resolveCombat(
    attacker: Character,
    defender: Character
  ): Promise<{
    winner: Character;
    experienceGained: number;
  }> {
    // Simple mock combat resolution
    const attackerStr = attacker.traits.find(t => t.type === 'Strength')?.level || 1;
    const defenderStr = defender.traits.find(t => t.type === 'Strength')?.level || 1;

    return {
      winner: attackerStr >= defenderStr ? attacker : defender,
      experienceGained: 100
    };
  }
}

export class MockSystemOrchestrator {
  private territoryManager: MockTerritoryManager;
  private combatSystem: MockCombatSystem;

  constructor() {
    this.territoryManager = new MockTerritoryManager();
    this.combatSystem = new MockCombatSystem();
  }

  async processGameAction(
    action: string,
    data: any
  ): Promise<{
    success: boolean;
    result: any;
  }> {
    return {
      success: true,
      result: { message: 'Action processed successfully' }
    };
  }
}