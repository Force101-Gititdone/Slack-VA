// Structured logging utility for Slack VA

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = this.getTimestamp();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const formatted = this.formatMessage(level, message, context);
    
    if (error) {
      const errorContext = {
        ...context,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      };
      const errorFormatted = this.formatMessage(level, message, errorContext);
      
      switch (level) {
        case 'debug':
        case 'info':
          console.log(errorFormatted);
          break;
        case 'warn':
          console.warn(errorFormatted);
          break;
        case 'error':
        case 'critical':
          console.error(errorFormatted);
          break;
      }
    } else {
      switch (level) {
        case 'debug':
        case 'info':
          console.log(formatted);
          break;
        case 'warn':
          console.warn(formatted);
          break;
        case 'error':
        case 'critical':
          console.error(formatted);
          break;
      }
    }
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log('warn', message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log('error', message, context, error);
  }

  critical(message: string, context?: LogContext, error?: Error): void {
    this.log('critical', message, context, error);
  }
}

export const logger = new Logger();

