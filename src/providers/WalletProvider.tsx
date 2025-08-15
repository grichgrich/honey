/**
 * Wallet Provider Component
 * Sets up Solana wallet connection for Honeycomb Protocol
 * @see https://docs.honeycombprotocol.com/
 */

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  WalletModalProvider,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { HONEYCOMB_CONFIG } from "../config/honeycomb.config";

// Import default styles
import "@solana/wallet-adapter-react-ui/styles.css";

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Get network endpoint
  const network = HONEYCOMB_CONFIG.RPC[HONEYCOMB_CONFIG.DEFAULT_NETWORK];
  const endpoint = useMemo(() => network, [network]);

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export const WalletButton = WalletMultiButton;
