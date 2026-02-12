export const testConfig = {
  name: 'Chat history',
  payload: {
    threadId: 'thread-image-1',
    runId: 'run-image-1',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'what have I asked you previously'
      }
    ],
    tools: [],
    context: [],
    state: {},
    forwardedProps: {}
  }
};
