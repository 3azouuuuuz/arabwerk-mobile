import { Stack } from 'expo-router';

export default function ClientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="all-requests" />
      <Stack.Screen name="request-details" />
      <Stack.Screen
        name="edit-request"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />

      {/* ── Chat ── */}
      <Stack.Screen
        name="chat"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />

      {/* Settings Screens */}
      <Stack.Screen
        name="account-info"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="my-services"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="change-password"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}