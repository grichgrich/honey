/**
 * Delegation Manager Service
 * Handles permission delegation for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";
import {
  HiveControlPermissionInput,
  CharacterManagerPermissionInput,
  ResourceManagerPermissionInput,
  NectarMissionsPermissionInput,
  NectarStakingPermissionInput
} from "@honeycomb-protocol/edge-client";

export type ServiceDelegations = {
  HiveControl?: Array<{
    permission: HiveControlPermissionInput;
  }>;
  CharacterManager?: Array<{
    index: number;
    permission: CharacterManagerPermissionInput;
  }>;
  ResourceManager?: Array<{
    permission: ResourceManagerPermissionInput;
  }>;
  NectarMissions?: Array<{
    permission: NectarMissionsPermissionInput;
  }>;
  NectarStaking?: Array<{
    permission: NectarStakingPermissionInput;
  }>;
};

export class DelegationManager {
  private client: any;
  private projectAddress: string;

  constructor(client: any, projectAddress: string) {
    this.client = client;
    this.projectAddress = projectAddress;
  }

  /**
   * Creates a delegate authority
   */
  async createDelegate(
    wallet: WalletContextState,
    params: {
      delegate: string;
      serviceDelegations: ServiceDelegations;
    }
  ): Promise<void> {
    try {
      const { createCreateDelegateAuthorityTransaction: { tx } } = 
        await this.client.createCreateDelegateAuthorityTransaction({
          authority: wallet.publicKey?.toString(),
          delegate: params.delegate,
          project: this.projectAddress,
          serviceDelegations: params.serviceDelegations
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to create delegate:", error);
      throw error;
    }
  }

  /**
   * Modifies delegation permissions
   */
  async modifyDelegation(
    wallet: WalletContextState,
    params: {
      delegate: string;
      serviceDelegations: ServiceDelegations;
    }
  ): Promise<void> {
    try {
      const { createModifyDelegationTransaction: { tx } } = 
        await this.client.createModifyDelegationTransaction({
          authority: wallet.publicKey?.toString(),
          project: this.projectAddress,
          delegate: params.delegate,
          modifyDelegation: {
            delegation: params.serviceDelegations
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to modify delegation:", error);
      throw error;
    }
  }

  /**
   * Creates HiveControl delegations
   */
  static createHiveControlDelegations(permissions: HiveControlPermissionInput[]): ServiceDelegations {
    return {
      HiveControl: permissions.map(permission => ({ permission }))
    };
  }

  /**
   * Creates CharacterManager delegations
   */
  static createCharacterManagerDelegations(
    permissions: Array<{
      index: number;
      permission: CharacterManagerPermissionInput;
    }>
  ): ServiceDelegations {
    return {
      CharacterManager: permissions
    };
  }

  /**
   * Creates ResourceManager delegations
   */
  static createResourceManagerDelegations(
    permissions: ResourceManagerPermissionInput[]
  ): ServiceDelegations {
    return {
      ResourceManager: permissions.map(permission => ({ permission }))
    };
  }

  /**
   * Creates NectarMissions delegations
   */
  static createMissionsDelegations(
    permissions: NectarMissionsPermissionInput[]
  ): ServiceDelegations {
    return {
      NectarMissions: permissions.map(permission => ({ permission }))
    };
  }

  /**
   * Creates NectarStaking delegations
   */
  static createStakingDelegations(
    permissions: NectarStakingPermissionInput[]
  ): ServiceDelegations {
    return {
      NectarStaking: permissions.map(permission => ({ permission }))
    };
  }

  /**
   * Combines multiple service delegations
   */
  static combineDelegations(...delegations: ServiceDelegations[]): ServiceDelegations {
    return delegations.reduce((combined, current) => ({
      ...combined,
      ...current,
      HiveControl: [
        ...(combined.HiveControl || []),
        ...(current.HiveControl || [])
      ],
      CharacterManager: [
        ...(combined.CharacterManager || []),
        ...(current.CharacterManager || [])
      ],
      ResourceManager: [
        ...(combined.ResourceManager || []),
        ...(current.ResourceManager || [])
      ],
      NectarMissions: [
        ...(combined.NectarMissions || []),
        ...(current.NectarMissions || [])
      ],
      NectarStaking: [
        ...(combined.NectarStaking || []),
        ...(current.NectarStaking || [])
      ]
    }), {} as ServiceDelegations);
  }

  /**
   * Example: Create admin delegations
   */
  static createAdminDelegations(): ServiceDelegations {
    return DelegationManager.combineDelegations(
      // HiveControl permissions
      DelegationManager.createHiveControlDelegations([
        HiveControlPermissionInput.ManageProjectDriver,
        HiveControlPermissionInput.ManageServices,
        HiveControlPermissionInput.ManageCriterias,
        HiveControlPermissionInput.UpdatePlatformData
      ]),
      
      // CharacterManager permissions
      DelegationManager.createCharacterManagerDelegations([
        {
          index: 0,
          permission: CharacterManagerPermissionInput.ManageAssemblerConfig
        },
        {
          index: 0,
          permission: CharacterManagerPermissionInput.ManageCharacterModels
        },
        {
          index: 0,
          permission: CharacterManagerPermissionInput.AssignCharacterTraits
        }
      ]),
      
      // ResourceManager permissions
      DelegationManager.createResourceManagerDelegations([
        ResourceManagerPermissionInput.CreateResources,
        ResourceManagerPermissionInput.MintResources,
        ResourceManagerPermissionInput.BurnResources,
        ResourceManagerPermissionInput.CreateFaucet,
        ResourceManagerPermissionInput.CreateRecipe
      ]),
      
      // NectarMissions permissions
      DelegationManager.createMissionsDelegations([
        NectarMissionsPermissionInput.ManageMissionPool,
        NectarMissionsPermissionInput.WithdrawMissionPoolRewards
      ]),
      
      // NectarStaking permissions
      DelegationManager.createStakingDelegations([
        NectarStakingPermissionInput.ManageStakingPool,
        NectarStakingPermissionInput.WithdrawStakingPoolRewards
      ])
    );
  }

  /**
   * Example: Create moderator delegations
   */
  static createModeratorDelegations(): ServiceDelegations {
    return DelegationManager.combineDelegations(
      // HiveControl permissions
      DelegationManager.createHiveControlDelegations([
        HiveControlPermissionInput.UpdatePlatformData
      ]),
      
      // CharacterManager permissions
      DelegationManager.createCharacterManagerDelegations([
        {
          index: 0,
          permission: CharacterManagerPermissionInput.AssignCharacterTraits
        }
      ]),
      
      // ResourceManager permissions
      DelegationManager.createResourceManagerDelegations([
        ResourceManagerPermissionInput.MintResources,
        ResourceManagerPermissionInput.CreateFaucet
      ]),
      
      // NectarMissions permissions
      DelegationManager.createMissionsDelegations([
        NectarMissionsPermissionInput.ManageMissionPool
      ])
    );
  }
}
