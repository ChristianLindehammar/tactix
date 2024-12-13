
import React, { createContext, useState, useContext } from 'react';
import { Player } from '@/types/player';

type PlayerContextType = {
  players: Player[];
  selectedPlayers: string[];
  setPlayers: (players: Player[]) => void;
  setSelectedPlayers: (players: string[]) => void;
};

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);

  return (
    <PlayerContext.Provider value={{ players, selectedPlayers, setPlayers, setSelectedPlayers }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayers() {
  const context = useContext(PlayerContext);
  if (undefined === context) {
    throw new Error('usePlayers must be used within a PlayerProvider');
  }
  return context;
}