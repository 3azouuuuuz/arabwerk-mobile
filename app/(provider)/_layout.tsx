import { Stack } from 'expo-router';

export default function ProviderLayout() {
  return (
    <Stack screenOptions={{ gestureEnabled: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="provider-setup"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="choose-subscription"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: false, animation: 'slide_from_right' }}
      />
      {/* ── New: upgrade from profile (has back button) ── */}
      <Stack.Screen
        name="upgrade-subscription"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="account-info"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="change-password"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="manage-subscription"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="delete-account"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="request-details"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="chat"
        options={{ headerShown: false, presentation: 'card', gestureEnabled: true, animation: 'slide_from_right' }}
      />
    </Stack>
  );
}