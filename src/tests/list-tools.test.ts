export const testConfig = {
  name: 'Execute Agent - List Tools',
  payload: {
    threadId: 'thread-1',
    runId: 'run-1',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'what tools do you have'
      }
    ],
    tools: [],
    context: [],
    state: {},
    forwardedProps: {}
  }
};
