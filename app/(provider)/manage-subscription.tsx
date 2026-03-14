import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CustomModal from '../../components/CustomModal';
import { ENV } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { hp, wp } from '../../helpers/common';

interface SubscriptionStatus {
  has_subscription: boolean;
  subscription_status: string;
  subscription_end_date: string | null;
  plan: string;
  plan_name: string;
}

interface Invoice {
  id: string;
  amount_paid: number;
  currency: string;
  status: string;
  created: number;
  invoice_pdf: string | null;
  description: string | null;
  period_start: number;
  period_end: number;
}

const FREE_FEATURES = [
  'عرض خدمة واحدة',
  'التقديم على مناقصة واحدة / شهرياً',
  'ظهور محدود للعملاء',
  'إدراج في دليل الخدمات',
  'الحصول على تقييمات العملاء',
  'لا توجد أولوية بالدعم الفني',
];

const PRO_FEATURES = [
  'عرض حتى 5 خدمات (من فئة واحدة)',
  'التقديم على عدد غير محدود من المناقصات / شهرياً',
  'إدراج في دليل الخدمات',
  'أولوية في الظهور للعملاء',
  'الحصول على تقييمات العملاء',
  'أولوية بالدعم الفني',
  'إمكانية تأكيد الهوية والشركة لزيادة المصداقية',
];

export default function ManageSubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'confirm'>('confirm');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalPrimaryText, setModalPrimaryText] = useState('موافق');
  const [modalSecondaryText, setModalSecondaryText] = useState<string | undefined>(undefined);
  const [modalOnPrimary, setModalOnPrimary] = useState<(() => void) | undefined>(undefined);
  const [modalOnSecondary, setModalOnSecondary] = useState<(() => void) | undefined>(undefined);

  const showModal = (
    type: 'success' | 'error' | 'warning' | 'confirm',
    title: string,
    message: string,
    primaryText = 'موافق',
    onPrimary?: () => void,
    secondaryText?: string,
    onSecondary?: () => void,
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    setModalPrimaryText(primaryText);
    setModalSecondaryText(secondaryText);
    setModalOnPrimary(() => onPrimary);
    setModalOnSecondary(() => onSecondary);
    setModalVisible(true);
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      router.back();
      return true;
    });
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [subRes, invoicesRes] = await Promise.all([
        fetch(`${ENV.API_BASE_URL}/provider_profiles/subscription-status/${user.id}`),
        fetch(`${ENV.API_BASE_URL}/stripe-payment/invoices/${user.id}`),
      ]);
      if (subRes.ok) setSubscription(await subRes.json());
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoices(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Error fetching subscription data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    showModal(
      'warning',
      'إلغاء الاشتراك',
      'سيستمر اشتراكك حتى نهاية الفترة الحالية، ثم سيتم إلغاؤه تلقائياً. هل تريد المتابعة؟',
      'إلغاء الاشتراك',
      confirmCancel,
      'تراجع',
      () => setModalVisible(false),
    );
  };

  const confirmCancel = async () => {
    if (!user?.id) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`${ENV.API_BASE_URL}/stripe-payment/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        showModal(
          'success',
          'تم الإلغاء',
          'تم جدولة إلغاء اشتراكك. سيستمر حتى نهاية الفترة الحالية.',
          'موافق',
          () => { setModalVisible(false); fetchAll(); },
        );
      } else {
        const data = await res.json();
        showModal('error', 'خطأ', data.message || 'فشل إلغاء الاشتراك. حاول مرة أخرى.');
      }
    } catch (e) {
      showModal('error', 'خطأ', 'حدث خطأ أثناء إلغاء الاشتراك.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isPro = subscription?.plan === 'pro';
  const isActive = subscription?.subscription_status === 'active';
  const currentFeatures = isPro ? PRO_FEATURES : FREE_FEATURES;

  const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleDateString('ar-EG', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  const formatAmount = (amount: number, currency: string) =>
    `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'open': return '#F59E0B';
      case 'void':
      case 'uncollectible': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'مدفوع';
      case 'open': return 'معلق';
      case 'void': return 'ملغي';
      case 'uncollectible': return 'غير قابل للتحصيل';
      default: return status;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* الرأس */}
      <View style={styles.header}>
        <View style={{ width: wp(10) }} />
        <Text style={styles.headerTitle}>إدارة الاشتراك</Text>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-forward" size={wp(6)} color="#1F2937" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2F6FDB" />
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* بطاقة الخطة الحالية */}
          <View style={[styles.planCard, isPro && isActive && styles.planCardPro]}>
            <View style={[styles.planCardAccent, { backgroundColor: isPro && isActive ? '#F59E0B' : '#E5E7EB' }]} />
            <View style={styles.planCardBody}>
              <View style={[styles.statusPill, { backgroundColor: isActive ? '#ECFDF5' : '#FEF2F2' }]}>
                <View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]} />
                <Text style={[styles.statusPillText, { color: isActive ? '#059669' : '#DC2626' }]}>
                  {isActive ? 'نشط' : 'غير نشط'}
                </Text>
              </View>
              <View style={styles.planRight}>
                <Text style={styles.planLabel}>باقتك الحالية</Text>
                <Text style={[styles.planName, isPro && isActive && styles.planNamePro]}>
                  {isPro
                    ? 'الخطة المدفوعة - € 15/شهر'
                    : 'الخطة المجانية'}
                </Text>
                {isPro && (
                  <Text style={styles.planScope}>نطاق جغرافي: 200 كم</Text>
                )}
                {!isPro && (
                  <Text style={styles.planScope}>نطاق جغرافي: 25 كم</Text>
                )}
                {subscription?.subscription_end_date && (
                  <Text style={styles.endDate}>
                    {isActive ? 'تُجدَّد في: ' : 'تنتهي في: '}
                    {new Date(subscription.subscription_end_date).toLocaleDateString('ar-EG', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* أزرار الإجراءات */}
          {!isPro ? (
            <Pressable
              style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/(provider)/upgrade-subscription')}
            >
              <Text style={styles.upgradeBtnText}>ترقية إلى Pro</Text>
              <Ionicons name="star" size={wp(5)} color="#FFFFFF" />
            </Pressable>
          ) : isActive ? (
            <Pressable
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }, isCancelling && styles.cancelBtnDisabled]}
              onPress={handleCancelSubscription}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#DC2626" />
              ) : (
                <>
                  <Text style={styles.cancelBtnText}>إلغاء الاشتراك</Text>
                  <Ionicons name="close-circle-outline" size={wp(5)} color="#DC2626" />
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.upgradeBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/(provider)/upgrade-subscription')}
            >
              <Text style={styles.upgradeBtnText}>تجديد الاشتراك</Text>
              <Ionicons name="refresh" size={wp(5)} color="#FFFFFF" />
            </Pressable>
          )}

          {/* مميزات الخطة الحالية */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {isPro ? 'مميزات الخطة المدفوعة - PRO' : 'مميزات الخطة المجانية - FREE'}
            </Text>
            {currentFeatures.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureText}>{feature}</Text>
                <Ionicons
                  name="checkmark-circle"
                  size={wp(5)}
                  color={isPro ? '#10B981' : '#9CA3AF'}
                />
              </View>
            ))}
          </View>

          {/* مقارنة الخطط — تظهر فقط للمجاني */}
          {!isPro && (
            <View style={styles.compareCard}>
              <Text style={styles.compareTitle}>💡 لماذا الترقية إلى Pro؟</Text>
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareColTitle}>⭐ Pro — €15/شهر</Text>
                  {PRO_FEATURES.map((f, i) => (
                    <View key={i} style={styles.compareItem}>
                      <Text style={styles.compareItemText}>{f}</Text>
                      <Ionicons name="checkmark-circle" size={wp(4)} color="#10B981" />
                    </View>
                  ))}
                </View>
              </View>
              <Pressable
                style={({ pressed }) => [styles.upgradeBtn, { marginTop: hp(2) }, pressed && { opacity: 0.85 }]}
                onPress={() => router.push('/(provider)/upgrade-subscription')}
              >
                <Text style={styles.upgradeBtnText}>ترقية الآن</Text>
                <Ionicons name="star" size={wp(5)} color="#FFFFFF" />
              </Pressable>
            </View>
          )}

          {/* سجل الفواتير */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>سجل الفواتير</Text>
            <Ionicons name="receipt-outline" size={wp(5)} color="#1F2937" />
          </View>

          {invoices.length === 0 ? (
            <View style={styles.emptyInvoices}>
              <Ionicons name="document-outline" size={wp(12)} color="#D1D5DB" />
              <Text style={styles.emptyInvoicesText}>لا توجد فواتير بعد</Text>
            </View>
          ) : (
            <View style={styles.invoicesList}>
              {invoices.map((invoice, i) => (
                <View
                  key={invoice.id}
                  style={[styles.invoiceCard, i === invoices.length - 1 && { borderBottomWidth: 0 }]}
                >
                  <View style={styles.invoiceRight}>
                    <Text style={styles.invoiceAmount}>{formatAmount(invoice.amount_paid, invoice.currency)}</Text>
                    <View style={[styles.invoiceStatusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                      <Text style={[styles.invoiceStatusText, { color: getStatusColor(invoice.status) }]}>
                        {getStatusLabel(invoice.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invoiceLeft}>
                    <View>
                      <Text style={styles.invoiceDate}>{formatDate(invoice.created)}</Text>
                      <Text style={styles.invoicePeriod}>
                        {formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}
                      </Text>
                    </View>
                    <View style={[styles.invoiceIconWrap, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                      <Ionicons
                        name={invoice.status === 'paid' ? 'checkmark-circle' : 'time-outline'}
                        size={wp(5)}
                        color={getStatusColor(invoice.status)}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <CustomModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        primaryButtonText={modalPrimaryText}
        secondaryButtonText={modalSecondaryText}
        onPrimaryPress={modalOnPrimary}
        onSecondaryPress={modalOnSecondary}
        onClose={() => setModalVisible(false)}
        showCloseButton={true}
      />
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
  backBtn: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: hp(2) },
  loadingText: { fontSize: wp(4), color: '#6B7280' },
  content: { padding: wp(5), gap: hp(2.5), paddingBottom: hp(8) },

  planCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  planCardPro: { borderColor: '#F59E0B' },
  planCardAccent: { height: 5 },
  planCardBody: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: wp(5),
  },
  planRight: { flex: 1, alignItems: 'flex-end' },
  planLabel: { fontSize: wp(3.2), color: '#9CA3AF', marginBottom: hp(0.4), textAlign: 'right' },
  planName: { fontSize: wp(5), fontWeight: '800', color: '#1F2937', marginBottom: hp(0.5), textAlign: 'right' },
  planNamePro: { color: '#D97706' },
  planScope: { fontSize: wp(3.2), color: '#6B7280', marginBottom: hp(0.3), textAlign: 'right' },
  endDate: { fontSize: wp(3), color: '#6B7280', textAlign: 'right' },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: wp(1.5),
    paddingHorizontal: wp(3), paddingVertical: hp(0.6), borderRadius: 20,
  },
  statusDot: { width: wp(2), height: wp(2), borderRadius: wp(1) },
  statusPillText: { fontSize: wp(3.2), fontWeight: '700' },

  upgradeBtn: {
    backgroundColor: '#2F6FDB', borderRadius: 14, paddingVertical: hp(2),
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: wp(2),
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  upgradeBtnText: { fontSize: wp(4.5), fontWeight: '700', color: '#FFFFFF' },
  cancelBtn: {
    backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: hp(2),
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: wp(2),
    borderWidth: 1.5, borderColor: '#FECACA',
  },
  cancelBtnDisabled: { opacity: 0.6 },
  cancelBtnText: { fontSize: wp(4.5), fontWeight: '700', color: '#DC2626' },

  infoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(5),
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  infoTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#1F2937', marginBottom: hp(2), textAlign: 'right' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: wp(3), marginBottom: hp(1.5),
  },
  featureText: { fontSize: wp(3.8), color: '#374151', flex: 1, textAlign: 'right' },

  compareCard: {
    backgroundColor: '#FFFBEB', borderRadius: 16, padding: wp(5),
    borderWidth: 1, borderColor: '#FDE68A',
  },
  compareTitle: { fontSize: wp(4.5), fontWeight: '700', color: '#92400E', marginBottom: hp(2), textAlign: 'right' },
  compareRow: { gap: hp(1) },
  compareCol: { gap: hp(1) },
  compareColTitle: { fontSize: wp(4), fontWeight: '700', color: '#1F2937', textAlign: 'right', marginBottom: hp(1) },
  compareItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: wp(2),
  },
  compareItemText: { fontSize: wp(3.5), color: '#374151', flex: 1, textAlign: 'right' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: wp(2), marginBottom: hp(-1) },
  sectionTitle: { fontSize: wp(5), fontWeight: '700', color: '#1F2937' },

  emptyInvoices: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: wp(10),
    alignItems: 'center', gap: hp(1.5), borderWidth: 1, borderColor: '#E5E7EB',
  },
  emptyInvoicesText: { fontSize: wp(4), color: '#9CA3AF' },

  invoicesList: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  invoiceCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: wp(4), paddingVertical: hp(2),
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  invoiceLeft: { flexDirection: 'row', alignItems: 'center', gap: wp(3), flex: 1, justifyContent: 'flex-end' },
  invoiceIconWrap: {
    width: wp(10), height: wp(10), borderRadius: wp(5),
    justifyContent: 'center', alignItems: 'center',
  },
  invoiceDate: { fontSize: wp(3.8), fontWeight: '600', color: '#1F2937', textAlign: 'right' },
  invoicePeriod: { fontSize: wp(3), color: '#9CA3AF', marginTop: hp(0.3), textAlign: 'right' },
  invoiceRight: { alignItems: 'flex-start', gap: hp(0.5) },
  invoiceAmount: { fontSize: wp(4), fontWeight: '800', color: '#1F2937' },
  invoiceStatusBadge: { paddingHorizontal: wp(2.5), paddingVertical: hp(0.3), borderRadius: 20 },
  invoiceStatusText: { fontSize: wp(3), fontWeight: '700' },
});