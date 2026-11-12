import { FOCUS_TAGS, parseExercise } from '@/types/exercise';

// Jest runs on Node, but the app's types don't include Node's modules
declare const __dirname: string;
const fs = require('fs');
const path = require('path');

// The library's own exercises, uploaded by backend/scripts/upload_library.py.
// One file per exercise and language: <slug>.<locale>.json
const DIR = path.join(__dirname, '..', 'content', 'library-exercises');
const LOCALES = ['sv', 'en'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const files = fs.existsSync(DIR) ? (fs.readdirSync(DIR) as string[]).filter(name => name.endsWith('.json')).sort() : [];
const load = (name: string) => JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
const slugOf = (name: string) => name.replace(/\.[a-z]{2}\.json$/, '');

// What both languages must share: everything but the words
const diagramOf = (data: any) => ({
  sport: data.sport,
  difficulty: data.difficulty,
  focus: data.focus,
  phase: data.phase,
  durationMinutes: data.durationMinutes,
  minPlayers: data.minPlayers,
  maxPlayers: data.maxPlayers,
  coachingPointCount: data.coachingPoints.length,
  frames: data.frames.map((frame: any) => ({ id: frame.id, hasNote: frame.note !== undefined, markers: frame.markers })),
});

describe('library exercises', () => {
  it('are named <slug>.<locale>.json', () => {
    for (const name of files) {
      expect(name).toMatch(new RegExp(`^[a-z0-9-]+\\.(${LOCALES.join('|')})\\.json$`));
    }
  });

  // it.each refuses an empty list, and the folder may be empty
  (files.length ? it.each(files) : it.skip.each(['(no files)']))('%s is a valid public exercise', (name: string) => {
    const data = load(name);
    const exercise = parseExercise(data);

    expect(exercise.id).toMatch(UUID);
    expect(exercise.locale).toBe(name.split('.')[1]);
    expect(exercise.ownerId).toBeNull();
    expect(exercise.visibility).toBe('public');
    expect(exercise.deletedAt).toBeNull();
    expect(exercise.title.trim()).not.toBe('');
    expect(exercise.description.trim()).not.toBe('');
    expect(exercise.focus.every(tag => (FOCUS_TAGS as readonly string[]).includes(tag))).toBe(true);
    for (const frame of exercise.frames) {
      expect(frame.markers.some(marker => marker.type === 'ball')).toBe(true);
      for (const marker of frame.markers) {
        // Inside the court, so nothing is drawn off the edge
        for (const value of [marker.x, marker.y, marker.endX, marker.endY].filter(v => v !== undefined)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
      expect(new Set(frame.markers.map(marker => marker.id)).size).toBe(frame.markers.length);
    }
  });

  it('have unique ids', () => {
    const ids = files.map(name => load(name).id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('come in every language with the same diagram', () => {
    for (const slug of new Set(files.map(slugOf))) {
      const [first, ...rest] = LOCALES.map(locale => {
        const name = `${slug}.${locale}.json`;
        expect(files).toContain(name);
        return files.includes(name) ? diagramOf(load(name)) : null;
      });
      for (const other of rest) expect(other).toEqual(first);
    }
  });
});
