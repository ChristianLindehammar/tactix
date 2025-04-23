import { createContext, useContext, useState, useEffect } from 'react';
import { getItem, setItem } from '../app/utils/AsyncStorage';
import { Sport, sportsConfig } from '@/constants/sports';

interface SportContextType {
  selectedSport: Sport | null;
  setSelectedSport: (sport: Sport | null) => void;
}

const SportContext = createContext<SportContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedSport';

export function SportProvider({ children }: { children: React.ReactNode }) {
  const [selectedSport, setSelectedSport] = useState<Sport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadInitialSport = async () => {
      try {
        const saved = await getItem(STORAGE_KEY);
        // Check if the saved value is a valid sport by checking if it exists in sportsConfig
        if (saved && Object.keys(sportsConfig).includes(saved as string)) {
          setSelectedSport(saved as Sport);
        } else {
          // Default to soccer if nothing valid is saved
          setSelectedSport('soccer');
        }
      } catch (error) {
        console.error('Error loading sport from storage:', error);
        // Default to soccer if there's an error
        setSelectedSport('soccer');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialSport();
  }, []);

  const updateSport = (sport: Sport | null) => {
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
