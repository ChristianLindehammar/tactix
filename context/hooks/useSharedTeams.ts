import { randomUUID } from 'expo-crypto';
import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { authSession } from '@/services/account';
import { teamSharing, TeamSharingError } from '@/services/teamSharing';
import { asyncStorageSyncStore, createTeamSync, rebase, SyncOutcome } from '@/services/teamSync';
import { Team } from '@/types/models';
import { teamToItems } from '@/utils/teamItems';

const POLL_MS = 15_000;
// Long enough that a drag's last moves go together, short enough to feel live to the other coach
const CHANGE_DELAY_MS = 800;

export const teamSync = createTeamSync({ api: teamSharing, store: asyncStorageSyncStore, newId: randomUUID });

const newLocalId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const unshared = (team: Team): Team => {
  const { shared: _shared, ...rest } = team;
  return rest;
};

const subscribeToAuth = (listener: () => void) => authSession.subscribe(listener);
const isSignedIn = () => authSession.getState().status === 'signedIn';

interface Options {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  isLoading: boolean;
  /** A team stopped being shared without this coach asking, such as when the owner removed them. */
  onSharingLost: (team: Team) => void;
}

/** Keeps shared teams in step with the server, and starts, joins and leaves sharing. */
export function useSharedTeams({ teams, setTeams, isLoading, onSharingLost }: Options) {
  const signedIn = useSyncExternalStore(subscribeToAuth, isSignedIn);
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const onSharingLostRef = useRef(onSharingLost);
  onSharingLostRef.current = onSharingLost;
  const inFlight = useRef(new Set<string>());
  const rerun = useRef(new Set<string>());

  const apply = useCallback((localId: string, sharedId: string, outcome: SyncOutcome) => {
    setTeams(previous => previous.map(team => {
      if (team.id !== localId || team.shared?.id !== sharedId) return team;
      const next = { ...rebase(team, outcome), shared: { id: sharedId, role: outcome.role } };
      // Nothing new keeps the same object, so the screen and storage don't redo their work
      const same =
        JSON.stringify(teamToItems(next)) === JSON.stringify(teamToItems(team)) &&
        next.shared.role === team.shared.role &&
        next.selectedConfigurationId === team.selectedConfigurationId;
      return same ? team : next;
    }));
  }, [setTeams]);

  const lose = useCallback((localId: string, sharedId: string) => {
    const team = teamsRef.current.find(candidate => candidate.id === localId);
    setTeams(previous => previous.map(candidate =>
      candidate.id === localId && candidate.shared?.id === sharedId ? unshared(candidate) : candidate,
    ));
    void teamSync.forget(sharedId);
    if (team) onSharingLostRef.current(team);
  }, [setTeams]);

  const syncTeam = useCallback(async (localId: string, onlyIfChanged: boolean) => {
    if (inFlight.current.has(localId)) {
      rerun.current.add(localId);
      return;
    }
    const team = teamsRef.current.find(candidate => candidate.id === localId);
    if (!team?.shared || !isSignedIn()) return;
    const sharedId = team.shared.id;

    inFlight.current.add(localId);
    try {
      const outcome = await teamSync.sync(team, { onlyIfChanged });
      if (outcome) apply(localId, sharedId, outcome);
    } catch (error) {
      if (error instanceof TeamSharingError && error.code === 'notFound') lose(localId, sharedId);
      // Anything else, such as being offline, waits for the next try
    } finally {
      inFlight.current.delete(localId);
      if (rerun.current.delete(localId)) void syncTeam(localId, true);
    }
  }, [apply, lose]);

  const syncAll = useCallback((onlyIfChanged: boolean) => {
    teamsRef.current.filter(team => team.shared).forEach(team => void syncTeam(team.id, onlyIfChanged));
  }, [syncTeam]);

  // Sends this phone's edits soon after they happen
  useEffect(() => {
    if (isLoading || !signedIn) return;
    const timer = setTimeout(() => syncAll(true), CHANGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [teams, isLoading, signedIn, syncAll]);

  // Fetches other coaches' edits while the app is open
  useEffect(() => {
    if (isLoading || !signedIn) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      syncAll(false);
      timer ??= setInterval(() => syncAll(false), POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', state => (state === 'active' ? start() : stop()));
    return () => {
      stop();
      subscription.remove();
    };
  }, [isLoading, signedIn, syncAll]);

  // Brings this coach's shared teams to a phone that doesn't have them yet, such as a new one
  useEffect(() => {
    if (isLoading || !signedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await teamSharing.list();
        for (const summary of remote) {
          if (cancelled || teamsRef.current.some(team => team.shared?.id === summary.id)) continue;
          const team = await teamSync.download(summary.id, newLocalId());
          if (cancelled) return;
          setTeams(previous => (previous.some(existing => existing.shared?.id === summary.id) ? previous : [...previous, team]));
        }
      } catch {
        // Tried again at the next launch or sign-in
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, signedIn, setTeams]);

  const replaceTeam = (localId: string, update: (team: Team) => Team) =>
    setTeams(previous => previous.map(team => (team.id === localId ? update(team) : team)));

  return {
    shareTeam: async (localId: string) => {
      const team = teamsRef.current.find(candidate => candidate.id === localId);
      if (!team || team.shared) return;
      const shared = await teamSync.share(team);
      replaceTeam(localId, current => ({ ...current, shared: shared.shared }));
      // Uploads it at once rather than at the next edit
      teamsRef.current = teamsRef.current.map(candidate => (candidate.id === localId ? { ...candidate, shared: shared.shared } : candidate));
      await syncTeam(localId, false);
    },

    /** Returns the local team, already on this phone or new. */
    joinTeam: async (code: string): Promise<Team> => {
      const team = await teamSync.join(code, newLocalId());
      const existing = teamsRef.current.find(candidate => candidate.shared?.id === team.shared!.id);
      if (existing) return existing;
      setTeams(previous => [...previous, team]);
      return team;
    },

    /** The owner stops sharing for everyone. Every coach keeps their copy. */
    stopSharing: async (localId: string) => {
      const sharedId = teamsRef.current.find(team => team.id === localId)?.shared?.id;
      if (!sharedId) return;
      await teamSharing.delete(sharedId);
      await teamSync.forget(sharedId);
      replaceTeam(localId, unshared);
    },

    /** An editor leaves. They keep a copy that is only theirs. */
    leaveTeam: async (localId: string) => {
      const sharedId = teamsRef.current.find(team => team.id === localId)?.shared?.id;
      if (!sharedId) return;
      const me = (await teamSharing.members(sharedId)).find(member => member.isYou);
      if (me) await teamSharing.removeMember(sharedId, me.userId);
      await teamSync.forget(sharedId);
      replaceTeam(localId, unshared);
    },

    syncNow: (localId: string) => syncTeam(localId, false),
  };
}
