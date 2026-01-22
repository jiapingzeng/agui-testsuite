import * as dotenv from 'dotenv';
import { AgentSetup, SetupResult } from './utils/AgentSetup';
import { AwsCredentialsHelper } from './utils/AwsCredentials';
import { TestRunner } from './utils/TestRunner';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'default';

const ENV_FILE = path.join(process.cwd(), '.env');

async function runSetup(): Promise<SetupResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('❌ Error: OPENAI_API_KEY is required in .env file');
    process.exit(1);
  }

  const awsAccount = process.env.AWS_ACCOUNT;
  if (!awsAccount) {
    console.error('❌ Error: AWS_ACCOUNT is required in .env file');
    process.exit(1);
  }

  const awsCredentials = await AwsCredentialsHelper.getCredentials(awsAccount);
  AwsCredentialsHelper.setEnvironmentVariables(awsCredentials);

  const setup = new AgentSetup({
    openaiKey,
    awsAccessKeyId: awsCredentials.accessKeyId,
    awsSecretAccessKey: awsCredentials.secretAccessKey,
    awsSessionToken: awsCredentials.sessionToken,
    mcpServerUrl: process.env.MCP_SERVER_URL,
    opensearchEndpoint: process.env.OPENSEARCH_ENDPOINT,
  });

  const result = await setup.runFullSetup();

  saveSetupToEnv(result);
  console.log(`\n💾 Setup saved to: ${ENV_FILE}\n`);

  return result;
}

function saveSetupToEnv(result: SetupResult): void {
  let envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  
  // Remove old agent IDs if they exist
  envContent = envContent.replace(/^OPENAI_MODEL_ID=.*$/m, '');
  envContent = envContent.replace(/^OPENAI_AGENT_ID=.*$/m, '');
  envContent = envContent.replace(/^BEDROCK_MODEL_ID=.*$/m, '');
  envContent = envContent.replace(/^BEDROCK_AGENT_ID=.*$/m, '');
  envContent = envContent.replace(/^MCP_CONNECTOR_ID=.*$/m, '');
  envContent = envContent.replace(/\n\n+/g, '\n\n');
  
  // Append new agent IDs
  envContent += `OPENAI_MODEL_ID=${result.openai.modelId}\n`;
  envContent += `OPENAI_AGENT_ID=${result.openai.agentId}\n`;
  envContent += `BEDROCK_MODEL_ID=${result.bedrock.modelId}\n`;
  envContent += `BEDROCK_AGENT_ID=${result.bedrock.agentId}\n`;
  envContent += `MCP_CONNECTOR_ID=${result.mcpConnectorId}\n`;
  
  fs.writeFileSync(ENV_FILE, envContent);
}

async function loadSetup(): Promise<SetupResult> {
  dotenv.config(); // Reload .env
  
  const openaiModelId = process.env.OPENAI_MODEL_ID;
  const openaiAgentId = process.env.OPENAI_AGENT_ID;
  const bedrockModelId = process.env.BEDROCK_MODEL_ID;
  const bedrockAgentId = process.env.BEDROCK_AGENT_ID;
  const mcpConnectorId = process.env.MCP_CONNECTOR_ID;

  if (!openaiAgentId || !bedrockAgentId || !mcpConnectorId) {
    console.error('❌ Error: No setup found in .env. Run "npm run setup" first.');
    process.exit(1);
  }

  return {
    openai: {
      modelId: openaiModelId!,
      agentId: openaiAgentId!,
    },
    bedrock: {
      modelId: bedrockModelId!,
      agentId: bedrockAgentId!,
    },
    mcpConnectorId: mcpConnectorId!,
  };
}

async function runTests(result: SetupResult, testMode: 'all' | 'openai' | 'bedrock') {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 Running Tests');
  console.log('═══════════════════════════════════════════');

  const { testConfig } = await import('./tests/list-indices.test');
  const runner = new TestRunner();

  const tests = [];

  if (testMode === 'all' || testMode === 'openai') {
    tests.push({
      name: testConfig.name,
      agentId: result.openai.agentId,
      modelType: 'openai' as const,
      payload: testConfig.payload,
    });
  }

  if (testMode === 'all' || testMode === 'bedrock') {
    tests.push({
      name: testConfig.name,
      agentId: result.bedrock.agentId,
      modelType: 'bedrock' as const,
      payload: testConfig.payload,
    });
  }

  const results = await runner.runMultipleTests(tests);

  // Print summary
  console.log('\n═══════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════');
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✓ Passed: ${passedTests}`);
  console.log(`✗ Failed: ${failedTests}`);
  console.log(`⏱ Total Duration: ${totalDuration}ms`);
  console.log('═══════════════════════════════════════════\n');

  if (failedTests > 0) {
    console.error('Some tests failed');
    process.exit(1);
  }
}

async function main() {
  try {
    switch (mode) {
      case '--setup-only':
        await runSetup();
        break;

      case '--test-openai':
        const setupOpenai = await loadSetup();
        await runTests(setupOpenai, 'openai');
        break;

      case '--test-bedrock':
        const setupBedrock = await loadSetup();
        await runTests(setupBedrock, 'bedrock');
        break;

      case '--test-all':
        const setupAll = await loadSetup();
        await runTests(setupAll, 'all');
        break;

      case 'default':
      default:
        // Full run: setup + test all
        const result = await runSetup();
        await runTests(result, 'all');
        break;
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
