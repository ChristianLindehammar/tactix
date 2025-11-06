import { NavigationProp, useNavigation } from '@react-navigation/native';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import React, { useEffect, useRef, useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '@/constants/layout';
import { PlayerListItem } from '@/components/PlayerListItem';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TooltipModal } from '@/components/TooltipModal';
import { useTeam } from '@/context/TeamContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

type RootStackParamList = {
  'modal/teamModal': undefined;
};


export default function TeamScreen() {
  const { team, teams, addPlayer } = useTeam();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const textColor = useThemeColor({}, 'text') as string;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const textInputRef = useRef<TextInput>(null);
  const { t } = useTranslation();

  // Get all players combined
  const allPlayers = [...(team?.startingPlayers ?? []), ...(team?.benchPlayers ?? [])];

  useEffect(() => {
    if (teams.length > 0 && team && allPlayers.length === 0) {
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.measure((_x, _y, width, height, pageX, pageY) => {
            setTooltipPosition({
              x: pageX + width / 2,
              y: pageY + height + 10,
            });
          });
        }
        setShowTooltip(true);
      }, 1000); // Small delay to ensure layout is complete

      const timer = setTimeout(() => setShowTooltip(false), 5000);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [teams, team, allPlayers.length]);

  const handleAddPlayer = () => {
    if (newPlayerName.trim() !== '') {
      addPlayer(newPlayerName);
      setNewPlayerName('');
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {teams.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <ThemedText>{t('noTeamsExist')}</ThemedText>
            <ThemedButton onPress={() => navigation.navigate('modal/teamModal')}>{t('createTeam')}</ThemedButton>
          </View>
        ) : (
          <ThemedView style={[styles.container, { paddingBottom: LAYOUT.TAB_BAR_HEIGHT }]}>
            <ThemedText style={styles.teamName}>{team?.name}</ThemedText>

            <TooltipModal visible={showTooltip} onClose={() => setShowTooltip(false)} message={t('startByAddingPlayers')} position={tooltipPosition} />

            <ThemedView style={styles.addPlayerContainer}>
              <TextInput ref={textInputRef} style={[styles.input, { color: textColor }]} placeholder={t('enterPlayerName')} value={newPlayerName} onChangeText={setNewPlayerName} />
              <ThemedButton onPress={handleAddPlayer} disabled={newPlayerName.trim() === ''}>
                {t('addPlayer')}
              </ThemedButton>
            </ThemedView>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              <ThemedText style={styles.headerText}>{t('players')}</ThemedText>
              {allPlayers.length === 0 ? (
                <ThemedText style={styles.emptyText}>{t('noPlayersYet')}</ThemedText>
              ) : (
                allPlayers.map((player) => (
                  <PlayerListItem key={player.id} player={player} isOnCourt={false} />
                ))
              )}
              <View style={styles.listFooter} />
            </ScrollView>
          </ThemedView>
        )}
      </SafeAreaView>
      <Pressable style={styles.fab} onPress={() => navigation.navigate('modal/teamModal')}>
        <Ionicons name='people-outline' size={28} color='white' />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  listFooter: {
    paddingBottom: 80,
  },
  addPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 8,
    marginRight: 8,
  },
  playerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  player: {
    fontSize: 16,
  },
  sectionContainer: {
    margin: 16,
    flex: 1,
  },
  headerText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
    opacity: 0.6,
  },
  teamName: {
    textAlign: 'center',
    padding: 16,
    fontSize: 18,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: Platform.OS === 'android' ? 30 : 100,
    backgroundColor: '#0097B2',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    fontSize: 24,
    color: 'white',
    textAlign: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
});
