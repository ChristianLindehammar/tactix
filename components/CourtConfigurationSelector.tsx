import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';

import { CustomInputDialog } from './CustomInputDialog';
import { IconSymbol } from './ui/IconSymbol';
import { ThemedText } from './ThemedText';
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
            Alert.alert(
              t('confirmDelete') || 'Confirm Delete',
              t('deleteConfigurationConfirm') || `Are you sure you want to delete "${activeConfig?.name}"?`,
              [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                {
                  text: t('delete') || 'Delete',
                  style: 'destructive',
                  onPress: () => activeConfig && deleteConfiguration(activeConfig.id),
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
  const showPlusButton = configCount === 1;

  return (
    <>
      <View style={[styles.container, { backgroundColor: backgroundColor as string }]}>
        {/* Left arrow - only show when not on first config */}
        {showLeftArrow ? (
          <TouchableOpacity
            onPress={switchToPreviousConfiguration}
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

        {/* Right side: either right arrow, plus button, or empty space */}
        {showPlusButton ? (
          <TouchableOpacity
            onPress={() => setShowCreateDialog(true)}
            style={styles.arrowButton}
          >
            <IconSymbol
              name="plus.circle.fill"
              size={20}
              color={tintColor as string}
            />
          </TouchableOpacity>
        ) : showRightArrow ? (
          <TouchableOpacity
            onPress={switchToNextConfiguration}
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

