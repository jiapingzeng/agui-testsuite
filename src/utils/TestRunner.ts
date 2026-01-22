import { AgentExecutor } from './AgentExecutor';
import * as fs from 'fs';
import * as path from 'path';

export interface TestConfig {
  name: string;
  agentId: string;
  modelType: 'openai' | 'bedrock';
  payload: any;
}

export interface TestResult {
  name: string;
  modelType: string;
  passed: boolean;
  duration: number;
  error?: string;
  response?: any;
  outputFile?: string;
}

export class TestRunner {
  private outputDir: string;

  constructor(outputDir: string = 'outputs') {
    this.outputDir = path.join(process.cwd(), outputDir);
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async runTest(config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `${config.name} (${config.modelType})`;
    
    try {
      console.log(`\n▶ Running: ${testName}`);
      
      const executor = new AgentExecutor();
      const response = await executor.execute({
        agentId: config.agentId,
        payload: config.payload,
      });

      const duration = Date.now() - startTime;

      // Parse and print accumulated text
      const accumulatedText = this.extractAccumulatedText(response.body);
      if (accumulatedText) {
        console.log(`\n  Accumulated Response:\n  ${accumulatedText}\n`);
      }

      // Save response to file
      const outputFile = this.saveOutput(config.name, config.modelType, response.body);

      if (response.statusCode === 200) {
        console.log(`✓ Test passed: ${testName} (${duration}ms)`);
        console.log(`  Output saved to: ${outputFile}`);
        return {
          name: testName,
          modelType: config.modelType,
          passed: true,
          duration,
          response: response.body,
          outputFile,
        };
      } else {
        console.log(`✗ Test failed: ${testName} (${duration}ms)`);
        return {
          name: testName,
          modelType: config.modelType,
          passed: false,
          duration,
          error: `Status code: ${response.statusCode}`,
          response: response.body,
          outputFile,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`✗ Test failed: ${testName} (${duration}ms)`);
      console.log(`  Error: ${error}`);
      return {
        name: testName,
        modelType: config.modelType,
        passed: false,
        duration,
        error: String(error),
      };
    }
  }

  private extractAccumulatedText(streamContent: string): string {
    const lines = streamContent.split('\n');
    let accumulatedText = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.type === 'TEXT_MESSAGE_CONTENT' && data.delta) {
            accumulatedText += data.delta;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    return accumulatedText;
  }

  private saveOutput(testName: string, modelType: string, content: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${sanitizedName}_${modelType}_${timestamp}.txt`;
    const filepath = path.join(this.outputDir, filename);
    
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  async runMultipleTests(tests: TestConfig[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    for (const test of tests) {
      const result = await this.runTest(test);
      results.push(result);
    }

    return results;
  }
}
