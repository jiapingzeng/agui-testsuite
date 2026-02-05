export const testConfig = {
  name: 'List Indices',
  payload: {
    threadId: 'thread-1',
    runId: 'run-1',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'list indices'
      }
    ],
    tools: [],
    context: [],
    state: {},
    forwardedProps: {}
  }
};
