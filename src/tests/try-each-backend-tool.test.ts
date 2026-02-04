export const testConfig = {
  skip: true, // will take a long time to run and possibly throttle
  name: 'Try Each Backend Tool',
  payload: {
    threadId: 'thread-1770186006946-il6z82r7v',
    runId: 'run-1770186115198-cpmg2cdjf',
    messages: [
      {
        id: 'msg-1770186032687-xspwffz58',
        role: 'user',
        content: 'execute ppl query',
        rawMessage: 'execute ppl query'
      },
      {
        id: 'msg_11455388457290',
        role: 'assistant',
        content: 'I\'d be happy to help you execute a PPL query! However, I need you to provide the actual PPL (Piped Processing Language) query that you\'d like me to execute.\n\nPlease share the PPL query you want to run. For example:\n- `source=logs | where status="error" | stats count() by host`\n- `source=my-index* | fields timestamp, message | head 10`\n\nOnce you provide the query, I\'ll execute it for you.'
      },
      {
        id: 'msg-1770186042034-u85vu1gxp',
        role: 'user',
        content: 'execute query \'test\'',
        rawMessage: 'execute query \'test\''
      },
      {
        id: 'fake-assistant-message-1770186044085',
        role: 'assistant',
        toolCalls: [
          {
            id: 'tooluse_6uZVuvtjnUaDyhwwnvC9xQ',
            type: 'function',
            function: {
              name: 'execute_ppl_query',
              arguments: '{"query": "test"}'
            }
          }
        ]
      },
      {
        id: 'msg-1770186045495-idjjxxlvt',
        role: 'tool',
        content: '{"success":false,"executed":false,"query":"test","message":"Query execution failed: Unknown Error","error":"undefined: Unknown Error"}',
        toolCallId: 'tooluse_6uZVuvtjnUaDyhwwnvC9xQ'
      },
      {
        id: 'msg_11467869946626',
        role: 'assistant',
        content: 'The query \'test\' failed to execute because it\'s not a valid PPL query. PPL queries need to follow a specific syntax, starting with a `source` command to specify which index to query.\n\nHere\'s the correct format for a PPL query:\n```\nsource=<index_name> | <commands>\n```\n\nFor example:\n- `source=logs | head 10` - Get the first 10 documents from the logs index\n- `source=my-index | where status="error"` - Filter documents where status is "error"\n- `source=orders | stats count() by category` - Count documents grouped by category\n\nWould you like me to help you construct a proper PPL query? Please let me know which index you want to query and what you\'re trying to find.'
      },
      {
        id: 'msg-1770186057955-5x2suos0f',
        role: 'user',
        content: 'list indices',
        rawMessage: 'list indices'
      },
      {
        id: 'fake-assistant-message-1770186059888',
        role: 'assistant',
        toolCalls: [
          {
            id: 'tooluse_B5Ia7Jfm0JqWpL6Dgxmn6k',
            type: 'function',
            function: {
              name: 'ListIndexTool',
              arguments: '{"include_detail": false}'
            }
          }
        ]
      },
      {
        id: 'tool-result-tooluse_B5Ia7Jfm0JqWpL6Dgxmn6k',
        role: 'tool',
        content: 'Indices:\n.ql-datasources\n.opendistro_security\n.plugins-ml-config\n.plugins-ml-model-group\n.plugins-ml-memory-meta\n.plugins-ml-memory-message\n.plugins-ml-agent\n.plugins-ml-task\n.plugins-ml-model\n.opensearch-observability\n.kibana_1\n.kibana_2\nopensearch_dashboards_sample_data_flights\nopensearch_dashboards_sample_data_logs\nopensearch_dashboards_sample_data_ecommerce\ncwl-2025.09.16\ncwl-2025.11.09\nss4o_logs-nginx-prod\nss4o_logs-haproxy-prod\nss4o_logs-apache-prod\nss4o_logs-k8s-prod\nss4o_metrics-otel-v1\nss4o_traces-traces-namespace\notel-v1-apm-span-000001\njaeger-span-2025-11-13\njaeger-service-2025-11-13\ntest_index\nphoenix_demo_index\npeople\ntmdb\nmy_test_data',
        toolCallId: 'tooluse_B5Ia7Jfm0JqWpL6Dgxmn6k'
      },
      {
        id: 'msg_11483067684702',
        role: 'assistant',
        content: 'Here are all the indices in your OpenSearch cluster:\n\n**System/Plugin Indices:**\n- `.ql-datasources`, `.opendistro_security`, `.plugins-ml-*`, `.plugins-flow-framework-*`, `.opensearch-observability`, `.kibana_1`, `.kibana_2`\n\n**Sample Data Indices:**\n- `opensearch_dashboards_sample_data_flights`\n- `opensearch_dashboards_sample_data_logs`\n- `opensearch_dashboards_sample_data_ecommerce`\n\n**Log Indices:**\n- `cwl-*` (dated from 2025.09.16 to 2025.11.09)\n- `ss4o_logs-*` (various log types: nginx, haproxy, apache, k8s, AWS services, etc.)\n\n**Metrics & Traces:**\n- `ss4o_metrics-otel-*`\n- `ss4o_traces-traces-namespace`\n- `otel-v1-apm-span*`\n- `jaeger-span-2025-11-13`, `jaeger-service-2025-11-13`\n\n**Other Indices:**\n- `test_index`, `phoenix_demo_index`, `people`, `tmdb`, `my_test_data`\n\nWould you like to explore any specific index or execute a PPL query on one of them?'
      },
      {
        id: 'msg-1770186115197-ybl5k4wwx',
        role: 'user',
        content: 'try each of your backend tools and provide a final summary'
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
        value: '{"appId":"explore","timeRange":{"from":"now-15m","to":"now"},"query":{"query":"test","language":"PPL"},"dataset":{"dataSource":{"id":"dd4dae10-0190-11f1-afe0-69950ca2ea11","title":"localhost","type":"OpenSearch"},"id":"w8Pd3m_dd4dae10-0190-11f1-afe0-69950ca2ea11_90943e30-9a47-11e8-b64d-95841ca0b247","timeFieldName":"timestamp","title":"opensearch_dashboards_sample_data_logs","type":"INDEX_PATTERN"}}'
      }
    ],
    state: {},
    forwardedProps: {}
  }
};
