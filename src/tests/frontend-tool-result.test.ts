export const testConfig = {
  name: 'Frontend Tool Result',
  payload: {
    threadId: 'thread-1761299262323-66ekfq52m',
    runId: 'run-1761299273064-qjycuyoo5',
    messages: [
      {
        id: 'msg-1761299270344-wfxawmjgw',
        role: 'user',
        content: 'execute ppl \'test\''
      },
      {
        id: 'msg_1761299271843',
        role: 'assistant',
        toolCalls: [
          {
            id: 'tooluse_gdZkro87QqW01isjNiDEqg',
            type: 'function',
            function: {
              name: 'execute_ppl_query',
              arguments: '{"query":"test"}'
            }
          }
        ],
        content: 'I\'ll help you execute a PPL query with the term \'test\'. Let me do that for you.'
      },
      {
        id: 'msg-1761299273064-6sg6hlkop',
        role: 'tool',
        content: '{"success":true,"executed":true,"query":"test","message":"Query updated and executed"}',
        toolCallId: 'tooluse_gdZkro87QqW01isjNiDEqg'
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
        value: '{"appId":"explore","timeRange":{"from":"now-15m","to":"now"},"query":{"query":"test","language":"PPL"}}'
      }
    ],
    state: {},
    forwardedProps: {}
  }
};
