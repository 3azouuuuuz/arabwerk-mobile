import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CustomModal from '../../../components/CustomModal';
import LoadingComponent from '../../../components/LoadingComponent';
import { ENV } from '../../../config/env';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helpers/common';

interface ProviderProfile {
  id: number;
  user_id: number;
  city: string;
  phone: string;
  category: string;
  plan: string;
  plan_name: string;
  subscription_status: string;
  subscription_start_date: string;
  profile_picture: string;
  business_name: string;
  created_at: string;
}

export default function ProviderProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalOffers, setTotalOffers] = useState(0);
  const [conversationsCount] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localProfilePicture, setLocalProfilePicture] = useState<string | null>(null);

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
    setModalType(type); setModalTitle(title); setModalMessage(message);
    setModalPrimaryText(primaryText); setModalSecondaryText(secondaryText);
    setModalOnPrimary(() => onPrimary); setModalOnSecondary(() => onSecondary);
    setModalVisible(true);
  };

  const fetchProfileData = useCallback(async (showLoader = true) => {
    if (!user?.id) return;
    try {
      if (showLoader) setIsLoading(true);
      const [profileRes, offersRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`),
        fetch(`${ENV.API_BASE_URL}/comments/unique-posts-count/${user.id}`),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        const profile = Array.isArray(data) ? data[0] : data;
        setProfileData(profile);
      }
      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setTotalOffers(offersData.count ?? 0);
      }
    } catch (error) {
      console.error('Error fetching provider profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchProfileData(); }, [fetchProfileData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProfileData(false);
  }, [fetchProfileData]);

  const handleLogout = () => {
    showModal(
      'confirm', 'تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟',
      'تسجيل الخروج',
      async () => { await logout(); router.replace('/(auth)/login'); },
      'إلغاء', () => setModalVisible(false),
    );
  };

  // ── Profile picture picker & upload ─────────────────────────────────────
  const handleChangePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showModal('warning', 'تنبيه', 'يرجى السماح بالوصول إلى الصور من إعدادات الجهاز.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setLocalProfilePicture(asset.uri);
      setIsUploadingPhoto(true);

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: `profile_${user?.id}.jpg`,
      } as any);

      const uploadRes = await fetch(`${ENV.API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('فشل رفع الصورة');

      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.url || uploadData.path || null;

      if (!imageUrl) throw new Error('لم يتم الحصول على رابط الصورة');

      // Save to provider profile
      const patchRes = await fetch(`${ENV.API_BASE_URL}/provider_profiles/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_picture: imageUrl }),
      });

      if (!patchRes.ok) throw new Error('فشل تحديث الصورة');

      setProfileData(prev => prev ? { ...prev, profile_picture: imageUrl } : prev);
      showModal('success', 'تم', 'تم تحديث صورة الملف الشخصي بنجاح');
    } catch (error: any) {
      console.error('Photo upload error:', error);
      setLocalProfilePicture(null);
      showModal('error', 'خطأ', error.message || 'فشل تحديث الصورة. يرجى المحاولة مجدداً.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }, [user?.id]);
  // ─────────────────────────────────────────────────────────────────────────

  const getCategories = () => {
    if (!profileData) return [];
    return (profileData.category || '').split(',').map(c => c.trim()).filter(Boolean);
  };

  const isPro = profileData?.plan?.toLowerCase().includes('pro');

  const getProfilePictureUri = (): string | null => {
    const pic = localProfilePicture || profileData?.profile_picture;
    if (!pic) return null;
    if (pic.startsWith('http')) return pic;
    if (pic.startsWith('data:') || pic.startsWith('file:')) return pic;
    return `${ENV.API_BASE_URL}${pic.startsWith('/') ? '' : '/'}${pic}`;
  };
  const profilePictureUri = getProfilePictureUri();

  const menuSections = [
    {
      title: 'الحساب',
      items: [
        { icon: '👤', label: 'معلومات الحساب', action: () => router.push('/(provider)/account-info'), showArrow: true, danger: false },
        { icon: '💳', label: 'إدارة الاشتراك', action: () => router.push('/(provider)/manage-subscription'), showArrow: true, danger: false },
      ],
    },
    {
      title: 'الأمان',
      items: [
        { icon: '🔒', label: 'تغيير كلمة السر', action: () => router.push('/(provider)/change-password'), showArrow: true, danger: false },
      ],
    },
    {
      title: 'إعدادات الحساب',
      items: [
        { icon: '🗑️', label: 'حذف الحساب', action: () => router.push('/(provider)/delete-account'), showArrow: true, danger: true },
        { icon: '🚪', label: 'تسجيل الخروج', action: handleLogout, showArrow: false, danger: true },
      ],
    },
  ];

  if (isLoading) return <LoadingComponent message="جاري تحميل الملف الشخصي..." />;

  const cats = getCategories();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#2F6FDB']} tintColor="#2F6FDB" />
        }
      >
        {/* ── Profile Card ── */}
        <View style={styles.userCard}>

          {/* Avatar with edit button */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarWrapper}>
              {profilePictureUri ? (
                <Image
                  source={{ uri: profilePictureUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>
                    {user?.firstname?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}

              {/* Upload overlay while uploading */}
              {isUploadingPhoto && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>

            {/* Edit icon button */}
            <Pressable
              style={({ pressed }) => [styles.editPhotoBtn, pressed && { opacity: 0.7 }]}
              onPress={handleChangePhoto}
              disabled={isUploadingPhoto}
            >
              <Text style={styles.editPhotoIcon}>✏️</Text>
            </Pressable>
          </View>

          <Text style={styles.userName}>{user?.firstname} {user?.lastname}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {/* Plan + City */}
          <View style={styles.badgeRow}>
            <View style={[styles.planBadge, isPro ? styles.planBadgePro : styles.planBadgeFree]}>
              <Text style={styles.planIcon}>{isPro ? '⭐' : '🆓'}</Text>
              <Text style={[styles.planText, isPro ? styles.planTextPro : styles.planTextFree]}>
                {profileData?.plan_name || 'الباقة المجانية'}
              </Text>
            </View>
            {profileData?.city ? (
              <View style={styles.cityBadge}>
                <Text style={styles.cityIcon}>📍</Text>
                <Text style={styles.cityText}>{profileData.city}</Text>
              </View>
            ) : null}
          </View>

          {/* Business name */}
          {profileData?.business_name ? (
            <View style={styles.businessRow}>
              <Text style={styles.businessIcon}>🏢</Text>
              <Text style={styles.businessName}>{profileData.business_name}</Text>
            </View>
          ) : null}

          {/* Categories */}
          {cats.length > 0 && (
            <View style={styles.categoriesContainer}>
              {cats.map((cat, i) => (
                <View key={i} style={styles.categoryTag}>
                  <Text style={styles.categoryTagText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalOffers.toLocaleString('en-US')}</Text>
            <Text style={styles.statLabel}>العروض المرسلة</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{conversationsCount.toLocaleString('en-US')}</Text>
            <Text style={styles.statLabel}>المحادثات</Text>
          </View>
        </View>

        {/* ── Menu ── */}
        {menuSections.map((section, si) => (
          <View key={si} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, ii) => (
                <View key={ii}>
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
                  {ii < section.items.length - 1 && <View style={styles.menuDivider} />}
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
  scrollContent: { padding: wp(4), paddingTop: hp(4), paddingBottom: hp(12) },

  userCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: wp(5),
    marginBottom: hp(2), alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },

  // ── Avatar ──────────────────────────────────────────────────────────────
  avatarContainer: {
    position: 'relative', marginBottom: hp(1.5),
  },
  avatarWrapper: {
    width: wp(22), height: wp(22), borderRadius: wp(11),
    borderWidth: 4, borderColor: '#EEF5FF', overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: {
    width: '100%', height: '100%',
    backgroundColor: '#2F6FDB',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: wp(9), fontWeight: '700', color: '#FFFFFF' },
  uploadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center',
  },
  editPhotoBtn: {
    position: 'absolute', bottom: 0, left: 0,
    width: wp(8), height: wp(8), borderRadius: wp(4),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  editPhotoIcon: { fontSize: wp(3.5) },
  // ─────────────────────────────────────────────────────────────────────────

  userName: { fontSize: wp(5.5), fontWeight: '800', color: '#1F2937', marginBottom: hp(0.3) },
  userEmail: { fontSize: wp(3.5), color: '#9CA3AF', marginBottom: hp(1.5) },

  badgeRow: {
    flexDirection: 'row', gap: wp(2), marginBottom: hp(1.5),
    flexWrap: 'wrap', justifyContent: 'center',
  },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: wp(1.5),
    paddingHorizontal: wp(3), paddingVertical: hp(0.6),
    borderRadius: 20, borderWidth: 1,
  },
  planBadgePro: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  planBadgeFree: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  planIcon: { fontSize: wp(3.5) },
  planText: { fontSize: wp(3.2), fontWeight: '700' },
  planTextPro: { color: '#D97706' },
  planTextFree: { color: '#6B7280' },
  cityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: wp(1),
    backgroundColor: '#EEF5FF', paddingHorizontal: wp(3),
    paddingVertical: hp(0.6), borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
  },
  cityIcon: { fontSize: wp(3.5) },
  cityText: { fontSize: wp(3.2), color: '#2F6FDB', fontWeight: '600' },

  businessRow: {
    flexDirection: 'row', alignItems: 'center', gap: wp(1.5),
    marginBottom: hp(1.5), backgroundColor: '#F9FAFB',
    paddingHorizontal: wp(4), paddingVertical: hp(0.8), borderRadius: 12,
  },
  businessIcon: { fontSize: wp(4) },
  businessName: { fontSize: wp(3.8), color: '#374151', fontWeight: '600' },

  categoriesContainer: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', gap: wp(2),
  },
  categoryTag: {
    backgroundColor: '#EEF5FF', paddingHorizontal: wp(3),
    paddingVertical: hp(0.5), borderRadius: 20,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
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

  menuSection: { marginBottom: hp(2) },
  menuSectionTitle: {
    fontSize: wp(3.8), fontWeight: '700', color: '#6B7280',
    marginBottom: hp(1), textAlign: 'right', paddingHorizontal: wp(1),
  },
  menuCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: wp(4),
  },
  menuItemPressed: { backgroundColor: '#F9FAFB' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIconContainer: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#F3F4F6', justifyContent: 'center',
    alignItems: 'center', marginLeft: wp(3),
  },
  menuIconDanger: { backgroundColor: '#FEE2E2' },
  menuIcon: { fontSize: wp(5) },
  menuLabel: { fontSize: wp(4), color: '#1F2937', fontWeight: '500', textAlign: 'right', flex: 1 },
  menuLabelDanger: { color: '#DC2626' },
  menuArrow: { fontSize: wp(6), color: '#D1D5DB', fontWeight: 'bold' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: wp(17) },
  versionText: { fontSize: wp(3), color: '#9CA3AF', textAlign: 'center', marginTop: hp(2) },
});