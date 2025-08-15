# Frequently Asked Questions

## General

### What is ChainQuest?
ChainQuest is a multiplayer strategy game built on Solana using the Honeycomb Protocol. Players compete for territory control in a dynamic space environment, with all progression and achievements permanently recorded on-chain.

### How does Honeycomb Protocol integration work?
ChainQuest uses Honeycomb's core offerings:
- Edge Toolkit for blockchain interaction
- Character Manager for NFT/non-NFT characters
- Resource Manager for in-game economy
- Nectar Missions for time-based challenges
- Nectar Staking for loyalty rewards
- State compression for efficiency

### What makes ChainQuest different from other blockchain games?
1. True on-chain progression
2. Time-based mission system
3. Compressed state storage
4. Multi-source attacks
5. Dynamic territory control

## Technical

### How do you handle state compression?
We use Honeycomb's compression technology to achieve 1000x cost reduction in on-chain storage while maintaining data integrity and quick access.

### How are missions implemented?
Missions use Honeycomb's Nectar Missions system for:
- Time-based challenges
- Progress tracking
- Chain progression
- Reward distribution

### How does the staking system work?
Characters can be staked in pools to earn rewards:
- Time-based rewards
- Early unstake penalties
- Level-based bonuses
- Compound rewards

### How do you manage permissions?
We use Honeycomb's delegation system:
- Fine-grained permissions
- Role-based access
- Time-limited delegates
- Resource scoping

## Gameplay

### How do I start playing?
1. Connect Solana wallet
2. Create character
3. Choose faction
4. Complete tutorial mission
5. Start exploring

### How does combat work?
Combat uses a deterministic formula:
```
Attack Power = Units × (1 + Attack×0.12 + Fleet×0.08)
Defense Power = Defense × (11 + DefenseTech×1.5)
```

### How do missions work?
- Time-limited challenges
- Chain progression
- Multiple reward types
- Competitive elements

### What are the different resources?
- Energy: Power source
- Minerals: Building material
- Research Points: Technology advancement
- Reputation: Faction standing

## Economy

### How do I earn resources?
1. Complete missions
2. Harvest planets
3. Stake characters
4. Trade with players

### What can I craft?
- Research modules
- Defense systems
- Fleet upgrades
- Special items

### How does staking work?
1. Choose staking pool
2. Stake character
3. Earn time-based rewards
4. Claim or compound rewards

## Technical Support

### How do I report bugs?
Open an issue on GitHub with:
1. Bug description
2. Steps to reproduce
3. Expected behavior
4. Actual behavior

### How do I contribute?
1. Fork repository
2. Create feature branch
3. Make changes
4. Submit pull request

### Where can I find documentation?
- `/docs/USAGE.md`: Usage guide
- `/docs/API.md`: API reference
- `/docs/ARCHITECTURE.md`: System design
- GitHub Wiki: Additional resources

### How do I get help?
- Discord community
- GitHub issues
- Email support
- Documentation
