import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { Toaster } from '@/components/Toaster';
import { RewardProvider } from '@/contexts/RewardContext';
import { TaskBlasterProvider } from '@/contexts/TaskBlasterContext';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname(); 
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
   if (isLoading || !rootNavigationState?.key) return;

    if (segments.length === 0 && pathname !== '/' && pathname !== '/login') {
      return;
    }

    console.log("[DEBUG] Current Pathname:", pathname);
    console.log("[DEBUG] Segments:", segments);
    console.log("[DEBUG] Role:", user?.role);

    const firstSegment = String(segments?.[0] ?? '');
    
  
    const inTabs = firstSegment === '(tabs)';
    const inManager = firstSegment === '(manager)' || pathname.startsWith('/(manager)');
    const inAdmin = firstSegment === '(admin)' || pathname.startsWith('/(admin)');
    
    const inPublic = firstSegment === '' || firstSegment === 'login' || firstSegment === 'index' || pathname === '/' || pathname === '/login';
    const isGlobalRoute = firstSegment === 'notifications' || firstSegment === 'schedule' || pathname.includes('/notifications') || pathname.includes('/schedule');

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
      if (!inAdmin && !isGlobalRoute) {
        router.replace('/(admin)/home');
      }
      return;
    }

    if (role === 'manager') {
      if (!inManager && !isGlobalRoute) {
        router.replace('/(manager)/home');
      }
      return;
    }

    if (role === 'employee' || !role) {
      if (!inTabs && !isGlobalRoute) {
        router.replace('/(tabs)/home');
      }
      return;
    }

  }, [isAuthenticated, isLoading, segments, user?.role, router, rootNavigationState?.key, pathname]);

  useEffect(() => {
    if (!isLoading && rootNavigationState?.key) {
      SplashScreen.hideAsync().catch((err) => {
        console.log('[SplashScreen] Safe ignore on hide race condition:', err);
      });
    }
  }, [isLoading, rootNavigationState?.key]);

  return <>{children}</>;
}

function RootLayoutNav_() {
  const { uiTheme } = useTheme();

  return (
    <Stack 
      key={uiTheme?.theme}
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
              <SidebarProvider>
                <AuthGate>
                  <RootLayoutNav />
                  <Toaster/>
                </AuthGate>
              </SidebarProvider>
            </ThemeProvider>
            </TaskBlasterProvider>
            </RewardProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SafeAreaProvider> 
  );
}