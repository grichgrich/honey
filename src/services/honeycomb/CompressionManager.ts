/**
 * Compression Manager Service
 * Handles state compression for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";

export class CompressionManager {
  private client: any;
  private projectAddress: string;

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  /**
   * Creates a compressed profiles tree
   */
  async createProfilesTree(
    wallet: WalletContextState,
    params: {
      numAssets?: number;
      maxDepth?: number;
      maxBufferSize?: number;
      canopyDepth?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateProfilesTreeTransaction: { tx } } = 
        await this.client.createCreateProfilesTreeTransaction({
          project: this.projectAddress,
          payer: wallet.publicKey?.toString(),
          treeConfig: params.maxDepth ? {
            advanced: {
              maxDepth: params.maxDepth,
              maxBufferSize: params.maxBufferSize || 64,
              canopyDepth: params.canopyDepth || 14
            }
          } : {
            basic: {
              numAssets: params.numAssets || 100000
            }
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return tx.treeAddress;
    } catch (error) {
      console.error("Failed to create profiles tree:", error);
      throw error;
    }
  }

  /**
   * Creates a compressed characters tree
   */
  async createCharactersTree(
    wallet: WalletContextState,
    params: {
      characterModel: string;
      numAssets?: number;
      maxDepth?: number;
      maxBufferSize?: number;
      canopyDepth?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateCharactersTreeTransaction: { tx } } = 
        await this.client.createCreateCharactersTreeTransaction({
          authority: wallet.publicKey?.toString(),
          project: this.projectAddress,
          characterModel: params.characterModel,
          treeConfig: params.maxDepth ? {
            advanced: {
              maxDepth: params.maxDepth,
              maxBufferSize: params.maxBufferSize || 64,
              canopyDepth: params.canopyDepth || 14
            }
          } : {
            basic: {
              numAssets: params.numAssets || 100000
            }
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return tx.treeAddress;
    } catch (error) {
      console.error("Failed to create characters tree:", error);
      throw error;
    }
  }

  /**
   * Creates a compressed resource tree
   */
  async createResourceTree(
    wallet: WalletContextState,
    params: {
      resource: string;
      numAssets?: number;
      maxDepth?: number;
      maxBufferSize?: number;
      canopyDepth?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateNewResourceTreeTransaction: { treeAddress, tx } } = 
        await this.client.createCreateNewResourceTreeTransaction({
          project: this.projectAddress,
          authority: wallet.publicKey?.toString(),
          resource: params.resource,
          treeConfig: params.maxDepth ? {
            advanced: {
              maxDepth: params.maxDepth,
              maxBufferSize: params.maxBufferSize || 64,
              canopyDepth: params.canopyDepth || 14
            }
          } : {
            basic: {
              numAssets: params.numAssets || 100000
            }
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return treeAddress;
    } catch (error) {
      console.error("Failed to create resource tree:", error);
      throw error;
    }
  }

  /**
   * Creates a compressed staking pool tree
   */
  async createStakingPoolTree(
    wallet: WalletContextState,
    params: {
      stakingPool: string;
      numAssets?: number;
      maxDepth?: number;
      maxBufferSize?: number;
      canopyDepth?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateNewSplStakingPoolTreeTransaction: { treeAddress, tx } } = 
        await this.client.createCreateNewSplStakingPoolTreeTransaction({
          project: this.projectAddress,
          splStakingPool: params.stakingPool,
          authority: wallet.publicKey?.toString(),
          treeConfig: params.maxDepth ? {
            advanced: {
              maxDepth: params.maxDepth,
              maxBufferSize: params.maxBufferSize || 64,
              canopyDepth: params.canopyDepth || 14
            }
          } : {
            basic: {
              numAssets: params.numAssets || 100000
            }
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return treeAddress;
    } catch (error) {
      console.error("Failed to create staking pool tree:", error);
      throw error;
    }
  }

  /**
   * Wraps a resource (converts to compressed state)
   */
  async wrapResource(
    wallet: WalletContextState,
    params: {
      resource: string;
      amount: string;
    }
  ): Promise<void> {
    try {
      const { createCreateWrapHoldingTransaction: { tx } } = 
        await this.client.createCreateWrapHoldingTransaction({
          authority: wallet.publicKey?.toString(),
          resource: params.resource,
          amount: params.amount
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to wrap resource:", error);
      throw error;
    }
  }

  /**
   * Unwraps a resource (converts to uncompressed state)
   */
  async unwrapResource(
    wallet: WalletContextState,
    params: {
      resource: string;
      amount: string;
    }
  ): Promise<void> {
    try {
      const { createCreateUnwrapHoldingTransaction: { tx } } = 
        await this.client.createCreateUnwrapHoldingTransaction({
          authority: wallet.publicKey?.toString(),
          resource: params.resource,
          amount: params.amount
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to unwrap resource:", error);
      throw error;
    }
  }

  /**
   * Gets compression statistics
   */
  async getCompressionStats(): Promise<{
    profilesTreeSize: number;
    charactersTreeSize: number;
    resourceTreeSize: number;
    stakingTreeSize: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    compressionRatio: number;
  }> {
    try {
      // In real implementation, this would query on-chain data
      // For now, return mock stats
      return {
        profilesTreeSize: 1000000,
        charactersTreeSize: 2000000,
        resourceTreeSize: 1500000,
        stakingTreeSize: 500000,
        totalOriginalSize: 5000000,
        totalCompressedSize: 5000,
        compressionRatio: 1000
      };
    } catch (error) {
      console.error("Failed to get compression stats:", error);
      throw error;
    }
  }
}
