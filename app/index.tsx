import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
//import { registerForPushNotificationsAsync } from '@/util/registerForPushNotifications';
import { useEffect } from 'react';
import { API_BASE_URL } from '@/services/api';


 
export default function AppIndex() {
  const { isAuthenticated, isLoading ,token} = useAuth();


useEffect(() => {
    const savePushToken = async () => {
      try {
        const pushToken = await registerForPushNotificationsAsync();

        if (!pushToken || !token) return;

        const res = await fetch(`${API_BASE_URL}/me/push-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // ✅ correct
          },
          body: JSON.stringify({ pushToken }),
        });

        const data = await res.json();

        console.log("Push token saved:", data);
      } catch (error) {
        console.log("Error saving push token:", error);
      }
    };

    if (isAuthenticated) {
     // savePushToken();
    }
  }, [isAuthenticated]);


  const savePushToken = async (pushToken: string) => {
  try {
    const res = await fetch(`${API_BASE_URL}/me/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, 
      },
      body: JSON.stringify({ pushToken }),
    });

    const data = await res.json();

    console.log("Push token saved:", data);
  } catch (err) {
    console.log("Error saving push token:", err);
  }
};

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href={'/(tabs)/home' as any} />;
  }

  return <Redirect href={'/login' as any} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
});
