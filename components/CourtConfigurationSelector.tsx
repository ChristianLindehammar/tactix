import { Alert, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { CustomInputDialog } from './CustomInputDialog';
import { IconSymbol } from './ui/IconSymbol';
import { ThemedText } from './ThemedText';
import { TeamSwitcherButton } from './team/TeamSwitcherButton';
import { TeamSwitcherSheet } from './team/TeamSwitcherSheet';
import { useTeam } from '@/context/TeamContext';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

export const CourtConfigurationSelector: React.FC = () => {
  const {
    team,
    switchToPreviousConfiguration,
    switchToNextConfiguration,
    createConfiguration,
    renameConfiguration,
    deleteConfiguration
  } = useTeam();
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const tintColor = useThemeColor({}, 'tint');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showTeamSwitcher, setShowTeamSwitcher] = useState(false);

  if (!team || !team.configurations || team.configurations.length === 0) {
    return null;
  }

  const configCount = team.configurations.length;
  const currentIndex = team.configurations.findIndex(c => c.id === team.selectedConfigurationId);
  const activeConfig = team.configurations[currentIndex];

  const handleCreate = (name: string) => {
    if (name.trim()) {
      createConfiguration(name.trim());
      // createConfiguration already selects the new configuration automatically
    }
    setShowCreateDialog(false);
  };

  const handleRename = (name: string) => {
    if (name.trim() && activeConfig) {
      renameConfiguration(activeConfig.id, name.trim());
    }
    setShowRenameDialog(false);
  };

  const handleLongPress = () => {
    // Show options menu for rename and delete only
    Alert.alert(
      t('configurationOptions') || 'Configuration Options',
      '',
      [
        {
          text: t('rename') || 'Rename',
          onPress: () => setShowRenameDialog(true),
        },
        configCount > 1 && {
          text: t('delete') || 'Delete',
          onPress: () => {
            // Re-check config count before showing delete confirmation
            // (in case configurations changed since menu was opened)
            if (!team.configurations || team.configurations.length <= 1) {
              Alert.alert(
                t('error') || 'Error',
                'Cannot delete the last configuration.',
                [{ text: 'OK' }]
              );
              return;
            }

            Alert.alert(
              t('confirmDelete') || 'Confirm Delete',
              t('deleteConfigurationConfirm') || `Are you sure you want to delete "${activeConfig?.name}"?`,
              [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                {
                  text: t('delete') || 'Delete',
                  style: 'destructive',
                  onPress: () => {
                    if (activeConfig) {
                      deleteConfiguration(activeConfig.id);
                    }
                  },
                },
              ]
            );
          },
          style: 'destructive' as const,
        },
        {
          text: t('cancel') || 'Cancel',
          style: 'cancel',
        },
      ].filter(Boolean) as any
    );
  };

  // Determine which buttons to show
  const showLeftArrow = configCount > 1 && currentIndex > 0;
  const showRightArrow = configCount > 1 && currentIndex < configCount - 1;

  return (
    <>
      <View style={styles.header}>
        <ThemedText type="title">{t('playGround')}</ThemedText>
        <Pressable
          onPress={() => setShowCreateDialog(true)}
          accessibilityRole="button"
          accessibilityLabel={t('createConfiguration')}
          hitSlop={8}
        >
          <MaterialIcons name="add-circle" size={36} color={tintColor as string} />
        </Pressable>
      </View>

      <View style={styles.team}>
        <TeamSwitcherButton variant="compact" onPress={() => setShowTeamSwitcher(true)} />
      </View>

      <View style={[styles.container, { backgroundColor: backgroundColor as string }]}>
        {/* Left arrow - only show when not on first config */}
        {showLeftArrow ? (
          <TouchableOpacity
            onPress={() => {
              switchToPreviousConfiguration();
            }}
            style={styles.arrowButton}
          >
            <IconSymbol
              name="chevron.left"
              size={20}
              color={tintColor as string}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.arrowButton} />
        )}

        {/* Configuration name - long press for rename/delete */}
        <TouchableOpacity
          onPress={() => {}}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={styles.nameContainer}
        >
          <ThemedText style={styles.nameText}>
            {activeConfig?.name || 'Configuration'}
          </ThemedText>
        </TouchableOpacity>

        {showRightArrow ? (
          <TouchableOpacity
            onPress={() => {
              switchToNextConfiguration();
            }}
            style={styles.arrowButton}
          >
            <IconSymbol
              name="chevron.right"
              size={20}
              color={tintColor as string}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.arrowButton} />
        )}
      </View>

      <TeamSwitcherSheet visible={showTeamSwitcher} onClose={() => setShowTeamSwitcher(false)} />

      <CustomInputDialog
        visible={showCreateDialog}
        title={t('createConfiguration') || 'Create Configuration'}
        onCancel={() => setShowCreateDialog(false)}
        onSubmit={handleCreate}
        initialValue=""
      />

      <CustomInputDialog
        visible={showRenameDialog}
        title={t('renameConfiguration') || 'Rename Configuration'}
        onCancel={() => setShowRenameDialog(false)}
        onSubmit={handleRename}
        initialValue={activeConfig?.name || ''}
      />
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  team: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  arrowButton: {
    padding: 6,
    minWidth: 32,
  },
  nameContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

