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
import { StatCard } from '@/components/dashboard-card/StatCard';
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

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { uiTheme } = useTheme() as any;
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);

  const isMetallic = uiTheme?.theme === 'metallic-elite';
  const isTablet = width >= 768;
  const numColumns = width >= 1024 ? 4 : isTablet ? 3 : 2;

  const colors = useMemo(() => {
    const isDark = uiTheme?.theme === 'dark' || isMetallic || uiTheme?.theme !== 'crystal-white';
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? '#080a0f' : '#f8fafc'),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? '#0f1117' : '#ffffff'),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? '#ffffff' : '#0f172a'),
      textSecondary: isDark ? '#94a3b8' : '#64748b',
      border: uiTheme?.panelColors?.borderColor || (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
      primary: uiTheme?.customColors?.primary || '#0072FF',
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
      { title: 'Active Employee', value: summary.employeeTotal, icon: Users, variant: 'indigo', route: '/(admin)/employees' },
      { title: 'Active Projects', value: summary.projectTotal, icon: Folder, variant: 'purple', route: '/(admin)/tasks' },
      { title: 'Active Tasks', value: summary.activeTasks, icon: ClipboardCheck, variant: 'blue', route: '/(admin)/tasks' },
      { title: 'Clocked In', value: summary.employeesWorking, icon: Clock, variant: 'green', route: '/(admin)/time-tracking' },
      { title: 'Companies', value: summary.companyTotal, icon: Building2, variant: 'dark-grey', route: '/(admin)/companies' },
      { title: 'Due Today', value: summary.dueToday, icon: Calendar, variant: 'blue', route: '/(admin)/tasks' },
      { title: 'Overdue Tasks', value: summary.overdueTasks, icon: AlertCircle, variant: 'red', route: '/(admin)/tasks' },
      {
        title: 'Patents',
        value: `${summary.patentFiled} / ${summary.patentPending}`,
        change: 'filed / pending',
        icon: FileSearch,
        variant: 'amber',
        route: '/(admin)/intellectual-property',
      },
      { title: 'Pending Bugs', value: summary.pendingBugs, icon: Bug, variant: 'orange', route: '/(admin)/bug-reports' },
      { title: 'Total Vehicles', value: summary.vehicleTotal, icon: Car, variant: 'gold', route: '/(admin)/vehicles' },
      {
        title: 'Websites',
        value: `${summary.websiteActive} / ${summary.websiteFuture}`,
        change: 'active / future',
        icon: Globe,
        variant: 'cyan',
        route: '/(admin)/digital-assets',
      },
      {
        title: 'System Health',
        value: 'Monitor',
        change: 'servers · RAM · disk',
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

  return (
    <View style={s(styles.container)}>
      <View style={s(styles.header)}>
        <Text style={s(styles.greeting)}>Welcome back,</Text>
        <Text style={s(styles.userName)}>{user?.fullName || 'Admin'}</Text>
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
                <AlertTriangle size={20} color="#f97316" />
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
            </TouchableOpacity>
          </View>
        )}

        <Text style={s(styles.sectionHeading)}>Dashboard Summary</Text>

        {/* Metrics Grid */}
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
                <StatCard {...stat} />
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

const dynamicCardStyle = (colors: any) => ({
  backgroundColor: colors.cardBg,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: 12,
  padding: 12,
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
      paddingTop: Platform.OS === 'ios' ? 54 : 36,
      paddingHorizontal: 16,
      paddingBottom: 14,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 3,
    },
    greeting: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    userName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    scrollBody: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: isTablet ? 24 : 16,
      paddingTop: 12,
      paddingBottom: 40,
    },
    onboardingBanner: {
      borderLeftWidth: 4,
      borderLeftColor: '#ea580c',
      backgroundColor: 'rgba(234, 88, 12, 0.1)',
      borderRadius: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: 'rgba(234, 88, 12, 0.2)',
      gap: 12,
      marginBottom: 16,
    },
    onboardingHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    alertIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(249, 115, 22, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    onboardingTextContainer: {
      flex: 1,
    },
    onboardingTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
    },
    onboardingSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    onboardingButton: {
      backgroundColor: '#ea580c',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
    },
    onboardingButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 13,
    },
    sectionHeading: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
      marginTop: 8,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
      marginBottom: 16,
    },
    col: {
      paddingHorizontal: 6,
      marginBottom: 12,
    },
    cardWrapper: {
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    sectionMargin: {
      marginBottom: 16,
    },
    dualColumnLayout: {
      flexDirection: isTablet ? 'row' : 'column',
      gap: 14,
      marginBottom: 16,
    },
    dualColumn: {
      flex: 1,
    },
  });