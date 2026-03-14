import LoadingComponent from '@/components/LoadingComponent';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import ClientHeader from '../../../components/ClientHeader';
import FilterBar from '../../../components/FilterBar';
import ProviderCard from '../../../components/ProviderCard';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helpers/common';
import { AverageRating, Provider, ViewMode } from '../../../utils/types';
import { useCitySearch } from '../../../utils/useCitySearch';
import { useProvidersData } from '../../../utils/useProvidersData';

const LOAD_COUNT = 12;

// Plans considered "pro" — adjust if your plan names differ
const PRO_PLANS = ['pro', 'Pro', 'PRO', 'premium', 'Premium', 'PREMIUM'];

const isPro = (plan: string) => PRO_PLANS.includes(plan?.trim() || '');

export default function DiscoverScreen() {
  const { user } = useAuth();

  const {
    providers,
    categories,
    ratings,
    isInitialLoad,
    setRatings,
    fetchRatingsData,
  } = useProvidersData(user?.id, user?.user_type?.id);

  const {
    city,
    citySuggestions,
    handleCityInputChange,
    handleCitySelect,
  } = useCitySearch();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [visibleCount, setVisibleCount] = useState(LOAD_COUNT);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const handleNotificationPress = useCallback(() => {
    console.log('🔔 Notifications pressed');
  }, []);

  const handleCategoryPress = useCallback(() => {
    setShowCategoryPicker((prev) => !prev);
  }, []);

  const handleCategorySelect = useCallback((category: string) => {
    setSelectedCategory(category);
    setShowCategoryPicker(false);
  }, []);

  const handleToggleExpand = useCallback((providerId: string) => {
    setExpandedProviderId((prev) => (prev === providerId ? null : providerId));
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleRate = useCallback(
    async (provider_id: string, rating: number) => {
      if (!user?.id) {
        alert('Please login to rate');
        return;
      }
      if (user.id.toString() === provider_id) {
        alert('Cannot rate your own account');
        return;
      }
      try {
        const res = await fetch(
          `${ENV.API_BASE_URL}/ratings?provider_id=${provider_id}&user_id=${user.id}`
        );
        const existing = await res.json();
        if (existing.length > 0) {
          await fetch(`${ENV.API_BASE_URL}/ratings/${existing[0].id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rating,
              created_at: new Date().toISOString(),
            }),
          });
          alert('Rating updated successfully');
        } else {
          await fetch(`${ENV.API_BASE_URL}/ratings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider_id: String(provider_id),
              user_id: String(user.id),
              rating: Number(rating),
            }),
          });
          alert('Rating added successfully');
        }
        setRatings((prev) => ({
          ...prev,
          [provider_id]: {
            ...prev[provider_id],
            userRating: rating,
          },
        }));
        fetchRatingsData();
      } catch (error) {
        console.error('Error rating:', error);
        alert('Error submitting rating');
      }
    },
    [user, setRatings, fetchRatingsData]
  );

  const processedProviders = useMemo(() => {
    // STEP 1: Filter by category
    let filtered = providers.filter(provider => {
      if (selectedCategory && !provider.categories.includes(selectedCategory)) {
        return false;
      }
      return true;
    });

    // STEP 2: Filter by city (text match)
    if (city && city.trim() !== '') {
      filtered = filtered.filter(provider =>
        provider.city && provider.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    // STEP 3: Sort — Pro high rating → Pro low rating → Free high rating → Free low rating
    const sorted = [...filtered].sort((a, b) => {
      const aIsPro = isPro(a.plan);
      const bIsPro = isPro(b.plan);
      const ratingA = ratings[a.user_id]?.avg || 0;
      const ratingB = ratings[b.user_id]?.avg || 0;

      // Both pro or both free — sort by rating descending
      if (aIsPro && bIsPro) return ratingB - ratingA;
      if (!aIsPro && !bIsPro) return ratingB - ratingA;

      // Pro always comes before free
      if (aIsPro && !bIsPro) return -1;
      return 1;
    });

    return sorted;
  }, [providers, selectedCategory, city, ratings]);

  const visibleProviders = useMemo(
    () => processedProviders.slice(0, visibleCount),
    [processedProviders, visibleCount]
  );

  const renderProvider = useCallback(
    ({ item }: { item: Provider }) => {
      const ratingData: AverageRating = ratings[item.user_id] || {
        avg: 0,
        count: 0,
        userRating: 0,
        allUserRatings: [],
      };
      return (
        <ProviderCard
          provider={item}
          ratingData={ratingData}
          userId={user?.id}
          isExpanded={expandedProviderId === item.user_id}
          viewMode={viewMode}
          onRate={handleRate}
          onToggleExpand={handleToggleExpand}
        />
      );
    },
    [ratings, user, expandedProviderId, viewMode, handleRate, handleToggleExpand]
  );

  const listKey = `${viewMode}-${selectedCategory}-${city}`;
  const numColumns = viewMode === 'grid' ? 2 : 1;
  const columnWrapperStyle = viewMode === 'grid' ? styles.gridRow : undefined;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ClientHeader onNotificationPress={handleNotificationPress} />
      <FilterBar
        selectedCategory={selectedCategory}
        city={city}
        categories={categories}
        citySuggestions={citySuggestions}
        showCategoryPicker={showCategoryPicker}
        viewMode={viewMode}
        onCategoryPress={handleCategoryPress}
        onCategorySelect={handleCategorySelect}
        onCityChange={handleCityInputChange}
        onCitySelect={handleCitySelect}
        onViewModeChange={handleViewModeChange}
      />
      {isInitialLoad ? (
        <LoadingComponent message="جاري تحميل الخدمات..." />
      ) : (
        <FlatList
          key={listKey}
          data={visibleProviders}
          renderItem={renderProvider}
          keyExtractor={(item) => item.user_id}
          numColumns={numColumns}
          columnWrapperStyle={columnWrapperStyle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                لا توجد خدمات متاحة حسب الفلاتر المختارة
              </Text>
            </View>
          }
          ListFooterComponent={
            !isInitialLoad && visibleCount < processedProviders.length ? (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount((prev) => prev + LOAD_COUNT)}
              >
                <Text style={styles.loadMoreText}>عرض المزيد</Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContent: {
    padding: wp(4),
    gap: hp(2),
  },
  gridRow: {
    justifyContent: 'space-between',
    gap: wp(4),
  },
  emptyContainer: {
    padding: wp(8),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: wp(4),
    color: '#6B7280',
    textAlign: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#2F6FDB',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
    borderRadius: 12,
    alignSelf: 'center',
    marginVertical: hp(2),
  },
  loadMoreText: {
    fontSize: wp(4),
    color: '#FFFFFF',
    fontWeight: '600',
  },
});