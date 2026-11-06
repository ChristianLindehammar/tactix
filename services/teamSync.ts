import AsyncStorage from '@react-native-async-storage/async-storage';

import { Team } from '@/types/models';
import { TeamSharing } from '@/services/teamSharing';
import { applyChanges, diffItems, itemsToTeam, TeamItems, teamToItems } from '@/utils/teamItems';

/** What the server had when this phone last heard from it. */
export interface SyncState {
  revision: number;
  base: TeamItems;
}

export interface SyncStore {
  get(sharedId: string): Promise<SyncState | null>;
  set(sharedId: string, state: SyncState): Promise<void>;
  remove(sharedId: string): Promise<void>;
}

const syncKey = (sharedId: string) => `team-sync:${sharedId}`;

export const asyncStorageSyncStore: SyncStore = {
  get: async sharedId => {
    const stored = await AsyncStorage.getItem(syncKey(sharedId));
    return stored ? (JSON.parse(stored) as SyncState) : null;
  },
  set: (sharedId, state) => AsyncStorage.setItem(syncKey(sharedId), JSON.stringify(state)),
  remove: sharedId => AsyncStorage.removeItem(syncKey(sharedId)),
};

export interface SyncOutcome {
  /** The team's items as sent, to tell later local edits apart from what the server already has. */
  sent: TeamItems;
  /** The server's items after this sync. */
  base: TeamItems;
  role: 'owner' | 'editor';
}

/**
 * Applies the server's items to the team as it is now. Edits made on this phone while the request
 * was out are kept on top, and go with the next sync.
 */
export function rebase(current: Team, outcome: Pick<SyncOutcome, 'sent' | 'base'>): Team {
  const editedSince = diffItems(outcome.sent, teamToItems(current));
  return itemsToTeam(current, applyChanges(outcome.base, editedSince));
}

interface TeamSyncOptions {
  api: Pick<TeamSharing, 'create' | 'sync' | 'acceptInvite'>;
  store: SyncStore;
  newId: () => string;
}

export function createTeamSync({ api, store, newId }: TeamSyncOptions) {
  const download = async (sharedId: string, localTeam: Team): Promise<Team> => {
    const result = await api.sync(sharedId, 0, []);
    const items = applyChanges({}, result.items);
    await store.set(sharedId, { revision: result.revision, base: items });
    return { ...itemsToTeam(localTeam, items), shared: { id: sharedId, role: result.role } };
  };

  const emptyTeam = (id: string): Team => ({
    id,
    name: '',
    sport: 'soccer',
    startingPlayers: [],
    benchPlayers: [],
    createdBy: '',
    sharedWith: [],
    lastEdited: Date.now(),
    editedBy: '',
    configurations: [],
  });

  return {
    /** Puts the team on the server. Its first sync uploads everything in it. */
    share: async (team: Team): Promise<Team> => {
      const sharedId = newId();
      await api.create(sharedId);
      await store.set(sharedId, { revision: 0, base: {} });
      return { ...team, shared: { id: sharedId, role: 'owner' } };
    },

    /** Joins through an invite and returns the team, ready to add. */
    join: async (code: string, localId: string): Promise<Team> => {
      const { teamId } = await api.acceptInvite(code);
      return download(teamId, emptyTeam(localId));
    },

    /** Fetches a team this coach is already in, such as on a new phone. */
    download: (sharedId: string, localId: string) => download(sharedId, emptyTeam(localId)),

    /**
     * Sends this phone's changes and fetches everyone else's. With `onlyIfChanged`, does nothing
     * unless this phone has something to send. Returns null when it did nothing.
     */
    sync: async (team: Team, { onlyIfChanged = false } = {}): Promise<SyncOutcome | null> => {
      if (!team.shared) return null;
      const sharedId = team.shared.id;
      const state = (await store.get(sharedId)) ?? { revision: 0, base: {} };
      const sent = teamToItems(team);
      const changes = diffItems(state.base, sent);
      if (onlyIfChanged && changes.length === 0) return null;

      const result = await api.sync(sharedId, state.revision, changes);
      // A full answer means the server started over, so it replaces what this phone remembered
      const known = result.revision < state.revision ? {} : applyChanges(state.base, changes);
      const base = applyChanges(known, result.items);
      await store.set(sharedId, { revision: result.revision, base });
      return { sent, base, role: result.role };
    },

    forget: (sharedId: string) => store.remove(sharedId),
  };
}

export type TeamSync = ReturnType<typeof createTeamSync>;
