import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
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

interface UserProfile {
  id: number;
  user_id: number;
  location: string;
  phone: string;
  profile_picture: string;
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
}

export default function AccountInfoScreen() {
  const { user, token, updateUser } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<UserProfile | ProviderProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [businessName, setBusinessName] = useState('');

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

  // Modal state
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    type: 'success' as 'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm',
    message: '',
    title: '',
  });

  // ── Hardware back button ─────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
  // ────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    return () => {
      if (cityTimeoutRef.current) {
        clearTimeout(cityTimeoutRef.current);
      }
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

  const fetchProfileData = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      let response;
      if (user.user_type?.id === 1) {
        response = await fetch(`${ENV.API_BASE_URL}/user_profiles?user_id=${user.id}`);
      } else if (user.user_type?.id === 2) {
        response = await fetch(`${ENV.API_BASE_URL}/provider_profiles?user_id=${user.id}`);
      }
      if (response?.ok) {
        const data = await response.json();
        const profile = Array.isArray(data) ? data[0] : data;
        setProfileData(profile);
        setFirstname(user.firstname || '');
        setLastname(user.lastname || '');
        setPhone(profile?.phone?.replace(/\s+/g, '') || '');
        if (user.user_type?.id === 1) {
          const userCity = (profile as UserProfile)?.location || '';
          setCity(userCity);
          setSelectedCity(userCity);
        } else {
          const providerCity = (profile as ProviderProfile)?.city || '';
          setCity(providerCity);
          setSelectedCity(providerCity);
          setBusinessName((profile as ProviderProfile)?.business_name || '');
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showModal('error', 'حدث خطأ أثناء تحميل البيانات', 'خطأ');
    } finally {
      setIsLoading(false);
    }
  };

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
      if (!response.ok) {
        setCitySuggestions([]);
        setIsCitySuggestionsOpen(false);
        return;
      }
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
    cityTimeoutRef.current = setTimeout(() => {
      fetchCitySuggestions(text);
    }, 500);
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
      setFirstnameError('الرجاء إدخال الاسم الأول');
      isValid = false;
    } else if (!latinRegex.test(firstname)) {
      setFirstnameError('يرجى كتابة الاسم الأول بالحروف اللاتينية فقط');
      isValid = false;
    }
    if (!lastname.trim()) {
      setLastnameError('الرجاء إدخال الاسم الأخير');
      isValid = false;
    } else if (!latinRegex.test(lastname)) {
      setLastnameError('يرجى كتابة الاسم الأخير بالحروف اللاتينية فقط');
      isValid = false;
    }
    if (!city.trim()) {
      setCityError('الرجاء إدخال المدينة');
      isValid = false;
    } else if (!selectedCity) {
      setCityError('يرجى اختيار مدينة من القائمة المقترحة ضمن ألمانيا');
      isValid = false;
    }
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!token) {
      showModal('error', 'يرجى تسجيل الدخول مرة أخرى', 'خطأ');
      return;
    }
    showModal('loading', 'جاري حفظ التعديلات...', 'الرجاء الانتظار');
    setIsSaving(true);
    try {
      const userResponse = await fetch(`${ENV.API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ firstname: firstname.trim(), lastname: lastname.trim() }),
      });
      if (!userResponse.ok) throw new Error('فشل تحديث بيانات المستخدم');
      const updatedUser = await userResponse.json();

      const profileEndpoint = user.user_type?.id === 1
        ? `${ENV.API_BASE_URL}/user_profiles/${user.id}`
        : `${ENV.API_BASE_URL}/provider_profiles/${user.id}`;

      const profilePayload = user.user_type?.id === 1
        ? { user_id: user.id, phone: phone.trim() || null, location: selectedCity }
        : { user_id: user.id, phone: phone.trim() || null, city: selectedCity, business_name: businessName.trim() };

      const profileResponse = await fetch(profileEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profilePayload),
      });
      if (!profileResponse.ok) throw new Error('فشل تحديث بيانات الملف الشخصي');
      const updatedProfile = await profileResponse.json();

      updateUser({ ...updatedUser, phone: phone.trim(), city: selectedCity || '' });
      setProfileData(updatedProfile);
      setFirstname(updatedUser.firstname || '');
      setLastname(updatedUser.lastname || '');
      setPhone(updatedProfile?.phone?.replace(/\s+/g, '') || '');

      if (user.user_type?.id === 1) {
        const userCity = (updatedProfile as UserProfile)?.location || '';
        setCity(userCity);
        setSelectedCity(userCity);
      } else {
        const providerCity = (updatedProfile as ProviderProfile)?.city || '';
        setCity(providerCity);
        setSelectedCity(providerCity);
        setBusinessName((updatedProfile as ProviderProfile)?.business_name || '');
      }

      hideModal();
      setTimeout(() => showModal('success', 'تم تحديث معلومات الحساب بنجاح', 'نجاح'), 300);
    } catch (error) {
      console.error('❌ Save failed:', error);
      hideModal();
      setTimeout(() => showModal('error', 'حدث خطأ أثناء حفظ البيانات', 'خطأ'), 300);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingComponent message="جاري تحميل البيانات..." />;
  }

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
                <ScrollView
                  style={styles.suggestionsScrollView}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {citySuggestions.map((suggestion, index) => (
                    <Pressable
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleCitySelect(suggestion)}
                    >
                      <Text style={styles.suggestionIcon}>📍</Text>
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
          {user?.user_type?.id === 2 && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>اسم الشركة</Text>
              <TextInput
                style={styles.input}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="أدخل اسم الشركة"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}
        </View>

        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>حفظ التعديلات</Text>
        </Pressable>
      </KeyboardAwareScrollView>

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
  backButton: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  backIcon: { fontSize: wp(8), fontWeight: 'bold', color: '#1F2937', marginLeft: wp(1) },
  headerTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  placeholder: { width: wp(10) },
  scrollView: { flex: 1 },
  scrollContent: { padding: wp(4), paddingBottom: hp(10) },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(5), marginBottom: hp(2),
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(2), textAlign: 'right' },
  inputGroup: { marginBottom: hp(2) },
  label: { fontSize: wp(4), fontWeight: '600', color: '#374151', marginBottom: hp(1), textAlign: 'right' },
  cityInputWrapper: { position: 'relative' },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: wp(4), paddingVertical: hp(1.5), fontSize: wp(4), color: '#1F2937', textAlign: 'right',
  },
  cityLoadingIndicator: { position: 'absolute', right: wp(4), top: '50%', transform: [{ translateY: -10 }] },
  inputDisabled: { backgroundColor: '#F9FAFB', color: '#9CA3AF' },
  inputError: { borderColor: '#DC2626' },
  errorText: { fontSize: wp(3), color: '#DC2626', marginTop: hp(0.5), textAlign: 'right' },
  helpText: { fontSize: wp(3), color: '#6B7280', marginTop: hp(0.5), textAlign: 'right' },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: hp(1),
    borderWidth: 1, borderColor: '#E5E7EB', maxHeight: hp(30), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  suggestionsScrollView: { maxHeight: hp(30) },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', padding: wp(4),
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  suggestionIcon: { fontSize: wp(4), marginLeft: wp(2) },
  suggestionText: { fontSize: wp(4), color: '#1F2937', textAlign: 'right', flex: 1 },
  saveButton: {
    backgroundColor: '#2F6FDB', borderRadius: 12, paddingVertical: hp(2),
    alignItems: 'center', marginTop: hp(2),
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },
});