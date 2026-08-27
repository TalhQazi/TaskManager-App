import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
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
  AlertTriangle,
  Utensils,
  Coffee,
  Timer,
  CheckCircle,
  ArrowRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";

import { apiFetch, getEODStatus } from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";
import { isDarkTheme } from "@/constants/design/presets";

const CARD_WIDTH = (wp(100) - wp(8) - wp(2)) / 2.3;

interface TeamLeadMapping {
  teamLead: string;
  user: string;
  allowOverrideAdminAssignments: boolean;
}

interface DashboardSummary {
  activeTasks: number;
  dueToday: number;
  overdueTasks: number;
  employeesWorking: number;
  employeeTotal: number;
  hoursLoggedToday: number;
  avgHoursPerEmployee: number;
  projectTotal: number;
  vehicleTotal: number;
  locationTotal: number;
  companyTotal?: number;
  pendingBugs?: number;
}

interface CircularChartData {
  label: string;
  value: number;
  color: string;
  gradientColors?: [string, string];
}

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background: isDark ? "#090d13" : "#f8fafc",
    surface: isDark ? "#0d1117" : "#ffffff",
    surfaceMuted: isDark ? "#161b22" : "#f1f5f9",
    border: isDark ? "#21262d" : "#e2e8f0",
    text: isDark ? "#c9d1d9" : "#0f172a",
    textBold: isDark ? "#f0f6fc" : "#020617",
    textMuted: isDark ? "#8b949e" : "#64748b",
    primary: "#0ea5e9",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  };
}

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const AnimatedCircularProgressChart = memo(function AnimatedCircularProgressChart({
  data,
  totalTasks,
  themeColors,
}: {
  data: CircularChartData[];
  totalTasks: number;
  themeColors: any;
}) {
  const size = wp(32);
  const strokeWidth = wp(4);
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
    <View style={s(styles.chartWrapper)}>
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
          <SvgCircle cx={center} cy={center} r={radius} stroke={themeColors.surfaceMuted} strokeWidth={strokeWidth} fill="transparent" />
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
      <View style={s([styles.chartCenterText, { backgroundColor: themeColors.surface, borderColor: themeColors.border, width: wp(18), height: wp(18), borderRadius: wp(9) }])}>
        <Text style={s([styles.chartMainValue, { color: themeColors.textBold }])}>{totalTasks}</Text>
        <Text style={s([styles.chartSubLabel, { color: themeColors.textMuted }])}>Active</Text>
      </View>
    </View>
  );
});

const FixedStatCard = memo(function FixedStatCard({
  icon: Icon,
  value,
  label,
  colors,
  onPress,
}: {
  icon: any;
  value: number | string;
  label: string;
  colors: [string, string];
  onPress: () => void;
}) {
  return (
    <View style={s(styles.statCardContainer)}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s(styles.statCardGradient)}>
          <View style={s(styles.statCardHeader)}>
            <View style={s(styles.statCardIconWrapper)}>
              <Icon size={fs(3.5)} color="#FFFFFF" />
            </View>
            <Text style={s(styles.statCardValue)}>{value}</Text>
          </View>
          <Text style={s(styles.statCardLabel)} numberOfLines={1}>
            {label}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
});

const CollapsibleTeamRow = memo(function CollapsibleTeamRow({
  teamLead,
  mappings,
  themeColors,
}: {
  teamLead: string;
  mappings: TeamLeadMapping[];
  themeColors: any;
}) {
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
    outputRange: [0, mappings.length * hp(5) + hp(1)],
  });

  return (
    <View style={s([styles.teamRowBorder, { borderColor: themeColors.border }])}>
      <TouchableOpacity style={s([styles.teamRowHeader, { backgroundColor: themeColors.surfaceMuted }])} onPress={toggleLayout} activeOpacity={0.7}>
        <View style={s(styles.teamRowLeft)}>
          <View style={s([styles.teamRowIconContainer, { backgroundColor: themeColors.primary + "15" }])}>
            <Users size={fs(4)} color={themeColors.primary} />
          </View>
          <View>
            <Text style={s([styles.teamRowLeadText, { color: themeColors.textBold }])}>{teamLead}</Text>
            <Text style={s([styles.teamRowSubText, { color: themeColors.textMuted }])}>
              {mappings.length} team member{mappings.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        {expanded ? <ChevronUp size={fs(4)} color={themeColors.textMuted} /> : <ChevronDown size={fs(4)} color={themeColors.textMuted} />}
      </TouchableOpacity>

      <Animated.View style={{ height: heightInterpolate, overflow: "hidden" }}>
        <View style={s(styles.teamChildrenWrapper)}>
          {mappings.map((mapping, idx) => (
            <View key={idx} style={s([styles.teamChildItem, { borderBottomColor: themeColors.border + "30", borderBottomWidth: idx === mappings.length - 1 ? 0 : 1 }])}>
              <View style={s(styles.teamChildLeft)}>
                <View style={s([styles.teamChildAvatar, { backgroundColor: themeColors.success + "15" }])}>
                  <Text style={s([styles.teamChildAvatarText, { color: themeColors.success }])}>
                    {mapping.user.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={s([styles.teamChildName, { color: themeColors.text }])}>{mapping.user}</Text>
              </View>
              {mapping.allowOverrideAdminAssignments && (
                <View style={s(styles.overrideBadge)}>
                  <Text style={s(styles.overrideBadgeText)}>Can Override</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
});

/* Isolated StatusPanel to prevent 1-second timer updates from re-rendering the whole dashboard */
const StatusPanel = memo(function StatusPanel({
  profile,
  statusActionLoading,
  handleStartLunch,
  handleEndLunch,
  handleStartBreak,
  handleEndBreak,
  colors,
}: {
  profile: any;
  statusActionLoading: boolean;
  handleStartLunch: () => void;
  handleEndLunch: () => void;
  handleStartBreak: () => void;
  handleEndBreak: () => void;
  colors: any;
}) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!profile) {
      setTimeLeft(null);
      return;
    }

    const currentStatus = profile.current_status || "AVAILABLE";
    if (currentStatus === "AVAILABLE") {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const now = Date.now();
      let targetTime = 0;

      if (currentStatus === "LUNCH") {
        targetTime = profile.lunch_expected_end ? new Date(profile.lunch_expected_end).getTime() : 0;
      } else if (currentStatus === "BREAK") {
        const startTime = profile.break_start_time ? new Date(profile.break_start_time).getTime() : 0;
        targetTime = startTime + 15 * 60 * 1000;
      }

      if (!targetTime) {
        setTimeLeft(null);
        return;
      }

      const diff = Math.max(0, Math.round((targetTime - now) / 1000));
      setTimeLeft(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [profile]);

  const formatTimeLeft = (sec: number | null) => {
    if (sec === null) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <View
      style={s([
        styles.statusPanel,
        {
          borderColor:
            profile?.current_status === "LUNCH"
              ? "#B45309"
              : profile?.current_status === "BREAK"
              ? "#7C3AED"
              : colors.border,
          backgroundColor: colors.surface,
        },
      ])}
    >
      <View style={s(styles.statusPanelTop)}>
        <View style={s(styles.statusAvatarSide)}>
          <View style={s([styles.statusIconBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}>
            {profile?.current_status === "LUNCH" ? (
              <Utensils size={fs(6)} color="#F97316" />
            ) : profile?.current_status === "BREAK" ? (
              <Coffee size={fs(6)} color="#8B5CF6" />
            ) : (
              <CheckCircle size={fs(6)} color="#10B981" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
              <Text style={{ fontSize: fs(4.2), fontWeight: "700", color: colors.textBold }}>
                {profile?.current_status === "LUNCH"
                  ? "On Lunch Break"
                  : profile?.current_status === "BREAK"
                  ? "On Short Break"
                  : "Available"}
              </Text>
              {profile?.current_status !== "AVAILABLE" && (
                <View style={s([styles.activeIndicator, { backgroundColor: colors.background, borderColor: colors.border }])}>
                  <Text style={{ fontSize: fs(2.8), fontWeight: "600", color: colors.text }}>Active</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: fs(3.2), color: colors.textMuted, marginTop: hp(0.25) }}>
              {profile?.current_status === "LUNCH"
                ? "Dining or away from station"
                : profile?.current_status === "BREAK"
                ? "Stepped away for a moment"
                : "Ready for tasks and coordination"}
            </Text>
          </View>
        </View>

        <View style={s(styles.statusControlRow)}>
          {profile?.current_status !== "AVAILABLE" && timeLeft !== null && (
            <View style={s([styles.timerFrame, { backgroundColor: colors.background, borderColor: colors.border }])}>
              <Timer size={fs(3.5)} color={colors.textMuted} />
              <Text style={{ fontSize: fs(3), color: colors.textMuted }}>Remaining:</Text>
              <Text style={s([styles.timerText, { color: colors.primary }])}>{formatTimeLeft(timeLeft)}</Text>
            </View>
          )}

          <View style={s(styles.statusActionButtons)}>
            {profile?.current_status === "AVAILABLE" ? (
              <>
                <TouchableOpacity disabled={statusActionLoading} onPress={handleStartLunch} style={s(styles.lunchBtn)}>
                  <Utensils size={fs(3.5)} color="#FFFFFF" />
                  <Text style={s(styles.btnText)}>Go to Lunch</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={statusActionLoading} onPress={handleStartBreak} style={s(styles.breakBtn)}>
                  <Coffee size={fs(3.5)} color="#FFFFFF" />
                  <Text style={s(styles.btnText)}>Go on Break</Text>
                </TouchableOpacity>
              </>
            ) : profile?.current_status === "LUNCH" ? (
              <TouchableOpacity disabled={statusActionLoading} onPress={handleEndLunch} style={s(styles.endStatusBtn)}>
                <CheckCircle size={fs(3.5)} color="#FFFFFF" />
                <Text style={s(styles.btnText)}>End Lunch</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={statusActionLoading} onPress={handleEndBreak} style={s(styles.endStatusBtn)}>
                <CheckCircle size={fs(3.5)} color="#FFFFFF" />
                <Text style={s(styles.btnText)}>End Break</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
});

export default function ManagerHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const { uiTheme } = useTheme();

  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);

  const [eodStats, setEodStats] = useState({ submitted: 0, late: 0, missing: 0, total: 0 });
  const [pendingBugs, setPendingBugs] = useState(0);
  const [teamMappings, setTeamMappings] = useState<TeamLeadMapping[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isTeamLead = user?.role === "manager" || user?.role === "employee";

  const normalizeProfile = useCallback((emp: any) => {
    if (!emp) return null;
    return {
      ...emp,
      id: emp.id || String(emp._id || ""),
      current_status: emp.current_status || "AVAILABLE",
      lunch_start_time: emp.lunch_start_time || null,
      lunch_expected_end: emp.lunch_expected_end || null,
      break_start_time: emp.break_start_time || null,
    };
  }, []);

  /* Unblocked parallel API fetch - renders data progressively */
  const loadDashboardData = useCallback(async () => {
    try {
      setApiError(null);
      const endpoint = isTeamLead ? "/api/team-lead-mappings/me" : "/api/team-lead-mappings";

      const summaryPromise = apiFetch<DashboardSummary>("/api/dashboard/summary")
        .then((res) => { if (res) setSummary(res); })
        .catch(() => null);

      const profilePromise = apiFetch<{ item: any }>("/api/employees/me")
        .then((res) => { if (res?.item) setProfile(normalizeProfile(res.item)); })
        .catch(() => null);

      const eodPromise = getEODStatus()
        .then((eodRes) => {
          const eodItems = eodRes?.items || [];
          setEodStats({
            submitted: eodItems.filter((i: any) => i.status === "submitted").length,
            late: eodItems.filter((i: any) => i.status === "late").length,
            missing: eodItems.filter((i: any) => i.status === "missing").length,
            total: eodItems.length,
          });
        })
        .catch(() => null);

      const bugsPromise = apiFetch<{ items?: any[] }>("/api/bugs")
        .then((bugsRes) => {
          const bugItems = Array.isArray(bugsRes?.items) ? bugsRes.items : [];
          setPendingBugs(bugItems.filter((b: any) => b.status !== "closed").length);
        })
        .catch(() => null);

      const mappingsPromise = apiFetch<{ items: TeamLeadMapping[] }>(endpoint)
        .then((res) => { if (res?.items) setTeamMappings(res.items); })
        .catch(() => null);

      await Promise.all([summaryPromise, profilePromise, eodPromise, bugsPromise, mappingsPromise]);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to sync system parameters.");
    } finally {
      setLoading(false);
    }
  }, [isTeamLead, normalizeProfile]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  useEffect(() => {
    if (!socket || !profile?.id) return;

    const handleStatusUpdate = (payload: {
      userId: string;
      current_status: "AVAILABLE" | "LUNCH" | "BREAK";
      lunch_start_time: string | null;
      lunch_expected_end: string | null;
      break_start_time: string | null;
      name: string;
    }) => {
      if (payload.userId === profile.id) {
        setProfile((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            current_status: payload.current_status,
            lunch_start_time: payload.lunch_start_time,
            lunch_expected_end: payload.lunch_expected_end,
            break_start_time: payload.break_start_time,
          };
        });
      }
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket, profile?.id]);

  const handleStartLunch = useCallback(async () => {
    try {
      setStatusActionLoading(true);
      const res = await apiFetch<{ ok: boolean; employee: any }>("/api/user/status/start-lunch", { method: "POST" });
      if (res.ok) setProfile(normalizeProfile(res.employee));
    } catch {
      // Quiet fail
    } finally {
      setStatusActionLoading(false);
    }
  }, [normalizeProfile]);

  const handleEndLunch = useCallback(async () => {
    try {
      setStatusActionLoading(true);
      const res = await apiFetch<{ ok: boolean; employee: any }>("/api/user/status/end-lunch", { method: "POST" });
      if (res.ok) setProfile(normalizeProfile(res.employee));
    } catch {
      // Quiet fail
    } finally {
      setStatusActionLoading(false);
    }
  }, [normalizeProfile]);

  const handleStartBreak = useCallback(async () => {
    try {
      setStatusActionLoading(true);
      const res = await apiFetch<{ ok: boolean; employee: any }>("/api/user/status/start-break", { method: "POST" });
      if (res.ok) setProfile(normalizeProfile(res.employee));
    } catch {
      // Quiet fail
    } finally {
      setStatusActionLoading(false);
    }
  }, [normalizeProfile]);

  const handleEndBreak = useCallback(async () => {
    try {
      setStatusActionLoading(true);
      const res = await apiFetch<{ ok: boolean; employee: any }>("/api/user/status/end-break", { method: "POST" });
      if (res.ok) setProfile(normalizeProfile(res.employee));
    } catch {
      // Quiet fail
    } finally {
      setStatusActionLoading(false);
    }
  }, [normalizeProfile]);

  const metrics = useMemo(() => {
    const activeTasks = summary?.activeTasks ?? 43;
    const overdueTasks = summary?.overdueTasks ?? 325;
    const dueToday = summary?.dueToday ?? 0;
    const projectTotal = summary?.projectTotal ?? 26;
    const employeeTotal = summary?.employeeTotal ?? 14;
    const locationTotal = summary?.locationTotal ?? 0;
    const vehicleTotal = summary?.vehicleTotal ?? 15;
    const bugCount = summary?.pendingBugs ?? pendingBugs ?? 9;

    const completedTasks = Math.max(0, activeTasks - overdueTasks);
    const completionRate = activeTasks > 0 ? Math.round((completedTasks / activeTasks) * 100) : 0;

    return {
      activeTasks,
      overdueTasks,
      dueToday,
      remainingActive: Math.max(0, activeTasks - dueToday),
      completionRate: Math.max(0, Math.min(completionRate, 100)),
      totalProjects: projectTotal,
      totalEmployees: employeeTotal,
      totalLocations: locationTotal,
      totalVehicles: vehicleTotal,
      pendingBugs: bugCount,
    };
  }, [summary, pendingBugs]);

  const chartData = useMemo<CircularChartData[]>(() => {
    const items: CircularChartData[] = [
      { label: "Overdue", value: metrics.overdueTasks, color: "#EF4444", gradientColors: ["#EF4444", "#DC2626"] },
      { label: "Due Today", value: metrics.dueToday, color: "#F59E0B", gradientColors: ["#F59E0B", "#D97706"] },
      { label: "Active Progress", value: metrics.remainingActive, color: "#3B82F6", gradientColors: ["#3B82F6", "#2563EB"] },
    ];

    return items.filter((item) => item.value > 0);
  }, [metrics]);

  const teamsByLead = useMemo(() => {
    const grouped: Record<string, TeamLeadMapping[]> = {};
    teamMappings.forEach((mapping) => {
      if (!grouped[mapping.teamLead]) grouped[mapping.teamLead] = [];
      grouped[mapping.teamLead].push(mapping);
    });
    return grouped;
  }, [teamMappings]);

  if (loading && !refreshing) {
    return (
      <View style={s([styles.centered, { backgroundColor: colors.background }])}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={s([styles.appHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }])}>
        <Text style={{ fontSize: fs(3.2), color: colors.textMuted }}>Welcome back,</Text>
        <Text style={{ fontSize: fs(5.8), fontWeight: "800", color: colors.textBold, marginTop: hp(0.25) }}>
          {user?.fullName || "Manager"}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s(styles.scrollContainer)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <StatusPanel
          profile={profile}
          statusActionLoading={statusActionLoading}
          handleStartLunch={handleStartLunch}
          handleEndLunch={handleEndLunch}
          handleStartBreak={handleStartBreak}
          handleEndBreak={handleEndBreak}
          colors={colors}
        />

        <Text style={s([styles.sectionHeading, { color: colors.textMuted }])}>Dashboard Summary</Text>

        <View style={s(styles.statsGrid)}>
          <FixedStatCard icon={FolderRoot} value={metrics.totalProjects} label="Active Projects" colors={["#7C3AED", "#6D28D9"]} onPress={() => router.push("/(manager)/tasks")} />
          <FixedStatCard icon={ClipboardCheck} value={metrics.activeTasks} label="Active Tasks" colors={["#22C55E", "#15803D"]} onPress={() => router.push("/(manager)/tasks")} />
          <FixedStatCard icon={ClipboardList} value={eodStats.late} label="EOD Late" colors={["#F59E0B", "#B45309"]} onPress={() => router.push("/(manager)/eod-reports")} />
          <FixedStatCard icon={ClipboardList} value={eodStats.missing} label="EOD Missing" colors={["#EF4444", "#B91C1C"]} onPress={() => router.push("/(manager)/eod-reports")} />
          <FixedStatCard icon={ClipboardList} value={eodStats.submitted} label="EOD Submitted" colors={["#10B981", "#047857"]} onPress={() => router.push("/(manager)/eod-reports")} />
          <FixedStatCard icon={Users} value={metrics.totalEmployees} label="Total Employees" colors={["#06B6D4", "#0E7490"]} onPress={() => router.push("/(manager)/team")} />
          <FixedStatCard icon={MapPin} value={metrics.totalLocations} label="Total Locations" colors={["#0D9488", "#0F766E"]} onPress={() => router.push("/(manager)/locations")} />
          <FixedStatCard icon={Car} value={metrics.totalVehicles} label="Total Vehicles" colors={["#F97316", "#C2410C"]} onPress={() => router.push("/(manager)/vehicles")} />
          <FixedStatCard icon={Bug} value={metrics.pendingBugs} label="Pending Bugs" colors={["#E11D48", "#BE123C"]} onPress={() => router.push("/(manager)/bug")} />
        </View>

        <View style={s([styles.progressBarCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
          <View style={s(styles.progressBarTitleRow)}>
            <View style={s([styles.progressIconBox, { backgroundColor: colors.primary + "15" }])}>
              <Award size={fs(3.5)} color={colors.primary} />
            </View>
            <Text style={s([styles.progressTitle, { color: colors.textBold }])}>
              Task Progress Flow: {metrics.completionRate}% On Schedule
            </Text>
          </View>
          <View style={s([styles.progressTrack, { backgroundColor: colors.background }])}>
            <View style={s([styles.progressFill, { backgroundColor: colors.success, width: `${metrics.completionRate}%` }])} />
          </View>
        </View>

        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockHeader)}>
            <Sparkles size={fs(3.5)} color={colors.primary} />
            <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Task Analytics & Distribution</Text>
          </View>

          <View style={s([styles.analyticsCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
            <View style={s(styles.chartSideWrapper)}>
              <AnimatedCircularProgressChart data={chartData} totalTasks={metrics.activeTasks} themeColors={colors} />

              <View style={s(styles.chartLabelsColumn)}>
                <View style={s(styles.chartLabelRow)}>
                  <View style={s([styles.colorDot, { backgroundColor: "#3B82F6" }])} />
                  <Text style={s([styles.chartLabelText, { color: colors.text }])}>In Progress: 12%</Text>
                </View>
                <View style={s(styles.chartLabelRow)}>
                  <View style={s([styles.colorDot, { backgroundColor: "#EF4444" }])} />
                  <Text style={s([styles.chartLabelText, { color: colors.text }])}>Pending: 88%</Text>
                </View>
              </View>
            </View>

            <View style={s([styles.weeklyChartWrapper, { borderTopColor: colors.border }])}>
              <Text style={s([styles.weeklyChartTitle, { color: colors.textBold }])}>Weekly Task Overview</Text>
              <View style={s(styles.weeklyBarRow)}>
                {[
                  { day: "Mon", h: 40 },
                  { day: "Tue", h: 65 },
                  { day: "Wed", h: 30 },
                  { day: "Thu", h: 75 },
                  { day: "Fri", h: 50 },
                  { day: "Sat", h: 15 },
                  { day: "Sun", h: 10 },
                ].map((item, idx) => (
                  <View key={idx} style={s(styles.barItem)}>
                    <View style={s([styles.barTrack, { backgroundColor: colors.surfaceMuted }])}>
                      <View style={s([styles.barFill, { backgroundColor: colors.primary, height: `${item.h}%` }])} />
                    </View>
                    <Text style={s([styles.barDayText, { color: colors.textMuted }])}>{item.day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockInteractiveHeader)}>
            <View style={s(styles.blockTitleLeft)}>
              <ClipboardList size={fs(3.8)} color={colors.primary} />
              <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Recent Tasks</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(manager)/tasks")} style={s(styles.viewAllBtn)}>
              <Text style={s([styles.viewAllText, { color: colors.primary }])}>View all</Text>
              <ArrowRight size={fs(3)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={s([styles.listContainerCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
            {[
              { title: "TQ Software System Update", spec: "Software", p: "medium", count: 1, s: "Pending" },
              { title: "Database Migration Schema", spec: "Software", p: "high", count: 1, s: "Pending", date: "2026-07-01" },
              { title: "Client Web Frontend Launch", spec: "Website", p: "high", count: 2, s: "Pending" },
              { title: "UI Redesign Deployment Layer", spec: "UI upgrade", p: "high", count: 1, s: "In Progress", date: "2026-07-01" },
            ].map((task, i) => (
              <View key={i} style={s([styles.taskItemRow, { backgroundColor: colors.surfaceMuted }])}>
                <View style={s(styles.taskItemLeft)}>
                  <Text style={s([styles.taskItemTitle, { color: colors.textBold }])} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={s([styles.taskItemSub, { color: colors.textMuted }])}>
                    {task.spec} • {task.count} assigned {task.date ? `• ${task.date}` : ""}
                  </Text>
                </View>
                <View style={s(styles.taskBadgeRow)}>
                  <View style={s([styles.priorityBadge, { backgroundColor: task.p === "high" ? colors.danger + "20" : colors.warning + "20" }])}>
                    <Text style={s([styles.priorityText, { color: task.p === "high" ? colors.danger : colors.warning }])}>{task.p}</Text>
                  </View>
                  <View style={s([styles.statusBadge, { backgroundColor: task.s === "In Progress" ? colors.info + "20" : colors.border }])}>
                    <Text style={s([styles.statusText, { color: task.s === "In Progress" ? colors.info : colors.text }])}>{task.s}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockInteractiveHeader)}>
            <View style={s(styles.blockTitleLeft)}>
              <Users size={fs(3.8)} color={colors.primary} />
              <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Active Employees</Text>
            </View>
            <TouchableOpacity onPress={() => router.push("/(manager)/team")} style={s(styles.viewAllBtn)}>
              <Text style={s([styles.viewAllText, { color: colors.primary }])}>View all</Text>
              <ArrowRight size={fs(3)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={s([styles.listContainerCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
            {[
              { name: "Adeneye Abdulrahman", role: "Coder", code: "AA" },
              { name: "Aqib Saeed", role: "Coder", code: "AS" },
              { name: "Cheyenne Bragdon", role: "Employee", code: "CB" },
            ].map((emp, i) => (
              <View key={i} style={s([styles.employeeItemRow, { backgroundColor: colors.surfaceMuted }])}>
                <View style={s([styles.employeeAvatar, { backgroundColor: colors.primary + "20" }])}>
                  <Text style={s([styles.employeeAvatarText, { color: colors.primary }])}>{emp.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s([styles.employeeName, { color: colors.textBold }])}>{emp.name}</Text>
                  <Text style={s([styles.employeeRole, { color: colors.textMuted }])}>{emp.role}</Text>
                </View>
                <View style={s([styles.activeStatusBadge, { backgroundColor: colors.success + "15" }])}>
                  <View style={s([styles.activeDot, { backgroundColor: colors.success }])} />
                  <Text style={s([styles.activeText, { color: colors.success }])}>active</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockHeader)}>
            <ClipboardList size={fs(3.8)} color={colors.primary} />
            <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Overdue Overview</Text>
          </View>

          <View style={s([styles.overdueTaskCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
            <View style={s([styles.overdueHeaderRow, { borderBottomColor: colors.border }])}>
              <Text style={s([styles.overdueTitleText, { color: colors.danger }])}>Overdue ({metrics.overdueTasks})</Text>
              <Text style={{ fontSize: fs(2.8), color: colors.textMuted }}>0 tasks scheduled</Text>
            </View>

            <ScrollView style={{ maxHeight: hp(28) }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
              {[
                "Deploy mobile app",
                "Clear case manufacturer",
                "Jim Jordan",
                "UI redesign",
                "Liberty background",
                "Get me a call with this guy please",
                "Contact her",
                "Legal funds",
                "Web edits",
                "Web and mobile",
                "Maine pulse",
                "Digital assets",
              ].map((item, idx) => (
                <View key={idx} style={s([styles.overdueItemRow, { borderBottomColor: colors.border + "30" }])}>
                  <Text style={s([styles.overdueItemName, { color: colors.text }])} numberOfLines={1}>
                    {item}
                  </Text>
                  <Text style={{ fontSize: fs(2.8), color: colors.danger, fontWeight: "600" }}>High</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockHeader)}>
            <Clock size={fs(3.8)} color={colors.primary} />
            <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Week Ahead — 7-Day Outlook</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizonScrollStyle)}>
            {[
              { day: "Thu", num: 9, count: 0 },
              { day: "Fri", num: 10, count: 0 },
              { day: "Sat", num: 11, count: 0 },
              { day: "Sun", num: 12, count: 0 },
              { day: "Mon", num: 13, count: 0 },
              { day: "Tue", num: 14, count: 0 },
              { day: "Wed", num: 15, count: 0 },
            ].map((outlook, idx) => (
              <View
                key={idx}
                style={s([
                  styles.horizonCard,
                  {
                    backgroundColor: idx === 0 ? colors.primary + "15" : colors.surface,
                    borderColor: idx === 0 ? colors.primary : colors.border,
                  },
                ])}
              >
                <Text style={{ fontSize: fs(2.8), color: colors.textMuted, textTransform: "uppercase" }}>{outlook.day}</Text>
                <Text style={s([styles.horizonNum, { color: colors.textBold }])}>{outlook.num}</Text>
                <Text style={{ fontSize: fs(2.5), color: colors.textMuted }}>{outlook.count} tasks</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {(user?.role === "manager" || user?.role === "admin") && (
          <View style={s(styles.blockContainer)}>
            <View style={s(styles.blockHeader)}>
              <UserCog size={fs(3.5)} color={colors.primary} />
              <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Team Structure</Text>
            </View>
            <View style={s([styles.listContainerCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
              {Object.keys(teamsByLead).length === 0 ? (
                <Text style={s([styles.fallbackStructureText, { color: colors.textMuted }])}>
                  No team leads configured yet. Team leads can reassign tasks within their mapped teams.
                </Text>
              ) : (
                Object.entries(teamsByLead).map(([lead, members]) => (
                  <CollapsibleTeamRow key={lead} teamLead={lead} mappings={members} themeColors={colors} />
                ))
              )}
            </View>
          </View>
        )}

        {apiError && (
          <View style={s([styles.errorCard, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "30" }])}>
            <AlertTriangle size={fs(4)} color={colors.danger} />
            <Text style={{ fontSize: fs(3.2), color: colors.danger, flex: 1 }}>{apiError}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justify: "center",
    alignItems: "center",
  },
  appHeader: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(2),
    borderBottomWidth: 1,
    paddingTop: Platform.OS === "android" ? hp(1) : 0,
  },
  scrollContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(5),
  },
  statusPanel: {
    marginTop: hp(2),
    borderRadius: wp(3.5),
    borderWidth: 2,
    padding: wp(4),
  },
  statusPanelTop: {
    gap: hp(1.5),
  },
  statusAvatarSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
  },
  statusIconBox: {
    padding: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
  },
  activeIndicator: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.25),
    borderRadius: wp(1),
    borderWidth: 1,
  },
  statusControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
    width: "100%",
    justifyContent: "space-between",
    marginTop: hp(0.5),
    flexWrap: "wrap",
  },
  timerFrame: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.75),
    borderRadius: wp(2),
    borderWidth: 1,
  },
  timerText: {
    fontSize: fs(3.2),
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  statusActionButtons: {
    flexDirection: "row",
    gap: wp(2),
    marginLeft: "auto",
    flexWrap: "wrap",
  },
  lunchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    backgroundColor: "#D97706",
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  breakBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    backgroundColor: "#7C3AED",
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  endStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    backgroundColor: "#10B981",
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  btnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: fs(3),
  },
  sectionHeading: {
    fontSize: fs(3),
    fontWeight: "700",
    marginTop: hp(2.8),
    marginBottom: hp(1.5),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(2),
    width: "100%",
  },
  progressBarCard: {
    marginTop: hp(2.2),
    padding: wp(3.5),
    borderRadius: wp(3),
    borderWidth: 1,
  },
  progressBarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    marginBottom: hp(1.5),
  },
  progressIconBox: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    alignItems: "center",
    justifyContent: "center",
  },
  progressTitle: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  progressTrack: {
    height: hp(0.8),
    borderRadius: wp(1),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  blockContainer: {
    marginTop: hp(2.8),
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    marginBottom: hp(1.5),
  },
  blockTitle: {
    fontSize: fs(3.5),
    fontWeight: "700",
  },
  blockInteractiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  blockTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
  },
  viewAllText: {
    fontSize: fs(3),
    fontWeight: "600",
  },
  analyticsCard: {
    borderRadius: wp(3.5),
    padding: wp(4),
    borderWidth: 1,
    gap: hp(2),
  },
  chartSideWrapper: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  chartLabelsColumn: {
    gap: hp(1),
  },
  chartLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
  },
  colorDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
  },
  chartLabelText: {
    fontSize: fs(3),
    fontWeight: "500",
  },
  weeklyChartWrapper: {
    borderTopWidth: 1,
    paddingTop: hp(1.5),
  },
  weeklyChartTitle: {
    fontSize: fs(3.2),
    fontWeight: "600",
    marginBottom: hp(1.2),
  },
  weeklyBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: hp(10),
    paddingHorizontal: wp(2),
    paddingTop: hp(2),
  },
  barItem: {
    alignItems: "center",
    flex: 1,
  },
  barTrack: {
    height: "100%",
    justifyContent: "flex-end",
    width: wp(3),
    borderRadius: wp(1.5),
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
  },
  barDayText: {
    fontSize: fs(2.5),
    marginTop: hp(0.5),
  },
  listContainerCard: {
    borderRadius: wp(3.5),
    padding: wp(3),
    borderWidth: 1,
    gap: hp(1),
  },
  taskItemRow: {
    padding: wp(2.5),
    borderRadius: wp(2),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskItemLeft: {
    flex: 1,
    paddingRight: wp(2),
  },
  taskItemTitle: {
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  taskItemSub: {
    fontSize: fs(2.8),
    marginTop: hp(0.25),
  },
  taskBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
  },
  priorityBadge: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.25),
    borderRadius: wp(1),
  },
  priorityText: {
    fontSize: fs(2.5),
    fontWeight: "700",
    textTransform: "capitalize",
  },
  statusBadge: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.25),
    borderRadius: wp(1),
  },
  statusText: {
    fontSize: fs(2.5),
    fontWeight: "600",
  },
  employeeItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: wp(2),
    borderRadius: wp(2),
  },
  employeeAvatar: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: "center",
    justifyContent: "center",
    marginRight: wp(2.5),
  },
  employeeAvatarText: {
    fontSize: fs(3),
    fontWeight: "700",
  },
  employeeName: {
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  employeeRole: {
    fontSize: fs(2.8),
  },
  activeStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.25),
    borderRadius: wp(1),
  },
  activeDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
  },
  activeText: {
    fontSize: fs(2.5),
    fontWeight: "600",
  },
  overdueTaskCard: {
    borderRadius: wp(3.5),
    padding: wp(3.5),
    borderWidth: 1,
    gap: hp(1.5),
  },
  overdueHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: hp(1),
  },
  overdueTitleText: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  overdueItemRow: {
    paddingVertical: hp(1),
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overdueItemName: {
    fontSize: fs(3.2),
    flex: 1,
    paddingRight: wp(1.5),
  },
  horizonScrollStyle: {
    gap: wp(2),
  },
  horizonCard: {
    width: wp(16),
    padding: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    alignItems: "center",
  },
  horizonNum: {
    fontSize: fs(4.5),
    fontWeight: "800",
    marginVertical: hp(0.25),
  },
  fallbackStructureText: {
    fontSize: fs(3.2),
    textAlign: "center",
    paddingVertical: hp(1.5),
  },
  errorCard: {
    marginTop: hp(2),
    padding: wp(3),
    borderRadius: wp(2),
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  chartCenterText: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  chartMainValue: {
    fontSize: fs(5),
    fontWeight: "800",
  },
  chartSubLabel: {
    fontSize: fs(2.2),
    marginTop: hp(0.1),
  },
  statCardContainer: {
    width: CARD_WIDTH,
    borderRadius: wp(3),
    overflow: "hidden",
  },
  statCardGradient: {
    padding: wp(3),
    height: hp(12),
    justifyContent: "space-between",
  },
  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statCardIconWrapper: {
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: wp(3.25),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statCardValue: {
    fontSize: fs(4.5),
    fontWeight: "800",
    color: "#FFFFFF",
  },
  statCardLabel: {
    fontSize: fs(3),
    fontWeight: "600",
    color: "#FFFFFF",
  },
  teamRowBorder: {
    borderWidth: 1,
    borderRadius: wp(2),
    overflow: "hidden",
    marginBottom: hp(0.75),
  },
  teamRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: wp(3),
  },
  teamRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
  },
  teamRowIconContainer: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: "center",
    justifyContent: "center",
  },
  teamRowLeadText: {
    fontSize: fs(3.5),
    fontWeight: "600",
  },
  teamRowSubText: {
    fontSize: fs(2.8),
  },
  teamChildrenWrapper: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
  },
  teamChildItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: hp(5),
  },
  teamChildLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  teamChildAvatar: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    alignItems: "center",
    justifyContent: "center",
  },
  teamChildAvatarText: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  teamChildName: {
    fontSize: fs(3.2),
  },
  overrideBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.25),
    borderRadius: wp(3),
  },
  overrideBadgeText: {
    fontSize: fs(2.5),
    color: "#D97706",
    fontWeight: "600",
  },
});