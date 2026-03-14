import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
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
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CustomModal from '../../components/CustomModal';
import LoadingComponent from '../../components/LoadingComponent';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

interface ProviderProfile {
  user_id: number;
  city: string;
  phone: string;
  category: string;
  plan: string;
  plan_name: string;
  business_name: string;
  description: string;
  subscription_status: string;
  profile_picture: string;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  icon_url: string;
  is_active: boolean;
}

export default function ProviderAccountInfoScreen() {
  const { user, token, updateUser } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [providerPlan, setProviderPlan] = useState<'free' | 'pro'>('free');
  const maxCategories = providerPlan === 'pro' ? 5 : 1;

  // City suggestions
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [isCitySuggestionsOpen, setIsCitySuggestionsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const cityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Errors
  const [firstnameError, setFirstnameError] = useState<string | null>(null);
  const [lastnameError, setLastnameError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [businessNameError, setBusinessNameError] = useState<string | null>(null);

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm',
    message: '',
    title: '',
  });

  // ── Hardware back button ──────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProfileData();
    fetchCategories();
    return () => {
      if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);
    };
  }, []);

  const showModal = (
    type: 'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm',
    message: string,
    title?: string
  ) => {
    setModalConfig({ visible: true, type, message, title: title || '' });
  };

  const hideModal = () => {
    setModalConfig((prev) => ({ ...prev, visible: false }));
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/category`);
      if (response.ok) {
        const data: Category[] = await response.json();
        setCategories(data.filter((cat) => cat.is_active));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchProfileData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const response = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        const profile = Array.isArray(data) ? data[0] : data;
        setProfileData(profile);
        setFirstname(user.firstname || '');
        setLastname(user.lastname || '');
        setPhone(profile?.phone?.replace(/\s+/g, '') || '');
        setCity(profile?.city || '');
        setSelectedCity(profile?.city || '');
        setBusinessName(profile?.business_name || '');
        setDescription(profile?.description || '');

        // Plan + existing categories
        const plan = profile?.plan || 'free';
        setProviderPlan(plan === 'pro' ? 'pro' : 'free');
        const existingCats = profile?.category
          ? profile.category.split(',').map((c: string) => c.trim()).filter(Boolean)
          : [];
        setSelectedCategories(existingCats);
      }
    } catch (error) {
      console.error('Error fetching provider profile:', error);
      showModal('error', 'حدث خطأ أثناء تحميل البيانات', 'خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Category helpers ─────────────────────────────────────────────────────
  const toggleCategory = (name: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(name)) return prev.filter((c) => c !== name);
      if (prev.length >= maxCategories) {
        showModal(
          'warning',
          providerPlan === 'free'
            ? 'الخطة المجانية تسمح بفئة واحدة فقط. قم بالترقية إلى Pro للحصول على حتى 5 فئات.'
            : 'خطة Pro تسمح بحتى 5 فئات.',
          'تنبيه'
        );
        return prev;
      }
      return [...prev, name];
    });
  };

  const removeCategory = (name: string) => {
    setSelectedCategories((prev) => prev.filter((c) => c !== name));
  };

  const getCategoryObj = (name: string) => categories.find((c) => c.name === name);
  // ─────────────────────────────────────────────────────────────────────────

  const fetchCitySuggestions = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCitySuggestions([]);
      setIsCitySuggestionsOpen(false);
      return;
    }
    setIsLoadingCities(true);
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&type=city&filter=countrycode:de&limit=10&lang=en&apiKey=${ENV.GEOAPIFY_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) { setCitySuggestions([]); setIsCitySuggestionsOpen(false); return; }
      const data = await response.json();
      const cities = data?.features?.map((f: any) => f?.properties?.city).filter((c: string | null | undefined) => Boolean(c)) ?? [];
      const uniqueCities = Array.from(new Set(cities)).sort() as string[];
      setCitySuggestions(uniqueCities);
      setIsCitySuggestionsOpen(uniqueCities.length > 0);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCitySuggestions([]);
      setIsCitySuggestionsOpen(false);
    } finally {
      setIsLoadingCities(false);
    }
  };

  const handleCityChange = (text: string) => {
    setCity(text);
    setSelectedCity(null);
    setCityError(null);
    if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);
    cityTimeoutRef.current = setTimeout(() => fetchCitySuggestions(text), 500);
  };

  const handleCitySelect = (selectedCityName: string) => {
    setCity(selectedCityName);
    setSelectedCity(selectedCityName);
    setIsCitySuggestionsOpen(false);
    setCitySuggestions([]);
    setCityError(null);
  };

  const handleFirstnameChange = (text: string) => {
    setFirstname(text.replace(/[^A-Za-z\s'-]/g, ''));
    setFirstnameError(null);
  };

  const handleLastnameChange = (text: string) => {
    setLastname(text.replace(/[^A-Za-z\s'-]/g, ''));
    setLastnameError(null);
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const latinRegex = /^[A-Za-z\s'-]+$/;

    if (!firstname.trim()) {
      setFirstnameError('الرجاء إدخال الاسم الأول'); isValid = false;
    } else if (!latinRegex.test(firstname)) {
      setFirstnameError('يرجى كتابة الاسم الأول بالحروف اللاتينية فقط'); isValid = false;
    }

    if (!lastname.trim()) {
      setLastnameError('الرجاء إدخال الاسم الأخير'); isValid = false;
    } else if (!latinRegex.test(lastname)) {
      setLastnameError('يرجى كتابة الاسم الأخير بالحروف اللاتينية فقط'); isValid = false;
    }

    if (!businessName.trim()) {
      setBusinessNameError('الرجاء إدخال اسم الشركة'); isValid = false;
    }

    if (!city.trim()) {
      setCityError('الرجاء إدخال المدينة'); isValid = false;
    } else if (!selectedCity) {
      setCityError('يرجى اختيار مدينة من القائمة المقترحة ضمن ألمانيا'); isValid = false;
    }

    if (selectedCategories.length === 0) {
      showModal('warning', 'الرجاء اختيار فئة خدمة واحدة على الأقل', 'تنبيه');
      isValid = false;
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!token) { showModal('error', 'يرجى تسجيل الدخول مرة أخرى', 'خطأ'); return; }

    showModal('loading', 'جاري حفظ التعديلات...', 'الرجاء الانتظار');
    setIsSaving(true);

    try {
      const userResponse = await fetch(`${ENV.API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstname: firstname.trim(), lastname: lastname.trim() }),
      });
      if (!userResponse.ok) throw new Error('فشل تحديث بيانات المستخدم');
      const updatedUser = await userResponse.json();

      const profileResponse = await fetch(`${ENV.API_BASE_URL}/provider_profiles/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          user_id: user.id,
          phone: phone.trim() || null,
          city: selectedCity,
          business_name: businessName.trim(),
          description: description.trim(),
          category: selectedCategories.join(','),
        }),
      });
      if (!profileResponse.ok) throw new Error('فشل تحديث بيانات الملف الشخصي');
      const updatedProfile = await profileResponse.json();

      updateUser({ ...updatedUser });
      setProfileData(updatedProfile);
      setFirstname(updatedUser.firstname || '');
      setLastname(updatedUser.lastname || '');
      setPhone(updatedProfile?.phone?.replace(/\s+/g, '') || '');
      setCity(updatedProfile?.city || '');
      setSelectedCity(updatedProfile?.city || '');
      setBusinessName(updatedProfile?.business_name || '');
      setDescription(updatedProfile?.description || '');
      const updatedCats = updatedProfile?.category
        ? updatedProfile.category.split(',').map((c: string) => c.trim()).filter(Boolean)
        : [];
      setSelectedCategories(updatedCats);

      hideModal();
      setTimeout(() => showModal('success', 'تم تحديث معلومات الحساب بنجاح', 'نجاح'), 300);
    } catch (error) {
      console.error('Save failed:', error);
      hideModal();
      setTimeout(() => showModal('error', 'حدث خطأ أثناء حفظ البيانات', 'خطأ'), 300);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingComponent message="جاري تحميل البيانات..." />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>معلومات الحساب</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
        enableResetScrollToCoords={false}
      >
        {/* ── Personal Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المعلومات الشخصية</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>الاسم الأول *</Text>
            <TextInput
              style={[styles.input, firstnameError && styles.inputError]}
              value={firstname}
              onChangeText={handleFirstnameChange}
              placeholder="أدخل الاسم الأول"
              placeholderTextColor="#9CA3AF"
              autoComplete="given-name"
            />
            {firstnameError && <Text style={styles.errorText}>{firstnameError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم العائلة *</Text>
            <TextInput
              style={[styles.input, lastnameError && styles.inputError]}
              value={lastname}
              onChangeText={handleLastnameChange}
              placeholder="أدخل اسم العائلة"
              placeholderTextColor="#9CA3AF"
              autoComplete="family-name"
            />
            {lastnameError && <Text style={styles.errorText}>{lastnameError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>البريد الإلكتروني</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={user?.email}
              editable={false}
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.helpText}>لا يمكن تغيير البريد الإلكتروني</Text>
          </View>
        </View>

        {/* ── Business Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات العمل</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم الشركة *</Text>
            <TextInput
              style={[styles.input, businessNameError && styles.inputError]}
              value={businessName}
              onChangeText={(text) => { setBusinessName(text); setBusinessNameError(null); }}
              placeholder="أدخل اسم الشركة"
              placeholderTextColor="#9CA3AF"
            />
            {businessNameError && <Text style={styles.errorText}>{businessNameError}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>وصف الخدمات</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={(text) => { if (text.length <= 300) setDescription(text); }}
              placeholder="أدخل وصفاً لخدماتك وخبرتك..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{description.length}/300</Text>
          </View>

          {/* ── Category Picker ── */}
          <View style={styles.inputGroup}>
            <View style={styles.categoryHeader}>
              <Text style={styles.label}>فئات الخدمة *</Text>
              <View style={[styles.planBadge, providerPlan === 'pro' ? styles.planBadgePro : styles.planBadgeFree]}>
                <Text style={[styles.planBadgeText, providerPlan === 'pro' ? styles.planBadgeTextPro : styles.planBadgeTextFree]}>
                  {providerPlan === 'pro' ? '⭐ Pro · حتى 5' : '🆓 Free · فئة واحدة'}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.pickerTrigger, pressed && styles.pickerTriggerPressed]}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.pickerTriggerIcon}>🛠️</Text>
              <Text style={[
                styles.pickerTriggerText,
                selectedCategories.length === 0 && styles.pickerTriggerPlaceholder,
              ]}>
                {selectedCategories.length === 0
                  ? 'اضغط لاختيار الفئات...'
                  : `${selectedCategories.length} ${selectedCategories.length === 1 ? 'فئة محددة' : 'فئات محددة'}`}
              </Text>
              <View style={styles.pickerTriggerRight}>
                {selectedCategories.length > 0 && (
                  <View style={styles.pickerCountBadge}>
                    <Text style={styles.pickerCountText}>{selectedCategories.length}/{maxCategories}</Text>
                  </View>
                )}
                <Text style={styles.pickerChevron}>›</Text>
              </View>
            </Pressable>

            {selectedCategories.length > 0 && (
              <View style={styles.selectedTagsContainer}>
                {selectedCategories.map((name) => {
                  const cat = getCategoryObj(name);
                  return (
                    <View key={name} style={styles.selectedTag}>
                      {cat?.icon_url ? (
                        <Image
                          source={{ uri: cat.icon_url.startsWith('http') ? cat.icon_url : `${ENV.API_BASE_URL}${cat.icon_url}` }}
                          style={styles.selectedTagIcon}
                          resizeMode="contain"
                        />
                      ) : (
                        <Text style={styles.selectedTagIconFallback}>🛠️</Text>
                      )}
                      <Text style={styles.selectedTagText}>{name}</Text>
                      <Pressable onPress={() => removeCategory(name)} style={styles.selectedTagRemove}>
                        <Text style={styles.selectedTagRemoveText}>✕</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Plan badge */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>الباقة الحالية</Text>
            <View style={styles.planBadgeContainer}>
              <View style={[styles.planBadge, profileData?.plan === 'pro' ? styles.planBadgePro : styles.planBadgeFree]}>
                <Text style={[styles.planBadgeText, profileData?.plan === 'pro' ? styles.planBadgeTextPro : styles.planBadgeTextFree]}>
                  {profileData?.plan_name || 'الباقة المجانية'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Contact Info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات الاتصال</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="أدخل رقم الهاتف"
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
              autoComplete="tel"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>المدينة *</Text>
            <View style={styles.cityInputWrapper}>
              <TextInput
                style={[styles.input, cityError && styles.inputError]}
                value={city}
                onChangeText={handleCityChange}
                placeholder="أدخل المدينة"
                placeholderTextColor="#9CA3AF"
              />
              {isLoadingCities && (
                <ActivityIndicator size="small" color="#2F6FDB" style={styles.cityLoadingIndicator} />
              )}
            </View>
            {cityError && <Text style={styles.errorText}>{cityError}</Text>}
            {isCitySuggestionsOpen && citySuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView style={styles.suggestionsScrollView} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {citySuggestions.map((suggestion, index) => (
                    <Pressable key={index} style={styles.suggestionItem} onPress={() => handleCitySelect(suggestion)}>
                      <Text style={styles.suggestionIcon}>📍</Text>
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>حفظ التعديلات</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      {/* ── Category Picker Modal ── */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setPickerVisible(false)} style={styles.sheetCloseBtn}>
                <Text style={styles.sheetCloseText}>✕</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>اختر الفئات</Text>
              <View style={styles.sheetCountWrap}>
                <Text style={styles.sheetCountText}>{selectedCategories.length}/{maxCategories}</Text>
              </View>
            </View>

            <View style={[styles.sheetHint, providerPlan === 'pro' ? styles.sheetHintPro : styles.sheetHintFree]}>
              <Text style={[styles.sheetHintText, providerPlan === 'pro' ? styles.sheetHintTextPro : styles.sheetHintTextFree]}>
                {providerPlan === 'pro'
                  ? '⭐ خطة Pro — اختر حتى 5 فئات'
                  : '🆓 الخطة المجانية — فئة واحدة. قم بالترقية للمزيد.'}
              </Text>
            </View>

            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {categoriesLoading ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator color="#2F6FDB" />
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
                      <Text style={[
                        styles.sheetItemName,
                        isSelected && styles.sheetItemNameSelected,
                        isDisabled && styles.sheetItemNameDisabled,
                      ]}>
                        {cat.name}
                      </Text>
                      <View style={[styles.sheetCheckbox, isSelected && styles.sheetCheckboxSelected]}>
                        {isSelected && <Text style={styles.sheetCheckmark}>✓</Text>}
                      </View>
                    </Pressable>
                  );
                })
              )}
              <View style={{ height: hp(4) }} />
            </ScrollView>

            <View style={styles.sheetFooter}>
              <Pressable
                style={({ pressed }) => [styles.sheetDoneBtn, pressed && styles.sheetDoneBtnPressed]}
                onPress={() => setPickerVisible(false)}
              >
                <Text style={styles.sheetDoneBtnText}>
                  تم{selectedCategories.length > 0 ? ` (${selectedCategories.length} محدد)` : ''}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={modalConfig.visible}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={hideModal}
        showCloseButton={modalConfig.type !== 'loading'}
        autoClose={modalConfig.type === 'success'}
        autoCloseDelay={2000}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingTop: hp(6), paddingBottom: hp(2),
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  backButton: { width: wp(10), height: wp(10), borderRadius: wp(5), backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: wp(8), fontWeight: 'bold', color: '#1F2937', marginLeft: wp(1) },
  headerTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  placeholder: { width: wp(10) },
  scrollView: { flex: 1 },
  scrollContent: { padding: wp(4), paddingBottom: hp(10) },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(5), marginBottom: hp(2),
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(2), textAlign: 'right' },
  inputGroup: { marginBottom: hp(2) },
  label: { fontSize: wp(4), fontWeight: '600', color: '#374151', marginBottom: hp(1), textAlign: 'right' },
  cityInputWrapper: { position: 'relative' },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: wp(4), paddingVertical: hp(1.5), fontSize: wp(4), color: '#1F2937', textAlign: 'right',
  },
  textArea: { height: hp(12), paddingTop: hp(1.5) },
  charCount: { fontSize: wp(3), color: '#9CA3AF', textAlign: 'left', marginTop: hp(0.5) },
  cityLoadingIndicator: { position: 'absolute', right: wp(4), top: '50%', transform: [{ translateY: -10 }] },
  inputDisabled: { backgroundColor: '#F9FAFB', color: '#9CA3AF' },
  inputError: { borderColor: '#DC2626' },
  errorText: { fontSize: wp(3), color: '#DC2626', marginTop: hp(0.5), textAlign: 'right' },
  helpText: { fontSize: wp(3), color: '#6B7280', marginTop: hp(0.5), textAlign: 'right' },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: hp(1),
    borderWidth: 1, borderColor: '#E5E7EB', maxHeight: hp(30), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  suggestionsScrollView: { maxHeight: hp(30) },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: wp(4), borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  suggestionIcon: { fontSize: wp(4), marginLeft: wp(2) },
  suggestionText: { fontSize: wp(4), color: '#1F2937', textAlign: 'right', flex: 1 },

  // ── Category section ──────────────────────────────────────────────────────
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(1) },
  planBadgeContainer: { alignItems: 'flex-end' },
  planBadge: { paddingHorizontal: wp(2.5), paddingVertical: hp(0.4), borderRadius: 20, borderWidth: 1 },
  planBadgePro: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  planBadgeFree: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  planBadgeText: { fontSize: wp(2.8), fontWeight: '700' },
  planBadgeTextPro: { color: '#92400E' },
  planBadgeTextFree: { color: '#6B7280' },

  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: wp(4), paddingVertical: hp(1.8),
  },
  pickerTriggerPressed: { backgroundColor: '#F3F4F6' },
  pickerTriggerIcon: { fontSize: wp(5), marginLeft: wp(3) },
  pickerTriggerText: { flex: 1, fontSize: wp(3.8), color: '#1F2937', fontWeight: '500', textAlign: 'right' },
  pickerTriggerPlaceholder: { color: '#9CA3AF', fontWeight: '400' },
  pickerTriggerRight: { flexDirection: 'row', alignItems: 'center', gap: wp(2) },
  pickerCountBadge: { backgroundColor: '#2F6FDB', paddingHorizontal: wp(2), paddingVertical: hp(0.3), borderRadius: 10 },
  pickerCountText: { fontSize: wp(2.8), color: '#FFFFFF', fontWeight: '700' },
  pickerChevron: { fontSize: wp(6), color: '#9CA3AF', fontWeight: '300' },

  selectedTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2), marginTop: hp(1.5) },
  selectedTag: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF5FF',
    borderRadius: 20, borderWidth: 1, borderColor: '#BFDBFE',
    paddingLeft: wp(2), paddingRight: wp(1.5), paddingVertical: hp(0.6), gap: wp(1.5),
  },
  selectedTagIcon: { width: wp(4), height: wp(4) },
  selectedTagIconFallback: { fontSize: wp(3.5) },
  selectedTagText: { fontSize: wp(3.2), color: '#1E40AF', fontWeight: '600' },
  selectedTagRemove: { width: wp(5), height: wp(5), borderRadius: wp(2.5), backgroundColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center' },
  selectedTagRemoveText: { fontSize: wp(2.5), color: '#1E40AF', fontWeight: '800' },

  // ── Save ──────────────────────────────────────────────────────────────────
  saveButton: {
    backgroundColor: '#2F6FDB', borderRadius: 12, paddingVertical: hp(2),
    alignItems: 'center', marginTop: hp(2),
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },

  // ── Modal sheet ───────────────────────────────────────────────────────────
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
  sheetLoading: { paddingVertical: hp(6), alignItems: 'center', gap: hp(1) },
  sheetLoadingText: { fontSize: wp(3.5), color: '#6B7280' },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: hp(1.8), paddingHorizontal: wp(3),
    borderRadius: 14, marginBottom: hp(0.8), backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F3F4F6',
  },
  sheetItemLast: { marginBottom: 0 },
  sheetItemSelected: { backgroundColor: '#EEF5FF', borderColor: '#2F6FDB' },
  sheetItemDisabled: { opacity: 0.35 },
  sheetItemPressed: { backgroundColor: '#F3F4F6' },
  sheetItemIconWrap: { width: wp(11), height: wp(11), borderRadius: wp(5.5), backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: wp(3.5), borderWidth: 1, borderColor: '#E5E7EB' },
  sheetItemIconWrapSelected: { backgroundColor: '#EEF5FF', borderColor: '#BFDBFE' },
  sheetItemIcon: { width: wp(6), height: wp(6) },
  sheetItemIconFallback: { fontSize: wp(5.5) },
  sheetItemName: { flex: 1, fontSize: wp(4), fontWeight: '600', color: '#374151' },
  sheetItemNameSelected: { color: '#2F6FDB', fontWeight: '700' },
  sheetItemNameDisabled: { color: '#9CA3AF' },
  sheetCheckbox: { width: wp(6), height: wp(6), borderRadius: wp(3), borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  sheetCheckboxSelected: { backgroundColor: '#2F6FDB', borderColor: '#2F6FDB' },
  sheetCheckmark: { fontSize: wp(3.5), color: '#FFFFFF', fontWeight: '800' },
  sheetFooter: { paddingHorizontal: wp(5), paddingTop: hp(2), borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  sheetDoneBtn: { backgroundColor: '#2F6FDB', paddingVertical: hp(2), borderRadius: 14, alignItems: 'center', shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  sheetDoneBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  sheetDoneBtnText: { fontSize: wp(4.5), fontWeight: '700', color: '#FFFFFF' },
});