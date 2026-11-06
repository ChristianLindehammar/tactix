import { useLocalSearchParams } from 'expo-router';

import { JoinTeam } from '@/components/JoinTeam';

/** Where invite links lead, through coachmate://join/<code>. */
export default function JoinFromLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <JoinTeam initialCode={code} />;
}
