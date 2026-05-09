import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ENV } from '../config/env';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { hp, wp } from '../helpers/common';

interface ProviderStats {
  totalOffers: number;
  rating: number;
  planName: string;
  plan: string;
}

interface ProviderHeaderProps {
  refreshKey?: number;
}

export default function ProviderHeader({ refreshKey = 0 }: ProviderHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const [stats, setStats] = useState<ProviderStats>({
    totalOffers: 0,
    rating: 0,
    planName: 'الباقة المجانية',
    plan: 'free',
  });

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [profileRes, ratingsRes, offersRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`),
        fetch(`${ENV.API_BASE_URL}/ratings?provider_id=${user.id}`),
        fetch(`${ENV.API_BASE_URL}/comments/unique-posts-count/${user.id}`),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        const profile = Array.isArray(data) ? data[0] : data;
        setStats(prev => ({
          ...prev,
          planName: profile?.plan_name || 'الباقة المجانية',
          plan: profile?.plan || 'free',
        }));
      }

      if (ratingsRes.ok) {
        const ratingsData = await ratingsRes.json();
        if (ratingsData.length > 0) {
          const avg =
            ratingsData.reduce((sum: number, r: any) => sum + Number(r.rating), 0) /
            ratingsData.length;
          setStats(prev => ({ ...prev, rating: Math.round(avg * 10) / 10 }));
        }
      }

      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setStats(prev => ({ ...prev, totalOffers: offersData.count ?? 0 }));
      }
    } catch (error) {
      console.error('Error fetching provider header stats:', error);
    }
  }, [user?.id]);

  // ✅ Re-fetch whenever refreshKey changes (focus or pull-to-refresh)
  useEffect(() => {
    fetchStats();
  }, [fetchStats, refreshKey]);

  const isPro = stats.plan === 'pro';

  return (
    <View style={[styles.wrapper, !isPro && { marginBottom: SUBSCRIPTION_CARD_HEIGHT / 2 }]}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(provider)/notifications')}
          >
            <Ionicons name="notifications-outline" size={wp(6)} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.nameContainer}>
            <Text style={styles.greeting}>مرحباً</Text>
            <Text style={styles.name}>
              {user?.firstname} {user?.lastname}
            </Text>
          </View>

          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={wp(5)} color="#FFFFFF" />
            <Text style={styles.statValue}>
              {stats.rating > 0 ? stats.rating.toFixed(1) : '—'}
            </Text>
            <Text style={styles.statLabel}>التقييم</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="briefcase-outline" size={wp(5)} color="#FFFFFF" />
            <Text style={styles.statValue}>{stats.totalOffers}</Text>
            <Text style={styles.statLabel}>العروض المرسلة</Text>
          </View>
        </View>

        <View style={!isPro ? styles.bottomPadding : styles.bottomPaddingPro} />
      </View>

      {!isPro && (
        <View style={styles.subscriptionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.upgradeButton,
              pressed && styles.upgradeButtonPressed,
            ]}
            onPress={() => router.push('/(provider)/upgrade-subscription')}
          >
            <Text style={styles.upgradeText}>ترقية الباقة</Text>
          </Pressable>
          <View style={styles.subscriptionInfo}>
            <Text style={styles.subscriptionLabel}>الباقة الحالية</Text>
            <Text style={styles.subscriptionValue}>{stats.planName}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const SUBSCRIPTION_CARD_HEIGHT = hp(10.5);

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 10 },
  container: {
    backgroundColor: '#2F6FDB',
    paddingHorizontal: wp(5),
    paddingTop: hp(6),
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: hp(3),
  },
  iconButton: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute', top: wp(1), right: wp(1),
    minWidth: wp(4.5), height: wp(4.5), borderRadius: wp(2.25),
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#2F6FDB',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: wp(0.8),
  },
  notificationBadgeText: { fontSize: wp(2.2), fontWeight: '700', color: '#FFFFFF' },
  nameContainer: { alignItems: 'center' },
  greeting: { fontSize: wp(3), color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  name: { fontSize: wp(5.5), color: '#FFFFFF', fontWeight: '800' },
  logo: { width: wp(15), height: wp(15) },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: wp(3) },
  statCard: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingVertical: hp(1.8), paddingHorizontal: wp(2), gap: hp(0.5),
  },
  statValue: { fontSize: wp(5), fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: wp(2.8), color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontWeight: '500' },
  bottomPadding: { height: SUBSCRIPTION_CARD_HEIGHT / 2 + hp(2.5) },
  bottomPaddingPro: { height: hp(2.5) },
  subscriptionRow: {
    position: 'absolute', bottom: -(SUBSCRIPTION_CARD_HEIGHT / 2),
    left: wp(5), right: wp(5), height: SUBSCRIPTION_CARD_HEIGHT,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 35, paddingHorizontal: wp(5),
    zIndex: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 8,
  },
  subscriptionInfo: { alignItems: 'flex-end' },
  subscriptionLabel: { fontSize: wp(2.8), color: '#9CA3AF', fontWeight: '500' },
  subscriptionValue: { fontSize: wp(3.8), color: '#1F2937', fontWeight: '700' },
  upgradeButton: {
    backgroundColor: '#2F6FDB', paddingVertical: hp(1.2), paddingHorizontal: wp(5),
    borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  upgradeButtonPressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  upgradeText: { fontSize: wp(3.5), color: '#FFFFFF', fontWeight: '700' },
});