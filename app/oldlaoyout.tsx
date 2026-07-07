import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ThemeProvider } from '@/lib/theme';

// Prevent the splash screen from auto-hiding before asset/session loading completes
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // 1. CRITICAL: Halt all routing evaluation while AsyncStorage or /auth/me is loading
    if (isLoading) return;

    const firstSegment = String(segments?.[0] ?? '');
    const inTabs = firstSegment === '(tabs)';
    const inManager = firstSegment === '(manager)';
    const inAdmin = firstSegment === '(admin)';
    
    // Explicitly check for index (root), login layout, or an empty string segment
    const inPublic = firstSegment === '' || firstSegment === 'login' || firstSegment === 'index';
    const inAuthedNonTabs = firstSegment === 'schedule';

    const role = user?.role;

    // 2. UN-AUTHENTICATED GUARD: Handle logout instantly without down-falling execution
    if (!isAuthenticated) {
      if (!inPublic) {
        console.log('[AuthGate] Protected segment accessed anonymously. Redirecting to login.');
        router.replace('/login');
      }
      return; 
    }

    // 3. AUTHENTICATED PUBLIC GUARD: Route to the correct home screen based on active role profile
    if (inPublic) {
      console.log(`[AuthGate] Authenticated session active [Role: ${role}]. Mapping to target home.`);
      if (role === 'admin' || role === 'super-admin') {
        router.replace('/(admin)/home');
      } else if (role === 'manager') {
        router.replace('/(manager)/home');
      } else {
        router.replace('/(tabs)/home');
      }
      return;
    }

    // 4. ADMIN BOUNDARY GUARD: Keep out of Employee or Manager view scopes
    if (role === 'admin' || role === 'super-admin') {
      if (inTabs || inManager) {
        console.log('[AuthGate] Admin drifted into alternate layout. Normalizing route placement.');
        router.replace('/(admin)/home');
      }
      return;
    }

    // 5. MANAGER BOUNDARY GUARD: Lock managers to their specific dashboard environment
   if (role === 'manager') {
  // Removed the redundant clean check since 'schedule' is already never 'notifications'
  if (inTabs || inAdmin || inAuthedNonTabs) {
    console.log('[AuthGate] Manager drifted into alternate layout. Normalizing route placement.');
    router.replace('/(manager)/home');
  }
  return;
}

    // 6. EMPLOYEE BOUNDARY GUARD: Restrict general staff from management frameworks
    if (role === 'employee' || !role) {
      if (inAdmin || inManager) {
        console.log('[AuthGate] Employee restricted from management directories. Re-routing.');
        router.replace('/(tabs)/home');
      }
      return;
    }

  }, [isAuthenticated, isLoading, segments, user?.role, router]);

  // Handle the system Splash Screen dismissal cleanly once state evaluation is settled
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch((err) => {
        console.log('[SplashScreen] Safe ignore on hide race condition:', err);
      });
    }
  }, [isLoading]);

  return <>{children}</>;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(manager)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="schedule" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
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
      </ThemeProvider>
    </SafeAreaProvider>
  );
}