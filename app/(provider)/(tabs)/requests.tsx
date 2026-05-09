import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helpers/common';
import { calculateDistance, getCityCoordinates } from '../../../utils/geocoding';

interface ServiceRequest {
  id: number;
  created_at: string;
  id_user: number;
  service_type: string;
  service_address: string;
  price_service: string | null;
  desc_service: string;
  agree: boolean;
  service_images: string | null;
  distance?: number | null;
}

interface SubscriptionContent {
  id: string;
  name: string;
  plan: string;
  plan_name: string;
  geographic_scope: string;
}

type SortMode = 'default' | 'distance' | 'price';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  كهربائي: { bg: '#FEF3C7', text: '#92400E' },
  نجار: { bg: '#DCFCE7', text: '#166534' },
  سباك: { bg: '#DBEAFE', text: '#1E40AF' },
  نقل: { bg: '#EDE9FE', text: '#5B21B6' },
  دهان: { bg: '#FCE7F3', text: '#9D174D' },
  تنظيف: { bg: '#ECFDF5', text: '#065F46' },
  تكييف: { bg: '#E0F2FE', text: '#0369A1' },
  بناء: { bg: '#FEF9C3', text: '#854D0E' },
  حدادة: { bg: '#F1F5F9', text: '#334155' },
  أخرى: { bg: '#F3F4F6', text: '#374151' },
};

function getCategoryColors(serviceType: string): { bg: string; text: string } {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (serviceType?.includes(key)) return CATEGORY_COLORS[key];
  }
  return CATEGORY_COLORS['أخرى'];
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return `منذ ${diffDays} يوم`;
}

function isLikelyPlaceName(address: string): boolean {
  if (!address || address.trim().length < 3) return false;
  if (address.includes('\n') || address.includes('\r')) return false;

  const nonSpace = address.replace(/\s/g, '');
  if (nonSpace.length === 0) return false;

  const arabicChars = (nonSpace.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars / nonSpace.length > 0.4) return false;

  return true;
}

function extractGermanTokens(str: string): string[] {
  const dashIdx = str.indexOf(' - ');
  if (dashIdx === -1) return [];

  return str
    .slice(dashIdx + 3)
    .toLowerCase()
    .split(/[\/\s,]+/)
    .map((t: string) => t.trim())
    .filter((t: string) => t.length >= 3);
}

function matchesProviderCategories(
  serviceType: string,
  providerCategories: string[]
): boolean {
  if (providerCategories.length === 0) return true;

  const typeNorm = serviceType?.trim() ?? '';
  if (!typeNorm) return false;

  return providerCategories.some((cat) => {
    if (typeNorm.toLowerCase() === cat.trim().toLowerCase()) return true;

    const typeGerman = extractGermanTokens(typeNorm);
    const catGerman = extractGermanTokens(cat);

    if (typeGerman.length > 0 && catGerman.length > 0) {
      return typeGerman.some((tg: string) =>
        catGerman.some((cg: string) => tg === cg || tg.includes(cg) || cg.includes(tg))
      );
    }

    return (
      typeNorm.toLowerCase().includes(cat.trim().toLowerCase()) ||
      cat.trim().toLowerCase().includes(typeNorm.toLowerCase())
    );
  });
}

const LOAD_COUNT = 10;

export default function RequestsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [providerCity, setProviderCity] = useState('');
  const [providerCoords, setProviderCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [providerCategories, setProviderCategories] = useState<string[]>([]);
  const [isGeocodingCities, setIsGeocodingCities] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [visibleCount, setVisibleCount] = useState(LOAD_COUNT);

  const [cityFilter, setCityFilter] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const cityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPlanRadius = async (plan: string): Promise<number | null> => {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/subscriptions/content`);
      if (!res.ok) return null;

      const contents: SubscriptionContent[] = await res.json();
      const match = contents.find((c) => c.plan?.toLowerCase() === plan?.toLowerCase());

      if (!match?.geographic_scope) return null;

      const radius = parseFloat(match.geographic_scope);
      return isNaN(radius) ? null : radius;
    } catch (e) {
      console.error('Error fetching plan radius:', e);
      return null;
    }
  };

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];

    allRequests.forEach((r) => {
      if (r.service_type && !seen.has(r.service_type)) {
        seen.add(r.service_type);
        result.push(r.service_type);
      }
    });

    return result;
  }, [allRequests]);

  const fetchData = useCallback(async (showLoader = true) => {
    if (!user?.id) return;

    try {
      if (showLoader) setIsLoading(true);

      let providerCats: string[] = [];
      let providerCityName = '';
      let coords: { lat: number; lon: number } | null = null;
      let providerPlan = '';

      const profileRes = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;

        providerCityName = profile?.city || '';
        providerPlan = profile?.plan || '';
        setProviderCity(providerCityName);

        if (providerCityName) {
          coords = await getCityCoordinates(providerCityName);
          setProviderCoords(coords);
        } else {
          setProviderCoords(null);
        }

        if (profile?.category) {
          providerCats = profile.category
            .split(',')
            .map((c: string) => c.trim())
            .filter(Boolean);
        }

        setProviderCategories(providerCats);
      }

      const planRadius = providerPlan ? await fetchPlanRadius(providerPlan) : null;

      const res = await fetch(`${ENV.API_BASE_URL}/service_request`);
      if (!res.ok) {
        setAllRequests([]);
        return;
      }

      const data: ServiceRequest[] = await res.json();
      const approvedRequests = data.filter((r) => r.agree);

      if (coords && planRadius !== null) {
        const withDistances = await Promise.all(
          approvedRequests.map(async (req) => {
            if (!req.service_address) return { ...req, distance: null };
            if (!isLikelyPlaceName(req.service_address)) return { ...req, distance: null };

            const reqCoords = await getCityCoordinates(req.service_address);
            const distance = reqCoords ? calculateDistance(coords!, reqCoords) : null;

            return { ...req, distance };
          })
        );

        const withinRadius = withDistances.filter(
          (r) => r.distance === null || r.distance <= planRadius
        );

        setAllRequests(withinRadius);
      } else {
        setAllRequests(approvedRequests);
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
      setAllRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData(false);
  }, [fetchData]);

  const handleCityFilterChange = (text: string) => {
    setCityFilter(text);

    if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);

    if (!text || text.trim().length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }

    cityTimeoutRef.current = setTimeout(async () => {
      try {
        const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          text
        )}&type=city&filter=countrycode:de&limit=8&lang=en&apiKey=${ENV.GEOAPIFY_API_KEY}`;

        const r = await fetch(url);
        const d = await r.json();
        const cities =
          d?.features?.map((f: any) => f?.properties?.city).filter(Boolean) ?? [];
        const unique = Array.from(new Set(cities)) as string[];

        setCitySuggestions(unique);
        setShowCitySuggestions(unique.length > 0);
      } catch {
        setCitySuggestions([]);
      }
    }, 400);
  };

  const handleCitySelect = (city: string) => {
    setCityFilter(city);
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  useEffect(() => {
    if (sortMode !== 'distance' || !providerCoords || allRequests.length === 0) return;

    setIsGeocodingCities(true);

    Promise.all(
      allRequests.map(async (req) => {
        if (req.distance !== undefined) return req;
        if (!req.service_address) return { ...req, distance: null };

        const coords = await getCityCoordinates(req.service_address);
        const distance = coords ? calculateDistance(providerCoords, coords) : null;

        return { ...req, distance };
      })
    ).then((updated) => {
      setAllRequests(updated);
      setIsGeocodingCities(false);
    });
  }, [sortMode, providerCoords]);

  const processedRequests = useMemo(() => {
    let filtered = [...allRequests];

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.desc_service?.toLowerCase().includes(q) ||
          r.service_type?.toLowerCase().includes(q) ||
          r.service_address?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter((r) => r.service_type === selectedCategory);
    }

    if (cityFilter.trim()) {
      filtered = filtered.filter((r) =>
        r.service_address?.toLowerCase().includes(cityFilter.toLowerCase())
      );
    }

    if (sortMode === 'distance' && providerCoords) {
      return filtered.sort((a, b) => {
        const da = a.distance ?? Infinity;
        const db = b.distance ?? Infinity;
        return da - db;
      });
    }

    if (sortMode === 'price') {
      return filtered.sort((a, b) => {
        const pa = parseFloat(a.price_service || '0');
        const pb = parseFloat(b.price_service || '0');
        return pb - pa;
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [allRequests, searchText, selectedCategory, cityFilter, sortMode, providerCoords]);

  const visibleRequests = useMemo(
    () => processedRequests.slice(0, visibleCount),
    [processedRequests, visibleCount]
  );

  const renderRequest = useCallback(
    ({ item }: { item: ServiceRequest }) => {
      const colors = getCategoryColors(item.service_type);
      const isCategoryMatch = matchesProviderCategories(item.service_type, providerCategories);

      return (
        <Pressable
          disabled={!isCategoryMatch}
          style={({ pressed }) => [
            styles.requestCard,
            !isCategoryMatch && styles.requestCardDisabled,
            pressed && isCategoryMatch && styles.requestCardPressed,
          ]}
          onPress={() => {
            if (isCategoryMatch) {
              router.push(`/(provider)/request-details?id=${item.id}`);
            }
          }}
        >
          <View style={styles.requestRight}>
            <View style={styles.titleRow}>
              {!isCategoryMatch && (
                <View style={styles.lockIconWrap}>
                  <Ionicons name="lock-closed" size={wp(3.8)} color="#94A3B8" />
                </View>
              )}
              <Text
                style={[styles.requestTitle, !isCategoryMatch && styles.requestTitleDisabled]}
                numberOfLines={2}
              >
                {item.desc_service || item.service_type}
              </Text>
            </View>

            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: isCategoryMatch ? colors.bg : '#E5E7EB' },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: isCategoryMatch ? colors.text : '#64748B' },
                ]}
                numberOfLines={1}
              >
                {item.service_type}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={wp(3.5)} color="#9CA3AF" />
              <Text style={styles.infoText}>{getTimeAgo(item.created_at)}</Text>
            </View>

            {item.service_address && (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={wp(3.5)} color="#9CA3AF" />
                <Text style={styles.infoText}>
                  {item.service_address}
                  {item.distance != null ? ` · ${item.distance} km` : ''}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.requestLeft}>
            {!isCategoryMatch ? (
              <View style={styles.mismatchIndicator}>
                <Ionicons name="lock-closed" size={wp(4)} color="#64748B" />
                <Text style={styles.mismatchText}>غير مطابق</Text>
              </View>
            ) : item.price_service ? (
              <>
                <Text style={styles.priceText}>{item.price_service}€</Text>
                <Text style={styles.priceLabel}>الميزانية</Text>
              </>
            ) : (
              <Text style={styles.priceLabel}>بدون ميزانية</Text>
            )}
          </View>
        </Pressable>
      );
    },
    [providerCategories, router]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>الطلبات المتاحة</Text>
        <View style={styles.headerMeta}>
          {providerCity ? <Text style={styles.headerSubtitle}>📍 {providerCity}</Text> : null}
          {providerCategories.length > 0 && (
            <Text style={styles.headerSubtitle}>
              🛠️ {providerCategories.slice(0, 2).join('، ')}
              {providerCategories.length > 2 ? ` +${providerCategories.length - 2}` : ''}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={wp(5)} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث عن طلب..."
          placeholderTextColor="#9CA3AF"
          value={searchText}
          onChangeText={setSearchText}
          textAlign="right"
        />
        {searchText.length > 0 && (
          <Pressable onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={wp(5)} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            style={[styles.filterChip, sortMode === 'default' && styles.filterChipActive]}
            onPress={() => setSortMode('default')}
          >
            <Ionicons name="time-outline" size={wp(3.5)} color={sortMode === 'default' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterChipText, sortMode === 'default' && styles.filterChipTextActive]}>الأحدث</Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, sortMode === 'distance' && styles.filterChipActive]}
            onPress={() => setSortMode('distance')}
          >
            <Ionicons name="location-outline" size={wp(3.5)} color={sortMode === 'distance' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterChipText, sortMode === 'distance' && styles.filterChipTextActive]}>الأقرب</Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, sortMode === 'price' && styles.filterChipActive]}
            onPress={() => setSortMode('price')}
          >
            <Ionicons name="cash-outline" size={wp(3.5)} color={sortMode === 'price' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterChipText, sortMode === 'price' && styles.filterChipTextActive]}>الأعلى سعراً</Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, selectedCategory !== '' && styles.filterChipActive]}
            onPress={() => setShowCategoryPicker((p) => !p)}
          >
            <Ionicons name="grid-outline" size={wp(3.5)} color={selectedCategory ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.filterChipText, selectedCategory !== '' && styles.filterChipTextActive]}>
              {selectedCategory ? selectedCategory.substring(0, 12) : 'الفئة'}
            </Text>
            {selectedCategory !== '' && (
              <Pressable onPress={() => setSelectedCategory('')}>
                <Ionicons name="close-circle" size={wp(4)} color="#FFFFFF" />
              </Pressable>
            )}
          </Pressable>
        </ScrollView>
      </View>

      {showCategoryPicker && (
        <View style={styles.categoryDropdown}>
          <ScrollView style={{ maxHeight: hp(20) }} nestedScrollEnabled>
            {categories.map((cat, i) => (
              <Pressable
                key={i}
                style={[styles.categoryDropdownItem, selectedCategory === cat && styles.categoryDropdownItemActive]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={[styles.categoryDropdownText, selectedCategory === cat && styles.categoryDropdownTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.cityFilterContainer}>
        <View style={styles.cityInputWrapper}>
          <Ionicons name="location-outline" size={wp(4)} color="#9CA3AF" />
          <TextInput
            style={styles.cityInput}
            placeholder="فلتر حسب المدينة..."
            placeholderTextColor="#9CA3AF"
            value={cityFilter}
            onChangeText={handleCityFilterChange}
            textAlign="right"
          />
          {cityFilter.length > 0 && (
            <Pressable
              onPress={() => {
                setCityFilter('');
                setCitySuggestions([]);
              }}
            >
              <Ionicons name="close-circle" size={wp(4)} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {showCitySuggestions && citySuggestions.length > 0 && (
          <View style={styles.citySuggestionsContainer}>
            {citySuggestions.map((s, i) => (
              <Pressable key={i} style={styles.citySuggestionItem} onPress={() => handleCitySelect(s)}>
                <Ionicons name="location-outline" size={wp(3.5)} color="#6B7280" />
                <Text style={styles.citySuggestionText}>{s}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>{processedRequests.length} طلب متاح</Text>
        {isGeocodingCities && (
          <View style={styles.geocodingRow}>
            <ActivityIndicator size="small" color="#2F6FDB" />
            <Text style={styles.geocodingText}>جاري تحديد المواقع...</Text>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FDB" />
          <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
        </View>
      ) : (
        <FlatList
          data={visibleRequests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#2F6FDB']}
              tintColor="#2F6FDB"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>لا توجد طلبات متاحة</Text>
              <Text style={styles.emptySubText}>جرب تغيير الفلاتر أو ابحث بكلمة أخرى</Text>
            </View>
          }
          ListFooterComponent={
            visibleCount < processedRequests.length ? (
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
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp(5),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: wp(5.5), fontWeight: '800', color: '#1F2937', textAlign: 'right' },
  headerMeta: { flexDirection: 'row', justifyContent: 'flex-end', gap: wp(3), marginTop: hp(0.4), flexWrap: 'wrap' },
  headerSubtitle: { fontSize: wp(3.2), color: '#6B7280', textAlign: 'right' },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: wp(4),
    marginTop: hp(1.5),
    marginBottom: hp(0.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: wp(2),
  },
  searchInput: { flex: 1, fontSize: wp(3.8), color: '#1F2937' },

  filterBar: { marginBottom: hp(0.5) },
  filterScroll: { paddingHorizontal: wp(4), paddingVertical: hp(1), gap: wp(2) },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: '#F3F4F6',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: 20,
  },
  filterChipActive: { backgroundColor: '#2F6FDB' },
  filterChipText: { fontSize: wp(3.2), color: '#6B7280', fontWeight: '600' },
  filterChipTextActive: { color: '#FFFFFF' },

  categoryDropdown: {
    marginHorizontal: wp(4),
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: hp(1),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryDropdownItem: { padding: wp(4), borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  categoryDropdownItemActive: { backgroundColor: '#EEF5FF' },
  categoryDropdownText: { fontSize: wp(3.8), color: '#1F2937', textAlign: 'right' },
  categoryDropdownTextActive: { color: '#2F6FDB', fontWeight: '700' },

  cityFilterContainer: { marginHorizontal: wp(4), marginBottom: hp(1) },
  cityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: wp(2),
  },
  cityInput: { flex: 1, fontSize: wp(3.8), color: '#1F2937' },
  citySuggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: hp(0.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  citySuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3.5),
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: wp(2),
  },
  citySuggestionText: { fontSize: wp(3.8), color: '#1F2937' },

  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(5),
    marginBottom: hp(1),
  },
  resultsText: { fontSize: wp(3.2), color: '#6B7280', fontWeight: '500' },
  geocodingRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5) },
  geocodingText: { fontSize: wp(3), color: '#6B7280' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: hp(2) },
  loadingText: { fontSize: wp(3.8), color: '#6B7280' },

  listContent: { paddingHorizontal: wp(4), paddingBottom: hp(10), gap: hp(1.5) },
  emptyContainer: { paddingVertical: hp(8), alignItems: 'center', gap: hp(1.5) },
  emptyIcon: { fontSize: wp(12) },
  emptyText: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937' },
  emptySubText: { fontSize: wp(3.5), color: '#6B7280', textAlign: 'center', paddingHorizontal: wp(6) },

  loadMoreButton: {
    backgroundColor: '#2F6FDB',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(8),
    borderRadius: 12,
    alignSelf: 'center',
    marginVertical: hp(2),
  },
  loadMoreText: { fontSize: wp(4), color: '#FFFFFF', fontWeight: '600' },

  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: wp(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  requestCardPressed: { backgroundColor: '#F9FAFB', transform: [{ scale: 0.98 }] },
  requestCardDisabled: {
    opacity: 0.72,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },

  requestRight: { flex: 1, alignItems: 'flex-end', gap: hp(0.7) },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: wp(2),
    width: '100%',
  },
  lockIconWrap: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.1),
  },
  requestTitle: { flex: 1, fontSize: wp(4), fontWeight: '700', color: '#1F2937', textAlign: 'right' },
  requestTitleDisabled: { color: '#64748B' },

  categoryBadge: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.4),
    borderRadius: 20,
    maxWidth: wp(55),
  },
  categoryText: { fontSize: wp(2.8), fontWeight: '600' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1) },
  infoText: { fontSize: wp(3), color: '#9CA3AF' },

  requestLeft: { alignItems: 'center', paddingLeft: wp(3), minWidth: wp(18) },
  priceText: { fontSize: wp(4.5), fontWeight: '800', color: '#2F6FDB' },
  priceLabel: { fontSize: wp(2.8), color: '#9CA3AF', textAlign: 'center' },

  mismatchIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: hp(0.4),
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: hp(1),
    paddingHorizontal: wp(2.5),
    minWidth: wp(18),
  },
  mismatchText: {
    fontSize: wp(2.8),
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
});
