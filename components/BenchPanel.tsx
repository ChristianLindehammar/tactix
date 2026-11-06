import React, { useRef, useState } from 'react';
import { View, StyleSheet, Pressable, NativeSyntheticEvent, NativeScrollEvent, Animated, Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Reanimated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTeam } from '@/context/TeamContext';
import { Player } from './Player'; 
import { ThemedText } from './ThemedText';
import { IconSymbol } from './ui/IconSymbol';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { useDrag } from '@/context/DragContext';

export const PANEL_HEIGHT_COLLAPSED = 35;
export const PANEL_HEIGHT_EXPANDED = 130;

const ScrollIndicator = ({ scrollX, contentWidth, containerWidth }: { 
  scrollX: Animated.Value, 
  contentWidth: number,
  containerWidth: number
}) => {
  const primaryColor = useThemeColor({}, 'primary') as string || '#4169E1';
  const inactiveColor = useThemeColor({}, 'icon') as string || '#888888';

  if (contentWidth <= containerWidth) return null;
  
  const maxScroll = Math.max(0, contentWidth - containerWidth);
  const numberOfDots = 5;
  
  return (
    <View style={styles.indicatorContainer}>
      {/* Background line */}
      <View style={[styles.indicatorLine, { backgroundColor: inactiveColor }]} />
      
      {/* Dots */}
      <View style={styles.dotsContainer}>
        {Array(numberOfDots).fill(0).map((_, index) => {
          const inputRange = [
            (index - 1) * maxScroll / (numberOfDots - 1),
            index * maxScroll / (numberOfDots - 1),
            (index + 1) * maxScroll / (numberOfDots - 1)
          ].map(val => Math.max(0, Math.min(maxScroll, val)));
          
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1.4, 0.6],
            extrapolate: 'clamp',
          });
          
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          
          return (
            <Animated.View 
              key={index}
              style={[
                styles.indicatorDot,
                { 
                  backgroundColor: primaryColor,
                  transform: [{ scale }],
                  opacity,
                }
              ]} 
            />
          );
        })}
      </View>
    </View>
  );
};

interface BenchPanelProps {
  expanded: boolean;
  onToggle: () => void;
  tabBarHeight: number;
  onPlayerPress?: (playerId: string) => void;
}

export const BenchPanel: React.FC<BenchPanelProps> = ({ expanded: isExpanded, onToggle, tabBarHeight, onPlayerPress }) => {
  const { team } = useTeam();
  const { t } = useTranslation();
  const { benchRef, overBench } = useDrag();
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const backgroundColor = useThemeColor({}, 'menuBackground') as string;
  const borderColor = useThemeColor({}, 'border') as string;
  const textColor = useThemeColor({}, 'text') as string;
  const iconColor = useThemeColor({}, 'icon') as string;
  const tintColor = useThemeColor({}, 'tint') as string;

  const benchPlayers = team?.benchPlayers ?? [];

  // Shows the bench will take the player while a court player is held over it
  const dropTargetStyle = useAnimatedStyle(() => ({
    opacity: withTiming(overBench.value ? 1 : 0, { duration: 120 }),
  }));

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.setValue(offsetX);
  };

  return (
    <View
      ref={benchRef}
      collapsable={false}
      style={[
        styles.panelContainer, 
        {
          height: isExpanded ? PANEL_HEIGHT_EXPANDED : PANEL_HEIGHT_COLLAPSED,
          bottom: Platform.OS === 'ios' ? tabBarHeight : 0,
          backgroundColor: backgroundColor,
          borderTopColor: borderColor,
        }
      ]}
    >
      <Reanimated.View
        pointerEvents="none"
        style={[styles.dropTarget, { borderColor: tintColor, backgroundColor: `${tintColor}22` }, dropTargetStyle]}
      />
      <Pressable
        onPress={onToggle}
        style={styles.toggleButton}
      >
        <IconSymbol name={isExpanded ? 'chevron.down' : 'chevron.up'} size={20} color={iconColor} />
        <ThemedText style={[styles.panelTitle, { color: textColor }]}>
           {t('bench')} ({benchPlayers.length})
        </ThemedText>
      </Pressable>
      
      {isExpanded && (
        <View style={styles.expandedContentContainer}>
          <View 
            style={styles.scrollContainer}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          >
            <ScrollView 
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scrollViewContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onContentSizeChange={(width) => setContentWidth(width)}
            >
              {benchPlayers.length > 0 ? (
                benchPlayers.map((player) => (
                  <View key={player.id} style={styles.playerWrapper}>
                    <Player
                      id={player.id}
                      name={player.name}
                      position={player.position}
                      isOnCourt={false}
                      displayMode="bench"
                      onPress={onPlayerPress}
                    />
                  </View>
                ))
              ) : (
                <View style={styles.noPlayersContainer}>
                  <ThemedText style={[styles.noPlayersText, { color: iconColor }]}>
                    {t('noPlayersOnBench')}
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </View>
          
          {benchPlayers.length > 3 && contentWidth > containerWidth && (
            <ScrollIndicator 
              scrollX={scrollX} 
              contentWidth={contentWidth} 
              containerWidth={containerWidth} 
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  dropTarget: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderWidth: 2,
    borderRadius: 8,
  },
  panelContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingBottom: 2,
    paddingTop: 2,
  },
  panelTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  playersContainer: {
    flex: 1,
    padding: 10,
  },
  playersWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  playerWrapper: {
    alignItems: 'center',
    marginHorizontal: 6,
    marginBottom: 10,
  },
  noPlayersContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: PANEL_HEIGHT_EXPANDED - PANEL_HEIGHT_COLLAPSED - 10,
  },
  noPlayersText: {
    fontStyle: 'italic',
  },
  expandedContentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollViewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    minHeight: PANEL_HEIGHT_EXPANDED - PANEL_HEIGHT_COLLAPSED - 20,
  },
  indicatorContainer: {
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -5,
    position: 'relative',
  },
  indicatorLine: {
    position: 'absolute',
    height: 1,
    width: 50,
    opacity: 0.4,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 50,
    zIndex: 1,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
