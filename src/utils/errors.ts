// Error handling utilities for Slack VA

import { logger } from './logger.js';

export class SlackVAError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly userMessage?: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'SlackVAError';
  }
}

export class ValidationError extends SlackVAError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      `Invalid input: ${message}`,
      context
    );
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends SlackVAError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      'You need to authenticate first. Use `/auth/google` to connect your Google account.',
      context
    );
    this.name = 'AuthenticationError';
  }
}

export class ExternalAPIError extends SlackVAError {
  constructor(
    message: string,
    public readonly service: string,
    public readonly retryable: boolean = false,
    context?: Record<string, any>
  ) {
    super(
      message,
      'EXTERNAL_API_ERROR',
      502,
      `Service temporarily unavailable. Please try again later.`,
      { ...context, service, retryable }
    );
    this.name = 'ExternalAPIError';
  }
}

export class DatabaseError extends SlackVAError {
  constructor(message: string, context?: Record<string, any>) {
    super(
      message,
      'DATABASE_ERROR',
      500,
      'Database operation failed. Please try again.',
      context
    );
    this.name = 'DatabaseError';
  }
}

/**
 * Handle errors and return user-friendly Slack response
 */
export function handleError(error: unknown, command?: string): {
  text: string;
  response_type: 'ephemeral';
  blocks?: any[];
} {
  // Log the error
  if (error instanceof SlackVAError) {
    logger.error(`Error in ${command || 'unknown command'}`, {
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
    }, error);
  } else if (error instanceof Error) {
    logger.error(`Unexpected error in ${command || 'unknown command'}`, {
      error: error.message,
    }, error);
  } else {
    logger.error(`Unknown error in ${command || 'unknown command'}`, {
      error: String(error),
    });
  }

  // Return user-friendly message
  if (error instanceof SlackVAError) {
    return {
      text: `❌ ${error.userMessage || error.message}`,
      response_type: 'ephemeral',
    };
  }

  if (error instanceof Error) {
    // Don't expose internal error details to users
    return {
      text: '❌ An unexpected error occurred. Please try again later.',
      response_type: 'ephemeral',
    };
  }

  return {
    text: '❌ An unknown error occurred. Please try again later.',
    response_type: 'ephemeral',
  };
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  commandName: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`Error in ${commandName}`, { args }, error instanceof Error ? error : undefined);
      throw error;
    }
  }) as T;
}

