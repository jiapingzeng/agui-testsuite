export const testConfig = {
  name: 'Get Index Mapping',
  payload: {
    threadId: 'thread-3',
    runId: 'run-3',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'get index mapping'
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
        value: '{"appId":"explore","timeRange":{"from":"now-4M","to":"now"},"query":{"query":"","language":"PPL"},"dataset":{"dataSource":{"id":"7d03f9f5-b9c4-38d3-b888-751575bb49df","title":"dataSource","type":"data-source"},"id":"37352d60-c8f5-11f0-b318-a7e9c7dbb705","timeFieldName":"@timestamp","title":"cwl*","type":"INDEX_PATTERN"}}'
      }
    ],
    state: {},
    forwardedProps: {}
  }
};
