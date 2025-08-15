/**
 * Edge Client Setup
 * Configures Honeycomb Protocol Edge Client
 * @see https://docs.honeycombprotocol.com/
 */

import createEdgeClient from "@honeycomb-protocol/edge-client";
import { HONEYCOMB_CONFIG } from "../../config/honeycomb.config";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { sendClientTransactions } from "@honeycomb-protocol/edge-client/client/walletHelpers";

// Create Edge Client instance
const API_URL = HONEYCOMB_CONFIG.EDGE_API[HONEYCOMB_CONFIG.DEFAULT_NETWORK];
export const edgeClient = createEdgeClient(API_URL, true);

/**
 * Helper function to execute transactions
 */
export async function executeTransaction(
  wallet: WalletContextState,
  txResponse: any
): Promise<any> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected");
  }

  try {
    // Sign and send transaction
    const response = await sendClientTransactions(
      edgeClient,
      wallet,
      txResponse
    );

    return response;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  }
}

/**
 * Create project transaction helper
 */
export async function createProject(
  wallet: WalletContextState,
  name: string
): Promise<any> {
  const { createCreateProjectTransaction: { tx: txResponse } } = 
    await edgeClient.createCreateProjectTransaction({
      name,
      authority: wallet.publicKey?.toBase58()!,
    });

  return executeTransaction(wallet, txResponse);
}

/**
 * Create character transaction helper
 */
export async function createCharacter(
  wallet: WalletContextState,
  params: {
    modelId: string;
    faction: string;
  }
): Promise<any> {
  const { createCreateCharacterTransaction: { tx: txResponse } } =
    await edgeClient.createCreateCharacterTransaction({
      modelId: params.modelId,
      faction: params.faction,
      authority: wallet.publicKey?.toBase58()!,
    });

  return executeTransaction(wallet, txResponse);
}

/**
 * Start mission transaction helper
 */
export async function startMission(
  wallet: WalletContextState,
  params: {
    characterId: string;
    missionId: string;
  }
): Promise<any> {
  const { createStartMissionTransaction: { tx: txResponse } } =
    await edgeClient.createStartMissionTransaction({
      characterId: params.characterId,
      missionId: params.missionId,
      authority: wallet.publicKey?.toBase58()!,
    });

  return executeTransaction(wallet, txResponse);
}

/**
 * Stake character transaction helper
 */
export async function stakeCharacter(
  wallet: WalletContextState,
  params: {
    characterId: string;
    poolId: string;
  }
): Promise<any> {
  const { createStakeCharacterTransaction: { tx: txResponse } } =
    await edgeClient.createStakeCharacterTransaction({
      characterId: params.characterId,
      poolId: params.poolId,
      authority: wallet.publicKey?.toBase58()!,
    });

  return executeTransaction(wallet, txResponse);
}
