import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface DragHintOverlayProps {
  visible: boolean;
  onFinish: () => void;
}

export const DragHintOverlay: React.FC<DragHintOverlayProps> = ({
  visible,
  onFinish,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation>();

  const handleDismiss = () => {
    animationRef.current?.stop();
    Animated.timing(opacity, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(onFinish);
  };

  useEffect(() => {
    if (visible) {
      const animation = Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: 20,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
      ]);

      animationRef.current = animation;
      animation.start(() => {
        handleDismiss();
      });
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Pressable style={styles.pressable} onPress={handleDismiss}>
        <View style={styles.content}>
          <ThemedText style={styles.text}>
            Drag and hold players up and down to reorder them
          </ThemedText>
          <Animated.View style={{ transform: [{ translateY }] }}>
            <MaterialCommunityIcons name="gesture-tap-hold" size={32} color="#fff" />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  },
  pressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    padding: 20,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});
