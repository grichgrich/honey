/**
 * Mission Manager Service
 * Handles mission creation and management for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";
import { RewardKind } from "@honeycomb-protocol/edge-client";

export class MissionManager {
  private client: any;
  private projectAddress: string;

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  /**
   * Creates a mission pool
   */
  async createMissionPool(
    wallet: WalletContextState,
    params: {
      name: string;
      characterModel: string;
    }
  ): Promise<string> {
    try {
      const { createCreateMissionPoolTransaction: { missionPoolAddress, tx } } = 
        await this.client.createCreateMissionPoolTransaction({
          data: {
            name: params.name,
            project: this.projectAddress,
            authority: wallet.publicKey?.toString(),
            characterModel: params.characterModel
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return missionPoolAddress;
    } catch (error) {
      console.error("Failed to create mission pool:", error);
      throw error;
    }
  }

  /**
   * Creates a new mission
   */
  async createMission(
    wallet: WalletContextState,
    params: {
      name: string;
      missionPool: string;
      cost: {
        address: string;
        amount: string;
      };
      duration: string;
      minXp: string;
      rewards: Array<{
        kind: RewardKind;
        min: string;
        max: string;
        resource?: string;
      }>;
    }
  ): Promise<string> {
    try {
      const { createCreateMissionTransaction: { missionAddress, tx } } = 
        await this.client.createCreateMissionTransaction({
          data: {
            name: params.name,
            project: this.projectAddress,
            cost: params.cost,
            duration: params.duration,
            minXp: params.minXp,
            rewards: params.rewards,
            missionPool: params.missionPool,
            authority: wallet.publicKey?.toString()
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
      return missionAddress;
    } catch (error) {
      console.error("Failed to create mission:", error);
      throw error;
    }
  }

  /**
   * Sends characters on a mission
   */
  async sendCharactersOnMission(
    wallet: WalletContextState,
    params: {
      mission: string;
      characterAddresses: string[];
    }
  ): Promise<void> {
    try {
      const { createSendCharactersOnMissionTransaction: { tx } } = 
        await this.client.createSendCharactersOnMissionTransaction({
          data: {
            mission: params.mission,
            characterAddresses: params.characterAddresses,
            authority: wallet.publicKey?.toString()
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to send characters on mission:", error);
      throw error;
    }
  }

  /**
   * Recalls characters from a mission
   */
  async recallCharacters(
    wallet: WalletContextState,
    params: {
      mission: string;
      characterAddresses: string[];
      lookupTableAddress?: string;
    }
  ): Promise<void> {
    try {
      const { createRecallCharactersTransaction: { tx } } = 
        await this.client.createRecallCharactersTransaction({
          data: {
            mission: params.mission,
            characterAddresses: params.characterAddresses,
            authority: wallet.publicKey?.toString()
          },
          lutAddresses: params.lookupTableAddress ? [params.lookupTableAddress] : undefined
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to recall characters:", error);
      throw error;
    }
  }

  /**
   * Gets active missions for a character
   */
  async getActiveMissions(characterId: string): Promise<Array<{
    missionId: string;
    startTime: number;
    endTime: number;
    rewards?: Array<{
      type: string;
      amount: string;
    }>;
  }>> {
    try {
      const missions = await this.client.findMissions({
        characterIds: [characterId],
        status: "ACTIVE"
      });

      return missions.map(mission => ({
        missionId: mission.id,
        startTime: mission.startTime,
        endTime: mission.endTime,
        rewards: mission.rewards
      }));
    } catch (error) {
      console.error("Failed to get active missions:", error);
      throw error;
    }
  }

  /**
   * Gets mission history for a character
   */
  async getMissionHistory(characterId: string): Promise<Array<{
    missionId: string;
    startTime: number;
    endTime: number;
    status: string;
    rewards?: Array<{
      type: string;
      amount: string;
    }>;
  }>> {
    try {
      const history = await this.client.fetchCharacterHistory({
        addresses: [characterId],
        event: ["Mission"]
      });

      return history.map(entry => ({
        missionId: entry.missionId,
        startTime: entry.startTime,
        endTime: entry.endTime,
        status: entry.status,
        rewards: entry.rewards
      }));
    } catch (error) {
      console.error("Failed to get mission history:", error);
      throw error;
    }
  }

  /**
   * Gets available missions for a character
   */
  async getAvailableMissions(characterId: string): Promise<Array<{
    missionId: string;
    name: string;
    duration: string;
    minXp: string;
    cost: {
      address: string;
      amount: string;
    };
    rewards: Array<{
      kind: RewardKind;
      min: string;
      max: string;
      resource?: string;
    }>;
  }>> {
    try {
      const missions = await this.client.findMissions({
        characterIds: [characterId],
        status: "AVAILABLE"
      });

      return missions.map(mission => ({
        missionId: mission.id,
        name: mission.name,
        duration: mission.duration,
        minXp: mission.minXp,
        cost: mission.cost,
        rewards: mission.rewards
      }));
    } catch (error) {
      console.error("Failed to get available missions:", error);
      throw error;
    }
  }
}
