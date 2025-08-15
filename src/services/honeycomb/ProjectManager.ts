/**
 * Project Manager Service
 * Handles project creation and management for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { createEdgeClient } from "@honeycomb-protocol/edge-client";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";

export class ProjectManager {
  private client: any;
  private projectAddress: string | null = null;

  constructor(networkUrl: string = "https://edge.main.honeycombprotocol.com/") {
    this.client = createEdgeClient(networkUrl, true);
  }

  /**
   * Creates a new project
   */
  async createProject(
    wallet: WalletContextState,
    params: {
      name: string;
      authority: string;
      profileConfig?: {
        achievements?: string[];
        customFields?: string[];
      };
    }
  ): Promise<string> {
    try {
      const { createCreateProjectTransaction: { project, tx } } = 
        await this.client.createCreateProjectTransaction({
          name: params.name,
          authority: params.authority,
          profileDataConfig: {
            achievements: params.profileConfig?.achievements || ["Pioneer"],
            customDataFields: params.profileConfig?.customFields || []
          }
        });

      // Send transaction
      await sendClientTransactions(this.client, wallet, tx);
      this.projectAddress = project;
      return project;
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    }
  }

  /**
   * Creates a new user profile
   */
  async createUserProfile(
    wallet: WalletContextState,
    params: {
      name: string;
      bio?: string;
      pfp?: string;
    },
    accessToken: string
  ): Promise<void> {
    if (!this.projectAddress) {
      throw new Error("Project not initialized");
    }

    try {
      const { createNewProfileTransaction: { tx } } = 
        await this.client.createNewProfileTransaction(
          {
            project: this.projectAddress,
            info: {
              name: params.name,
              bio: params.bio || "",
              pfp: params.pfp || ""
            },
            payer: wallet.publicKey?.toString()
          },
          {
            fetchOptions: {
              headers: {
                authorization: `Bearer ${accessToken}`
              }
            }
          }
        );

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to create user profile:", error);
      throw error;
    }
  }

  /**
   * Creates a profiles tree for storing user data
   */
  async createProfilesTree(
    wallet: WalletContextState,
    numAssets: number = 100000
  ): Promise<void> {
    if (!this.projectAddress) {
      throw new Error("Project not initialized");
    }

    try {
      const { createCreateProfilesTreeTransaction: { tx } } = 
        await this.client.createCreateProfilesTreeTransaction({
          project: this.projectAddress,
          payer: wallet.publicKey?.toString(),
          treeConfig: {
            basic: {
              numAssets
            }
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to create profiles tree:", error);
      throw error;
    }
  }

  /**
   * Updates a user profile
   */
  async updateProfile(
    wallet: WalletContextState,
    params: {
      profile: string;
      name?: string;
      bio?: string;
      pfp?: string;
      customData?: {
        add?: Record<string, string[]>;
        remove?: string[];
      };
    },
    accessToken: string
  ): Promise<void> {
    try {
      const { createUpdateProfileTransaction: { tx } } = 
        await this.client.createUpdateProfileTransaction(
          {
            payer: wallet.publicKey?.toString(),
            profile: params.profile,
            info: {
              name: params.name,
              bio: params.bio,
              pfp: params.pfp
            },
            customData: params.customData
          },
          {
            fetchOptions: {
              headers: {
                authorization: `Bearer ${accessToken}`
              }
            }
          }
        );

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to update profile:", error);
      throw error;
    }
  }

  /**
   * Creates a badge for achievements
   */
  async createBadge(
    wallet: WalletContextState,
    params: {
      index: number;
      startTime?: number;
      endTime?: number;
    }
  ): Promise<void> {
    if (!this.projectAddress) {
      throw new Error("Project not initialized");
    }

    try {
      const { createCreateBadgeCriteriaTransaction: { tx } } = 
        await this.client.createCreateBadgeCriteriaTransaction({
          args: {
            authority: wallet.publicKey?.toString(),
            projectAddress: this.projectAddress,
            badgeIndex: params.index,
            condition: "Public",
            startTime: params.startTime || 0,
            endTime: params.endTime || 0
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to create badge:", error);
      throw error;
    }
  }

  /**
   * Assigns a badge to a user
   */
  async assignBadge(
    wallet: WalletContextState,
    params: {
      profileAddress: string;
      badgeIndex: number;
    }
  ): Promise<void> {
    if (!this.projectAddress) {
      throw new Error("Project not initialized");
    }

    try {
      const { createClaimBadgeCriteriaTransaction: { tx } } = 
        await this.client.createClaimBadgeCriteriaTransaction({
          args: {
            profileAddress: params.profileAddress,
            projectAddress: this.projectAddress,
            proof: "Public",
            payer: wallet.publicKey?.toString(),
            criteriaIndex: params.badgeIndex
          }
        });

      await sendClientTransactions(this.client, wallet, tx);
    } catch (error) {
      console.error("Failed to assign badge:", error);
      throw error;
    }
  }
}
