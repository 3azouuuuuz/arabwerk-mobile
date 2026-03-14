import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import ActionButtons from '../../components/ActionButtons';
import CustomModal from '../../components/CustomModal';
import Template from '../../components/Template';
import { ENV } from '../../config/env';
import { hp, wp } from '../../helpers/common';

export default function SignupScreen() {
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'loading' | 'warning'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const cityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const cityRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchCitySuggestions = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    setIsLoadingCities(true);
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
        query
      )}&type=city&filter=countrycode:de&limit=10&lang=en&apiKey=${ENV.GEOAPIFY_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        setCitySuggestions([]);
        setShowCitySuggestions(false);
        return;
      }
      const data = await response.json();
      const cities =
        data?.features
          ?.map((f: any) => f?.properties?.city)
          .filter((c: string | null | undefined) => Boolean(c)) ?? [];
      const uniqueCities = Array.from(new Set(cities)).sort() as string[];
      setCitySuggestions(uniqueCities);
      setShowCitySuggestions(uniqueCities.length > 0);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    } finally {
      setIsLoadingCities(false);
    }
  };

  const handleCityChange = (text: string) => {
    setCity(text);
    setSelectedCity(null);
    if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);
    cityTimeoutRef.current = setTimeout(() => fetchCitySuggestions(text), 500);
  };

  const handleCitySelect = (selectedCityName: string) => {
    setCity(selectedCityName);
    setSelectedCity(selectedCityName);
    setShowCitySuggestions(false);
    setCitySuggestions([]);
    Keyboard.dismiss();
  };

  useEffect(() => {
    return () => {
      if (cityTimeoutRef.current) clearTimeout(cityTimeoutRef.current);
    };
  }, []);

  const validateForm = () => {
    if (!firstName.trim()) {
      setModalType('warning');
      setModalMessage('يرجى إدخال الاسم الأول');
      setModalVisible(true);
      return false;
    }
    if (!lastName.trim()) {
      setModalType('warning');
      setModalMessage('يرجى إدخال اسم العائلة');
      setModalVisible(true);
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setModalType('warning');
      setModalMessage('يرجى إدخال بريد إلكتروني صحيح');
      setModalVisible(true);
      return false;
    }
    if (!selectedCity) {
      setModalType('warning');
      setModalMessage('يرجى اختيار مدينة من القائمة');
      setModalVisible(true);
      return false;
    }
    if (!password || password.length < 6) {
      setModalType('warning');
      setModalMessage('يجب أن تكون كلمة المرور 6 أحرف على الأقل');
      setModalVisible(true);
      return false;
    }
    if (password !== confirmPassword) {
      setModalType('warning');
      setModalMessage('كلمتا المرور غير متطابقتين');
      setModalVisible(true);
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;

    setModalType('loading');
    setModalMessage('جاري التحقق من بياناتك...');
    setModalVisible(true);
    setLoading(true);

    try {
      const checkResponse = await fetch(`${ENV.API_BASE_URL}/users/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (checkResponse.ok) {
        const { exists } = await checkResponse.json();
        if (exists) {
          setLoading(false);
          setModalType('error');
          setModalMessage('هذا البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد آخر.');
          setModalVisible(true);
          return;
        }
      }

      const signupData = {
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || null,
        city: selectedCity,
      };

      await SecureStore.setItemAsync('signup_data', JSON.stringify(signupData));
      await SecureStore.setItemAsync('user_city', selectedCity || '');

      setModalVisible(false);
      setLoading(false);

      router.push('/(auth)/role-selection');
    } catch (error) {
      console.error('Signup error:', error);
      setLoading(false);
      setModalType('error');
      setModalMessage('حدث خطأ في الشبكة. يرجى المحاولة مجدداً.');
      setModalVisible(true);
    }
  };

  return (
    <Template bg="#FFFFFF">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(2) : 0}
      >
        <StatusBar style="dark" />
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {/* Logo */}
            <View style={styles.logoSection}>
              <View style={styles.logoIcon}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.logoText}>ArabWerk</Text>
              <Text style={styles.welcomeText}>إنشاء حساب</Text>
              <Text style={styles.subtitle}>انضم إلى مجتمعنا اليوم</Text>
            </View>

            {/* Form */}
            <View style={styles.formSection}>

              {/* الاسم الأول + اسم العائلة */}
              <View style={styles.nameRow}>
                <View style={[styles.inputContainer, styles.nameField]}>
                  <Text style={styles.label}>الاسم الأول</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="الاسم الأول"
                      placeholderTextColor="#9CA3AF"
                      value={firstName}
                      onChangeText={setFirstName}
                      autoCapitalize="words"
                      editable={!loading}
                      returnKeyType="next"
                      textAlign="right"
                      onSubmitEditing={() => lastNameRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>

                <View style={[styles.inputContainer, styles.nameField]}>
                  <Text style={styles.label}>اسم العائلة</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={lastNameRef}
                      style={styles.input}
                      placeholder="اسم العائلة"
                      placeholderTextColor="#9CA3AF"
                      value={lastName}
                      onChangeText={setLastName}
                      autoCapitalize="words"
                      editable={!loading}
                      returnKeyType="next"
                      textAlign="right"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      blurOnSubmit={false}
                    />
                  </View>
                </View>
              </View>

              {/* البريد الإلكتروني */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>البريد الإلكتروني</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="أدخل بريدك الإلكتروني"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onSubmitEditing={() => cityRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                  <Text style={styles.inputIcon}>📧</Text>
                </View>
              </View>

              {/* المدينة */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>المدينة (ألمانيا)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={cityRef}
                    style={styles.input}
                    placeholder="اختر مدينة في ألمانيا"
                    placeholderTextColor="#9CA3AF"
                    value={city}
                    onChangeText={handleCityChange}
                    autoCapitalize="words"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(20), animated: true });
                    }}
                  />
                  {isLoadingCities
                    ? <ActivityIndicator size="small" color="#2F6FDB" />
                    : <Text style={styles.inputIcon}>📍</Text>
                  }
                </View>

                {showCitySuggestions && citySuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <FlatList
                      data={citySuggestions}
                      keyExtractor={(item, index) => `${item}-${index}`}
                      renderItem={({ item }) => (
                        <Pressable
                          style={({ pressed }) => [
                            styles.suggestionItem,
                            pressed && styles.suggestionItemPressed,
                          ]}
                          onPress={() => handleCitySelect(item)}
                        >
                          <Text style={styles.suggestionText}>{item}</Text>
                          <Text style={styles.suggestionIcon}>📍</Text>
                        </Pressable>
                      )}
                      style={styles.suggestionsList}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    />
                  </View>
                )}
              </View>

              {/* رقم الهاتف */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  رقم الهاتف{' '}
                  <Text style={styles.optionalTag}>(اختياري)</Text>
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={phoneRef}
                    style={styles.input}
                    placeholder="أدخل رقم هاتفك"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(35), animated: true });
                    }}
                  />
                  <Text style={styles.inputIcon}>📱</Text>
                </View>
              </View>

              {/* كلمة المرور */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>كلمة المرور</Text>
                <View style={styles.inputWrapper}>
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon} disabled={loading}>
                    <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </Pressable>
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="أنشئ كلمة مرور"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="next"
                    textAlign="right"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(50), animated: true });
                    }}
                  />
                  <Text style={styles.inputIcon}>🔒</Text>
                </View>
              </View>

              {/* تأكيد كلمة المرور */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>تأكيد كلمة المرور</Text>
                <View style={styles.inputWrapper}>
                  <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon} disabled={loading}>
                    <Text style={styles.eyeIconText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </Pressable>
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="أعد إدخال كلمة المرور"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    returnKeyType="done"
                    textAlign="right"
                    onSubmitEditing={handleSignup}
                    onFocus={() => {
                      scrollViewRef.current?.scrollTo({ y: hp(60), animated: true });
                    }}
                  />
                  <Text style={styles.inputIcon}>🔒</Text>
                </View>
              </View>

              {/* الشروط */}
              <View style={styles.termsSection}>
                <Text style={styles.termsText}>
                  بالتسجيل، أنت توافق على{' '}
                  <Text style={styles.termsLink}>شروط الاستخدام</Text>
                  {' '}و{' '}
                  <Text style={styles.termsLink}>سياسة الخصوصية</Text>
                </Text>
              </View>

              {/* زر الإرسال */}
              <View style={styles.buttonContainer}>
                <ActionButtons
                  text={loading ? 'جاري إنشاء الحساب...' : 'إنشاء الحساب'}
                  backgroundColor={loading ? '#9CA3AF' : '#2F6FDB'}
                  textColor="#FFFFFF"
                  showShadow={!loading}
                  onPress={handleSignup}
                  disabled={loading}
                />
              </View>

              {/* الفاصل */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* رابط تسجيل الدخول */}
              <View style={styles.loginSection}>
                <Pressable onPress={() => router.push('/(auth)/login')} disabled={loading}>
                  <Text style={styles.loginLink}>تسجيل الدخول</Text>
                </Pressable>
                <Text style={styles.loginText}> هل لديك حساب بالفعل؟</Text>
              </View>

            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

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
  scrollContent: { flexGrow: 1, paddingBottom: hp(8), paddingHorizontal: wp(6) },

  logoSection: { alignItems: 'center', marginBottom: hp(3) },
  logoIcon: {
    width: wp(15), height: wp(15), borderRadius: wp(7.5),
    backgroundColor: '#F4C430', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', marginBottom: hp(1.5),
  },
  logoImage: { width: '80%', height: '80%' },
  logoText: { fontSize: wp(8), fontWeight: 'bold', color: '#2F6FDB', marginBottom: hp(0.8) },
  welcomeText: { fontSize: wp(5.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  subtitle: { fontSize: wp(3.5), color: '#6B7280' },

  formSection: { flex: 1 },

  nameRow: { flexDirection: 'row', gap: wp(3) },
  nameField: { flex: 1, marginBottom: hp(2) },

  inputContainer: { marginBottom: hp(2), position: 'relative' },
  label: { fontSize: wp(3.5), fontWeight: '600', color: '#374151', marginBottom: hp(0.8), textAlign: 'right' },
  optionalTag: { fontSize: wp(3), fontWeight: '400', color: '#9CA3AF' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: wp(3), height: hp(6),
  },
  inputIcon: { fontSize: wp(4.5), marginLeft: wp(2) },
  input: { flex: 1, fontSize: wp(3.8), color: '#1F2937' },
  eyeIcon: { padding: wp(2) },
  eyeIconText: { fontSize: wp(4.5) },

  suggestionsContainer: {
    marginTop: hp(0.5), backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB', maxHeight: hp(20),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  suggestionsList: { maxHeight: hp(20) },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    paddingVertical: hp(1.5), paddingHorizontal: wp(4),
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  suggestionItemPressed: { backgroundColor: '#EEF5FF' },
  suggestionIcon: { fontSize: wp(4), marginLeft: wp(2) },
  suggestionText: { fontSize: wp(3.8), color: '#1F2937', textAlign: 'right' },

  termsSection: { marginTop: hp(1), marginBottom: hp(2.5) },
  termsText: { fontSize: wp(3.2), color: '#6B7280', textAlign: 'center', lineHeight: hp(2.2) },
  termsLink: { color: '#2F6FDB', fontWeight: '600' },

  buttonContainer: { marginBottom: hp(2.5) },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(2.5) },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: wp(4), fontSize: wp(3.5), color: '#9CA3AF', fontWeight: '500' },

  loginSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: hp(1) },
  loginText: { fontSize: wp(3.5), color: '#6B7280' },
  loginLink: { fontSize: wp(3.5), color: '#2F6FDB', fontWeight: '700' },
});