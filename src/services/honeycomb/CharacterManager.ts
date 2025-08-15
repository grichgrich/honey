/**
 * Character Manager Service
 * Handles character creation and management for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";
import { MintAsKind } from "@honeycomb-protocol/edge-client";

export class CharacterManager {
  private client: any;
  private projectAddress: string;

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  /**
   * Creates assembler config for character creation
   */
  async createAssemblerConfig(
    wallet: WalletContextState,
    params: {
      ticker: string;
      traits?: string[];
      numAssets?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateAssemblerConfigTransaction: { tx } } = 
        await this.client.createCreateAssemblerConfigTransaction({
          project: this.projectAddress,
          authority: wallet.publicKey?.toString(),
          treeConfig: {
            basic: {
              numAssets: params.numAssets || 100000
            }
          },
          ticker: params.ticker,
          order: params.traits || []
        });

      await sendClientTransactions(this.client, wallet, tx);
      return tx.assemblerConfig;
    } catch (error) {
      console.error("Failed to create assembler config:", error);
      throw error;
    }
  }

  /**
   * Adds traits to character model
   */
  async addCharacterTraits(
    wallet: WalletContextState,
    params: {
      assemblerConfig: string;
      traits: Array<{
        label: string;
        name: string;
        uri: string;
      }>;
    }
  ): Promise<void> {
    try {
      const { createAddCharacterTraitsTransactions: { tx } } = 
        await this.client.createAddCharacterTraitsTransactions({
          traits: params.traits,
          assemblerConfig: params.assemblerConfig,
          authority: wallet.publicKey?.toString()
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to add character traits:", error);
      throw error;
    }
  }

  /**
   * Creates a character model
   */
  async createCharacterModel(
    wallet: WalletContextState,
    params: {
      assemblerConfig: string;
      collectionName: string;
      symbol: string;
      description: string;
      attributes?: Array<[string, string]>;
      ejectionCooldown?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateCharacterModelTransaction: { tx } } = 
        await this.client.createCreateCharacterModelTransaction({
          project: this.projectAddress,
          authority: wallet.publicKey?.toString(),
          mintAs: {
            kind: MintAsKind.MplCore
          },
          config: {
            kind: "Assembled",
            assemblerConfigInput: {
              assemblerConfig: params.assemblerConfig,
              collectionName: params.collectionName,
              name: "Character NFT",
              symbol: params.symbol,
              description: params.description,
              sellerFeeBasisPoints: 0,
              creators: [
                {
                  address: wallet.publicKey?.toString() || "",
                  share: 100
                }
              ]
            }
          },
          attributes: params.attributes || [],
          cooldown: params.ejectionCooldown ? {
            ejection: params.ejectionCooldown
          } : undefined
        });

      await sendClientTransactions(this.client, wallet, tx);
      return tx.characterModel;
    } catch (error) {
      console.error("Failed to create character model:", error);
      throw error;
    }
  }

  /**
   * Creates a characters tree
   */
  async createCharactersTree(
    wallet: WalletContextState,
    params: {
      characterModel: string;
      numAssets?: number;
    }
  ): Promise<string> {
    try {
      const { createCreateCharactersTreeTransaction: { tx } } = 
        await this.client.createCreateCharactersTreeTransaction({
          authority: wallet.publicKey?.toString(),
          project: this.projectAddress,
          characterModel: params.characterModel,
          treeConfig: {
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
   * Assembles (creates) a character
   */
  async assembleCharacter(
    wallet: WalletContextState,
    params: {
      assemblerConfig: string;
      characterModel: string;
      attributes?: Array<[string, string]>;
      uri?: string;
    }
  ): Promise<void> {
    try {
      const { createAssembleCharacterTransaction: { tx } } = 
        await this.client.createAssembleCharacterTransaction({
          project: this.projectAddress,
          assemblerConfig: params.assemblerConfig,
          characterModel: params.characterModel,
          wallet: wallet.publicKey?.toString(),
          attributes: params.attributes,
          uri: params.uri
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to assemble character:", error);
      throw error;
    }
  }

  /**
   * Updates character traits
   */
  async updateCharacterTraits(
    wallet: WalletContextState,
    params: {
      assemblerConfig: string;
      characterModel: string;
      characterAddress: string;
      attributes: Array<[string, string]>;
    }
  ): Promise<void> {
    try {
      const { createUpdateCharacterTraitsTransaction: { tx } } = 
        await this.client.createUpdateCharacterTraitsTransaction({
          project: this.projectAddress,
          wallet: wallet.publicKey?.toString(),
          assemblerConfig: params.assemblerConfig,
          characterAddress: params.characterAddress,
          characterModel: params.characterModel,
          attributes: params.attributes
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to update character traits:", error);
      throw error;
    }
  }

  /**
   * Equips a resource on a character
   */
  async equipResource(
    wallet: WalletContextState,
    params: {
      characterModel: string;
      characterAddress: string;
      resource: string;
      amount: string;
    }
  ): Promise<void> {
    try {
      const { createEquipResourceOnCharacterTransaction: { tx } } = 
        await this.client.createEquipResourceOnCharacterTransaction({
          characterModel: params.characterModel,
          characterAddress: params.characterAddress,
          resource: params.resource,
          owner: wallet.publicKey?.toString(),
          amount: params.amount
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to equip resource:", error);
      throw error;
    }
  }

  /**
   * Unequips a resource from a character
   */
  async unequipResource(
    wallet: WalletContextState,
    params: {
      characterModel: string;
      characterAddress: string;
      resource: string;
      amount: string;
    }
  ): Promise<void> {
    try {
      const { createDismountResourceOnCharacterTransaction: { tx } } = 
        await this.client.createDismountResourceOnCharacterTransaction({
          characterModel: params.characterModel,
          characterAddress: params.characterAddress,
          resource: params.resource,
          owner: wallet.publicKey?.toString(),
          amount: params.amount
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to unequip resource:", error);
      throw error;
    }
  }
}
