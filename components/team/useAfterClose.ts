import { useCallback, useRef } from 'react';

/**
 * Closes a sheet and runs an action once it is gone. A file picker, share sheet or new screen
 * opened while the sheet is still on screen can end up behind it on iOS.
 */
export function useAfterClose(onClose: () => void, onDismissed?: () => void) {
  const pending = useRef<(() => void) | null>(null);

  const closeThen = useCallback((action: () => void) => {
    pending.current = action;
    onClose();
  }, [onClose]);

  const handleDismissed = useCallback(() => {
    const action = pending.current;
    pending.current = null;
    onDismissed?.();
    action?.();
  }, [onDismissed]);

  return { closeThen, handleDismissed };
}
