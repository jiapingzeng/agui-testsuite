export const testConfig = {
  name: 'Summarize Conversation',
  payload: {
    threadId: 'thread-5',
    runId: 'run-5',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'list indices'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: '{"choices":[{"finish_reason":"tool_calls","message":{"tool_calls":[{"type":"function","id":"call_2NYyQyWXeLulTvknz0SYeo1w","function":{"arguments":"{}","name":"RetrieveIndexMetaTool"}}]}}]}row,health,status,index,uuid,pri(number of primary shards),rep(number of replica shards),docs.count(number of available documents),docs.deleted(number of deleted documents),store.size(store size of primary and replica shards),pri.store.size(store size of primary shards)\n1,green,open,.plugins-ml-memory-message,wkLB7prPRnafm__6JL9hsQ,1,0,1,0,4.7kb,4.7kb\n2,green,open,.plugins-ml-model-group,NgU1-Lb9SH-TNS8eEDJyKQ,1,0,1,1,12.5kb,12.5kb\n3,green,open,.plugins-ml-memory-meta,peWpTX7yR9m2KZChHFPtLw,1,0,1,1,9.2kb,9.2kb\n4,green,open,.plugins-ml-config,qqEJAEQRR32dF2MOA9MsZA,1,0,1,0,4.5kb,4.5kb\n5,green,open,.plugins-ml-model,teaEE47lQ3u7Iz_nKc4eDw,1,0,1,5,164.6kb,164.6kb\n6,green,open,.plugins-ml-agent,sTyxyzyORgCfFMlDGGuszQ,1,0,1,0,18.4kb,18.4kb\n7,green,open,.plugins-ml-task,vkc3B7P2RxW_-TYZNfsJlg,1,0,3,4,50.4kb,50.4kb\n8,green,open,.kibana_2,yNCYeL4gRkqW2Hjpfm7sOQ,1,0,2,0,10.4kb,10.4kb\n9,green,open,.kibana_1,R325Aqy0TTa3XvEJX_VDfQ,1,0,1,0,5.2kb,5.2kb\n10,green,open,.tasks,F8kO7lz6T6ekAqq2L9b2HA,1,0,1,0,7.3kb,7.3kb\nThe available indices in the application context are:\n1. .plugins-ml-memory-message\n2. .plugins-ml-model-group\n3. .plugins-ml-memory-meta\n4. .plugins-ml-config\n5. .plugins-ml-model\n6. .plugins-ml-agent\n7. .plugins-ml-task\n8. .kibana_2\n9. .kibana_1\n10. .tasks'
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'execute ppl query "test"'
      },
      {
        id: 'msg-4',
        role: 'assistant',
        toolCalls: [
          {
            id: 'call_41KcQzxXHpwiweUTABbYXlWf',
            type: 'function',
            function: {
              name: 'execute_ppl_query',
              arguments: '{"query":"test","description":"Execute PPL query"}'
            }
          }
        ]
      },
      {
        id: 'msg-5',
        role: 'tool',
        content: '{"success":true,"executed":true,"query":"test","message":"Query updated and executed"}',
        toolCallId: 'call_41KcQzxXHpwiweUTABbYXlWf'
      },
      {
        id: 'msg-6',
        role: 'assistant',
        content: 'The PPL query "test" has been successfully executed. If you have any more questions or need further assistance, feel free to ask!'
      },
      {
        id: 'msg-7',
        role: 'user',
        content: 'summarize our interactions, do not use any tools'
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
      },
      {
        name: 'graph_timeseries_data',
        description: 'Create a timeseries graph visualization from provided data',
        parameters: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Timeseries data in Prometheus format or simple array format'
            },
            query: {
              type: 'string',
              description: 'Optional query used to generate this data'
            },
            title: {
              type: 'string',
              description: 'Optional title for the graph'
            }
          },
          required: ['data']
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
