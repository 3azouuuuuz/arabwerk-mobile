import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { hp, wp } from '../helpers/common';

interface ClientHeaderProps {
  onNotificationPress?: () => void;
}

export default function ClientHeader({ onNotificationPress }: ClientHeaderProps) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    }
    router.push('/(client)/notifications');
  };

  return (
    <View style={styles.container}>
      {/* أيقونة الإشعارات */}
      <Pressable
        style={({ pressed }) => [
          styles.notificationButton,
          pressed && styles.notificationButtonPressed
        ]}
        onPress={handleNotificationPress}
      >
        <FontAwesome name="bell-o" size={wp(5.5)} color="#1F2937" />

        {/* شارة الإشعارات - تظهر عند وجود إشعارات غير مقروءة */}
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      {/* قسم الشعار والنص */}
      <View style={styles.logoSection}>
        {/* محتوى النص */}
        <View style={styles.textContent}>
          <Text style={styles.title}>ArabWerk</Text>
          <Text style={styles.subtitle}>ابحث عن محترفين مهرة</Text>
        </View>
        {/* شعار التطبيق */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: wp(6),
    paddingTop: hp(6),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  textContent: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: wp(4.5),
    fontWeight: '700',
    color: '#000',
    marginBottom: hp(0.2),
  },
  subtitle: {
    fontSize: wp(3),
    color: '#6B7280',
  },
  logoContainer: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '75%',
    height: '75%',
  },
  notificationButton: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  notificationButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  badge: {
    position: 'absolute',
    top: wp(1),
    right: wp(1),
    minWidth: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(1),
  },
  badgeText: {
    fontSize: wp(2.5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});