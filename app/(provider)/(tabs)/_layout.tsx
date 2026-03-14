import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, StyleSheet, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProviderTabsLayout() {
  const insets = useSafeAreaInsets();
  const backPressCount = useRef(0);
  const backPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBackPress = useCallback(() => {
    backPressCount.current += 1;

    if (backPressCount.current === 1) {
      backPressTimer.current = setTimeout(() => {
        backPressCount.current = 0;
      }, 2000);
      return true;
    }

    if (backPressCount.current === 2) {
      ToastAndroid.show('اضغط مرة أخرى للخروج', ToastAndroid.SHORT);
      return true;
    }

    if (backPressTimer.current) clearTimeout(backPressTimer.current);
    backPressCount.current = 0;
    BackHandler.exitApp();
    return true;
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      subscription.remove();
      if (backPressTimer.current) clearTimeout(backPressTimer.current);
    };
  }, [handleBackPress]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2F6FDB',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: 70 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'لوحة التحكم',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons name="home-outline" size={29} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'الرسائل',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons name="chatbubbles-outline" size={29} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'الطلبات',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons name="clipboard-outline" size={29} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'الملف الشخصي',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <Ionicons name="person-outline" size={29} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 50,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: -8,
  },
  activeIconContainer: {
    backgroundColor: '#EEF5FF',
    marginTop: -5,
  },
});