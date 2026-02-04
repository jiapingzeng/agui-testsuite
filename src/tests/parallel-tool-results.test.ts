export const testConfig = {
  name: 'Parallel Tool Results - Cluster Health and PPL',
  payload: {
    threadId: 'thread-2',
    runId: 'run-2',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'use ClusterHealthTool and execute_ppl_query at the same time'
      },
      {
        id: 'fake-assistant-message',
        role: 'assistant',
        toolCalls: [
          {
            id: 'tooluse_1',
            type: 'function',
            function: {
              name: 'ClusterHealthTool',
              arguments: ''
            }
          },
          {
            id: 'tooluse_2',
            type: 'function',
            function: {
              name: 'execute_ppl_query',
              arguments: '{"query": "source = opensearch_dashboards_sample_data_logs | head 10", "description": "Retrieving first 10 records from sample logs"}'
            }
          }
        ]
      },
      {
        id: 'tool-result-tooluse_1',
        role: 'tool',
        content: '[{"text":"{\\"cluster_name\\": \\"test\\", \\"status\\": \\"green\\", \\"number_of_nodes\\": 3}"}]',
        toolCallId: 'tooluse_1'
      },
      {
        id: 'msg-2',
        role: 'tool',
        content: '{"success":true,"executed":true,"query":"source = opensearch_dashboards_sample_data_logs | head 10","message":"Query updated and executed successfully"}',
        toolCallId: 'tooluse_2'
      }
    ],
    tools: [
      {
        name: 'execute_ppl_query',
        description: 'Update the query bar with a PPL query and optionally execute it',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The PPL query to set in the query bar'
            },
            autoExecute: {
              type: 'boolean',
              description: 'Whether to automatically execute the query (default: true)'
            },
            description: {
              type: 'string',
              description: 'Optional description of what the query does'
            }
          },
          required: ['query']
        }
      }
    ],
    context: [
      {
        description: 'Explore application page context',
        value: '{"appId":"explore","timeRange":{"from":"now-15M","to":"now"},"query":{"query":"source = opensearch_dashboards_sample_data_logs | head 10","language":"PPL"}}'
      }
    ],
    state: {},
    forwardedProps: {}
  }
};
