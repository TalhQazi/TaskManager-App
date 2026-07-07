import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, BackHandler, ActivityIndicator, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack } from 'expo-router';

export default function WebViewNavigationScreen() {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [pageTitle, setPageTitle] = useState('Loading...');

  // 1. Handle Android Hardware Back Button
useEffect(() => {
  const onBackPress = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
      return true; // Prevents the app from closing
    }
    return false; // Lets Expo Router handle standard stack navigation back
  };

  // 1. Capture the subscription
  const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
  
  // 2. Clean it up using .remove()
  return () => subscription.remove();
}, [canGoBack]);

  return (
    <View style={styles.container}>
      {/* 2. Sync Website State with Native Header */}
      <Stack.Screen 
        options={{
          title: pageTitle,
          headerLeft: canGoBack 
            ? () => (
                <TouchableOpacity onPress={() => webViewRef.current?.goBack()} style={styles.backButton}>
                  <Text style={styles.backText}>‹ Back</Text>
                </TouchableOpacity>
              )
            : undefined, // Hides custom back button if at web root route
        }}
      />

      {/* 3. The Interactive WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://task.se7eninc.com' }} // Swap with your web application URL
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          if (navState.title && navState.title !== 'about:blank') {
            setPageTitle(navState.title);
          }
        }}
        // Native loading placeholder to prevent the "white flash" screen
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  backButton: {
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
    color: '#007AFF',
  },
});