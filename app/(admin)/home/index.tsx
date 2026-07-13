import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
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

const GRID_PADDING = 20;

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
  value: number;
  icon: React.ComponentType<any>;
  variant: string;
}

export default function AdminHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { uiTheme } = useTheme() as any;
  const [refreshing, setRefreshing] = useState(false);

  const isMetallic = uiTheme?.theme === 'metallic-elite';

  const colors = useMemo(() => {
    const isDark = uiTheme?.theme === 'dark' || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? '#080a0f' : '#f8fafc'),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? '#0f1117' : '#ffffff'),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? '#ffffff' : '#0f172a'),
      textSecondary: isDark ? '#94a3b8' : '#64748b',
      border: uiTheme?.panelColors?.borderColor || (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
      primary: uiTheme?.customColors?.primary || '#0072FF',
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<DashboardSummary>({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await apiRequest<any>('/dashboard/summary', { method: 'GET' });
      return res.data as DashboardSummary;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchSummary();
    setRefreshing(false);
  }, [refetchSummary]);

  const metrics = useMemo<MetricItem[]>(() => {
    if (!summary) return [];
    return [
      { title: 'Active Tasks', value: summary.activeTasks, icon: ClipboardCheck, variant: 'blue' },
      { title: 'Overdue', value: summary.overdueTasks, icon: AlertCircle, variant: 'red' },
      { title: 'Projects', value: summary.projectTotal, icon: Folder, variant: 'purple' },
      { title: 'Employees', value: summary.employeeTotal, icon: Users, variant: 'indigo' },
      { title: 'Working Now', value: summary.employeesWorking, icon: Clock, variant: 'green' },
      { title: 'Vehicles', value: summary.vehicleTotal, icon: Car, variant: 'gold' },
      { title: 'Bugs', value: summary.pendingBugs, icon: Bug, variant: 'orange' },
      { title: 'Patents Filed', value: summary.patentFiled, icon: Award, variant: 'teal' },
      { title: 'Due Today', value: summary.dueToday, icon: Calendar, variant: 'blue' },
      { title: 'Avg Hours/Emp', value: summary.avgHoursPerEmployee, icon: UserCog, variant: 'grey' },
      { title: 'Hours Logged', value: summary.hoursLoggedToday, icon: Clock, variant: 'blue' },
      { title: 'Website Active', value: summary.websiteActive, icon: Sparkles, variant: 'cyan' },
      { title: 'Website Future', value: summary.websiteFuture, icon: Sparkles, variant: 'indigo' },
      { title: 'Patents Pending', value: summary.patentPending, icon: Award, variant: 'amber' },
      { title: 'Company Total', value: summary.companyTotal, icon: Users, variant: 'dark-grey' },
    ];
  }, [summary]);

  if (summaryLoading && !refreshing) {
    return (
      <View style={[s(styles.loadingContainer), { backgroundColor: colors.cardBg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s(styles.container)}>
      <View style={s(styles.header)}>
        <Text style={s(styles.greeting)}>Welcome back,</Text>
        <Text style={s(styles.userName)}>{user?.fullName || 'Manager'}</Text>
      </View>

      <ScrollView
        style={s(styles.scrollBody)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GRID_PADDING, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={s(styles.sectionHeading)}>Dashboard Summary</Text>

        <View style={s(styles.grid)}>
          {metrics.map((stat, idx) => (
            <View key={idx} style={s(styles.col)}>
              <StatCard {...stat} />
            </View>
          ))}
        </View>

        <RecentTasksList />
        <ActiveEmployees />
        <DayAheadCard />
        <View style={{ height: 12 }} />
        <WeekAheadCard />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.cardBg,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 60 : 44,
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
      backgroundColor: colors.cardBg,
    },
    sectionHeading: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      marginTop: 24,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
    },
    col: {
      width: '50%',
      padding: 8,
    },
  });