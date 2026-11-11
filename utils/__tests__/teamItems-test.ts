import { Team } from '@/types/models';

import { applyChanges, diffItems, itemsToTeam, teamToItems } from '../teamItems';

const buildTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'local-1',
  name: 'U12 Blå',
  sport: 'floorball',
  createdBy: 'user1',
  sharedWith: [],
  lastEdited: 0,
  editedBy: 'user1',
  startingPlayers: [{ id: 'p1', name: 'Alva', position: 'forward', courtPosition: { x: 0.25, y: 0.5 } }],
  benchPlayers: [{ id: 'p2', name: 'Bo', position: 'defender' }],
  configurations: [
    { id: 'f1', name: 'Standard', playerPositions: { p1: { x: 0.25, y: 0.5 } } },
    { id: 'f2', name: 'Powerplay', playerPositions: { p1: { x: 0.5, y: 0.2 }, p2: { x: 0.6, y: 0.3 } } },
  ],
  selectedConfigurationId: 'f1',
  ...overrides,
});

describe('teamToItems', () => {
  it('splits a team into its name, players, formations and places', () => {
    expect(teamToItems(buildTeam())).toEqual({
      'team/team': { name: 'U12 Blå', sport: 'floorball' },
      'player/p1': { name: 'Alva', position: 'forward' },
      'player/p2': { name: 'Bo', position: 'defender' },
      'formation/f1': { name: 'Standard' },
      'formation/f2': { name: 'Powerplay' },
      'place/f1:p1': { x: 0.25, y: 0.5 },
      'place/f2:p1': { x: 0.5, y: 0.2 },
      'place/f2:p2': { x: 0.6, y: 0.3 },
    });
  });

  it('rounds and clamps places to what the server accepts', () => {
    const team = buildTeam({
      configurations: [{ id: 'f1', name: 'Standard', playerPositions: { p1: { x: 0.123456, y: 1.00001 } } }],
    });

    expect(teamToItems(team)['place/f1:p1']).toEqual({ x: 0.1235, y: 1 });
  });

  it('leaves out places of players who are gone', () => {
    const team = buildTeam({
      configurations: [{ id: 'f1', name: 'Standard', playerPositions: { ghost: { x: 0.5, y: 0.5 } } }],
    });

    expect(teamToItems(team)['place/f1:ghost']).toBeUndefined();
  });

  it('gives an empty name something the server accepts', () => {
    const team = buildTeam({ benchPlayers: [{ id: 'p2', name: '  ', position: 'defender' }] });

    expect(teamToItems(team)['player/p2']).toEqual({ name: '?', position: 'defender' });
  });
});

describe('diffItems', () => {
  it('finds added, changed and removed items', () => {
    const before = { 'player/p1': { name: 'Alva' }, 'player/p2': { name: 'Bo' } };
    const after = { 'player/p1': { name: 'Alva K' }, 'player/p3': { name: 'Cy' } };

    expect(diffItems(before, after)).toEqual([
      { kind: 'player', id: 'p1', data: { name: 'Alva K' } },
      { kind: 'player', id: 'p3', data: { name: 'Cy' } },
      { kind: 'player', id: 'p2', data: null },
    ]);
  });

  it('keeps the colon in a place id', () => {
    expect(diffItems({}, { 'place/f1:p1': { x: 0, y: 0 } })).toEqual([
      { kind: 'place', id: 'f1:p1', data: { x: 0, y: 0 } },
    ]);
  });

  it('finds nothing when nothing changed', () => {
    const items = teamToItems(buildTeam());

    expect(diffItems(items, teamToItems(buildTeam()))).toEqual([]);
  });

  it('round-trips through applyChanges', () => {
    const before = teamToItems(buildTeam());
    const after = teamToItems(buildTeam({ name: 'U13', benchPlayers: [] }));

    expect(applyChanges(before, diffItems(before, after))).toEqual(after);
  });
});

describe('itemsToTeam', () => {
  it('rebuilds the same team', () => {
    const team = buildTeam();

    const rebuilt = itemsToTeam(team, teamToItems(team));

    expect(teamToItems(rebuilt)).toEqual(teamToItems(team));
    expect(rebuilt.startingPlayers.map(p => p.id)).toEqual(['p1']);
    expect(rebuilt.benchPlayers.map(p => p.id)).toEqual(['p2']);
  });

  it('starts the players placed in the formation this phone shows', () => {
    const team = buildTeam({ selectedConfigurationId: 'f2' });

    const rebuilt = itemsToTeam(team, teamToItems(team));

    expect(rebuilt.startingPlayers).toEqual([
      { id: 'p1', name: 'Alva', position: 'forward', courtPosition: { x: 0.5, y: 0.2 } },
      { id: 'p2', name: 'Bo', position: 'defender', courtPosition: { x: 0.6, y: 0.3 } },
    ]);
    expect(rebuilt.benchPlayers).toEqual([]);
  });

  it('takes another coach moving a player onto the court', () => {
    const team = buildTeam();
    const items = applyChanges(teamToItems(team), [{ kind: 'place', id: 'f1:p2', data: { x: 0.7, y: 0.7 } }]);

    const rebuilt = itemsToTeam(team, items);

    expect(rebuilt.startingPlayers.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('keeps this phone’s order and puts new players after it', () => {
    const team = buildTeam({ startingPlayers: [], benchPlayers: [{ id: 'p2', name: 'Bo', position: 'defender' }, { id: 'p1', name: 'Alva', position: 'forward' }] });
    const items = applyChanges(teamToItems(team), [
      { kind: 'player', id: 'p0', data: { name: 'New', position: 'forward' } },
      { kind: 'place', id: 'f1:p1', data: null },
    ]);

    const rebuilt = itemsToTeam(team, items);

    expect(rebuilt.benchPlayers.map(p => p.id)).toEqual(['p2', 'p1', 'p0']);
  });

  it('shows the first formation when the one showing was removed', () => {
    const team = buildTeam({ selectedConfigurationId: 'f2' });
    const items = applyChanges(teamToItems(team), [{ kind: 'formation', id: 'f2', data: null }]);

    expect(itemsToTeam(team, items).selectedConfigurationId).toBe('f1');
  });

  it('takes a rename of the team', () => {
    const items = applyChanges(teamToItems(buildTeam()), [
      { kind: 'team', id: 'team', data: { name: 'U13 Röd', sport: 'floorball' } },
    ]);

    expect(itemsToTeam(buildTeam(), items).name).toBe('U13 Röd');
  });
});
