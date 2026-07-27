import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';

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
    const inAdmin = firstSegment === '(admin)';
    
    const inPublic = firstSegment === '' || firstSegment === 'login' || firstSegment === 'index';
    const inAuthedNonTabs = firstSegment === 'schedule';

    const role = user?.role;

    if (!isAuthenticated) {
      if (!inPublic) {
        router.replace('/login');
      }
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
      return;
    }

    if (role === 'admin' || role === 'super-admin') {
      if (inTabs || inManager) {
        router.replace('/(admin)/home');
      }
      return;
    }

    if (role === 'manager') {
      if (inTabs || inAdmin || inAuthedNonTabs) {
        router.replace('/(manager)/home');
      }
      return;
    }

    if (role === 'employee' || !role) {
      if (inAdmin || inManager) {
        router.replace('/(tabs)/home');
      }
      return;
    }

  }, [isAuthenticated, isLoading, segments, user?.role, router]);

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
  const { uiTheme } = useTheme();

  return (
    <Stack 
      key={uiTheme.theme}
      screenOptions={{ 
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: uiTheme.panelColors.dashboardBackground }
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
            <ThemeProvider>
              <SidebarProvider>
                <AuthGate>
                  <RootLayoutNav />
                </AuthGate>
              </SidebarProvider>
            </ThemeProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}