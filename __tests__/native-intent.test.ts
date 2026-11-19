import { redirectSystemPath } from '@/app/+native-intent';

describe('opening the app from a link', () => {
  it('sends a team file from a file manager to the team tab', () => {
    const path = 'content://com.android.providers.downloads.documents/document/msf%3A31';

    expect(redirectSystemPath({ path, initial: true })).toBe('/');
    expect(redirectSystemPath({ path, initial: false })).toBe('/');
  });

  it('sends a team file opened in place to the team tab', () => {
    const path = 'file:///private/var/mobile/Library/Mobile%20Documents/my_team.coachmate';

    expect(redirectSystemPath({ path, initial: true })).toBe('/');
  });

  it('leaves app links alone', () => {
    expect(redirectSystemPath({ path: 'coachmate:///exercises', initial: true })).toBe('coachmate:///exercises');
    expect(redirectSystemPath({ path: '/join/ABC123', initial: false })).toBe('/join/ABC123');
  });
});
