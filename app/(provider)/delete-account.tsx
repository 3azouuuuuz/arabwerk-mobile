import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

export default function DeleteAccountScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [confirmationText, setConfirmationText] = useState('');
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const REQUIRED_TEXT = 'حذف حسابي';

  // ── Hardware back button ──────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      Alert.alert('خطأ', 'معرّف المستخدم غير متوفر، لا يمكن حذف الحساب');
      return;
    }

    if (step === 1) {
      if (confirmationText !== REQUIRED_TEXT) {
        setConfirmationError(`الرجاء كتابة "${REQUIRED_TEXT}" بشكل صحيح`);
        return;
      }
      setStep(2);
      return;
    }

    if (!password.trim()) {
      setPasswordError('الرجاء إدخال كلمة السر للتأكيد');
      return;
    }

    Alert.alert(
      '⚠️ تحذير نهائي',
      'هل أنت متأكد تماماً؟ سيتم حذف جميع بياناتك نهائياً ولا يمكن استرجاعها.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف الحساب',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              // 1. Verify password
              const verifyRes = await fetch(`${ENV.API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password }),
              });

              if (!verifyRes.ok) {
                setPasswordError('كلمة السر غير صحيحة');
                setIsDeleting(false);
                return;
              }

              // 2. Delete provider profile
              await fetch(`${ENV.API_BASE_URL}/provider_profiles/${user.id}`, {
                method: 'DELETE',
              });

              // 3. Delete user account
              const deleteUserRes = await fetch(`${ENV.API_BASE_URL}/users/${user.id}`, {
                method: 'DELETE',
              });

              if (!deleteUserRes.ok) {
                throw new Error('فشل حذف المستخدم');
              }

              // 4. Success
              Alert.alert(
                'تم الحذف',
                'تم حذف حسابك بنجاح. نأسف لرؤيتك تغادر.',
                [{
                  text: 'حسناً',
                  onPress: () => {
                    logout();
                    router.replace('/(auth)/login');
                  },
                }]
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('خطأ', 'فشل حذف الحساب. يرجى المحاولة مرة أخرى.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>حذف الحساب</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Box */}
        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningTitle}>تحذير: هذا الإجراء لا يمكن التراجع عنه</Text>
          <Text style={styles.warningText}>
            سيتم حذف جميع بياناتك بشكل نهائي، بما في ذلك:
          </Text>
        </View>

        {/* Data Loss List */}
        <View style={styles.lossListContainer}>
          {[
            { icon: '👤', text: 'معلومات حسابك الشخصية' },
            { icon: '👔', text: 'ملف الشركة والخدمات' },
            { icon: '💳', text: 'الاشتراك الحالي' },
            { icon: '💬', text: 'المحادثات والرسائل' },
            { icon: '⭐', text: 'التقييمات والمراجعات' },
          ].map((item, i) => (
            <View key={i} style={styles.lossItem}>
              <Text style={styles.lossIcon}>{item.icon}</Text>
              <Text style={styles.lossText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Step Indicator */}
        <View style={styles.stepsContainer}>
          <View style={[styles.stepCircle, step >= 1 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 1 && styles.stepNumberActive]}>1</Text>
          </View>
          <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
          <View style={[styles.stepCircle, step >= 2 && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= 2 && styles.stepNumberActive]}>2</Text>
          </View>
        </View>

        {/* Step 1: Confirmation Text */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الخطوة 1: تأكيد الرغبة في الحذف</Text>
            <Text style={styles.sectionDescription}>
              للمتابعة، الرجاء كتابة النص التالي بالضبط:
            </Text>
            <View style={styles.requiredTextBox}>
              <Text style={styles.requiredText}>{REQUIRED_TEXT}</Text>
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={[styles.input, confirmationError && styles.inputError]}
                value={confirmationText}
                onChangeText={(text) => {
                  setConfirmationText(text);
                  setConfirmationError(null);
                }}
                placeholder="اكتب النص هنا"
                placeholderTextColor="#9CA3AF"
              />
              {confirmationError && (
                <Text style={styles.errorText}>{confirmationError}</Text>
              )}
            </View>
            <Pressable
              style={[styles.continueButton, confirmationText !== REQUIRED_TEXT && styles.continueButtonDisabled]}
              onPress={handleDeleteAccount}
              disabled={confirmationText !== REQUIRED_TEXT}
            >
              <Text style={styles.continueButtonText}>المتابعة للخطوة التالية</Text>
            </Pressable>
          </View>
        )}

        {/* Step 2: Password Confirmation */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الخطوة 2: تأكيد كلمة السر</Text>
            <Text style={styles.sectionDescription}>
              أدخل كلمة السر الخاصة بك للتأكيد النهائي
            </Text>
            <View style={styles.inputGroup}>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.input, passwordError && styles.inputError]}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError(null);
                  }}
                  placeholder="أدخل كلمة السر"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </Pressable>
              </View>
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
            </View>
            <View style={styles.buttonRow}>
              <Pressable style={styles.backButtonStep} onPress={() => setStep(1)}>
                <Text style={styles.backButtonText}>رجوع</Text>
              </Pressable>
              <Pressable
                style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <Text style={styles.deleteButtonText}>حذف الحساب نهائياً</Text>}
              </Pressable>
            </View>
          </View>
        )}

        {/* Alternative Actions — provider routes */}
        <View style={styles.alternativeBox}>
          <Text style={styles.alternativeTitle}>هل أنت متأكد؟</Text>
          <Text style={styles.alternativeText}>بدلاً من حذف حسابك، يمكنك:</Text>
          <Pressable
            style={styles.alternativeButton}
            onPress={() => router.push('/(provider)/change-password')}
          >
            <Text style={styles.alternativeButtonText}>تغيير كلمة السر</Text>
          </Pressable>
          <Pressable
            style={styles.alternativeButton}
            onPress={() => router.push('/(provider)/account-info')}
          >
            <Text style={styles.alternativeButtonText}>تعديل معلومات الحساب</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
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
  warningBox: {
    backgroundColor: '#FEE2E2', borderRadius: 16, padding: wp(5),
    marginBottom: hp(2), alignItems: 'center', borderWidth: 2, borderColor: '#DC2626',
  },
  warningIcon: { fontSize: wp(16), marginBottom: hp(1) },
  warningTitle: { fontSize: wp(5), fontWeight: '700', color: '#991B1B', marginBottom: hp(1), textAlign: 'center' },
  warningText: { fontSize: wp(3.5), color: '#DC2626', textAlign: 'center', lineHeight: hp(2.5) },
  lossListContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(5),
    marginBottom: hp(2), borderWidth: 1, borderColor: '#E5E7EB',
  },
  lossItem: { flexDirection: 'row', alignItems: 'center', marginBottom: hp(1.5) },
  lossIcon: { fontSize: wp(5), marginLeft: wp(3) },
  lossText: { fontSize: wp(4), color: '#374151', flex: 1, textAlign: 'right' },
  stepsContainer: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: hp(3),
  },
  stepCircle: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center',
  },
  stepCircleActive: { backgroundColor: '#DC2626' },
  stepNumber: { fontSize: wp(5), fontWeight: '700', color: '#9CA3AF' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLine: { width: wp(20), height: 2, backgroundColor: '#E5E7EB', marginHorizontal: wp(2) },
  stepLineActive: { backgroundColor: '#DC2626' },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(5),
    marginBottom: hp(2), borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(1), textAlign: 'right' },
  sectionDescription: { fontSize: wp(3.5), color: '#6B7280', marginBottom: hp(2), textAlign: 'right', lineHeight: hp(2.5) },
  requiredTextBox: {
    backgroundColor: '#FEF3C7', borderRadius: 12, padding: wp(4),
    marginBottom: hp(2), borderWidth: 1, borderColor: '#F59E0B',
  },
  requiredText: { fontSize: wp(4.5), fontWeight: '700', color: '#D97706', textAlign: 'center' },
  inputGroup: { marginBottom: hp(2) },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: wp(4), paddingVertical: hp(1.5),
    fontSize: wp(4), color: '#1F2937', textAlign: 'right',
  },
  inputError: { borderColor: '#DC2626' },
  passwordInputContainer: { position: 'relative' },
  eyeButton: {
    position: 'absolute', right: wp(3), top: '50%',
    transform: [{ translateY: -wp(3) }], padding: wp(2),
  },
  eyeIcon: { fontSize: wp(5) },
  errorText: { fontSize: wp(3), color: '#DC2626', marginTop: hp(0.5), textAlign: 'right' },
  continueButton: { backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: hp(2), alignItems: 'center' },
  continueButtonDisabled: { backgroundColor: '#9CA3AF' },
  continueButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },
  buttonRow: { flexDirection: 'row', gap: wp(3) },
  backButtonStep: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: hp(2), alignItems: 'center' },
  backButtonText: { fontSize: wp(4), fontWeight: '600', color: '#374151' },
  deleteButton: { flex: 2, backgroundColor: '#DC2626', borderRadius: 12, paddingVertical: hp(2), alignItems: 'center' },
  deleteButtonDisabled: { backgroundColor: '#9CA3AF' },
  deleteButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },
  alternativeBox: {
    backgroundColor: '#ECFDF5', borderRadius: 16, padding: wp(5),
    borderWidth: 1, borderColor: '#A7F3D0',
  },
  alternativeTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#059669', marginBottom: hp(0.5), textAlign: 'right' },
  alternativeText: { fontSize: wp(3.5), color: '#047857', marginBottom: hp(2), textAlign: 'right' },
  alternativeButton: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: hp(1.5),
    paddingHorizontal: wp(4), marginBottom: hp(1), borderWidth: 1, borderColor: '#10B981',
  },
  alternativeButtonText: { fontSize: wp(4), fontWeight: '600', color: '#059669', textAlign: 'center' },
});