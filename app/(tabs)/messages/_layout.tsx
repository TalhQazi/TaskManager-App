import { Stack } from 'expo-router';
import React from 'react';
import Colors from '@/constants/colors';

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.primary,
        headerTitleStyle: { fontWeight: '600', color: Colors.text },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[conversationId]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
