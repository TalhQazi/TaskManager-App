import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Menu,
  ChevronLeft,
  LogOut,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSocket } from '@/contexts/SocketContext';
import { apiRequest } from '@/services/api';
import { toProxiedUrl, initToken } from '@/util/toProxiedUrl';
import { s, wp, hp, fs } from '@/util/styles';

interface HeaderSettings {
  _id?: string;
  backgroundType: 'color' | 'image';
  colorConfig?: {
    from: string;
    via: string;
    to: string;
  };
  imageConfig?: {
    url?: string;
    dataUrl?: string;
    repeat?: string;
    size?: string;
    position?: string;
  };
  overlay?: {
    enabled: boolean;
    color: string;
  };
  height: number;
}

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
  onBackPress?: () => void;
}

/**
 * Bulletproof Image URL converter
 * Transforms `/uploads/headers/xxx.jpg` -> `https://task.se7eninc.com/api/s3-proxy/headers/xxx.jpg?token=...`
 */
const getDisplayImageUrl = (rawPath?: string | null, activeToken?: string | null) => {
  if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) return null;

  // 1. Return inline data/file URIs directly
  if (
    rawPath.startsWith('data:') ||
    rawPath.startsWith('file://') ||
    rawPath.startsWith('content://')
  ) {
    return rawPath;
  }

  let path = rawPath.trim();

  // 2. If token is already attached, return immediately
  if (path.includes('token=')) return path;

  // 3. Normalize path: Map `/uploads/` or `uploads/` -> `/api/s3-proxy/`
  if (path.startsWith('/uploads/')) {
    path = path.replace('/uploads/', '/api/s3-proxy/');
  } else if (path.startsWith('uploads/')) {
    path = path.replace('uploads/', '/api/s3-proxy/');
  } else if (!path.startsWith('/api/s3-proxy/') && !path.startsWith('http')) {
    path = `/api/s3-proxy/${path.replace(/^\//, '')}`;
  }

  // 4. Construct absolute URL
  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    path = `https://task.se7eninc.com${path.startsWith('/') ? path : `/${path}`}`;
  }

  // 5. Try toProxiedUrl on the fully constructed absolute URL
  try {
    const proxied = toProxiedUrl(path);
    if (proxied && proxied.includes('token=')) {
      return proxied;
    }
  } catch (e) {
    // Fall back to manual injection
  }

  // 6. Manual token fallback injection
  if (activeToken) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}token=${activeToken}`;
  }

  return path;
};

export default function Header({
  showBackButton,
  title,
  onBackPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { user, logout } = useAuth();
  const { openSidebar } = useSidebar();
  const { socket } = useSocket();
  const { width } = useWindowDimensions();

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [bgLoadError, setBgLoadError] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);

  const isLargeScreen = width >= 768;
  const userEmail = user?.email || user?.username || '';
  const userName = user?.name || userEmail;

  // Dynamically load JWT token
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await initToken();

        let token =
          (user as any)?.token ||
          (user as any)?.accessToken ||
          (user as any)?.jwt ||
          (user as any)?.user?.token;

        if (!token) {
          const keys = await AsyncStorage.getAllKeys();
          const possibleTokenKeys = keys.filter((k) =>
            /token|jwt|auth|session/i.test(k)
          );

          for (const key of possibleTokenKeys) {
            const val = await AsyncStorage.getItem(key);
            if (val && typeof val === 'string' && val.length > 10) {
              token = val;
              break;
            }
          }
        }

        if (isMounted && token) {
          setJwtToken(token);
        }
      } catch (err) {
        console.error('Failed to load JWT token:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const {
    data: headerSettings,
    isLoading: settingsLoading,
  } = useQuery<HeaderSettings>({
    queryKey: ['header-settings'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{
          item: HeaderSettings;
        }>('/header-settings');

        return (
          res.data?.item || {
            backgroundType: 'color',
            colorConfig: {
              from: '#133767',
              via: '#133767',
              to: '#133767',
            },
            height: 144,
          }
        );
      } catch {
        return {
          backgroundType: 'color',
          colorConfig: {
            from: '#133767',
            via: '#133767',
            to: '#133767',
          },
          height: 144,
        };
      }
    },
  });

  const { data: userSettings } = useQuery({
    queryKey: ['userSettingsHeader'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ item?: any }>('/settings');
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const { data: queryNotifications } = useQuery<any[]>({
    queryKey: ['managerNotifications'],
    queryFn: async () => {
      try {
        const res = await apiRequest<any>('/api/messages?type=broadcast');
        const rawItems = Array.isArray(res.data) ? res.data : res.data?.items ?? [];

        if (rawItems.length > 0) return rawItems;

        const fallbackRes = await apiRequest<any>('/notifications');
        return fallbackRes.data?.items || fallbackRes.data || [];
      } catch {
        try {
          const fallbackRes = await apiRequest<any>('/notifications');
          return fallbackRes.data?.items || fallbackRes.data || [];
        } catch {
          return [];
        }
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (queryNotifications) {
      setLocalNotifications(queryNotifications);
    }
  }, [queryNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: any) => {
      const recipient = data.recipient || '';
      const isForMe =
        recipient.includes(userEmail) ||
        recipient.includes(userName) ||
        data.audience === 'all';
      if (!isForMe) return;

      setLocalNotifications((prev) => {
        const itemExists = prev.some(
          (n) => (n.id || n._id) === (data.id || data._id)
        );
        if (itemExists) return prev;
        return [data, ...prev];
      });
    };

    socket.on('new-notification', handleNotification);
    return () => {
      socket.off('new-notification', handleNotification);
    };
  }, [socket, userEmail, userName]);

  // Background Image Resolution
  const rawBgImage =
    headerSettings?.imageConfig?.url ||
    headerSettings?.imageConfig?.dataUrl ||
    null;

  const bgImageUri = useMemo(() => {
    return getDisplayImageUrl(rawBgImage, jwtToken);
  }, [rawBgImage, jwtToken]);

  const hasImageBackground =
    headerSettings?.backgroundType === 'image' && !!bgImageUri && !bgLoadError;

  // Avatar Image Resolution
  const avatarRaw =
    userSettings?.item?.avatarDataUrl ||
    userSettings?.item?.avatarUrl ||
    (user as any)?.avatarUrl ||
    null;

  const resolvedAvatarUri = useMemo(() => {
    return getDisplayImageUrl(avatarRaw, jwtToken);
  }, [avatarRaw, jwtToken]);

  useEffect(() => {
    setBgLoadError(false);
  }, [bgImageUri]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [resolvedAvatarUri]);

  const unreadNotifications = useMemo(() => {
    return localNotifications.filter((n) => {
      const recipient = n.recipient || '';
      const isForMe =
        recipient.includes(userEmail) ||
        recipient.includes(userName) ||
        n.audience === 'all';
      if (!isForMe) return false;

      const readByList = Array.isArray(n.readBy) ? n.readBy : [];
      const isReadByMe = readByList.some((item: any) => {
        if (typeof item === 'string') {
          return item === userName || item === userEmail;
        }
        return (
          item?.username === userName ||
          item?.email === userEmail ||
          item?.name === userName
        );
      });

      const isRead =
        n.status === 'read' ||
        n.read === true ||
        n.isRead === true ||
        Boolean(n.readAt) ||
        isReadByMe;

      return !isRead;
    });
  }, [localNotifications, userEmail, userName]);

  const unreadCount = unreadNotifications.length;
  const rawHeaderHeight = headerSettings?.height || 144;
  const scaledHeaderHeight = hp((rawHeaderHeight / 812) * 100);

  const handleNotificationPress = () => {
    router.push('/notifications' as any);
  };

  const handleProfilePress = () => {
    const role = user?.role;
    if (role === 'admin' || role === 'super-admin') {
      router.push('/(admin)/profile' as any);
    } else if (role === 'manager') {
      router.push('/(manager)/profile' as any);
    } else {
      router.push('/(tabs)/profile' as any);
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  const handleLogoutPress = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    if (logout) {
      await logout();
    }
  };

  const fullName = user?.fullName || 'Employee';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const backgroundColor = headerSettings?.colorConfig?.from || '#133767';

  const headerContent = (
    <View style={s(styles.contentWrapper)}>
      <View style={s(styles.leftSection)}>
        {!showBackButton && !isLargeScreen ? (
          <TouchableOpacity
            onPress={openSidebar}
            style={s(styles.menuButton)}
            activeOpacity={0.7}
          >
            <Menu color="#FFFFFF" size={fs(5.5)} />
          </TouchableOpacity>
        ) : null}

        {showBackButton ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={s(styles.menuButton)}
            activeOpacity={0.7}
          >
            <ChevronLeft color="#FFFFFF" size={fs(5.5)} />
          </TouchableOpacity>
        ) : null}

        <Image
          source={require('@/assets/images/icon.png')}
          style={s(styles.logo)}
          resizeMode="contain"
        />
      </View>

      <View style={s(styles.centerSection)}>
        <Text style={s(styles.pageTitle)} numberOfLines={1}>
          {title || ''}
        </Text>
      </View>

      <View style={s(styles.rightSection)}>
        <TouchableOpacity
          onPress={handleNotificationPress}
          style={s(styles.iconButton)}
          activeOpacity={0.7}
        >
          <Bell color="#FFFFFF" size={fs(5)} />
          {unreadCount > 0 && (
            <View style={s(styles.notificationBadge)}>
              <Text style={s(styles.badgeText)}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleProfilePress}
          style={s(styles.avatarButton)}
          activeOpacity={0.7}
        >
          <View style={s(styles.avatar)}>
            {resolvedAvatarUri && !avatarLoadError ? (
              <Image
                source={{ uri: resolvedAvatarUri }}
                style={s(styles.avatarAsset)}
                resizeMode="cover"
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <Text style={s(styles.avatarText)}>{initials}</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogoutPress}
          style={s(styles.iconButton)}
          activeOpacity={0.7}
        >
          <LogOut color="#FFFFFF" size={fs(4.8)} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (settingsLoading) {
    return (
      <View
        style={s([
          styles.headerLoading,
          {
            paddingTop: insets.top,
            height: scaledHeaderHeight + insets.top,
          },
        ])}
      >
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <View
      style={s([
        styles.header,
        {
          height: scaledHeaderHeight + insets.top,
          paddingTop: insets.top,
          backgroundColor: backgroundColor,
        },
      ])}
    >
      {hasImageBackground && bgImageUri ? (
        <Image
          source={{ uri: bgImageUri }}
          style={s(styles.backgroundImage)}
          resizeMode={
            headerSettings?.imageConfig?.size === 'contain'
              ? 'contain'
              : 'cover'
          }
          onError={() => setBgLoadError(true)}
        />
      ) : null}

      {hasImageBackground && headerSettings?.overlay?.enabled && (
        <View
          style={s([
            styles.overlay,
            {
              backgroundColor:
                headerSettings.overlay.color || 'rgba(0,0,0,0.3)',
            },
          ])}
        />
      )}

      {headerContent}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: '#133767',
    position: 'relative',
    overflow: 'hidden',
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
    ...StyleSheet.absoluteFillObject,
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
    paddingHorizontal: wp(4),
    zIndex: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1.2,
  },
  centerSection: {
    flex: 1.6,
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    flex: 1.6,
    justifyContent: 'flex-end',
  },
  menuButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(2),
  },
  pageTitle: {
    fontSize: fs(4.2),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  iconButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(3),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: wp(4.5),
    height: wp(4.5),
    borderRadius: wp(2.25),
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 2,
  },
  badgeText: {
    fontSize: fs(2.5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarButton: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatar: {
    width: wp(9.8),
    height: wp(9.8),
    borderRadius: wp(4.9),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarAsset: {
    width: '100%',
    height: '100%',
    borderRadius: wp(4.9),
  },
  avatarText: {
    fontSize: fs(3.8),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});