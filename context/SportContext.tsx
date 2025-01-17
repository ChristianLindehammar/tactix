import { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem } from '../app/utils/AsyncStorage';

type Sport = 'floorball' | 'football';

interface SportContextType {
  selectedSport: Sport;
  setSelectedSport: (sport: Sport) => void;
}

const SportContext = createContext<SportContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedSport';

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [selectedSport, setSelectedSport] = useState<Sport>('floorball');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialSport = async () => {
      const saved = await getItem(STORAGE_KEY);
      if (saved === 'floorball' || saved === 'football') {
        setSelectedSport(saved);
      }
      setIsLoading(false);
    };
    loadInitialSport();
  }, []);

  const updateSport = (sport: Sport) => {
    setSelectedSport(sport);
    setItem(STORAGE_KEY, sport);
  };

  if (isLoading) {
    return null; // or return a loading spinner
  }

  return (
    <SportContext.Provider value={{ selectedSport, setSelectedSport: updateSport }}>
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
