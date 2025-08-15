import { useState, useCallback } from 'react';

export interface ErrorState {
  message: string;
  code?: string;
  timestamp: number;
}

export const useErrorHandler = () => {
  const [error, setError] = useState<ErrorState | null>(null);

  const handleError = useCallback((error: Error | string, code?: string) => {
    const errorMessage = typeof error === 'string' ? error : error.message;
    setError({
      message: errorMessage,
      code,
      timestamp: Date.now()
    });
    
    // Log to console for debugging
    console.error('Team data error:', { message: errorMessage, code, error });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(
    <T extends (...args: any[]) => Promise<any>>(fn: T) => {
      return (async (...args: Parameters<T>) => {
        try {
          clearError();
          return await fn(...args);
        } catch (err) {
          handleError(err as Error);
          throw err; // Re-throw to allow caller to handle if needed
        }
      }) as T;
    },
    [handleError, clearError]
  );

  return {
    error,
    handleError,
    clearError,
    withErrorHandling
  };
};
