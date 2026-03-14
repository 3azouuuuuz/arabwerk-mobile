import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import ActionButtons from '../../components/ActionButtons';
import CustomModal from '../../components/CustomModal';
import Template from '../../components/Template';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { signup } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'customer' | 'provider' | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupData, setSignupData] = useState<any>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'loading' | 'warning'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleCard1 = useRef(new Animated.Value(0.9)).current;
  const scaleCard2 = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadSignupData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleCard1, { toValue: 1, delay: 200, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.spring(scaleCard2, { toValue: 1, delay: 350, tension: 50, friction: 7, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadSignupData = async () => {
    try {
      const data = await SecureStore.getItemAsync('signup_data');
      if (data) {
        setSignupData(JSON.parse(data));
      } else {
        setModalType('error');
        setModalMessage('يرجى إكمال نموذج التسجيل أولاً');
        setModalVisible(true);
        setTimeout(() => router.replace('/(auth)/signup'), 2000);
      }
    } catch (error) {
      console.error('Failed to load signup data:', error);
      setModalType('error');
      setModalMessage('فشل تحميل بيانات التسجيل');
      setModalVisible(true);
      setTimeout(() => router.replace('/(auth)/signup'), 2000);
    }
  };

  const handleRolePress = (role: 'customer' | 'provider') => {
    setSelectedRole(role);
    const scale = role === 'customer' ? scaleCard1 : scaleCard2;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }),
    ]).start();
  };

  const handleContinue = async () => {
    if (!selectedRole || !signupData) {
      setModalType('warning');
      setModalMessage('يرجى اختيار دورك للمتابعة');
      setModalVisible(true);
      return;
    }

    setModalType('loading');
    setModalMessage('جاري إنشاء حسابك...');
    setModalVisible(true);
    setLoading(true);

    try {
      const user_type = selectedRole === 'customer' ? 1 : 2;

      const registeredUser = await signup({
        firstname: signupData.firstname,
        lastname: signupData.lastname,
        email: signupData.email,
        password: signupData.password,
        phone: signupData.phone,
        city: signupData.city,
        user_type,
      });

      if (selectedRole === 'customer') {
        setModalMessage('جاري إعداد ملفك الشخصي...');
        const profileResponse = await fetch(`${ENV.API_BASE_URL}/user_profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: registeredUser.id,
            city: signupData.city,
            location: signupData.city,
            phone: signupData.phone || null,
          }),
        });
        if (!profileResponse.ok) {
          console.error('⚠️ Client profile creation failed — non-blocking');
        }
      }

      if (selectedRole === 'provider') {
        setModalMessage('جاري إعداد ملف مقدم الخدمة...');
        const profileResponse = await fetch(`${ENV.API_BASE_URL}/provider_profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: registeredUser.id,
            business_name: '',
            city: signupData.city,
            phone: signupData.phone,
            category: '',
            plan: 'none',
            plan_name: 'No Plan',
            description: '',
            subscription_status: 'inactive',
            profile_picture: 'https://i.pinimg.com/736x/ac/2e/dc/ac2edcd4ea1b46ec9233fd84b1609175.jpg',
          }),
        });
        if (!profileResponse.ok) {
          const errorData = await profileResponse.json();
          throw new Error(errorData.message || 'فشل إنشاء ملف مقدم الخدمة');
        }
      }

      await SecureStore.deleteItemAsync('signup_data');

      setModalType('success');
      setModalMessage('تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.');
      setModalVisible(true);

      setTimeout(() => {
        setModalVisible(false);
        router.replace('/(auth)/login');
      }, 3000);

    } catch (error: any) {
      console.error('Registration error:', error);
      setLoading(false);
      setModalType('error');
      setModalMessage(error.message || 'فشل التسجيل. يرجى المحاولة مجدداً.');
      setModalVisible(true);
    }
  };

  return (
    <Template bg="#FFFFFF">
      <StatusBar style="dark" />

      <View style={styles.content}>
        {/* الشعار */}
        <Animated.View
          style={[styles.logoSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.logoIcon}>
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.logoText}>ArabWerk</Text>
          <Text style={styles.welcomeText}>اختر دورك</Text>
          <Text style={styles.subtitle}>كيف تريد استخدام ArabWerk؟</Text>
        </Animated.View>

        {/* بطاقات الأدوار */}
        <View style={styles.rolesSection}>

          {/* عميل */}
          <Animated.View style={{ transform: [{ scale: scaleCard1 }] }}>
            <Pressable
              style={[styles.roleCard, selectedRole === 'customer' && styles.roleCardActive]}
              onPress={() => handleRolePress('customer')}
              disabled={loading}
            >
              {selectedRole === 'customer' && (
                <Animated.View style={[styles.checkmark, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </Animated.View>
              )}
              <View style={[styles.roleIconContainer, selectedRole === 'customer' && styles.roleIconContainerActive]}>
                <Text style={styles.roleIcon}>👤</Text>
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'customer' && styles.roleTitleActive]}>
                أبحث عن خدمات
              </Text>
              <Text style={styles.roleDescription}>
                أبحث عن محترفين مهرة للمساعدة في مشاريعي
              </Text>
            </Pressable>
          </Animated.View>

          {/* مقدم خدمة */}
          <Animated.View style={{ transform: [{ scale: scaleCard2 }] }}>
            <Pressable
              style={[styles.roleCard, selectedRole === 'provider' && styles.roleCardActive]}
              onPress={() => handleRolePress('provider')}
              disabled={loading}
            >
              {selectedRole === 'provider' && (
                <Animated.View style={[styles.checkmark, { opacity: fadeAnim, transform: [{ scale: fadeAnim }] }]}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </Animated.View>
              )}
              <View style={[styles.roleIconContainer, selectedRole === 'provider' && styles.roleIconContainerActive]}>
                <Text style={styles.roleIcon}>🔧</Text>
              </View>
              <Text style={[styles.roleTitle, selectedRole === 'provider' && styles.roleTitleActive]}>
                أقدم خدمات
              </Text>
              <Text style={styles.roleDescription}>
                مستعد لتقديم مهاراتي المهنية وتنمية عملي
              </Text>
            </Pressable>
          </Animated.View>

        </View>

        {/* زر المتابعة */}
        <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
          <ActionButtons
            text={loading ? 'جاري إنشاء الحساب...' : 'متابعة'}
            backgroundColor={selectedRole && !loading ? '#2F6FDB' : '#E5E7EB'}
            textColor={selectedRole && !loading ? '#FFFFFF' : '#9CA3AF'}
            showShadow={!!selectedRole && !loading}
            onPress={handleContinue}
            disabled={!selectedRole || loading}
          />
        </Animated.View>
      </View>

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
  content: {
    flex: 1,
    paddingHorizontal: wp(6),
    paddingTop: hp(2),
    paddingBottom: hp(4),
    justifyContent: 'space-between',
  },
  logoSection: { alignItems: 'center', marginTop: hp(2) },
  logoIcon: {
    width: wp(15), height: wp(15), borderRadius: wp(7.5),
    backgroundColor: '#F4C430', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', marginBottom: hp(1.5),
  },
  logoImage: { width: '80%', height: '80%' },
  logoText: { fontSize: wp(8), fontWeight: 'bold', color: '#2F6FDB', marginBottom: hp(0.8) },
  welcomeText: { fontSize: wp(5.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  subtitle: { fontSize: wp(3.5), color: '#6B7280', textAlign: 'center' },

  rolesSection: { flex: 1, justifyContent: 'center', gap: hp(2.5), paddingVertical: hp(3) },
  roleCard: {
    backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 2,
    borderColor: '#E5E7EB', padding: wp(6), alignItems: 'center', position: 'relative',
  },
  roleCardActive: { backgroundColor: '#EEF5FF', borderColor: '#2F6FDB' },
  roleIconContainer: {
    width: wp(20), height: wp(20), borderRadius: wp(10),
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: hp(2),
  },
  roleIconContainerActive: { backgroundColor: '#2F6FDB' },
  roleIcon: { fontSize: wp(10) },
  roleTitle: { fontSize: wp(5), fontWeight: 'bold', color: '#1F2937', marginBottom: hp(1) },
  roleTitleActive: { color: '#2F6FDB' },
  roleDescription: { fontSize: wp(3.5), color: '#6B7280', textAlign: 'center', lineHeight: hp(2.5) },
  checkmark: {
    position: 'absolute', top: wp(4), left: wp(4),
    width: wp(8), height: wp(8), borderRadius: wp(4),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center',
  },
  checkmarkText: { color: '#FFFFFF', fontSize: wp(5), fontWeight: 'bold' },
  buttonContainer: { marginTop: hp(2) },
});