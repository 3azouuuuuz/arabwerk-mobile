import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { hp, wp } from '../helpers/common';

export default function WelcomeScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.stagger(150, [
        Animated.timing(card1Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(card2Anim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Background blobs */}
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />
      <View style={styles.bgBlob3} />

      {/* Hero Section */}
      <Animated.View
        style={[
          styles.heroSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo */}
        <View style={styles.logoRing}>
          <View style={styles.logoInner}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.brandName}>ArabWerk</Text>

        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>المنصة التي تربط العملاء بالحرفيين</Text>
          <Text style={styles.tagline}>ومقدمي الخدمات في ألمانيا</Text>
        </View>

        {/* Decorative badges */}
        <View style={styles.badgesRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>حرفيون</Text>
            <Text style={styles.badgeEmoji}>🔧</Text>
          </View>
          <View style={[styles.badge, styles.badgeAccent]}>
            <Text style={[styles.badgeText, styles.badgeTextAccent]}>ألمانيا</Text>
            <Text style={styles.badgeEmoji}>🇩🇪</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>موثوق</Text>
            <Text style={styles.badgeEmoji}>⭐</Text>
          </View>
        </View>
      </Animated.View>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.handleBar} />

        <Text style={styles.bottomTitle}>ابدأ رحلتك معنا</Text>
        <Text style={styles.bottomSubtitle}>
          انضم إلى آلاف المستخدمين الذين يثقون بـ ArabWerk
        </Text>

        {/* Primary Button */}
        <Animated.View
          style={{
            opacity: card1Anim,
            transform: [{ translateY: card1Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <View style={styles.buttonArrow}>
              <Text style={styles.buttonArrowText}>→</Text>
            </View>
            <Text style={styles.primaryButtonText}>إنشاء حساب جديد</Text>
          </Pressable>
        </Animated.View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>أو</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Secondary Button */}
        <Animated.View
          style={{
            opacity: card2Anim,
            transform: [{ translateY: card2Anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }}
        >
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>تسجيل الدخول</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.termsText}>
          بالمتابعة، أنت توافق على{' '}
          <Text style={styles.termsLink}>شروط الاستخدام</Text>
          {' '}و{' '}
          <Text style={styles.termsLink}>سياسة الخصوصية</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF5FF',
  },

  // ── Background blobs ──────────────────────────────────────────────────
  bgBlob1: {
    position: 'absolute',
    width: wp(90),
    height: wp(90),
    borderRadius: wp(45),
    backgroundColor: '#2F6FDB',
    top: -wp(30),
    left: -wp(20),
    opacity: 0.08,
  },
  bgBlob2: {
    position: 'absolute',
    width: wp(60),
    height: wp(60),
    borderRadius: wp(30),
    backgroundColor: '#2F6FDB',
    top: hp(20),
    right: -wp(20),
    opacity: 0.06,
  },
  bgBlob3: {
    position: 'absolute',
    width: wp(50),
    height: wp(50),
    borderRadius: wp(25),
    backgroundColor: '#F4C430',
    top: hp(28),
    left: -wp(10),
    opacity: 0.12,
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  heroSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp(6),
    paddingHorizontal: wp(6),
  },
  logoRing: {
    width: wp(34),
    height: wp(34),
    borderRadius: wp(17),
    borderWidth: 2,
    borderColor: 'rgba(47, 111, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
    backgroundColor: 'rgba(47, 111, 219, 0.04)',
  },
  logoInner: {
    width: wp(27),
    height: wp(27),
    borderRadius: wp(13.5),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: '80%',
    height: '80%',
  },
  brandName: {
    fontSize: wp(11),
    fontWeight: '900',
    color: '#1F2937',
    letterSpacing: 0.5,
    marginBottom: hp(1.5),
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: hp(3),
  },
  tagline: {
    fontSize: wp(4.2),
    color: '#374151',
    textAlign: 'center',
    lineHeight: hp(3.2),
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeAccent: {
    backgroundColor: '#EEF5FF',
    borderColor: '#BFDBFE',
  },
  badgeEmoji: { fontSize: wp(3.5) },
  badgeText: {
    fontSize: wp(3.2),
    color: '#374151',
    fontWeight: '600',
  },
  badgeTextAccent: {
    color: '#2F6FDB',
  },

  // ── Bottom Card ───────────────────────────────────────────────────────
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: wp(6),
    paddingTop: hp(1.5),
    paddingBottom: hp(5),
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: wp(10),
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: hp(2.5),
  },
  bottomTitle: {
    fontSize: wp(6),
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'right',
    marginBottom: hp(0.8),
  },
  bottomSubtitle: {
    fontSize: wp(3.5),
    color: '#6B7280',
    textAlign: 'right',
    marginBottom: hp(3),
    lineHeight: hp(2.8),
  },

  // ── Buttons ───────────────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: '#2F6FDB',
    borderRadius: 16,
    paddingVertical: hp(2),
    paddingHorizontal: wp(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(3),
    shadowColor: '#2F6FDB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonArrow: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonArrowText: {
    fontSize: wp(4),
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingVertical: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#1F2937',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  // ── Divider ───────────────────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    marginVertical: hp(1.8),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: wp(3.8),
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // ── Terms ─────────────────────────────────────────────────────────────
  termsText: {
    fontSize: wp(3),
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: hp(2),
    lineHeight: hp(2.5),
  },
  termsLink: {
    color: '#2F6FDB',
    fontWeight: '600',
  },
});