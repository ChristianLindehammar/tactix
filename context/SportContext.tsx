import { createContext, useContext, useState } from 'react';

type Sport = 'floorball' | 'football';

interface SportContextType {
  selectedSport: Sport;
  setSelectedSport: (sport: Sport) => void;
}

const SportContext = createContext<SportContextType | undefined>(undefined);

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [selectedSport, setSelectedSport] = useState<Sport>('floorball');

  return (
    <SportContext.Provider value={{ selectedSport, setSelectedSport }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  const context = useContext(SportContext);
  if (undefined === context) {
    throw new Error('useSport must be used within a SportProvider');
  }
  return context;
}
