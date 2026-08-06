import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  ClipboardCheck,
  Clock,
  Award,
  Sparkles,
  Folder,
  Car,
  Bug,
  AlertCircle,
  Calendar,
  UserCog,
  Building2,
  Globe,
  FileSearch,
  Activity,
  AlertTriangle,
  LucideIcon,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import { s } from '@/util/styles';

import { RecentTasksList } from '@/components/dashboard-card/RecentTasksList';
import { ActiveEmployees } from '@/components/dashboard-card/ActiveEmployees';
import { DayAheadCard } from '@/components/dashboard-card/DayAheadCard';
import { WeekAheadCard } from '@/components/dashboard-card/WeekAheadCard';
import { TaskCharts } from '@/components/admin/dashboard/TaskCharts';
import { WipDashboardWidget } from '@/components/wip/WipDashboardWidget';

interface DashboardSummary {
  activeTasks: number;
  avgHoursPerEmployee: number;
  companyTotal: number;
  dueToday: number;
  employeeTotal: number;
  employeesWorking: number;
  hoursLoggedToday: number;
  overdueTasks: number;
  patentFiled: number;
  patentPending: number;
  pendingBugs: number;
  projectTotal: number;
  vehicleTotal: number;
  websiteActive: number;
  websiteFuture: number;
}

interface MetricItem {
  title: string;
  value: number | string;
  change?: string;
  icon: LucideIcon;
  variant: string;
  route?: string;
}

/**
 * Custom Ultra-Compact Micro Stat Card
 */
function CompactStatCard({ item, colors }: { item: MetricItem; colors: any }) {
  const Icon = item.icon;

  const variantColors = useMemo(() => {
    switch (item.variant) {
      case 'indigo': return { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1' };
      case 'purple': return { bg: 'rgba(168, 85, 247, 0.12)', text: '#a855f7' };
      case 'blue': return { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6' };
      case 'green': return { bg: 'rgba(34, 197, 94, 0.12)', text: '#22c55e' };
      case 'red': return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444' };
      case 'amber':
      case 'gold': return { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b' };
      case 'orange': return { bg: 'rgba(249, 115, 22, 0.12)', text: '#f97316' };
      case 'cyan': return { bg: 'rgba(6, 182, 212, 0.12)', text: '#06b6d4' };
      default: return { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8' };
    }
  }, [item.variant]);

  return (
    <View style={[miniCardStyles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={miniCardStyles.topRow}>
        <Text style={[miniCardStyles.title, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={[miniCardStyles.iconBadge, { backgroundColor: variantColors.bg }]}>
          <Icon size={12} color={variantColors.text} />
        </View>
      </View>

      <View style={miniCardStyles.valueRow}>
        <Text style={[miniCardStyles.value, { color: colors.text }]} numberOfLines={1}>
          {item.value}
        </Text>
        {item.change ? (
          <Text style={[miniCardStyles.change, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.change}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { uiTheme } = useTheme() as any;
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);

  const isMetallic = uiTheme?.theme === 'metallic-elite';
  const isTablet = width >= 768;

  // 3 Columns on Mobile for ultra-compact density, 4 on tablet, 6 on desktop
  const numColumns = width >= 1024 ? 6 : isTablet ? 4 : 3;

  const colors = useMemo(() => {
    const isDark = uiTheme?.theme === 'dark' || isMetallic || uiTheme?.theme !== 'crystal-white';
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? '#080a0f' : '#f8fafc'),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? '#0f121d' : '#ffffff'),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? '#f8fafc' : '#0f172a'),
      textSecondary: isDark ? '#94a3b8' : '#64748b',
      border: uiTheme?.panelColors?.borderColor || (isDark ? 'rgba(255,255,255,0.07)' : '#e2e8f0'),
      primary: uiTheme?.customColors?.primary || '#0072FF',
      headerBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? '#0d1019' : '#ffffff'),
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors, isTablet), [colors, isTablet]);

  // Fetch Dashboard Summary
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<DashboardSummary>({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await apiRequest<any>('/dashboard/summary', { method: 'GET' });
      return res.data as DashboardSummary;
    },
  });

  // Fetch Onboarding Status for Admin
  useEffect(() => {
    let isMounted = true;
    const fetchOnboarding = async () => {
      if (user?.role !== 'admin') return;
      try {
        const res = await apiRequest<any>('/onboarding/me', { method: 'GET' });
        if (isMounted && res.data?.item) {
          setOnboardingStatus(res.data.item.overallStatus);
        }
      } catch {
        if (isMounted) setOnboardingStatus('not_started');
      }
    };

    fetchOnboarding();
    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchSummary();
    setRefreshing(false);
  }, [refetchSummary]);

  const onboardingIncomplete =
    user?.role === 'admin' &&
    onboardingStatus !== null &&
    onboardingStatus !== 'approved';

  const metrics = useMemo<MetricItem[]>(() => {
    if (!summary) return [];
    return [
      { title: 'Active Employee', value: summary.employeeTotal, icon: Users, variant: 'indigo', route: '/(admin)/employee-directory' },
      { title: 'Active Projects', value: summary.projectTotal, icon: Folder, variant: 'purple', route: '/(admin)/task-management' },
      { title: 'Active Tasks', value: summary.activeTasks, icon: ClipboardCheck, variant: 'blue', route: '/(admin)/task-history' },
      { title: 'Clocked In', value: summary.employeesWorking, icon: Clock, variant: 'green', route: '/(admin)/time-tracking' },
      { title: 'Companies', value: summary.companyTotal, icon: Building2, variant: 'dark-grey', route: '/(admin)/companies' },
      { title: 'Due Today', value: summary.dueToday, icon: Calendar, variant: 'blue', route: '/(admin)/task-management' },
      { title: 'Overdue Tasks', value: summary.overdueTasks, icon: AlertCircle, variant: 'red', route: '/(admin)/task-management' },
      {
        title: 'Patents',
        value: `${summary.patentFiled}/${summary.patentPending}`,
        change: 'filed/pending',
        icon: FileSearch,
        variant: 'amber',
        route: '/(admin)/intellectual-property',
      },
      { title: 'Pending Bugs', value: summary.pendingBugs, icon: Bug, variant: 'orange', route: '/(admin)/bug' },
      { title: 'Total Vehicles', value: summary.vehicleTotal, icon: Car, variant: 'gold', route: '/(admin)/operations/vehicles' },
      {
        title: 'Websites',
        value: `${summary.websiteActive}/${summary.websiteFuture}`,
        change: 'active/future',
        icon: Globe,
        variant: 'cyan',
        route: '/(admin)/digital-assets',
      },
      {
        title: 'System Health',
        value: 'Monitor',
        change: 'servers · RAM',
        icon: Activity,
        variant: 'purple',
        route: '/(admin)/health',
      },
    ].sort((a, b) => a.title.localeCompare(b.title));
  }, [summary]);

  if (summaryLoading && !refreshing) {
    return (
      <View style={[s(styles.loadingContainer), { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const userInitials = (user?.fullName || 'Admin')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View style={s(styles.container)}>
      {/* Top Header */}
      <View style={s(styles.header)}>
        <View style={s(styles.headerTextGroup)}>
          <Text style={s(styles.greeting)}>Welcome back,</Text>
          <Text style={s(styles.userName)} numberOfLines={1}>
            {user?.fullName || 'Admin'}
          </Text>
        </View>

        <View style={s(styles.avatarPill)}>
          <View style={s(styles.avatarCircle)}>
            <Text style={s(styles.avatarText)}>{userInitials}</Text>
          </View>
          <View style={s(styles.onlineDot)} />
        </View>
      </View>

      <ScrollView
        style={s(styles.scrollBody)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Onboarding Banner */}
        {onboardingIncomplete && (
          <View style={s(styles.onboardingBanner)}>
            <View style={s(styles.onboardingHeader)}>
              <View style={s(styles.alertIconWrapper)}>
                <AlertTriangle size={16} color="#ea580c" />
              </View>
              <View style={s(styles.onboardingTextContainer)}>
                <Text style={s(styles.onboardingTitle)}>Complete Your Onboarding</Text>
                <Text style={s(styles.onboardingSubtitle)}>
                  {onboardingStatus === 'not_started' || onboardingStatus === 'in_progress'
                    ? 'Please complete your onboarding to access all features.'
                    : onboardingStatus === 'submitted'
                    ? 'Your onboarding is submitted and pending approval.'
                    : 'Please complete your onboarding to access all features.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(admin)/profile' as any)}
              style={s(styles.onboardingButton)}
            >
              <Text style={s(styles.onboardingButtonText)}>Complete Onboarding</Text>
              <ChevronRight size={14} color="#ffffff" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Section Header */}
        <View style={s(styles.sectionHeaderRow)}>
          <View style={s(styles.sectionHeaderIndicator)} />
          <Text style={s(styles.sectionHeading)}>Dashboard Summary</Text>
        </View>

        {/* Compact Micro Grid */}
        <View style={s(styles.grid)}>
          {metrics.map((stat, idx) => (
            <View
              key={idx}
              style={[
                s(styles.col),
                { width: `${100 / numColumns}%` as any },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => stat.route && router.push(stat.route as any)}
              >
                <CompactStatCard item={stat} colors={colors} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Operational Charts */}
        <View style={s(styles.cardWrapper)}>
          <TaskCharts />
        </View>

        {/* WIP Dashboard Widget */}
        <View style={s(styles.sectionMargin)}>
          <WipDashboardWidget />
        </View>

        {/* Dual List Sections */}
        <View style={s(styles.dualColumnLayout)}>
          <View style={s([styles.dualColumn, dynamicCardStyle(colors)])}>
            <RecentTasksList />
          </View>
          <View style={s([styles.dualColumn, dynamicCardStyle(colors)])}>
            <ActiveEmployees />
          </View>
        </View>

        {/* Planning Views */}
        <View style={s(styles.dualColumnLayout)}>
          <View style={s(styles.dualColumn)}>
            <DayAheadCard />
          </View>
          <View style={s(styles.dualColumn)}>
            <WeekAheadCard />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const miniCardStyles = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 58,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  title: {
    fontSize: 9.5,
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.1,
  },
  iconBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    marginTop: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  change: {
    fontSize: 8,
    fontWeight: '500',
    opacity: 0.75,
    marginTop: 1,
  },
});

const dynamicCardStyle = (colors: any) => ({
  backgroundColor: colors.cardBg,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 12,
  padding: 10,
});

const createStyles = (colors: any, isTablet: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 52 : 36,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: colors.headerBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    headerTextGroup: {
      flex: 1,
      marginRight: 12,
    },
    greeting: {
      fontSize: 11.5,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    userName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.2,
      marginTop: 1,
    },
    avatarPill: {
      position: 'relative',
    },
    avatarCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '700',
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 9,
      height: 9,
      borderRadius: 4.5,
      backgroundColor: '#10b981',
      borderWidth: 1.5,
      borderColor: colors.headerBg,
    },
    scrollBody: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: isTablet ? 16 : 10,
      paddingTop: 10,
      paddingBottom: 32,
    },
    onboardingBanner: {
      borderLeftWidth: 3.5,
      borderLeftColor: '#ea580c',
      backgroundColor: 'rgba(234, 88, 12, 0.08)',
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: 'rgba(234, 88, 12, 0.15)',
      gap: 8,
      marginBottom: 12,
    },
    onboardingHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    alertIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(234, 88, 12, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    onboardingTextContainer: {
      flex: 1,
    },
    onboardingTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: colors.text,
    },
    onboardingSubtitle: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 1,
      lineHeight: 15,
    },
    onboardingButton: {
      backgroundColor: '#ea580c',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      alignSelf: 'flex-start',
    },
    onboardingButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 11.5,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 2,
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    sectionHeaderIndicator: {
      width: 3,
      height: 11,
      borderRadius: 1.5,
      backgroundColor: colors.primary,
    },
    sectionHeading: {
      fontSize: 11,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -3,
      marginBottom: 10,
    },
    col: {
      paddingHorizontal: 3,
      marginBottom: 6,
    },
    cardWrapper: {
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
      marginBottom: 10,
    },
    sectionMargin: {
      marginBottom: 10,
    },
    dualColumnLayout: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 10,
      marginBottom: 10,
    },
    dualColumn: {
      flex: 1, 
    },
  });