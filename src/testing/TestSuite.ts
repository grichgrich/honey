import {
  MockHiveControl,
  MockSolanaPay,
  MockVerxioService,
  MockTerritoryManager,
  MockCombatSystem,
  MockSystemOrchestrator
} from './mocks';

export class TestSuite {
  private hiveControl: MockHiveControl;
  private solanaPay: MockSolanaPay;
  private verxioService: MockVerxioService;
  private territoryManager: MockTerritoryManager;
  private combatSystem: MockCombatSystem;
  private systemOrchestrator: MockSystemOrchestrator;

  // Event handlers
  public onTestStart?: (testName: string) => void;
  public onTestPass?: (testName: string) => void;
  public onTestFail?: (testName: string, error: string) => void;

  constructor() {
    this.hiveControl = new MockHiveControl();
    this.solanaPay = new MockSolanaPay();
    this.verxioService = new MockVerxioService();
    this.territoryManager = new MockTerritoryManager();
    this.combatSystem = new MockCombatSystem();
    this.systemOrchestrator = new MockSystemOrchestrator();
  }

  private async runTest(name: string, testFn: () => Promise<void>) {
    this.onTestStart?.(name);
    try {
      await testFn();
      this.onTestPass?.(name);
    } catch (error) {
      this.onTestFail?.(name, error.message);
    }
  }

  async runAllTests() {
    await this.runTest('Profile Initialization', async () => {
      const publicKey = 'test-key';
      await this.hiveControl.initializeProfile(publicKey);
      const profile = await this.hiveControl.getProfile(publicKey);
      if (!profile) throw new Error('Profile not initialized');
      if (profile.level !== 1) throw new Error('Initial level incorrect');
    });

    await this.runTest('Payment Processing', async () => {
      const { paymentUrl, reference } = await this.solanaPay.processInGamePurchase(
        100,
        'test-key',
        'test-item'
      );
      if (!paymentUrl.includes('test-item')) throw new Error('Invalid payment URL');
      const signature = await this.solanaPay.confirmPayment(reference);
      if (!signature.includes(reference)) throw new Error('Invalid signature');
    });

    await this.runTest('Loyalty System', async () => {
      const publicKey = 'test-key';
      const streak = await this.verxioService.updateStreak(publicKey);
      if (streak !== 1) throw new Error('Initial streak incorrect');
      const points = await this.verxioService.addPoints(publicKey, 100);
      if (points !== 100) throw new Error('Points not added correctly');
    });

    await this.runTest('Territory Control', async () => {
      const territories = await this.territoryManager.getTerritories();
      if (!Array.isArray(territories)) throw new Error('Invalid territories response');
    });

    await this.runTest('Combat Resolution', async () => {
      const attacker = {
        id: 'attacker',
        name: 'Attacker',
        publicKey: 'attacker-key',
        faction: 'red' as const,
        level: 1,
        experience: 0,
        resources: { gold: 100, iron: 50 },
        traits: [{ type: 'Strength' as const, level: 2, experience: 0 }],
        inventory: [],
        position: { x: 0, y: 0, z: 0 }
      };

      const defender = {
        id: 'defender',
        name: 'Defender',
        publicKey: 'defender-key',
        faction: 'blue' as const,
        level: 1,
        experience: 0,
        resources: { gold: 80, iron: 40 },
        traits: [{ type: 'Strength' as const, level: 1, experience: 0 }],
        inventory: [],
        position: { x: 0, y: 0, z: 0 }
      };

      const result = await this.combatSystem.resolveCombat(attacker, defender);
      if (result.winner.id !== attacker.id) throw new Error('Combat resolution incorrect');
    });

    await this.runTest('System Integration', async () => {
      const result = await this.systemOrchestrator.processGameAction(
        'TERRITORY_CLAIM',
        { territoryId: 'test', faction: 'red' }
      );
      if (!result.success) throw new Error('Action processing failed');
    });
  }
}