import { Character, Territory, Resource, FactionType, TraitType } from '../types/game';
import { LeverageService } from '../services/LeverageService';
import { HoneycombService } from '../services/honeycomb';
import { ResourceManager } from '../services/ResourceManager';
import { CombatSystem } from '../services/CombatSystem';
import { TerritoryManager } from '../services/TerritoryManager';
import { CraftingSystem } from '../services/CraftingSystem';
import { container, ServiceTokens } from '../services/ServiceContainer';
import { profiler } from '../utils/performanceProfiler';
import { security } from '../utils/security';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  error?: string;
  details?: any;
}

interface TestSuiteResult {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  results: TestResult[];
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
  };
}

export class ComprehensiveTestSuite {
  private results: TestResult[] = [];
  private startTime: number = 0;

  async runAllTests(): Promise<TestSuiteResult> {
    this.startTime = performance.now();
    this.results = [];

    console.log('🧪 Starting Comprehensive Test Suite...');

    // Run all test categories
    await this.runUnitTests();
    await this.runIntegrationTests();
    await this.runPerformanceTests();
    await this.runSecurityTests();
    await this.runEndToEndTests();

    const duration = performance.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;

    const result: TestSuiteResult = {
      totalTests: this.results.length,
      passed,
      failed,
      duration,
      results: this.results
    };

    this.printSummary(result);
    return result;
  }

  private async runUnitTests(): Promise<void> {
    console.log('📦 Running Unit Tests...');

    await this.runTest('ResourceManager - Create Resource', async () => {
      const resourceManager = new ResourceManager();
      const resource: Resource = {
        id: 'test-resource',
        type: 'gold',
        amount: 100,
        baseValue: 10
      };
      
      await resourceManager.addResource(resource);
      const retrieved = await resourceManager.getResource('test-resource');
      
      if (!retrieved || retrieved.amount !== 100) {
        throw new Error('Resource not created correctly');
      }
    });

    await this.runTest('ResourceManager - Consume Resource', async () => {
      const resourceManager = new ResourceManager();
      const character: Character = {
        name: 'TestChar',
        level: 1,
        faction: FactionType.Red,
        experience: 0,
        resources: { gold: 100, iron: 50 }
      };

      const initialGold = character.resources.gold;
      await resourceManager.consumeResource(character, 'gold', 30);
      
      if (character.resources.gold !== initialGold - 30) {
        throw new Error('Resource consumption failed');
      }
    });

    await this.runTest('LeverageService - Calculate Leverage', async () => {
      const leverageService = new LeverageService();
      const character: Character = {
        name: 'TestChar',
        level: 5,
        faction: FactionType.Sun,
        experience: 1000,
        resources: { gold: 500 }
      };

      const result = await leverageService.calculateLeverage(character, {
        action: 'gather',
        territory: 'test-territory',
        resources: ['gold']
      });

      if (!result.leverageMultiplier || result.leverageMultiplier < 1) {
        throw new Error('Invalid leverage calculation');
      }
    });

    await this.runTest('HoneycombService - Mission Management', async () => {
      const honeycomb = new HoneycombService();
      const missions = await honeycomb.getMissions();
      
      if (!Array.isArray(missions) || missions.length === 0) {
        throw new Error('No missions returned');
      }
    });

    await this.runTest('TerritoryManager - Calculate Influence', async () => {
      const territoryManager = container.get<TerritoryManager>(ServiceTokens.TERRITORY_MANAGER);
      const character: Character = {
        name: 'TestChar',
        level: 3,
        faction: FactionType.Ocean,
        experience: 500,
        resources: { gold: 200 },
        traits: [{ type: TraitType.Charisma, level: 2 }]
      };

      const territory: Territory = {
        id: 'test-territory',
        name: 'Test Territory',
        controlledBy: FactionType.Ocean,
        position: { x: 0, y: 0, z: 0 }
      };

      const influence = await territoryManager.calculateInfluence(character, territory);
      
      if (influence <= 0) {
        throw new Error('Invalid influence calculation');
      }
    });
  }

  private async runIntegrationTests(): Promise<void> {
    console.log('🔗 Running Integration Tests...');

    await this.runTest('Combat System Integration', async () => {
      const combatSystem = container.get<CombatSystem>(ServiceTokens.COMBAT_SYSTEM);
      
      const attacker: Character = {
        name: 'Attacker',
        level: 5,
        faction: FactionType.Red,
        experience: 1000,
        resources: { gold: 100 },
        traits: [{ type: TraitType.Strength, level: 3 }]
      };

      const defender: Character = {
        name: 'Defender',
        level: 3,
        faction: FactionType.Blue,
        experience: 500,
        resources: { gold: 50 },
        traits: [{ type: TraitType.Strength, level: 2 }]
      };

      const result = await combatSystem.simulateCombat(attacker, defender);
      
      if (!result.winner || !result.damage) {
        throw new Error('Combat simulation failed');
      }
    });

    await this.runTest('Resource-Territory Integration', async () => {
      const resourceManager = new ResourceManager();
      const territory: Territory = {
        id: 'resource-territory',
        name: 'Resource Rich Land',
        defense: 5,
        position: { x: 0, y: 100, z: 0 },
        resources: [
          { id: '1', type: 'gold', amount: 50 },
          { id: '2', type: 'iron', amount: 30 }
        ]
      };

      const character: Character = {
        name: 'Gatherer',
        level: 4,
        faction: FactionType.Forest,
        experience: 800,
        resources: {},
        traits: [{ type: TraitType.Wisdom, level: 2 }]
      };

      const result = await resourceManager.gatherResources(
        character, 
        territory, 
        { leverageMultiplier: 1.5 }
      );

      if (!result.resources || result.resources.length === 0) {
        throw new Error('Resource gathering failed');
      }
    });

    await this.runTest('Service Container Integration', async () => {
      // Test that all services can be created through DI container
      const services = [
        ServiceTokens.LEVERAGE_SERVICE,
        ServiceTokens.HONEYCOMB_SERVICE,
        ServiceTokens.RESOURCE_MANAGER,
        ServiceTokens.OPTIMIZATION_MANAGER
      ];

      for (const serviceToken of services) {
        const service = container.get(serviceToken);
        if (!service) {
          throw new Error(`Failed to create service: ${serviceToken}`);
        }
      }
    });
  }

  private async runPerformanceTests(): Promise<void> {
    console.log('⚡ Running Performance Tests...');

    await this.runTest('Resource Manager Performance', async () => {
      const resourceManager = new ResourceManager();
      const startTime = performance.now();
      
      // Create 1000 resources
      for (let i = 0; i < 1000; i++) {
        await resourceManager.addResource({
          id: `perf-resource-${i}`,
          type: 'gold',
          amount: Math.random() * 100,
          baseValue: 10
        });
      }

      const duration = performance.now() - startTime;
      
      if (duration > 1000) { // Should complete in under 1 second
        throw new Error(`Resource creation too slow: ${duration}ms`);
      }
    });

    await this.runTest('Leverage Calculation Performance', async () => {
      const leverageService = new LeverageService();
      const character: Character = {
        name: 'PerfTestChar',
        level: 10,
        faction: FactionType.Sun,
        experience: 5000,
        resources: { gold: 1000, iron: 500, crystal: 100 }
      };

      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        await leverageService.calculateLeverage(character, {
          action: 'craft',
          territory: `territory-${i}`,
          resources: ['gold', 'iron']
        });
      }

      const duration = performance.now() - startTime;
      const avgDuration = duration / iterations;

      if (avgDuration > 10) { // Each calculation should be under 10ms
        throw new Error(`Leverage calculation too slow: ${avgDuration}ms average`);
      }
    });

    await this.runTest('Memory Usage Test', async () => {
      if (!('memory' in performance)) {
        console.warn('Memory API not available, skipping memory test');
        return;
      }

      const initialMemory = (performance as any).memory.usedJSHeapSize;
      
      // Create temporary objects
      const tempData = [];
      for (let i = 0; i < 10000; i++) {
        tempData.push({
          id: i,
          data: new Array(1000).fill(Math.random()),
          timestamp: Date.now()
        });
      }

      const peakMemory = (performance as any).memory.usedJSHeapSize;
      
      // Clear temp data
      tempData.length = 0;
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc();
      }

      // Allow some time for GC
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = (performance as any).memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryMB = memoryIncrease / (1024 * 1024);

      if (memoryMB > 50) { // Should not leak more than 50MB
        throw new Error(`Memory leak detected: ${memoryMB.toFixed(2)}MB increase`);
      }
    });
  }

  private async runSecurityTests(): Promise<void> {
    console.log('🔒 Running Security Tests...');

    await this.runTest('Input Sanitization', async () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = security.sanitize.sanitizeHTML(maliciousInput);
      
      if (sanitized.includes('<script>')) {
        throw new Error('XSS vulnerability detected');
      }
    });

    await this.runTest('Input Validation', async () => {
      const validCharName = 'TestCharacter123';
      const invalidCharName = '<script>hack()</script>';
      
      if (!security.validate.isValidCharacterName(validCharName)) {
        throw new Error('Valid character name rejected');
      }
      
      if (security.validate.isValidCharacterName(invalidCharName)) {
        throw new Error('Invalid character name accepted');
      }
    });

    await this.runTest('Secure Storage', async () => {
      const testData = { secret: 'test-secret-123', level: 42 };
      
      security.storage.setItem('test-key', testData);
      const retrieved = security.storage.getItem<typeof testData>('test-key');
      
      if (!retrieved || retrieved.secret !== testData.secret) {
        throw new Error('Secure storage failed');
      }
      
      security.storage.removeItem('test-key');
    });

    await this.runTest('Rate Limiting', async () => {
      const identifier = 'test-user';
      const maxRequests = 5;
      
      // Make requests up to limit
      for (let i = 0; i < maxRequests; i++) {
        if (!security.validate.checkRateLimit(identifier, maxRequests, 1000)) {
          throw new Error(`Rate limit triggered too early at request ${i + 1}`);
        }
      }
      
      // Next request should be rate limited
      if (security.validate.checkRateLimit(identifier, maxRequests, 1000)) {
        throw new Error('Rate limit not enforced');
      }
    });
  }

  private async runEndToEndTests(): Promise<void> {
    console.log('🎯 Running End-to-End Tests...');

    await this.runTest('Complete Game Flow', async () => {
      // Create a character
      const character: Character = {
        name: 'E2ETestChar',
        level: 1,
        faction: FactionType.Sun,
        experience: 0,
        resources: { gold: 100 },
        traits: [{ type: TraitType.Strength, level: 1 }]
      };

      // Calculate leverage
      const leverageService = container.get<LeverageService>(ServiceTokens.LEVERAGE_SERVICE);
      const leverageResult = await leverageService.calculateLeverage(character, {
        action: 'gather',
        territory: 'e2e-territory',
        resources: ['gold']
      });

      if (!leverageResult.leverageMultiplier) {
        throw new Error('Leverage calculation failed in E2E test');
      }

      // Gather resources
      const resourceManager = container.get<ResourceManager>(ServiceTokens.RESOURCE_MANAGER);
      const territory: Territory = {
        id: 'e2e-territory',
        name: 'E2E Territory',
        position: { x: 0, y: 0, z: 0 },
        resources: [{ id: '1', type: 'gold', amount: 50 }]
      };

      const gatherResult = await resourceManager.gatherResources(
        character,
        territory,
        leverageResult
      );

      if (!gatherResult.resources || gatherResult.resources.length === 0) {
        throw new Error('Resource gathering failed in E2E test');
      }

      // Test combat
      const combatSystem = container.get<CombatSystem>(ServiceTokens.COMBAT_SYSTEM);
      const enemy: Character = {
        name: 'E2EEnemy',
        level: 1,
        faction: FactionType.Ocean,
        experience: 0,
        resources: { gold: 50 },
        traits: [{ type: TraitType.Strength, level: 1 }]
      };

      const combatResult = await combatSystem.simulateCombat(character, enemy);
      
      if (!combatResult.winner) {
        throw new Error('Combat simulation failed in E2E test');
      }
    });
  }

  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const testResult: TestResult = {
      name,
      status: 'running'
    };

    this.results.push(testResult);

    try {
      const startTime = performance.now();
      await profiler.measureAsync(name, testFn);
      const duration = performance.now() - startTime;

      testResult.status = 'passed';
      testResult.duration = duration;
      
      console.log(`✅ ${name} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error instanceof Error ? error.message : String(error);
      
      console.error(`❌ ${name}: ${testResult.error}`);
    }
  }

  private printSummary(result: TestSuiteResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST SUITE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${result.totalTests}`);
    console.log(`✅ Passed: ${result.passed}`);
    console.log(`❌ Failed: ${result.failed}`);
    console.log(`⏱️  Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`📊 Success Rate: ${((result.passed / result.totalTests) * 100).toFixed(1)}%`);

    if (result.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      result.results
        .filter(r => r.status === 'failed')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }

    // Performance report
    console.log('\n⚡ PERFORMANCE REPORT:');
    profiler.report();

    console.log('='.repeat(60));
  }
}

// Export test runner function
export async function runComprehensiveTests(): Promise<TestSuiteResult> {
  const testSuite = new ComprehensiveTestSuite();
  return await testSuite.runAllTests();
}
