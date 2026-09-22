import { sportsConfig } from '@/constants/sports';

describe('sportsConfig arrow colors', () => {
  it('uses a dark arrow color on the white hockey rink, like bandy', () => {
    expect(sportsConfig.hockey.arrowColor).toBe(sportsConfig.bandy.arrowColor);
  });

  it.each(Object.keys(sportsConfig) as (keyof typeof sportsConfig)[])(
    'defines an explicit arrow color for %s so it never follows the theme text color',
    (sport) => {
      expect(sportsConfig[sport].arrowColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    },
  );

  it('uses white arrows on the colored courts', () => {
    expect(sportsConfig.floorball.arrowColor).toBe('#FFFFFF');
    expect(sportsConfig.soccer.arrowColor).toBe('#FFFFFF');
    expect(sportsConfig.basketball.arrowColor).toBe('#FFFFFF');
  });
});
