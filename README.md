# Space Conquest – Honeycomb Powered MVP

This MVP demonstrates Honeycomb Protocol powering on-chain progression for a 3D strategy game built with React, Three.js and Solana Wallet Adapter.

## Features
- Missions and chained mission unlocks (Harvest, Combat, Research, Explore)
- Traits and XP/Level progression (COMBAT, HARVESTING, EXPLORATION, RESEARCH)
- Real-time gameplay: Harvest, Research, Attack, Move with visualizations
- Leaderboard and achievements scaffolding
- Honeycomb integration via Edge Client (with graceful stub fallback)

## How Honeycomb Powers The Game
- Player connects wallet; a Profile is created/fetched (stubbed in dev) and used as character identity.
- Gameplay events call into `HoneycombService`:
  - Harvest → mints a small resource amount (dev) and updates mission progress
  - Combat → records mission progress and trait XP
  - Exploration → updates mission progress and trait XP
  - Research → increases trait XP/levels
- Mission chains unlock progressively (e.g., `mission-combat-1` → `mission-combat-2`).

## Dev Setup
```
npm install --legacy-peer-deps
pwsh -NoProfile -Command "Start-Process powershell -ArgumentList '-NoExit','-Command','cd ''C:\\honey_comb_protocol''; node server.js'" 
pwsh -NoProfile -Command "Start-Process powershell -ArgumentList '-NoExit','-Command','cd ''C:\\honey_comb_protocol''; npx vite --port 5001 --host'"
```
Open http://localhost:5001

## Video
Add a max 3-minute walkthrough showing on-chain interactions (devnet), gameplay, and how missions/traits update.

## Notes
- Edge Client is loaded dynamically; if unavailable, a stub preserves gameplay. Switch to devnet endpoints in `src/config/honeycomb.config.ts` for on-chain testing.

# ChainQuest: A Honeycomb Protocol Space Strategy Game

ChainQuest is a multiplayer strategy game built on Solana using the Honeycomb Protocol's comprehensive suite of Web3 gaming tools. Players compete for territory control in a dynamic space environment, with all progression and achievements permanently recorded on-chain.

## Core Features (Powered by Honeycomb Protocol)

### Edge Toolkit Integration
- Seamless Solana smart contract interaction
- Abstracted blockchain complexity
- Efficient transaction handling
- Compressed on-chain state storage

### Hive Control
- User profile management
- Character progression tracking
- Delegated permissions system
- Multi-player session management

### Character Manager
- Unique character models for each faction
- NFT and non-NFT character support
- Trait-based progression system
- Character minting and evolution

### Resource Manager
- Dynamic resource harvesting system
- Crafting and trading mechanics
- Player-driven economy
- Resource-based research system

### Nectar Missions
- Time-based challenge system
- Daily and special missions
- Competitive mission leaderboards
- Mission chain progression

### Nectar Staking
- Character staking pools
- Time-based reward accumulation
- Loyalty reward multipliers
- Stake-to-earn mechanics

## Game Mechanics

### Character System
- Choose from multiple factions
- Unique character traits and abilities
- NFT-based character ownership
- Progressive trait evolution

### Mission System
- Time-limited challenges
- Mission chains with increasing rewards
- Competitive mission rankings
- Resource-based mission rewards

### Territory Control
- Dynamic territory ownership
- Resource-rich planets
- Strategic control points
- Faction-based warfare

### Progression System
- Experience-based leveling
- Trait specialization
- Achievement tracking
- Leaderboard rankings

## Technical Implementation

### Honeycomb Protocol Integration
```typescript
// Edge Toolkit usage
const transaction = await edgeToolkit.createTransaction({
  type: 'ATTACK_PLANET',
  params: { planetId, units, attackType }
});

// Character Manager integration
const character = await characterManager.mintCharacter({
  model: 'space_commander',
  faction: 'sun_warriors',
  traits: initialTraits
});

// Resource Manager usage
const craftResult = await resourceManager.craftItem({
  recipe: 'research_module',
  inputs: [
    { type: 'energy', amount: 50 },
    { type: 'minerals', amount: 25 }
  ]
});

// Nectar Missions implementation
const mission = await nectarMissions.startMission({
  type: 'PLANET_CONQUEST',
  duration: 3600, // 1 hour
  rewards: {
    experience: 100,
    resources: { energy: 50, minerals: 25 }
  }
});

// Nectar Staking setup
const stakingPool = await nectarStaking.createPool({
  rewardRate: 0.1,
  minDuration: 86400, // 24 hours
  earlyWithdrawPenalty: 0.5
});
```

### Compression Technology
- Efficient on-chain state storage
- 1000x cost reduction
- Seamless state compression
- High-performance data access

## Development Setup

### Prerequisites
- Node.js 16+
- Solana CLI tools
- Phantom or Solflare wallet

### Installation
```bash
git clone https://github.com/yourusername/chain-quest.git
cd chain-quest
npm install
npm start
```

## Architecture

### Project Structure
```
src/
  ├── components/     # React components
  ├── contracts/      # Solana programs
  ├── services/       # Honeycomb integration
  │   ├── edge/      # Edge Toolkit
  │   ├── hive/      # Hive Control
  │   ├── character/ # Character Manager
  │   ├── resource/  # Resource Manager
  │   ├── missions/  # Nectar Missions
  │   └── staking/   # Nectar Staking
  └── utils/         # Helpers
```

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License
MIT License - see LICENSE file

## Acknowledgments
- [Honeycomb Protocol](https://docs.honeycombprotocol.com/) for their comprehensive Web3 gaming toolkit
- Solana ecosystem for enabling high-performance blockchain gaming