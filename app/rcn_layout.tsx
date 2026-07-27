import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ThemeInitializer } from '@/components/ThemeInitializer';
import { Toaster } from '@/components/Toaster';
import { RewardProvider } from '@/contexts/RewardContext';
import { TaskBlasterProvider } from '@/contexts/TaskBlasterContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate_({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();

  const isAppReady = !isAuthLoading && !!rootNavigationState?.key;

  useEffect(() => {
    if (!isAppReady) return;

    const firstSegment = String(segments?.[0] ?? '');
    const inPublic = firstSegment === '' || firstSegment === 'login' || firstSegment === 'index' || pathname === '/' || pathname === '/login';

    const role = user?.role;

    if (!isAuthenticated) {
      if (!inPublic) router.replace('/login');
      return;
    }

    if (inPublic) {
      if (role === 'admin' || role === 'super-admin') {
        router.replace('/(admin)/home');
      } else if (role === 'manager') {
        router.replace('/(manager)/home');
      } else {
        router.replace('/(tabs)/home');
      }
    }
  }, [isAuthenticated, isAppReady, segments, user?.role, router, pathname]);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [isAppReady]);

  return <>{children}</>;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();

  const isAppReady = !isAuthLoading && !!rootNavigationState?.key;

  useEffect(() => {
    if (!isAppReady) return;

    const firstSegment = String(segments?.[0] ?? '');
    const inPublic = firstSegment === '' || firstSegment === 'login' || firstSegment === 'index' || pathname === '/' || pathname === '/login';

    const role = user?.role;

    if (!isAuthenticated) {
      if (!inPublic) router.replace('/login');
      return;
    }

    // FIX: Pause routing decisions if authenticated but the user profile role has not hydrated yet
    if (isAuthenticated && !role) return;

    if (inPublic) {
      if (role === 'admin' || role === 'super-admin') {
        router.replace('/(admin)/home');
      } else if (role === 'manager') {
        router.replace('/(manager)/home');
      } else {
        router.replace('/(tabs)/home');
      }
      return;
    }

    // EXTRA SAFEGUARD: Cross-stack protection rules if a user manually lands in the wrong workspace folder
    if (role === 'manager' && (firstSegment === '(tabs)' || firstSegment === '(admin)')) {
      router.replace('/(manager)/home');
    } else if ((role === 'admin' || role === 'super-admin') && (firstSegment === '(tabs)' || firstSegment === '(manager)')) {
      router.replace('/(admin)/home');
    } else if (role === 'employee' && (firstSegment === '(manager)' || firstSegment === '(admin)')) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isAppReady, segments, user?.role, router, pathname]);

  useEffect(() => {
    if (isAppReady) {
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [isAppReady]);

  return <>{children}</>;
}

function RootLayoutNav() {
  const { uiTheme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: uiTheme?.panelColors?.dashboardBackground || '#f8fafc' }
      }}
    >
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
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <RewardProvider>
              <TaskBlasterProvider>
                <ThemeProvider>
                  <ThemeInitializer>
                    <SidebarProvider>
                      <AuthGate>
                        <RootLayoutNav />
                        <Toaster />
                      </AuthGate>
                    </SidebarProvider>
                  </ThemeInitializer>
                </ThemeProvider>
              </TaskBlasterProvider>
            </RewardProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}