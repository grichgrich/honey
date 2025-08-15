import { TestSuite } from './TestSuite';
import chalk from 'chalk';

async function runTests() {
  console.log(chalk.blue.bold('\n🚀 Starting ChainQuest Test Suite\n'));

  const testSuite = new TestSuite();
  let totalTests = 0;
  let passedTests = 0;

  try {
    console.log(chalk.yellow('📋 Running Individual Feature Tests...\n'));
    const results = await testSuite.runAllTests();

    // Process Individual Tests
    console.log(chalk.cyan('🔍 Individual Feature Test Results:'));
    results.individualTests.forEach((test, index) => {
      totalTests++;
      if (test.success) passedTests++;
      console.log(
        `${test.success ? chalk.green('✓') : chalk.red('✗')} ${test.name}`,
        `${test.success ? '' : `\n   ${chalk.red(test.message)}`}`
      );
    });

    // Process Integration Tests
    console.log(chalk.cyan('\n🔄 Integration Test Results:'));
    results.integrationTests.forEach((test) => {
      totalTests++;
      if (test.success) passedTests++;
      console.log(
        `${test.success ? chalk.green('✓') : chalk.red('✗')} ${test.name}`,
        `${test.success ? '' : `\n   ${chalk.red(test.message)}`}`
      );
    });

    // Process System Tests
    console.log(chalk.cyan('\n🔧 System Test Results:'));
    results.systemTests.forEach((test) => {
      totalTests++;
      if (test.success) passedTests++;
      console.log(
        `${test.success ? chalk.green('✓') : chalk.red('✗')} ${test.name}`,
        `${test.success ? '' : `\n   ${chalk.red(test.message)}`}`
      );
    });

    // Display Performance Metrics
    console.log(chalk.cyan('\n📊 Performance Metrics:'));
    Object.entries(results.performanceMetrics).forEach(([key, value]) => {
      console.log(`${chalk.yellow(key)}: ${chalk.white(value.toFixed(2))}`);
    });

    // Summary
    const successRate = (passedTests / totalTests) * 100;
    console.log(
      chalk.bold(`\n📝 Test Summary:
      Total Tests: ${totalTests}
      Passed: ${chalk.green(passedTests)}
      Failed: ${chalk.red(totalTests - passedTests)}
      Success Rate: ${successRate.toFixed(2)}%`)
    );

    if (successRate === 100) {
      console.log(chalk.green.bold('\n✨ All tests passed successfully!\n'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️ Some tests failed. Review the results above for details.\n'));
    }

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Test suite failed:'), error);
  }
}

runTests();