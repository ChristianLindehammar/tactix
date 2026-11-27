import { render, screen } from '@testing-library/react-native';
import * as React from 'react';

import { TeamHeader } from '@/components/team/TeamHeader';
import { TeamContext } from '@/context/TeamContext';
import { Team } from '@/types/models';
import i18n from '@/translations/i18n';

const team = (extra: Partial<Team> = {}): Team => ({
  id: 'a',
  name: 'F2012',
  sport: 'floorball',
  createdBy: '',
  sharedWith: [],
  lastEdited: 0,
  editedBy: '',
  startingPlayers: [],
  benchPlayers: [],
  ...extra,
});

const renderHeader = (open: Team, paused: { accountEmail: string | null } | null) => {
  const value = { team: open, teams: [open], sharingPausedFor: () => paused };
  render(
    <TeamContext.Provider value={value as any}>
      <TeamHeader onSwitchTeam={jest.fn()} onTeamOptions={jest.fn()} onAddPlayers={jest.fn()} />
    </TeamContext.Provider>,
  );
};

const players = i18n.t('teamPlayerCount', { count: 0 });

it('says a shared team is shared while it syncs', () => {
  renderHeader(team({ shared: { id: 's1', role: 'owner', accountId: 'coach-a' } }), null);

  expect(screen.getByText(`${players} · ${i18n.t('sharedWithCoaches')}`)).toBeTruthy();
});

it('says which account to sign in to while a shared team is paused', () => {
  renderHeader(team({ shared: { id: 's1', role: 'owner', accountId: 'coach-a' } }), { accountEmail: 'coach@gmail.com' });

  expect(screen.getByText(`${players} · ${i18n.t('sharingPaused', { email: 'coach@gmail.com' })}`)).toBeTruthy();
  expect(screen.queryByText(new RegExp(i18n.t('sharedWithCoaches')))).toBeNull();
});
