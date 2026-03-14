import { Ionicons } from '@expo/vector-icons';
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

// ── Address validity guard ───────────────────────────────────────────────────
// Returns false for strings that are clearly not geocodable place names:
// too short, contain newlines/special chars, or are mostly Arabic script
// (which indicates a service description leaked into the address field).
function isLikelyPlaceName(address: string): boolean {
  if (!address || address.trim().length < 3) return false;
  if (address.includes('\n') || address.includes('\r')) return false;
  // If more than 40% of non-space chars are Arabic, treat as description text
  const nonSpace = address.replace(/\s/g, '');
  if (nonSpace.length === 0) return false;
  const arabicChars = (nonSpace.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars / nonSpace.length > 0.4) return false;
  return true;
}
// ── Category match using the German part ─────────────────────────────────────
// Both category and service_type follow the pattern "Arabic - German/German2".
// We extract the German part (after " - ") and split by "/" to get individual
// German keywords. A match requires at least one German keyword from the
// request to appear in the category German keywords (or vice versa).
// This avoids false positives from shared Arabic words like "تركيب".
//
// Examples:
//   cat:  "نقل أثاث - Transporter/Umzug"          → ["transporter","umzug"]
//   type: "نقل أثاث - Transporter/Umzug"          → match ✅
//   type: "تركيب أرضيات - Bodenleger/Fliesenleger" → no overlap   ❌
//   cat:  "تركيب مطابخ - Küchenaufbau"             → ["küchenaufbau"]
//   type: "تركيب أرضيات - Bodenleger/Fliesenleger" → no overlap   ❌
//
// Fallback: if either side has no German part, use full-string equality.
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
    // 1. Exact full-string match (case-insensitive)
    if (typeNorm.toLowerCase() === cat.trim().toLowerCase()) return true;

    // 2. German-token match — primary strategy
    const typeGerman = extractGermanTokens(typeNorm);
    const catGerman  = extractGermanTokens(cat);

    if (typeGerman.length > 0 && catGerman.length > 0) {
      return typeGerman.some((tg: string) =>
        catGerman.some((cg: string) => tg === cg || tg.includes(cg) || cg.includes(tg))
      );
    }

    // 3. Fallback: no German part on either side
    return typeNorm.toLowerCase().includes(cat.trim().toLowerCase())
      || cat.trim().toLowerCase().includes(typeNorm.toLowerCase());
  });
}
// ────────────────────────────────────────────────────────────────────────────

export default function ProviderDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [providerCity, setProviderCity] = useState<string>('');
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const fetchPlanRadius = async (plan: string): Promise<number | null> => {
    try {
      console.log('📡 Fetching subscription content for plan:', plan);
      const res = await fetch(`${ENV.API_BASE_URL}/subscriptions/content`);
      if (!res.ok) { console.warn('⚠️ Could not fetch subscription content'); return null; }
      const contents: SubscriptionContent[] = await res.json();
      const match = contents.find((c) => c.plan?.toLowerCase() === plan?.toLowerCase());
      if (!match?.geographic_scope) { console.warn('⚠️ No geographic_scope for plan:', plan); return null; }
      const radius = parseFloat(match.geographic_scope);
      console.log(`✅ Plan "${plan}" → radius: ${radius} km`);
      return isNaN(radius) ? null : radius;
    } catch (e) {
      console.error('❌ Error fetching plan radius:', e);
      return null;
    }
  };

  const fetchRequests = useCallback(async (showLoader = true) => {
    if (!user?.id) return;
    try {
      if (showLoader) setIsLoading(true);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📡 Fetching provider profile for:', user.id);

      // ── 1. Provider profile ──────────────────────────────────────────────
      const profileRes = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      console.log('📊 Profile status:', profileRes.status);

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
        console.log('✅ Provider city:', providerCityName);
        console.log('✅ Provider plan:', providerPlan);
        console.log('✅ Provider categories:', providerCategories);
      }

      // ── 2. Plan radius ───────────────────────────────────────────────────
      const planRadius = providerPlan ? await fetchPlanRadius(providerPlan) : null;
      setRadiusKm(planRadius);
      console.log('📏 Geographic radius:', planRadius !== null ? `${planRadius} km` : 'unlimited (fallback)');

      // ── 3. All service requests ──────────────────────────────────────────
      console.log('📡 Fetching service requests...');
      const requestsRes = await fetch(`${ENV.API_BASE_URL}/service_request`);
      console.log('📊 Service request status:', requestsRes.status);
      const rawText = await requestsRes.text();

      if (!requestsRes.ok) {
        console.error('❌ Service request endpoint failed:', requestsRes.status);
        setRequests([]);
        return;
      }

      let categoryMatched: ServiceRequest[] = [];
      try {
        const parsed: ServiceRequest[] = JSON.parse(rawText);

        // ── 4. Filter: approved + ALL provider categories ─────────────────
        categoryMatched = parsed.filter((r) => {
          if (!r.agree) return false;
          return matchesProviderCategories(r.service_type, providerCategories);
        });

        console.log(
          `📦 Total: ${parsed.length} | Approved: ${parsed.filter(r => r.agree).length} | Category match: ${categoryMatched.length}`
        );
        // Per-category breakdown for debugging
        providerCategories.forEach((cat) => {
          const count = categoryMatched.filter(r =>
            matchesProviderCategories(r.service_type, [cat])
          ).length;
          console.log(`   🗂️ "${cat}": ${count} requests`);
        });
      } catch (parseErr) {
        console.error('❌ JSON parse error:', parseErr);
        setRequests([]);
        return;
      }

      if (categoryMatched.length === 0) {
        setRequests([]);
        return;
      }

      // ── 5. Geocode provider city ─────────────────────────────────────────
      if (providerCityName) {
        console.log('📍 Geocoding provider city:', providerCityName);
        const providerCoords = await getCityCoordinates(providerCityName);
        console.log('📍 Provider coords:', providerCoords);

        if (providerCoords) {
          // ── 6. Geocode each request + distance ───────────────────────────
          const withDistances = await Promise.all(
            categoryMatched.map(async (req) => {
              if (!req.service_address) return { ...req, distance: null };
              // Skip geocoding if address looks invalid (too short, pure Arabic
              // text, or clearly not a place name) — keep these requests in.
              if (!isLikelyPlaceName(req.service_address)) return { ...req, distance: null };
              const reqCoords = await getCityCoordinates(req.service_address);
              const distance = reqCoords ? calculateDistance(providerCoords, reqCoords) : null;
              return { ...req, distance };
            })
          );

          // ── 7. Filter by plan radius ─────────────────────────────────────
          const withinRadius = planRadius !== null
            ? withDistances.filter((r) => r.distance === null || r.distance <= planRadius)
            : withDistances;

          console.log(`🔍 Within ${planRadius ?? '∞'} km: ${withinRadius.length} / ${withDistances.length} requests`);

          // ── 8. Sort by distance, top 4 ───────────────────────────────────
          const sorted = withinRadius.sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
          });

          const final = sorted.slice(0, 4);

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🗂️ MY CATEGORIES:');
          providerCategories.forEach((cat, i) => {
            console.log(`   ${i + 1}. ${cat}`);
          });
          console.log('─────────────────────────────────');
          console.log('📋 REQUESTS BEING SHOWN:');
          final.forEach((r, i) => {
            const labels = ['🟢', '🟡', '🟠', '🔴'];
            console.log(`   ${labels[i] ?? '⚪'} #${i + 1} | Category: "${r.service_type}" | Address: ${r.service_address} | Distance: ${r.distance ?? 'N/A'} km`);
            console.log(`        Desc: "${r.desc_service?.substring(0, 40)}"`);
          });
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          setRequests(final);
          return;
        }
      }

      // ── Fallback: sort by date ───────────────────────────────────────────
      const sorted = categoryMatched.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const final = sorted.slice(0, 4);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️ Fallback: no coords, sorted by date');
      console.log('🗂️ MY CATEGORIES:');
      providerCategories.forEach((cat, i) => console.log(`   ${i + 1}. ${cat}`));
      console.log('─────────────────────────────────');
      console.log('📋 REQUESTS BEING SHOWN:');
      final.forEach((r, i) => {
        console.log(`   ⚪ #${i + 1} | Category: "${r.service_type}" | Address: ${r.service_address}`);
        console.log(`        Desc: "${r.desc_service?.substring(0, 40)}"`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      setRequests(final);
    } catch (error) {
      console.error('❌ Error fetching requests:', error);
      setRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchRequests(false);
  }, [fetchRequests]);

  return (
    <View style={styles.screen}>
      <ProviderHeader />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2F6FDB']} tintColor="#2F6FDB" />
        }
      >
        <View style={styles.sectionHeader}>
          <TouchableOpacity style={styles.viewAllButton}>
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