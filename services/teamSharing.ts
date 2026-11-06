import { API_BASE_URL } from '@/constants/api';
import { Sport } from '@/constants/sports';
import { authSession } from '@/services/account';
import { TeamChange } from '@/utils/teamItems';

const REQUEST_TIMEOUT_MS = 20_000;

export type TeamRole = 'owner' | 'editor';

export type TeamSharingErrorCode =
  | 'signedOut'
  | 'offline'
  | 'unavailable'
  | 'rateLimited'
  /** The team was deleted, or this coach was removed from it. */
  | 'notFound'
  | 'inviteNotFound'
  | 'notOwner';

export class TeamSharingError extends Error {
  constructor(readonly code: TeamSharingErrorCode) {
    super(code);
    this.name = 'TeamSharingError';
  }
}

export interface SyncResult {
  revision: number;
  role: TeamRole;
  items: TeamChange[];
}

export interface SharedTeamSummary {
  id: string;
  role: TeamRole;
  name: string | null;
  sport: Sport | null;
}

export interface TeamMember {
  userId: string;
  role: TeamRole;
  displayName: string | null;
  isYou: boolean;
}

export interface InvitePreview {
  teamId: string;
  name: string | null;
  sport: Sport | null;
  ownerName: string | null;
  memberCount: number;
  /** Set when this coach is already in the team. */
  role: TeamRole | null;
}

export interface Invite {
  code: string;
  link: string;
  expiresAt: string;
}

interface TeamSharingOptions {
  baseUrl: string;
  fetch: typeof globalThis.fetch;
  getAuthHeaders: () => Promise<Record<string, string> | null>;
  onSessionRejected: () => Promise<void> | void;
}

/** Shows an invite code in readable groups, like ABCDE-FGHJK. */
export const formatInviteCode = (code: string) => code.replace(/(.{5})(?=.)/g, '$1-');

/** Finds the code in a pasted invite link, or takes what was typed as the code. */
export const inviteCodeFrom = (text: string) => {
  const fromLink = text.match(/join\/([A-Za-z0-9-]+)/);
  return (fromLink ? fromLink[1] : text).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
};

/** Teams coaches share and edit together, on the server. */
export function createTeamSharing({ baseUrl, fetch, getAuthHeaders, onSessionRejected }: TeamSharingOptions) {
  const request = async (path: string, init: RequestInit = {}, body?: unknown) => {
    const authHeaders = await getAuthHeaders();
    if (!authHeaders) throw new TeamSharingError('signedOut');
    const headers = body === undefined ? authHeaders : { 'Content-Type': 'application/json', ...authHeaders };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
    } catch {
      throw new TeamSharingError('offline');
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 401) {
      await onSessionRejected();
      throw new TeamSharingError('signedOut');
    }
    if (response.status === 429) throw new TeamSharingError('rateLimited');
    if (response.status === 403) throw new TeamSharingError('notOwner');
    if (response.status === 404) {
      const { error } = await response.json().catch(() => ({ error: null }));
      throw new TeamSharingError(error === 'inviteNotFound' ? 'inviteNotFound' : 'notFound');
    }
    if (!response.ok) throw new TeamSharingError('unavailable');
    return response;
  };

  const team = (id: string) => `/teams/${encodeURIComponent(id)}`;
  const invite = (code: string) => `/invites/${encodeURIComponent(inviteCodeFrom(code))}`;

  return {
    create: async (id: string) => {
      await request('/teams', { method: 'POST' }, { id });
    },

    list: async (): Promise<SharedTeamSummary[]> => (await (await request('/teams')).json()).teams,

    sync: async (id: string, since: number, changes: TeamChange[]): Promise<SyncResult> =>
      (await request(`${team(id)}/sync`, { method: 'POST' }, { since, changes })).json(),

    members: async (id: string): Promise<TeamMember[]> => (await (await request(`${team(id)}/members`)).json()).members,

    removeMember: async (id: string, userId: string) => {
      await request(`${team(id)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    },

    /** Stops sharing for everyone. Only the owner can. */
    delete: async (id: string) => {
      await request(team(id), { method: 'DELETE' });
    },

    createInvite: async (id: string): Promise<Invite> => {
      const { code, expiresAt } = await (await request(`${team(id)}/invites`, { method: 'POST' })).json();
      return { code, expiresAt, link: `${baseUrl}/join/${code}` };
    },

    revokeInvites: async (id: string) => {
      await request(`${team(id)}/invites`, { method: 'DELETE' });
    },

    previewInvite: async (code: string): Promise<InvitePreview> => (await request(invite(code))).json(),

    acceptInvite: async (code: string): Promise<{ teamId: string; role: TeamRole }> =>
      (await request(`${invite(code)}/accept`, { method: 'POST' })).json(),
  };
}

export type TeamSharing = ReturnType<typeof createTeamSharing>;

export const teamSharing = createTeamSharing({
  baseUrl: API_BASE_URL,
  fetch: (...args) => fetch(...args),
  getAuthHeaders: () => authSession.getAuthHeaders(),
  onSessionRejected: () => authSession.handleSessionRejected(),
});
