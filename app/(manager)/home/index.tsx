import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Hourglass,
  TrendingUp,
  Calendar,
  ChevronRight,
  Award,
  Briefcase,
  Sparkles,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Animated Circular Progress Chart Component
interface CircularChartData {
  label: string;
  value: number;
  color: string;
  gradientColors?: [string, string];
}

function AnimatedCircularProgressChart({ data }: { data: CircularChartData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  const animatedValues = useRef(data.map(() => new Animated.Value(0))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      ...data.map((_, index) =>
        Animated.timing(animatedValues[index], {
          toValue: 1,
          duration: 1200,
          delay: index * 150,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [data]);

  let currentAngle = 0;

  return (
    <Animated.View style={[chartStyles.container, { opacity: fadeAnim }]}>
      <Svg width={size} height={size}>
        <Defs>
          {data.map((item, idx) => (
            <SvgLinearGradient key={`grad-${idx}`} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={item.gradientColors?.[0] || item.color} stopOpacity="1" />
              <Stop offset="100%" stopColor={item.gradientColors?.[1] || item.color} stopOpacity="1" />
            </SvgLinearGradient>
          ))}
        </Defs>
        {/* Background circle with proper styling */}
        <SvgCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.background}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Subtle background ring */}
        <SvgCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(0,0,0,0.03)"
          strokeWidth={strokeWidth - 2}
          fill="transparent"
        />
        {data.map((item, index) => {
          const percentage = total > 0 ? item.value / total : 0;
          const strokeDasharray = `${circumference * percentage} ${circumference}`;
          const rotation = currentAngle * 360;
          currentAngle += percentage;

          const animatedStrokeDashoffset = animatedValues[index].interpolate({
            inputRange: [0, 1],
            outputRange: [circumference, circumference * (1 - percentage)],
          });

          return (
            <AnimatedCircle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              stroke={`url(#grad-${index})`}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={animatedStrokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(${rotation - 90}, ${center}, ${center})`}
            />
          );
        })}
      </Svg>
      <View style={chartStyles.center}>
        <Animated.Text style={[chartStyles.totalValue, { opacity: animatedValues[0] }]}>
          {total}
        </Animated.Text>
        <Text style={chartStyles.totalLabel}>Total Tasks</Text>
      </View>
    </Animated.View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const chartStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    width: 120,
    height: 120,
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.text,
  },
});

// Animated Stat Card Component
function AnimatedStatCard({ 
  icon: Icon, 
  value, 
  label, 
  colors, 
  onPress,
  index 
}: { 
  icon: any; 
  value: number; 
  label: string; 
  colors: [string, string]; 
  onPress: () => void;
  index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: index * 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.statCard,
        {
          transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={handlePress}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.statIconBg}>
            <Icon size={22} color={Colors.surface} />
          </View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statLabel}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Animated Employee Item Component
function AnimatedEmployeeItem({ employee, onPress, index }: { employee: any; onPress: () => void; index: number }) {
  const translateX = useRef(new Animated.Value(50)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        damping: 15,
        mass: 1,
        stiffness: 150,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  return (
    <Animated.View
      style={{
        transform: [{ translateX }],
        opacity,
      }}
    >
      <TouchableOpacity
        style={styles.employeeItem}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[Colors.primaryLight, Colors.primary]}
          style={styles.employeeAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.avatarText}>
            {(employee.name || 'U')
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </LinearGradient>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{employee.name || 'Unknown'}</Text>
          <Text style={styles.employeeRole}>{employee.role || employee.department || 'Staff'}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: employee.status === 'active' ? Colors.successLight : Colors.warningLight },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: employee.status === 'active' ? Colors.success : Colors.warning },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: employee.status === 'active' ? Colors.success : Colors.warning },
            ]}
          >
            {employee.status === 'active' ? 'Active' : 'Offline'}
          </Text>
        </View>
        <ChevronRight size={16} color={Colors.textTertiary} strokeWidth={1.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Types
type ApiEmployeeItem = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  status?: string;
  location?: string;
  company?: string;
};

type ApiTaskItem = {
  id: string;
  title?: string;
  description?: string;
  assignee?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
  location?: string;
};

type ApiScheduleItem = {
  id: string;
  day?: string;
  title?: string;
  assignee?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  type?: string;
  date?: string;
  status?: string;
};

export default function ManagerHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useQuery<ApiEmployeeItem[]>({
    queryKey: ['managerEmployees'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: ApiEmployeeItem[] }>('/employees');
      return res.data?.items || [];
    },
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<ApiTaskItem[]>({
    queryKey: ['managerTasks'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: ApiTaskItem[] }>('/tasks');
      return res.data?.items || [];
    },
  });

  const { data: schedules = [], isLoading: shiftsLoading, refetch: refetchSchedules } = useQuery<ApiScheduleItem[]>({
    queryKey: ['managerSchedules'],
    queryFn: async () => {
      const res = await apiRequest<{ items?: ApiScheduleItem[] }>('/schedules');
      return res.data?.items || [];
    },
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRefreshing(true);
    await Promise.all([refetchEmployees(), refetchTasks(), refetchSchedules()]);
    setRefreshing(false);
  }, [refetchEmployees, refetchTasks, refetchSchedules]);

  const taskStats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in-progress' || t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const overdue = tasks.filter((t) => t.status === 'overdue').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { pending, inProgress, completed, overdue, total, completionRate };
  }, [tasks]);

  const chartData = useMemo<CircularChartData[]>(() => {
    return [
      { label: 'Completed', value: taskStats.completed, color: '#22C55E', gradientColors: ['#22C55E', '#16A34A'] },
      { label: 'In Progress', value: taskStats.inProgress, color: '#3B82F6', gradientColors: ['#3B82F6', '#2563EB'] },
      { label: 'Pending', value: taskStats.pending, color: '#F59E0B', gradientColors: ['#F59E0B', '#D97706'] },
      { label: 'Overdue', value: taskStats.overdue, color: '#EF4444', gradientColors: ['#EF4444', '#DC2626'] },
    ].filter((item) => item.value > 0);
  }, [taskStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [100, 70],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 80],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  // Show loading screen when any data is loading initially
  if ((employeesLoading || tasksLoading || shiftsLoading) && !refreshing) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.fullName || 'Manager'}</Text>
          </View>
        </Animated.View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.header, { height: headerHeight, opacity: headerFadeAnim }]}>
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.fullName || user?.name || 'Manager'}</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          >
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>3</Text>
            </View>
            <Clock size={22} color={Colors.textTertiary} />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || employeesLoading || tasksLoading || shiftsLoading}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Top 3 Cards with Animation */}
        <View style={styles.statsGrid}>
          <AnimatedStatCard
            icon={Users}
            value={employees.length}
            label="Total Employees"
            colors={['#1B3C73', '#2A4F8C']}
            onPress={() => router.push('/(manager)/team' as any)}
            index={0}
          />
          <AnimatedStatCard
            icon={Hourglass}
            value={taskStats.inProgress}
            label="Pending Tasks"
            colors={['#F59E0B', '#D97706']}
            onPress={() => router.push('/(manager)/tasks' as any)}
            index={1}
          />
          <AnimatedStatCard
            icon={CheckCircle2}
            value={taskStats.completed}
            label="Completed Tasks"
            colors={['#22C55E', '#16A34A']}
            onPress={() => router.push('/(manager)/tasks' as any)}
            index={2}
          />
        </View>

        {/* Completion Rate Banner with Animation */}
        <Animated.View style={[styles.completionBanner, { opacity: headerFadeAnim }]}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.05)']}
            style={styles.completionGradient}
          >
            <View style={styles.completionLeft}>
              <View style={styles.awardIconBg}>
                <Award size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.completionTitle}>Task Completion Rate</Text>
                <Text style={styles.completionRate}>{taskStats.completionRate}% Complete</Text>
              </View>
            </View>
            <View style={styles.completionBarContainer}>
              <Animated.View 
                style={[
                  styles.completionBar, 
                  { 
                    width: `${taskStats.completionRate}%`,
                    transform: [{
                      scaleX: headerFadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1]
                      })
                    }]
                  }
                ]} 
              />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Task Overview with Circular Chart */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrapper}>
              <Sparkles size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Task Overview</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(manager)/tasks' as any);
              }}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAll}>View All</Text>
              <ChevronRight size={14} color={Colors.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={styles.taskOverviewCard}>
            <AnimatedCircularProgressChart data={chartData} />

            {/* Legend */}
            <View style={styles.legendContainer}>
              {taskStats.completed > 0 && (
                <View style={styles.legendItem}>
                  <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.legendDot} />
                  <Text style={styles.legendLabel}>Completed</Text>
                  <Text style={styles.legendPercentage}>
                    {Math.round((taskStats.completed / (taskStats.total || 1)) * 100)}%
                  </Text>
                </View>
              )}
              {taskStats.inProgress > 0 && (
                <View style={styles.legendItem}>
                  <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.legendDot} />
                  <Text style={styles.legendLabel}>In Progress</Text>
                  <Text style={styles.legendPercentage}>
                    {Math.round((taskStats.inProgress / (taskStats.total || 1)) * 100)}%
                  </Text>
                </View>
              )}
              {taskStats.pending > 0 && (
                <View style={styles.legendItem}>
                  <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.legendDot} />
                  <Text style={styles.legendLabel}>Pending</Text>
                  <Text style={styles.legendPercentage}>
                    {Math.round((taskStats.pending / (taskStats.total || 1)) * 100)}%
                  </Text>
                </View>
              )}
              {taskStats.overdue > 0 && (
                <View style={styles.legendItem}>
                  <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.legendDot} />
                  <Text style={styles.legendLabel}>Overdue</Text>
                  <Text style={styles.legendPercentage}>
                    {Math.round((taskStats.overdue / (taskStats.total || 1)) * 100)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStatsRow}>
              <View style={styles.quickStat}>
                <Briefcase size={18} color={Colors.textTertiary} />
                <Text style={styles.quickStatLabel}>Total Tasks</Text>
                <Text style={styles.quickStatValue}>{taskStats.total}</Text>
              </View>
              <View style={styles.quickStatDivider} />
              <View style={styles.quickStat}>
                <TrendingUp size={18} color={Colors.textTertiary} />
                <Text style={styles.quickStatLabel}>Completion</Text>
                <Text style={styles.quickStatValue}>{taskStats.completionRate}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Employees List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrapper}>
              <Users size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Employees</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(manager)/team' as any);
              }}
              style={styles.viewAllButton}
            >
              <Text style={styles.viewAll}>See All</Text>
              <ChevronRight size={14} color={Colors.secondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={styles.employeeList}>
            {employees.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No employees found</Text>
              </View>
            ) : (
              employees.slice(0, 5).map((employee, index) => (
                <AnimatedEmployeeItem
                  key={employee.id}
                  employee={employee}
                  onPress={() => router.push('/(manager)/team' as any)}
                  index={index}
                />
              ))
            )}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  greeting: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  greetingWrap: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 14,
    alignItems: 'center',
    height: 110,
    justifyContent: 'center',
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.surface,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    textAlign: 'center',
  },
  completionBanner: {
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  completionGradient: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.15)',
  },
  completionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  awardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  completionRate: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  completionBarContainer: {
    height: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  completionBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAll: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '500',
  },
  taskOverviewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  legendPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 4,
  },
  quickStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    width: '100%',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  employeeList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 8,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  employeeAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.surface,
  },
  employeeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  employeeRole: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginRight: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
});