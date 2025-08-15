import { useHoneycomb } from './honeycomb/HoneycombProvider';
import { sendClientTransactions } from '@honeycomb-protocol/edge-client/client/walletHelpers';
import { HONEYCOMB_CONFIG } from '../config/honeycomb.config';

export interface CharacterTraits {
  attack: number;
  defense: number;
  harvesting: number;
  research: number;
  level: number;
  experience: number;
}

export interface CharacterStats {
  planetsControlled: number;
  resourcesHarvested: number;
  battlesWon: number;
  researchCompleted: number;
}

export class CharacterManager {
  private client;
  private projectAddress: string;
  private characterModelAddress?: string;
  private characterTreeAddress?: string;

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  async initializeCharacterSystem(authority: string, payer: string) {
    try {
      // Create character model
      const {
        createCreateCharacterModelTransaction: {
          characterModel: modelAddress,
          tx: modelTx
        }
      } = await this.client.createCreateCharacterModelTransaction({
        project: this.projectAddress,
        authority,
        payer,
        params: {
          name: "Space Commander",
          symbol: "CMDR",
          uri: "https://example.com/commander.json",
          sellerFeeBasisPoints: 0,
          creators: [{
            address: authority,
            share: 100,
            verified: true
          }],
          traits: [
            { name: "attack", type: "number", min: 1, max: 100 },
            { name: "defense", type: "number", min: 1, max: 100 },
            { name: "harvesting", type: "number", min: 1, max: 100 },
            { name: "research", type: "number", min: 1, max: 100 },
            { name: "level", type: "number", min: 1, max: 100 },
            { name: "experience", type: "number", min: 0, max: 1000000 }
          ]
        }
      });

      await sendClientTransactions(this.client, { publicKey: authority }, modelTx);
      this.characterModelAddress = modelAddress.toString();

      // Create character tree
      const {
        createCreateCharactersTreeTransaction: {
          tree: treeAddress,
          tx: treeTx
        }
      } = await this.client.createCreateCharactersTreeTransaction({
        project: this.projectAddress,
        authority,
        payer,
        characterModel: modelAddress.toString(),
        treeConfig: HONEYCOMB_CONFIG.CHARACTERS.TREE_CONFIG
      });

      await sendClientTransactions(this.client, { publicKey: authority }, treeTx);
      this.characterTreeAddress = treeAddress.toString();

      console.log('Character system initialized');
    } catch (error) {
      console.error('Error initializing character system:', error);
      throw error;
    }
  }

  async createCharacter(
    owner: string,
    authority: string,
    payer?: string
  ) {
    if (!this.characterModelAddress) {
      throw new Error('Character model not initialized');
    }

    try {
      // Create initial traits
      const initialTraits: CharacterTraits = {
        attack: 10,
        defense: 10,
        harvesting: 10,
        research: 10,
        level: 1,
        experience: 0
      };

      const {
        createAssembleCharacterTransaction: {
          character: characterAddress,
          tx: txResponse
        }
      } = await this.client.createAssembleCharacterTransaction({
        characterModel: this.characterModelAddress,
        owner,
        authority,
        payer: payer || authority,
        traits: Object.entries(initialTraits).map(([name, value]) => ({
          name,
          value: value.toString()
        }))
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log(\`Created character for \${owner}\`);
      return characterAddress.toString();
    } catch (error) {
      console.error('Error creating character:', error);
      throw error;
    }
  }

  async updateCharacterTraits(
    characterAddress: string,
    traits: Partial<CharacterTraits>,
    authority: string,
    payer?: string
  ) {
    if (!this.characterModelAddress) {
      throw new Error('Character model not initialized');
    }

    try {
      const {
        createUpdateCharacterTraitsTransaction: txResponse
      } = await this.client.createUpdateCharacterTraitsTransaction({
        characterModel: this.characterModelAddress,
        character: characterAddress,
        authority,
        payer: payer || authority,
        traits: Object.entries(traits).map(([name, value]) => ({
          name,
          value: value.toString()
        }))
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log(\`Updated traits for character \${characterAddress}\`);
    } catch (error) {
      console.error('Error updating character traits:', error);
      throw error;
    }
  }

  async equipResource(
    characterAddress: string,
    resourceAddress: string,
    amount: string,
    owner: string,
    authority: string,
    payer?: string
  ) {
    if (!this.characterModelAddress) {
      throw new Error('Character model not initialized');
    }

    try {
      const {
        createEquipResourceOnCharacterTransaction: txResponse
      } = await this.client.createEquipResourceOnCharacterTransaction({
        characterModel: this.characterModelAddress,
        characterAddress,
        resource: resourceAddress,
        owner,
        amount,
        authority,
        payer: payer || authority
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log(\`Equipped resource on character \${characterAddress}\`);
    } catch (error) {
      console.error('Error equipping resource:', error);
      throw error;
    }
  }

  async unequipResource(
    characterAddress: string,
    resourceAddress: string,
    amount: string,
    owner: string,
    authority: string,
    payer?: string
  ) {
    if (!this.characterModelAddress) {
      throw new Error('Character model not initialized');
    }

    try {
      const {
        createDismountResourceOnCharacterTransaction: txResponse
      } = await this.client.createDismountResourceOnCharacterTransaction({
        characterModel: this.characterModelAddress,
        characterAddress,
        resource: resourceAddress,
        owner,
        amount,
        authority,
        payer: payer || authority
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log(\`Unequipped resource from character \${characterAddress}\`);
    } catch (error) {
      console.error('Error unequipping resource:', error);
      throw error;
    }
  }

  // Helper method to get character model address
  getCharacterModelAddress(): string | undefined {
    return this.characterModelAddress;
  }

  // Helper method to get character tree address
  getCharacterTreeAddress(): string | undefined {
    return this.characterTreeAddress;
  }
}

// React hook for using CharacterManager
export const useCharacterManager = () => {
  const { client, projectAddress } = useHoneycomb();
  
  if (!client || !projectAddress) {
    throw new Error('CharacterManager requires HoneycombProvider');
  }

  return new CharacterManager(client, projectAddress);
};
