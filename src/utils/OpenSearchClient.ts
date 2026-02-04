import * as dotenv from 'dotenv';

dotenv.config();

export interface OpenSearchClientConfig {
  endpoint?: string;
  rejectUnauthorized?: boolean;
}

export interface RequestOptions {
  method: string;
  path: string;
  body?: any;
}

export interface OpenSearchResponse {
  statusCode: number;
  body: any;
}

export class OpenSearchClient {
  private endpoint: string;

  constructor(config?: OpenSearchClientConfig) {
    this.endpoint = config?.endpoint || process.env.OPENSEARCH_ENDPOINT || 'http://localhost:9200';
    
    // Disable SSL verification for test environments with self-signed certificates
    const rejectUnauthorized = config?.rejectUnauthorized !== undefined 
      ? config.rejectUnauthorized 
      : false;
    
    if (!rejectUnauthorized) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }

  /**
   * Build headers for OpenSearch requests, including basic auth if configured
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add basic auth if credentials are provided
    const username = process.env.OPENSEARCH_USERNAME;
    const password = process.env.OPENSEARCH_PASSWORD;
    if (username && password) {
      const credentials = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  /**
   * Make a request to OpenSearch and return the parsed response
   */
  async request(options: RequestOptions): Promise<OpenSearchResponse> {
    const { method, path, body } = options;
    const url = `${this.endpoint}${path}`;
    const headers = this.buildHeaders();

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    return {
      statusCode: response.status,
      body: data,
    };
  }

  /**
   * Make a streaming request to OpenSearch and return the full stream content
   */
  async requestStream(options: RequestOptions): Promise<OpenSearchResponse> {
    const { method, path, body } = options;
    const url = `${this.endpoint}${path}`;
    const headers = this.buildHeaders();

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

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

  /**
   * Get the configured endpoint
   */
  getEndpoint(): string {
    return this.endpoint;
  }
}
