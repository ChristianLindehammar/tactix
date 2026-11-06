import React, { createContext, PropsWithChildren, useCallback, useContext, useRef, useState } from 'react';
import { View } from 'react-native';
import { SharedValue, useSharedValue } from 'react-native-reanimated';

import { PlayerType, Position } from '@/types/models';
import { DropAction, DropSource, Rect, resolveDrop } from '@/utils/resolveDrop';

interface ActiveDrag {
  player: PlayerType;
  source: DropSource;
}

interface DragContextProps {
  /** Changes only when a drag starts or ends, so dragging doesn't re-render the screen */
  activeDrag: ActiveDrag | null;
  /** Finger position in window coordinates, updated on the UI thread */
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  /** Where the bench is on screen, so gestures can tell when a court player is over it */
  benchRect: SharedValue<Rect | null>;
  /** True while a court player is held over the bench */
  overBench: SharedValue<boolean>;
  courtRef: React.RefObject<View | null>;
  benchRef: React.RefObject<View | null>;
  startDrag: (player: PlayerType, source: DropSource) => void;
  endDrag: (point: Position, courtPosition?: Position) => void;
  cancelDrag: () => void;
}

const DragContext = createContext<DragContextProps | undefined>(undefined);

const measure = (ref: React.RefObject<View | null>, onMeasured: (rect: Rect) => void) =>
  ref.current?.measureInWindow((x, y, width, height) => onMeasured({ x, y, width, height }));

interface DragProviderProps {
  onDrop: (player: PlayerType, action: DropAction) => void;
}

/**
 * Tracks one player being dragged between the court and the bench. Gestures report where
 * the finger is released, and the drop is resolved against where the court and bench are.
 */
export const DragProvider: React.FC<PropsWithChildren<DragProviderProps>> = ({ children, onDrop }) => {
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const benchRect = useSharedValue<Rect | null>(null);
  const overBench = useSharedValue(false);
  const courtRect = useRef<Rect | null>(null);
  const courtRef = useRef<View | null>(null);
  const benchRef = useRef<View | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  const startDrag = useCallback((player: PlayerType, source: DropSource) => {
    // The bench can be opened or closed between drags, so measure each time
    measure(courtRef, rect => (courtRect.current = rect));
    measure(benchRef, rect => (benchRect.value = rect));
    activeDragRef.current = { player, source };
    setActiveDrag(activeDragRef.current);
  }, [benchRect]);

  const finish = useCallback(() => {
    activeDragRef.current = null;
    overBench.value = false;
    setActiveDrag(null);
  }, [overBench]);

  const endDrag = useCallback((point: Position, courtPosition?: Position) => {
    const drag = activeDragRef.current;
    finish();
    if (!drag) return;
    const action = resolveDrop({
      source: drag.source,
      point,
      court: courtRect.current,
      bench: benchRect.value,
      courtPosition,
    });
    onDropRef.current(drag.player, action);
  }, [finish, benchRect]);

  return (
    <DragContext.Provider
      value={{
        activeDrag,
        dragX,
        dragY,
        benchRect,
        overBench,
        courtRef,
        benchRef,
        startDrag,
        endDrag,
        cancelDrag: finish,
      }}
    >
      {children}
    </DragContext.Provider>
  );
};

export const useDrag = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
};
