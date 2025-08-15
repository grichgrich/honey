import { useHoneycomb } from './honeycomb/HoneycombProvider';
import { sendClientTransactions } from '@honeycomb-protocol/edge-client/client/walletHelpers';
import { ResourceManager } from './ResourceManager';
import { CharacterManager } from './CharacterManager';

export interface MissionReward {
  xp: number;
  resources?: Array<{
    type: string;
    amount: string;
  }>;
  traits?: Array<{
    name: string;
    value: number;
  }>;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'exploration' | 'combat' | 'harvesting' | 'research';
  requirements: {
    level?: number;
    traits?: Record<string, number>;
    resources?: Array<{
      type: string;
      amount: string;
    }>;
    previousMissions?: string[];
  };
  rewards: MissionReward;
  chainStep?: number;
  nextMissionId?: string;
}

export class MissionManager {
  private client;
  private projectAddress: string;
  private resourceManager: ResourceManager;
  private characterManager: CharacterManager;
  private missionPoolAddress?: string;

  constructor(
    client: any,
    projectAddress: string,
    resourceManager: ResourceManager,
    characterManager: CharacterManager
  ) {
    this.client = client;
    this.projectAddress = projectAddress;
    this.resourceManager = resourceManager;
    this.characterManager = characterManager;
  }

  async initializeMissionSystem(authority: string, payer: string) {
    try {
      // Create mission pool
      const {
        createCreateMissionPoolTransaction: {
          missionPool: poolAddress,
          tx: poolTx
        }
      } = await this.client.createCreateMissionPoolTransaction({
        project: this.projectAddress,
        authority,
        payer,
        params: {
          name: "Space Conquest Missions",
          description: "Complete missions to earn rewards and progress through the game",
          uri: "https://example.com/missions.json"
        }
      });

      await sendClientTransactions(this.client, { publicKey: authority }, poolTx);
      this.missionPoolAddress = poolAddress.toString();
      console.log('Mission system initialized');
    } catch (error) {
      console.error('Error initializing mission system:', error);
      throw error;
    }
  }

  async createMission(
    mission: Mission,
    authority: string,
    payer?: string
  ) {
    if (!this.missionPoolAddress) {
      throw new Error('Mission pool not initialized');
    }

    try {
      const {
        createCreateMissionTransaction: {
          mission: missionAddress,
          tx: txResponse
        }
      } = await this.client.createCreateMissionTransaction({
        missionPool: this.missionPoolAddress,
        authority,
        payer: payer || authority,
        params: {
          title: mission.title,
          description: mission.description,
          type: mission.type,
          requirements: {
            level: mission.requirements.level?.toString(),
            traits: mission.requirements.traits 
              ? Object.entries(mission.requirements.traits).map(([name, value]) => ({
                  name,
                  value: value.toString()
                }))
              : undefined,
            resources: mission.requirements.resources?.map(r => ({
              address: this.resourceManager.getResourceAddress(r.type) || '',
              amount: r.amount
            })),
            previousMissions: mission.requirements.previousMissions
          },
          rewards: {
            xp: mission.rewards.xp.toString(),
            resources: mission.rewards.resources?.map(r => ({
              address: this.resourceManager.getResourceAddress(r.type) || '',
              amount: r.amount
            })),
            traits: mission.rewards.traits?.map(t => ({
              name: t.name,
              value: t.value.toString()
            }))
          },
          chainStep: mission.chainStep?.toString(),
          nextMission: mission.nextMissionId
        }
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log('Created mission: ' + mission.title);
      return missionAddress.toString();
    } catch (error) {
      console.error('Error creating mission:', error);
      throw error;
    }
  }

  async startMission(
    missionAddress: string,
    characterAddress: string,
    owner: string,
    authority: string,
    payer?: string
  ) {
    if (!this.missionPoolAddress) {
      throw new Error('Mission pool not initialized');
    }

    try {
      const {
        createSendCharactersOnMissionTransaction: txResponse
      } = await this.client.createSendCharactersOnMissionTransaction({
        missionPool: this.missionPoolAddress,
        mission: missionAddress,
        characters: [characterAddress],
        owner,
        authority,
        payer: payer || authority
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log('Started mission ' + missionAddress + ' with character ' + characterAddress);
    } catch (error) {
      console.error('Error starting mission:', error);
      throw error;
    }
  }

  async completeMission(
    missionAddress: string,
    characterAddress: string,
    owner: string,
    authority: string,
    payer?: string
  ) {
    if (!this.missionPoolAddress) {
      throw new Error('Mission pool not initialized');
    }

    try {
      const {
        createRecallCharactersFromMissionTransaction: txResponse
      } = await this.client.createRecallCharactersFromMissionTransaction({
        missionPool: this.missionPoolAddress,
        mission: missionAddress,
        characters: [characterAddress],
        owner,
        authority,
        payer: payer || authority
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log('Completed mission ' + missionAddress + ' with character ' + characterAddress);
    } catch (error) {
      console.error('Error completing mission:', error);
      throw error;
    }
  }

  // Helper method to get mission pool address
  getMissionPoolAddress(): string | undefined {
    return this.missionPoolAddress;
  }
}

// React hook for using MissionManager
export const useMissionManager = () => {
  const { client, projectAddress } = useHoneycomb();
  const resourceManager = new ResourceManager(client, projectAddress);
  const characterManager = new CharacterManager(client, projectAddress);
  
  if (!client || !projectAddress) {
    throw new Error('MissionManager requires HoneycombProvider');
  }

  return new MissionManager(client, projectAddress, resourceManager, characterManager);
};
