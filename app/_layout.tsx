import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = String(segments?.[0] ?? '');
    const inTabs = firstSegment === '(tabs)';
    const inManager = firstSegment === '(manager)';
    const inPublic = firstSegment === '' || firstSegment === 'login';
    const inAuthedNonTabs = firstSegment === 'schedule';
    const isNotifications = firstSegment === 'notifications';

    const role = user?.role;

    if (isAuthenticated && inPublic) {
      console.log('[AuthGate] Authenticated, redirecting to home');
      router.replace((role === 'manager' ? '/(manager)/home' : '/(tabs)/home') as any);
      return;
    }

    

    if (isAuthenticated && role === 'manager' && (inTabs || (inAuthedNonTabs && !isNotifications))) {
      router.replace('/(manager)/home' as any);
      return;
    }

    if (isAuthenticated && role === 'employee' && inManager) {
      router.replace('/(tabs)/home' as any);
      return;
    }

    if (!isAuthenticated && (inTabs || inAuthedNonTabs || inManager)) {
      console.log('[AuthGate] Not authenticated, redirecting to login');
      router.replace('/login' as any);
    }
  }, [isAuthenticated, isLoading, segments, user?.role, router]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(manager)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="schedule" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <SidebarProvider>
              <AuthGate>
                <RootLayoutNav />
              </AuthGate>
            </SidebarProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
