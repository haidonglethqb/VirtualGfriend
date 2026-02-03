'use client';

import { useState, useCallback } from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface RetryableErrorProps {
  error: string | Error;
  onRetry: () => Promise<void> | void;
  className?: string;
  type?: 'network' | 'api' | 'generic';
}

export function RetryableError({ error, onRetry, className, type = 'generic' }: RetryableErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry]);

  const errorMessage = typeof error === 'string' ? error : error.message;

  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="w-6 h-6 text-orange-400" />;
      case 'api':
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      default:
        return <AlertCircle className="w-6 h-6 text-red-400" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'network':
        return 'Mất kết nối';
      case 'api':
        return 'Lỗi tải dữ liệu';
      default:
        return 'Có lỗi xảy ra';
    }
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-6 text-center',
      'bg-red-500/5 rounded-xl border border-red-500/20',
      className
    )}>
      <div className="p-3 rounded-full bg-red-500/10 mb-3">
        {getIcon()}
      </div>
      <h3 className="text-base font-medium text-white mb-1">
        {getTitle()}
      </h3>
      <p className="text-sm text-white/60 mb-4 max-w-sm">
        {errorMessage}
      </p>
      <Button
        onClick={handleRetry}
        disabled={isRetrying}
        size="sm"
        className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
      >
        {isRetrying ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Đang thử...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Thử lại
          </>
        )}
      </Button>
    </div>
  );
}

// Hook for retry logic
interface UseRetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  onError?: (error: Error, attempt: number) => void;
}

export function useRetry<T>(
  fn: () => Promise<T>,
  options: UseRetryOptions = {}
): {
  execute: () => Promise<T>;
  isLoading: boolean;
  error: Error | null;
  attempt: number;
  reset: () => void;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    onError,
  } = options;

  const execute = useCallback(async (): Promise<T> => {
    setIsLoading(true);
    setError(null);

    let lastError: Error = new Error('Unknown error');
    
    for (let i = 0; i < maxAttempts; i++) {
      setAttempt(i + 1);
      
      try {
        const result = await fn();
        setIsLoading(false);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        onError?.(lastError, i + 1);
        
        if (i < maxAttempts - 1) {
          // Calculate delay with backoff
          const waitTime = backoff === 'exponential' 
            ? delay * Math.pow(2, i) 
            : delay * (i + 1);
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    setError(lastError);
    setIsLoading(false);
    throw lastError;
  }, [fn, maxAttempts, delay, backoff, onError]);

  const reset = useCallback(() => {
    setError(null);
    setAttempt(0);
    setIsLoading(false);
  }, []);

  return { execute, isLoading, error, attempt, reset };
}

// Simple inline retry button
interface InlineRetryProps {
  onRetry: () => void;
  message?: string;
}

export function InlineRetry({ onRetry, message = 'Thất bại' }: InlineRetryProps) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-white/60">
      <AlertCircle className="w-4 h-4 text-red-400" />
      <span>{message}</span>
      <button
        onClick={onRetry}
        className="text-pink-400 hover:text-pink-300 underline"
      >
        Thử lại
      </button>
    </div>
  );
}

export default RetryableError;
