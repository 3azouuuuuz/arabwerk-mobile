import { Ionicons } from '@expo/vector-icons';
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
    name: 'Free Plan',
    price: '€0',
    priceValue: 0,
    icon: '🆓',
    description: 'Perfect for getting started',
    features: [
      'Basic profile visibility',
      'Up to 3 services',
      'Email support',
      'Standard search ranking',
      'Basic analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: '€15',
    priceValue: 15,
    icon: '⭐',
    popular: true,
    description: 'Best for serious professionals',
    features: [
      'Premium profile visibility',
      'Unlimited services',
      'Priority support 24/7',
      'Top search ranking',
      'Featured provider badge',
      'Advanced analytics',
      'Custom business profile',
      'Priority in search results',
    ],
  },
];

export default function UpgradeSubscriptionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { createPaymentMethod } = useStripe();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm'>('info');
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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
    type: typeof modalType,
    title: string,
    message: string,
    pending?: () => void,
  ) => {
    setModalType(type);
    setModalTitle(title);
    setModalMessage(message);
    if (pending) setPendingAction(() => pending);
    setModalVisible(true);
  };

  const handlePlanSelect = useCallback((planId: string) => {
    setSelectedPlan(planId);
  }, []);

  const handleContinue = useCallback(() => {
    if (!selectedPlan) {
      showModal('warning', 'Select a Plan', 'Please select a subscription plan to continue.');
      return;
    }

    if (selectedPlan === 'free') {
      showModal(
        'confirm',
        'Confirm Free Plan',
        'You selected Free Plan.\n\nYou can upgrade to Pro anytime from your profile.',
        () => activateFreePlan(),
      );
    } else {
      setShowPaymentModal(true);
    }
  }, [selectedPlan]);

  const activateFreePlan = async () => {
    showModal('loading', 'Setting Up', 'Activating your free plan...');
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
      if (!response.ok) throw new Error('Failed to activate free plan');
      await SecureStore.deleteItemAsync('needs_subscription');
      showModal('success', 'Done!', 'Your free plan is now active.');
      setTimeout(() => { setModalVisible(false); router.back(); }, 2000);
    } catch (error) {
      showModal('error', 'Failed', error.message || 'Failed to activate free plan. Please try again.');
    }
  };

  const handlePaymentSubmit = async () => {
    if (!cardComplete) {
      showModal('warning', 'Incomplete Card', 'Please enter your complete card information.');
      return;
    }
    setShowPaymentModal(false);
    showModal('loading', 'Processing Payment', 'Please wait while we process your subscription...');
    try {
      const { paymentMethod, error: pmError } = await createPaymentMethod({ paymentMethodType: 'Card' });
      if (pmError) throw new Error(pmError.message);
      if (!paymentMethod) throw new Error('Failed to create payment method');

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
      if (!response.ok) throw new Error(data.message || 'Subscription creation failed');
      await SecureStore.deleteItemAsync('needs_subscription');
      showModal('success', 'Welcome to Pro! 🎉', 'Your Pro subscription is now active. Enjoy premium features!');
      setTimeout(() => { setModalVisible(false); router.back(); }, 2500);
    } catch (error) {
      showModal('error', 'Payment Failed', error.message || 'Failed to process payment. Please try again.');
    }
  };

  const handleModalPrimaryPress = useCallback(() => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    } else {
      setModalVisible(false);
    }
  }, [pendingAction]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={wp(6)} color="#1F2937" />
        </Pressable>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={{ width: wp(10) }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>Start free or unlock premium features with Pro</Text>
        </View>

        {/* Plans */}
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
                    <Text style={styles.popularText}>RECOMMENDED</Text>
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
                  <Text style={[styles.planName, isSelected && styles.planNameSelected]}>{plan.name}</Text>
                  <Text style={styles.planDescription}>{plan.description}</Text>
                </View>
                <View style={styles.planPriceContainer}>
                  <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>{plan.price}</Text>
                  {!isFree && <Text style={styles.planPricePeriod}>/month</Text>}
                </View>
                {isFree && (
                  <View style={styles.freeTagContainer}>
                    <Text style={styles.freeTag}>No credit card required</Text>
                  </View>
                )}
                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <View style={[styles.featureIcon, isSelected && styles.featureIconSelected]}>
                        <Text style={[styles.featureCheckmark, isSelected && styles.featureCheckmarkSelected]}>✓</Text>
                      </View>
                      <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Continue Button */}
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            !selectedPlan && styles.continueButtonDisabled,
            pressed && selectedPlan && styles.continueButtonPressed,
          ]}
          onPress={handleContinue}
          disabled={!selectedPlan}
        >
          <Text style={[styles.continueButtonText, !selectedPlan && styles.continueButtonTextDisabled]}>
            {selectedPlan === 'free' ? 'Start with Free Plan' : selectedPlan === 'pro' ? 'Continue to Payment' : 'Select a Plan'}
          </Text>
        </Pressable>

        <View style={styles.infoContainer}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            You can cancel or change your subscription anytime from your profile settings.
          </Text>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <CustomModal
        visible={showPaymentModal}
        type="info"
        title="Enter Payment Details"
        message="Please enter your card information to subscribe to Pro Plan (€15/month)"
        primaryButtonText="Subscribe Now"
        secondaryButtonText="Cancel"
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
              onCardChange={(cardDetails) => setCardComplete(cardDetails.complete)}
            />
            <Text style={styles.testCardNote}>💳 Test card: 4242 4242 4242 4242</Text>
          </View>
        </TouchableWithoutFeedback>
      </CustomModal>

      {/* Status Modal */}
      <CustomModal
        visible={modalVisible}
        type={modalType}
        title={modalTitle}
        message={modalMessage}
        primaryButtonText={
          modalType === 'confirm' ? 'Confirm' :
          modalType === 'loading' ? undefined : 'OK'
        }
        secondaryButtonText={modalType === 'confirm' ? 'Cancel' : undefined}
        onPrimaryPress={handleModalPrimaryPress}
        onSecondaryPress={() => { setPendingAction(null); setModalVisible(false); }}
        onClose={() => { setPendingAction(null); setModalVisible(false); }}
        showCloseButton={modalType !== 'loading'}
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
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: wp(5), paddingTop: hp(3), paddingBottom: hp(6) },
  titleSection: { alignItems: 'center', marginBottom: hp(3) },
  title: { fontSize: wp(6.5), fontWeight: '800', color: '#1F2937', textAlign: 'center', marginBottom: hp(1) },
  subtitle: { fontSize: wp(3.8), color: '#6B7280', textAlign: 'center', lineHeight: hp(2.8) },
  plansContainer: { gap: hp(2.5), marginBottom: hp(3) },
  planCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2,
    borderColor: '#E5E7EB', padding: wp(5), position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  planCardSelected: {
    borderColor: '#2F6FDB', backgroundColor: '#EEF5FF', borderWidth: 3,
    shadowColor: '#2F6FDB', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  planCardPressed: { transform: [{ scale: 0.98 }] },
  planCardPopular: { borderColor: '#F59E0B' },
  popularBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: '#F59E0B', paddingHorizontal: wp(4), paddingVertical: hp(0.7),
    borderRadius: 16, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  popularText: { color: '#FFFFFF', fontSize: wp(2.8), fontWeight: '800', letterSpacing: 0.5 },
  selectedCheckmark: {
    position: 'absolute', top: wp(4), right: wp(4),
    width: wp(8), height: wp(8), borderRadius: wp(4),
    backgroundColor: '#2F6FDB', justifyContent: 'center', alignItems: 'center',
  },
  checkmarkText: { color: '#FFFFFF', fontSize: wp(5), fontWeight: 'bold' },
  planHeader: { alignItems: 'center', marginBottom: hp(2) },
  planIconContainer: {
    width: wp(16), height: wp(16), borderRadius: wp(8),
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: hp(1.5),
  },
  planIconSelected: { backgroundColor: '#2F6FDB' },
  planIconPopular: { backgroundColor: '#FEF3C7' },
  planIcon: { fontSize: wp(8) },
  planName: { fontSize: wp(5), fontWeight: '700', color: '#1F2937', marginBottom: hp(0.5) },
  planNameSelected: { color: '#2F6FDB' },
  planDescription: { fontSize: wp(3.2), color: '#9CA3AF', fontWeight: '500' },
  planPriceContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: hp(1.5) },
  planPrice: { fontSize: wp(9), fontWeight: '800', color: '#1F2937' },
  planPriceSelected: { color: '#2F6FDB' },
  planPricePeriod: { fontSize: wp(4), color: '#9CA3AF', fontWeight: '500', marginLeft: wp(1) },
  freeTagContainer: { alignItems: 'center', marginBottom: hp(1.5) },
  freeTag: {
    fontSize: wp(3), color: '#10B981', fontWeight: '600',
    backgroundColor: '#ECFDF5', paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12,
  },
  planFeatures: { gap: hp(1.2) },
  featureRow: { flexDirection: 'row', alignItems: 'center' },
  featureIcon: {
    width: wp(6), height: wp(6), borderRadius: wp(3),
    backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', marginRight: wp(3),
  },
  featureIconSelected: { backgroundColor: '#2F6FDB' },
  featureCheckmark: { fontSize: wp(3.5), color: '#6B7280', fontWeight: 'bold' },
  featureCheckmarkSelected: { color: '#FFFFFF' },
  featureText: { fontSize: wp(3.5), color: '#6B7280', flex: 1, lineHeight: hp(2.5) },
  featureTextSelected: { color: '#1F2937', fontWeight: '500' },
  continueButton: {
    backgroundColor: '#2F6FDB', paddingVertical: hp(2), borderRadius: 12,
    alignItems: 'center', marginBottom: hp(2),
    shadowColor: '#2F6FDB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  continueButtonDisabled: { backgroundColor: '#E5E7EB', shadowOpacity: 0, elevation: 0 },
  continueButtonPressed: { transform: [{ scale: 0.98 }], shadowOpacity: 0.2 },
  continueButtonText: { color: '#FFFFFF', fontSize: wp(4.5), fontWeight: '700' },
  continueButtonTextDisabled: { color: '#9CA3AF' },
  infoContainer: {
    flexDirection: 'row', backgroundColor: '#EEF5FF', padding: wp(4),
    borderRadius: 12, borderWidth: 1, borderColor: '#BFDBFE', gap: wp(3),
  },
  infoIcon: { fontSize: wp(5) },
  infoText: { flex: 1, fontSize: wp(3.3), color: '#1E40AF', lineHeight: hp(2.3) },
  cardFieldContainer: { marginTop: hp(2), marginBottom: hp(1) },
  cardField: { width: '100%', height: 50, marginVertical: hp(2) },
  card: { backgroundColor: '#F9FAFB', textColor: '#1F2937' },
  testCardNote: { fontSize: wp(3), color: '#6B7280', textAlign: 'center', fontStyle: 'italic', marginTop: hp(1) },
});