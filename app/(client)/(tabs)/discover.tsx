import LoadingComponent from '@/components/LoadingComponent';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
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

const PAGE_SIZE = 12;

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

  const { city, citySuggestions, handleCityInputChange, handleCitySelect } = useCitySearch();

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
    setExpandedProviderId(null);
  }, [selectedCategory, city]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNotificationPress = useCallback(() => {}, []);

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
      if (!user?.id) { alert('Please login to rate'); return; }
      if (user.id.toString() === provider_id) { alert('Cannot rate your own account'); return; }

      try {
        const res = await fetch(
          `${ENV.API_BASE_URL}/ratings?provider_id=${provider_id}&user_id=${user.id}`
        );
        const existing = await res.json();

        if (existing.length > 0) {
          await fetch(`${ENV.API_BASE_URL}/ratings/${existing[0].id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rating, created_at: new Date().toISOString() }),
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

        // Only update display rating — does NOT re-sort
        setRatings((prev) => ({
          ...prev,
          [provider_id]: { ...prev[provider_id], userRating: rating },
        }));
        fetchRatingsData();
      } catch (e) {
        console.error('Error rating:', e);
        alert('Error submitting rating');
      }
    },
    [user, setRatings, fetchRatingsData]
  );

  // ── FILTER ONLY — no sorting, providers already sorted correctly from hook ─
  const filteredProviders = useMemo(() => {
    let result = providers;

    if (selectedCategory) {
      result = result.filter((p) => p.categories.includes(selectedCategory));
    }

    if (city.trim()) {
      result = result.filter(
        (p) => p.city && p.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    return result;
  }, [providers, selectedCategory, city]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredProviders.length / PAGE_SIZE)),
    [filteredProviders]
  );

  const pageProviders = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProviders.slice(start, start + PAGE_SIZE);
  }, [filteredProviders, currentPage]);

  // ── Render item ───────────────────────────────────────────────────────────
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

  // ── Pagination bar ────────────────────────────────────────────────────────
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | 'ellipsis')[] = [];
    const delta = 1;
    const range: number[] = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    pages.push(1);
    if (range.length > 0 && range[0] > 2) pages.push('ellipsis');
    pages.push(...range);
    if (range.length > 0 && range[range.length - 1] < totalPages - 1) pages.push('ellipsis');
    if (totalPages > 1) pages.push(totalPages);

    return (
      <View style={styles.paginationContainer}>
        <Pressable
          style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          <Ionicons
            name="chevron-back"
            size={wp(4)}
            color={currentPage === 1 ? '#D1D5DB' : '#2F6FDB'}
          />
        </Pressable>

        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <Text key={`e-${idx}`} style={styles.ellipsis}>…</Text>
          ) : (
            <Pressable
              key={p}
              style={[styles.pageBtn, currentPage === p && styles.pageBtnActive]}
              onPress={() => setCurrentPage(p)}
            >
              <Text style={[styles.pageBtnText, currentPage === p && styles.pageBtnTextActive]}>
                {p}
              </Text>
            </Pressable>
          )
        )}

        <Pressable
          style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
          onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          <Ionicons
            name="chevron-forward"
            size={wp(4)}
            color={currentPage === totalPages ? '#D1D5DB' : '#2F6FDB'}
          />
        </Pressable>
      </View>
    );
  };

  const listKey = `${viewMode}-${selectedCategory}-${city}-p${currentPage}`;
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

      {!isInitialLoad && (
        <View style={styles.resultsRow}>
          <Text style={styles.resultsText}>{filteredProviders.length} مزود خدمة</Text>
          <Text style={styles.pageInfo}>صفحة {currentPage} من {totalPages}</Text>
        </View>
      )}

      {isInitialLoad ? (
        <LoadingComponent message="جاري تحميل الخدمات..." />
      ) : (
        <FlatList
          key={listKey}
          data={pageProviders}
          renderItem={renderProvider}
          keyExtractor={(item) => item.user_id}
          numColumns={numColumns}
          columnWrapperStyle={columnWrapperStyle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>
                لا توجد خدمات متاحة حسب الفلاتر المختارة
              </Text>
            </View>
          }
          ListFooterComponent={renderPagination()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(0.8),
  },
  resultsText: { fontSize: wp(3.2), color: '#6B7280', fontWeight: '500' },
  pageInfo: { fontSize: wp(3.2), color: '#6B7280', fontWeight: '500' },

  listContent: { padding: wp(4), gap: hp(2), paddingBottom: hp(4) },
  gridRow: { justifyContent: 'space-between', gap: wp(4) },

  emptyContainer: { padding: wp(8), alignItems: 'center', gap: hp(1.5) },
  emptyIcon: { fontSize: wp(10) },
  emptyText: { fontSize: wp(4), color: '#6B7280', textAlign: 'center' },

  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(4),
    flexWrap: 'wrap',
  },
  pageBtn: {
    minWidth: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: wp(2),
  },
  pageBtnActive: { backgroundColor: '#2F6FDB', borderColor: '#2F6FDB' },
  pageBtnDisabled: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  pageBtnText: { fontSize: wp(3.5), color: '#374151', fontWeight: '600' },
  pageBtnTextActive: { color: '#FFFFFF' },
  ellipsis: { fontSize: wp(3.5), color: '#9CA3AF', paddingHorizontal: wp(1) },
});