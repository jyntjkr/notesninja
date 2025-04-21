import { useState, useEffect, useCallback } from 'react';

type ParseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface UseParseStatusOptions {
  uploadId: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
  pollingInterval?: number;
}

/**
 * Custom hook to monitor the parsing status of a PDF document
 */
export function useParseStatus({
  uploadId,
  onComplete,
  onError,
  pollingInterval = 5000,
}: UseParseStatusOptions) {
  const [status, setStatus] = useState<ParseStatus>('PENDING');
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkStatus = useCallback(async () => {
    if (!uploadId) return;
    
    try {
      const response = await fetch(`/api/materials/parse-pdf?uploadId=${uploadId}`);
      
      if (!response.ok) {
        throw new Error('Failed to check parse status');
      }
      
      const data = await response.json();
      
      if (data.success && data.parseStatus) {
        setStatus(data.parseStatus as ParseStatus);
        
        // If parsing is complete or failed, stop polling
        if (data.parseStatus === 'COMPLETED') {
          setIsPolling(false);
          onComplete?.();
        } else if (data.parseStatus === 'FAILED') {
          setIsPolling(false);
          onError?.(new Error('PDF parsing failed'));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setIsPolling(false);
      onError?.(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [uploadId, onComplete, onError]);

  // Start polling when uploadId is provided
  useEffect(() => {
    if (uploadId && (status === 'PENDING' || status === 'PROCESSING')) {
      setIsPolling(true);
    }
  }, [uploadId, status]);

  // Set up polling interval
  useEffect(() => {
    if (!isPolling) return;
    
    // Check immediately on first load
    checkStatus();
    
    const intervalId = setInterval(checkStatus, pollingInterval);
    
    return () => clearInterval(intervalId);
  }, [isPolling, checkStatus, pollingInterval]);

  return {
    status,
    isPolling,
    error,
    isPending: status === 'PENDING',
    isProcessing: status === 'PROCESSING',
    isCompleted: status === 'COMPLETED',
    isFailed: status === 'FAILED',
    isInProgress: status === 'PENDING' || status === 'PROCESSING',
  };
} 