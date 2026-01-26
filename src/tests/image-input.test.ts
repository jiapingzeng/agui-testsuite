export const testConfig = {
  name: 'Image Input Test',
  payload: {
    threadId: 'thread-image-1',
    runId: 'run-image-1',
    messages: [
      {
        id: 'msg-image-1',
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe what you see in this image'
          },
          {
            type: 'binary',
            mimeType: 'image/png',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            filename: 'sample.png'
          }
        ]
      }
    ],
    tools: [],
    context: [],
    state: {},
    forwardedProps: {}
  }
};
