import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ActionButtons from '../../components/ActionButtons';
import CustomModal from '../../components/CustomModal';
import Template from '../../components/Template';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'loading' | 'warning'>('success');
  const [modalMessage, setModalMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) {
      setModalType('warning');
      setModalMessage('يرجى إدخال بريدك الإلكتروني');
      setModalVisible(true);
      return;
    }

    if (!email.includes('@')) {
      setModalType('warning');
      setModalMessage('يرجى إدخال بريد إلكتروني صحيح');
      setModalVisible(true);
      return;
    }

    if (!password) {
      setModalType('warning');
      setModalMessage('يرجى إدخال كلمة المرور');
      setModalVisible(true);
      return;
    }

    setModalType('loading');
    setModalMessage('جاري تسجيل الدخول...');
    setModalVisible(true);
    setLoading(true);

    try {
      await login(email, password);
      setModalVisible(false);
      setLoading(false);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      if (error.message.includes('verify your email')) {
        setModalType('warning');
        setModalMessage('يرجى التحقق من بريدك الإلكتروني قبل تسجيل الدخول. تحقق من صندوق الوارد.');
      } else {
        setModalType('error');
        setModalMessage(error.message || 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.');
      }
      setModalVisible(true);
    }
  };

  return (
    <Template bg="#FFFFFF">
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
          {/* الشعار */}
          <View style={styles.logoSection}>
            <View style={styles.logoIcon}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.logoText}>ArabWerk</Text>
            <Text style={styles.welcomeText}>أهلاً بعودتك!</Text>
            <Text style={styles.subtitle}>سجّل دخولك للمتابعة</Text>
          </View>

          {/* النموذج */}
          <View style={styles.formSection}>

            {/* البريد الإلكتروني */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>البريد الإلكتروني</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="أدخل بريدك الإلكتروني"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                  textAlign="right"
                />
                <Text style={styles.inputIcon}>📧</Text>
              </View>
            </View>

            {/* كلمة المرور */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>كلمة المرور</Text>
              <View style={styles.inputWrapper}>
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                  disabled={loading}
                >
                  <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </Pressable>
                <TextInput
                  style={styles.input}
                  placeholder="أدخل كلمة المرور"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                  textAlign="right"
                />
                <Text style={styles.inputIcon}>🔒</Text>
              </View>
            </View>

            {/* نسيت كلمة المرور */}
            <Pressable
              style={styles.forgotPassword}
              onPress={() => console.log('Forgot password')}
              disabled={loading}
            >
              <Text style={styles.forgotPasswordText}>نسيت كلمة المرور؟</Text>
            </Pressable>

            {/* زر الدخول */}
            <View style={styles.buttonContainer}>
              <ActionButtons
                text={loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
                backgroundColor={loading ? '#9CA3AF' : '#2F6FDB'}
                textColor="#FFFFFF"
                showShadow={!loading}
                onPress={handleLogin}
                disabled={loading}
              />
            </View>

            {/* الفاصل */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* رابط إنشاء الحساب */}
            <View style={styles.signupSection}>
              <Pressable onPress={() => router.push('/(auth)/signup')} disabled={loading}>
                <Text style={styles.signupLink}>إنشاء حساب</Text>
              </Pressable>
              <Text style={styles.signupText}> ليس لديك حساب؟</Text>
            </View>

          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingTop: hp(6),
    paddingBottom: hp(4),
    paddingHorizontal: wp(6),
  },

  logoSection: { alignItems: 'center', marginBottom: hp(4) },
  logoIcon: {
    width: wp(18), height: wp(18), borderRadius: wp(9),
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden', marginBottom: hp(2),
  },
  logoImage: { width: '80%', height: '80%' },
  logoText: { fontSize: wp(9), fontWeight: 'bold', color: '#2F6FDB', marginBottom: hp(1) },
  welcomeText: { fontSize: wp(6), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  subtitle: { fontSize: wp(3.8), color: '#6B7280' },

  formSection: { flex: 1 },
  inputContainer: { marginBottom: hp(2.5) },
  label: {
    fontSize: wp(3.8), fontWeight: '600', color: '#374151',
    marginBottom: hp(1), textAlign: 'right',
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: wp(4), height: hp(6.5),
  },
  inputIcon: { fontSize: wp(5), marginLeft: wp(2) },
  input: { flex: 1, fontSize: wp(4), color: '#1F2937' },
  eyeIcon: { padding: wp(2) },
  eyeIconText: { fontSize: wp(5) },

  forgotPassword: { alignSelf: 'flex-start', marginBottom: hp(3) },
  forgotPasswordText: { fontSize: wp(3.5), color: '#2F6FDB', fontWeight: '600' },

  buttonContainer: { marginBottom: hp(3) },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(3) },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: wp(4), fontSize: wp(3.5), color: '#9CA3AF', fontWeight: '500' },

  signupSection: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  signupText: { fontSize: wp(3.8), color: '#6B7280' },
  signupLink: { fontSize: wp(3.8), color: '#2F6FDB', fontWeight: '700' },
});