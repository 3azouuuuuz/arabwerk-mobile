import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ENV } from '../config/env';
import { hp, wp } from '../helpers/common';
import { getInitial } from '../utils/helpers';
import { AverageRating, Provider } from '../utils/types';
import RatingStars from './RatingStars';

interface ProviderCardProps {
  provider: Provider;
  ratingData: AverageRating;
  userId?: string;
  isExpanded: boolean;
  viewMode: 'list' | 'grid';
  onRate: (providerId: string, rating: number) => void;
  onToggleExpand: (providerId: string) => void;
}

export default function ProviderCard({
  provider,
  ratingData,
  userId,
  isExpanded,
  viewMode,
  onRate,
  onToggleExpand,
}: ProviderCardProps) {
  const router = useRouter();
  const cardStyle =
    viewMode === 'grid' ? [styles.card, styles.cardGrid] : styles.card;

  const handleContact = () => {
    router.push({
      pathname: '/(client)/chat',
      params: { receiverId: String(provider.user_id) },
    });
  };

  return (
    <View style={cardStyle}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {provider.profile_picture ? (
          <Image
            source={{
              uri: provider.profile_picture.startsWith('http')
                ? provider.profile_picture
                : `${ENV.API_BASE_URL}${provider.profile_picture}`,
            }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {getInitial(provider.provider_name)}
            </Text>
          </View>
        )}

        {/* Pro Badge */}
        {provider.provider_plan === 'Pro' && (
          <View style={styles.proBadge}>
            <FontAwesome name="star" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Provider Info */}
      <Text style={styles.providerName}>{provider.provider_name}</Text>

      {provider.is_company_registered && provider.business_name && (
        <Text style={styles.businessName}>{provider.business_name}</Text>
      )}

      {provider.city && (
        <Text style={styles.cityText}>{provider.city.split(',')[0].trim()}</Text>
      )}

      {/* Verification Badges */}
      <View style={styles.badgesContainer}>
        {provider.is_id_verified && (
          <View style={styles.verifiedBadge}>
            <FontAwesome name="check-circle" size={12} color="#10B981" />
            <Text style={styles.verifiedText}>مؤكد الهوية</Text>
          </View>
        )}
        {provider.is_company_registered && (
          <View style={styles.companyBadge}>
            <FontAwesome name="building" size={12} color="#3B82F6" />
            <Text style={styles.companyText}>شركة مسجلة</Text>
          </View>
        )}
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        {provider.category &&
          provider.category.split(',').map((cat, idx) => (
            <View key={idx} style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{cat.trim()}</Text>
            </View>
          ))}
      </ScrollView>

      {/* Description */}
      {provider.description && (
        <Text style={styles.description} numberOfLines={2}>
          {provider.description}
        </Text>
      )}

      {/* Footer: Rating and Contact */}
      <View style={styles.footer}>
        <RatingStars
          ratingData={ratingData}
          providerId={provider.user_id}
          userId={userId}
          onRate={onRate}
        />
        <Pressable
          style={({ pressed }) => [
            styles.contactButton,
            viewMode === 'grid' && { left: wp(6) },
            pressed && styles.contactButtonPressed,
          ]}
          onPress={handleContact}
        >
          <Text style={styles.contactButtonText}>تواصل</Text>
        </Pressable>
      </View>

      {/* Toggle Ratings Button */}
      <Pressable onPress={() => onToggleExpand(provider.user_id)}>
        <Text style={styles.expandText}>
          {isExpanded ? 'إخفاء التقييمات' : 'عرض التقييمات'}
        </Text>
      </Pressable>

      {/* Expanded Ratings */}
      {isExpanded && (
        <View style={styles.expandedRatings}>
          <Text style={styles.expandedTitle}>المستخدمين اللي قيموا:</Text>
          {ratingData.allUserRatings && ratingData.allUserRatings.length > 0 ? (
            ratingData.allUserRatings.map((r, idx) => (
              <View key={idx} style={styles.userRating}>
                <Text style={styles.userRatingName}>{r.userName}</Text>
                <Text style={styles.userRatingStars}>قيم {r.rating} نجوم</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noRatings}>لا يوجد تقييمات حتى الآن</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: wp(5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'center',
    width: '100%',
  },
  cardGrid: {
    flex: 1,
    maxWidth: '48%',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: hp(1.5),
  },
  avatar: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    backgroundColor: '#2F6FDB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarText: {
    fontSize: wp(7),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F59E0B',
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  providerName: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: hp(0.5),
  },
  businessName: {
    fontSize: wp(4),
    fontWeight: '600',
    color: '#2F6FDB',
    marginBottom: hp(0.5),
  },
  cityText: {
    fontSize: wp(3.5),
    color: '#6B7280',
    marginBottom: hp(1),
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1.5),
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: wp(3),
    color: '#10B981',
    fontWeight: '600',
  },
  companyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: 8,
  },
  companyText: {
    fontSize: wp(3),
    color: '#3B82F6',
    fontWeight: '600',
  },
  categoriesScroll: {
    marginVertical: hp(1),
  },
  categoryTag: {
    borderWidth: 1.5,
    borderColor: '#2F6FDB',
    borderRadius: 16,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    marginRight: wp(2),
  },
  categoryTagText: {
    fontSize: wp(3),
    color: '#2F6FDB',
  },
  description: {
    fontSize: wp(3.5),
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: hp(1),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: hp(1),
    flexWrap: 'wrap',
    gap: wp(2),
  },
  contactButton: {
    backgroundColor: '#2F6FDB',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 20,
    minWidth: wp(20),
    alignItems: 'center',
  },
  contactButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  contactButtonText: {
    fontSize: wp(3.2),
    color: '#FFFFFF',
    fontWeight: '600',
  },
  expandText: {
    fontSize: wp(3.5),
    color: '#2F6FDB',
    fontStyle: 'italic',
    marginTop: hp(1),
  },
  expandedRatings: {
    marginTop: hp(2),
    padding: wp(3),
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    width: '100%',
  },
  expandedTitle: {
    fontSize: wp(3.8),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: hp(1),
  },
  userRating: {
    marginBottom: hp(1),
  },
  userRatingName: {
    fontSize: wp(3.5),
    color: '#1F2937',
    fontWeight: '600',
  },
  userRatingStars: {
    fontSize: wp(3),
    color: '#6B7280',
  },
  noRatings: {
    fontSize: wp(3.5),
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});