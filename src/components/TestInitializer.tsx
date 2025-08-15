import React, { useEffect, useState } from 'react';
import { TestSuite } from '../testing/TestSuite';

interface TestProgress {
  phase: string;
  completed: number;
  total: number;
  currentTest?: string;
}

interface DetailedResults {
  name: string;
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
}

const TestInitializer: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<TestProgress>({
    phase: 'Initializing',
    completed: 0,
    total: 100
  });
  const [results, setResults] = useState<{
    features: DetailedResults[];
    integration: DetailedResults[];
    system: DetailedResults[];
    performance: Record<string, number>;
  }>({
    features: [],
    integration: [],
    system: [],
    performance: {}
  });

  const startTests = async () => {
    setIsRunning(true);
    setProgress({ phase: 'Starting Tests', completed: 0, total: 100 });

    const testSuite = new TestSuite();
    
    try {
      // Feature Tests
      setProgress({ phase: 'Feature Tests', completed: 0, total: 8 });
      const featureResults = await runFeatureTests(testSuite);
      setResults(prev => ({ ...prev, features: featureResults }));

      // Integration Tests
      setProgress({ phase: 'Integration Tests', completed: 0, total: 5 });
      const integrationResults = await runIntegrationTests(testSuite);
      setResults(prev => ({ ...prev, integration: integrationResults }));

      // System Tests
      setProgress({ phase: 'System Tests', completed: 0, total: 3 });
      const systemResults = await runSystemTests(testSuite);
      setResults(prev => ({ ...prev, system: systemResults }));

      // Performance Tests
      setProgress({ phase: 'Performance Tests', completed: 0, total: 100 });
      const performanceResults = await runPerformanceTests(testSuite);
      setResults(prev => ({ ...prev, performance: performanceResults }));

      setProgress({ phase: 'Complete', completed: 100, total: 100 });
    } catch (error) {
      console.error('Test suite failed:', error);
      setProgress({ phase: 'Error', completed: 0, total: 100 });
    } finally {
      setIsRunning(false);
    }
  };

  const runFeatureTests = async (testSuite: TestSuite) => {
    const features = [
      'Leverage System',
      'Territory System',
      'Combat System',
      'Resource System',
      'Crafting System',
      'Mission System',
      'Trait System',
      'Faction System'
    ];

    const results: DetailedResults[] = [];

    for (let i = 0; i < features.length; i++) {
      setProgress(prev => ({
        ...prev,
        completed: i,
        currentTest: features[i]
      }));

      const startTime = performance.now();
      const result = await testSuite.runAllTests();
      const duration = performance.now() - startTime;

      results.push({
        name: features[i],
        success: result.individualTests[i]?.success || false,
        message: result.individualTests[i]?.message || 'Test failed',
        details: result.individualTests[i]?.data,
        duration
      });
    }

    return results;
  };

  const runIntegrationTests = async (testSuite: TestSuite) => {
    const integrations = [
      'Combat-Territory',
      'Resource-Crafting',
      'Mission-Leverage',
      'Faction-Territory',
      'Trait-Combat'
    ];

    const results: DetailedResults[] = [];

    for (let i = 0; i < integrations.length; i++) {
      setProgress(prev => ({
        ...prev,
        completed: i,
        currentTest: integrations[i]
      }));

      const startTime = performance.now();
      const result = await testSuite.runAllTests();
      const duration = performance.now() - startTime;

      results.push({
        name: integrations[i],
        success: result.integrationTests[i]?.success || false,
        message: result.integrationTests[i]?.message || 'Test failed',
        details: result.integrationTests[i]?.data,
        duration
      });
    }

    return results;
  };

  const runSystemTests = async (testSuite: TestSuite) => {
    const systems = [
      'Complete Game Action',
      'System Consistency',
      'Error Handling'
    ];

    const results: DetailedResults[] = [];

    for (let i = 0; i < systems.length; i++) {
      setProgress(prev => ({
        ...prev,
        completed: i,
        currentTest: systems[i]
      }));

      const startTime = performance.now();
      const result = await testSuite.runAllTests();
      const duration = performance.now() - startTime;

      results.push({
        name: systems[i],
        success: result.systemTests[i]?.success || false,
        message: result.systemTests[i]?.message || 'Test failed',
        details: result.systemTests[i]?.data,
        duration
      });
    }

    return results;
  };

  const runPerformanceTests = async (testSuite: TestSuite) => {
    setProgress(prev => ({
      ...prev,
      currentTest: 'Performance Metrics'
    }));

    const result = await testSuite.runAllTests();
    return result.performanceMetrics;
  };

  useEffect(() => {
    startTests();
  }, []);

  const renderProgressBar = () => (
    <div className="progress-bar">
      <div 
        className="progress-fill"
        style={{ width: `${(progress.completed / progress.total) * 100}%` }}
      />
    </div>
  );

  const renderTestResults = (tests: DetailedResults[], title: string) => (
    <div className="test-section">
      <h3>{title}</h3>
      <div className="test-grid">
        {tests.map((test, index) => (
          <div
            key={index}
            className={`test-card ${test.success ? 'success' : 'failure'}`}
          >
            <div className="test-header">
              <h4>{test.name}</h4>
              <span className="duration">{test.duration?.toFixed(2)}ms</span>
            </div>
            <p>{test.message}</p>
            {test.details && (
              <div className="test-details">
                <pre>{JSON.stringify(test.details, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderPerformanceMetrics = () => (
    <div className="performance-section">
      <h3>Performance Metrics</h3>
      <div className="metrics-grid">
        {Object.entries(results.performance).map(([key, value]) => (
          <div key={key} className="metric-card">
            <h4>{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
            <p>{typeof value === 'number' ? value.toFixed(2) : value}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="test-initializer">
      <div className="test-header">
        <h2>ChainQuest Test Suite</h2>
        <div className="test-status">
          <span className={`status-indicator ${isRunning ? 'running' : 'complete'}`} />
          {isRunning ? 'Running Tests...' : 'Tests Complete'}
        </div>
      </div>

      <div className="current-progress">
        <h3>{progress.phase}</h3>
        {progress.currentTest && <p>Current: {progress.currentTest}</p>}
        {renderProgressBar()}
      </div>

      <div className="results-container">
        {renderTestResults(results.features, 'Feature Tests')}
        {renderTestResults(results.integration, 'Integration Tests')}
        {renderTestResults(results.system, 'System Tests')}
        {renderPerformanceMetrics()}
      </div>

      <style>{`
        .test-initializer {
          padding: 20px;
          background: rgba(0, 0, 0, 0.9);
          color: white;
          position: fixed;
          top: 20px;
          right: 20px;
          width: 80vw;
          max-width: 1200px;
          height: 90vh;
          overflow-y: auto;
          border-radius: 10px;
          z-index: 1000;
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .test-status {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .status-indicator.running {
          background: #ffd700;
          animation: pulse 1s infinite;
        }

        .status-indicator.complete {
          background: #4caf50;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .current-progress {
          margin-bottom: 30px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s ease;
        }

        .test-section {
          margin-bottom: 30px;
        }

        .test-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }

        .test-card {
          padding: 15px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
        }

        .test-card.success {
          border-left: 4px solid #4caf50;
        }

        .test-card.failure {
          border-left: 4px solid #f44336;
        }

        .test-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }

        .duration {
          font-size: 12px;
          color: #888;
        }

        .test-details {
          margin-top: 10px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          overflow-x: auto;
        }

        .test-details pre {
          margin: 0;
          font-size: 12px;
          white-space: pre-wrap;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }

        .metric-card {
          padding: 15px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.1);
          text-align: center;
        }

        .metric-card h4 {
          margin: 0 0 10px 0;
          color: #fff;
          text-transform: capitalize;
        }

        .metric-card p {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          color: #4caf50;
        }
      `}</style>
    </div>
  );
};

export default TestInitializer;