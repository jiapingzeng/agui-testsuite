import * as dotenv from 'dotenv';
import { AgentSetup, SetupResult as LegacySetupResult } from './setup/AgentSetup';
import { AgentRevampSetup, SetupResult as RevampSetupResult } from './setup/AgentRevampSetup';
import { AwsCredentialsHelper } from './setup/AwsCredentials';
import { TestRunner } from './utils/TestRunner';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args[0] || 'default';
const parallel = !args.includes('--sequential'); // Parallel is default, --sequential disables it
const useRevampSetup = args.includes('--revamp'); // Use revamp setup for Bedrock when enabled

// Parse specific test names (any args that don't start with --)
const specificTests = args.filter(arg => !arg.startsWith('--') && arg !== mode);

const ENV_FILE = path.join(process.cwd(), '.env');

interface CombinedSetupResult {
  openai: {
    modelId: string;
    agentId: string;
  };
  bedrock: {
    modelId?: string;
    agentId: string;
  };
  mcpConnectorId: string;
}

async function runSetup(): Promise<CombinedSetupResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error('❌ Error: OPENAI_API_KEY is required in .env file');
    process.exit(1);
  }

  const awsCredentials = await AwsCredentialsHelper.getCredentials();
  AwsCredentialsHelper.setEnvironmentVariables(awsCredentials);

  if (useRevampSetup) {
    console.log('🔄 Using revamp setup for Bedrock, legacy setup for OpenAI\n');
    
    // Run legacy setup for OpenAI
    const legacySetup = new AgentSetup({
      openaiKey,
      awsAccessKeyId: awsCredentials.accessKeyId,
      awsSecretAccessKey: awsCredentials.secretAccessKey,
      awsSessionToken: awsCredentials.sessionToken,
      mcpServerUrl: process.env.MCP_SERVER_URL,
      opensearchEndpoint: process.env.OPENSEARCH_ENDPOINT,
    });

    const legacyResult = await legacySetup.runFullSetup();

    // Run revamp setup for Bedrock
    const revampSetup = new AgentRevampSetup({
      awsAccessKeyId: awsCredentials.accessKeyId,
      awsSecretAccessKey: awsCredentials.secretAccessKey,
      awsSessionToken: awsCredentials.sessionToken,
      mcpServerUrl: process.env.MCP_SERVER_URL,
      opensearchEndpoint: process.env.OPENSEARCH_ENDPOINT,
    });

    const revampResult = await revampSetup.runFullSetup();

    // Combine results
    const result: CombinedSetupResult = {
      openai: legacyResult.openai,
      bedrock: {
        agentId: revampResult.bedrock.agentId,
      },
      mcpConnectorId: legacyResult.mcpConnectorId,
    };

    saveSetupToEnv(result);
    console.log(`\n💾 Setup saved to: ${ENV_FILE}\n`);

    return result;
  } else {
    console.log('🔧 Using legacy setup for both OpenAI and Bedrock\n');
    
    // Run legacy setup for both OpenAI and Bedrock
    const legacySetup = new AgentSetup({
      openaiKey,
      awsAccessKeyId: awsCredentials.accessKeyId,
      awsSecretAccessKey: awsCredentials.secretAccessKey,
      awsSessionToken: awsCredentials.sessionToken,
      mcpServerUrl: process.env.MCP_SERVER_URL,
      opensearchEndpoint: process.env.OPENSEARCH_ENDPOINT,
    });

    const legacyResult = await legacySetup.runFullSetup();

    // Use legacy result for both
    const result: CombinedSetupResult = {
      openai: legacyResult.openai,
      bedrock: {
        modelId: legacyResult.bedrock.modelId,
        agentId: legacyResult.bedrock.agentId,
      },
      mcpConnectorId: legacyResult.mcpConnectorId,
    };

    saveSetupToEnv(result);
    console.log(`\n💾 Setup saved to: ${ENV_FILE}\n`);

    return result;
  }
}

function saveSetupToEnv(result: CombinedSetupResult): void {
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
  
  // Only add BEDROCK_MODEL_ID if present (legacy setup)
  if (result.bedrock.modelId) {
    envContent += `BEDROCK_MODEL_ID=${result.bedrock.modelId}\n`;
  }
  
  envContent += `BEDROCK_AGENT_ID=${result.bedrock.agentId}\n`;
  envContent += `MCP_CONNECTOR_ID=${result.mcpConnectorId}\n`;
  
  fs.writeFileSync(ENV_FILE, envContent);
}

async function loadSetup(): Promise<CombinedSetupResult> {
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
      agentId: bedrockAgentId!,
    },
    mcpConnectorId: mcpConnectorId!,
  };
}

async function runTests(result: CombinedSetupResult, testMode: 'all' | 'openai' | 'bedrock', specificTests?: string[]) {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 Running Tests');
  console.log('═══════════════════════════════════════════');

  // Discover all test files
  const testsDir = path.join(__dirname, 'tests');
  let testFiles = fs.readdirSync(testsDir).filter(file => file.endsWith('.test.ts') || file.endsWith('.test.js'));

  // Filter test files if specific tests are requested
  if (specificTests && specificTests.length > 0) {
    const requestedTestNames = specificTests.map(t => t.toLowerCase());
    testFiles = testFiles.filter(file => {
      const baseName = file.replace(/\.test\.(ts|js)$/, '').toLowerCase();
      return requestedTestNames.some(requested =>
        baseName.includes(requested) || requested.includes(baseName)
      );
    });

    if (testFiles.length === 0) {
      console.error(`\n❌ No test files found matching: ${specificTests.join(', ')}`);
      console.log('\nAvailable tests:');
      const allFiles = fs.readdirSync(testsDir).filter(file => file.endsWith('.test.ts') || file.endsWith('.test.js'));
      allFiles.forEach(file => {
        console.log(`  - ${file.replace(/\.test\.(ts|js)$/, '')}`);
      });
      process.exit(1);
    }

    console.log(`\n🎯 Running specific test(s): ${specificTests.join(', ')}`);
  }

  console.log(`\nFound ${testFiles.length} test file(s)\n`);

  const runner = new TestRunner();
  const tests = [];

  // Load and prepare all test configs
  for (const testFile of testFiles) {
    const testModule = await import(`./tests/${testFile}`);
    const testConfig = testModule.testConfig;

    if (!testConfig) {
      console.warn(`⚠️  Skipping ${testFile}: no testConfig export found`);
      continue;
    }

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
  }

  if (parallel) {
    console.log('⚡ Running tests in parallel...\n');
  } else {
    console.log('📝 Running tests sequentially...\n');
  }

  const results = await runner.runMultipleTests(tests, parallel);

  // Print summary
  const { TestSummary } = await import('./utils/TestSummary');
  TestSummary.print(results);
}

async function main() {
  try {
    switch (mode) {
      case '--setup-only':
        await runSetup();
        break;

      case '--test-openai':
        const setupOpenai = await loadSetup();
        await runTests(setupOpenai, 'openai', specificTests.length > 0 ? specificTests : undefined);
        break;

      case '--test-bedrock':
        const setupBedrock = await loadSetup();
        await runTests(setupBedrock, 'bedrock', specificTests.length > 0 ? specificTests : undefined);
        break;

      case '--test-all':
        const setupAll = await loadSetup();
        await runTests(setupAll, 'all', specificTests.length > 0 ? specificTests : undefined);
        break;

      case 'default':
      default:
        // Full run: setup + test all
        const result = await runSetup();
        await runTests(result, 'all', specificTests.length > 0 ? specificTests : undefined);
        break;
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
