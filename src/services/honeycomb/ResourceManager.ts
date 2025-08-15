/**
 * Resource Manager Service
 * Handles resource creation and management for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";
import { ResourceStorageEnum } from "@honeycomb-protocol/edge-client";

export class ResourceManager {
  private client: any;
  private projectAddress: string;

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  /**
   * Creates a new resource
   */
  async createResource(
    wallet: WalletContextState,
    params: {
      name: string;
      symbol: string;
      decimals: number;
      uri: string;
      tags?: string[];
      compressed?: boolean;
    }
  ): Promise<string> {
    try {
      const { createCreateNewResourceTransaction: { resource, tx } } = 
        await this.client.createCreateNewResourceTransaction({
          project: this.projectAddress,
          authority: wallet.publicKey?.toString(),
          params: {
            name: params.name,
            decimals: params.decimals,
            symbol: params.symbol,
            uri: params.uri,
            storage: params.compressed ? 
              ResourceStorageEnum.LedgerState : 
              ResourceStorageEnum.AccountState,
            tags: params.tags || []
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return resource;
    } catch (error) {
      console.error("Failed to create resource:", error);
      throw error;
    }
  }

  /**
   * Creates a resource tree for compressed resources
   */
  async createResourceTree(
    wallet: WalletContextState,
    params: {
      resource: string;
      numAssets?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateNewResourceTreeTransaction: { treeAddress, tx } } = 
        await this.client.createCreateNewResourceTreeTransaction({
          project: this.projectAddress,
          authority: wallet.publicKey?.toString(),
          resource: params.resource,
          treeConfig: {
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
   * Mints resources to a user
   */
  async mintResource(
    wallet: WalletContextState,
    params: {
      resource: string;
      amount: string;
      recipient: string;
    }
  ): Promise<void> {
    try {
      const { createMintResourceTransaction: { tx } } = 
        await this.client.createMintResourceTransaction({
          resource: params.resource,
          amount: params.amount,
          authority: wallet.publicKey?.toString(),
          owner: params.recipient
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to mint resource:", error);
      throw error;
    }
  }

  /**
   * Creates a resource faucet
   */
  async createFaucet(
    wallet: WalletContextState,
    params: {
      resource: string;
      amount: number;
      repeatInterval: number;
    }
  ): Promise<string> {
    try {
      const { createInitializeFaucetTransaction: { faucet, tx } } = 
        await this.client.createInitializeFaucetTransaction({
          resource: params.resource,
          amount: params.amount,
          authority: wallet.publicKey?.toString(),
          repeatInterval: params.repeatInterval
        });

      await sendClientTransactions(this.client, wallet, tx);
      return faucet;
    } catch (error) {
      console.error("Failed to create faucet:", error);
      throw error;
    }
  }

  /**
   * Burns resources
   */
  async burnResource(
    wallet: WalletContextState,
    params: {
      resource: string;
      amount: string;
    }
  ): Promise<void> {
    try {
      const { createBurnResourceTransaction: { tx } } = 
        await this.client.createBurnResourceTransaction({
          authority: wallet.publicKey?.toString(),
          resource: params.resource,
          amount: params.amount
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to burn resource:", error);
      throw error;
    }
  }

  /**
   * Transfers resources between users
   */
  async transferResource(
    wallet: WalletContextState,
    params: {
      resource: string;
      recipient: string;
      amount: string;
    }
  ): Promise<void> {
    try {
      const { createTransferResourceTransaction: { tx } } = 
        await this.client.createTransferResourceTransaction({
          resource: params.resource,
          owner: wallet.publicKey?.toString(),
          recipient: params.recipient,
          amount: params.amount
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to transfer resource:", error);
      throw error;
    }
  }

  /**
   * Creates a crafting recipe
   */
  async createRecipe(
    wallet: WalletContextState,
    params: {
      xp: string;
      ingredients: Array<{
        resourceAddress: string;
        amount: string;
      }>;
      result: {
        resourceAddress: string;
        amount: string;
      };
    }
  ): Promise<string> {
    try {
      const { createCreateRecipeTransaction: { recipe, tx } } = 
        await this.client.createInitializeRecipeTransaction({
          project: this.projectAddress,
          xp: params.xp,
          authority: wallet.publicKey?.toString(),
          ingredients: params.ingredients,
          meal: params.result
        });

      await sendClientTransactions(this.client, wallet, tx);
      return recipe;
    } catch (error) {
      console.error("Failed to create recipe:", error);
      throw error;
    }
  }

  /**
   * Starts crafting process
   */
  async startCrafting(
    wallet: WalletContextState,
    params: {
      recipe: string;
    }
  ): Promise<void> {
    try {
      const { createInitCookingProcessTransactions: { transactions } } = 
        await this.client.createInitCookingProcessTransactions({
          recipe: params.recipe,
          authority: wallet.publicKey?.toString()
        });

      // Send each transaction in sequence
      for (const tx of transactions) {
        await sendClientTransactions(this.client, wallet, tx);
      }
    } catch (error) {
      console.error("Failed to start crafting:", error);
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
}
