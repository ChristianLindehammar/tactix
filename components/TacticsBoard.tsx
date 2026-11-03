import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArrowMarker } from '@/components/ArrowMarker';
import { CourtSurface } from '@/components/CourtSurface';
import { DraggableMarker } from '@/components/DraggableMarker';
import { SportBall } from '@/components/SportBall';
import { ConeSvg } from '@/components/ui/ConeSvg';
import { Sport, sportsConfig } from '@/constants/sports';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import {
  canDeleteMarker,
  clearAllMarkers,
  createArrowMarker,
  createTacticsMarker,
  ensureAtLeastOneBall,
  getMarkerIcon,
  TacticsMarker,
  TacticsMarkerType,
} from '@/types/tacticsMarker';
import { getToolbarLayout } from '@/utils/toolbarLayout';

export interface CourtSize {
  width: number;
  height: number;
}

export interface TacticsBoardProps {
  sport: Sport;
  value: TacticsMarker[];
  onChange: (markers: TacticsMarker[]) => void;
  /** Toolbar options; every marker type when omitted. */
  allowedMarkerTypes?: TacticsMarkerType[];
  /** Display only: no toolbar, no touches, and the markers never change. */
  readOnly?: boolean;
  /** Keep at least one ball on the board. Turn off for drills without a ball. */
  requireBall?: boolean;
  /** Space the host screen's chrome overlaps at the bottom of the board. */
  bottomInset?: number;
  firstToolRef?: React.Ref<React.ComponentRef<typeof TouchableOpacity>>;
  onMarkerAdded?: () => void;
  onMarkerDeleted?: () => void;
  onMarkerDragStart?: () => void;
  onCourtSizeChange?: (size: CourtSize) => void;
}

const isArrow = (type: TacticsMarkerType): type is 'arrow-solid' | 'arrow-dashed' =>
  type === 'arrow-solid' || type === 'arrow-dashed';

function getMarkerTypes(
  arrowColor: string,
  sport: Sport,
): { type: TacticsMarkerType; color: string; icon: string }[] {
  return [
    { type: 'player', color: '#1976D2', icon: 'person' },
    { type: 'opponent', color: '#D32F2F', icon: 'person' },
    { type: 'ball', color: '#FFA000', icon: getMarkerIcon('ball', sport) },
    { type: 'cone', color: '#FF6D00', icon: 'change-history' },
    { type: 'arrow-solid', color: arrowColor, icon: 'arrow-forward' },
    { type: 'arrow-dashed', color: arrowColor, icon: 'arrow-forward' },
  ];
}

export function TacticsBoard({
  sport,
  value,
  onChange,
  allowedMarkerTypes,
  readOnly = false,
  requireBall = true,
  bottomInset = 0,
  firstToolRef,
  onMarkerAdded,
  onMarkerDeleted,
  onMarkerDragStart,
  onCourtSizeChange,
}: TacticsBoardProps) {
  const { Svg, aspectRatio, arrowColor } = sportsConfig[sport];
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();

  const backgroundColor = useThemeColor({}, 'background') as string;
  const buttonBgColor = useThemeColor({}, 'secondaryBackground') as string;
  const textColor = useThemeColor({}, 'text') as string;

  const markerTypes = getMarkerTypes(textColor, sport).filter(
    mt => !allowedMarkerTypes || allowedMarkerTypes.includes(mt.type),
  );
  // Size the toolbar so every control fits on one row, whatever the screen width
  const toolbarLayout = getToolbarLayout({
    windowWidth: windowWidth - insets.left - insets.right,
    buttonCount: markerTypes.length,
    hasClearButton: true,
  });

  const [container, setContainer] = useState<CourtSize>({ width: 0, height: 0 });
  const screenRatio =
    container.width > 0 && container.height > 0 ? container.width / container.height : 1;
  const court: CourtSize =
    container.width > 0 && container.height > 0
      ? screenRatio > aspectRatio
        ? { width: container.height * aspectRatio, height: container.height }
        : { width: container.width, height: container.width / aspectRatio }
      : { width: 0, height: 0 };

  useEffect(() => {
    onCourtSizeChange?.(court);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court.width, court.height]);

  const [addingType, setAddingType] = useState<TacticsMarkerType | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Gestures and alerts can fire before the host re-renders with the new value
  const latest = useRef(value);
  latest.current = value;
  const update = (change: (markers: TacticsMarker[]) => TacticsMarker[]) => {
    const next = change(latest.current);
    latest.current = next;
    onChange(next);
  };

  // Ensure at least one ball marker is always present
  useEffect(() => {
    if (readOnly || !requireBall) return;
    const withBall = ensureAtLeastOneBall(value);
    if (withBall !== value) onChange(withBall);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, readOnly, requireBall]);

  const handleCourtPress = (event: any) => {
    if (!addingType) return;

    const { locationX, locationY } = event.nativeEvent;
    const x = locationX / court.width;
    const y = locationY / court.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;

    if (isArrow(addingType)) {
      // Place arrow with a default length pointing downward
      const arrow = createArrowMarker(addingType, x, y, x, Math.min(y + 0.15, 1));
      update(markers => [...markers, arrow]);
      // Arrows are typically placed one at a time, deselect after placement
      setAddingType(null);
    } else {
      const marker = createTacticsMarker(addingType, x, y);
      update(markers => [...markers, marker]);
    }
    onMarkerAdded?.();
  };

  const handleDragStart = (id: string) => {
    setAddingType(null);
    setDraggingId(id);
    onMarkerDragStart?.();
  };

  const confirmDelete = (onConfirm: () => void) =>
    Alert.alert(t('delete'), t('deleteMarkerConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: onConfirm },
    ]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {!readOnly && (
        <View
          style={[
            styles.markerSelectionContainer,
            { paddingTop: Math.max(insets.top, 8), backgroundColor },
          ]}
        >
          <View
            style={[
              styles.controlsContainer,
              { paddingHorizontal: toolbarLayout.containerPaddingHorizontal },
            ]}
          >
            <View style={[styles.addButtonsContainer, { gap: toolbarLayout.gap }]}>
              {markerTypes.map((mt, index) => (
                <TouchableOpacity
                  key={mt.type}
                  ref={index === 0 ? firstToolRef : undefined}
                  style={[
                    styles.markerTypeButton,
                    {
                      backgroundColor: buttonBgColor,
                      paddingHorizontal: toolbarLayout.buttonPaddingHorizontal,
                    },
                    addingType === mt.type && styles.activeButton,
                  ]}
                  onPress={() => setAddingType(current => (current === mt.type ? null : mt.type))}
                  accessibilityLabel={mt.type}
                >
                  <MaterialIcons
                    name={addingType === mt.type ? 'close' : 'add'}
                    size={toolbarLayout.addIconSize}
                    color={mt.color}
                  />
                  {mt.type === 'cone' ? (
                    <ConeSvg size={toolbarLayout.markerIconSize} />
                  ) : mt.type === 'ball' ? (
                    <SportBall sport={sport} size={toolbarLayout.markerIconSize} color={mt.color} />
                  ) : (
                    <MaterialIcons
                      name={mt.icon as any}
                      size={toolbarLayout.markerIconSize}
                      color={mt.color}
                      style={mt.type === 'arrow-dashed' ? { opacity: 0.5 } : undefined}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {value.length > (requireBall ? 1 : 0) && (
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  {
                    width: toolbarLayout.clearButtonSize,
                    height: toolbarLayout.clearButtonSize,
                    borderRadius: toolbarLayout.clearButtonSize / 2,
                  },
                ]}
                onPress={() => {
                  Alert.alert(t('clearAll'), t('removeAllMarkers'), [
                    { text: t('cancel'), style: 'cancel' },
                    {
                      text: t('ok'),
                      // A required ball stays on the board, centered
                      onPress: () => update(() => (requireBall ? clearAllMarkers() : [])),
                    },
                  ]);
                }}
                accessibilityLabel={t('clearAll')}
              >
                <MaterialIcons name="delete-sweep" size={toolbarLayout.markerIconSize} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View
        testID="tactics-board-layout"
        style={[styles.courtContainerOuter, { paddingBottom: bottomInset }]}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          // The inset is part of the measured height but not usable by the court
          setContainer({ width, height: height - bottomInset });
        }}
      >
        <View
          testID="tactics-board-court"
          style={{ width: court.width, height: court.height, position: 'relative' }}
          onTouchStart={addingType ? handleCourtPress : undefined}
          pointerEvents={readOnly ? 'none' : 'box-none'} // Otherwise touches pass through to markers
        >
          <CourtSurface width={court.width} height={court.height} CourtSvg={Svg} />

          {value
            .filter(m => isArrow(m.type))
            .map(marker => (
              <ArrowMarker
                key={marker.id}
                id={marker.id}
                x={marker.x}
                y={marker.y}
                endX={marker.endX ?? marker.x}
                endY={marker.endY ?? marker.y + 0.15}
                dashed={marker.type === 'arrow-dashed'}
                containerSize={court}
                color={arrowColor}
                onDragEnd={(id, newX, newY, newEndX, newEndY) => {
                  update(markers =>
                    markers.map(m =>
                      m.id === id ? { ...m, x: newX, y: newY, endX: newEndX, endY: newEndY } : m,
                    ),
                  );
                }}
                onLongPress={() =>
                  confirmDelete(() => update(markers => markers.filter(m => m.id !== marker.id)))
                }
              />
            ))}

          {value
            .filter(m => !isArrow(m.type))
            .map(marker => (
              <DraggableMarker
                key={marker.id}
                id={marker.id}
                x={marker.x}
                y={marker.y}
                containerSize={court}
                onDragEnd={(id, newX, newY) => {
                  update(markers => markers.map(m => (m.id === id ? { ...m, x: newX, y: newY } : m)));
                  setDraggingId(null);
                }}
                onDragStart={handleDragStart}
                onLongPress={() => {
                  // Don't allow deleting the last remaining ball marker
                  if (requireBall && !canDeleteMarker(latest.current, marker.id)) return;

                  confirmDelete(() => {
                    update(markers => markers.filter(m => m.id !== marker.id));
                    if (draggingId === marker.id) setDraggingId(null);
                    onMarkerDeleted?.();
                  });
                }}
                zIndex={draggingId === marker.id ? 3 : 2}
              >
                {marker.type === 'ball' ? (
                  <View style={styles.ballMarker}>
                    <View style={styles.ballIcon}>
                      <SportBall sport={sport} size={24} color="#FFA000" />
                    </View>
                  </View>
                ) : marker.type === 'cone' ? (
                  <View style={styles.coneMarker}>
                    <ConeSvg size={32} />
                  </View>
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[
                      styles.personMarker,
                      { backgroundColor: marker.type === 'player' ? '#1976D2' : '#D32F2F' },
                    ]}
                  >
                    <MaterialIcons name="person" size={28} color="#fff" />
                  </TouchableOpacity>
                )}
              </DraggableMarker>
            ))}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  courtContainerOuter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerSelectionContainer: {
    paddingBottom: 4,
    zIndex: 30,
  },
  controlsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  addButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    flexShrink: 1,
  },
  markerTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 5,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeButton: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  clearButton: {
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 10,
  },
  ballMarker: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FFA000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  ballIcon: {
    width: 24,
    height: 24,
  },
  coneMarker: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
