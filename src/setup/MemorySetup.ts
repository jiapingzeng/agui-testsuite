import { OpenSearchClient } from '../utils/OpenSearchClient';

export interface MemoryContainerResponse {
  memory_container_id: string;
  status: string;
}

export class MemorySetup {
  private client: OpenSearchClient;

  constructor(client: OpenSearchClient) {
    this.client = client;
  }

  async createMemoryContainer(name: string): Promise<string> {
    const response = await this.client.request({
      method: 'POST',
      path: '/_plugins/_ml/memory_containers/_create',
      body: {
        name,
        configuration: {
          disable_history: true
        }
      }
    });

    if (response.statusCode !== 200) {
      throw new Error(`Failed to create memory container: ${JSON.stringify(response.body)}`);
    }

    const containerId = response.body.memory_container_id;
    console.log(`✓ Memory container created: ${containerId} (${name})`);

    return containerId;
  }
}
