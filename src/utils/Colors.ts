// ANSI color codes for console output
export class Colors {
  // Helper methods
  static error(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
  }
  
  static success(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
  }
  
  static warning(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
  }
  
  static info(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
  }
  
  static bold(text: string): string {
    return `\x1b[1m${text}\x1b[0m`;
  }
  
  static cyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
  }
}
