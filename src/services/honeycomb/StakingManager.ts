/**
 * Staking Manager Service
 * Handles staking mechanics for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";
import { LockTypeEnum } from "@honeycomb-protocol/edge-client";

export class StakingManager {
  private client: any;
  private projectAddress: string;

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  /**
   * Creates a character staking pool
   */
  async createCharacterStakingPool(
    wallet: WalletContextState,
    params: {
      name: string;
      rewardResource: string;
      rewardsPerDuration: string;
      rewardsDuration: string;
      maxRewardsDuration: string;
      minStakeDuration: string;
      cooldownDuration?: string;
      resetStakeDuration?: string;
      startTime?: string;
      endTime?: string | null;
      multipliers?: Array<{
        value: string;
        type: {
          collection?: string;
          creator?: string;
          minNftCount?: string;
          minStakeDuration?: string;
        };
      }>;
    }
  ): Promise<{
    stakingPoolAddress: string;
    multipliersAddress?: string;
  }> {
    try {
      const { createCreateStakingPoolTransaction: { stakingPoolAddress, multipliersAddress, tx } } = 
        await this.client.createCreateStakingPoolTransaction({
          project: this.projectAddress,
          resource: params.rewardResource,
          authority: wallet.publicKey?.toString(),
          multiplier: params.multipliers ? {
            decimals: 2,
            multipliers: params.multipliers
          } : undefined,
          metadata: {
            name: params.name,
            rewardsPerDuration: params.rewardsPerDuration,
            rewardsDuration: params.rewardsDuration,
            maxRewardsDuration: params.maxRewardsDuration,
            minStakeDuration: params.minStakeDuration,
            cooldownDuration: params.cooldownDuration || "0",
            resetStakeDuration: params.resetStakeDuration || "0",
            startTime: params.startTime || Date.now().toString(),
            endTime: params.endTime,
            lockType: LockTypeEnum.Freeze
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return { stakingPoolAddress, multipliersAddress };
    } catch (error) {
      console.error("Failed to create staking pool:", error);
      throw error;
    }
  }

  /**
   * Updates a staking pool
   */
  async updateStakingPool(
    wallet: WalletContextState,
    params: {
      stakingPool: string;
      characterModel?: string;
      rewardResource?: string;
      metadata?: {
        name?: string;
        rewardsPerDuration?: string;
        rewardsDuration?: string;
        maxRewardsDuration?: string;
        minStakeDuration?: string;
        cooldownDuration?: string;
        resetStakeDuration?: string;
        startTime?: string;
        endTime?: string | null;
      };
    }
  ): Promise<void> {
    try {
      const { createUpdateStakingPoolTransaction: { tx } } = 
        await this.client.createUpdateStakingPoolTransaction({
          project: this.projectAddress,
          authority: wallet.publicKey?.toString(),
          stakingPool: params.stakingPool,
          characterModel: params.characterModel,
          resource: params.rewardResource,
          metadata: params.metadata
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to update staking pool:", error);
      throw error;
    }
  }

  /**
   * Creates multipliers for a staking pool
   */
  async createMultipliers(
    wallet: WalletContextState,
    params: {
      stakingPool: string;
      decimals: number;
      multipliers: Array<{
        value: string;
        type: {
          collection?: string;
          creator?: string;
          minNftCount?: string;
          minStakeDuration?: string;
        };
      }>;
    }
  ): Promise<string> {
    try {
      const { createInitMultipliersTransaction: { multipliersAddress, tx } } = 
        await this.client.createInitMultipliersTransaction({
          project: this.projectAddress,
          authority: wallet.publicKey?.toString(),
          stakingPool: params.stakingPool,
          multipliers: params.multipliers,
          decimals: params.decimals
        });

      await sendClientTransactions(this.client, wallet, tx);
      return multipliersAddress;
    } catch (error) {
      console.error("Failed to create multipliers:", error);
      throw error;
    }
  }

  /**
   * Stakes characters
   */
  async stakeCharacters(
    wallet: WalletContextState,
    params: {
      stakingPool: string;
      characterModel: string;
      characterAddresses: string[];
    }
  ): Promise<void> {
    try {
      const { createStakeCharactersTransactions: { tx } } = 
        await this.client.createStakeCharactersTransactions({
          project: this.projectAddress,
          stakingPool: params.stakingPool,
          characterModel: params.characterModel,
          characterAddresses: params.characterAddresses,
          feePayer: wallet.publicKey?.toString()
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to stake characters:", error);
      throw error;
    }
  }

  /**
   * Claims staking rewards
   */
  async claimRewards(
    wallet: WalletContextState,
    params: {
      characterAddresses: string[];
      characterModel: string;
    }
  ): Promise<void> {
    try {
      const { createClaimStakingRewardsTransactions: { tx } } = 
        await this.client.createClaimStakingRewardsTransactions({
          characterAddresses: params.characterAddresses,
          characterModel: params.characterModel,
          feePayer: wallet.publicKey?.toString()
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to claim rewards:", error);
      throw error;
    }
  }

  /**
   * Unstakes characters
   */
  async unstakeCharacters(
    wallet: WalletContextState,
    params: {
      characterAddresses: string[];
      characterModel: string;
    }
  ): Promise<void> {
    try {
      const { createUnstakeCharactersTransactions: { tx } } = 
        await this.client.createUnstakeCharactersTransactions({
          characterAddresses: params.characterAddresses,
          characterModel: params.characterModel,
          feePayer: wallet.publicKey?.toString()
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to unstake characters:", error);
      throw error;
    }
  }

  /**
   * Creates a token staking pool
   */
  async createTokenStakingPool(
    wallet: WalletContextState,
    params: {
      tokenMint: string;
      maxStakeDuration: string;
      minStakeDuration: string;
      startTime: string;
      endTime?: string | null;
      multipliers?: Array<{
        value: string;
        type: {
          minAmount?: string;
          minDuration?: string;
        };
      }>;
    }
  ): Promise<string> {
    try {
      const { createCreateSplStakingPoolTransaction: { splStakingPoolAddress, tx } } = 
        await this.client.createCreateSplStakingPoolTransaction({
          project: this.projectAddress,
          stakeTokenMint: params.tokenMint,
          authority: wallet.publicKey?.toString(),
          multipliers: params.multipliers,
          metadata: {
            maxStakeDurationSecs: params.maxStakeDuration,
            minStakeDurationSecs: params.minStakeDuration,
            startTime: params.startTime,
            endTime: params.endTime
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return splStakingPoolAddress;
    } catch (error) {
      console.error("Failed to create token staking pool:", error);
      throw error;
    }
  }

  /**
   * Stakes tokens
   */
  async stakeTokens(
    wallet: WalletContextState,
    params: {
      stakingPool: string;
      amount: string;
      lockPeriod: string;
    }
  ): Promise<void> {
    try {
      const { createStakeSplTokensTransaction: { tx } } = 
        await this.client.createStakeSplTokensTransaction({
          project: this.projectAddress,
          splStakingPool: params.stakingPool,
          staker: wallet.publicKey?.toString(),
          amount: params.amount,
          lockPeriodSecs: params.lockPeriod
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to stake tokens:", error);
      throw error;
    }
  }

  /**
   * Claims token staking rewards
   */
  async claimTokenRewards(
    wallet: WalletContextState,
    params: {
      stakingPool: string;
      stakingReceipt: string;
    }
  ): Promise<void> {
    try {
      const { createClaimSplRewardsTransaction: { tx } } = 
        await this.client.createClaimSplRewardsTransaction({
          project: this.projectAddress,
          splStakingPool: params.stakingPool,
          staker: wallet.publicKey?.toString(),
          stakingReciept: params.stakingReceipt
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to claim token rewards:", error);
      throw error;
    }
  }

  /**
   * Unstakes tokens
   */
  async unstakeTokens(
    wallet: WalletContextState,
    params: {
      stakingPool: string;
      stakingReceipt: string;
    }
  ): Promise<void> {
    try {
      const { createUnstakeSplTokensTransaction: { tx } } = 
        await this.client.createUnstakeSplTokensTransaction({
          project: this.projectAddress,
          splStakingPool: params.stakingPool,
          staker: wallet.publicKey?.toString(),
          stakingReciept: params.stakingReceipt
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to unstake tokens:", error);
      throw error;
    }
  }
}
