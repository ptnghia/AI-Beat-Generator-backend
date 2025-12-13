import { getPrismaClient } from '../config/database.config';
import { loggingService } from '../services/logging.service';

/**
 * Transaction wrapper utility for multi-step database operations
 * Ensures atomicity - all operations succeed or all are rolled back
 */

export class TransactionUtil {
  private prisma = getPrismaClient();

  /**
   * Execute multiple database operations within a transaction
   * If any operation fails, all changes are rolled back
   * 
   * @param operations - Async function containing database operations
   * @param context - Context information for logging
   * @returns Result of the transaction
   */
  async executeTransaction<T>(
    operations: (tx: any) => Promise<T>,
    context?: { service?: string; operation?: string }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      loggingService.debug('Starting transaction', {
        service: context?.service || 'TransactionUtil',
        operation: context?.operation || 'unknown'
      });

      const result = await this.prisma.$transaction(operations);

      const duration = Date.now() - startTime;
      loggingService.debug('Transaction completed successfully', {
        service: context?.service || 'TransactionUtil',
        operation: context?.operation || 'unknown',
        duration: `${duration}ms`
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      loggingService.error('Transaction failed and rolled back', {
        service: context?.service || 'TransactionUtil',
        operation: context?.operation || 'unknown',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  /**
   * Execute transaction with retry logic
   * Useful for handling transient database errors
   * 
   * @param operations - Async function containing database operations
   * @param maxRetries - Maximum number of retry attempts
   * @param context - Context information for logging
   * @returns Result of the transaction
   */
  async executeTransactionWithRetry<T>(
    operations: (tx: any) => Promise<T>,
    maxRetries: number = 3,
    context?: { service?: string; operation?: string }
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeTransaction(operations, {
          ...context,
          operation: `${context?.operation || 'unknown'} (attempt ${attempt}/${maxRetries})`
        });
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          loggingService.warn(`Transaction failed, retrying in ${delay}ms`, {
            service: context?.service || 'TransactionUtil',
            operation: context?.operation || 'unknown',
            attempt,
            maxRetries,
            error: error instanceof Error ? error.message : String(error)
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}

// Export singleton instance
export const transactionUtil = new TransactionUtil();
