import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { RATING_STARS, RatingStars } from '@/types/exercise';

const STAR_COLOR = '#FFA000';

interface StarRatingProps {
  value: RatingStars | null;
  onChange: (stars: RatingStars | null) => void;
}

/** Pressing the current rating again clears it. */
export const StarRating = ({ value, onChange }: StarRatingProps) => (
  <View style={styles.row}>
    {RATING_STARS.map(stars => {
      const selected = value !== null && stars <= value;
      return (
        <Pressable
          key={stars}
          onPress={() => onChange(stars === value ? null : stars)}
          accessibilityRole="button"
          testID={`rate-${stars}`}
          accessibilityLabel={`${stars} ★`}
          accessibilityState={{ selected }}
          hitSlop={4}
        >
          <MaterialIcons name={selected ? 'star' : 'star-border'} size={36} color={STAR_COLOR} />
        </Pressable>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
});
