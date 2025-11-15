// Retry logic for external API calls

import { logger } from './logger.js';
import { ExternalAPIError } from './errors.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'timeout', 'rate limit', '429', '503', '502'],
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code?.toLowerCase() || '';
  const statusCode = String((error as any).statusCode || '');

  return retryableErrors.some(pattern => {
    const lowerPattern = pattern.toLowerCase();
    return errorMessage.includes(lowerPattern) || 
           errorCode.includes(lowerPattern) || 
           statusCode === lowerPattern;
  });
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        logger.debug('Error is not retryable', { 
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      logger.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
      }, error instanceof Error ? error : undefined);

      await sleep(delay);
    }
  }

  // All retries exhausted
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  logger.error(`All retry attempts exhausted`, {
    maxRetries: opts.maxRetries,
    finalError: errorMessage,
  }, lastError instanceof Error ? lastError : undefined);

  throw new ExternalAPIError(
    `Operation failed after ${opts.maxRetries} retries: ${errorMessage}`,
    'unknown',
    false,
    { originalError: errorMessage }
  );
}

/**
 * Retry with custom condition
 */
export async function withRetryCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: unknown, attempt: number) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Check custom retry condition
      if (!shouldRetry(error, attempt)) {
        logger.debug('Retry condition not met', { 
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      logger.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
      }, error instanceof Error ? error : undefined);

      await sleep(delay);
    }
  }

  // All retries exhausted
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  logger.error(`All retry attempts exhausted`, {
    maxRetries: opts.maxRetries,
    finalError: errorMessage,
  }, lastError instanceof Error ? lastError : undefined);

  throw new ExternalAPIError(
    `Operation failed after ${opts.maxRetries} retries: ${errorMessage}`,
    'unknown',
    false,
    { originalError: errorMessage }
  );
}

