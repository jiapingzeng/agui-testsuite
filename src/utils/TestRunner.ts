import { AgentExecutor } from '../setup/AgentExecutor';
import { StreamValidator } from './StreamValidator';
import { Colors } from './Colors';
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
  private isParallelMode: boolean = false;
  private outputBuffer: string[] = [];

  constructor(outputDir: string = 'outputs') {
    this.outputDir = path.join(process.cwd(), outputDir);
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private log(message: string): void {
    if (this.isParallelMode) {
      this.outputBuffer.push(message);
    } else {
      console.log(message);
    }
  }

  private flushBuffer(): void {
    if (this.outputBuffer.length > 0) {
      console.log(this.outputBuffer.join('\n'));
      this.outputBuffer = [];
    }
  }

  async runTest(config: TestConfig): Promise<TestResult> {
    const startTime = Date.now();
    const testName = `${config.name} (${config.modelType})`;
    
    try {
      this.log(`\n${'═'.repeat(60)}`);
      this.log(`${Colors.bold('▶ RUNNING:')} ${Colors.cyan(testName)}`);
      this.log('═'.repeat(60));
      
      const executor = new AgentExecutor();
      const response = await executor.execute({
        agentId: config.agentId,
        payload: config.payload,
      });

      const duration = Date.now() - startTime;

      // Validate stream structure
      const validation = StreamValidator.validate(response.body, config.payload);
      
      // Parse and print accumulated text
      const accumulatedText = this.extractAccumulatedText(response.body);
      const runError = this.extractRunError(response.body);
      
      if (accumulatedText) {
        this.log(`\n${Colors.bold('📝 Accumulated Response:')}`);
        this.log(`${Colors.cyan(accumulatedText)}\n`);
      }
      
      if (runError) {
        this.log(`${Colors.bold('⚠️  Run Error:')}`);
        this.log(`${Colors.error(runError)}\n`);
      }

      // Print validation results
      const validationLabel = validation.isValid ? Colors.success('✓ VALID') : Colors.error('✗ INVALID');
      this.log(`${Colors.bold('🔍 Stream Validation:')} ${validationLabel}`);
      this.log(`  RUN_STARTED: ${validation.stats.runStartedCount} ${Colors.info('(expected 1)')}`);
      this.log(`  RUN_FINISHED: ${validation.stats.runFinishedCount}, RUN_ERROR: ${validation.stats.runErrorCount} ${Colors.info('(expected 1 total)')}`);
      this.log(`  Message pairs: ${validation.stats.messageCount}`);
      this.log(`  Orphaned content: ${validation.stats.orphanedContent}`);
      this.log(`  ThreadId mismatches: ${validation.stats.threadIdMismatches}`);
      this.log(`  RunId mismatches: ${validation.stats.runIdMismatches}`);
      this.log(`  MessageId inconsistencies: ${validation.stats.messageIdInconsistencies}`);
      
      if (!validation.isValid) {
        this.log(`${Colors.warning('⚠️  Validation Errors:')}`);
        validation.errors.forEach(err => this.log(`  ${Colors.error('-')} ${err}`));
      }

      // Save response to file
      const outputFile = this.saveOutput(config.name, config.modelType, response.body);

      // Test passes if: HTTP 200, validation passes, and no RUN_ERROR
      const testPassed = response.statusCode === 200 && validation.isValid && validation.stats.runErrorCount === 0;

      if (testPassed) {
        this.log(`\n${Colors.success('✅ TEST PASSED')} ${Colors.info(`(${duration}ms)`)}`);
        this.log(`📁 Output saved to: ${Colors.info(outputFile)}`);
        this.log('═'.repeat(60));
        
        this.flushBuffer();
        
        return {
          name: testName,
          modelType: config.modelType,
          passed: true,
          duration,
          response: response.body,
          outputFile,
        };
      } else {
        this.log(`\n${Colors.error('❌ TEST FAILED')} ${Colors.info(`(${duration}ms)`)}`);
        const errorMessage = response.statusCode !== 200 
          ? `Status code: ${response.statusCode}` 
          : `Validation failed: ${validation.errors.join(', ')}`;
        this.log(`${Colors.warning('Reason:')} ${errorMessage}`);
        this.log(`📁 Output saved to: ${Colors.info(outputFile)}`);
        this.log('═'.repeat(60));
        
        this.flushBuffer();
        
        return {
          name: testName,
          modelType: config.modelType,
          passed: false,
          duration,
          error: errorMessage,
          response: response.body,
          outputFile,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`\n${Colors.error('❌ TEST FAILED')} ${Colors.info(`(${duration}ms)`)}`);
      this.log(`${Colors.error('Error:')} ${error}`);
      this.log('═'.repeat(60));
      
      this.flushBuffer();
      
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
    const events = StreamValidator.parseStream(streamContent);
    
    let output = '';
    let currentMessage = '';
    let currentToolCall: any = null;
    let toolArgs = '';

    for (const event of events) {
      switch (event.type) {
        case 'TEXT_MESSAGE_START':
          // Start new message
          if (currentMessage) {
            output += currentMessage + '\n\n';
          }
          currentMessage = '';
          break;

        case 'TEXT_MESSAGE_CONTENT':
          currentMessage += event.delta || '';
          break;

        case 'TEXT_MESSAGE_END':
          if (currentMessage) {
            output += currentMessage + '\n\n';
            currentMessage = '';
          }
          break;

        case 'TOOL_CALL_START':
          currentToolCall = {
            name: event.toolCallName,
            id: event.toolCallId,
          };
          toolArgs = '';
          break;

        case 'TOOL_CALL_ARGS':
          toolArgs += event.delta || '';
          break;

        case 'TOOL_CALL_END':
          // Tool call ended, wait for result
          break;

        case 'TOOL_CALL_RESULT':
          if (currentToolCall) {
            output += Colors.info('Tool Use: ') + Colors.bold(currentToolCall.name);
            
            // Truncate args
            const truncatedArgs = this.truncateJson(toolArgs, 50);
            if (truncatedArgs) {
              output += Colors.info(', args: ') + truncatedArgs;
            }
            
            // Truncate result
            const truncatedResult = this.truncateJson(event.content, 100);
            output += Colors.info(', result: ') + truncatedResult;
            output += '\n\n';
            
            currentToolCall = null;
            toolArgs = '';
          }
          break;
      }
    }

    // Add any remaining message
    if (currentMessage) {
      output += currentMessage;
    }

    return output.trim();
  }

  private truncateJson(jsonString: string, maxLength: number): string {
    if (!jsonString) return '{}';
    
    if (jsonString.length <= maxLength) {
      return jsonString;
    }
    
    return jsonString.substring(0, maxLength) + '...';
  }

  private extractRunError(streamContent: string): string | null {
    const lines = streamContent.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          if (data.type === 'RUN_ERROR' && data.message) {
            return data.message;
          }
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    return null;
  }

  private saveOutput(testName: string, modelType: string, content: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sanitizedName = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${sanitizedName}_${modelType}_${timestamp}.txt`;
    const filepath = path.join(this.outputDir, filename);
    
    fs.writeFileSync(filepath, content, 'utf-8');
    return filepath;
  }

  async runMultipleTests(tests: TestConfig[], parallel: boolean = false): Promise<TestResult[]> {
    if (parallel) {
      this.isParallelMode = true;
      
      // Print initial status for all tests
      console.log(Colors.bold('\n📋 Tests Queued:'));
      tests.forEach((test, index) => {
        console.log(`  ${index + 1}. ${test.name} (${test.modelType})`);
      });
      console.log('');
      
      const absoluteOutputDir = this.outputDir;
      
      // Run tests in parallel with individual buffering
      const results = await Promise.all(
        tests.map(async (test) => {
          const testRunner = new TestRunner();
          testRunner.outputDir = absoluteOutputDir;
          testRunner.isParallelMode = true;
          return testRunner.runTest(test);
        })
      );
      
      return results;
    } else {
      // Run tests sequentially (default)
      this.isParallelMode = false;
      const results: TestResult[] = [];
      
      for (const test of tests) {
        const result = await this.runTest(test);
        results.push(result);
      }

      return results;
    }
  }
}
