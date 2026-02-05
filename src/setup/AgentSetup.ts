import * as dotenv from 'dotenv';
import { OpenSearchClient } from '../utils/OpenSearchClient';

dotenv.config();

export interface SetupConfig {
  openaiKey: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken: string;
  mcpServerUrl?: string;
  opensearchEndpoint?: string;
}

export interface SetupResult {
  openai: {
    modelId: string;
    agentId: string;
  };
  bedrock: {
    modelId: string;
    agentId: string;
  };
  mcpConnectorId: string;
}

export class AgentSetup {
  private client: OpenSearchClient;
  private config: SetupConfig;

  constructor(config: SetupConfig) {
    this.client = new OpenSearchClient({
      endpoint: config.opensearchEndpoint
    });
    this.config = config;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    return this.client.request({ method, path, body });
  }

  async runFullSetup(): Promise<SetupResult> {
    console.log('\n🚀 Starting OpenSearch AI Agent Setup...\n');

    try {
      await this.enableFeatures();
      
      // Register OpenAI model and agent
      const openaiModelId = await this.registerOpenAIModel();
      const bedrockModelId = await this.registerBedrockModel();
      const mcpConnectorId = await this.createMCPConnector();
      const openaiAgentId = await this.registerAgent(openaiModelId, 'openai', mcpConnectorId);
      const bedrockAgentId = await this.registerAgent(bedrockModelId, 'bedrock', mcpConnectorId);

      const result: SetupResult = {
        openai: {
          modelId: openaiModelId,
          agentId: openaiAgentId,
        },
        bedrock: {
          modelId: bedrockModelId,
          agentId: bedrockAgentId,
        },
        mcpConnectorId,
      };

      console.log('\n✅ Setup completed successfully!');
      console.log('═══════════════════════════════════════════');
      console.log(`OpenAI Model ID:  ${result.openai.modelId}`);
      console.log(`OpenAI Agent ID:  ${result.openai.agentId}`);
      console.log(`Bedrock Model ID: ${result.bedrock.modelId}`);
      console.log(`Bedrock Agent ID: ${result.bedrock.agentId}`);
      console.log(`MCP Connector:    ${result.mcpConnectorId}`);
      console.log('═══════════════════════════════════════════\n');

      return result;
    } catch (error) {
      console.error('\n❌ Setup failed:', error);
      throw error;
    }
  }

  async enableFeatures(): Promise<void> {
    console.log('▶ Step 1: Enabling feature flags...');

    const mcpUrl = this.config.mcpServerUrl || process.env.MCP_SERVER_URL || 'http://localhost:3030';

    const response = await this.request('PUT', '/_cluster/settings', {
      persistent: {
        'plugins.ml_commons.trusted_connector_endpoints_regex': [
          mcpUrl,
          '^https://bedrock-runtime\\..*[a-z0-9-]\\.amazonaws\\.com/.*$',
          '^https://api\\.openai\\.com/.*$'
        ],
        'plugins.ml_commons.stream_enabled': true,
        'plugins.ml_commons.mcp_connector_enabled': true,
        'plugins.ml_commons.ag_ui_enabled': true,
        'plugins.ml_commons.unified_agent_api_enabled': true
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to enable features: ${JSON.stringify(response.body)}`);
    }

    console.log('✓ Feature flags enabled\n');
  }

  async registerOpenAIModel(): Promise<string> {
    console.log('▶ Step 2: Registering OpenAI model...');

    const response = await this.request('POST', '/_plugins/_ml/models/_register?deploy=true', {
      name: 'openai gpt 4o',
      function_name: 'remote',
      description: 'openai model',
      connector: {
        name: 'OpenAI Chat Connector',
        description: 'The connector to public OpenAI model service for GPT 4o',
        version: 1,
        protocol: 'http',
        parameters: {
          endpoint: 'api.openai.com',
          model: 'gpt-4o'
        },
        credential: {
          openAI_key: this.config.openaiKey
        },
        actions: [{
          action_type: 'predict',
          method: 'POST',
          url: 'https://${parameters.endpoint}/v1/chat/completions',
          headers: {
            Authorization: 'Bearer ${credential.openAI_key}'
          },
          request_body: '{ "model": "${parameters.model}", "messages": [{"role":"developer","content":"${parameters.system_prompt}"},${parameters._chat_history:-}{"role":"user","content":"${parameters.prompt}"}${parameters._interactions:-}]${parameters.tool_configs:-} }'
        }]
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to register model: ${JSON.stringify(response.body)}`);
    }

    const modelId = response.body.model_id;
    console.log(`✓ Model registered: ${modelId}\n`);

    await this.waitForModelDeployment(modelId);
    return modelId;
  }

  private async waitForModelDeployment(modelId: string, maxAttempts: number = 30): Promise<void> {
    console.log('  Waiting for model deployment...');

    for (let i = 0; i < maxAttempts; i++) {
      const response = await this.request('GET', `/_plugins/_ml/models/${modelId}`);

      if (response.body.model_state === 'DEPLOYED') {
        console.log('  ✓ Model deployed successfully');
        return;
      }

      if (response.body.model_state === 'DEPLOY_FAILED') {
        throw new Error('Model deployment failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Model deployment timeout');
  }

  async createMCPConnector(): Promise<string> {
    console.log('▶ Step 3: Creating MCP connector...');

    const mcpUrl = this.config.mcpServerUrl || 'http://localhost:3030';

    const response = await this.request('POST', '/_plugins/_ml/connectors/_create', {
      name: 'OpenSearch MCP Server',
      description: 'OpenSearch MCP Server',
      version: 1,
      protocol: 'mcp_streamable_http',
      url: mcpUrl,
      parameters: {
        endpoint: '/mcp/'
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to create MCP connector: ${JSON.stringify(response.body)}`);
    }

    const connectorId = response.body.connector_id;
    console.log(`✓ MCP connector created: ${connectorId}\n`);

    return connectorId;
  }

  async registerBedrockModel(): Promise<string> {
    console.log('▶ Registering Bedrock model...');

    const response = await this.request('POST', '/_plugins/_ml/models/_register?deploy=true', {
      name: 'Claude 3.7',
      function_name: 'remote',
      description: 'bedrock model',
      connector: {
        name: 'Bedrock Converse Connector',
        description: 'Bedrock Converse Connector',
        version: 1,
        protocol: 'aws_sigv4',
        parameters: {
          region: 'us-east-1',
          model: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
          service_name: 'bedrock'
        },
        credential: {
          access_key: this.config.awsAccessKeyId,
          secret_key: this.config.awsSecretAccessKey,
          session_token: this.config.awsSessionToken
        },
        actions: [{
          action_type: 'predict',
          method: 'POST',
          url: 'https://bedrock-runtime.${parameters.region}.amazonaws.com/model/${parameters.model}/converse',
          request_body: '{"messages": [${parameters._chat_history:-}{"role":"user","content":[{"text":"${parameters.prompt}"}]}${parameters._interactions:-}]${parameters.tool_configs:-}}'
        }]
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to register Bedrock model: ${JSON.stringify(response.body)}`);
    }

    const modelId = response.body.model_id;
    console.log(`✓ Bedrock model registered: ${modelId}\n`);

    await this.waitForModelDeployment(modelId);
    return modelId;
  }

  async registerAgent(modelId: string, modelType: 'openai' | 'bedrock', mcpConnectorId: string): Promise<string> {
    console.log(`▶ Registering AG-UI agent (${modelType})...`);

    const response = await this.request('POST', '/_plugins/_ml/agents/_register', {
      name: `AG-UI chat agent (${modelType})`,
      type: 'AG_UI',
      description: `this is a test agent using ${modelType}`,
      llm: {
        model_id: modelId,
        parameters: {
          max_iteration: 50,
          system_prompt: 'You are a helpful assistant and an expert in OpenSearch. You are currently in OpenSearch Dashboards and have access to both frontend and backend tools. These are frontend tools: [${parameters.agui_tool_names}] and these are backend tools: [${parameters.backend_tool_names}]. Use frontend tools if you need to update UI, otherwise use backend tools for data access. Use one tool at a time. You have access to the entire conversation between you and the user and current frontend context; take context into consideration and provide a concise answer to the lastest user question. When using ListIndexTool, use include_details false when the input is an index pattern or wildcard. When using IndexMappingTool, try not to use index patterns or wildcards as input. Instead, you can first list indices with include_details false to understand what indices are included in the pattern, then get index mapping of specific indices. When using SearchIndexTool, use pagination where possible so that the result is not too large.',
          prompt: 'Context:${parameters.context}\nQuestion:${parameters.question}'
        }
      },
      memory: {
        type: 'conversation_index'
      },
      parameters: {
        _llm_interface: modelType === 'openai' ? 'openai/v1/chat/completions' : 'bedrock/converse/claude',
        mcp_connectors: [
          {
            mcp_connector_id: mcpConnectorId
          }
        ]
      },
      tools: []
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to register agent: ${JSON.stringify(response.body)}`);
    }

    const agentId = response.body.agent_id;
    console.log(`✓ Agent registered: ${agentId}\n`);

    return agentId;
  }

}
