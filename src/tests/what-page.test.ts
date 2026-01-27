export const testConfig = {
  name: 'What Page Am I On',
  payload: {
    threadId: 'thread-1',
    runId: 'run-1',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'what page am i on'
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
        value: '{"appId":"explore","timeRange":{"from":"now-15m","to":"now"},"query":{"query":"","language":"PPL"}}'
      }
    ],
    state: {},
    forwardedProps: {}
  }
};
