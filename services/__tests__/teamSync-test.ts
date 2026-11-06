import { Team } from '@/types/models';
import { TeamSharingError } from '@/services/teamSharing';
import { createTeamSync, rebase, SyncState, SyncStore } from '@/services/teamSync';
import { TeamChange } from '@/utils/teamItems';

/** Behaves like the server: one revision per sync, and the last change to an item wins. */
function fakeServer() {
  const teams = new Map<string, { revision: number; items: Map<string, { change: TeamChange; revision: number }> }>();
  const invites = new Map<string, string>();
  return {
    invites,
    calls: [] as { since: number; changes: TeamChange[] }[],
    create: async (id: string) => {
      teams.set(id, { revision: 0, items: new Map() });
    },
    acceptInvite: async (code: string) => {
      const teamId = invites.get(code);
      if (!teamId) throw new TeamSharingError('inviteNotFound');
      return { teamId, role: 'editor' as const };
    },
    sync: async function (id: string, since: number, changes: TeamChange[]) {
      this.calls.push({ since, changes });
      const team = teams.get(id);
      if (!team) throw new TeamSharingError('notFound');
      if (changes.length) {
        team.revision += 1;
        changes.forEach(change => team.items.set(`${change.kind}/${change.id}`, { change, revision: team.revision }));
      }
      const from = since > team.revision ? 0 : since;
      const items = [...team.items.values()].filter(item => item.revision > from).map(item => item.change);
      return { revision: team.revision, role: 'owner' as const, items };
    },
  };
}

function memoryStore(): SyncStore & { states: Map<string, SyncState> } {
  const states = new Map<string, SyncState>();
  return {
    states,
    get: async id => states.get(id) ?? null,
    set: async (id, state) => void states.set(id, state),
    remove: async id => void states.delete(id),
  };
}

const buildTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'local-1',
  name: 'U12 Blå',
  sport: 'floorball',
  createdBy: '',
  sharedWith: [],
  lastEdited: 0,
  editedBy: '',
  startingPlayers: [{ id: 'p1', name: 'Alva', position: 'forward', courtPosition: { x: 0.25, y: 0.5 } }],
  benchPlayers: [{ id: 'p2', name: 'Bo', position: 'defender' }],
  configurations: [{ id: 'f1', name: 'Standard', playerPositions: { p1: { x: 0.25, y: 0.5 } } }],
  selectedConfigurationId: 'f1',
  ...overrides,
});

const movePlayer = (team: Team, playerId: string, x: number, y: number): Team => ({
  ...team,
  configurations: team.configurations!.map(c =>
    c.id === team.selectedConfigurationId ? { ...c, playerPositions: { ...c.playerPositions, [playerId]: { x, y } } } : c,
  ),
});

/** One phone: its own sync state, sharing the server. */
const phone = (server: ReturnType<typeof fakeServer>) =>
  createTeamSync({ api: server, store: memoryStore(), newId: () => 'shared-1' });

async function syncAndApply(sync: ReturnType<typeof phone>, team: Team) {
  const outcome = await sync.sync(team);
  return outcome ? rebase(team, outcome) : team;
}

describe('team sync', () => {
  it('uploads the whole team on its first sync', async () => {
    const server = fakeServer();
    const owner = phone(server);
    const shared = await owner.share(buildTeam());

    await owner.sync(shared);

    expect(shared.shared).toEqual({ id: 'shared-1', role: 'owner' });
    expect(server.calls[0].changes).toHaveLength(5);
  });

  it('sends only what changed after that', async () => {
    const server = fakeServer();
    const owner = phone(server);
    let team = await syncAndApply(owner, await owner.share(buildTeam()));

    team = movePlayer(team, 'p1', 0.4, 0.4);
    await owner.sync(team);

    expect(server.calls[1]).toEqual({
      since: 1,
      changes: [{ kind: 'place', id: 'f1:p1', data: { x: 0.4, y: 0.4 } }],
    });
  });

  it('skips the request when asked to and nothing changed', async () => {
    const server = fakeServer();
    const owner = phone(server);
    const team = await syncAndApply(owner, await owner.share(buildTeam()));

    expect(await owner.sync(team, { onlyIfChanged: true })).toBeNull();
    expect(server.calls).toHaveLength(1);
  });

  it('gives a joining coach the whole team', async () => {
    const server = fakeServer();
    const owner = phone(server);
    const team = await syncAndApply(owner, await owner.share(buildTeam()));
    server.invites.set('CODE', team.shared!.id);

    const joined = await phone(server).join('CODE', 'local-9');

    expect(joined.id).toBe('local-9');
    expect(joined.name).toBe('U12 Blå');
    expect(joined.startingPlayers.map(p => p.id)).toEqual(['p1']);
    expect(joined.benchPlayers.map(p => p.id)).toEqual(['p2']);
    expect(joined.shared).toEqual({ id: 'shared-1', role: 'owner' });
  });

  it('keeps both coaches’ moves of different players', async () => {
    const server = fakeServer();
    const ownerSync = phone(server);
    let owners = await syncAndApply(ownerSync, await ownerSync.share(buildTeam()));
    server.invites.set('CODE', owners.shared!.id);
    const assistantSync = phone(server);
    let assistants = await assistantSync.join('CODE', 'local-9');

    owners = await syncAndApply(ownerSync, movePlayer(owners, 'p1', 0.1, 0.1));
    assistants = await syncAndApply(assistantSync, movePlayer(assistants, 'p2', 0.9, 0.9));
    owners = await syncAndApply(ownerSync, owners);

    const places = (team: Team) => team.configurations![0].playerPositions;
    expect(places(owners)).toEqual({ p1: { x: 0.1, y: 0.1 }, p2: { x: 0.9, y: 0.9 } });
    expect(places(assistants)).toEqual(places(owners));
    expect(owners.startingPlayers.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('keeps an edit made while the request was out', async () => {
    const server = fakeServer();
    const owner = phone(server);
    const team = await syncAndApply(owner, await owner.share(buildTeam()));

    const outcome = await owner.sync(team);
    const editedMeanwhile = movePlayer(team, 'p1', 0.8, 0.8);

    expect(rebase(editedMeanwhile, outcome!).configurations![0].playerPositions.p1).toEqual({ x: 0.8, y: 0.8 });
    // And it goes with the next sync
    await owner.sync(rebase(editedMeanwhile, outcome!));
    expect(server.calls.at(-1)!.changes).toEqual([{ kind: 'place', id: 'f1:p1', data: { x: 0.8, y: 0.8 } }]);
  });

  it('takes a player another coach removed', async () => {
    const server = fakeServer();
    const ownerSync = phone(server);
    let owners = await syncAndApply(ownerSync, await ownerSync.share(buildTeam()));
    server.invites.set('CODE', owners.shared!.id);
    const assistantSync = phone(server);
    const assistants = await assistantSync.join('CODE', 'local-9');

    await syncAndApply(assistantSync, { ...assistants, benchPlayers: [] });
    owners = await syncAndApply(ownerSync, owners);

    expect(owners.benchPlayers).toEqual([]);
  });

  it('starts over when the server knows less than this phone', async () => {
    const server = fakeServer();
    const store = memoryStore();
    const sync = createTeamSync({ api: server, store, newId: () => 'shared-1' });
    const team = await syncAndApply(sync, await sync.share(buildTeam()));
    store.states.set('shared-1', { revision: 50, base: { 'player/gone': { name: 'Gone', position: 'forward' } } });

    const outcome = await sync.sync(team);

    expect(outcome!.base['player/gone']).toBeUndefined();
    expect(outcome!.base['player/p1']).toEqual({ name: 'Alva', position: 'forward' });
  });

  it('passes on that the team is gone', async () => {
    const server = fakeServer();
    const sync = phone(server);
    const team = { ...buildTeam(), shared: { id: 'missing', role: 'editor' as const } };

    await expect(sync.sync(team)).rejects.toEqual(new TeamSharingError('notFound'));
  });
});
