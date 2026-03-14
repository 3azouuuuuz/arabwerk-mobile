import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { hp, wp } from '../helpers/common';

type ModalType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'confirm';

interface CustomModalProps {
  visible: boolean;
  type: ModalType;
  title?: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
  children?: React.ReactNode; // ✅ NEW: Support for custom content (like card input)
}

const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  type,
  title,
  message,
  primaryButtonText = 'OK',
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  onClose,
  showCloseButton = true,
  autoClose = false,
  autoCloseDelay = 3000,
  children, // ✅ NEW
}) => {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          delay: 100,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0.8);
      fadeAnim.setValue(0);
      iconScaleAnim.setValue(0);
    }
  }, [visible]);

  // Auto close functionality
  useEffect(() => {
    if (visible && autoClose && type === 'success') {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [visible, autoClose, autoCloseDelay, type, onClose]);

  // Get icon and colors based on type
  const getModalConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          solidBg: '#10B981',
          glowColor: 'rgba(16, 185, 129, 0.3)',
          title: title || 'Success!',
        };
      case 'error':
        return {
          icon: '✕',
          iconBg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          solidBg: '#EF4444',
          glowColor: 'rgba(239, 68, 68, 0.3)',
          title: title || 'Error',
        };
      case 'warning':
        return {
          icon: '⚠',
          iconBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
          solidBg: '#F59E0B',
          glowColor: 'rgba(245, 158, 11, 0.3)',
          title: title || 'Warning',
        };
      case 'info':
        return {
          icon: 'ℹ',
          iconBg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          solidBg: '#3B82F6',
          glowColor: 'rgba(59, 130, 246, 0.3)',
          title: title || 'Information',
        };
      case 'loading':
        return {
          icon: null,
          iconBg: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          solidBg: '#6366F1',
          glowColor: 'rgba(99, 102, 241, 0.3)',
          title: title || 'Please Wait',
        };
      case 'confirm':
        return {
          icon: '?',
          iconBg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          solidBg: '#8B5CF6',
          glowColor: 'rgba(139, 92, 246, 0.3)',
          title: title || 'Confirm',
        };
      default:
        return {
          icon: 'ℹ',
          iconBg: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          solidBg: '#3B82F6',
          glowColor: 'rgba(59, 130, 246, 0.3)',
          title: title || 'Information',
        };
    }
  };

  const config = getModalConfig();

  const handlePrimaryPress = () => {
    onPrimaryPress?.();
    if (type !== 'loading') {
      onClose?.();
    }
  };

  const handleSecondaryPress = () => {
    onSecondaryPress?.();
    onClose?.();
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.modalContainer,
            { 
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          {/* Decorative top bar */}
          <View style={[styles.topBar, { backgroundColor: config.solidBg }]} />

          {/* Icon with glow effect */}
          <Animated.View style={{ transform: [{ scale: iconScaleAnim }] }}>
            <View style={[styles.iconWrapper, { shadowColor: config.solidBg }]}>
              <View style={[styles.iconContainer, { backgroundColor: config.solidBg }]}>
                {type === 'loading' ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <Text style={styles.iconText}>{config.icon}</Text>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{config.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* ✅ NEW: Custom content area (for card input, etc.) */}
          {children && (
            <View style={styles.customContent}>
              {children}
            </View>
          )}

          {/* Buttons */}
          {type !== 'loading' && showCloseButton && (
            <View style={styles.buttonContainer}>
              {/* Secondary Button (if provided) */}
              {secondaryButtonText && onSecondaryPress && (
                <Pressable
                  style={({ pressed }) => [
                    styles.button,
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleSecondaryPress}
                >
                  <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                </Pressable>
              )}

              {/* Primary Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: config.solidBg },
                  pressed && styles.buttonPressed,
                  secondaryButtonText && styles.halfWidth,
                ]}
                onPress={handlePrimaryPress}
              >
                <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
              </Pressable>
            </View>
          )}

          {/* Loading progress indicator */}
          {type === 'loading' && (
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dotAnim1]} />
              <View style={[styles.dot, styles.dotAnim2]} />
              <View style={[styles.dot, styles.dotAnim3]} />
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(6),
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: wp(6),
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  iconWrapper: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    marginTop: hp(1),
  },
  iconContainer: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  iconText: {
    fontSize: wp(11),
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  title: {
    fontSize: wp(6),
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: hp(1),
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: wp(3.8),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: hp(2.8),
    marginBottom: hp(2),
    paddingHorizontal: wp(2),
  },
  // ✅ NEW: Custom content area styling
  customContent: {
    width: '100%',
    marginBottom: hp(2),
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
    gap: wp(3),
  },
  button: {
    flex: 1,
    paddingVertical: hp(2),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  halfWidth: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#2F6FDB',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: wp(4),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: wp(4),
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  loadingDots: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1),
  },
  dot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#6366F1',
  },
  dotAnim1: {
    opacity: 0.4,
  },
  dotAnim2: {
    opacity: 0.7,
  },
  dotAnim3: {
    opacity: 1,
  },
});

export default CustomModal;