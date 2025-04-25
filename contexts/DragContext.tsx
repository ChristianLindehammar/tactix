import React, { createContext, useState, useContext, PropsWithChildren, useCallback } from 'react';
import { PlayerType } from '@/types/models';

interface Position {
  x: number;
  y: number;
}

interface DragInfo {
  player: PlayerType;
  initialPosition: Position;
}

interface DropResult {
  droppedPlayer: PlayerType | null;
  finalPosition: Position | null;
}

interface DragContextProps {
  // Current drag state
  draggedItem: DragInfo | null;
  dragPosition: Position | null;
  isDragging: boolean;
  lastDrop: DropResult | null;
  
  // Drag operations
  startDrag: (player: PlayerType, initialPosition: Position) => void;
  updateDragPosition: (position: Position) => void;
  endDrag: () => DropResult;
  clearLastDrop: () => void;
}

const DragContext = createContext<DragContextProps | undefined>(undefined);

/**
 * Provides a centralized system for tracking and managing player dragging 
 * between the court and bench. Used to:
 * 1. Handle bench player → court drag and drop
 * 2. Handle court player → bench drag and drop
 * 3. Display ghost markers during drags
 */
export const DragProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState<DragInfo | null>(null);
  const [dragPosition, setDragPosition] = useState<Position | null>(null);
  const [lastDrop, setLastDrop] = useState<DropResult | null>(null);

  const startDrag = useCallback((player: PlayerType, initialPosition: Position) => {
    setDraggedItem({ player, initialPosition });
    setDragPosition(initialPosition);
  }, []);

  const updateDragPosition = useCallback((position: Position) => {
    setDragPosition(position);
  }, []);

  const endDrag = useCallback(() => {
    const droppedPlayer = draggedItem?.player ?? null;
    const finalPosition = dragPosition;
    const dropData = { droppedPlayer, finalPosition };
    
    setLastDrop(dropData);
    setDraggedItem(null);
    setDragPosition(null);
    
    return dropData;
  }, [draggedItem, dragPosition]);

  const clearLastDrop = useCallback(() => setLastDrop(null), []);

  // Simple check if something is currently being dragged
  const isDragging = !!draggedItem;

  return (
    <DragContext.Provider value={{ 
      draggedItem, 
      dragPosition, 
      isDragging, 
      lastDrop,
      startDrag, 
      updateDragPosition, 
      endDrag,
      clearLastDrop
    }}>
      {children}
    </DragContext.Provider>
  );
};

/**
 * Hook to access the drag context. Provides functionality for:
 * - Tracking drag state with isDragging
 * - Starting drags with startDrag
 * - Updating drag position with updateDragPosition
 * - Ending drags with endDrag
 * - Getting the last drop details with lastDrop
 */
export const useDrag = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
};