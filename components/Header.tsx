import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Menu,
  ChevronLeft,
  LogOut,
  Camera,
  X,
  Palette,
  Check,
  FolderOpen,
  Search,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
import { useSocket } from '@/contexts/SocketContext';
import { apiRequest } from '@/services/api';
import { toProxiedUrl, initToken } from '@/util/toProxiedUrl';
import { wp, hp, fs } from '@/util/styles';

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

interface AssetItem {
  id: string;
  _id?: string;
  originalFilename: string;
  mimeType: string;
  urlOriginal: string;
  sizeBytes?: number;
  attachment?: { url: string; fileName: string };
}

interface FolderItem {
  id: string;
  name: string;
  assetCount?: number;
  children?: FolderItem[];
}

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
  onBackPress?: () => void;
}

/**
 * Bulletproof Image URL converter
 */
const getDisplayImageUrl = (rawPath?: string | null, activeToken?: string | null) => {
  if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) return null;

  if (
    rawPath.startsWith('data:') ||
    rawPath.startsWith('file://') ||
    rawPath.startsWith('content://')
  ) {
    return rawPath;
  }

  let path = rawPath.trim();
  if (path.includes('token=')) return path;

  if (path.startsWith('/uploads/')) {
    path = path.replace('/uploads/', '/api/s3-proxy/');
  } else if (path.startsWith('uploads/')) {
    path = path.replace('uploads/', '/api/s3-proxy/');
  } else if (!path.startsWith('/api/s3-proxy/') && !path.startsWith('http')) {
    path = `/api/s3-proxy/${path.replace(/^\//, '')}`;
  }

  if (!path.startsWith('http://') && !path.startsWith('https://')) {
    path = `https://task.se7eninc.com${path.startsWith('/') ? path : `/${path}`}`;
  }

  try {
    const proxied = toProxiedUrl(path);
    if (proxied && proxied.includes('token=')) {
      return proxied;
    }
  } catch (e) {}

  if (activeToken) {
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}token=${activeToken}`;
  }

  return path;
};

const getVerticalPositionValue = (posStr: string | undefined): number => {
  if (!posStr) return 50;
  if (posStr === 'center') return 50;
  if (posStr === 'top') return 0;
  if (posStr === 'bottom') return 100;
  const match = posStr.match(/(\d+)%/);
  return match ? parseInt(match[1], 10) : 50;
};

/**
 * Pure React Native Custom Range Slider Component
 */
function CustomSlider({
  value,
  onValueChange,
  onSlidingComplete,
}: {
  value: number;
  onValueChange: (val: number) => void;
  onSlidingComplete: (val: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(240);
  const valRef = useRef(value);

  useEffect(() => {
    valRef.current = value;
  }, [value]);

  const handleTouch = (evt: any) => {
    const touchX = evt.nativeEvent.locationX;
    let percentage = Math.round((touchX / trackWidth) * 100);
    percentage = Math.max(0, Math.min(100, percentage));
    valRef.current = percentage;
    onValueChange(percentage);
  };

  const handleTouchRelease = () => {
    onSlidingComplete(valRef.current);
  };

  const currentPercent = Math.max(0, Math.min(100, value));

  return (
    <View
      style={sliderStyles.container}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width || 240)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onResponderRelease={handleTouchRelease}
      onResponderTerminate={handleTouchRelease}
    >
      <View style={sliderStyles.trackBackground}>
        <View style={[sliderStyles.trackActive, { width: `${currentPercent}%` }]} />
        <View style={[sliderStyles.thumb, { left: `${currentPercent}%` }]} />
      </View>
    </View>
  );
}

export default function Header({
  showBackButton,
  title,
  onBackPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { user, logout } = useAuth();
  const { openSidebar } = useSidebar();
  const { socket } = useSocket();
  const { width } = useWindowDimensions();

  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [bgLoadError, setBgLoadError] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);

  // Header customization modal state
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPosition, setLocalPosition] = useState<string>('center 50%');

  // Prevent background query refetch from overwriting user position while editing
  const isEditingPositionRef = useRef(false);

  // Asset Picker States
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string>('');
  const [assetPage, setAssetPage] = useState(1);
  const [totalAssetPages, setTotalAssetPages] = useState(1);

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
        const res = await apiRequest<{ item: HeaderSettings }>('/header-settings');
        return (
          res.data?.item || {
            backgroundType: 'color',
            colorConfig: { from: '#133767', via: '#133767', to: '#133767' },
            height: 220,
          }
        );
      } catch {
        return {
          backgroundType: 'color',
          colorConfig: { from: '#133767', via: '#133767', to: '#133767' },
          height: 220,
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

  // Sync server position ONLY when user is NOT actively editing
  useEffect(() => {
    if (!isEditingPositionRef.current && headerSettings?.imageConfig?.position) {
      setLocalPosition(headerSettings.imageConfig.position);
    }
  }, [headerSettings?.imageConfig?.position]);

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

  // Load Asset Library Folders
  useEffect(() => {
    if (!isAssetPickerOpen) return;
    (async () => {
      try {
        const res = await apiRequest<{ items: FolderItem[] }>('/asset-library/folders?module=asset-library');
        setFolders(res.data?.items || []);
      } catch (e) {
        console.error('Failed to load asset folders:', e);
      }
    })();
  }, [isAssetPickerOpen]);

  // Load Asset Library Items
  useEffect(() => {
    if (!isAssetPickerOpen) return;
    let isMounted = true;
    setLoadingAssets(true);

    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('module', 'asset-library');
        if (selectedFolderId) params.set('folderId', selectedFolderId);
        params.set('type', 'image');
        if (assetSearch.trim()) params.set('q', assetSearch.trim());
        params.set('sort', 'az');
        params.set('limit', '30');
        params.set('page', assetPage.toString());

        const res = await apiRequest<{ items: AssetItem[]; totalPages: number }>(`/asset-library/assets?${params.toString()}`);
        if (isMounted) {
          setAssets(res.data?.items || []);
          setTotalAssetPages(res.data?.totalPages || 1);
        }
      } catch (e) {
        console.error('Failed to load assets:', e);
      } finally {
        if (isMounted) setLoadingAssets(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAssetPickerOpen, selectedFolderId, assetSearch, assetPage]);

  // Background Image Resolution
  const rawBgImage =
    headerSettings?.imageConfig?.url ||
    headerSettings?.imageConfig?.dataUrl ||
    null;

  const bgImageUri = useMemo(() => {
    return getDisplayImageUrl(rawBgImage, jwtToken);
  }, [rawBgImage, jwtToken]);

  // CRITICAL FIX: Memoize source object so React Native doesn't re-decode image during sliding
  const bgImageSource = useMemo(() => {
    return bgImageUri ? { uri: bgImageUri } : null;
  }, [bgImageUri]);

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

  const avatarImageSource = useMemo(() => {
    return resolvedAvatarUri ? { uri: resolvedAvatarUri } : null;
  }, [resolvedAvatarUri]);

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

      return !(
        n.status === 'read' ||
        n.read === true ||
        n.isRead === true ||
        Boolean(n.readAt) ||
        isReadByMe
      );
    });
  }, [localNotifications, userEmail, userName]);

  const unreadCount = unreadNotifications.length;
  const rawHeaderHeight = headerSettings?.height || 220;
  const scaledHeaderHeight = hp((rawHeaderHeight / 812) * 100);
  const totalHeaderHeight = scaledHeaderHeight + insets.top;

  // Real-time vertical positioning calculation
  const currentPosValue = getVerticalPositionValue(localPosition);
  const bgImageHeight = totalHeaderHeight * 1.6;
  const maxShiftOffset = bgImageHeight - totalHeaderHeight;
  const imageTopOffset = -(maxShiftOffset * (currentPosValue / 100));

  // Modal mini preview box dimensions
  const modalPreviewHeight = 120;
  const modalPreviewImageHeight = modalPreviewHeight * 1.6;
  const modalPreviewShift = -( (modalPreviewImageHeight - modalPreviewHeight) * (currentPosValue / 100) );

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

  const handlePickHeaderImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        alert('Permission to access camera roll is required!');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: true,
      });

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
        setUploading(true);
        const asset = pickerResult.assets[0];
        let base64String = asset.base64;

        if (!base64String && asset.uri) {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          base64String = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }

        const dataUrl = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : base64String;

        await apiRequest('/header-settings', {
          method: 'PUT',
          body: JSON.stringify({
            backgroundType: 'image',
            imageConfig: {
              dataUrl,
              url: dataUrl,
            },
          }),
        });

        queryClient.invalidateQueries({ queryKey: ['header-settings'] });
        setHeaderModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to upload header image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAssetLibraryImage = async () => {
    if (!selectedAssetUrl) return;
    try {
      setUploading(true);
      await apiRequest('/header-settings', {
        method: 'PUT',
        body: JSON.stringify({
          backgroundType: 'image',
          imageConfig: {
            url: selectedAssetUrl,
            dataUrl: selectedAssetUrl,
          },
        }),
      });

      queryClient.invalidateQueries({ queryKey: ['header-settings'] });
      setIsAssetPickerOpen(false);
      setHeaderModalOpen(false);
      setSelectedAssetUrl('');
    } catch (error) {
      console.error('Failed to update header from asset library:', error);
    } finally {
      setUploading(false);
    }
  };

  // Pure UI update while sliding (NO API Calls, NO Flickering)
  const handleUpdatePositionValue = (newVal: number) => {
    isEditingPositionRef.current = true;
    const posStr = `center ${newVal}%`;
    setLocalPosition(posStr);
  };

  // Triggered ONLY on slider release
  const handleSavePosition = async (newVal: number) => {
    const posStr = `center ${newVal}%`;
    setLocalPosition(posStr);

    try {
      await apiRequest('/header-settings', {
        method: 'PUT',
        body: JSON.stringify({
          imageConfig: {
            position: posStr,
          },
        }),
      });
      // Delay resetting the edit flag so query response doesn't jump position
      setTimeout(() => {
        isEditingPositionRef.current = false;
      }, 500);
      queryClient.invalidateQueries({ queryKey: ['header-settings'] });
    } catch (error) {
      isEditingPositionRef.current = false;
      console.error('Failed to save cover position:', error);
    }
  };

  const handleResetHeader = async () => {
    try {
      await apiRequest('/header-settings/reset', { method: 'POST' });
      queryClient.invalidateQueries({ queryKey: ['header-settings'] });
      setHeaderModalOpen(false);
    } catch (error) {
      console.error('Failed to reset header:', error);
    }
  };

  const fullName = user?.fullName || user?.name || 'Employee';
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const backgroundColor = headerSettings?.colorConfig?.from || '#133767';

  if (settingsLoading) {
    return (
      <View
        style={[
          styles.headerLoading,
          {
            paddingTop: insets.top,
            height: scaledHeaderHeight + insets.top,
          },
        ]}
      >
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.header,
          {
            height: totalHeaderHeight,
            paddingTop: insets.top,
            backgroundColor: backgroundColor,
          },
        ]}
      >
        {hasImageBackground && bgImageSource ? (
          <Image
            source={bgImageSource}
            style={[
              styles.backgroundImage,
              {
                height: bgImageHeight,
                top: imageTopOffset,
              },
            ]}
            resizeMode="cover"
            onError={() => setBgLoadError(true)}
          />
        ) : null}

        {hasImageBackground && headerSettings?.overlay?.enabled && (
          <View
            style={[
              styles.overlay,
              {
                backgroundColor:
                  headerSettings.overlay.color || 'rgba(0,0,0,0.3)',
              },
            ]}
          />
        )}

        {/* Top Camera Icon safely below status bar inset */}
        <TouchableOpacity
          onPress={() => setHeaderModalOpen(true)}
          style={[styles.headerPictureButton, { top: insets.top + 8 }]}
          activeOpacity={0.8}
        >
          <Camera color="#FFFFFF" size={fs(4.5)} />
        </TouchableOpacity>

        {/* Bottom Bar Controls */}
        <View style={[styles.contentWrapper, { marginBottom: scaledHeaderHeight-(scaledHeaderHeight-18)  }]}>
          <View style={styles.leftSection}>
            {!showBackButton && !isLargeScreen ? (
              <TouchableOpacity
                onPress={openSidebar}
                style={styles.menuButton}
                activeOpacity={0.7}
              >
                <Menu color="#FFFFFF" size={fs(5.5)} />
              </TouchableOpacity>
            ) : null}

            {showBackButton ? (
              <TouchableOpacity
                onPress={handleBackPress}
                style={styles.menuButton}
                activeOpacity={0.7}
              >
                <ChevronLeft color="#FFFFFF" size={fs(5.5)} />
              </TouchableOpacity>
            ) : null}

            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.centerSection}>
            <Text style={styles.pageTitle} numberOfLines={1}>
              {title || ''}
            </Text>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity
              onPress={handleNotificationPress}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <Bell color="#FFFFFF" size={fs(5)} />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleProfilePress}
              style={styles.avatarButton}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                {avatarImageSource && !avatarLoadError ? (
                  <Image
                    source={avatarImageSource}
                    style={styles.avatarAsset}
                    resizeMode="cover"
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogoutPress}
              style={styles.iconButton}
              activeOpacity={0.7}
            >
              <LogOut color="#FFFFFF" size={fs(4.8)} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Header Edit Modal */}
      <Modal visible={headerModalOpen} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Header Picture</Text>
              <TouchableOpacity onPress={() => setHeaderModalOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyScroll}>
              <Text style={styles.modalDescription}>
                Upload a custom background image or pick directly from system assets.
              </Text>

              {/* Upload Box */}
              <TouchableOpacity
                style={styles.uploadCard}
                onPress={handlePickHeaderImage}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#0072FF" />
                ) : (
                  <>
                    <Camera size={30} color="#64748b" />
                    <Text style={styles.uploadCardText}>Tap to Upload Device Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Asset Library Picker Button */}
              <TouchableOpacity
                style={styles.pickFromLibraryBtn}
                onPress={() => setIsAssetPickerOpen(true)}
              >
                <Palette size={18} color="#4f46e5" />
                <Text style={styles.pickFromLibraryBtnText}>Pick from Asset Images</Text>
              </TouchableOpacity>

              {/* Live Reposition Slider & Interactive Preview Card */}
              {hasImageBackground && bgImageSource && (
                <View style={styles.repositionContainer}>
                  <Text style={styles.repositionSectionTitle}>Reposition Cover</Text>

                  {/* Live Mini Preview Box inside the modal */}
                  <View style={[styles.miniPreviewCard, { height: modalPreviewHeight }]}>
                    <Image
                      source={bgImageSource}
                      style={[
                        styles.miniPreviewImage,
                        {
                          height: modalPreviewImageHeight,
                          top: modalPreviewShift,
                        },
                      ]}
                      resizeMode="cover"
                    />
                    <View style={styles.miniPreviewBadge}>
                      <Text style={styles.miniPreviewBadgeText}>Live Preview</Text>
                    </View>
                  </View>

                  <View style={styles.repositionHeader}>
                    <Text style={styles.repositionLabel}>Vertical Position</Text>
                    <Text style={styles.repositionValue}>{currentPosValue}%</Text>
                  </View>

                  {/* Smooth Range Slider */}
                  <CustomSlider
                    value={currentPosValue}
                    onValueChange={handleUpdatePositionValue}
                    onSlidingComplete={handleSavePosition}
                  />

                  <View style={styles.sliderMinMaxRow}>
                    <Text style={styles.sliderMinMaxText}>0% (Top)</Text>
                    <Text style={styles.sliderMinMaxText}>50% (Center)</Text>
                    <Text style={styles.sliderMinMaxText}>100% (Bottom)</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetHeader}
              >
                <Text style={styles.resetButtonText}>Reset Default</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setHeaderModalOpen(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Asset Library Picker Modal */}
      <Modal visible={isAssetPickerOpen} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.assetPickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick from Asset Images</Text>
              <TouchableOpacity onPress={() => setIsAssetPickerOpen(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Folders horizontal strip */}
            <View style={styles.folderStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folderStripScroll}>
                <TouchableOpacity
                  style={[styles.folderChip, !selectedFolderId && styles.activeFolderChip]}
                  onPress={() => { setSelectedFolderId(''); setAssetPage(1); }}
                >
                  <FolderOpen size={12} color={!selectedFolderId ? '#0072FF' : '#64748b'} />
                  <Text style={[styles.folderChipText, !selectedFolderId && styles.activeFolderChipText]}>All Files</Text>
                </TouchableOpacity>
                {folders.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.folderChip, selectedFolderId === f.id && styles.activeFolderChip]}
                    onPress={() => { setSelectedFolderId(f.id); setAssetPage(1); }}
                  >
                    <FolderOpen size={12} color={selectedFolderId === f.id ? '#0072FF' : '#64748b'} />
                    <Text style={[styles.folderChipText, selectedFolderId === f.id && styles.activeFolderChipText]}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Search Input */}
            <View style={styles.searchBoxWrapper}>
              <Search size={14} color="#94a3b8" style={styles.searchIconPos} />
              <TextInput
                style={styles.searchTextInput}
                placeholder="Search asset images..."
                placeholderTextColor="#94a3b8"
                value={assetSearch}
                onChangeText={(val) => { setAssetSearch(val); setAssetPage(1); }}
              />
            </View>

            {/* Asset Grid */}
            <View style={styles.assetGridContainer}>
              {loadingAssets ? (
                <View style={styles.centerLoadingState}>
                  <ActivityIndicator size="small" color="#0072FF" />
                </View>
              ) : assets.length === 0 ? (
                <View style={styles.centerLoadingState}>
                  <Text style={styles.emptyAssetStateText}>No matching images found</Text>
                </View>
              ) : (
                <FlatList
                  data={assets}
                  keyExtractor={(item) => item.id || item._id || Math.random().toString()}
                  numColumns={3}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.assetGridList}
                  renderItem={({ item }) => {
                    const rawUrl = item.urlOriginal || item.attachment?.url || '';
                    const displayUri = getDisplayImageUrl(rawUrl, jwtToken);
                    const isSelected = selectedAssetUrl === rawUrl;

                    return (
                      <TouchableOpacity
                        style={[styles.assetTile, isSelected && styles.selectedAssetTile]}
                        onPress={() => setSelectedAssetUrl(rawUrl)}
                        activeOpacity={0.8}
                      >
                        {displayUri ? (
                          <Image source={{ uri: displayUri }} style={styles.assetTileImage} resizeMode="cover" />
                        ) : null}
                        {isSelected && (
                          <View style={styles.selectedAssetBadgeOverlay}>
                            <Check size={16} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>

            {/* Pagination and Apply Footer */}
            <View style={styles.assetPickerFooter}>
              {totalAssetPages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageNavBtn, assetPage <= 1 && styles.pageNavBtnDisabled]}
                    disabled={assetPage <= 1}
                    onPress={() => setAssetPage((p) => Math.max(1, p - 1))}
                  >
                    <Text style={styles.pageNavBtnText}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.pageCounterText}>{assetPage} / {totalAssetPages}</Text>

                  <TouchableOpacity
                    style={[styles.pageNavBtn, assetPage >= totalAssetPages && styles.pageNavBtnDisabled]}
                    disabled={assetPage >= totalAssetPages}
                    onPress={() => setAssetPage((p) => Math.min(totalAssetPages, p + 1))}
                  >
                    <Text style={styles.pageNavBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.footerButtonsGroup}>
                <TouchableOpacity
                  style={styles.cancelPickerBtn}
                  onPress={() => setIsAssetPickerOpen(false)}
                >
                  <Text style={styles.cancelPickerBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.applySelectedBtn, !selectedAssetUrl && styles.applySelectedBtnDisabled]}
                  disabled={!selectedAssetUrl || uploading}
                  onPress={handleSelectAssetLibraryImage}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.applySelectedBtnText}>Use Selected Image</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    width: '100%',
    height: 32,
    justifyContent: 'center',
  },
  trackBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  trackActive: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#0072FF',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0072FF',
    borderWidth: 2,
    borderColor: '#ffffff',
    position: 'absolute',
    top: -6,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  header: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'flex-end',
    paddingBottom: 24,
  },
  headerLoading: {
    width: '100%',
    backgroundColor: '#133767',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerPictureButton: {
    position: 'absolute',
    right: 16,
    zIndex: 25,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    zIndex: 10,
    width: '100%',
   
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
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: wp(10),
    height: wp(10),
    borderRadius: 8,
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
    minWidth: wp(4.5),
    height: wp(4.5),
    borderRadius: 10,
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
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  avatar: {
    width: wp(9.8),
    height: wp(9.8),
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarAsset: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarText: {
    fontSize: fs(3.8),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 360,
    maxHeight: '85%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBodyScroll: {
    paddingVertical: 4,
  },
  modalDescription: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  uploadCard: {
    height: 100,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  uploadCardText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
  },
  pickFromLibraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 8,
  },
  pickFromLibraryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4f46e5',
  },
  repositionContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  repositionSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  miniPreviewCard: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  miniPreviewImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    width: '100%',
  },
  miniPreviewBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  miniPreviewBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
  },
  repositionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  repositionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  repositionValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0072FF',
  },
  sliderMinMaxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderMinMaxText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  resetButton: {
    paddingVertical: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  closeButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Asset Picker Modal Styles
  assetPickerModalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: 380,
    height: '80%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  folderStrip: {
    marginBottom: 10,
  },
  folderStripScroll: {
    gap: 6,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  activeFolderChip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  folderChipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  activeFolderChipText: {
    color: '#0072FF',
    fontWeight: '700',
  },
  searchBoxWrapper: {
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 10,
  },
  searchIconPos: {
    position: 'absolute',
    left: 10,
    zIndex: 2,
  },
  searchTextInput: {
    height: 36,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingLeft: 32,
    paddingRight: 12,
    fontSize: 12,
    color: '#0f172a',
  },
  assetGridContainer: {
    flex: 1,
    marginVertical: 4,
  },
  centerLoadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAssetStateText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  assetGridList: {
    gap: 8,
  },
  assetTile: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 3,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  selectedAssetTile: {
    borderColor: '#0072FF',
  },
  assetTileImage: {
    width: '100%',
    height: '100%',
  },
  selectedAssetBadgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 114, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetPickerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    gap: 8,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  pageCounterText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  footerButtonsGroup: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelPickerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelPickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  applySelectedBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0072FF',
  },
  applySelectedBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  applySelectedBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
});