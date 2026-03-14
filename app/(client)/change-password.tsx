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

export default function ChangePasswordScreen() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  // ── Hardware back button ─────────────────────────────────────────────────
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);
  // ────────────────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    let isValid = true;

    if (!currentPassword.trim()) {
      setCurrentPasswordError('الرجاء إدخال كلمة السر الحالية');
      isValid = false;
    } else {
      setCurrentPasswordError(null);
    }

    if (!newPassword.trim()) {
      setNewPasswordError('الرجاء إدخال كلمة السر الجديدة');
      isValid = false;
    } else if (newPassword.length < 6) {
      setNewPasswordError('كلمة السر يجب أن تكون 6 أحرف على الأقل');
      isValid = false;
    } else {
      setNewPasswordError(null);
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('الرجاء تأكيد كلمة السر الجديدة');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('كلمة السر الجديدة وتأكيدها غير متطابقتين');
      isValid = false;
    } else {
      setConfirmPasswordError(null);
    }

    return isValid;
  };

  const handleChangePassword = async () => {
    console.log('[changepasswordpage] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[changepasswordpage] 🔄 handleChangePassword triggered');
    console.log('[changepasswordpage] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!validateForm()) {
      console.log('[changepasswordpage] ❌ Form validation failed');
      return;
    }

    console.log('[changepasswordpage] 👤 User object:', JSON.stringify(user, null, 2));
    console.log('[changepasswordpage] 🔑 Token exists:', !!token);
    console.log('[changepasswordpage] 🔑 Token value:', token ? token.substring(0, 30) + '...' : 'NULL');
    console.log('[changepasswordpage] 🆔 User ID:', user?.id);
    console.log('[changepasswordpage] 📧 User email:', user?.email);
    console.log('[changepasswordpage] 👑 User type:', user?.user_type);

    if (!user?.email) {
      console.log('[changepasswordpage] ❌ No user email found, aborting');
      Alert.alert('خطأ', 'تعذر الحصول على البريد الإلكتروني للمستخدم');
      return;
    }

    try {
      setIsSaving(true);

      console.log('[changepasswordpage] ─────────────────────────────────');
      console.log('[changepasswordpage] 📡 STEP 1: Verifying current password');
      console.log('[changepasswordpage] 🌐 URL:', `${ENV.API_BASE_URL}/users/login`);

      const verifyRes = await fetch(`${ENV.API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      });

      console.log('[changepasswordpage] 📬 Verify response status:', verifyRes.status);

      let verifyBody: any = null;
      try {
        verifyBody = await verifyRes.json();
        console.log('[changepasswordpage] 📬 Verify response body:', JSON.stringify(verifyBody, null, 2));
      } catch (e) {
        console.log('[changepasswordpage] ⚠️ Could not parse verify response body');
      }

      if (!verifyRes.ok) {
        console.log('[changepasswordpage] ❌ Current password verification FAILED');
        setCurrentPasswordError('كلمة السر الحالية غير صحيحة');
        return;
      }

      console.log('[changepasswordpage] ✅ Current password verified successfully');
      console.log('[changepasswordpage] ─────────────────────────────────');
      console.log('[changepasswordpage] 📡 STEP 2: Updating password');

      const updateHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        updateHeaders['Authorization'] = `Bearer ${token}`;
        console.log('[changepasswordpage] ✅ Authorization header added');
      } else {
        console.log('[changepasswordpage] ⚠️ WARNING: No token available');
      }

      const updateRes = await fetch(`${ENV.API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: updateHeaders,
        body: JSON.stringify({ password: newPassword }),
      });

      console.log('[changepasswordpage] 📬 Update response status:', updateRes.status);

      let updateBody: any = null;
      try {
        updateBody = await updateRes.json();
        console.log('[changepasswordpage] 📬 Update response body:', JSON.stringify(updateBody, null, 2));
      } catch (e) {
        console.log('[changepasswordpage] ⚠️ Could not parse update response body');
      }

      if (!updateRes.ok) {
        console.log('[changepasswordpage] ❌ Password update FAILED');
        if (updateRes.status === 401) console.log('[changepasswordpage] 🔴 401 Unauthorized');
        else if (updateRes.status === 403) console.log('[changepasswordpage] 🔴 403 Forbidden');
        else if (updateRes.status === 404) console.log('[changepasswordpage] 🔴 404 Not Found');
        else if (updateRes.status === 500) console.log('[changepasswordpage] 🔴 500 Server Error');
        throw new Error('فشل في تحديث كلمة السر');
      }

      console.log('[changepasswordpage] ✅ Password updated successfully!');

      Alert.alert('نجاح', 'تم تحديث كلمة السر بنجاح', [
        {
          text: 'حسناً',
          onPress: () => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.log('[changepasswordpage] 💥 CAUGHT ERROR:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تغيير كلمة السر');
    } finally {
      setIsSaving(false);
      console.log('[changepasswordpage] 🏁 handleChangePassword finished');
    }
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (!password) return { strength: '', color: '#E5E7EB' };
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (hasNumbers) score++;
    if (hasSpecialChars) score++;
    if (hasUpperCase && hasLowerCase) score++;
    if (score <= 2) return { strength: 'ضعيفة', color: '#DC2626' };
    if (score <= 3) return { strength: 'متوسطة', color: '#F59E0B' };
    return { strength: 'قوية', color: '#10B981' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>تغيير كلمة السر</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoTitle}>حماية حسابك</Text>
          <Text style={styles.infoText}>
            استخدم كلمة سر قوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز خاصة
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة السر الحالية *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, currentPasswordError && styles.inputError]}
                value={currentPassword}
                onChangeText={(text) => { setCurrentPassword(text); setCurrentPasswordError(null); }}
                placeholder="أدخل كلمة السر الحالية"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrentPassword}
                autoComplete="password"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Text style={styles.eyeIcon}>{showCurrentPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
            {currentPasswordError && <Text style={styles.errorText}>{currentPasswordError}</Text>}
          </View>

          <View style={styles.divider} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة السر الجديدة *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, newPasswordError && styles.inputError]}
                value={newPassword}
                onChangeText={(text) => { setNewPassword(text); setNewPasswordError(null); }}
                placeholder="أدخل كلمة السر الجديدة"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNewPassword}
                autoComplete="password-new"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowNewPassword(!showNewPassword)}>
                <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
            {newPasswordError && <Text style={styles.errorText}>{newPasswordError}</Text>}
            {newPassword && !newPasswordError && (
              <View style={styles.strengthContainer}>
                <Text style={styles.strengthLabel}>قوة كلمة السر:</Text>
                <View style={[styles.strengthBadge, { backgroundColor: `${passwordStrength.color}20` }]}>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.strength}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>تأكيد كلمة السر الجديدة *</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, confirmPasswordError && styles.inputError]}
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); setConfirmPasswordError(null); }}
                placeholder="أعد إدخال كلمة السر الجديدة"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirmPassword}
                autoComplete="password-new"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </Pressable>
            </View>
            {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>تحديث كلمة السر</Text>}
        </Pressable>

        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>نصائح لكلمة سر قوية:</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>استخدم على الأقل 10 أحرف</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>امزج بين الأحرف الكبيرة والصغيرة</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>أضف أرقاماً ورموزاً خاصة (!@#$%)</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>تجنب استخدام معلومات شخصية</Text>
          </View>
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
  infoBox: {
    backgroundColor: '#EEF5FF', borderRadius: 16, padding: wp(5),
    marginBottom: hp(2), alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE',
  },
  infoIcon: { fontSize: wp(12), marginBottom: hp(1) },
  infoTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1E40AF', marginBottom: hp(0.5), textAlign: 'center' },
  infoText: { fontSize: wp(3.5), color: '#3B82F6', textAlign: 'center', lineHeight: hp(2.5) },
  section: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(5), marginBottom: hp(2),
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  inputGroup: { marginBottom: hp(2) },
  label: { fontSize: wp(4), fontWeight: '600', color: '#374151', marginBottom: hp(1), textAlign: 'right' },
  passwordInputContainer: { position: 'relative' },
  input: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: wp(4), paddingVertical: hp(1.5), paddingRight: wp(12),
    fontSize: wp(4), color: '#1F2937', textAlign: 'right',
  },
  inputError: { borderColor: '#DC2626' },
  eyeButton: { position: 'absolute', right: wp(3), top: '50%', transform: [{ translateY: -wp(3) }], padding: wp(2) },
  eyeIcon: { fontSize: wp(5) },
  errorText: { fontSize: wp(3), color: '#DC2626', marginTop: hp(0.5), textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: hp(2) },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', marginTop: hp(1), justifyContent: 'flex-end' },
  strengthLabel: { fontSize: wp(3.5), color: '#6B7280', marginLeft: wp(2) },
  strengthBadge: { paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12 },
  strengthText: { fontSize: wp(3), fontWeight: '600' },
  saveButton: {
    backgroundColor: '#2F6FDB', borderRadius: 12, paddingVertical: hp(2),
    alignItems: 'center', marginBottom: hp(2),
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonDisabled: { backgroundColor: '#9CA3AF' },
  saveButtonText: { fontSize: wp(4), fontWeight: '700', color: '#FFFFFF' },
  tipsBox: { backgroundColor: '#FFFBEB', borderRadius: 16, padding: wp(5), borderWidth: 1, borderColor: '#FEF3C7' },
  tipsTitle: { fontSize: wp(4), fontWeight: '700', color: '#D97706', marginBottom: hp(1.5), textAlign: 'right' },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: hp(0.8) },
  tipBullet: { fontSize: wp(4), color: '#D97706', marginLeft: wp(2), marginRight: wp(2) },
  tipText: { fontSize: wp(3.5), color: '#92400E', flex: 1, textAlign: 'right' },
});