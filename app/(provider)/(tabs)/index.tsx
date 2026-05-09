import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ProviderHeader from '../../../components/ProviderHeader';
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'كهربائي': { bg: '#FEF3C7', text: '#92400E' },
  'نجار':    { bg: '#DCFCE7', text: '#166534' },
  'سباك':    { bg: '#DBEAFE', text: '#1E40AF' },
  'نقل':     { bg: '#EDE9FE', text: '#5B21B6' },
  'دهان':    { bg: '#FCE7F3', text: '#9D174D' },
  'تنظيف':   { bg: '#ECFDF5', text: '#065F46' },
  'تكييف':   { bg: '#E0F2FE', text: '#0369A1' },
  'بناء':    { bg: '#FEF9C3', text: '#854D0E' },
  'حدادة':   { bg: '#F1F5F9', text: '#334155' },
  'أخرى':    { bg: '#F3F4F6', text: '#374151' },
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
    const catGerman  = extractGermanTokens(cat);
    if (typeGerman.length > 0 && catGerman.length > 0) {
      return typeGerman.some((tg: string) =>
        catGerman.some((cg: string) => tg === cg || tg.includes(cg) || cg.includes(tg))
      );
    }
    return typeNorm.toLowerCase().includes(cat.trim().toLowerCase())
      || cat.trim().toLowerCase().includes(typeNorm.toLowerCase());
  });
}

export default function ProviderDashboard() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [providerCity, setProviderCity] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  // ✅ Incrementing this forces ProviderHeader to re-run fetchStats
  const [headerRefreshKey, setHeaderRefreshKey] = useState(0);

  const fetchPlanRadius = async (plan: string): Promise<number | null> => {
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/subscriptions/content`);
      if (!res.ok) return null;
      const contents: SubscriptionContent[] = await res.json();
      const match = contents.find((c) => c.plan?.toLowerCase() === plan?.toLowerCase());
      if (!match?.geographic_scope) return null;
      const radius = parseFloat(match.geographic_scope);
      return isNaN(radius) ? null : radius;
    } catch {
      return null;
    }
  };

  const fetchRequests = useCallback(async (showLoader = true) => {
    if (!user?.id) return;
    try {
      if (showLoader) setIsLoading(true);

      const profileRes = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      let providerCityName = '';
      let providerCategories: string[] = [];
      let providerPlan = '';

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        providerCityName = profile?.city || '';
        providerPlan = profile?.plan || '';
        setProviderCity(providerCityName);
        if (profile?.category) {
          providerCategories = profile.category
            .split(',')
            .map((c: string) => c.trim())
            .filter(Boolean);
        }
      }

      const planRadius = providerPlan ? await fetchPlanRadius(providerPlan) : null;
      setRadiusKm(planRadius);

      const requestsRes = await fetch(`${ENV.API_BASE_URL}/service_request`);
      const rawText = await requestsRes.text();
      if (!requestsRes.ok) { setRequests([]); return; }

      let categoryMatched: ServiceRequest[] = [];
      try {
        const parsed: ServiceRequest[] = JSON.parse(rawText);
        categoryMatched = parsed.filter((r) => {
          if (!r.agree) return false;
          return matchesProviderCategories(r.service_type, providerCategories);
        });
      } catch {
        setRequests([]);
        return;
      }

      if (categoryMatched.length === 0) { setRequests([]); return; }

      if (providerCityName) {
        const providerCoords = await getCityCoordinates(providerCityName);
        if (providerCoords) {
          const withDistances = await Promise.all(
            categoryMatched.map(async (req) => {
              if (!req.service_address) return { ...req, distance: null };
              if (!isLikelyPlaceName(req.service_address)) return { ...req, distance: null };
              const reqCoords = await getCityCoordinates(req.service_address);
              const distance = reqCoords ? calculateDistance(providerCoords, reqCoords) : null;
              return { ...req, distance };
            })
          );
          const withinRadius = planRadius !== null
            ? withDistances.filter((r) => r.distance === null || r.distance <= planRadius)
            : withDistances;
          const sorted = withinRadius.sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });
          setRequests(sorted.slice(0, 4));
          return;
        }
      }

      const sorted = categoryMatched.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRequests(sorted.slice(0, 4));
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ✅ On every focus (e.g. returning from payment page), refresh user + header
  useFocusEffect(
    useCallback(() => {
      refreshUser();
      setHeaderRefreshKey((k) => k + 1);
      fetchRequests(false);
    }, [fetchRequests])
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // ✅ On pull-to-refresh: update user data AND re-render header stats
    await refreshUser();
    setHeaderRefreshKey((k) => k + 1);
    fetchRequests(false);
  }, [fetchRequests]);

  return (
    <View style={styles.screen}>
      {/* ✅ refreshKey causes header to re-fetch plan/stats when it changes */}
      <ProviderHeader refreshKey={headerRefreshKey} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#2F6FDB']}
            tintColor="#2F6FDB"
          />
        }
      >
        <View style={styles.sectionHeader}>
          <TouchableOpacity
  style={styles.viewAllButton}
  onPress={() => router.push('/(provider)/(tabs)/requests')}
>
  <Text style={styles.viewAllText}>عرض الكل</Text>
  <Ionicons name="chevron-back" size={wp(4)} color="#2F6FDB" />
</TouchableOpacity>
          <Text style={styles.sectionTitle}>
            {providerCity ? `طلبات قريبة من ${providerCity}` : 'طلبات جديدة في منطقتك'}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2F6FDB" />
            <Text style={styles.loadingText}>جاري تحميل الطلبات...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>لا توجد طلبات متاحة حالياً</Text>
            <Text style={styles.emptySubText}>
              {radiusKm !== null
                ? `لا توجد طلبات ضمن نطاق ${radiusKm} كم من موقعك`
                : 'سيتم إشعارك عند وجود طلبات جديدة في منطقتك'}
            </Text>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {requests.map((item) => {
              const colors = getCategoryColors(item.service_type);
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [styles.requestCard, pressed && styles.requestCardPressed]}
                  onPress={() => router.push(`/(provider)/request-details?id=${item.id}`)}
                >
                  <View style={styles.requestRight}>
                    <Text style={styles.requestTitle} numberOfLines={2}>
                      {item.desc_service || item.service_type}
                    </Text>
                    <View style={styles.requestMeta}>
                      <View style={[styles.categoryBadge, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.categoryText, { color: colors.text }]} numberOfLines={1}>
                          {item.service_type}
                        </Text>
                      </View>
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
                    {item.price_service ? (
                      <>
                        <Text style={styles.priceText}>{item.price_service}€</Text>
                        <Text style={styles.priceLabel}>الميزانية</Text>
                      </>
                    ) : (
                      <Text style={styles.negotiableText}>قابل{'\n'}للتفاوض</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: wp(5), paddingTop: hp(3), paddingBottom: hp(4) },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(2) },
  sectionTitle: { fontSize: wp(4.5), fontWeight: '800', color: '#1F2937', textAlign: 'right', flex: 1 },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', gap: wp(1) },
  viewAllText: { fontSize: wp(3.5), color: '#2F6FDB', fontWeight: '600' },
  loadingContainer: { paddingVertical: hp(8), alignItems: 'center', gap: hp(2) },
  loadingText: { fontSize: wp(3.8), color: '#6B7280' },
  emptyContainer: { paddingVertical: hp(8), alignItems: 'center', gap: hp(1.5) },
  emptyIcon: { fontSize: wp(12) },
  emptyText: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  emptySubText: { fontSize: wp(3.5), color: '#6B7280', textAlign: 'center', paddingHorizontal: wp(8), lineHeight: hp(2.5) },
  requestsList: { gap: hp(1.5) },
  requestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(4),
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  requestCardPressed: { backgroundColor: '#F9FAFB', transform: [{ scale: 0.98 }] },
  requestRight: { flex: 1, alignItems: 'flex-end', gap: hp(0.7) },
  requestTitle: { fontSize: wp(4), fontWeight: '700', color: '#1F2937', textAlign: 'right' },
  requestMeta: { flexDirection: 'row', justifyContent: 'flex-end' },
  categoryBadge: { paddingHorizontal: wp(3), paddingVertical: hp(0.4), borderRadius: 20, maxWidth: wp(50) },
  categoryText: { fontSize: wp(2.8), fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1) },
  infoText: { fontSize: wp(3), color: '#9CA3AF' },
  requestLeft: { alignItems: 'center', paddingLeft: wp(3), minWidth: wp(18) },
  priceText: { fontSize: wp(4.5), fontWeight: '800', color: '#2F6FDB' },
  priceLabel: { fontSize: wp(2.8), color: '#9CA3AF', textAlign: 'center' },
  negotiableText: { fontSize: wp(3), color: '#10B981', fontWeight: '600', textAlign: 'center' },
});