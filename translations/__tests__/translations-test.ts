import en from '../en';
import fi from '../fi';
import sv from '../sv';
import { EXERCISE_PHASES, FOCUS_TAGS } from '@/types/exercise';

type Translations = Record<string, unknown>;

const flatten = (translations: Translations, prefix = ''): Record<string, unknown> =>
  Object.entries(translations).reduce<Record<string, unknown>>((flat, [key, value]) => {
    const path = `${prefix}${key}`;
    return value && typeof value === 'object'
      ? { ...flat, ...flatten(value as Translations, `${path}.`) }
      : { ...flat, [path]: value };
  }, {});

const english = flatten(en);

describe.each([
  ['Swedish', sv],
  ['Finnish', fi],
])('%s translations', (_language, translations) => {
  const flat = flatten(translations as Translations);

  it('have every English key', () => {
    const missing = Object.keys(english).filter(key => !flat[key]);

    expect(missing).toEqual([]);
  });

  it('have no keys English lacks', () => {
    const extra = Object.keys(flat).filter(key => !(key in english));

    expect(extra).toEqual([]);
  });
});

describe('exercise labels', () => {
  it.each(FOCUS_TAGS.map(tag => [tag]))('has a label for focus tag %s', tag => {
    expect(english[`focusTags.${tag}`]).toBeTruthy();
  });

  it.each(EXERCISE_PHASES.map(phase => [phase]))('has a label for phase %s', phase => {
    expect(english[`exercisePhases.${phase}`]).toBeTruthy();
  });

  it.each([[1], [2], [3], [4], [5]])('has a label for difficulty %i', level => {
    expect(english[`difficultyLevels.${level}`]).toBeTruthy();
  });
});
