import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useState } from 'react';
import { AppState } from 'react-native';

import { useSharedTeams } from '@/context/hooks/useSharedTeams';
import { AuthState } from '@/services/authSession';
import { TeamSharingError } from '@/services/teamSharing';
import { asyncStorageSyncStore, createTeamSync } from '@/services/teamSync';
import { Team } from '@/types/models';
import { TeamChange } from '@/utils/teamItems';

/** Signed in as one account at a time, like the phone's session. */
function fakeAuth(initial: AuthState) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    signInAs: (userId: string) => {
      state = { status: 'signedIn', userId, email: `${userId}@example.com` };
      listeners.forEach(listener => listener());
    },
    signOut: () => {
      state = { status: 'signedOut' };
      listeners.forEach(listener => listener());
    },
  };
}

/** Behaves like the server: only a team's members can reach it, and each answers as the signed-in account. */
function fakeServer(auth: ReturnType<typeof fakeAuth>) {
  const teams = new Map<string, { members: Map<string, 'owner' | 'editor'>; revision: number; items: Map<string, { change: TeamChange; revision: number }> }>();
  const caller = () => {
    const state = auth.getState();
    if (state.status !== 'signedIn') throw new TeamSharingError('signedOut');
    return state.userId;
  };
  const membership = (id: string) => {
    const team = teams.get(id);
    const role = team?.members.get(caller());
    if (!team || !role) throw new TeamSharingError('notFound');
    return { team, role };
  };
  const sync = async (id: string, since: number, changes: TeamChange[]) => {
    const { team, role } = membership(id);
    if (changes.length) {
      team.revision += 1;
      changes.forEach(change => team.items.set(`${change.kind}/${change.id}`, { change, revision: team.revision }));
    }
    const from = since > team.revision ? 0 : since;
    const items = [...team.items.values()].filter(item => item.revision > from).map(item => item.change);
    return { revision: team.revision, role, items };
  };
  return {
    /** A team on the server with the given members, as another coach left it. */
    addTeam: (id: string, members: Record<string, 'owner' | 'editor'>, name: string) => {
      teams.set(id, {
        members: new Map(Object.entries(members)),
        revision: 1,
        items: new Map<string, { change: TeamChange; revision: number }>([
          ['team/team', { change: { kind: 'team', id: 'team', data: { name, sport: 'floorball' } }, revision: 1 }],
          ['player/ella', { change: { kind: 'player', id: 'ella', data: { name: 'Ella', position: 'forward' } }, revision: 1 }],
        ]),
      });
    },
    rename: (id: string, name: string) => {
      const team = teams.get(id)!;
      team.revision += 1;
      team.items.set('team/team', { change: { kind: 'team', id: 'team', data: { name, sport: 'floorball' } }, revision: team.revision });
    },
    removeMember: (id: string, userId: string) => void teams.get(id)!.members.delete(userId),
    api: {
      create: async (id: string) => {
        teams.set(id, { members: new Map([[caller(), 'owner']]), revision: 0, items: new Map() });
      },
      sync,
      acceptInvite: async (code: string) => {
        const team = teams.get(code);
        if (!team) throw new TeamSharingError('inviteNotFound');
        const userId = caller();
        if (!team.members.has(userId)) team.members.set(userId, 'editor');
        return { teamId: code, role: team.members.get(userId)! };
      },
      list: async () => [...teams.entries()]
        .filter(([, team]) => team.members.has(caller()))
        .map(([id, team]) => ({ id, role: team.members.get(caller())!, name: null, sport: null })),
      delete: async () => undefined,
      members: async () => [],
      removeMember: async () => undefined,
    },
  };
}

const buildTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'local-1',
  name: 'F2012',
  sport: 'floorball',
  createdBy: '',
  sharedWith: [],
  lastEdited: 0,
  editedBy: '',
  startingPlayers: [],
  benchPlayers: [],
  configurations: [{ id: 'f1', name: 'Standard', playerPositions: {} }],
  selectedConfigurationId: 'f1',
  ...overrides,
});

function setup(initialTeams: Team[], prepare: (server: ReturnType<typeof fakeServer>) => void, signedInAs = 'coach-a') {
  const auth = fakeAuth({ status: 'signedIn', userId: signedInAs, email: `${signedInAs}@example.com` });
  const server = fakeServer(auth);
  prepare(server);
  const sync = createTeamSync({ api: server.api, store: asyncStorageSyncStore, newId: () => 'shared-new' });
  const onSharingLost = jest.fn();
  const services = { api: server.api, sync, auth };
  const hook = renderHook(() => {
    const [teams, setTeams] = useState(initialTeams);
    const shared = useSharedTeams({ teams, setTeams, isLoading: false, onSharingLost, services });
    return { teams, ...shared };
  });
  return { ...hook, auth, server, onSharingLost };
}

const linkOf = (teams: Team[]) => teams.find(team => team.id === 'local-1')?.shared;
const playerNames = (team: Team) => [...team.startingPlayers, ...team.benchPlayers].map(player => player.name);

beforeEach(async () => {
  await AsyncStorage.clear();
  // In the foreground, as when a coach has the app open
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true });
});

it('keeps a shared team linked when the phone signs in to another account', async () => {
  const { result, auth, onSharingLost, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'owner', accountId: 'coach-a' } })],
    server => server.addTeam('f2012', { 'coach-a': 'owner' }, 'F2012'),
  );
  await waitFor(() => expect(playerNames(result.current.teams[0])).toContain('Ella'));

  act(() => auth.signInAs('coach-b'));
  await act(() => result.current.syncNow('local-1'));
  await act(() => new Promise(resolve => setTimeout(resolve, 50)));

  expect(linkOf(result.current.teams)).toEqual({ id: 'f2012', role: 'owner', accountId: 'coach-a', accountEmail: 'coach-a@example.com' });
  expect(onSharingLost).not.toHaveBeenCalled();
  unmount();
});

it('picks up where it left off when the phone signs back in to that account', async () => {
  const { result, auth, server, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'owner', accountId: 'coach-a' } })],
    server => server.addTeam('f2012', { 'coach-a': 'owner', 'coach-c': 'editor' }, 'F2012'),
  );
  await waitFor(() => expect(playerNames(result.current.teams[0])).toContain('Ella'));
  act(() => auth.signInAs('coach-b'));

  server.rename('f2012', 'F2012 Röd');
  act(() => auth.signInAs('coach-a'));

  await waitFor(() => expect(result.current.teams[0].name).toBe('F2012 Röd'));
  expect(linkOf(result.current.teams)).toEqual({ id: 'f2012', role: 'owner', accountId: 'coach-a', accountEmail: 'coach-a@example.com' });
  unmount();
});

it('still ends sharing when the owner removes this coach', async () => {
  const { result, server, onSharingLost, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'editor', accountId: 'coach-a' } })],
    server => server.addTeam('f2012', { 'coach-c': 'owner', 'coach-a': 'editor' }, 'F2012'),
  );
  await waitFor(() => expect(playerNames(result.current.teams[0])).toContain('Ella'));

  server.removeMember('f2012', 'coach-a');
  await act(() => result.current.syncNow('local-1'));

  await waitFor(() => expect(linkOf(result.current.teams)).toBeUndefined());
  expect(onSharingLost).toHaveBeenCalledTimes(1);
  unmount();
});

it('remembers the account for a team shared before accounts were kept', async () => {
  const { result, auth, onSharingLost, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'owner' } })],
    server => server.addTeam('f2012', { 'coach-a': 'owner' }, 'F2012'),
  );
  await waitFor(() => expect(linkOf(result.current.teams)?.accountId).toBe('coach-a'));

  act(() => auth.signInAs('coach-b'));
  await act(() => result.current.syncNow('local-1'));

  expect(linkOf(result.current.teams)).toEqual({ id: 'f2012', role: 'owner', accountId: 'coach-a', accountEmail: 'coach-a@example.com' });
  expect(onSharingLost).not.toHaveBeenCalled();
  unmount();
});

it('joining through an invite as another account links the copy already on the phone', async () => {
  const { result, auth, server, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'owner', accountId: 'coach-a' } })],
    server => server.addTeam('f2012', { 'coach-a': 'owner' }, 'F2012'),
  );
  await waitFor(() => expect(playerNames(result.current.teams[0])).toContain('Ella'));
  act(() => auth.signInAs('coach-b'));

  server.rename('f2012', 'F2012 Röd');
  let joined: Team | undefined;
  await act(async () => {
    joined = await result.current.joinTeam('f2012');
  });

  expect(joined?.id).toBe('local-1');
  await waitFor(() => expect(result.current.teams[0].name).toBe('F2012 Röd'));
  expect(result.current.teams).toHaveLength(1);
  expect(linkOf(result.current.teams)).toEqual({ id: 'f2012', role: 'editor', accountId: 'coach-b', accountEmail: 'coach-b@example.com' });
  unmount();
});

it('signing in to another account that is in the team takes over the copy on the phone', async () => {
  const { result, auth, server, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'editor', accountId: 'coach-b' } })],
    server => server.addTeam('f2012', { 'coach-a': 'owner', 'coach-b': 'editor' }, 'F2012'),
    'coach-b',
  );
  await waitFor(() => expect(playerNames(result.current.teams[0])).toContain('Ella'));

  server.rename('f2012', 'F2012 Röd');
  act(() => auth.signInAs('coach-a'));

  await waitFor(() => expect(linkOf(result.current.teams)).toEqual({ id: 'f2012', role: 'owner', accountId: 'coach-a', accountEmail: 'coach-a@example.com' }));
  expect(result.current.teams).toHaveLength(1);
  expect(result.current.teams[0].name).toBe('F2012 Röd');
  unmount();
});

it('says a team is paused, and for which account, while another account is signed in', async () => {
  const { result, auth, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'owner' } })],
    server => server.addTeam('f2012', { 'coach-a': 'owner' }, 'F2012'),
  );
  await waitFor(() => expect(linkOf(result.current.teams)?.accountId).toBe('coach-a'));
  expect(result.current.pausedFor(result.current.teams[0])).toBeNull();

  act(() => auth.signInAs('coach-b'));

  expect(result.current.pausedFor(result.current.teams[0])).toEqual({ accountEmail: 'coach-a@example.com' });
  unmount();
});

it('says a team is paused while no one is signed in', async () => {
  const { result, auth, unmount } = setup(
    [buildTeam({ shared: { id: 'f2012', role: 'owner' } })],
    server => server.addTeam('f2012', { 'coach-a': 'owner' }, 'F2012'),
  );
  await waitFor(() => expect(linkOf(result.current.teams)?.accountId).toBe('coach-a'));

  act(() => auth.signOut());

  expect(result.current.pausedFor(result.current.teams[0])).toEqual({ accountEmail: 'coach-a@example.com' });
  unmount();
});
