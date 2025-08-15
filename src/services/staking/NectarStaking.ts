/**
 * Nectar Staking Service
 * Handles character staking and rewards
 * @see https://docs.honeycombprotocol.com/
 */

import { StakingPool, StakedCharacter, StakingReward } from '../../types/game';

export class NectarStaking {
  private pools: Map<string, StakingPool> = new Map();
  private stakedCharacters: Map<string, StakedCharacter[]> = new Map(); // player -> staked characters
  private accumulatedRewards: Map<string, number> = new Map(); // character -> rewards

  async createPool(params: {
    id: string;
    rewardRate: number;
    minStakeDuration: number;
    earlyUnstakePenalty: number;
  }): Promise<StakingPool> {
    const pool: StakingPool = {
      ...params,
      totalStaked: 0,
      created: Date.now()
    };
    this.pools.set(params.id, pool);
    return pool;
  }

  async stakeCharacter(params: {
    playerId: string;
    characterId: string;
    poolId: string;
  }): Promise<{ stakeId: string; startTime: number }> {
    const pool = this.pools.get(params.poolId);
    if (!pool) throw new Error('Pool not found');

    const stakeId = `stake_${Date.now()}`;
    const stake: StakedCharacter = {
      id: stakeId,
      characterId: params.characterId,
      poolId: params.poolId,
      playerId: params.playerId,
      startTime: Date.now(),
      lastClaimTime: Date.now(),
      accumulatedRewards: 0
    };

    let playerStakes = this.stakedCharacters.get(params.playerId);
    if (!playerStakes) {
      playerStakes = [];
      this.stakedCharacters.set(params.playerId, playerStakes);
    }

    playerStakes.push(stake);
    pool.totalStaked++;

    return {
      stakeId: stake.id,
      startTime: stake.startTime
    };
  }

  async unstakeCharacter(params: {
    playerId: string;
    stakeId: string;
  }): Promise<{
    rewards: number;
    penalty: number;
  }> {
    const playerStakes = this.stakedCharacters.get(params.playerId) || [];
    const stakeIndex = playerStakes.findIndex(s => s.id === params.stakeId);
    
    if (stakeIndex === -1) throw new Error('Stake not found');
    
    const stake = playerStakes[stakeIndex];
    const pool = this.pools.get(stake.poolId);
    if (!pool) throw new Error('Pool not found');

    // Calculate staking duration
    const now = Date.now();
    const stakeDuration = now - stake.startTime;
    
    // Calculate rewards
    const rewards = await this.calculateRewards(stake.id);
    
    // Apply early unstake penalty if applicable
    let penalty = 0;
    if (stakeDuration < pool.minStakeDuration) {
      penalty = Math.floor(rewards * pool.earlyUnstakePenalty);
    }

    // Remove stake
    playerStakes.splice(stakeIndex, 1);
    pool.totalStaked--;

    // Clear accumulated rewards
    this.accumulatedRewards.delete(stake.characterId);

    return {
      rewards: rewards - penalty,
      penalty
    };
  }

  async claimRewards(params: {
    playerId: string;
    stakeId: string;
  }): Promise<StakingReward> {
    const playerStakes = this.stakedCharacters.get(params.playerId) || [];
    const stake = playerStakes.find(s => s.id === params.stakeId);
    
    if (!stake) throw new Error('Stake not found');
    
    const pool = this.pools.get(stake.poolId);
    if (!pool) throw new Error('Pool not found');

    const rewards = await this.calculateRewards(stake.id);
    if (rewards <= 0) throw new Error('No rewards to claim');

    // Update last claim time
    stake.lastClaimTime = Date.now();
    stake.accumulatedRewards += rewards;

    return {
      stakeId: stake.id,
      amount: rewards,
      timestamp: Date.now()
    };
  }

  private async calculateRewards(stakeId: string): Promise<number> {
    const stake = Array.from(this.stakedCharacters.values())
      .flat()
      .find(s => s.id === stakeId);
    
    if (!stake) throw new Error('Stake not found');
    
    const pool = this.pools.get(stake.poolId);
    if (!pool) throw new Error('Pool not found');

    const now = Date.now();
    const timeSinceLastClaim = now - stake.lastClaimTime;
    
    // Calculate base rewards
    const baseRewards = Math.floor(
      (timeSinceLastClaim / (24 * 60 * 60 * 1000)) * // days
      pool.rewardRate * 
      100 // base reward amount
    );

    // Apply any bonuses (could be based on character level, traits, etc.)
    return baseRewards;
  }

  async getStakedCharacters(playerId: string): Promise<StakedCharacter[]> {
    return this.stakedCharacters.get(playerId) || [];
  }

  async getPool(poolId: string): Promise<StakingPool | null> {
    return this.pools.get(poolId) || null;
  }
}
