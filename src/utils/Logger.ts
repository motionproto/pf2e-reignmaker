/**
 * Simple custom logger with configurable log levels
 * Default level is INFO - only shows important state changes
 */

export enum LogLevel {
  ERROR = 0,   // Always shown - critical failures
  WARN = 1,    // Warnings and potential issues
  INFO = 2,    // Important state changes (Kingdom Actor updates, turn progression)
  DEBUG = 3    // Verbose phase/service/helper logs (hidden by default)
}

class Logger {
  private level: LogLevel = LogLevel.INFO;

  /**
   * Set the current log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
    console.log(`[Logger] Log level set to: ${LogLevel[level]}`);
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * ERROR level - always shown
   * Use for critical failures that need immediate attention
   */
  error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * WARN level - shown at WARN and above
   * Use for warnings and potential issues
   */
  warn(...args: any[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(...args);
    }
  }

  /**
   * INFO level - shown at INFO and above (default)
   * Use for important state changes like:
   * - Kingdom Actor resource changes
   * - Turn/phase transitions
   * - Major game events
   */
  info(...args: any[]): void {
    if (this.level >= LogLevel.INFO) {
      console.log(...args);
    }
  }

  /**
   * DEBUG level - only shown when DEBUG is enabled
   * Use for verbose logs like:
   * - Phase step completion
   * - Helper function traces
   * - Service execution details
   * - Loader progress
   */
  debug(...args: any[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.log(...args);
    }
  }
}

// Export singleton instance
export const logger = new Logger();
