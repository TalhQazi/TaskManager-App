import type React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Animated, Image, ScrollView } from 'react-native';
import { router, usePathname } from 'expo-router';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Calendar,
  Clock,
  MessageSquare,
  Bell,
  User,
  Car,
  Wrench,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';

type Item = {
  key: string;
  path: string;
  icon: (props: { color: string; size?: number }) => React.ReactNode;
  badge?: number;
};

const items: Item[] = [
  {
    key: 'dashboard',
    path: '/(manager)/home',
    icon: ({ color, size = 22 }) => <LayoutDashboard size={size} color={color} />,
  },
  {
    key: 'tasks',
    path: '/(manager)/tasks',
    icon: ({ color, size = 22 }) => <ClipboardList size={size} color={color} />,
  },
  {
    key: 'team',
    path: '/(manager)/team',
    icon: ({ color, size = 22 }) => <Users size={size} color={color} />,
  },
  {
    key: 'vehicles',
    path: '/(manager)/vehicles',
    icon: ({ color, size = 22 }) => <Car size={size} color={color} />,
  },
  {
    key: 'appliances',
    path: '/(manager)/appliances',
    icon: ({ color, size = 22 }) => <Wrench size={size} color={color} />,
  },
  {
    key: 'schedule',
    path: '/(manager)/schedule',
    icon: ({ color, size = 22 }) => <Calendar size={size} color={color} />,
  },
  {
    key: 'time-tracking',
    path: '/(manager)/time-tracking',
    icon: ({ color, size = 22 }) => <Clock size={size} color={color} />,
  },
  {
    key: 'messages',
    path: '/(manager)/messages',
    icon: ({ color, size = 22 }) => <MessageSquare size={size} color={color} />,
  },
  {
    key: 'notifications',
    path: '/(manager)/notifications',
    icon: ({ color, size = 22 }) => <Bell size={size} color={color} />,
  },
  {
    key: 'profile',
    path: '/(manager)/profile',
    icon: ({ color, size = 22 }) => <User size={size} color={color} />,
  },
];

// Animated Icon Component with Scale Effect
function AnimatedIcon({ 
  item, 
  active, 
  onPress,
  index 
}: { 
  item: Item; 
  active: boolean; 
  onPress: () => void;
  index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 30,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 30,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  // Glow animation for active item
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [active]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <Animated.View
      style={[
        styles.itemWrapper,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.item}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        <Animated.View
          style={[
            styles.itemBackground,
            active && styles.itemActiveContainer,
            isHovered && !active && styles.itemHovered,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {active && (
            <Animated.View
              style={[
                styles.glowEffect,
                {
                  opacity: glowOpacity,
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(74, 222, 128, 0.3)', 'rgba(74, 222, 128, 0)']}
                style={styles.glowGradient}
              />
            </Animated.View>
          )}
          
          {active ? (
            <LinearGradient
              colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeGradient}
            >
              {item.icon({ 
                color: Colors.surface, 
                size: isHovered ? 23 : 22 
              })}
            </LinearGradient>
          ) : (
            <View style={styles.inactiveIconContainer}>
              {item.icon({ 
                color: isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.6)', 
                size: isHovered ? 23 : 22 
              })}
            </View>
          )}

          {/* Active Indicator Dot */}
          {active && (
            <Animated.View style={[styles.activeIndicator]}>
              <LinearGradient
                colors={['#4ADE80', '#22C55E']}
                style={styles.activeIndicatorDot}
              />
            </Animated.View>
          )}

          {/* Badge */}
          {item.badge && item.badge > 0 && !active && (
            <Animated.View style={[styles.badge, { transform: [{ scale: scaleAnim }] }]}>
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.badgeGradient}
              >
                <Text style={styles.badgeText}>
                  {item.badge > 9 ? '9+' : item.badge}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Tooltip for Web */}
          {Platform.OS === 'web' && isHovered && !active && (
            <Animated.View style={[styles.tooltip, { opacity: opacityAnim }]}>
              <LinearGradient
                colors={['#1F2937', '#111827']}
                style={styles.tooltipGradient}
              >
                <Text style={styles.tooltipText}>
                  {item.key.charAt(0).toUpperCase() + item.key.slice(1)}
                </Text>
              </LinearGradient>
            </Animated.View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Need to import Text for tooltip and badge
import { Text } from 'react-native';

export default function ManagerFixedSidebar() {
  const pathname = usePathname();
  const sidebarAnim = useRef(new Animated.Value(-72)).current;

  useEffect(() => {
    // Slide in animation for sidebar
    Animated.spring(sidebarAnim, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: sidebarAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark || Colors.primary]}
        style={styles.gradientBackground}
      >
        {/* Header Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Navigation Items */}
        <ScrollView 
          style={styles.inner}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, index) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <AnimatedIcon
                key={item.key}
                item={item}
                active={active}
                onPress={() => router.push(item.path as any)}
                index={index}
              />
            );
          })}
        </ScrollView>

        {/* Footer Decoration */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 72,
    backgroundColor: Colors.primary,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  gradientBackground: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  inner: {
    paddingTop: 16,
    paddingHorizontal: 8,
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  itemWrapper: {
    width: 56,
    height: 56,
    marginVertical: 2,
  },
  item: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBackground: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    position: 'relative',
  },
  itemActiveContainer: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  itemHovered: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  activeGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  inactiveIconContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    overflow: 'hidden',
  },
  glowGradient: {
    width: '100%',
    height: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    right: -2,
    top: '50%',
    marginTop: -6,
    width: 4,
    height: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeIndicatorDot: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
  },
  badgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  tooltip: {
    position: 'absolute',
    left: 64,
    top: '50%',
    marginTop: -14,
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 1000,
  },
  tooltipGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
    paddingTop: 20,
  },
  footerLine: {
    width: 32,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1.5,
  },
});