import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, StyleSheet, ToastAndroid, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ClientTabsLayout() {
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
        tabBarItemStyle: { paddingVertical: 5 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <FontAwesome name="home" size={30} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <FontAwesome name="search" size={30} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="new-post"
        options={{
          title: 'New Post',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <FontAwesome name="plus-circle" size={30} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="conversations"
        options={{
          title: 'Conversations',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <FontAwesome name="comment-o" size={30} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
              <FontAwesome name="user-o" size={30} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 50, height: 40, justifyContent: 'center',
    alignItems: 'center', borderRadius: 12, marginTop: -8,
  },
  activeIconContainer: { backgroundColor: '#EEF5FF', marginTop: -5 },
});