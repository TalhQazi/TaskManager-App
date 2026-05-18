import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Menu, ChevronLeft, User } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { apiRequest } from '@/services/api';

interface HeaderSettings {
  backgroundType: 'color' | 'image';
  colorConfig?: { from: string; via: string; to: string };
  imageConfig?: { dataUrl: string; size: string; position: string };
  overlay?: { enabled: boolean; color: string };
  height: number;
}

interface HeaderProps {
  showBackButton?: boolean; 
  title?: string;
  onBackPress?: () => void;
}

export default function Header({ showBackButton, title, onBackPress }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { openSidebar } = useSidebar();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // Fetch header settings from admin panel
  const { data: headerSettings, isLoading: settingsLoading } = useQuery<HeaderSettings>({
    queryKey: ['header-settings'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ item: HeaderSettings }>('/header-settings');
        return res.data?.item || {
          backgroundType: 'color',
          colorConfig: { from: '#133767', via: '#133767', to: '#133767' },
          height: 144,
        };
      } catch {
        return {
          backgroundType: 'color',
          colorConfig: { from: '#133767', via: '#133767', to: '#133767' },
          height: 144,
        };
      }
    },
  });

  const headerHeight = headerSettings?.height || 144;
  const hasImageBackground = headerSettings?.backgroundType === 'image' && headerSettings.imageConfig?.dataUrl;

  const getPageTitle = () => {
    if (title) return title;
    if (pathname.includes('/home')) return 'Dashboard';
    if (pathname.includes('/tasks')) return 'My Tasks';
    if (pathname.includes('/clock')) return 'Clock In';
    if (pathname.includes('/messages')) return 'Messages';
    if (pathname.includes('/schedule')) return 'Schedule';
    if (pathname.includes('/profile')) return 'Profile';
    if (pathname.includes('/notifications')) return 'Notifications';
    return 'TaskFlow';
  };

  const handleNotificationPress = () => {
     console.log("CLICKED");
    router.push('/notifications' as any);
  };

  const handleProfilePress = () => {
    router.push('/(tabs)/profile' as any);
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  // Get user initials
  const fullName = user?.fullName || 'Employee';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'E';

  // Background gradient style
  const gradientStyle = hasImageBackground ? null : {
    backgroundColor: headerSettings?.colorConfig?.from || '#133767',
  };

  const headerContent = (
    <View style={styles.contentWrapper}>
      {/* Left - Menu Button + Logo */}
      <View style={styles.leftSection}>
        {!showBackButton && !isLargeScreen ? (
          <TouchableOpacity
            onPress={openSidebar}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <Menu color="#FFFFFF" size={24} />
          </TouchableOpacity>
        ) : null}
        {showBackButton ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#FFFFFF" size={24} />
          </TouchableOpacity>
        ) : null}
        
        {/* Logo */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Center - Title (only on mobile or when no logo space) */}
      <View style={styles.centerSection}>
        <Text style={styles.pageTitle}>{getPageTitle()}</Text>
      </View>

      {/* Right - Notifications + Profile */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          onPress={handleNotificationPress}
          style={styles.iconButton}
          activeOpacity={0.7}
        >
          <Bell color="#FFFFFF" size={22} />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>2</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleProfilePress}
          style={styles.avatarButton}
          activeOpacity={0.7}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (settingsLoading) {
    return (
      <View style={[styles.headerLoading, { paddingTop: insets.top, height: headerHeight + insets.top }]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View style={[
      styles.header,
      { height: headerHeight + insets.top, paddingTop: insets.top },
      gradientStyle,
    ]}>
      {hasImageBackground ? (
        <ImageBackground
          source={{ uri: headerSettings?.imageConfig?.dataUrl }}
          style={styles.backgroundImage}
          resizeMode={headerSettings?.imageConfig?.size === 'contain' ? 'contain' : 'cover'}
        >
          {headerSettings?.overlay?.enabled && (
            <View style={[styles.overlay, { backgroundColor: headerSettings.overlay.color || 'rgba(0,0,0,0.3)' }]} />
          )}
          {headerContent}
        </ImageBackground>
      ) : (
        headerContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: '#133767',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerLoading: {
    width: '100%',
    backgroundColor: '#133767',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
