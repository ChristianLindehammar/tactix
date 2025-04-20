import { Link, Stack, usePathname } from 'expo-router';
import { StyleSheet, ActivityIndicator } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import React, { useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { router } from 'expo-router';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const pathname = usePathname();
  
  // Check if this is a file URL and redirect to home if it is
  const isFileUrl = pathname && (pathname.startsWith('file:') || pathname.startsWith('content:'));
  
  useEffect(() => {
    if (isFileUrl) {
      // Redirect to home if this is a file URL
      router.replace('/');
    }
  }, [isFileUrl]);
  
  // Show loading indicator if handling a file URL
  if (isFileUrl) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <ThemedView style={styles.container}>
        <ThemedText type='title'>{t('screenNotExist')}</ThemedText>
        <Link href='/' style={styles.link}>
          <ThemedText type='link'>{t('goToHome')}</ThemedText>
        </Link>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
