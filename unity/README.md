# ChainQuest Unity Integration

This Unity project integrates with Honeycomb Protocol to provide blockchain-based game mechanics.

## Setup Instructions

1. Install Required SDKs:
```
# Add via Package Manager:
https://github.com/Honeycomb-Protocol/Solana.Unity-SDK.git
https://github.com/Honeycomb-Protocol/Unity-SDK.git
```

2. Configure Scene:
- Add `HoneycombManager` prefab to your scene
- Ensure it's marked as "DontDestroyOnLoad"
- Configure network settings in Inspector

3. Wallet Setup:
- Import Sample Scene for wallet configuration
- Or follow [Solana Unity SDK documentation](https://docs.honeycombprotocol.com/) for custom setup

## Development

### Network Selection
- Development: Uses Honeynet (test network)
- Production: Uses Mainnet
- Sonic: Available for specific features

### Getting Test SOL
```bash
solana airdrop 2 <wallet-address> -u https://rpc.test.honeycombprotocol.com
```

### Core Components

1. **HoneycombManager.cs**
   - Singleton manager for Honeycomb Protocol
   - Handles client initialization
   - Provides core blockchain interactions

2. **GameController.cs**
   - Example implementation
   - Shows how to use HoneycombManager
   - Demonstrates game mechanics

### Example Usage

```csharp
// Create character
string characterId = await HoneycombManager.Instance.CreateCharacter(
    "space_commander",
    "sun_warriors"
);

// Start mission
string missionId = await HoneycombManager.Instance.StartMission(
    characterId,
    "tutorial_mission"
);

// Stake character
string stakeId = await HoneycombManager.Instance.StakeCharacter(
    characterId,
    "reward_pool_1"
);
```

## Best Practices

1. **Error Handling**
   - Always use try-catch blocks
   - Log errors appropriately
   - Provide user feedback

2. **Network Selection**
   - Use Honeynet for development
   - Test thoroughly before mainnet
   - Handle network-specific features

3. **Transaction Management**
   - Sign transactions properly
   - Handle response validation
   - Implement retry logic

4. **Performance**
   - Cache blockchain data
   - Use async/await properly
   - Implement loading states

## Troubleshooting

1. **Connection Issues**
   - Verify network selection
   - Check wallet connection
   - Validate RPC endpoints

2. **Transaction Failures**
   - Check wallet balance
   - Verify transaction params
   - Review error messages

3. **Wallet Problems**
   - Import sample scene
   - Check wallet adapter
   - Verify permissions

## Resources

- [Honeycomb Protocol Docs](https://docs.honeycombprotocol.com/)
- [Unity SDK Repository](https://github.com/Honeycomb-Protocol/Unity-SDK)
- [Solana Unity SDK](https://github.com/Honeycomb-Protocol/Solana.Unity-SDK)
