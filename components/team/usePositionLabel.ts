import { useCallback } from 'react';

import { useSport } from '@/context/SportContext';
import { getValidPosition } from '@/context/utils';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * A short label for a position: basketball uses PG, SG and so on, the other sports their full name.
 * A position the sport doesn't have, such as one kept from an older version, reads as the sport's first one, like the court shows it.
 */
export function usePositionLabel() {
  const { selectedSport } = useSport();
  const { t } = useTranslation();

  return useCallback(
    (stored: string) => {
      const position = getValidPosition(stored, selectedSport ?? 'soccer');
      return selectedSport === 'basketball'
        ? t(`playerPositionsShort.${position}`, { defaultValue: t(`playerPositions.${position}`) })
        : t(`playerPositions.${position}`);
    },
    [selectedSport, t],
  );
}
