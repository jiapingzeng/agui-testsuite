export interface StreamEvent {
  type: string;
  timestamp: number;
  messageId?: string;
  [key: string]: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  stats: {
    runStartedCount: number;
    runFinishedCount: number;
    runErrorCount: number;
    messageCount: number;
    orphanedContent: number;
  };
}

export class StreamValidator {
  /**
   * Parse streaming response into events
   */
  static parseStream(streamContent: string): StreamEvent[] {
    const lines = streamContent.split('\n');
    const events: StreamEvent[] = [];

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.substring(6));
          events.push(data);
        } catch (e) {
          // Skip invalid JSON lines
        }
      }
    }

    return events;
  }

  /**
   * Validate stream events
   */
  static validate(streamContent: string): ValidationResult {
    const events = this.parseStream(streamContent);
    const errors: string[] = [];

    // Check for exactly one RUN_STARTED
    const runStartedEvents = events.filter(e => e.type === 'RUN_STARTED');
    if (runStartedEvents.length === 0) {
      errors.push('Missing RUN_STARTED event');
    } else if (runStartedEvents.length > 1) {
      errors.push(`Multiple RUN_STARTED events found: ${runStartedEvents.length}`);
    }

    // Check for exactly one RUN_FINISHED or RUN_ERROR
    const runFinishedEvents = events.filter(e => e.type === 'RUN_FINISHED');
    const runErrorEvents = events.filter(e => e.type === 'RUN_ERROR');
    const totalTerminationEvents = runFinishedEvents.length + runErrorEvents.length;
    
    if (totalTerminationEvents === 0) {
      errors.push('Missing run termination event (RUN_FINISHED or RUN_ERROR)');
    } else if (totalTerminationEvents > 1) {
      errors.push(`Multiple run termination events found: ${runFinishedEvents.length} RUN_FINISHED + ${runErrorEvents.length} RUN_ERROR`);
    }

    // Validate message pairs (START/END)
    const messageStarts = events.filter(e => e.type === 'TEXT_MESSAGE_START');
    const messageEnds = events.filter(e => e.type === 'TEXT_MESSAGE_END');
    const messageCount = messageStarts.length;

    if (messageStarts.length !== messageEnds.length) {
      errors.push(`Mismatched TEXT_MESSAGE_START (${messageStarts.length}) and TEXT_MESSAGE_END (${messageEnds.length})`);
    }

    // Check that all TEXT_MESSAGE_CONTENT are within START/END pairs
    const contentEvents = events.filter(e => e.type === 'TEXT_MESSAGE_CONTENT');
    let orphanedContent = 0;
    let currentMessageId: string | null = null;

    for (const event of events) {
      if (event.type === 'TEXT_MESSAGE_START') {
        currentMessageId = event.messageId || null;
      } else if (event.type === 'TEXT_MESSAGE_END') {
        currentMessageId = null;
      } else if (event.type === 'TEXT_MESSAGE_CONTENT') {
        if (!currentMessageId || event.messageId !== currentMessageId) {
          orphanedContent++;
        }
      }
    }

    if (orphanedContent > 0) {
      errors.push(`Found ${orphanedContent} TEXT_MESSAGE_CONTENT events outside of message boundaries`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      stats: {
        runStartedCount: runStartedEvents.length,
        runFinishedCount: runFinishedEvents.length,
        runErrorCount: runErrorEvents.length,
        messageCount,
        orphanedContent,
      },
    };
  }

  /**
   * Get detailed statistics about the stream
   */
  static getStats(streamContent: string): any {
    const events = this.parseStream(streamContent);

    const toolCalls = events.filter(e => e.type === 'TOOL_CALL_START');
    const toolResults = events.filter(e => e.type === 'TOOL_CALL_RESULT');
    const messageStarts = events.filter(e => e.type === 'TEXT_MESSAGE_START');
    const messageChunks = events.filter(e => e.type === 'TEXT_MESSAGE_CONTENT');

    return {
      totalEvents: events.length,
      runEvents: events.filter(e => e.type.startsWith('RUN_')).length,
      messageCount: messageStarts.length,
      messageChunks: messageChunks.length,
      toolCallsCount: toolCalls.length,
      toolResultsCount: toolResults.length,
    };
  }
}
