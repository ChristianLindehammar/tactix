import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTeam } from '@/context/TeamContext';
import { useTranslation } from '@/hooks/useTranslation';
import { CustomInputDialog } from './CustomInputDialog';

interface CourtConfigurationSelectorProps {
  onLongPress?: () => void;
}

export const CourtConfigurationSelector: React.FC<CourtConfigurationSelectorProps> = ({ onLongPress }) => {
  const { team, switchToPreviousConfiguration, switchToNextConfiguration, createConfiguration, renameConfiguration, deleteConfiguration, getActiveConfiguration } = useTeam();
  const { t } = useTranslation();
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (!team || !team.configurations || team.configurations.length === 0) {
    return null;
  }

  const activeConfig = getActiveConfiguration();
  const configCount = team.configurations.length;

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    } else {
      // Show options menu
      Alert.alert(
        t('configurationOptions') || 'Configuration Options',
        '',
        [
          {
            text: t('createNew') || 'Create New',
            onPress: () => setShowCreateDialog(true),
          },
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
    }
  };

  const handleCreate = (name: string) => {
    if (name.trim()) {
      createConfiguration(name.trim());
    }
    setShowCreateDialog(false);
  };

  const handleRename = (name: string) => {
    if (name.trim() && activeConfig) {
      renameConfiguration(activeConfig.id, name.trim());
    }
    setShowRenameDialog(false);
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: backgroundColor as string }]}>
        <TouchableOpacity
          onPress={switchToPreviousConfiguration}
          style={styles.arrowButton}
          disabled={configCount <= 1}
        >
          <IconSymbol
            name="chevron.left"
            size={24}
            color={configCount > 1 ? (tintColor as string) : '#999'}
          />
        </TouchableOpacity>

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

        <TouchableOpacity
          onPress={switchToNextConfiguration}
          style={styles.arrowButton}
          disabled={configCount <= 1}
        >
          <IconSymbol
            name="chevron.right"
            size={24}
            color={configCount > 1 ? (tintColor as string) : '#999'}
          />
        </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  arrowButton: {
    padding: 8,
  },
  nameContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  nameText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

