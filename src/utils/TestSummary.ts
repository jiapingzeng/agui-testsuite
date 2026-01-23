import { TestResult } from './TestRunner';
import { Colors } from './Colors';
import Table from 'cli-table3';

export class TestSummary {
  static print(results: TestResult[]): void {
    console.log('\n═══════════════════════════════════════════');
    console.log('📊 Test Summary');
    console.log('═══════════════════════════════════════════');
    
    // Group results by test name
    const resultsByTest = new Map<string, { openai?: boolean; bedrock?: boolean }>();
    
    for (const result of results) {
      // Extract test name without model type
      const testName = result.name.replace(/ \((openai|bedrock)\)$/, '');
      
      if (!resultsByTest.has(testName)) {
        resultsByTest.set(testName, {});
      }
      
      const testResults = resultsByTest.get(testName)!;
      if (result.modelType === 'openai') {
        testResults.openai = result.passed;
      } else if (result.modelType === 'bedrock') {
        testResults.bedrock = result.passed;
      }
    }
    
    // Create table
    const table = new Table({
      head: ['Test Name', 'OpenAI', 'Bedrock'],
      colWidths: [45, 9, 10],
      style: {
        head: []
      },
    });
    
    for (const [testName, testResults] of resultsByTest) {
      const openaiStatus = testResults.openai === undefined 
        ? '-'
        : (testResults.openai ? Colors.success('✓ Pass') : Colors.error('✗ Fail'));
      
      const bedrockStatus = testResults.bedrock === undefined
        ? '-'
        : (testResults.bedrock ? Colors.success('✓ Pass') : Colors.error('✗ Fail'));
      
      table.push([testName, openaiStatus, bedrockStatus]);
    }
    
    console.log('\n📋 Results by Test:\n');
    console.log(table.toString());
    console.log('');
    
    // Print overall stats
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`${Colors.success('✓')} Passed: ${passedTests}`);
    console.log(`${Colors.error('✗')} Failed: ${failedTests}`);
    console.log(`⏱ Total Duration: ${totalDuration}ms`);
    console.log('═══════════════════════════════════════════\n');
  }
}
