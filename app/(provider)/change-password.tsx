import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import CustomModal from '../../components/CustomModal';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

export default function ChangePasswordScreen() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState<string | null>(null);
  const [newPasswordError, setNewPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

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

  const getPasswordStrength = (password: string): { label: string; color: string; width: string } => {
    if (!password) return { label: '', color: '#E5E7EB', width: '0%' };
    if (password.length < 6) return { label: 'ضعيف', color: '#DC2626', width: '25%' };
    if (password.length < 8) return { label: 'مقبول', color: '#F59E0B', width: '50%' };
    if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) return { label: 'جيد', color: '#3B82F6', width: '75%' };
    return { label: 'قوي', color: '#10B981', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  const validateForm = (): boolean => {
    let isValid = true;

    if (!currentPassword.trim()) {
      setCurrentPasswordError('الرجاء إدخال كلمة المرور الحالية');
      isValid = false;
    } else {
      setCurrentPasswordError(null);
    }

    if (!newPassword.trim()) {
      setNewPasswordError('الرجاء إدخال كلمة المرور الجديدة');
      isValid = false;
    } else if (newPassword.length < 8) {
      setNewPasswordError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      isValid = false;
    } else if (newPassword === currentPassword) {
      setNewPasswordError('كلمة المرور الجديدة يجب أن تختلف عن الحالية');
      isValid = false;
    } else {
      setNewPasswordError(null);
    }

    if (!confirmPassword.trim()) {
      setConfirmPasswordError('الرجاء تأكيد كلمة المرور الجديدة');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('كلمتا المرور غير متطابقتين');
      isValid = false;
    } else {
      setConfirmPasswordError(null);
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    if (!user?.email) {
      showModal('error', 'تعذر الحصول على بيانات المستخدم', 'خطأ');
      return;
    }

    if (!token) {
      showModal('error', 'يرجى تسجيل الدخول مرة أخرى', 'خطأ');
      return;
    }

    showModal('loading', 'جاري التحقق من كلمة المرور...', 'الرجاء الانتظار');
    setIsSaving(true);

    try {
      const verifyRes = await fetch(`${ENV.API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      });

      if (!verifyRes.ok) {
        hideModal();
        setTimeout(() => {
          setCurrentPasswordError('كلمة المرور الحالية غير صحيحة');
          showModal('error', 'كلمة المرور الحالية غير صحيحة', 'خطأ');
        }, 300);
        return;
      }

      hideModal();
      setTimeout(() => {
        showModal('loading', 'جاري تغيير كلمة المرور...', 'الرجاء الانتظار');
      }, 300);

      const updateRes = await fetch(`${ENV.API_BASE_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      const updateBody = await updateRes.json();

      if (!updateRes.ok) {
        throw new Error(updateBody.message || 'فشل تغيير كلمة المرور');
      }

      hideModal();
      setTimeout(() => {
        showModal('success', 'تم تغيير كلمة المرور بنجاح. سيتم تسجيل خروجك الآن.', 'نجاح');
      }, 300);

      setTimeout(async () => {
        await logout();
        router.replace('/(auth)/login');
      }, 2500);

    } catch (error: any) {
      console.error('Change password error:', error);
      hideModal();
      setTimeout(() => {
        showModal('error', error.message || 'حدث خطأ أثناء تغيير كلمة المرور', 'خطأ');
      }, 300);
    } finally {
      setIsSaving(false);
    }
  };

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
        <Text style={styles.headerTitle}>تغيير كلمة المرور</Text>
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
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerIcon}>🔒</Text>
          <Text style={styles.infoBannerText}>
            بعد تغيير كلمة المرور، سيتم تسجيل خروجك تلقائياً وستحتاج لتسجيل الدخول مجدداً.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>كلمة المرور</Text>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور الحالية *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, currentPasswordError && styles.inputError]}
                value={currentPassword}
                onChangeText={(text) => { setCurrentPassword(text); setCurrentPasswordError(null); }}
                placeholder="أدخل كلمة المرور الحالية"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showCurrent}
                autoComplete="current-password"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowCurrent(!showCurrent)}>
                <Text style={styles.eyeIcon}>{showCurrent ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            {currentPasswordError && <Text style={styles.errorText}>{currentPasswordError}</Text>}
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>كلمة المرور الجديدة *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, newPasswordError && styles.inputError]}
                value={newPassword}
                onChangeText={(text) => { setNewPassword(text); setNewPasswordError(null); }}
                placeholder="أدخل كلمة المرور الجديدة"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showNew}
                autoComplete="new-password"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowNew(!showNew)}>
                <Text style={styles.eyeIcon}>{showNew ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            {newPasswordError && <Text style={styles.errorText}>{newPasswordError}</Text>}

            {newPassword.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthFill, { width: strength.width, backgroundColor: strength.color }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>تأكيد كلمة المرور *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, confirmPasswordError && styles.inputError]}
                value={confirmPassword}
                onChangeText={(text) => { setConfirmPassword(text); setConfirmPasswordError(null); }}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showConfirm}
                autoComplete="new-password"
              />
              <Pressable style={styles.eyeButton} onPress={() => setShowConfirm(!showConfirm)}>
                <Text style={styles.eyeIcon}>{showConfirm ? '🙈' : '👁️'}</Text>
              </Pressable>
            </View>
            {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}

            {confirmPassword.length > 0 && (
              <View style={styles.matchIndicator}>
                <Text style={[styles.matchText, { color: newPassword === confirmPassword ? '#10B981' : '#DC2626' }]}>
                  {newPassword === confirmPassword ? '✓ كلمتا المرور متطابقتان' : '✗ كلمتا المرور غير متطابقتين'}
                </Text>
              </View>
            )}
          </View>

          {/* Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>متطلبات كلمة المرور:</Text>
            <Text style={[styles.requirementItem, newPassword.length >= 8 && styles.requirementMet]}>
              {newPassword.length >= 8 ? '✓' : '○'} 8 أحرف على الأقل
            </Text>
            <Text style={[styles.requirementItem, /[A-Z]/.test(newPassword) && styles.requirementMet]}>
              {/[A-Z]/.test(newPassword) ? '✓' : '○'} حرف كبير واحد على الأقل
            </Text>
            <Text style={[styles.requirementItem, /[0-9]/.test(newPassword) && styles.requirementMet]}>
              {/[0-9]/.test(newPassword) ? '✓' : '○'} رقم واحد على الأقل
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>تغيير كلمة المرور</Text>
          )}
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
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: wp(8),
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: wp(1),
  },
  headerTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  placeholder: {
    width: wp(10),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(4),
    paddingBottom: hp(10),
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF5FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: wp(4),
    gap: wp(3),
    alignItems: 'flex-start',
    marginBottom: hp(2),
  },
  infoBannerIcon: {
    fontSize: wp(5),
  },
  infoBannerText: {
    flex: 1,
    fontSize: wp(3.3),
    color: '#1E40AF',
    lineHeight: hp(2.5),
    textAlign: 'right',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: wp(5),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: hp(2),
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: hp(2.5),
  },
  label: {
    fontSize: wp(4),
    fontWeight: '600',
    color: '#374151',
    marginBottom: hp(1),
    textAlign: 'right',
  },
  passwordWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    fontSize: wp(4),
    color: '#1F2937',
    textAlign: 'right',
  },
  passwordInput: {
    flex: 1,
    paddingLeft: wp(12),
  },
  eyeButton: {
    position: 'absolute',
    left: wp(3),
    padding: wp(2),
  },
  eyeIcon: {
    fontSize: wp(5),
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    fontSize: wp(3),
    color: '#DC2626',
    marginTop: hp(0.5),
    textAlign: 'right',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1),
    gap: wp(3),
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: wp(3),
    fontWeight: '600',
    width: wp(10),
    textAlign: 'right',
  },
  matchIndicator: {
    marginTop: hp(0.8),
  },
  matchText: {
    fontSize: wp(3),
    fontWeight: '600',
    textAlign: 'right',
  },
  requirementsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: wp(4),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: hp(0.8),
  },
  requirementsTitle: {
    fontSize: wp(3.5),
    fontWeight: '700',
    color: '#374151',
    textAlign: 'right',
    marginBottom: hp(0.5),
  },
  requirementItem: {
    fontSize: wp(3.3),
    color: '#9CA3AF',
    textAlign: 'right',
  },
  requirementMet: {
    color: '#10B981',
  },
  saveButton: {
    backgroundColor: '#2F6FDB',
    borderRadius: 12,
    paddingVertical: hp(2),
    alignItems: 'center',
    marginTop: hp(2),
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});