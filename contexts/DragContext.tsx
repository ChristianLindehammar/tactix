import React, { createContext, useState, useContext, PropsWithChildren, useCallback } from 'react';
import { PlayerType } from '@/types/models'; // Assuming PlayerType is defined here

interface Position {
  x: number;
  y: number;
}

interface DragContextProps {
  draggedItem: { player: PlayerType; initialPosition: Position } | null;
  dragPosition: Position | null;
  isDragging: boolean;
  startDrag: (player: PlayerType, initialPosition: Position) => void;
  updateDragPosition: (position: Position) => void;
  endDrag: () => { droppedPlayer: PlayerType | null; finalPosition: Position | null };
  lastDrop: { droppedPlayer: PlayerType | null; finalPosition: Position | null } | null;
  clearLastDrop: () => void;
}

const DragContext = createContext<DragContextProps | undefined>(undefined);

export const DragProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [draggedItem, setDraggedItem] = useState<{ player: PlayerType; initialPosition: Position } | null>(null);
  const [dragPosition, setDragPosition] = useState<Position | null>(null);
  const [lastDrop, setLastDrop] = useState<{ droppedPlayer: PlayerType | null; finalPosition: Position | null } | null>(null);

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

  const isDragging = !!draggedItem;

  return (
    <DragContext.Provider value={{ draggedItem, dragPosition, isDragging, startDrag, updateDragPosition, endDrag, lastDrop, clearLastDrop }}>
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