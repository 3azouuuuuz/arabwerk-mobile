import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { hp, wp } from '../helpers/common';

interface PaymentMethodModalProps {
  visible: boolean;
  onStripePress: () => void;
  onPayPalPress: () => void;
  onClose: () => void;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  visible,
  onStripePress,
  onPayPalPress,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 90,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 90,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Top accent bar */}
          <View style={styles.topBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>اختر طريقة الدفع</Text>
            <Text style={styles.subtitle}>الخطة الاحترافية · €15 / شهرياً</Text>
          </View>

          {/* Stripe Button */}
          <Pressable
            style={({ pressed }) => [
              styles.paymentButton,
              styles.stripeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => { onClose(); onStripePress(); }}
          >
            <View style={styles.buttonInner}>
              {/* Stripe Logo SVG-like using text + styling */}
              <View style={styles.stripeLogo}>
                <View style={styles.stripeLogoInner}>
                  <Text style={styles.stripeLogoText}>S</Text>
                </View>
                <Text style={styles.stripeWordmark}>stripe</Text>
              </View>
              <View style={styles.buttonRight}>
                <Text style={styles.stripeLabel}>بطاقة ائتمانية</Text>
                <Text style={styles.buttonSub}>Visa · Mastercard · Amex</Text>
              </View>
            </View>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>›</Text>
            </View>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* PayPal Button */}
          <Pressable
            style={({ pressed }) => [
              styles.paymentButton,
              styles.paypalButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => { onClose(); onPayPalPress(); }}
          >
            <View style={styles.buttonInner}>
              {/* PayPal Logo */}
              <View style={styles.paypalLogo}>
                <Text style={styles.paypalP1}>P</Text>
                <Text style={styles.paypalP2}>P</Text>
              </View>
              <View style={styles.buttonRight}>
                <Text style={styles.paypalLabel}>PayPal</Text>
                <Text style={styles.buttonSub}>الدفع الآمن عبر PayPal</Text>
              </View>
            </View>
            <View style={styles.arrowContainerPaypal}>
              <Text style={styles.arrowPaypal}>›</Text>
            </View>
          </Pressable>

          {/* Security note */}
          <View style={styles.securityRow}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>مدفوعاتك محمية بتشفير SSL</Text>
          </View>

          {/* Cancel */}
          <Pressable
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.6 }]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>إلغاء</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  topBar: {
    height: 4,
    backgroundColor: '#2F6FDB',
  },
  header: {
    alignItems: 'center',
    paddingTop: hp(3),
    paddingBottom: hp(2),
    paddingHorizontal: wp(6),
  },
  title: {
    fontSize: wp(5.5),
    fontWeight: '800',
    color: '#111827',
    marginBottom: hp(0.5),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: wp(3.5),
    color: '#6B7280',
    textAlign: 'center',
  },

  // ── Payment Buttons ──────────────────────────────────────────────────────
  paymentButton: {
    marginHorizontal: wp(5),
    borderRadius: 16,
    paddingVertical: hp(2),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
  },
  stripeButton: {
    backgroundColor: '#F8F9FF',
    borderColor: '#C7D2FE',
  },
  paypalButton: {
    backgroundColor: '#FFF8E7',
    borderColor: '#FDE68A',
    marginTop: hp(0),
  },
  buttonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1,
  },
  buttonRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stripeLabel: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#1a1a2e',
    textAlign: 'right',
  },
  paypalLabel: {
    fontSize: wp(4),
    fontWeight: '700',
    color: '#003087',
    textAlign: 'right',
  },
  buttonSub: {
    fontSize: wp(3),
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'right',
  },

  // ── Stripe Logo ──────────────────────────────────────────────────────────
  stripeLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: '#635BFF',
    borderRadius: 10,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
  },
  stripeLogoInner: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripeLogoText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: wp(3.5),
  },
  stripeWordmark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: wp(4),
    letterSpacing: 0.5,
  },

  // ── PayPal Logo ──────────────────────────────────────────────────────────
  paypalLogo: {
    flexDirection: 'row',
    backgroundColor: '#003087',
    borderRadius: 10,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },
  paypalP1: {
    color: '#009CDE',
    fontWeight: '900',
    fontSize: wp(5),
    fontStyle: 'italic',
  },
  paypalP2: {
    color: '#012169',
    fontWeight: '900',
    fontSize: wp(5),
    fontStyle: 'italic',
    marginLeft: -wp(1),
    textShadowColor: '#009CDE',
    textShadowOffset: { width: 1, height: 0 },
    textShadowRadius: 1,
  },

  // ── Arrows ───────────────────────────────────────────────────────────────
  arrowContainer: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: '#635BFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowContainerPaypal: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: '#003087',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrow: {
    color: '#FFFFFF',
    fontSize: wp(5),
    fontWeight: '700',
    lineHeight: wp(6),
  },
  arrowPaypal: {
    color: '#FFFFFF',
    fontSize: wp(5),
    fontWeight: '700',
    lineHeight: wp(6),
  },

  // ── Divider ──────────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(5),
    marginVertical: hp(1.5),
    gap: wp(3),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: wp(3.2),
    color: '#9CA3AF',
    fontWeight: '600',
  },

  // ── Security ─────────────────────────────────────────────────────────────
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    marginTop: hp(2),
    marginBottom: hp(1),
  },
  securityIcon: {
    fontSize: wp(3.5),
  },
  securityText: {
    fontSize: wp(3.2),
    color: '#9CA3AF',
  },

  // ── Cancel ───────────────────────────────────────────────────────────────
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: hp(2),
    marginBottom: hp(1),
  },
  cancelText: {
    fontSize: wp(4),
    color: '#9CA3AF',
    fontWeight: '600',
  },
});

export default PaymentMethodModal;