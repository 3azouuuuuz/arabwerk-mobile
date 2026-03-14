// app/(client)/(tabs)/discover/components/RatingStars.tsx

import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { wp } from '../helpers/common';
import { AverageRating } from '../utils/types';

interface RatingStarsProps {
  ratingData: AverageRating;
  providerId: string;
  userId?: string;
  onRate: (providerId: string, rating: number) => void;
}

export default function RatingStars({
  ratingData,
  providerId,
  userId,
  onRate,
}: RatingStarsProps) {
  const displayRating =
    userId && ratingData.userRating > 0 ? ratingData.userRating : ratingData.avg;

  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {Array.from({ length: 5 }, (_, i) => {
          const filled = i < displayRating;
          return (
            <Pressable
              key={i}
              onPress={() => onRate(providerId, i + 1)}
              disabled={!userId}
            >
              <FontAwesome
                name={filled ? 'star' : 'star-o'}
                size={16}
                color={filled ? '#F59E0B' : '#9CA3AF'}
                style={styles.star}
              />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.ratingCount}>({ratingData.count || 0})</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
  },
  star: {
    marginHorizontal: 2,
  },
  ratingCount: {
    fontSize: wp(3),
    color: '#6B7280',
    marginLeft: wp(2),
  },
});