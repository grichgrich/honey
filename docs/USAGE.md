# ChainQuest Usage Guide

This guide demonstrates how to use ChainQuest's Honeycomb Protocol integration.

## Edge Toolkit Usage

The Edge Toolkit abstracts Solana blockchain interactions:

```typescript
import { EdgeToolkit } from '../services/edge/EdgeToolkit';

// Initialize toolkit
const toolkit = new EdgeToolkit();

// Create transaction
const tx = await toolkit.createTransaction({
  type: 'ATTACK_PLANET',
  params: { planetId, units }
});

// Send and monitor
const result = await toolkit.sendTransaction(tx);
const status = await toolkit.getTransactionStatus(result.signature);
```

## Character Management

Create and manage game characters:

```typescript
import { CharacterManager } from '../services/character/CharacterManager';

// Define character model
const model = await characterManager.defineModel({
  id: 'space_commander',
  name: 'Space Commander',
  baseTraits: [
    { type: 'COMBAT', level: 1 },
    { type: 'EXPLORATION', level: 1 }
  ],
  allowedFactions: ['sun_warriors', 'ocean_nomads']
});

// Mint character
const character = await characterManager.mintCharacter({
  model: 'space_commander',
  owner: playerPublicKey,
  faction: 'sun_warriors'
});
```

## Resource System

Manage in-game resources and crafting:

```typescript
import { ResourceManager } from '../services/resource/ResourceManager';

// Define resource
await resourceManager.defineResource({
  id: 'energy',
  name: 'Energy Crystal',
  description: 'Power source for space travel',
  rarity: 0.5
});

// Define crafting recipe
await resourceManager.defineRecipe({
  id: 'research_module',
  inputs: [
    { resourceId: 'energy', amount: 50 },
    { resourceId: 'minerals', amount: 25 }
  ],
  outputs: [
    { resourceId: 'research_points', amount: 1 }
  ],
  craftingTime: 300 // 5 minutes
});

// Start crafting
const { craftingId, endTime } = await resourceManager.startCrafting({
  playerId,
  recipeId: 'research_module'
});
```

## Mission System

Create and manage time-based challenges:

```typescript
import { NectarMissions } from '../services/missions/NectarMissions';

// Define mission
await missions.defineMission({
  id: 'first_conquest',
  name: 'First Conquest',
  description: 'Capture your first enemy planet',
  duration: 3600000, // 1 hour
  targetProgress: 1,
  rewards: [
    { type: 'experience', amount: 100 },
    { type: 'trait', traitType: 'COMBAT', amount: 50 }
  ],
  chainId: 'combat_chain',
  chainStep: 1
});

// Start mission
const { startTime, endTime } = await missions.startMission({
  playerId,
  missionId: 'first_conquest',
  characterId
});

// Update progress
const progress = await missions.updateProgress({
  playerId,
  missionId: 'first_conquest',
  progress: 1
});

// Claim rewards
const rewards = await missions.claimRewards({
  playerId,
  missionId: 'first_conquest'
});
```

## Staking System

Implement character staking and rewards:

```typescript
import { NectarStaking } from '../services/staking/NectarStaking';

// Create staking pool
const pool = await staking.createPool({
  id: 'commander_pool',
  rewardRate: 0.1, // 10% rewards
  minStakeDuration: 86400000, // 24 hours
  earlyUnstakePenalty: 0.5 // 50% penalty
});

// Stake character
const { stakeId, startTime } = await staking.stakeCharacter({
  playerId,
  characterId,
  poolId: 'commander_pool'
});

// Claim rewards
const reward = await staking.claimRewards({
  playerId,
  stakeId
});
```

## Compression

Use Honeycomb's state compression:

```typescript
import { CompressionManager } from '../services/compression/CompressionManager';

// Compress game state
const { compressed, compressionRatio } = await compression.compressState({
  characters: [],
  resources: {},
  missions: []
});

// Decompress state
const state = await compression.decompressState(compressed);

// Get compression stats
const stats = await compression.getCompressionStats();
console.log(`Average compression ratio: ${stats.averageCompressionRatio}x`);
```

## Delegation System

Manage game permissions:

```typescript
import { DelegationManager } from '../services/permissions/DelegationManager';

// Create delegate
const delegate = await delegation.createDelegate({
  owner: ownerPublicKey,
  delegateKey: moderatorPublicKey,
  permissions: [
    {
      id: 'MANAGE_MISSIONS',
      name: 'Manage Missions',
      description: 'Create and edit missions',
      scope: 'WRITE',
      resource: 'missions'
    }
  ],
  expiration: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
});

// Check permissions
const canManageMissions = await delegation.checkPermission({
  delegateKey: moderatorPublicKey,
  permission: 'MANAGE_MISSIONS',
  resource: 'missions'
});
```

## Best Practices

1. **Error Handling**
   - Always wrap Honeycomb calls in try/catch
   - Handle network errors gracefully
   - Provide user feedback for failures

2. **State Management**
   - Use compression for large state objects
   - Cache frequently accessed data
   - Update UI optimistically

3. **Performance**
   - Batch transactions when possible
   - Use compressed state for large datasets
   - Implement proper loading states

4. **Security**
   - Validate all user inputs
   - Use proper permission checks
   - Never expose private keys

5. **Testing**
   - Test with mock implementations first
   - Verify compression integrity
   - Test permission edge cases
