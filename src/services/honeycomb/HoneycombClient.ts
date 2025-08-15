/**
 * Honeycomb Protocol Client
 * Centralized client for interacting with Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { createEdgeClient } from "@honeycomb-protocol/edge-client";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { AuthManager } from "./AuthManager";
import { ProjectManager } from "./ProjectManager";
import { CharacterManager } from "./CharacterManager";
import { ResourceManager } from "./ResourceManager";
import { MissionManager } from "./MissionManager";
import { StakingManager } from "./StakingManager";
import { DelegationManager } from "./DelegationManager";
import { CompressionManager } from "./CompressionManager";

export class HoneycombClient {
  private client: any;
  private authManager: AuthManager;
  private projectManager: ProjectManager | null = null;
  private characterManager: CharacterManager | null = null;
  private resourceManager: ResourceManager | null = null;
  private missionManager: MissionManager | null = null;
  private stakingManager: StakingManager | null = null;
  private delegationManager: DelegationManager | null = null;
  private compressionManager: CompressionManager | null = null;

  constructor(networkUrl: string = "https://edge.test.honeycombprotocol.com/") {
    this.client = createEdgeClient(networkUrl, true);
    this.authManager = new AuthManager(this.client);
  }

  /**
   * Authenticates a user
   */
  async authenticate(wallet: WalletContextState): Promise<string> {
    return this.authManager.authenticate(wallet);
  }

  /**
   * Gets the current access token
   */
  getAccessToken(): string | null {
    return this.authManager.getAccessToken();
  }

  /**
   * Checks if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authManager.isAuthenticated();
  }

  /**
   * Gets auth headers for requests
   */
  getAuthHeaders(): { authorization: string } | undefined {
    return this.authManager.getAuthHeaders();
  }

  /**
   * Gets the project manager
   */
  project(): ProjectManager {
    if (!this.projectManager) {
      this.projectManager = new ProjectManager(this.client);
    }
    return this.projectManager;
  }

  /**
   * Gets the character manager
   */
  character(projectAddress: string): CharacterManager {
    if (!this.characterManager) {
      this.characterManager = new CharacterManager(this.client, projectAddress);
    }
    return this.characterManager;
  }

  /**
   * Gets the resource manager
   */
  resource(projectAddress: string): ResourceManager {
    if (!this.resourceManager) {
      this.resourceManager = new ResourceManager(this.client, projectAddress);
    }
    return this.resourceManager;
  }

  /**
   * Gets the mission manager
   */
  mission(projectAddress: string): MissionManager {
    if (!this.missionManager) {
      this.missionManager = new MissionManager(this.client, projectAddress);
    }
    return this.missionManager;
  }

  /**
   * Gets the staking manager
   */
  staking(projectAddress: string): StakingManager {
    if (!this.stakingManager) {
      this.stakingManager = new StakingManager(this.client, projectAddress);
    }
    return this.stakingManager;
  }

  /**
   * Gets the delegation manager
   */
  delegation(projectAddress: string): DelegationManager {
    if (!this.delegationManager) {
      this.delegationManager = new DelegationManager(this.client, projectAddress);
    }
    return this.delegationManager;
  }

  /**
   * Gets the compression manager
   */
  compression(projectAddress: string): CompressionManager {
    if (!this.compressionManager) {
      this.compressionManager = new CompressionManager(this.client, projectAddress);
    }
    return this.compressionManager;
  }
}
