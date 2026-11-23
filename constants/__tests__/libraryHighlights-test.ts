import { atLeast, LIBRARY_COUNTS, sampleExercise } from '@/constants/libraryHighlights';
import { Sport } from '@/constants/sports';

// The app has no Node types, but Jest runs in Node
interface FileSystem {
  readdirSync(path: string): string[];
  readFileSync(path: string, encoding: 'utf8'): string;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs: FileSystem = require('fs');
const CONTENT = 'content/library-exercises';

function countsIn(language: string) {
  const counts: Partial<Record<string, number>> = {};
  for (const file of fs.readdirSync(CONTENT).filter(name => name.endsWith(`.${language}.json`))) {
    const { sport } = JSON.parse(fs.readFileSync(`${CONTENT}/${file}`, 'utf8'));
    counts[sport] = (counts[sport] ?? 0) + 1;
  }
  return counts;
}

test.each(['en', 'sv'])('the sales page counts the exercises there are in %s', language => {
  expect(countsIn(language)).toEqual(LIBRARY_COUNTS);
});

test.each(Object.keys(LIBRARY_COUNTS) as Sport[])('the %s sample is a valid exercise in both languages', sport => {
  for (const locale of ['en', 'sv-SE', 'fi']) {
    const sample = sampleExercise(sport, locale);
    expect(sample.sport).toBe(sport);
    expect(sample.locale).toBe(locale.startsWith('sv') ? 'sv' : 'en');
  }
});

test('counts are rounded down to tens so they stay true', () => {
  expect(atLeast(194)).toBe(190);
  expect(atLeast(68)).toBe(60);
  expect(atLeast(556)).toBe(550);
});
