import { LoyaltyTier } from "../types/game";

// Mock VerxioSDK since the actual SDK is not available
export class MockVerxioSDK {
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

export class VerxioService {
  private sdk: MockVerxioSDK;

  constructor() {
    this.sdk = new MockVerxioSDK();
  }

  async updateStreak(publicKey: string): Promise<number> {
    return this.sdk.updateStreak(publicKey);
  }

  async addPoints(publicKey: string, amount: number): Promise<number> {
    return this.sdk.addPoints(publicKey, amount);
  }

  getLoyaltyTier(points: number): LoyaltyTier {
    const tiers: LoyaltyTier[] = [
      {
        level: 1,
        name: "Bronze",
        requiredPoints: 0,
        benefits: ["Basic Rewards"]
      },
      {
        level: 2,
        name: "Silver",
        requiredPoints: 1000,
        benefits: ["Basic Rewards", "5% Bonus"]
      },
      {
        level: 3,
        name: "Gold",
        requiredPoints: 5000,
        benefits: ["Basic Rewards", "10% Bonus", "Special Items"]
      }
    ];

    return tiers.reduce((highest, tier) => {
      if (points >= tier.requiredPoints && tier.level > highest.level) {
        return tier;
      }
      return highest;
    }, tiers[0]);
  }
}