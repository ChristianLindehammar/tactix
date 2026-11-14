import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { RATING_STARS, RatingStars } from '@/types/exercise';

const STAR_COLOR = '#FFA000';

interface StarRatingProps {
  /** Your rating, which pressing the stars changes. */
  value: RatingStars | null;
  onChange: (stars: RatingStars | null) => void;
  /** What the stars show, such as every coach's average, to the nearest half. Yours if left out. */
  shown?: number | null;
}

const iconFor = (stars: number, shown: number) => {
  const nearestHalf = Math.round(shown * 2) / 2;
  if (stars <= nearestHalf) return 'star';
  if (stars - 0.5 === nearestHalf) return 'star-half';
  return 'star-border';
};

/** Pressing your current rating again clears it. */
export const StarRating = ({ value, onChange, shown = value }: StarRatingProps) => (
  <View style={styles.row}>
    {RATING_STARS.map(stars => (
      <Pressable
        key={stars}
        onPress={() => onChange(stars === value ? null : stars)}
        accessibilityRole="button"
        testID={`rate-${stars}`}
        accessibilityLabel={`${stars} ★`}
        // Your rating, whatever the stars show
        accessibilityState={{ selected: value !== null && stars <= value }}
        hitSlop={4}
      >
        <MaterialIcons
          name={iconFor(stars, shown ?? 0)}
          size={36}
          color={STAR_COLOR}
          testID={`star-icon-${stars}`}
        />
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
});
