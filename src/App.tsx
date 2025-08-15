import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { TipLinkWalletAdapter } from "@tiplink/wallet-adapter";
import { TipLinkWalletAutoConnectV2 } from "@tiplink/wallet-adapter-react-ui";

import { HoneycombProvider } from './services/honeycomb/HoneycombProvider';
import { GameProvider } from './context/GameContext';
import GameWorld from './components/GameWorld';
import HUD from './components/HUD';
import { HONEYCOMB_CONFIG } from './config/honeycomb.config';

// Default styles
import '@solana/wallet-adapter-react-ui/styles.css';

const App: React.FC = () => {
  const network = HONEYCOMB_CONFIG.CURRENT_NETWORK;
  const endpoint = HONEYCOMB_CONFIG.RPC_ENDPOINTS[network];

  // Initialize wallet adapters
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TipLinkWalletAdapter(),
    new SolflareWalletAdapter()
  ];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <TipLinkWalletAutoConnectV2 isReady={true} query={new URLSearchParams(window.location.search)}>
          <WalletModalProvider>
            <HoneycombProvider>
              <GameProvider>
                <div className="app">
                  <GameWorld />
                  <HUD />
                </div>
              </GameProvider>
            </HoneycombProvider>
          </WalletModalProvider>
        </TipLinkWalletAutoConnectV2>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App;