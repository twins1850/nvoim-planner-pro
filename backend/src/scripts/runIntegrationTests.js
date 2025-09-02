#!/usr/bin/env node

/**
 * Integration Testing and Optimization Script
 * 
 * This script runs comprehensive integration tests and performance optimizations
 * for the English Conversation Management system.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Configuration
const TEST_TIMEOUT = 60000; // 60 seconds
const PERFORMANCE_THRESHOLD = {
  api: {
    p95: 500, // 95% of requests should be under 500ms
    p99: 1000 // 99% of requests should be under 1000ms
  },
  database: {
    simple: 50, // Simple queries should take less than 50ms
    complex: 200 // Complex queries should take less than 200ms
  }
};

// Main function
async function main() {
  console.log('=== English Conversation Management System ===');
  console.log('Integration Testing and Optimization Script');
  console.log('=============================================\n');
  
  try {
    // Step 1: Run database optimizations
    console.log('Step 1: Running database optimizations...');
    await runDatabaseOptimizations();
    
    // Step 2: Run integration tests
    console.log('\nStep 2: Running integration tests...');
    const testResults = await runIntegrationTests();
    
    // Step 3: Run performance tests
    console.log('\nStep 3: Running performance tests...');
    const performanceResults = await runPerformanceTests();
    
    // Step 4: Generate report
    console.log('\nStep 4: Generating test and optimization report...');
    await generateReport(testResults, performanceResults);
    
    console.log('\nAll tests and optimizations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\nError during testing and optimization:', error);
    process.exit(1);
  }
}

// Run database optimizations
async function runDatabaseOptimizations() {
  return new Promise((resolve, reject) => {
    const optimizeProcess = spawn('node', ['src/scripts/optimizeQueries.js'], {
      stdio: 'inherit'
    });
    
    optimizeProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Database optimizations completed successfully.');
        resolve();
      } else {
        reject(new Error(`Database optimization failed with code ${code}`));
      }
    });
  });
}

// Run integration tests
async function runIntegrationTests() {
  return new Promise((resolve, reject) => {
    const testProcess = spawn('npx', ['jest', '--config', 'jest.config.js', '--testMatch', '**/tests/integration/**/*.test.ts', '--forceExit', '--detectOpenHandles'], {
      stdio: 'pipe'
    });
    
    let output = '';
    
    testProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
    });
    
    testProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stderr.write(chunk);
    });
    
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Integration tests completed successfully.');
        resolve(parseTestResults(output));
      } else {
        reject(new Error(`Integration tests failed with code ${code}`));
      }
    });
  });
}

// Run performance tests
async function runPerformanceTests() {
  return new Promise((resolve, reject) => {
    const perfProcess = spawn('npx', ['artillery', 'run', '--output', 'performance-tests/results.json', 'performance-tests/realistic-scenarios.yml'], {
      stdio: 'pipe'
    });
    
    let output = '';
    
    perfProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stdout.write(chunk);
    });
    
    perfProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      process.stderr.write(chunk);
    });
    
    perfProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Performance tests completed successfully.');
        
        // Parse performance test results
        try {
          const resultsPath = path.join(process.cwd(), 'performance-tests/results.json');
          if (fs.existsSync(resultsPath)) {
            const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            resolve(parsePerformanceResults(results));
          } else {
            resolve({ error: 'Results file not found' });
          }
        } catch (error) {
          console.error('Error parsing performance results:', error);
          resolve({ error: error.message });
        }
      } else {
        reject(new Error(`Performance tests failed with code ${code}`));
      }
    });
  });
}

// Parse test results
function parseTestResults(output) {
  const results = {
    passed: 0,
    failed: 0,
    total: 0,
    time: 0,
    suites: {}
  };
  
  // Extract test summary
  const summaryMatch = output.match(/Tests:\\s+(\d+) passed,\\s+(\d+) failed,\\s+(\d+) total/);
  if (summaryMatch) {
    results.passed = parseInt(summaryMatch[1], 10);
    results.failed = parseInt(summaryMatch[2], 10);
    results.total = parseInt(summaryMatch[3], 10);
  }
  
  // Extract time
  const timeMatch = output.match(/Time:\\s+(\\d+\\.\\d+)\\s+s/);
  if (timeMatch) {
    results.time = parseFloat(timeMatch[1]);
  }
  
  // Extract test suites
  const suiteRegex = /^\\s*(.+)\\.test\\.ts$/gm;
  let suiteMatch;
  while ((suiteMatch = suiteRegex.exec(output)) !== null) {
    const suiteName = suiteMatch[1];
    results.suites[suiteName] = {
      name: suiteName,
      passed: true // Assume passed unless we find failures
    };
  }
  
  return results;
}

// Parse performance results
function parsePerformanceResults(results) {
  const parsedResults = {
    summary: {
      duration: results.phases ? results.phases.reduce((sum, phase) => sum + phase.duration, 0) : 0,
      scenarios: results.aggregate ? results.aggregate.scenariosCreated : 0,
      requestsCompleted: results.aggregate ? results.aggregate.requestsCompleted : 0,
      requestsFailed: results.aggregate ? results.aggregate.requestsFailed : 0
    },
    latency: {
      min: results.aggregate ? results.aggregate.latency.min : 0,
      max: results.aggregate ? results.aggregate.latency.max : 0,
      median: results.aggregate ? results.aggregate.latency.median : 0,
      p95: results.aggregate ? results.aggregate.latency.p95 : 0,
      p99: results.aggregate ? results.aggregate.latency.p99 : 0
    },
    rps: {
      mean: results.aggregate ? results.aggregate.rps.mean : 0,
      count: results.aggregate ? results.aggregate.rps.count : 0
    },
    scenarioLatency: {},
    errors: {}
  };
  
  // Extract scenario latencies
  if (results.aggregate && results.aggregate.scenarioLatency) {
    Object.keys(results.aggregate.scenarioLatency).forEach(scenario => {
      parsedResults.scenarioLatency[scenario] = results.aggregate.scenarioLatency[scenario];
    });
  }
  
  // Extract errors
  if (results.aggregate && results.aggregate.errors) {
    Object.keys(results.aggregate.errors).forEach(error => {
      parsedResults.errors[error] = results.aggregate.errors[error];
    });
  }
  
  return parsedResults;
}

// Generate report
async function generateReport(testResults, performanceResults) {
  const reportPath = path.join(process.cwd(), 'integration-test-report.md');
  
  const report = [
    '# English Conversation Management System',
    '## Integration Testing and Optimization Report',
    `Generated on: ${new Date().toISOString()}`,
    '',
    '## 1. Test Results Summary',
    '### Integration Tests',
    `- Total Tests: ${testResults.total}`,
    `- Passed: ${testResults.passed}`,
    `- Failed: ${testResults.failed}`,
    `- Execution Time: ${testResults.time} seconds`,
    '',
    '### Performance Tests',
    `- Duration: ${performanceResults.summary.duration} seconds`,
    `- Scenarios Created: ${performanceResults.summary.scenarios}`,
    `- Requests Completed: ${performanceResults.summary.requestsCompleted}`,
    `- Requests Failed: ${performanceResults.summary.requestsFailed}`,
    '',
    '## 2. Performance Metrics',
    '### API Response Times',
    `- Minimum: ${performanceResults.latency.min} ms`,
    `- Maximum: ${performanceResults.latency.max} ms`,
    `- Median: ${performanceResults.latency.median} ms`,
    `- 95th Percentile: ${performanceResults.latency.p95} ms (Threshold: ${PERFORMANCE_THRESHOLD.api.p95} ms)`,
    `- 99th Percentile: ${performanceResults.latency.p99} ms (Threshold: ${PERFORMANCE_THRESHOLD.api.p99} ms)`,
    '',
    '### Requests Per Second',
    `- Mean: ${performanceResults.rps.mean}`,
    `- Total: ${performanceResults.rps.count}`,
    '',
    '## 3. Scenario Performance',
  ];
  
  // Add scenario latencies
  Object.keys(performanceResults.scenarioLatency || {}).forEach(scenario => {
    const latency = performanceResults.scenarioLatency[scenario];
    report.push(`### ${scenario}`);
    report.push(`- Median: ${latency.median} ms`);
    report.push(`- 95th Percentile: ${latency.p95} ms`);
    report.push(`- 99th Percentile: ${latency.p99} ms`);
    report.push('');
  });
  
  // Add errors if any
  if (Object.keys(performanceResults.errors || {}).length > 0) {
    report.push('## 4. Errors');
    Object.keys(performanceResults.errors).forEach(error => {
      report.push(`- ${error}: ${performanceResults.errors[error]}`);
    });
    report.push('');
  }
  
  // Add performance assessment
  const p95Passed = performanceResults.latency.p95 <= PERFORMANCE_THRESHOLD.api.p95;
  const p99Passed = performanceResults.latency.p99 <= PERFORMANCE_THRESHOLD.api.p99;
  
  report.push('## 5. Performance Assessment');
  report.push(`- 95th Percentile Response Time: ${p95Passed ? '✅ PASSED' : '❌ FAILED'}`);
  report.push(`- 99th Percentile Response Time: ${p99Passed ? '✅ PASSED' : '❌ FAILED'}`);
  report.push(`- Overall Performance: ${p95Passed && p99Passed ? '✅ PASSED' : '❌ NEEDS IMPROVEMENT'}`);
  report.push('');
  
  // Add recommendations
  report.push('## 6. Recommendations');
  
  if (!p95Passed || !p99Passed) {
    report.push('### Performance Improvements');
    report.push('- Consider implementing additional caching for frequently accessed data');
    report.push('- Review database indexes for frequently queried collections');
    report.push('- Optimize file processing operations for audio and video files');
    report.push('- Consider implementing request batching for multiple API calls');
  }
  
  if (performanceResults.summary.requestsFailed > 0) {
    report.push('### Error Handling');
    report.push('- Review error handling for failed requests');
    report.push('- Implement additional retry mechanisms for transient failures');
    report.push('- Enhance circuit breaker configurations for external services');
  }
  
  report.push('### General Recommendations');
  report.push('- Continue monitoring API performance in production');
  report.push('- Implement automated performance testing in CI/CD pipeline');
  report.push('- Consider horizontal scaling for high-traffic endpoints');
  report.push('- Optimize AI service usage to reduce costs and improve response times');
  
  // Write report to file
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`Report generated at: ${reportPath}`);
}

// Run the script
main().catch(console.error);