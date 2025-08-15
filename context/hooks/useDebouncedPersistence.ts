import { useEffect, useRef } from 'react';

/**
 * Custom hook for debounced persistence operations
 * Prevents excessive async storage writes during rapid state changes
 */
export const useDebouncedPersistence = <T>(
  data: T,
  persistFn: (data: T) => Promise<void>,
  delay: number = 300,
  enabled: boolean = true
) => {
  
  const timeoutRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    if (!enabled) return;
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      persistFn(data).catch(console.error);
    }, delay) as unknown as number;
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, persistFn, delay, enabled]);
  
  // Force immediate save
  const forceSave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return persistFn(data);
  };
  
  return { forceSave };
};
