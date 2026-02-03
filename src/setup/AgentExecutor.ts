import * as dotenv from 'dotenv';
import { OpenSearchClient } from '../utils/OpenSearchClient';

dotenv.config();

export interface ExecuteAgentOptions {
  agentId: string;
  payload: any;
  opensearchEndpoint?: string;
}

export class AgentExecutor {
  async execute(options: ExecuteAgentOptions): Promise<any> {
    const {
      agentId,
      payload,
      opensearchEndpoint
    } = options;

    const client = new OpenSearchClient({
      endpoint: opensearchEndpoint
    });

    return client.requestStream({
      method: 'POST',
      path: `/_plugins/_ml/agents/${agentId}/_execute/stream`,
      body: payload
    });
  }
}
