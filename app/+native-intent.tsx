// A team file opened from another app arrives as a file:// or content:// URL.
// It isn't a route: the team tab picks the URL up through Linking and imports it,
// so the router only needs to land there instead of on the not-found screen.
const isTeamFileUrl = (path: string) => path.startsWith('file:') || path.startsWith('content:');

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return isTeamFileUrl(path) ? '/' : path;
}
