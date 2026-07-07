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
  Award,
  Sparkles,
  FolderRoot,
  Car,
  MapPin,
  Bug,
  ClipboardList,
  UserCog,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/services/api';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GRID_PADDING = 20;
const GRID_GAP = 8;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP) / 2;

type TeamLeadMapping = { teamLead: string; user: string; allowOverrideAdminAssignments: boolean; };

// Unified dashboard summary API response schema layout matching your web portal
interface DashboardSummary {
  activeTasks: number;
  dueToday: number;
  overdueTasks: number;
  employeesWorking: number;
  employeeTotal: number;
  hoursLoggedToday: number;
  avgHoursPerEmployee: number;
  vehicleTotal: number;
  patentFiled: number;
  patentPending: number;
  websiteActive: number;
  websiteFuture: number;
  projectTotal: number;
  pendingBugs: number;
  companyTotal: number;
}

interface CircularChartData {
  label: string;
  value: number;
  color: string;
  gradientColors?: [string, string];
}

function AnimatedCircularProgressChart({ data, totalTasks }: { data: CircularChartData[]; totalTasks: number }) {
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  
  const animatedValues = useRef(data.map(() => new Animated.Value(0))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ...data.map((_, index) =>
        Animated.timing(animatedValues[index], {
          toValue: 1,
          duration: 1200,
          delay: index * 100,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, [data]);

  let currentAngle = 0;

  return (
    <View style={chartStyles.container}>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Svg width={size} height={size}>
          <Defs>
            {data.map((item, idx) => (
              <SvgLinearGradient key={`grad-${idx}`} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={item.gradientColors?.[0] || item.color} stopOpacity="1" />
                <Stop offset="100%" stopColor={item.gradientColors?.[1] || item.color} stopOpacity="1" />
              </SvgLinearGradient>
            ))}
          </Defs>
          <SvgCircle cx={center} cy={center} r={radius} stroke={Colors.background || '#0d1117'} strokeWidth={strokeWidth} fill="transparent" />
          <SvgCircle cx={center} cy={center} r={radius} stroke="rgba(0,0,0,0.03)" strokeWidth={strokeWidth - 2} fill="transparent" />
          {data.map((item, index) => {
            const percentage = totalTasks > 0 ? item.value / totalTasks : 0;
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
      </Animated.View>
      <View style={chartStyles.center}>
        <Text style={chartStyles.totalValue}>{totalTasks}</Text>
        <Text style={chartStyles.totalLabel}>Active Tasks</Text>
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const chartStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface || '#21262d',
    width: 100,
    height: 100,
    borderRadius: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  totalLabel: { fontSize: 10, color: Colors.textTertiary || '#8b949e', marginTop: 2 },
  totalValue: { fontSize: 26, fontWeight: '700', color: Colors.surface || '#fff' },
});

function FixedStatCard({ 
  icon: Icon, 
  value, 
  label, 
  colors, 
  onPress 
}: { 
  icon: any; 
  value: number | string; 
  label: string; 
  colors: [string, string]; 
  onPress: () => void;
}) {
  return (
    <View style={styles.fixedStatCard}>
      <TouchableOpacity 
        activeOpacity={0.85} 
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Icon size={15} color={Colors.surface || '#21262d'} />
            </View>
            <Text style={styles.cardValue}>{value}</Text>
          </View>
          <Text style={styles.cardLabel} numberOfLines={1}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function CollapsibleTeamRow({ teamLead, mappings }: { teamLead: string; mappings: TeamLeadMapping[] }) {
  const [expanded, setExpanded] = useState(false);
  const animationController = useRef(new Animated.Value(0)).current;

  const toggleLayout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.timing(animationController, { toValue, duration: 200, useNativeDriver: false }).start();
  };

  const heightInterpolate = animationController.interpolate({
    inputRange: [0, 1],
    outputRange: [0, mappings.length * 40 + 8],
  });

  return (
    <View style={styles.teamRowContainer}>
      <TouchableOpacity style={styles.teamRowHeader} onPress={toggleLayout} activeOpacity={0.7}>
        <View style={styles.teamRowInfo}>
          <View style={styles.teamRowIconBg}><Users size={14} color={Colors.primary || '#1f6feb'} /></View>
          <View>
            <Text style={styles.teamRowLeadName}>{teamLead}</Text>
            <Text style={styles.teamRowSub}>{mappings.length} members</Text>
          </View>
        </View>
        {expanded ? <ChevronUp size={14} color={Colors.textTertiary || '#8b949e'} /> : <ChevronDown size={14} color={Colors.textTertiary || '#8b949e'} />}
      </TouchableOpacity>
      
      <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
        <View style={styles.teamChildrenList}>
          {mappings.map((mapping, idx) => (
            <View key={idx} style={styles.teamChildItem}>
              <Text style={styles.teamChildName}>• {mapping.user}</Text>
              {mapping.allowOverrideAdminAssignments && (
                <View style={styles.overrideTag}><Text style={styles.overrideTagText}>Override</Text></View>
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

export default function ManagerHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Central summary data query integration
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<DashboardSummary>({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const res = await apiRequest<DashboardSummary>('/dashboard/summary');
      return res.data;
    },
  });

  const { data: teamMappings = [] } = useQuery<TeamLeadMapping[]>({
    queryKey: ['teamLeadMappings'],
    queryFn: async () => {
      try {
        const res = await apiRequest<{ items?: TeamLeadMapping[] }>('/team-lead-mappings');
        return res.data?.items || [];
      } catch { return []; }
    }
  });

  // Calculate dynamic scope parameters based directly on summary statistics payload
  const metrics = useMemo(() => {
    const activeTasks = summary?.activeTasks ?? 0;
    const overdueTasks = summary?.overdueTasks ?? 0;
    const dueToday = summary?.dueToday ?? 0;

    // Standard baseline task metric tracking calculation
    const completedTasks = Math.max(0, activeTasks - overdueTasks);
    const completionRate = activeTasks > 0 ? Math.round((completedTasks / activeTasks) * 100) : 100;

    return {
      activeTasks,
      overdueTasks,
      dueToday,
      remainingActive: Math.max(0, activeTasks - overdueTasks - dueToday),
      completionRate: Math.max(0, Math.min(completionRate, 100))
    };
  }, [summary]);

  const chartData = useMemo<CircularChartData[]>(() => {
    return [
      { label: 'Overdue', value: metrics.overdueTasks, color: '#EF4444', gradientColors: ['#EF4444', '#DC2626'] },
      { label: 'Due Today', value: metrics.dueToday, color: '#F59E0B', gradientColors: ['#F59E0B', '#D97706'] },
      { label: 'Active Progress', value: metrics.remainingActive, color: '#3B82F6', gradientColors: ['#3B82F6', '#2563EB'] },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  const teamsByLead = useMemo(() => {
    const grouped: Record<string, TeamLeadMapping[]> = {};
    teamMappings.forEach(mapping => {
      if (!grouped[mapping.teamLead]) grouped[mapping.teamLead] = [];
      grouped[mapping.teamLead].push(mapping);
    });
    return grouped;
  }, [teamMappings]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchSummary()]);
    setRefreshing(false);
  }, [refetchSummary]);

  if (summaryLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary || '#1f6feb'} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.fullName || 'Manager'}</Text>
      </View>

      <ScrollView
        style={styles.scrollBody}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GRID_PADDING }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary || '#1f6feb'} />}
      >
        <Text style={styles.sectionHeading}>Dashboard Summary</Text>
        
        {/* RIGID METRIC 3x3 MATRIX GRID CONTAINER */}
        <View style={styles.matrixGrid}>
          {/* Row 1 */}
          <FixedStatCard icon={FolderRoot} value={summary?.projectTotal ?? 0} label="Projects" colors={['#7C3AED', '#6D28D9']} onPress={() => router.push('/(manager)/tasks')} />
          <FixedStatCard icon={ClipboardCheck} value={metrics.activeTasks} label="Tasks" colors={['#22C55E', '#15803D']} onPress={() => router.push('/(manager)/tasks')} />
          <FixedStatCard icon={ClipboardList} value={metrics.dueToday} label="Due Today" colors={['#F59E0B', '#B45309']} onPress={() => router.push('/(manager)/tasks')} />

          {/* Row 2 */}
          <FixedStatCard icon={ClipboardList} value={metrics.overdueTasks} label="Overdue" colors={['#EF4444', '#B91C1C']} onPress={() => router.push('/(manager)/tasks')} />
          <FixedStatCard icon={Clock} value={`${summary?.hoursLoggedToday ?? 0}h`} label="Hours Logged" colors={['#10B981', '#047857']} onPress={() => router.push('/(manager)/tasks')} />
          <FixedStatCard icon={Users} value={summary?.employeeTotal ?? 0} label="Employees" colors={['#06B6D4', '#0E7490']} onPress={() => router.push('/(manager)/team')} />

          {/* Row 3 */}
          <FixedStatCard icon={MapPin} value={summary?.companyTotal ?? 0} label="Companies" colors={['#0D9488', '#0F766E']} onPress={() => router.push('/(manager)/companies')} />
          <FixedStatCard icon={Car} value={summary?.vehicleTotal ?? 0} label="Vehicles" colors={['#F97316', '#C2410C']} onPress={() => router.push('/(manager)/vehicles')} />
          <FixedStatCard icon={Bug} value={summary?.pendingBugs ?? 0} label="Bugs" colors={['#E11D48', '#BE123C']} onPress={() => router.push('/(manager)/bug')} />
        </View>

        {/* Task Completion Progress Metric Box */}
        <View style={styles.bannerContainer}>
          <View style={styles.bannerHeader}>
            <View style={styles.awardBg}><Award size={14} color={Colors.primary || '#1f6feb'} /></View>
            <Text style={styles.bannerTitle}>Task Progress Flow: {metrics.completionRate}% On Schedule</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${metrics.completionRate}%` }]} />
          </View>
        </View>

        {/* Analytics Breakdown */}
        <View style={styles.analyticsSection}>
          <View style={styles.analyticsHeader}>
            <Sparkles size={14} color={Colors.primary || '#1f6feb'} />
            <Text style={styles.analyticsTitle}>Task Analytics</Text>
          </View>
          <View style={styles.chartBox}>
            <AnimatedCircularProgressChart data={chartData} totalTasks={metrics.activeTasks} />
          </View>
        </View>

        {/* Corporate Operations Team Framework allocations */}
        <View style={styles.structureSection}>
          <View style={styles.analyticsHeader}>
            <UserCog size={14} color={Colors.primary || '#1f6feb'} />
            <Text style={styles.analyticsTitle}>Team Structural Layouts</Text>
          </View>
          <View style={styles.structureBox}>
            {Object.keys(teamsByLead).length === 0 ? (
              <Text style={styles.emptyText}>No configuration records available.</Text>
            ) : (
              Object.entries(teamsByLead).map(([lead, members]) => (
                <CollapsibleTeamRow key={lead} teamLead={lead} mappings={members} />
              ))
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background || '#0d1117' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background || '#0d1117' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: Colors.background || '#21262d',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  greeting: { fontSize: 13, color: Colors.textTertiary || '#8b949e' },
  userName: { fontSize: 20, fontWeight: '700', color: Colors.surface || '#fff', marginTop: 1 },
  scrollBody: { flex: 1 },
  sectionHeading: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary || '#c9d1d9', marginTop: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  matrixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    width: '100%',
  },
  fixedStatCard: {
    width: CARD_WIDTH,
  borderRadius: 14,
  overflow: 'hidden',
  backgroundColor: Colors.surface || '#21262d',
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  },
  cardGradient: { padding: 14,
  height: 110,
  justifyContent: 'space-between', },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconContainer: {  width: 28,
  height: 28,
  borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: 20,
  fontWeight: '800',
  color: '#fff', },
  cardLabel: { fontSize: 12,
  fontWeight: '600',
  color: '#fff', },
  bannerContainer: { marginTop: 16, padding: 12, backgroundColor: Colors.surface || '#21262d', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  awardBg: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(59, 130, 246, 0.05)', alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 11, fontWeight: '600', color: Colors.surface || '#fff' },
  progressBarBg: { height: 5, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 2.5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary || '#1f6feb' },
  analyticsSection: { marginTop: 16 },
  analyticsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  analyticsTitle: { fontSize: 13, fontWeight: '600', color: Colors.surface || '#fff' },
  chartBox: { backgroundColor: Colors.surface || '#21262d', borderRadius: 12, padding: 14, alignItems: 'center' },
  structureSection: { marginTop: 16 },
  structureBox: { backgroundColor: Colors.surface || '#21262d', borderRadius: 12, padding: 10, gap: 6 },
  teamRowContainer: { borderWidth: 1, borderColor: 'rgba(0,0,0,0.03)', borderRadius: 8, overflow: 'hidden' },
  teamRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, backgroundColor: 'rgba(0,0,0,0.01)' },
  teamRowInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamRowIconBg: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(59, 130, 246, 0.05)', alignItems: 'center', justifyContent: 'center' },
  teamRowLeadName: { fontSize: 12, fontWeight: '600', color: Colors.surface || '#fff' },
  teamRowSub: { fontSize: 10, color: Colors.textTertiary || '#8b949e' },
  teamChildrenList: { paddingHorizontal: 10, paddingBottom: 6 },
  teamChildItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 32 },
  teamChildName: { fontSize: 11, color: Colors.textSecondary || '#c9d1d9' },
  overrideTag: { backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  overrideTagText: { fontSize: 8, color: '#D97706', fontWeight: '600' },
  emptyText: { fontSize: 11, color: Colors.textTertiary || '#8b949e', textAlign: 'center', padding: 10 }
});