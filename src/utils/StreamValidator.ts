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
    threadIdMismatches: number;
    runIdMismatches: number;
    messageIdInconsistencies: number;
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
   * Validate RUN_STARTED and RUN_FINISHED/RUN_ERROR events
   */
  private static validateRunEvents(events: StreamEvent[], errors: string[]): {
    runStartedCount: number;
    runFinishedCount: number;
    runErrorCount: number;
  } {
    const runStartedEvents = events.filter(e => e.type === 'RUN_STARTED');
    const runFinishedEvents = events.filter(e => e.type === 'RUN_FINISHED');
    const runErrorEvents = events.filter(e => e.type === 'RUN_ERROR');

    // Check for exactly one RUN_STARTED
    if (runStartedEvents.length === 0) {
      errors.push('Missing RUN_STARTED event');
    } else if (runStartedEvents.length > 1) {
      errors.push(`Multiple RUN_STARTED events found: ${runStartedEvents.length}`);
    }

    // Check for exactly one RUN_FINISHED or RUN_ERROR
    const totalTerminationEvents = runFinishedEvents.length + runErrorEvents.length;
    if (totalTerminationEvents === 0) {
      errors.push('Missing run termination event (RUN_FINISHED or RUN_ERROR)');
    } else if (totalTerminationEvents > 1) {
      errors.push(`Multiple run termination events found: ${runFinishedEvents.length} RUN_FINISHED + ${runErrorEvents.length} RUN_ERROR`);
    }

    return {
      runStartedCount: runStartedEvents.length,
      runFinishedCount: runFinishedEvents.length,
      runErrorCount: runErrorEvents.length,
    };
  }

  /**
   * Validate TEXT_MESSAGE_START/END pairs
   */
  private static validateMessagePairs(events: StreamEvent[], errors: string[]): number {
    const messageStarts = events.filter(e => e.type === 'TEXT_MESSAGE_START');
    const messageEnds = events.filter(e => e.type === 'TEXT_MESSAGE_END');

    if (messageStarts.length !== messageEnds.length) {
      errors.push(`Mismatched TEXT_MESSAGE_START (${messageStarts.length}) and TEXT_MESSAGE_END (${messageEnds.length})`);
    }

    return messageStarts.length;
  }

  /**
   * Validate that TEXT_MESSAGE_CONTENT events are within START/END boundaries
   */
  private static validateOrphanedContent(events: StreamEvent[], errors: string[]): number {
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

    return orphanedContent;
  }

  /**
   * Validate threadId and runId consistency with request payload
   */
  private static validateThreadAndRunIds(
    events: StreamEvent[],
    requestPayload: any,
    errors: string[]
  ): { threadIdMismatches: number; runIdMismatches: number } {
    let threadIdMismatches = 0;
    let runIdMismatches = 0;

    const expectedThreadId = requestPayload.threadId;
    const expectedRunId = requestPayload.runId;

    const runStartedEvents = events.filter(e => e.type === 'RUN_STARTED');
    const runFinishedEvents = events.filter(e => e.type === 'RUN_FINISHED');
    const runErrorEvents = events.filter(e => e.type === 'RUN_ERROR');

    // Check RUN_STARTED
    if (runStartedEvents.length > 0) {
      const runStarted = runStartedEvents[0];
      if (runStarted.threadId !== expectedThreadId) {
        threadIdMismatches++;
        errors.push(`RUN_STARTED threadId mismatch: expected "${expectedThreadId}", got "${runStarted.threadId}"`);
      }
      if (runStarted.runId !== expectedRunId) {
        runIdMismatches++;
        errors.push(`RUN_STARTED runId mismatch: expected "${expectedRunId}", got "${runStarted.runId}"`);
      }
    }

    // Check RUN_FINISHED
    if (runFinishedEvents.length > 0) {
      const runFinished = runFinishedEvents[0];
      if (runFinished.threadId !== expectedThreadId) {
        threadIdMismatches++;
        errors.push(`RUN_FINISHED threadId mismatch: expected "${expectedThreadId}", got "${runFinished.threadId}"`);
      }
      if (runFinished.runId !== expectedRunId) {
        runIdMismatches++;
        errors.push(`RUN_FINISHED runId mismatch: expected "${expectedRunId}", got "${runFinished.runId}"`);
      }
    }

    // Check RUN_ERROR
    if (runErrorEvents.length > 0) {
      const runError = runErrorEvents[0];
      if (runError.threadId !== expectedThreadId) {
        threadIdMismatches++;
        errors.push(`RUN_ERROR threadId mismatch: expected "${expectedThreadId}", got "${runError.threadId}"`);
      }
      if (runError.runId !== expectedRunId) {
        runIdMismatches++;
        errors.push(`RUN_ERROR runId mismatch: expected "${expectedRunId}", got "${runError.runId}"`);
      }
    }

    return { threadIdMismatches, runIdMismatches };
  }

  /**
   * Validate messageId consistency within TEXT_MESSAGE_START to TEXT_MESSAGE_END blocks
   */
  private static validateMessageIdConsistency(events: StreamEvent[], errors: string[]): number {
    let messageIdInconsistencies = 0;
    let currentMessageBlock: { messageId: string; startIndex: number } | null = null;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (event.type === 'TEXT_MESSAGE_START') {
        if (currentMessageBlock) {
          errors.push(`TEXT_MESSAGE_START at index ${i} without corresponding TEXT_MESSAGE_END for previous message`);
          messageIdInconsistencies++;
        }
        currentMessageBlock = {
          messageId: event.messageId || '',
          startIndex: i
        };
      } else if (event.type === 'TEXT_MESSAGE_CONTENT' || event.type === 'TEXT_MESSAGE_END') {
        if (currentMessageBlock) {
          if (event.messageId !== currentMessageBlock.messageId) {
            errors.push(`MessageId mismatch in message block starting at index ${currentMessageBlock.startIndex}: expected "${currentMessageBlock.messageId}", got "${event.messageId}" at ${event.type} (index ${i})`);
            messageIdInconsistencies++;
          }
        }

        if (event.type === 'TEXT_MESSAGE_END') {
          currentMessageBlock = null;
        }
      }
    }

    return messageIdInconsistencies;
  }

  /**
   * Validate stream events
   */
  static validate(streamContent: string, requestPayload?: any): ValidationResult {
    const events = this.parseStream(streamContent);
    const errors: string[] = [];

    // Validate run events
    const runStats = this.validateRunEvents(events, errors);

    // Validate message pairs
    const messageCount = this.validateMessagePairs(events, errors);

    // Validate orphaned content
    const orphanedContent = this.validateOrphanedContent(events, errors);

    // Validate messageId consistency
    const messageIdInconsistencies = this.validateMessageIdConsistency(events, errors);

    // Validate threadId and runId if request payload provided
    let threadIdMismatches = 0;
    let runIdMismatches = 0;
    if (requestPayload) {
      const idStats = this.validateThreadAndRunIds(events, requestPayload, errors);
      threadIdMismatches = idStats.threadIdMismatches;
      runIdMismatches = idStats.runIdMismatches;
    }

    return {
      isValid: errors.length === 0,
      errors,
      stats: {
        ...runStats,
        messageCount,
        orphanedContent,
        threadIdMismatches,
        runIdMismatches,
        messageIdInconsistencies,
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
