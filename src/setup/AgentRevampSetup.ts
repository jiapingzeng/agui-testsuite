import * as dotenv from 'dotenv';

dotenv.config();

export interface SetupConfig {
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsSessionToken: string;
  mcpServerUrl?: string;
  opensearchEndpoint?: string;
}

export interface SetupResult {
  bedrock: {
    agentId: string;
  };
  mcpConnectorId: string;
}

export class AgentRevampSetup {
  private endpoint: string;
  private config: SetupConfig;

  constructor(config: SetupConfig) {
    this.endpoint = config.opensearchEndpoint || process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200';
    this.config = config;
  }

  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.endpoint}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      statusCode: response.status,
      body: data,
    };
  }

  async runFullSetup(): Promise<SetupResult> {
    console.log('\n🚀 Starting OpenSearch AI Agent Setup (Revamp - Bedrock only)...\n');

    try {
      await this.enableFeatures();
      
      const mcpConnectorId = await this.createMCPConnector();
      const bedrockAgentId = await this.registerBedrockAgent(mcpConnectorId);

      const result: SetupResult = {
        bedrock: {
          agentId: bedrockAgentId,
        },
        mcpConnectorId,
      };

      console.log('\n✅ Revamp setup completed successfully!');
      console.log('═══════════════════════════════════════════');
      console.log(`Bedrock Agent ID: ${result.bedrock.agentId}`);
      console.log(`MCP Connector:    ${result.mcpConnectorId}`);
      console.log('═══════════════════════════════════════════\n');

      return result;
    } catch (error) {
      console.error('\n❌ Revamp setup failed:', error);
      throw error;
    }
  }

  async enableFeatures(): Promise<void> {
    console.log('▶ Step 1: Enabling feature flags...');

    const response = await this.request('PUT', '/_cluster/settings', {
      persistent: {
        'plugins.ml_commons.trusted_connector_endpoints_regex': [
          'http://localhost:3030',
          '^https://bedrock-runtime\\..*[a-z0-9-]\\.amazonaws\\.com/.*$',
          '^https://api\\.openai\\.com/.*$'
        ],
        'plugins.ml_commons.stream_enabled': true,
        'plugins.ml_commons.mcp_connector_enabled': true,
        'plugins.ml_commons.ag_ui_enabled': true,
        'logger.org.opensearch.ml': 'DEBUG'
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to enable features: ${JSON.stringify(response.body)}`);
    }

    console.log('✓ Feature flags enabled\n');
  }

  async createMCPConnector(): Promise<string> {
    console.log('▶ Step 2: Creating MCP connector...');

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

  async registerBedrockAgent(mcpConnectorId: string): Promise<string> {
    console.log('▶ Step 3: Registering AG-UI agent with Bedrock model...');

    const response = await this.request('POST', '/_plugins/_ml/agents/_register', {
      name: 'AG-UI chat agent (Bedrock Revamp)',
      type: 'AG_UI',
      description: 'this is a test agent using Bedrock with embedded model',
      model: {
        model_id: 'us.anthropic.claude-sonnet-4-5-20250929-v1:0',
        model_provider: 'bedrock/converse',
        credential: {
          access_key: this.config.awsAccessKeyId,
          secret_key: this.config.awsSecretAccessKey,
          session_token: this.config.awsSessionToken
        },
        model_parameters: {
          system_prompt: 'You are a helpful assistant and an expert in OpenSearch. You are currently in OpenSearch Dashboards and have access to both frontend and backend tools. These are frontend tools: [${parameters.agui_tool_names}] and these are backend tools: [${parameters.backend_tool_names}]. Use frontend tools if you need to update UI, otherwise use backend tools for data access. Use one tool at a time. You have access to the entire conversation between you and the user and current frontend context; take context into consideration and provide a concise answer to the lastest user question. When using ListIndexTool, use include_details false when the input is an index pattern or wildcard. When using IndexMappingTool, try not to use index patterns or wildcards as input. Instead, you can first list indices with include_details false to understand what indices are included in the pattern, then get index mapping of specific indices. When using SearchIndexTool, use pagination where possible so that the result is not too large.'
        }
      },
      parameters: {
        max_iteration: '50',
        mcp_connectors: [
          {
            mcp_connector_id: mcpConnectorId
          }
        ]
      },
      tools: [],
      memory: {
        type: 'conversation_index'
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to register Bedrock agent: ${JSON.stringify(response.body)}`);
    }

    const agentId = response.body.agent_id;
    console.log(`✓ Bedrock agent registered: ${agentId}\n`);

    return agentId;
  }
}
