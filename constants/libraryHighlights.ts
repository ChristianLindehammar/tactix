import type { Sport } from '@/constants/sports';
import { Exercise, parseExercise } from '@/types/exercise';

import bandyEn from '@/content/library-exercises/behall-bollen-i-ringen.en.json';
import bandySv from '@/content/library-exercises/behall-bollen-i-ringen.sv.json';
import basketballEn from '@/content/library-exercises/2-mot-2-med-tranaren-som-joker.en.json';
import basketballSv from '@/content/library-exercises/2-mot-2-med-tranaren-som-joker.sv.json';
import floorballEn from '@/content/library-exercises/anfall-och-forsvar-2-mot-2.en.json';
import floorballSv from '@/content/library-exercises/anfall-och-forsvar-2-mot-2.sv.json';
import hockeyEn from '@/content/library-exercises/anfall-och-forsvar-2-mot-2-hockey.en.json';
import hockeySv from '@/content/library-exercises/anfall-och-forsvar-2-mot-2-hockey.sv.json';
import soccerEn from '@/content/library-exercises/4-mot-4-fyra-sma-mal.en.json';
import soccerSv from '@/content/library-exercises/4-mot-4-fyra-sma-mal.sv.json';

/**
 * How many ready-made exercises each sport has in `content/library-exercises`, which the library is
 * filled from. A test keeps these in step with the files, so the sales page never promises more.
 */
export const LIBRARY_COUNTS: Record<Sport, number> = {
  soccer: 194,
  floorball: 133,
  bandy: 83,
  hockey: 78,
  basketball: 68,
};

/** Most first, as the sales page lists them. */
export const LIBRARY_SPORTS = (Object.keys(LIBRARY_COUNTS) as Sport[]).sort(
  (a, b) => LIBRARY_COUNTS[b] - LIBRARY_COUNTS[a],
);

/** Rounded down to tens, so "190+" stays true as exercises come and go. */
export const atLeast = (count: number) => Math.floor(count / 10) * 10;

export const LIBRARY_TOTAL = Object.values(LIBRARY_COUNTS).reduce((sum, count) => sum + count, 0);

// One easy-to-read exercise per sport, shown in full before buying. Finnish has no exercises yet,
// so it gets the English one, as the library does.
const SAMPLES: Record<Sport, { en: unknown; sv: unknown }> = {
  soccer: { en: soccerEn, sv: soccerSv },
  floorball: { en: floorballEn, sv: floorballSv },
  bandy: { en: bandyEn, sv: bandySv },
  hockey: { en: hockeyEn, sv: hockeySv },
  basketball: { en: basketballEn, sv: basketballSv },
};

export function sampleExercise(sport: Sport, locale: string): Exercise {
  const { en, sv } = SAMPLES[sport];
  return parseExercise(locale.startsWith('sv') ? sv : en);
}
