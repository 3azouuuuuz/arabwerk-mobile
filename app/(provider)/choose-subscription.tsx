import { CardField, useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import CustomModal from '../../components/CustomModal';
import ProviderSetupProgress from '../../components/ProviderSetupProgress';
import Template from '../../components/Template';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

interface Plan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  features: string[];
  popular?: boolean;
  icon: string;
  description: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'الخطة المجانية',
    price: '€0',
    priceValue: 0,
    icon: '🆓',
    description: 'مثالية للبداية',
    features: [
      'ظهور أساسي في الملف الشخصي',
      'حتى 3 خدمات',
      'دعم عبر البريد الإلكتروني',
      'ترتيب قياسي في البحث',
      'تحليلات أساسية',
    ],
  },
  {
    id: 'pro',
    name: 'الخطة الاحترافية',
    price: '€15',
    priceValue: 15,
    icon: '⭐',
    popular: true,
    description: 'الأفضل للمحترفين الجادين',
    features: [
      'ظهور مميز في الملف الشخصي',
      'خدمات غير محدودة',
      'دعم أولوية 24/7',
      'أعلى ترتيب في البحث',
      'شارة مقدم خدمة مميز',
      'تحليلات متقدمة',
      'ملف تجاري مخصص',
      'الأولوية في نتائج البحث',
    ],
  },
];

export default function ChooseSubscription() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { createPaymentMethod } = useStripe();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  useEffect(() => {
    const backAction = () => {
      setModalType('confirm');
      setModalTitle('مغادرة صفحة الاشتراك؟');
      setModalMessage('يجب عليك اختيار خطة للمتابعة. هل تريد تسجيل الخروج بدلاً من ذلك؟');
      setPendingAction(() => async () => {
        await logout();
        router.replace('/(auth)/login');
      });
      setModalVisible(true);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [logout, router]);

  const handlePlanSelect = useCallback((planId: string) => {
    setSelectedPlan(planId);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedPlan) {
      setModalType('warning');
      setModalTitle('اختر خطة');
      setModalMessage('يرجى اختيار خطة اشتراك للمتابعة.');
      setModalVisible(true);
      return;
    }

    const plan = PLANS.find(p => p.id === selectedPlan);
    if (plan) {
      if (plan.id === 'free') {
        setModalType('confirm');
        setModalTitle('تأكيد الخطة المجانية');
        setModalMessage(`لقد اخترت ${plan.name}.\n\nيمكنك الترقية إلى الخطة الاحترافية في أي وقت لفتح المميزات المتقدمة.`);
        setPendingAction(() => () => activateFreePlan());
        setModalVisible(true);
      } else {
        setShowPaymentModal(true);
      }
    }
  }, [selectedPlan]);

  const activateFreePlan = async () => {
    setModalType('loading');
    setModalTitle('جاري الإعداد');
    setModalMessage('جاري تفعيل خطتك المجانية...');
    setModalVisible(true);

    try {
      const response = await fetch(`${ENV.API_BASE_URL}/provider_profiles/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription_status: 'active',
          plan: 'free',
          plan_name: 'Free Plan',
          subscription_start_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('فشل تفعيل الخطة المجانية');

      await SecureStore.deleteItemAsync('needs_subscription');

      setModalType('success');
      setModalTitle('تم تفعيل الخطة!');
      setModalMessage('خطتك المجانية نشطة الآن. لنقم بإعداد نشاطك التجاري!');
      setModalVisible(true);

      setTimeout(() => {
        setModalVisible(false);
        router.replace('/(provider)/provider-setup');
      }, 2000);
    } catch (error) {
      console.error('Free plan activation error:', error);
      setModalType('error');
      setModalTitle('فشل التفعيل');
      setModalMessage(error.message || 'فشل تفعيل الخطة المجانية. يرجى المحاولة مجدداً.');
      setModalVisible(true);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!cardComplete) {
      setModalType('warning');
      setModalTitle('بيانات البطاقة غير مكتملة');
      setModalMessage('يرجى إدخال بيانات البطاقة كاملة.');
      setModalVisible(true);
      return;
    }

    setShowPaymentModal(false);
    setModalType('loading');
    setModalTitle('جاري معالجة الدفع');
    setModalMessage('يرجى الانتظار بينما نعالج اشتراكك...');
    setModalVisible(true);

    try {
      const { paymentMethod, error: pmError } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (pmError) throw new Error(pmError.message);
      if (!paymentMethod) throw new Error('فشل إنشاء طريقة الدفع');

      const response = await fetch(`${ENV.API_BASE_URL}/stripe-payment/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          priceId: process.env.EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID || 'price_1RffawAWT8bPM9HQZJysSV5G',
          paymentMethodId: paymentMethod.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'فشل إنشاء الاشتراك');

      await SecureStore.deleteItemAsync('needs_subscription');

      setModalType('success');
      setModalTitle('مرحباً بك في Pro! 🎉');
      setModalMessage('اشتراكك الاحترافي نشط الآن. لنقم بإعداد نشاطك التجاري!');
      setModalVisible(true);

      setTimeout(() => {
        setModalVisible(false);
        router.replace('/(provider)/provider-setup');
      }, 2500);
    } catch (error) {
      console.error('Payment error:', error);
      setModalType('error');
      setModalTitle('فشل الدفع');
      setModalMessage(error.message || 'فشل معالجة الدفع. يرجى المحاولة مجدداً.');
      setModalVisible(true);
    }
  };

  const handleLogout = useCallback(() => {
    setModalType('confirm');
    setModalTitle('تأكيد تسجيل الخروج');
    setModalMessage('هل أنت متأكد من تسجيل الخروج؟\n\nستحتاج إلى إكمال الاشتراك عند عودتك.');
    setPendingAction(() => async () => {
      setModalType('loading');
      setModalTitle('جاري تسجيل الخروج');
      setModalMessage('يرجى الانتظار...');
      setModalVisible(true);

      setTimeout(async () => {
        await logout();
        setModalVisible(false);
        router.replace('/(auth)/login');
      }, 1500);
    });
    setModalVisible(true);
  }, [logout, router]);

  const handleModalPrimaryPress = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const handleModalSecondaryPress = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    setPendingAction(null);
  }, []);

  return (
    <Template bg="#F9FAFB">
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* الرأس */}
        <View style={styles.header}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoEmoji}>💼</Text>
          </View>
          <Text style={styles.title}>اختر خطتك</Text>
          <Text style={styles.subtitle}>
            ابدأ مجاناً أو افتح المميزات المتقدمة مع الخطة الاحترافية
          </Text>

          {user && (
            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>
                أهلاً، {user.firstname}! 👋
              </Text>
            </View>
          )}
        </View>

        {/* شريط التقدم */}
        <ProviderSetupProgress currentStep={2} />

        {/* الخطط */}
        <View style={styles.plansContainer}>
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isFree = plan.id === 'free';

            return (
              <Pressable
                key={plan.id}
                style={({ pressed }) => [
                  styles.planCard,
                  isSelected && styles.planCardSelected,
                  pressed && styles.planCardPressed,
                  plan.popular && styles.planCardPopular,
                ]}
                onPress={() => handlePlanSelect(plan.id)}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>موصى به</Text>
                  </View>
                )}

                {isSelected && (
                  <View style={styles.selectedCheckmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}

                <View style={styles.planHeader}>
                  <View style={[
                    styles.planIconContainer,
                    isSelected && styles.planIconSelected,
                    plan.popular && styles.planIconPopular,
                  ]}>
                    <Text style={styles.planIcon}>{plan.icon}</Text>
                  </View>
                  <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                    {plan.name}
                  </Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>

                <View style={styles.planPriceContainer}>
                  <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                    {plan.price}
                  </Text>
                  {!isFree && <Text style={styles.planPricePeriod}>/شهرياً</Text>}
                </View>

                {isFree && (
                  <View style={styles.freeTagContainer}>
                    <Text style={styles.freeTag}>لا يلزم بطاقة ائتمانية</Text>
                  </View>
                )}

                {/* مميزات الخطة - RTL: أيقونة يمين، نص يسار */}
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>
                        {feature}
                      </Text>
                      <View style={[styles.featureIcon, isSelected && styles.featureIconSelected]}>
                        <Text style={[styles.featureCheckmark, isSelected && styles.featureCheckmarkSelected]}>
                          ✓
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* زر المتابعة */}
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            !selectedPlan && styles.continueButtonDisabled,
            pressed && selectedPlan && styles.continueButtonPressed,
          ]}
          onPress={handleContinue}
          disabled={!selectedPlan}
        >
          <Text style={[
            styles.continueButtonText,
            !selectedPlan && styles.continueButtonTextDisabled,
          ]}>
            {selectedPlan === 'free'
              ? 'ابدأ بالخطة المجانية'
              : selectedPlan === 'pro'
              ? 'المتابعة للدفع'
              : 'اختر خطة'}
          </Text>
        </Pressable>

        {/* ملاحظة معلوماتية */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            ابدأ مجاناً وقم بالترقية في أي وقت. يمكنك إلغاء أو تغيير اشتراكك من إعدادات ملفك الشخصي.
          </Text>
          <Text style={styles.infoIcon}>ℹ️</Text>
        </View>

        {/* ملاحظة مقارنة */}
        <View style={styles.comparisonNote}>
          <Text style={styles.comparisonTitle}>💡 لماذا الترقية إلى Pro؟</Text>
          <Text style={styles.comparisonText}>
            • تميّز بظهور احترافي مميز{'\n'}
            • احصل على المزيد من العملاء بأعلى ترتيب{'\n'}
            • ابنِ الثقة بشارة مقدم خدمة مميز{'\n'}
            • نمِّ عملك بخدمات غير محدودة
          </Text>
        </View>

        {/* خيار تسجيل الخروج */}
        <View style={styles.logoutContainer}>
          <Text style={styles.logoutNote}>تريد إكمال هذا لاحقاً؟</Text>
          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* مودال الدفع */}
      <CustomModal
        visible={showPaymentModal}
        type="info"
        title="أدخل بيانات الدفع"
        message="يرجى إدخال بيانات بطاقتك للاشتراك في الخطة الاحترافية (€15/شهرياً)"
        primaryButtonText="اشترك الآن"
        secondaryButtonText="إلغاء"
        onPrimaryPress={handlePaymentSubmit}
        onSecondaryPress={() => setShowPaymentModal(false)}
        onClose={() => setShowPaymentModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.cardFieldContainer}>
            <CardField
              postalCodeEnabled={false}
              placeholder={{ number: '4242 4242 4242 4242' }}
              cardStyle={styles.card}
              style={styles.cardField}
              onCardChange={(cardDetails) => {
                setCardComplete(cardDetails.complete);
              }}
            />
            <Text style={styles.testCardNote}>
              💳 بطاقة تجريبية: 4242 4242 4242 4242
            </Text>
          </View>
        </TouchableWithoutFeedback>
      </CustomModal>

      {/* مودال الحالة */}
      <CustomModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        primaryButtonText={
          modalType === 'confirm' ? 'تأكيد' :
          modalType === 'loading' ? undefined :
          'موافق'
        }
        secondaryButtonText={modalType === 'confirm' ? 'إلغاء' : undefined}
        onPrimaryPress={handleModalPrimaryPress}
        onSecondaryPress={handleModalSecondaryPress}
        onClose={handleModalClose}
        showCloseButton={modalType !== 'loading'}
      />
    </Template>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: wp(6), paddingTop: hp(4), paddingBottom: hp(4) },
  header: { alignItems: 'center', marginBottom: hp(3) },
  logoIcon: { width: wp(18), height: wp(18), borderRadius: wp(9), backgroundColor: '#EEF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: hp(2), borderWidth: 3, borderColor: '#2F6FDB' },
  logoEmoji: { fontSize: wp(10) },
  title: { fontSize: wp(7), fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: hp(1) },
  subtitle: { fontSize: wp(3.8), color: '#6B7280', textAlign: 'center', lineHeight: hp(2.8), paddingHorizontal: wp(4) },
  userBadge: { marginTop: hp(2), backgroundColor: '#ECFDF5', paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  userBadgeText: { fontSize: wp(3.5), color: '#059669', fontWeight: '600' },
  plansContainer: { gap: hp(2.5), marginBottom: hp(3) },
  planCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#E5E7EB', padding: wp(5), position: 'relative', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  planCardSelected: { borderColor: '#2F6FDB', backgroundColor: '#EEF5FF', borderWidth: 3, shadowColor: '#2F6FDB', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  planCardPressed: { transform: [{ scale: 0.98 }] },
  planCardPopular: { borderColor: '#F59E0B' },
  popularBadge: { position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: '#F59E0B', paddingHorizontal: wp(4), paddingVertical: hp(0.7), borderRadius: 16, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  popularText: { color: '#FFFFFF', fontSize: wp(2.8), fontWeight: '800', letterSpacing: 0.5 },
  selectedCheckmark: { position: 'absolute', top: wp(4), left: wp(4), width: wp(8), height: wp(8), borderRadius: wp(4), backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center', shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  checkmarkText: { color: '#FFFFFF', fontSize: wp(5), fontWeight: 'bold' },
  planHeader: { alignItems: 'center', marginBottom: hp(2) },
  planIconContainer: { width: wp(16), height: wp(16), borderRadius: wp(8), backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: hp(1.5) },
  planIconSelected: { backgroundColor: '#2F6FDB' },
  planIconPopular: { backgroundColor: '#FEF3C7' },
  planIcon: { fontSize: wp(8) },
  planName: { fontSize: wp(5), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  planNameSelected: { color: '#2F6FDB' },
  planDescription: { fontSize: wp(3.2), color: '#9CA3AF', fontWeight: '500' },
  planPriceContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: hp(1.5) },
  planPrice: { fontSize: wp(9), fontWeight: '800', color: '#1F2937' },
  planPriceSelected: { color: '#2F6FDB' },
  planPricePeriod: { fontSize: wp(4), color: '#9CA3AF', fontWeight: '500', marginRight: wp(1) },
  freeTagContainer: { alignItems: 'center', marginBottom: hp(1.5) },
  freeTag: { fontSize: wp(3), color: '#10B981', fontWeight: '600', backgroundColor: '#ECFDF5', paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12 },
  planFeatures: { gap: hp(1.2) },
  featureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  featureIcon: { width: wp(6), height: wp(6), borderRadius: wp(3), backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginLeft: wp(3) },
  featureIconSelected: { backgroundColor: '#2F6FDB' },
  featureCheckmark: { fontSize: wp(3.5), color: '#6B7280', fontWeight: 'bold' },
  featureCheckmarkSelected: { color: '#FFFFFF' },
  featureText: { fontSize: wp(3.5), color: '#6B7280', flex: 1, lineHeight: hp(2.5), textAlign: 'right' },
  featureTextSelected: { color: '#1F2937', fontWeight: '500' },
  continueButton: { backgroundColor: '#2F6FDB', paddingVertical: hp(2), borderRadius: 12, alignItems: 'center', marginBottom: hp(2), shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  continueButtonDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0, elevation: 0 },
  continueButtonPressed: { transform: [{ scale: 0.98 }], shadowOpacity: 0.2 },
  continueButtonText: { color: '#FFFFFF', fontSize: wp(4.5), fontWeight: '700' },
  continueButtonTextDisabled: { color: '#9CA3AF' },
  infoContainer: { flexDirection: 'row', backgroundColor: '#EEF5FF', padding: wp(4), borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', marginBottom: hp(2), gap: wp(3) },
  infoIcon: { fontSize: wp(5) },
  infoText: { flex: 1, fontSize: wp(3.3), color: '#1E40AF', lineHeight: hp(2.3), textAlign: 'right' },
  comparisonNote: { backgroundColor: '#FEF3C7', padding: wp(4), borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', marginBottom: hp(3) },
  comparisonTitle: { fontSize: wp(4), fontWeight: '700', color: '#92400E', marginBottom: hp(1), textAlign: 'right' },
  comparisonText: { fontSize: wp(3.3), color: '#78350F', lineHeight: hp(2.5), textAlign: 'right' },
  logoutContainer: { alignItems: 'center', paddingTop: hp(2), borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  logoutNote: { fontSize: wp(3.3), color: '#6B7280', marginBottom: hp(1.5), textAlign: 'center' },
  logoutButton: { paddingVertical: hp(1.5), paddingHorizontal: wp(8), borderRadius: 10, borderWidth: 1.5, borderColor: '#DC2626' },
  logoutButtonPressed: { backgroundColor: '#FEE2E2' },
  logoutText: { color: '#DC2626', fontSize: wp(3.8), fontWeight: '600' },
  cardFieldContainer: { marginTop: hp(2), marginBottom: hp(1) },
  cardField: { width: '100%', height: 50, marginVertical: hp(2) },
  card: { backgroundColor: '#F9FAFB', textColor: '#1F2937' },
  testCardNote: { fontSize: wp(3), color: '#6B7280', textAlign: 'center', fontStyle: 'italic', marginTop: hp(1) },
});