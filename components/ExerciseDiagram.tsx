import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { StepTabs } from '@/components/StepTabs';
import { TacticsBoard } from '@/components/TacticsBoard';
import { ThemedText } from '@/components/ThemedText';
import { Sport, sportsConfig } from '@/constants/sports';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { TacticsMarker } from '@/types/tacticsMarker';

export interface DiagramStep {
  id: string;
  note?: string;
  markers: TacticsMarker[];
}

interface ExerciseDiagramProps {
  sport: Sport;
  steps: DiagramStep[];
  selected: number;
  onSelect: (index: number) => void;
}

// Leaves room above and below the court for the title, step tabs and note
const MAX_HEIGHT_SHARE = 0.7;

const noop = () => {};

// How far a finger moves sideways before it counts as a swipe, and how far or fast it must go to change step
const SWIPE_START = 20;
const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 500;

/**
 * The read-only diagram of an exercise: as wide as the screen allows, with its step tabs and note.
 * Tapping the court opens it full screen, where a swipe moves between steps.
 */
export const ExerciseDiagram = ({ sport, steps, selected, onSelect }: ExerciseDiagramProps) => {
  const { t } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  // Until the first layout, assume the usual screen padding
  const [width, setWidth] = useState(windowWidth - 32);
  const [fullScreen, setFullScreen] = useState(false);

  const { aspectRatio } = sportsConfig[sport];
  const height = Math.min(width / aspectRatio, windowHeight * MAX_HEIGHT_SHARE);
  // Only the court opens full screen, and the badge sits on its corner, even when the height limits it
  const courtWidth = height * aspectRatio;
  // The steps may have changed under the selection
  const step = steps[selected] ?? steps[0];

  return (
    <View style={styles.inline} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {steps.length > 1 && <StepTabs count={steps.length} selected={selected} onSelect={onSelect} />}
      <Pressable
        onPress={() => setFullScreen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('showDiagramFullScreen')}
        style={[styles.court, { width: courtWidth, height }]}
      >
        <TacticsBoard sport={sport} value={step.markers} onChange={noop} readOnly requireBall={false} />
        <View style={styles.expandBadge} pointerEvents="none">
          <MaterialIcons name="fullscreen" size={22} color="#fff" />
        </View>
      </Pressable>
      {step.note?.trim() ? <ThemedText>{step.note}</ThemedText> : null}

      <FullScreenDiagram
        visible={fullScreen}
        onClose={() => setFullScreen(false)}
        sport={sport}
        steps={steps}
        selected={selected}
        onSelect={onSelect}
      />
    </View>
  );
};

interface FullScreenDiagramProps extends ExerciseDiagramProps {
  visible: boolean;
  onClose: () => void;
}

const FullScreenDiagram = ({ visible, onClose, sport, steps, selected, onSelect }: FullScreenDiagramProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, 'background') as string;
  const textColor = useThemeColor({}, 'text') as string;

  const step = steps[selected] ?? steps[0];
  const go = (offset: number) => {
    const next = selected + offset;
    if (next >= 0 && next < steps.length) onSelect(next);
  };

  // Swiping left shows the next step, like turning a page. A drag that goes far enough counts as
  // much as a quick flick, and a mostly vertical drag counts as neither.
  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-SWIPE_START, SWIPE_START])
    .failOffsetY([-SWIPE_START, SWIPE_START])
    .onEnd(({ translationX, velocityX }) => {
      if (translationX < -SWIPE_DISTANCE || velocityX < -SWIPE_VELOCITY) go(1);
      else if (translationX > SWIPE_DISTANCE || velocityX > SWIPE_VELOCITY) go(-1);
    });

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      {/* A modal is outside the app's root view, so gestures need their own */}
      <GestureHandlerRootView
        testID="diagram-full-screen"
        style={[styles.fullScreen, { backgroundColor: background, paddingTop: insets.top, paddingBottom: insets.bottom + 12 }]}
      >
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            hitSlop={12}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={28} color={textColor} />
          </Pressable>
        </View>
        <GestureDetector gesture={swipe}>
          <View style={styles.fullScreenCourt} collapsable={false}>
            <TacticsBoard sport={sport} value={step.markers} onChange={noop} readOnly requireBall={false} />
          </View>
        </GestureDetector>
        <View style={styles.footer}>
          {steps.length > 1 && <StepTabs count={steps.length} selected={selected} onSelect={onSelect} />}
          {step.note?.trim() ? <ThemedText>{step.note}</ThemedText> : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  inline: {
    gap: 8,
  },
  court: {
    alignSelf: 'center',
  },
  expandBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    padding: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  fullScreen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  closeButton: {
    padding: 4,
  },
  fullScreenCourt: {
    flex: 1,
    paddingHorizontal: 8,
  },
  footer: {
    // Room for the tabs and a two-line note, so the court keeps its size while swiping between steps
    minHeight: 110,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
});
