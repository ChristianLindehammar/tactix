import React, { createContext, useState, PropsWithChildren } from 'react';
import { Team } from '@/types/models';

interface TeamContextProps {
  team: Team;
  setTeam: React.Dispatch<React.SetStateAction<Team>>;
}

export const TeamContext = createContext<TeamContextProps | undefined>(undefined);

export const TeamProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [team, setTeam] = useState<Team>({
    id: '1',
    name: 'My Team',
    startingPlayers: [],
    benchPlayers: [],
    createdBy: 'user1',
    sharedWith: [],
    lastEdited: Date.now(),
    editedBy: 'user1',
  });

  return (
    <TeamContext.Provider value={{ team, setTeam }}>
      {children}
    </TeamContext.Provider>
  );
};
