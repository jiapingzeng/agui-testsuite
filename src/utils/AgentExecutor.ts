import * as dotenv from 'dotenv';

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

    const endpoint = opensearchEndpoint || process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const url = `${endpoint}/_plugins/_ml/agents/${agentId}/_execute/stream`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    // Handle streaming response
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullResponse += decoder.decode(value, { stream: true });
    }

    return {
      statusCode: response.status,
      body: fullResponse,
    };
  }
}
