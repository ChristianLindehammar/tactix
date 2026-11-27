import { randomUUID } from 'expo-crypto';
import React, { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { authSession } from '@/services/account';
import { TeamSharing, teamSharing, TeamSharingError } from '@/services/teamSharing';
import { asyncStorageSyncStore, createTeamSync, rebase, SyncOutcome, TeamSync } from '@/services/teamSync';
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

type Auth = Pick<typeof authSession, 'getState' | 'subscribe'>;

interface Services {
  api: Pick<TeamSharing, 'list' | 'delete' | 'members' | 'removeMember' | 'acceptInvite'>;
  sync: TeamSync;
  auth: Auth;
}

const liveServices: Services = { api: teamSharing, sync: teamSync, auth: authSession };

interface Options {
  teams: Team[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>;
  isLoading: boolean;
  /** A team stopped being shared without this coach asking, such as when the owner removed them. */
  onSharingLost: (team: Team) => void;
  /** The server and sign-in this works with. Tests pass their own, the same object on every render. */
  services?: Services;
}

/** Keeps shared teams in step with the server, and starts, joins and leaves sharing. */
export function useSharedTeams({ teams, setTeams, isLoading, onSharingLost, services = liveServices }: Options) {
  const currentAccount = useCallback(() => {
    const state = services.auth.getState();
    return state.status === 'signedIn' ? state.userId : null;
  }, [services]);
  // Changes with every sign-in, so another account's teams are looked at again
  const account = useSyncExternalStore(services.auth.subscribe, currentAccount);
  const teamsRef = useRef(teams);
  teamsRef.current = teams;
  const onSharingLostRef = useRef(onSharingLost);
  onSharingLostRef.current = onSharingLost;
  const inFlight = useRef(new Set<string>());
  const rerun = useRef(new Set<string>());

  const apply = useCallback((localId: string, sharedId: string, accountId: string, outcome: SyncOutcome) => {
    setTeams(previous => previous.map(team => {
      if (team.id !== localId || team.shared?.id !== sharedId) return team;
      const next = { ...rebase(team, outcome), shared: { id: sharedId, role: outcome.role, accountId } };
      // Nothing new keeps the same object, so the screen and storage don't redo their work
      const same =
        JSON.stringify(teamToItems(next)) === JSON.stringify(teamToItems(team)) &&
        next.shared.role === team.shared.role &&
        next.shared.accountId === team.shared.accountId &&
        next.selectedConfigurationId === team.selectedConfigurationId;
      return same ? team : next;
    }));
  }, [setTeams]);

  const lose = useCallback((localId: string, sharedId: string) => {
    const team = teamsRef.current.find(candidate => candidate.id === localId);
    setTeams(previous => previous.map(candidate =>
      candidate.id === localId && candidate.shared?.id === sharedId ? unshared(candidate) : candidate,
    ));
    void services.sync.forget(sharedId);
    if (team) onSharingLostRef.current(team);
  }, [setTeams, services]);

  const syncTeam = useCallback(async (localId: string, onlyIfChanged: boolean) => {
    if (inFlight.current.has(localId)) {
      rerun.current.add(localId);
      return;
    }
    const team = teamsRef.current.find(candidate => candidate.id === localId);
    const accountId = currentAccount();
    if (!team?.shared || !accountId) return;
    // Shared under another account: it waits for that one, as this account can't reach it
    if (team.shared.accountId && team.shared.accountId !== accountId) return;
    const sharedId = team.shared.id;

    inFlight.current.add(localId);
    try {
      const outcome = await services.sync.sync(team, { onlyIfChanged });
      if (outcome) apply(localId, sharedId, accountId, outcome);
    } catch (error) {
      if (error instanceof TeamSharingError && error.code === 'notFound') lose(localId, sharedId);
      // Anything else, such as being offline, waits for the next try
    } finally {
      inFlight.current.delete(localId);
      if (rerun.current.delete(localId)) void syncTeam(localId, true);
    }
  }, [apply, lose, currentAccount, services]);

  const syncAll = useCallback((onlyIfChanged: boolean) => {
    teamsRef.current.filter(team => team.shared).forEach(team => void syncTeam(team.id, onlyIfChanged));
  }, [syncTeam]);

  // Sends this phone's edits soon after they happen
  useEffect(() => {
    if (isLoading || !account) return;
    const timer = setTimeout(() => syncAll(true), CHANGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [teams, isLoading, account, syncAll]);

  // Fetches other coaches' edits while the app is open
  useEffect(() => {
    if (isLoading || !account) return;
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
  }, [isLoading, account, syncAll]);

  // Brings this coach's shared teams to a phone that doesn't have them yet, such as a new one. A
  // copy kept for another account is replaced by the server's team, now linked to this one.
  useEffect(() => {
    if (isLoading || !account) return;
    let cancelled = false;
    (async () => {
      try {
        const remote = await services.api.list();
        for (const summary of remote) {
          if (cancelled) return;
          const existing = teamsRef.current.find(team => team.shared?.id === summary.id);
          if (existing && (!existing.shared?.accountId || existing.shared.accountId === account)) continue;
          const downloaded = await services.sync.download(summary.id, existing?.id ?? newLocalId());
          if (cancelled) return;
          const team = { ...downloaded, shared: { ...downloaded.shared!, accountId: account } };
          setTeams(previous => {
            const current = previous.find(candidate => candidate.shared?.id === summary.id);
            if (!current) return [...previous, team];
            if (current.shared?.accountId === account) return previous;
            return previous.map(candidate => (candidate === current ? { ...team, id: current.id } : candidate));
          });
        }
      } catch {
        // Tried again at the next launch or sign-in
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, account, setTeams, services]);

  const replaceTeam = (localId: string, update: (team: Team) => Team) =>
    setTeams(previous => previous.map(team => (team.id === localId ? update(team) : team)));

  return {
    shareTeam: async (localId: string) => {
      const team = teamsRef.current.find(candidate => candidate.id === localId);
      if (!team || team.shared) return;
      const shared = await services.sync.share(team);
      replaceTeam(localId, current => ({ ...current, shared: shared.shared }));
      // Uploads it at once rather than at the next edit
      teamsRef.current = teamsRef.current.map(candidate => (candidate.id === localId ? { ...candidate, shared: shared.shared } : candidate));
      await syncTeam(localId, false);
    },

    /**
     * Returns the local team, already on this phone or new. A copy kept for another account is
     * replaced by the server's team, now linked to this account.
     */
    joinTeam: async (code: string): Promise<Team> => {
      const accountId = currentAccount();
      const { teamId } = await services.api.acceptInvite(code);
      const existing = teamsRef.current.find(candidate => candidate.shared?.id === teamId);
      if (existing && (!existing.shared?.accountId || existing.shared.accountId === accountId)) return existing;

      const downloaded = await services.sync.download(teamId, existing?.id ?? newLocalId());
      const team = { ...downloaded, shared: { ...downloaded.shared!, ...(accountId ? { accountId } : {}) } };
      setTeams(previous => (existing
        ? previous.map(candidate => (candidate.id === existing.id ? team : candidate))
        : [...previous, team]));
      return team;
    },

    /** The owner stops sharing for everyone. Every coach keeps their copy. */
    stopSharing: async (localId: string) => {
      const sharedId = teamsRef.current.find(team => team.id === localId)?.shared?.id;
      if (!sharedId) return;
      await services.api.delete(sharedId);
      await services.sync.forget(sharedId);
      replaceTeam(localId, unshared);
    },

    /** An editor leaves. They keep a copy that is only theirs. */
    leaveTeam: async (localId: string) => {
      const sharedId = teamsRef.current.find(team => team.id === localId)?.shared?.id;
      if (!sharedId) return;
      const me = (await services.api.members(sharedId)).find(member => member.isYou);
      if (me) await services.api.removeMember(sharedId, me.userId);
      await services.sync.forget(sharedId);
      replaceTeam(localId, unshared);
    },

    syncNow: (localId: string) => syncTeam(localId, false),
  };
}
