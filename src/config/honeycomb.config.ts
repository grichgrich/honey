import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export const HONEYCOMB_CONFIG = {
  RPC_ENDPOINTS: {
    Mainnet: clusterApiUrl(WalletAdapterNetwork.Mainnet),
    Honeynet: "https://rpc.test.honeycombprotocol.com/",
    Sonic: "https://rpc.sonic.honeycombprotocol.com/",
  },
  EDGE_CLIENT_API_URLS: {
    Mainnet: "https://edge.mainnet.honeycombprotocol.com/",
    Honeynet: "https://edge.test.honeycombprotocol.com/",
    Sonic: "https://edge.sonic.honeycombprotocol.com/",
  },
  // Default to Honeynet for development
  CURRENT_NETWORK: "Honeynet" as const,
  // Project configuration
  PROJECT: {
    NAME: "Space Conquest",
    ACHIEVEMENTS: [
      "Pioneer",           // First planet claimed
      "Conqueror",        // Multiple planets controlled
      "Master Harvester", // High resource collection
      "Elite Commander",  // High combat success
      "Tech Innovator"    // Research milestones
    ],
    CUSTOM_DATA_FIELDS: [
      "planetsControlled",
      "resourcesHarvested",
      "battlesWon",
      "researchCompleted"
    ]
  },
  // Resource configuration
  RESOURCES: {
    ENERGY: {
      name: "Energy",
      symbol: "ENRG",
      decimals: 6,
      uri: "https://example.com/energy.json"
    },
    MINERALS: {
      name: "Minerals",
      symbol: "MNRL",
      decimals: 6,
      uri: "https://example.com/minerals.json"
    },
    CRYSTALS: {
      name: "Crystals",
      symbol: "CRYS",
      decimals: 6,
      uri: "https://example.com/crystals.json"
    }
  },
  // Character configuration
  CHARACTERS: {
    TREE_CONFIG: {
      basic: {
        numAssets: 100000 // Support up to 100k characters
      }
    }
  },
  // Profile configuration
  PROFILES: {
    TREE_CONFIG: {
      basic: {
        numAssets: 100000 // Support up to 100k profiles
      }
    }
  }
};