import { Platform, ScrollView } from 'react-native';

import { AccountPanel } from '@/components/AccountPanel';
import { ManageSubscription } from '@/components/ManageSubscription';
import { useTabBarClearance } from '@/hooks/useTabBarClearance';
import { useThemeColor } from '@/hooks/useThemeColor';
import { authSession } from '@/services/account';
import { library } from '@/services/library';
import { plans } from '@/services/plans';
import { signInProvidersFor } from '@/services/signInProviders';

const providers = signInProvidersFor(Platform.OS);

export default function AccountScreen() {
  const background = useThemeColor({}, 'background') as string;
  const tabBarClearance = useTabBarClearance();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: background }}
      contentContainerStyle={{ paddingBottom: tabBarClearance }}
      keyboardShouldPersistTaps="handled"
    >
      <AccountPanel session={authSession} providers={providers} profile={library} />
      <ManageSubscription plans={plans} />
    </ScrollView>
  );
}
