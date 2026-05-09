import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ClientHeader from '../../../components/ClientHeader';
import CustomModal from '../../../components/CustomModal';
import LoadingComponent from '../../../components/LoadingComponent';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helpers/common';

interface UserProfile {
  id: number;
  user_id: number;
  location: string;
  phone: string;
  profile_picture: string;
  created_at: string;
}
interface ProviderProfile {
  id: number;
  user_id: number;
  city: string;
  phone: string;
  category: string;
  plan: string;
  profile_picture: string;
  business_name: string;
  created_at: string;
}
interface ServiceRequest {
  id: number;
  id_user: number;
  agree: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserProfile | ProviderProfile | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const [completedRequestsCount, setCompletedRequestsCount] = useState(0);
  const [conversationsCount] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'confirm'>('confirm');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalPrimaryText, setModalPrimaryText] = useState('موافق');
  const [modalSecondaryText, setModalSecondaryText] = useState<string | undefined>(undefined);
  const [modalOnPrimary, setModalOnPrimary] = useState<(() => void) | undefined>(undefined);
  const [modalOnSecondary, setModalOnSecondary] = useState<(() => void) | undefined>(undefined);

  const showModal = (
    type: 'success' | 'error' | 'warning' | 'confirm',
    title: string,
    message: string,
    primaryText = 'موافق',
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void,
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalPrimaryText(primaryText);
    setModalSecondaryText(secondaryText);
    setModalOnPrimary(() => onPrimary);
    setModalOnSecondary(() => onSecondary);
    setModalVisible(true);
  };

  const handleNotificationPress = useCallback(() => {
    console.log('🔔 Notifications pressed');
  }, []);

  const fetchProfileData = useCallback(async (showLoader = true) => {
    if (!user?.id) return;
    try {
      if (showLoader) setIsLoading(true);

      let response;
      if (user.user_type?.id === 1) {
        response = await fetch(`${ENV.API_BASE_URL}/user_profiles?user_id=${user.id}`);
      } else if (user.user_type?.id === 2) {
        response = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      }

      if (response?.ok) {
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        const profile = Array.isArray(data) ? data[0] : data;
        if (profile && user.user_type?.id === 1 && !profile.location) {
          const storedCity = await SecureStore.getItemAsync('user_city');
          if (storedCity) profile.location = storedCity;
        }
        setProfileData(profile);
      }

      const requestsRes = await fetch(`${ENV.API_BASE_URL}/service_request`);
      if (requestsRes.ok) {
        const text = await requestsRes.text();
        const allData: ServiceRequest[] = text ? JSON.parse(text) : [];
        const userRequests = allData.filter(req => req.id_user === user.id);
        setServiceRequests(userRequests);
        setActiveRequestsCount(userRequests.filter(req => !req.agree).length);
        setCompletedRequestsCount(userRequests.filter(req => req.agree).length);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, user?.user_type?.id]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProfileData(false);
  }, [fetchProfileData]);

  const handleLogout = () => {
    showModal(
      'confirm',
      'تسجيل الخروج',
      'هل أنت متأكد من تسجيل الخروج؟',
      'تسجيل الخروج',
      async () => {
        await logout();
        router.replace('/(auth)/login');
      },
      'إلغاء',
      () => setModalVisible(false),
    );
  };

  const getLocation = () => {
    if (!profileData) return 'غير محدد';
    if (user?.user_type?.id === 1) return (profileData as UserProfile).location || 'غير محدد';
    return (profileData as ProviderProfile).city || 'غير محدد';
  };

  const getCategories = () => {
    if (user?.user_type?.id !== 2 || !profileData) return [];
    return ((profileData as ProviderProfile).category || '')
      .split(',').map(c => c.trim()).filter(c => c !== '');
  };

  const formatJoinDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getBasePath = () => user?.user_type?.id === 2 ? '/(provider)' : '/(client)';

  const menuSections = [
    {
      title: 'الحساب',
      items: [
        {
          icon: '👤',
          label: 'معلومات الحساب',
          action: () => router.push(`${getBasePath()}/account-info`),
          showArrow: true,
          danger: false,
        },
        ...(user?.user_type?.id === 2 ? [
          {
            icon: '🔧',
            label: 'خدماتي',
            action: () => router.push(`${getBasePath()}/my-services`),
            showArrow: true,
            danger: false,
          },
          {
            icon: '🔔',
            label: 'الإشعارات',
            action: () => router.push(`${getBasePath()}/notifications`),
            showArrow: true,
            danger: false,
          },
        ] : []),
      ],
    },
    {
      title: 'الأمان',
      items: [
        {
          icon: '🔒',
          label: 'تغيير كلمة السر',
          action: () => router.push(`${getBasePath()}/change-password`),
          showArrow: true,
          danger: false,
        },
      ],
    },
    {
      title: 'قانوني',
      items: [
        {
          icon: '📄',
          label: 'شروط الاستخدام',
          action: () => router.push('/(client)/terms-of-use'),
          showArrow: true,
          danger: false,
        },
        {
          icon: '🔐',
          label: 'سياسة الخصوصية',
          action: () => router.push('/(client)/privacy-policy'),
          showArrow: true,
          danger: false,
        },
      ],
    },
    {
      title: 'إعدادات الحساب',
      items: [
        {
          icon: '🗑️',
          label: 'حذف الحساب',
          action: () => router.push(`${getBasePath()}/delete-account`),
          showArrow: true,
          danger: true,
        },
        {
          icon: '🚪',
          label: 'تسجيل الخروج',
          action: handleLogout,
          showArrow: false,
          danger: true,
        },
      ],
    },
  ];

  if (isLoading) {
    return <LoadingComponent message="جاري تحميل الملف الشخصي..." />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ClientHeader onNotificationPress={handleNotificationPress} />
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
        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.firstname?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.firstname} {user?.lastname}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.email_verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
                <Text style={styles.verifiedText}>حساب موثق</Text>
              </View>
            )}
            {user?.user_type?.id === 2 && profileData && (
              <View style={styles.planBadge}>
                <Text style={styles.planText}>
                  {(profileData as ProviderProfile).plan || 'Free'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.userDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>{getLocation()}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📅</Text>
              <Text style={styles.detailText}>
                انضم {formatJoinDate(profileData?.created_at || user?.created_at || '')}
              </Text>
            </View>
            {user?.user_type?.id === 1 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>📝</Text>
                <Text style={styles.detailText}>{serviceRequests.length} طلب منشور</Text>
              </View>
            )}
          </View>
          {user?.user_type?.id === 2 && getCategories().length > 0 && (
            <View style={styles.categoriesContainer}>
              {getCategories().map((category, index) => (
                <View key={index} style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{category}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeRequestsCount}</Text>
            <Text style={styles.statLabel}>الطلبات النشطة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedRequestsCount}</Text>
            <Text style={styles.statLabel}>الطلبات المكتملة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{conversationsCount}</Text>
            <Text style={styles.statLabel}>المحادثات</Text>
          </View>
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <Pressable
                    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
                    onPress={item.action}
                  >
                    <View style={styles.menuItemLeft}>
                      <View style={[styles.menuIconContainer, item.danger && styles.menuIconDanger]}>
                        <Text style={styles.menuIcon}>{item.icon}</Text>
                      </View>
                      <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                        {item.label}
                      </Text>
                    </View>
                    {item.showArrow && <Text style={styles.menuArrow}>›</Text>}
                  </Pressable>
                  {itemIndex < section.items.length - 1 && <View style={styles.menuDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.versionText}>الإصدار 1.0.0</Text>
      </ScrollView>

      <CustomModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        primaryButtonText={modalPrimaryText}
        secondaryButtonText={modalSecondaryText}
        onPrimaryPress={modalOnPrimary}
        onSecondaryPress={modalOnSecondary}
        onClose={() => setModalVisible(false)}
        showCloseButton={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  scrollContent: { padding: wp(4), paddingBottom: hp(12) },
  userCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(5),
    marginBottom: hp(2), alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarContainer: { marginBottom: hp(2) },
  avatar: {
    width: wp(24), height: wp(24), borderRadius: wp(12),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#EEF5FF',
  },
  avatarText: { fontSize: wp(10), fontWeight: '700', color: '#FFFFFF' },
  userInfo: { alignItems: 'center', marginBottom: hp(1.5) },
  userName: { fontSize: wp(6), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  userEmail: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(1) },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5',
    paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12,
    gap: wp(1), marginTop: hp(0.5),
  },
  verifiedIcon: { fontSize: wp(3), color: '#10B981' },
  verifiedText: { fontSize: wp(3), color: '#10B981', fontWeight: '600' },
  planBadge: {
    backgroundColor: '#FEF3C7', paddingHorizontal: wp(3),
    paddingVertical: hp(0.5), borderRadius: 12, marginTop: hp(0.5),
  },
  planText: { fontSize: wp(3), color: '#D97706', fontWeight: '700' },
  userDetails: { width: '100%', marginBottom: hp(1.5) },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: hp(0.8) },
  detailIcon: { fontSize: wp(4), marginLeft: wp(2) },
  detailText: { fontSize: wp(3.5), color: '#6B7280', textAlign: 'center' },
  categoriesContainer: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: wp(2), marginBottom: hp(1),
  },
  categoryTag: { backgroundColor: '#EEF5FF', paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12 },
  categoryTagText: { fontSize: wp(3), color: '#2F6FDB', fontWeight: '600' },
  statsContainer: { flexDirection: 'row', gap: wp(3), marginBottom: hp(3) },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: wp(4),
    alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: wp(7), fontWeight: '800', color: '#2F6FDB', marginBottom: hp(0.5) },
  statLabel: { fontSize: wp(3), color: '#6B7280', textAlign: 'center' },
  menuSection: { marginBottom: hp(2.5) },
  menuSectionTitle: { fontSize: wp(4), fontWeight: '700', color: '#1F2937', marginBottom: hp(1.5), textAlign: 'right' },
  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: wp(4) },
  menuItemPressed: { backgroundColor: '#F9FAFB' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIconContainer: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginLeft: wp(3),
  },
  menuIconDanger: { backgroundColor: '#FEE2E2' },
  menuIcon: { fontSize: wp(5) },
  menuLabel: { fontSize: wp(4), color: '#1F2937', fontWeight: '500', textAlign: 'right', flex: 1 },
  menuLabelDanger: { color: '#DC2626' },
  menuArrow: { fontSize: wp(6), color: '#D1D5DB', fontWeight: 'bold' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: wp(17) },
  versionText: { fontSize: wp(3), color: '#9CA3AF', textAlign: 'center', marginTop: hp(2) },
});