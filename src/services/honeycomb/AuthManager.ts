/**
 * Auth Manager Service
 * Handles authentication for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { WalletContextState } from "@solana/wallet-adapter-react";
import base58 from "bs58";

export class AuthManager {
  private client: any;
  private accessToken: string | null = null;

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Authenticates a user
   */
  async authenticate(wallet: WalletContextState): Promise<string> {
    try {
      // Get auth request
      const { authRequest: { message: authRequest } } = 
        await this.client.authRequest({
          wallet: wallet.publicKey?.toString()
        });

      // Sign message
      const encodedMessage = new TextEncoder().encode(authRequest);
      const signedMessage = await wallet.signMessage?.(encodedMessage);
      if (!signedMessage) {
        throw new Error("Failed to sign message");
      }

      // Convert to base58
      const signature = base58.encode(signedMessage);

      // Confirm auth
      const { authConfirm: { accessToken } } = 
        await this.client.authConfirm({
          wallet: wallet.publicKey?.toString(),
          signature
        });

      this.accessToken = accessToken;
      return accessToken;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw error;
    }
  }

  /**
   * Gets the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Checks if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Clears authentication
   */
  clearAuth(): void {
    this.accessToken = null;
  }

  /**
   * Gets auth headers for requests
   */
  getAuthHeaders(): { authorization: string } | undefined {
    if (!this.accessToken) return undefined;
    return {
      authorization: `Bearer ${this.accessToken}`
    };
  }
}
