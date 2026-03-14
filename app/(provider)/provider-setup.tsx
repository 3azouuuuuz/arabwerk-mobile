import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import CustomModal from '../../components/CustomModal';
import ProviderSetupProgress from '../../components/ProviderSetupProgress';
import Template from '../../components/Template';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

interface Category {
  id: number;
  name: string;
  icon_url: string;
  is_active: boolean;
}

export default function ProviderSetup() {
  const router = useRouter();
  const { user } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'loading' | 'warning'>('warning');
  const [modalMessage, setModalMessage] = useState('');

  const [providerPlan, setProviderPlan] = useState<'free' | 'pro'>('free');
  const maxCategories = providerPlan === 'pro' ? 5 : 1;

  useEffect(() => {
    fetchCategories();
    fetchProviderPlan();
  }, []);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/category`);
      if (response.ok) {
        const data: Category[] = await response.json();
        setCategories(data.filter(cat => cat.is_active));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProviderPlan = async () => {
    if (!user?.id) return;
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const profile = Array.isArray(data) ? data[0] : data;
        if (profile?.plan === 'pro' || profile?.plan_name?.toLowerCase().includes('pro')) {
          setProviderPlan('pro');
        }
      }
    } catch (error) {
      console.error('Error fetching provider plan:', error);
    }
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(name)) return prev.filter(c => c !== name);
      if (prev.length >= maxCategories) {
        setModalType('warning');
        setModalMessage(
          providerPlan === 'free'
            ? 'الخطة المجانية تتيح فئة واحدة فقط. قم بالترقية إلى Pro لاختيار حتى 5 فئات.'
            : 'الخطة الاحترافية تتيح اختيار حتى 5 فئات.'
        );
        setModalVisible(true);
        return prev;
      }
      return [...prev, name];
    });
  };

  const removeCategory = (name: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== name));
  };

  const getCategoryObj = (name: string) => categories.find(c => c.name === name);

  const validateForm = () => {
    if (selectedCategories.length === 0) {
      setModalType('warning');
      setModalMessage('يرجى اختيار فئة خدمة واحدة على الأقل');
      setModalVisible(true);
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setModalType('loading');
    setModalMessage('جاري إعداد ملفك الشخصي...');
    setModalVisible(true);

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/provider_profiles/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessName.trim() || null,
          category: selectedCategories.join(','),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'فشل تحديث ملف مقدم الخدمة');
      }

      await SecureStore.deleteItemAsync('needs_setup');
      setModalVisible(false);
      setLoading(false);
      router.replace('/(provider)/(tabs)');
    } catch (error) {
      console.error('Provider setup error:', error);
      setLoading(false);
      setModalType('error');
      setModalMessage(error.message || 'حدث خطأ ما. يرجى المحاولة مجدداً.');
      setModalVisible(true);
    }
  };

  return (
    <Template bg="#F9FAFB">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="dark" />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* الرأس */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoText}>ArabWerk</Text>
            <Text style={styles.welcomeText}>إعداد نشاطك التجاري</Text>
            <Text style={styles.subtitle}>أخبر العملاء عن خدماتك</Text>
          </View>

          {/* شريط التقدم */}
          <ProviderSetupProgress currentStep={3} />

          <View style={styles.formSection}>

            {/* ── اختيار الفئة ── */}
            <View style={styles.inputContainer}>
              <View style={styles.labelRow}>
                <View style={[styles.planBadge, providerPlan === 'pro' ? styles.planBadgePro : styles.planBadgeFree]}>
                  <Text style={[styles.planBadgeText, providerPlan === 'pro' ? styles.planBadgeTextPro : styles.planBadgeTextFree]}>
                    {providerPlan === 'pro' ? '⭐ Pro · حتى 5' : '🆓 مجاني · 1 فقط'}
                  </Text>
                </View>
                <Text style={styles.label}>فئات الخدمة <Text style={styles.required}>*</Text></Text>
              </View>

              {/* زر الفتح */}
              <Pressable
                style={({ pressed }) => [styles.pickerTrigger, pressed && styles.pickerTriggerPressed]}
                onPress={() => setPickerVisible(true)}
                disabled={loading}
              >
                <View style={styles.pickerTriggerRight}>
                  {selectedCategories.length > 0 && (
                    <View style={styles.pickerCountBadge}>
                      <Text style={styles.pickerCountText}>{selectedCategories.length}/{maxCategories}</Text>
                    </View>
                  )}
                  <Text style={styles.pickerChevron}>‹</Text>
                </View>
                <Text style={[
                  styles.pickerTriggerText,
                  selectedCategories.length === 0 && styles.pickerTriggerPlaceholder,
                ]}>
                  {selectedCategories.length === 0
                    ? 'اضغط لاختيار الفئات...'
                    : `${selectedCategories.length} ${selectedCategories.length === 1 ? 'فئة' : 'فئات'} مختارة`}
                </Text>
                <Text style={styles.pickerTriggerIcon}>🛠️</Text>
              </Pressable>

              {/* الوسوم المختارة */}
              {selectedCategories.length > 0 && (
                <View style={styles.selectedTagsContainer}>
                  {selectedCategories.map(name => {
                    const cat = getCategoryObj(name);
                    return (
                      <View key={name} style={styles.selectedTag}>
                        <Pressable onPress={() => removeCategory(name)} style={styles.selectedTagRemove}>
                          <Text style={styles.selectedTagRemoveText}>✕</Text>
                        </Pressable>
                        <Text style={styles.selectedTagText}>{name}</Text>
                        {cat?.icon_url ? (
                          <Image
                            source={{ uri: cat.icon_url.startsWith('http') ? cat.icon_url : `${ENV.API_BASE_URL}${cat.icon_url}` }}
                            style={styles.selectedTagIcon}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.selectedTagIconFallback}>🛠️</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── اسم النشاط التجاري (اختياري) ── */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                اسم النشاط التجاري <Text style={styles.optionalLabel}>(اختياري)</Text>
              </Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="أدخل اسم نشاطك التجاري"
                  placeholderTextColor="#9CA3AF"
                  value={businessName}
                  onChangeText={setBusinessName}
                  autoCapitalize="words"
                  editable={!loading}
                  textAlign="right"
                />
                <Text style={styles.inputIcon}>🏢</Text>
              </View>
            </View>

            {/* ── إرسال ── */}
            <Pressable
              style={({ pressed }) => [
                styles.continueButton,
                loading && styles.continueButtonDisabled,
                pressed && !loading && styles.continueButtonPressed,
              ]}
              onPress={handleContinue}
              disabled={loading}
            >
              <Text style={styles.continueButtonText}>
                {loading ? 'جاري الإعداد...' : 'إنهاء الإعداد'}
              </Text>
            </Pressable>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                يمكنك تحديث ملفك التجاري في أي وقت من إعدادات حسابك.
              </Text>
              <Text style={styles.infoIcon}>ℹ️</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── مودال اختيار الفئة ── */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)} />
          <View style={styles.modalSheet}>
            {/* مقبض الصفحة */}
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetCountWrap}>
                <Text style={styles.sheetCountText}>{selectedCategories.length}/{maxCategories}</Text>
              </View>
              <Text style={styles.sheetTitle}>اختر الفئات</Text>
              <Pressable onPress={() => setPickerVisible(false)} style={styles.sheetCloseBtn}>
                <Text style={styles.sheetCloseText}>✕</Text>
              </Pressable>
            </View>

            {/* تلميح الخطة */}
            <View style={[styles.sheetHint, providerPlan === 'pro' ? styles.sheetHintPro : styles.sheetHintFree]}>
              <Text style={[styles.sheetHintText, providerPlan === 'pro' ? styles.sheetHintTextPro : styles.sheetHintTextFree]}>
                {providerPlan === 'pro'
                  ? '⭐ الخطة الاحترافية — اختر حتى 5 فئات'
                  : '🆓 الخطة المجانية — اختر فئة واحدة. قم بالترقية للمزيد.'}
              </Text>
            </View>

            {/* قائمة الفئات */}
            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {categoriesLoading ? (
                <View style={styles.sheetLoading}>
                  <Text style={styles.sheetLoadingText}>جاري تحميل الفئات...</Text>
                </View>
              ) : (
                categories.map((cat, index) => {
                  const isSelected = selectedCategories.includes(cat.name);
                  const isDisabled = !isSelected && selectedCategories.length >= maxCategories;
                  return (
                    <Pressable
                      key={cat.id}
                      style={({ pressed }) => [
                        styles.sheetItem,
                        index === categories.length - 1 && styles.sheetItemLast,
                        isSelected && styles.sheetItemSelected,
                        isDisabled && styles.sheetItemDisabled,
                        pressed && !isDisabled && styles.sheetItemPressed,
                      ]}
                      onPress={() => toggleCategory(cat.name)}
                    >
                      {/* مربع الاختيار - يسار (RTL) */}
                      <View style={[styles.sheetCheckbox, isSelected && styles.sheetCheckboxSelected]}>
                        {isSelected && <Text style={styles.sheetCheckmark}>✓</Text>}
                      </View>

                      {/* الاسم */}
                      <Text style={[
                        styles.sheetItemName,
                        isSelected && styles.sheetItemNameSelected,
                        isDisabled && styles.sheetItemNameDisabled,
                      ]}>
                        {cat.name}
                      </Text>

                      {/* الأيقونة - يمين (RTL) */}
                      <View style={[styles.sheetItemIconWrap, isSelected && styles.sheetItemIconWrapSelected]}>
                        {cat.icon_url ? (
                          <Image
                            source={{ uri: cat.icon_url.startsWith('http') ? cat.icon_url : `${ENV.API_BASE_URL}${cat.icon_url}` }}
                            style={[styles.sheetItemIcon, isDisabled && { opacity: 0.4 }]}
                            resizeMode="contain"
                          />
                        ) : (
                          <Text style={styles.sheetItemIconFallback}>🛠️</Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
              <View style={{ height: hp(4) }} />
            </ScrollView>

            {/* زر تم */}
            <View style={styles.sheetFooter}>
              <Pressable
                style={({ pressed }) => [styles.sheetDoneBtn, pressed && styles.sheetDoneBtnPressed]}
                onPress={() => setPickerVisible(false)}
              >
                <Text style={styles.sheetDoneBtnText}>
                  تم{selectedCategories.length > 0 ? ` (${selectedCategories.length} مختار)` : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
        showCloseButton={modalType !== 'loading'}
      />
    </Template>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: hp(4), paddingHorizontal: wp(6) },

  logoSection: { alignItems: 'center', marginBottom: hp(3), marginTop: hp(2) },
  logoIcon: { width: wp(15), height: wp(15), borderRadius: wp(7.5), backgroundColor: '#F4C430', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: hp(1.5) },
  logoImage: { width: '80%', height: '80%' },
  logoText: { fontSize: wp(8), fontWeight: 'bold', color: '#2F6FDB', marginBottom: hp(0.8) },
  welcomeText: { fontSize: wp(5.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  subtitle: { fontSize: wp(3.5), color: '#6B7280' },

  formSection: { flex: 1 },
  inputContainer: { marginBottom: hp(3) },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: hp(1) },
  label: { fontSize: wp(3.8), fontWeight: '700', color: '#1F2937', textAlign: 'right' },
  required: { color: '#EF4444' },
  optionalLabel: { fontSize: wp(3.2), fontWeight: '400', color: '#9CA3AF' },

  planBadge: { paddingHorizontal: wp(2.5), paddingVertical: hp(0.4), borderRadius: 20, borderWidth: 1 },
  planBadgePro: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  planBadgeFree: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  planBadgeText: { fontSize: wp(2.8), fontWeight: '700' },
  planBadgeTextPro: { color: '#92400E' },
  planBadgeTextFree: { color: '#6B7280' },

  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: wp(4), paddingVertical: hp(1.8),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  pickerTriggerPressed: { backgroundColor: '#F9FAFB' },
  pickerTriggerIcon: { fontSize: wp(5), marginLeft: wp(3) },
  pickerTriggerText: { flex: 1, fontSize: wp(3.8), color: '#1F2937', fontWeight: '500', textAlign: 'right' },
  pickerTriggerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  pickerTriggerRight: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  pickerCountBadge: { backgroundColor: '#2F6FDB', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: 10 },
  pickerCountText: { fontSize: wp(2.8), color: '#FFFFFF', fontWeight: '700' },
  pickerChevron: { fontSize: wp(6), color: '#9CA3AF', fontWeight: '300' },

  selectedTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2), marginTop: hp(1.5) },
  selectedTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EEF5FF', borderRadius: 20,
    borderWidth: 1, borderColor: '#BFDBFE',
    paddingRight: wp(2), paddingLeft: wp(1.5),
    paddingVertical: hp(0.6), gap: wp(1.5),
  },
  selectedTagIcon: { width: wp(4), height: wp(4) },
  selectedTagIconFallback: { fontSize: wp(3.5) },
  selectedTagText: { fontSize: wp(3.2), color: '#1E40AF', fontWeight: '600' },
  selectedTagRemove: { width: wp(5), height: wp(5), borderRadius: wp(2.5), backgroundColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center' },
  selectedTagRemoveText: { fontSize: wp(2.5), color: '#1E40AF', fontWeight: '800' },

  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: wp(4), height: hp(6.5), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  inputIcon: { fontSize: wp(4.5), marginLeft: wp(3) },
  input: { flex: 1, fontSize: wp(3.8), color: '#1F2937' },

  continueButton: { backgroundColor: '#2F6FDB', paddingVertical: hp(2), borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: hp(2), shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  continueButtonDisabled: { backgroundColor: '#9CA3AF', shadowOpacity: 0, elevation: 0 },
  continueButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  continueButtonText: { fontSize: wp(4.5), color: '#FFFFFF', fontWeight: '700' },

  infoBox: { flexDirection: 'row', backgroundColor: '#EEF5FF', borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', padding: wp(4), gap: wp(3), alignItems: 'flex-start' },
  infoIcon: { fontSize: wp(4.5) },
  infoText: { flex: 1, fontSize: wp(3.3), color: '#1E40AF', lineHeight: hp(2.3), textAlign: 'right' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: hp(85), paddingBottom: hp(2) },
  sheetHandle: { width: wp(12), height: hp(0.6), backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginTop: hp(1.5) },

  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wp(5), paddingVertical: hp(2), borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sheetCloseBtn: { width: wp(9), height: wp(9), borderRadius: wp(4.5), backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  sheetCloseText: { fontSize: wp(3.5), color: '#6B7280', fontWeight: '700' },
  sheetTitle: { fontSize: wp(4.5), fontWeight: '800', color: '#1F2937' },
  sheetCountWrap: { backgroundColor: '#2F6FDB', paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 20 },
  sheetCountText: { fontSize: wp(3), color: '#FFFFFF', fontWeight: '700' },

  sheetHint: { marginHorizontal: wp(5), marginTop: hp(1.5), marginBottom: hp(0.5), paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: 10, borderWidth: 1 },
  sheetHintPro: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  sheetHintFree: { backgroundColor: '#F0FDF4', borderColor: '#A7F3D0' },
  sheetHintText: { fontSize: wp(3.2), fontWeight: '600', textAlign: 'center' },
  sheetHintTextPro: { color: '#92400E' },
  sheetHintTextFree: { color: '#065F46' },

  sheetList: { paddingHorizontal: wp(4), marginTop: hp(1) },
  sheetLoading: { paddingVertical: hp(6), alignItems: 'center' },
  sheetLoadingText: { fontSize: wp(3.5), color: '#6B7280' },

  sheetItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: hp(1.8), paddingHorizontal: wp(3),
    borderRadius: 14, marginBottom: hp(0.8),
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F3F4F6',
  },
  sheetItemLast: { marginBottom: 0 },
  sheetItemSelected: { backgroundColor: '#EEF5FF', borderColor: '#2F6FDB' },
  sheetItemDisabled: { opacity: 0.35 },
  sheetItemPressed: { backgroundColor: '#F3F4F6' },

  sheetItemIconWrap: { width: wp(11), height: wp(11), borderRadius: wp(5.5), backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginLeft: wp(3.5), borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  sheetItemIconWrapSelected: { backgroundColor: '#EEF5FF', borderColor: '#BFDBFE' },
  sheetItemIcon: { width: wp(6), height: wp(6) },
  sheetItemIconFallback: { fontSize: wp(5.5) },

  sheetItemName: { flex: 1, fontSize: wp(4), fontWeight: '600', color: '#374151', textAlign: 'right' },
  sheetItemNameSelected: { color: '#2F6FDB', fontWeight: '700' },
  sheetItemNameDisabled: { color: '#9CA3AF' },

  sheetCheckbox: { width: wp(6), height: wp(6), borderRadius: wp(3), borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', marginRight: wp(1) },
  sheetCheckboxSelected: { backgroundColor: '#2F6FDB', borderColor: '#2F6FDB' },
  sheetCheckmark: { fontSize: wp(3.5), color: '#FFFFFF', fontWeight: '800' },

  sheetFooter: { paddingHorizontal: wp(5), paddingTop: hp(2), borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sheetDoneBtn: { backgroundColor: '#2F6FDB', paddingVertical: hp(2), borderRadius: 14, alignItems: 'center', shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  sheetDoneBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  sheetDoneBtnText: { fontSize: wp(4.5), fontWeight: '700', color: '#FFFFFF' },
});