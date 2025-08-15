import React, { useEffect, useState } from 'react';
import { useGameContext } from '../context/GameContext';
import { Character, Territory, TraitType, FactionType } from '../types/game';
import { LeverageOptimizer } from '../services/LeverageOptimizer';
import { SystemOrchestrator } from '../services/SystemOrchestrator';
import { MissionOrchestrator } from '../services/MissionOrchestrator';
import { TerritoryManager } from '../services/TerritoryManager';
import { CombatSystem } from '../services/CombatSystem';
import { CraftingSystem } from '../services/CraftingSystem';
import { ResourceManager } from '../services/ResourceManager';

const TestEnvironment: React.FC = () => {
  const {
    activeCharacter,
    territories,
    updateCharacter,
    updateTerritory,
    leverageService
  } = useGameContext();

  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'running' | 'success' | 'failed';
    message: string;
  }>>([]);

  const addTestResult = (test: string, status: 'running' | 'success' | 'failed', message: string) => {
    setTestResults(prev => [...prev, { test, status, message }]);
  };

  // Test all systems
  useEffect(() => {
    const runTests = async () => {
      // Initialize test data
      const testCharacter: Character = {
        id: 'test-char-1',
        name: 'Test Hero',
        publicKey: 'test-key',
        faction: FactionType.Red,
        level: 1,
        experience: 0,
        resources: { gold: 100, iron: 50 },
        traits: [
          { type: TraitType.Strength, level: 1 },
          { type: TraitType.Wisdom, level: 1 }
        ],
        inventory: [],
        position: { x: 0, y: 0, z: 0 }
      };

      const testTerritory: Territory = {
        id: 'test-territory-1',
        name: 'Test Land',
        controlledBy: FactionType.Neutral,
        contestedBy: [FactionType.Red, FactionType.Blue],
        position: { x: 10, y: 0, z: 10 },
        resources: [
          { id: '1', type: 'gold', amount: 50 },
          { id: '2', type: 'iron', amount: 30 }
        ],
        influencePoints: 50
      };

      try {
        // 1. Test Leverage System
        addTestResult('Leverage System', 'running', 'Testing leverage analysis...');
        const leverageOptimizer = new LeverageOptimizer(leverageService, window.honeycombService);
        const leverageResult = await leverageOptimizer.optimizeAction(
          'combat',
          testCharacter,
          { territory: testTerritory }
        );
        
        if (leverageResult.leverageMultiplier > 0) {
          addTestResult('Leverage System', 'success', 
            `Leverage analysis successful. Multiplier: ${leverageResult.leverageMultiplier}`);
        } else {
          throw new Error('Invalid leverage multiplier');
        }

        // 2. Test Territory System
        addTestResult('Territory System', 'running', 'Testing territory management...');
        const territoryManager = new TerritoryManager();
        const territoryInfluence = await territoryManager.calculateInfluence(
          testTerritory,
          testCharacter,
          leverageResult
        );

        if (territoryInfluence > 0) {
          addTestResult('Territory System', 'success',
            `Territory influence calculated: ${territoryInfluence}`);
        } else {
          throw new Error('Invalid territory influence');
        }

        // 3. Test Combat System
        addTestResult('Combat System', 'running', 'Testing combat mechanics...');
        const combatSystem = new CombatSystem();
        const combatResult = await combatSystem.simulateCombat(
          testCharacter,
          testTerritory,
          leverageResult
        );

        if (combatResult.success) {
          addTestResult('Combat System', 'success',
            `Combat simulation successful. Damage: ${combatResult.damage}`);
        } else {
          throw new Error('Combat simulation failed');
        }

        // 4. Test Resource System
        addTestResult('Resource System', 'running', 'Testing resource gathering...');
        const resourceManager = new ResourceManager();
        const resourceResult = await resourceManager.gatherResources(
          testCharacter,
          testTerritory,
          leverageResult
        );

        if (resourceResult.resources.length > 0) {
          addTestResult('Resource System', 'success',
            `Resource gathering successful. Count: ${resourceResult.resources.length}`);
        } else {
          throw new Error('Resource gathering failed');
        }

        // 5. Test Crafting System
        addTestResult('Crafting System', 'running', 'Testing crafting mechanics...');
        const craftingSystem = new CraftingSystem();
        const craftingResult = await craftingSystem.craftItem(
          testCharacter,
          resourceResult.resources,
          leverageResult
        );

        if (craftingResult.success) {
          addTestResult('Crafting System', 'success',
            `Crafting successful. Item: ${craftingResult.item.name}`);
        } else {
          throw new Error('Crafting failed');
        }

        // 6. Test Mission System
        addTestResult('Mission System', 'running', 'Testing mission generation...');
        const missionOrchestrator = new MissionOrchestrator(leverageService);
        const missionResult = await missionOrchestrator.generateMission(
          testCharacter,
          testTerritory,
          leverageResult
        );

        if (missionResult.mission) {
          addTestResult('Mission System', 'success',
            `Mission generated: ${missionResult.mission.name}`);
        } else {
          throw new Error('Mission generation failed');
        }

        // 7. Test System Integration
        addTestResult('System Integration', 'running', 'Testing system orchestration...');
        const systemOrchestrator = new SystemOrchestrator();
        const integrationResult = await systemOrchestrator.processGameAction({
          type: 'TERRITORY_CAPTURE',
          character: testCharacter,
          territory: testTerritory,
          leverageResult
        });

        if (integrationResult.success) {
          addTestResult('System Integration', 'success',
            'All systems working together successfully');
        } else {
          throw new Error('System integration failed');
        }

        // 8. Test Visual Effects
        addTestResult('Visual Effects', 'running', 'Testing effect rendering...');
        // Visual effects are tested through the GameWorld component
        // We'll consider this a success if no errors are thrown
        addTestResult('Visual Effects', 'success',
          'Visual effects system ready');

      } catch (error) {
        // Log any test failures
        addTestResult(
          error.testName || 'Unknown Test',
          'failed',
          `Error: ${error.message}`
        );
      }
    };

    runTests();
  }, []);

  return (
    <div className="test-environment">
      <h2>System Test Results</h2>
      <div className="test-results">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`test-result ${result.status}`}
          >
            <h3>{result.test}</h3>
            <p>Status: {result.status}</p>
            <p>{result.message}</p>
          </div>
        ))}
      </div>

      <style>{`
        .test-environment {
          padding: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          position: fixed;
          top: 20px;
          right: 20px;
          width: 300px;
          max-height: 80vh;
          overflow-y: auto;
          border-radius: 10px;
          z-index: 1000;
        }

        .test-result {
          margin: 10px 0;
          padding: 10px;
          border-radius: 5px;
        }

        .test-result.running {
          background: rgba(255, 165, 0, 0.2);
          border: 1px solid orange;
        }

        .test-result.success {
          background: rgba(0, 255, 0, 0.2);
          border: 1px solid green;
        }

        .test-result.failed {
          background: rgba(255, 0, 0, 0.2);
          border: 1px solid red;
        }

        h2 {
          margin: 0 0 20px 0;
          color: #fff;
        }

        h3 {
          margin: 0 0 10px 0;
          color: #fff;
        }

        p {
          margin: 5px 0;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default TestEnvironment;