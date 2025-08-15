import React, { useState, useEffect } from 'react';
import { TestSuite } from '../testing/TestSuite';

const TestRunner: React.FC = () => {
  const [testResults, setTestResults] = useState<{
    passed: string[];
    failed: { name: string; error: string }[];
    running: string | null;
  }>({
    passed: [],
    failed: [],
    running: null
  });

  useEffect(() => {
    const runTests = async () => {
      const testSuite = new TestSuite();
      
      testSuite.onTestStart = (testName) => {
        setTestResults(prev => ({
          ...prev,
          running: testName
        }));
      };

      testSuite.onTestPass = (testName) => {
        setTestResults(prev => ({
          ...prev,
          running: null,
          passed: [...prev.passed, testName]
        }));
      };

      testSuite.onTestFail = (testName, error) => {
        setTestResults(prev => ({
          ...prev,
          running: null,
          failed: [...prev.failed, { name: testName, error }]
        }));
      };

      await testSuite.runAllTests();
    };

    runTests();
  }, []);

  return (
    <div className="test-runner">
      <h2>Test Results</h2>
      
      {/* Currently Running Test */}
      {testResults.running && (
        <div className="test-section running">
          <h3>Running</h3>
          <p>{testResults.running}</p>
        </div>
      )}

      {/* Passed Tests */}
      <div className="test-section passed">
        <h3>Passed ({testResults.passed.length})</h3>
        <ul>
          {testResults.passed.map((test, index) => (
            <li key={index}>✓ {test}</li>
          ))}
        </ul>
      </div>

      {/* Failed Tests */}
      <div className="test-section failed">
        <h3>Failed ({testResults.failed.length})</h3>
        <ul>
          {testResults.failed.map((test, index) => (
            <li key={index}>
              ✗ {test.name}
              <div className="error">{test.error}</div>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        .test-runner {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 300px;
          max-height: 80vh;
          overflow-y: auto;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 20px;
          border-radius: 10px;
          z-index: 1000;
        }

        h2 {
          margin: 0 0 20px 0;
          color: var(--text);
        }

        .test-section {
          margin-bottom: 20px;
        }

        h3 {
          margin: 0 0 10px 0;
          font-size: 1.1em;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        li {
          margin: 5px 0;
          padding: 5px;
          border-radius: 3px;
        }

        .running {
          color: var(--primary-light);
        }

        .passed li {
          color: var(--success);
          background: rgba(16, 185, 129, 0.1);
        }

        .failed li {
          color: var(--error);
          background: rgba(239, 68, 68, 0.1);
        }

        .error {
          font-size: 0.9em;
          margin-top: 5px;
          padding: 5px;
          background: rgba(239, 68, 68, 0.2);
          border-radius: 3px;
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
};

export default TestRunner;