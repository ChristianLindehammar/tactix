import { sportKey } from '../sportWording';
import en from '@/translations/en';
import sv from '@/translations/sv';
import fi from '@/translations/fi';

const lookup = (translations: Record<string, any>, key: string) =>
  key.split('.').reduce<any>((node, part) => node?.[part], translations);

describe('sportKey', () => {
  it('calls the ball a puck in hockey', () => {
    expect(sportKey('markerNames.ball', 'hockey')).toBe('markerNames.puck');
    expect(sportKey('arrowLegend.dribble', 'hockey')).toBe('arrowLegend.puckCarry');
    expect(sportKey('focusTags.ballControl', 'hockey')).toBe('focusTags.puckControl');
  });

  it('skates instead of running on ice', () => {
    expect(sportKey('arrowLegend.run', 'hockey')).toBe('arrowLegend.skate');
    expect(sportKey('arrowLegend.run', 'bandy')).toBe('arrowLegend.skate');
    expect(sportKey('markerNames.arrow-solid', 'bandy')).toBe('markerNames.skate');
  });

  it('keeps the ball in bandy', () => {
    expect(sportKey('markerNames.ball', 'bandy')).toBe('markerNames.ball');
  });

  it('keeps every key for other sports or no sport', () => {
    expect(sportKey('arrowLegend.run', 'floorball')).toBe('arrowLegend.run');
    expect(sportKey('focusTags.ballControl', 'soccer')).toBe('focusTags.ballControl');
    expect(sportKey('markerNames.ball', undefined)).toBe('markerNames.ball');
  });

  it.each([
    ['en', en],
    ['sv', sv],
    ['fi', fi],
  ])('has every sport word in %s', (_name, translations) => {
    const keys = ['markerNames.puck', 'markerNames.skate', 'arrowLegend.puckCarry', 'arrowLegend.skate', 'focusTags.puckControl'];
    for (const key of keys) expect(typeof lookup(translations, key)).toBe('string');
  });
});
