import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname, router } from 'expo-router';
import { Bell } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';

// Header Settings Interface
interface HeaderSettings {
  backgroundType: 'color' | 'image';
  colorConfig: {
    from: string;
    via: string;
    to: string;
  };
  imageConfig: {
    url: string;
    dataUrl: string;
    repeat: string;
    size: string;
    position: string;
  };
  height: number;
  overlay: {
    enabled: boolean;
    color: string;
  };
}

export default function ManagerHeader() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { user } = useAuth();

  // Fetch header settings from admin panel
  const { data: headerSettings } = useQuery<HeaderSettings>({
    queryKey: ['managerHeaderSettings'],
    queryFn: async () => {
      const res = await apiRequest<{ item: HeaderSettings }>('/header-settings');
     // console.log('Fetched header settings:', res.data);
      return res.data?.item;
    },
  });

  const title = useMemo(() => {
    if (pathname.includes('/tasks')) return 'Tasks';
    if (pathname.includes('/team')) return 'Team';
    if (pathname.includes('/vehicles')) return 'Vehicles';
    if (pathname.includes('/appliances')) return 'Appliances';
    if (pathname.includes('/schedule')) return 'Schedule';
    if (pathname.includes('/time-tracking')) return 'Time Tracking';
    if (pathname.includes('/messages')) return 'Messages';
    if (pathname.includes('/notifications')) return 'Notifications';
    if (pathname.includes('/profile')) return 'Profile';
    return 'Manager Dashboard';
  }, [pathname]);

  const initials = (user?.fullName || user?.email || 'M')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Get background colors from settings or use defaults
  const getBackgroundColors = (): [string, string, string] => {
    if (headerSettings?.backgroundType === 'color' && headerSettings?.colorConfig) {
      const { from, via, to } = headerSettings.colorConfig;
      return [from || Colors.primary, via || Colors.primary, to || Colors.primaryDark || Colors.primary];
    }
    return [Colors.primary, Colors.primary, Colors.primaryDark || Colors.primary];
  };


  const { data: userSettings } = useQuery({
  queryKey: ['userSettings'],
  queryFn: async () => {
    const res = await apiRequest('/settings'); 
    
    return res.data;
  },
});

const avatarUrlRaw =
  userSettings?.item?.avatarDataUrl || 
  userSettings?.item?.avatarUrl ||
  userSettings?.item?.avatar ||
  null;


const avatarUrl = avatarUrlRaw
  ? avatarUrlRaw.startsWith('http')
    ? avatarUrlRaw
    : `https://task.se7eninc.com${avatarUrlRaw}`
  : null;

  const backgroundColors = getBackgroundColors();
  const hasImageBackground = headerSettings?.backgroundType === 'image' && headerSettings?.imageConfig?.dataUrl;
  const headerHeight = headerSettings?.height || 72;


  console.log("Final Avatar URL =>", avatarUrl);

  return (
    <View style={[styles.header, { paddingTop: insets.top, height: headerHeight + insets.top }]}>
      {hasImageBackground ? (
        <>
          <Image
            source={{ uri: headerSettings?.imageConfig?.dataUrl }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
          {headerSettings?.overlay?.enabled && (
            <View style={[styles.overlay, { backgroundColor: headerSettings?.overlay?.color || 'rgba(0,0,0,0.3)' }]} />
          )}
        </>
      ) : (
        <LinearGradient
          colors={backgroundColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBackground}
        />
      )}
      
      <View style={[styles.content, { /*height: headerHeight*/paddingBottom: 10 }]}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.right}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/(manager)/notifications' as any)}
            activeOpacity={0.75}
          >
            <Bell color="#FFFFFF" size={20} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(manager)/profile' as any)}
            activeOpacity={0.75}
          >
            {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    justifyContent: 'flex-end',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: 20,
   resizeMode: 'cover',
},
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
   // height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 10,
   
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
