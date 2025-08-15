# Architecture Improvements Plan

## Current Architecture Analysis

### Strengths
- **Service-Oriented Design**: Clear separation between business logic and UI
- **React Context Pattern**: Centralized state management
- **TypeScript Integration**: Type safety throughout the codebase
- **Modular Components**: Well-separated UI components

### Architecture Issues Identified

#### 1. Dependency Injection Problems
- Services are instantiated directly in components
- Hard to test due to tight coupling
- No central service registry

#### 2. Missing Abstractions
- Direct localStorage usage
- No repository pattern for data access
- Tightly coupled to specific blockchain implementation

#### 3. State Management Complexity
- Mixed local state and context state
- No clear data flow patterns
- Potential race conditions in async operations

## Proposed Architecture Improvements

### 1. Implement Dependency Injection Container

**Current Problem:**
```typescript
// Bad: Direct instantiation
const combatSystem = new CombatSystem();
const resourceManager = new ResourceManager();
```

**Proposed Solution:**
```typescript
// services/container.ts
export interface ServiceContainer {
  get<T>(token: string): T;
  register<T>(token: string, factory: () => T): void;
}

class DIContainer implements ServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  register<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  get<T>(token: string): T {
    if (!this.services.has(token)) {
      const factory = this.factories.get(token);
      if (!factory) {
        throw new Error(`Service ${token} not registered`);
      }
      this.services.set(token, factory());
    }
    return this.services.get(token);
  }
}

export const container = new DIContainer();
```

### 2. Repository Pattern for Data Access

**Create Abstract Repository:**
```typescript
// repositories/BaseRepository.ts
export abstract class BaseRepository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract create(entity: T): Promise<T>;
  abstract update(id: string, entity: Partial<T>): Promise<T>;
  abstract delete(id: string): Promise<boolean>;
}

// repositories/CharacterRepository.ts
export class CharacterRepository extends BaseRepository<Character> {
  constructor(
    private storage: StorageService,
    private blockchain: BlockchainService
  ) {
    super();
  }

  async findById(id: string): Promise<Character | null> {
    // Try local storage first, then blockchain
    const local = await this.storage.get(`character_${id}`);
    if (local) return local;
    
    return await this.blockchain.getCharacter(id);
  }
}
```

### 3. Event-Driven Architecture

**Implement Event Bus:**
```typescript
// events/EventBus.ts
export interface GameEvent {
  type: string;
  payload: any;
  timestamp: number;
}

export class EventBus {
  private listeners = new Map<string, Array<(event: GameEvent) => void>>();

  subscribe(eventType: string, callback: (event: GameEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

    return () => this.unsubscribe(eventType, callback);
  }

  emit(type: string, payload: any): void {
    const event: GameEvent = {
      type,
      payload,
      timestamp: Date.now()
    };

    const listeners = this.listeners.get(type) || [];
    listeners.forEach(callback => callback(event));
  }
}
```

### 4. State Management with Redux Toolkit

**Replace Context with Redux:**
```typescript
// store/slices/gameSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchCharacter = createAsyncThunk(
  'game/fetchCharacter',
  async (characterId: string, { getState, extra }) => {
    const { characterRepository } = extra as { characterRepository: CharacterRepository };
    return await characterRepository.findById(characterId);
  }
);

const gameSlice = createSlice({
  name: 'game',
  initialState: {
    character: null,
    territories: [],
    loading: false,
    error: null
  },
  reducers: {
    setCharacter: (state, action) => {
      state.character = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCharacter.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCharacter.fulfilled, (state, action) => {
        state.loading = false;
        state.character = action.payload;
      });
  }
});
```

### 5. Service Layer Refactoring

**Create Service Interfaces:**
```typescript
// services/interfaces/ICombatService.ts
export interface ICombatService {
  resolveCombat(attacker: Character, defender: Character): Promise<CombatResult>;
  calculateDamage(attacker: Character, defender: Character): number;
  applyCombatEffects(result: CombatResult): Promise<void>;
}

// services/interfaces/IResourceService.ts
export interface IResourceService {
  gatherResources(character: Character, territory: Territory): Promise<Resource[]>;
  consumeResources(character: Character, resources: Resource[]): Promise<boolean>;
  transferResources(from: Character, to: Character, resources: Resource[]): Promise<boolean>;
}
```

**Implement Services with Dependencies:**
```typescript
// services/CombatService.ts
export class CombatService implements ICombatService {
  constructor(
    private characterRepository: ICharacterRepository,
    private resourceService: IResourceService,
    private eventBus: EventBus,
    private logger: ILogger
  ) {}

  async resolveCombat(attacker: Character, defender: Character): Promise<CombatResult> {
    this.logger.info('Combat started', { attackerId: attacker.id, defenderId: defender.id });
    
    const damage = this.calculateDamage(attacker, defender);
    const result = {
      winner: damage > defender.level ? attacker : defender,
      damage,
      timestamp: Date.now()
    };

    this.eventBus.emit('combat.resolved', result);
    return result;
  }
}
```

### 6. Configuration Management

**Environment-based Configuration:**
```typescript
// config/index.ts
export interface GameConfig {
  blockchain: {
    network: 'devnet' | 'testnet' | 'mainnet';
    rpcUrl: string;
  };
  game: {
    maxPlayers: number;
    combatCooldown: number;
    resourceRates: Record<string, number>;
  };
  security: {
    enableCSP: boolean;
    rateLimit: {
      requests: number;
      windowMs: number;
    };
  };
}

const config: GameConfig = {
  blockchain: {
    network: process.env.VITE_SOLANA_NETWORK as any || 'devnet',
    rpcUrl: process.env.VITE_RPC_URL || 'https://api.devnet.solana.com'
  },
  game: {
    maxPlayers: parseInt(process.env.VITE_MAX_PLAYERS || '1000'),
    combatCooldown: parseInt(process.env.VITE_COMBAT_COOLDOWN || '30000'),
    resourceRates: {
      gold: 1.0,
      iron: 0.8,
      crystal: 0.3
    }
  },
  security: {
    enableCSP: process.env.NODE_ENV === 'production',
    rateLimit: {
      requests: 100,
      windowMs: 60000
    }
  }
};

export default config;
```

### 7. Error Handling Strategy

**Centralized Error Management:**
```typescript
// errors/GameError.ts
export class GameError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: any
  ) {
    super(message);
    this.name = 'GameError';
  }
}

export class CombatError extends GameError {
  constructor(message: string, context?: any) {
    super(message, 'COMBAT_ERROR', context);
  }
}

// errors/ErrorHandler.ts
export class ErrorHandler {
  constructor(
    private logger: ILogger,
    private eventBus: EventBus
  ) {}

  handle(error: Error, context?: any): void {
    this.logger.error(error.message, { error, context });
    
    if (error instanceof GameError) {
      this.eventBus.emit('error.game', { error, context });
    } else {
      this.eventBus.emit('error.system', { error, context });
    }
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
1. **Set up Dependency Injection Container**
   - Create service container
   - Register core services
   - Update components to use DI

2. **Implement Event Bus**
   - Create event system
   - Add basic event types
   - Connect to existing services

### Phase 2: Data Layer (Week 3-4)
1. **Repository Pattern**
   - Create base repository
   - Implement character repository
   - Add territory repository

2. **State Management Migration**
   - Set up Redux Toolkit
   - Migrate from Context to Redux
   - Add async actions

### Phase 3: Service Refactoring (Week 5-6)
1. **Service Interfaces**
   - Define service contracts
   - Implement concrete services
   - Add proper error handling

2. **Configuration Management**
   - Environment-based config
   - Validation system
   - Hot reload support

### Phase 4: Testing & Documentation (Week 7-8)
1. **Unit Testing**
   - Service layer tests
   - Repository tests
   - Component tests

2. **Integration Testing**
   - End-to-end workflows
   - API integration tests
   - Performance tests

## Benefits of New Architecture

### Improved Testability
- Dependency injection enables easy mocking
- Clear interfaces make unit testing straightforward
- Event-driven architecture allows testing in isolation

### Better Maintainability
- Clear separation of concerns
- Standardized error handling
- Configuration management
- Consistent patterns throughout codebase

### Enhanced Performance
- Event-driven architecture reduces coupling
- Repository pattern enables caching strategies
- State management optimization
- Better resource management

### Scalability
- Service-oriented architecture supports feature growth
- Event bus enables new features without breaking existing code
- Configuration management supports different environments
- Repository pattern supports multiple data sources

## Migration Strategy

### Gradual Migration
1. Start with new features using new architecture
2. Gradually refactor existing features
3. Maintain backwards compatibility during transition
4. Full migration over 2-3 months

### Risk Mitigation
- Feature flags for new architecture components
- Comprehensive testing at each stage
- Rollback capabilities
- Monitoring and alerting

### Team Training
- Architecture documentation
- Code review guidelines
- Best practices guide
- Regular knowledge sharing sessions

---

This architecture improvement plan provides a roadmap for transforming the current codebase into a more maintainable, testable, and scalable system while preserving existing functionality.
