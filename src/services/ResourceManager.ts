import { useHoneycomb } from './honeycomb/HoneycombProvider';
import { ResourceStorageEnum } from '@honeycomb-protocol/edge-client';
import { HONEYCOMB_CONFIG } from '../config/honeycomb.config';
import { sendClientTransactions } from '@honeycomb-protocol/edge-client/client/walletHelpers';

export class ResourceManager {
  private client;
  private projectAddress: string;
  private resourceAddresses: Map<string, string> = new Map();
  private treeAddresses: Map<string, string> = new Map();

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  async initializeResources(authority: string, payer: string) {
    for (const [resourceKey, resourceConfig] of Object.entries(HONEYCOMB_CONFIG.RESOURCES)) {
      try {
        // Create the resource
        const {
          createCreateNewResourceTransaction: {
            resource: resourceAddress,
            tx: resourceTx
          }
        } = await this.client.createCreateNewResourceTransaction({
          project: this.projectAddress,
          authority,
          payer,
          params: {
            ...resourceConfig,
            storage: ResourceStorageEnum.AccountState,
            tags: [resourceKey]
          }
        });

        await sendClientTransactions(this.client, { publicKey: authority }, resourceTx);
        this.resourceAddresses.set(resourceKey, resourceAddress.toString());

        // Create resource tree
        const {
          createCreateNewResourceTreeTransaction: {
            tree: treeAddress,
            tx: treeTx
          }
        } = await this.client.createCreateNewResourceTreeTransaction({
          project: this.projectAddress,
          authority,
          payer,
          resource: resourceAddress.toString(),
          treeConfig: {
            basic: {
              numAssets: 100000 // Support up to 100k resource instances
            }
          }
        });

        await sendClientTransactions(this.client, { publicKey: authority }, treeTx);
        this.treeAddresses.set(resourceKey, treeAddress.toString());

        console.log('Initialized ' + resourceKey + ' resource and tree');
      } catch (error) {
        console.error('Error initializing ' + resourceKey + ' resource:', error);
      }
    }
  }

  async mintResource(
    resourceKey: string,
    amount: string,
    authority: string,
    owner: string,
    payer?: string
  ) {
    const resourceAddress = this.resourceAddresses.get(resourceKey);
    if (!resourceAddress) {
      throw new Error('Resource ' + resourceKey + ' not initialized');
    }

    try {
      const {
        createMintResourceTransaction: txResponse
      } = await this.client.createMintResourceTransaction({
        resource: resourceAddress,
        amount,
        authority,
        owner,
        payer: payer || authority
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log('Minted ' + amount + ' ' + resourceKey + ' for ' + owner);
    } catch (error) {
      console.error('Error minting ' + resourceKey + ':', error);
      throw error;
    }
  }

  async createCraftingRecipe(
    inputResource: string,
    inputAmount: string,
    outputResource: string,
    outputAmount: string,
    authority: string,
    payer?: string
  ) {
    const inputAddress = this.resourceAddresses.get(inputResource);
    const outputAddress = this.resourceAddresses.get(outputResource);

    if (!inputAddress || !outputAddress) {
      throw new Error('Input or output resource not initialized');
    }

    try {
      const {
        createCreateRecipeTransaction: {
          recipe: recipeAddress,
          tx: txResponse
        }
      } = await this.client.createInitializeRecipeTransaction({
        project: this.projectAddress,
        xp: "1000", // XP awarded for crafting
        authority,
        payer: payer || authority,
        ingredients: [
          {
            fungible: {
              address: inputAddress,
              amount: inputAmount
            }
          }
        ],
        meal: {
          fungible: {
            isCompressed: false,
            address: outputAddress,
            amount: outputAmount
          }
        }
      });

      await sendClientTransactions(this.client, { publicKey: authority }, txResponse);
      console.log('Created crafting recipe: ' + inputAmount + ' ' + inputResource + ' -> ' + outputAmount + ' ' + outputResource);
      return recipeAddress.toString();
    } catch (error) {
      console.error('Error creating crafting recipe:', error);
      throw error;
    }
  }

  // Helper method to get resource address
  getResourceAddress(resourceKey: string): string | undefined {
    return this.resourceAddresses.get(resourceKey);
  }

  // Helper method to get tree address
  getTreeAddress(resourceKey: string): string | undefined {
    return this.treeAddresses.get(resourceKey);
  }
}

// React hook for using ResourceManager
export const useResourceManager = () => {
  const { client, projectAddress } = useHoneycomb();
  
  if (!client || !projectAddress) {
    throw new Error('ResourceManager requires HoneycombProvider');
  }

  return new ResourceManager(client, projectAddress);
};