import { Sport } from '@/constants/sports';
import { CourtConfiguration, PlayerType, Position, Team } from '@/types/models';

/**
 * A shared team as separate items, so coaches changing different things never overwrite each other:
 * the team's name, each player, each formation, and each player's place in each formation.
 * Starting and bench players aren't items: the selected formation decides them, on each phone.
 */
export type TeamItemKind = 'team' | 'player' | 'formation' | 'place';

export interface TeamChange {
  kind: TeamItemKind;
  id: string;
  /** Null removes the item. */
  data: Record<string, unknown> | null;
}

/** Items by `kind/id`. A missing key is an item that doesn't exist. */
export type TeamItems = Record<string, Record<string, unknown>>;

const ITEM_ID = /^[A-Za-z0-9._-]{1,64}$/;
const MAX_NAME = 100;

const keyOf = (kind: TeamItemKind, id: string) => `${kind}/${id}`;

const splitKey = (key: string): { kind: TeamItemKind; id: string } => {
  const slash = key.indexOf('/');
  return { kind: key.slice(0, slash) as TeamItemKind, id: key.slice(slash + 1) };
};

// The server only takes names it can show, and rounding keeps tiny drags from being sent as changes
const nameOf = (value: string) => (value.trim() || '?').slice(0, MAX_NAME);
const coordinate = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 10000) / 10000;

export function teamToItems(team: Team): TeamItems {
  const items: TeamItems = {
    [keyOf('team', 'team')]: { name: nameOf(team.name), sport: team.sport },
  };
  const players = [...team.startingPlayers, ...team.benchPlayers].filter(player => ITEM_ID.test(player.id));
  const playerIds = new Set(players.map(player => player.id));

  players.forEach(player => {
    items[keyOf('player', player.id)] = { name: nameOf(player.name), position: player.position.slice(0, 40) };
  });
  (team.configurations ?? [])
    .filter(configuration => ITEM_ID.test(configuration.id))
    .forEach(configuration => {
      items[keyOf('formation', configuration.id)] = { name: nameOf(configuration.name) };
      Object.entries(configuration.playerPositions).forEach(([playerId, place]) => {
        if (!playerIds.has(playerId) || !place) return;
        items[keyOf('place', `${configuration.id}:${playerId}`)] = { x: coordinate(place.x), y: coordinate(place.y) };
      });
    });
  return items;
}

const sameData = (a: Record<string, unknown> | undefined, b: Record<string, unknown> | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);

/** What turns `from` into `to`. */
export function diffItems(from: TeamItems, to: TeamItems): TeamChange[] {
  const changes: TeamChange[] = [];
  Object.entries(to).forEach(([key, data]) => {
    if (!sameData(from[key], data)) changes.push({ ...splitKey(key), data });
  });
  Object.keys(from).forEach(key => {
    if (!(key in to)) changes.push({ ...splitKey(key), data: null });
  });
  return changes;
}

export function applyChanges(items: TeamItems, changes: TeamChange[]): TeamItems {
  const next = { ...items };
  changes.forEach(({ kind, id, data }) => {
    const key = keyOf(kind, id);
    if (data === null) delete next[key];
    else next[key] = data;
  });
  return next;
}

/** Keeps the order this phone already had, with newcomers after it in a stable order. */
const ordered = <T extends { id: string }>(items: T[], previousOrder: string[]) => {
  const rank = new Map(previousOrder.map((id, index) => [id, index]));
  return [...items].sort((a, b) => {
    const ra = rank.get(a.id) ?? Infinity;
    const rb = rank.get(b.id) ?? Infinity;
    if (ra !== rb) return ra - rb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
};

/**
 * Rebuilds `team` from items, keeping what belongs to this phone only: which formation is showing,
 * and the order of players and formations. Players with a place in the showing formation start.
 */
export function itemsToTeam(team: Team, items: TeamItems): Team {
  const players: PlayerType[] = [];
  const configurations: CourtConfiguration[] = [];
  const places: { formationId: string; playerId: string; place: Position }[] = [];
  let name = team.name;
  let sport = team.sport;

  Object.entries(items).forEach(([key, data]) => {
    const { kind, id } = splitKey(key);
    if (kind === 'team') {
      name = data.name as string;
      sport = data.sport as Sport;
    } else if (kind === 'player') {
      players.push({ id, name: data.name as string, position: data.position as string });
    } else if (kind === 'formation') {
      configurations.push({ id, name: data.name as string, playerPositions: {} });
    } else if (kind === 'place') {
      const [formationId, playerId] = id.split(':');
      places.push({ formationId, playerId, place: { x: data.x as number, y: data.y as number } });
    }
  });

  const playerIds = new Set(players.map(player => player.id));
  const byId = new Map(configurations.map(configuration => [configuration.id, configuration]));
  places.forEach(({ formationId, playerId, place }) => {
    const configuration = byId.get(formationId);
    if (configuration && playerIds.has(playerId)) configuration.playerPositions[playerId] = place;
  });

  const previousPlayers = [...team.startingPlayers, ...team.benchPlayers].map(player => player.id);
  const sortedPlayers = ordered(players, previousPlayers);
  const sortedConfigurations = ordered(configurations, (team.configurations ?? []).map(c => c.id));
  const selected =
    sortedConfigurations.find(configuration => configuration.id === team.selectedConfigurationId) ??
    sortedConfigurations[0];
  const placesShown = selected?.playerPositions ?? {};

  return {
    ...team,
    name,
    sport,
    configurations: sortedConfigurations,
    selectedConfigurationId: selected?.id,
    startingPlayers: sortedPlayers
      .filter(player => placesShown[player.id])
      .map(player => ({ ...player, courtPosition: placesShown[player.id] })),
    benchPlayers: sortedPlayers.filter(player => !placesShown[player.id]),
  };
}
