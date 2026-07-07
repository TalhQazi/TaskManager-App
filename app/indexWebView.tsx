import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, StyleSheet, BackHandler, Image, ActivityIndicator } from 'react-native';
import Colors from '@/constants/colors';
import { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/services/api';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import your logo file
import AppLogo from '../assets/images/splash-icon.png'; 

const TARGET_URL = 'https://task.se7eninc.com/';

export default function AppIndex() {
  const { token } = useAuth(); 
  const insets = useSafeAreaInsets();
  
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // 1. Handle Native Android Back Button / System Swipe Gesture
  useEffect(() => {
    const onBackPress = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true; // Keeps the app open and goes back in web history
      }
      return false; // Exits the app if at the web homepage
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  // Optional: Push notification registration side-effect
  useEffect(() => {
    const savePushTokenAsync = async () => {
      try {
        // const pushToken = await registerForPushNotificationsAsync();
        // if (!pushToken || !token) return;
        // await savePushToken(pushToken);
      } catch (error) {
        console.log("Error saving push token:", error);
      }
    };
    savePushTokenAsync();
  }, [token]);

  return (
    <View 
      style={[
        styles.container, 
        { 
          // 2. Setting proper safe area insets to prevent status bar/notch overlap
          paddingTop: insets.top, 
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right 
        }
      ]}
    >
      {/* Hide the native header layout completely */}
      <Stack.Screen options={{ headerShown: false }} />

      <WebView
        ref={webViewRef}
        source={{ 
          uri: TARGET_URL,
          headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
        }}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
        }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.webViewLoader}>
            <Image 
              source={AppLogo} 
              style={styles.loadingLogo} 
              resizeMode="contain" 
            />
            <ActivityIndicator size="small" color={Colors.primary || '#007AFF'} style={{ marginTop: 20 }} />
          </View>
        )}
        // 3. Enable native iOS edge-swipe navigation gestures (Swipe left to go back)
        allowsBackForwardNavigationGestures={true}
        allowsInlineMediaPlayback={true}
        domStorageEnabled={true}
        javaScriptEnabled={true}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // Match your website's background color
  },
  webview: {
    flex: 1,
  },
  webViewLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff', 
    zIndex: 99,
  },
  loadingLogo: {
    width: 140,  
    height: 140, 
  },
});