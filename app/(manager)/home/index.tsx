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
  ArrowUpRight,
  TrendingUp,
  Briefcase,
  Activity,
  Zap,
  ShieldCheck,
  Layers,
  Calendar,
  Radio,
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
    isDark,
    background: isDark ? "#080C14" : "#F8FAFC",
    surface: isDark ? "#0E1526" : "#FFFFFF",
    surfaceElevated: isDark ? "#131D33" : "#FFFFFF",
    surfaceMuted: isDark ? "#16223B" : "#F1F5F9",
    border: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(226, 232, 240, 0.9)",
    borderHighlight: isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(37, 99, 235, 0.15)",
    text: isDark ? "#E2E8F0" : "#0F172A",
    textBold: isDark ? "#F8FAFC" : "#020617",
    textMuted: isDark ? "#94A3B8" : "#64748B",
    primary: "#38BDF8",
    primaryDark: "#0284C7",
    primaryGlow: "rgba(56, 189, 248, 0.15)",
    success: "#10B981",
    successGlow: "rgba(16, 185, 129, 0.15)",
    warning: "#F59E0B",
    warningGlow: "rgba(245, 158, 11, 0.15)",
    danger: "#F43F5E",
    dangerGlow: "rgba(244, 63, 94, 0.15)",
    purple: "#8B5CF6",
    purpleGlow: "rgba(139, 92, 246, 0.15)",
    cardGradient: isDark
      ? (["#0E1526", "#121A30"] as [string, string])
      : (["#FFFFFF", "#F8FAFC"] as [string, string]),
    heroGradient: isDark
      ? (["#0F1B38", "#0B1226"] as [string, string])
      : (["#EFF6FF", "#DBEAFE"] as [string, string]),
  };
}

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

/* =========================================================================
   1. Animated Circular Donut Chart (Fintech / Executive Grade)
========================================================================= */
const AnimatedCircularProgressChart = memo(function AnimatedCircularProgressChart({
  data,
  totalTasks,
  themeColors,
}: {
  data: CircularChartData[];
  totalTasks: number;
  themeColors: any;
}) {
  const size = wp(36);
  const strokeWidth = wp(3.8);
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
          duration: 1100,
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
          <SvgCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={themeColors.isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
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
      <View
        style={s([
          styles.chartCenterText,
          {
            backgroundColor: themeColors.surfaceElevated,
            borderColor: themeColors.border,
            width: wp(20),
            height: wp(20),
            borderRadius: wp(10),
          },
        ])}
      >
        <Text style={s([styles.chartMainValue, { color: themeColors.textBold }])}>{totalTasks}</Text>
        <Text style={s([styles.chartSubLabel, { color: themeColors.textMuted }])}>ACTIVE</Text>
      </View>
    </View>
  );
});

/* =========================================================================
   2. Executive Status Widget (Dynamic Ambient Glass Pill)
========================================================================= */
const ExecutiveStatusWidget = memo(function ExecutiveStatusWidget({
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

  const isAvailable = profile?.current_status === "AVAILABLE" || !profile?.current_status;
  const isLunch = profile?.current_status === "LUNCH";
  const isBreak = profile?.current_status === "BREAK";

  const statusAccent = isLunch ? colors.warning : isBreak ? colors.purple : colors.success;
  const statusGlow = isLunch ? colors.warningGlow : isBreak ? colors.purpleGlow : colors.successGlow;

  return (
    <View
      style={s([
        styles.statusCard,
        {
          backgroundColor: colors.surface,
          borderColor: isAvailable ? colors.border : statusAccent + "60",
        },
      ])}
    >
      <View style={s(styles.statusCardMainRow)}>
        <View style={s(styles.statusIdentity)}>
          <View style={s([styles.statusPulseOrb, { backgroundColor: statusGlow }])}>
            <View style={s([styles.statusInnerOrb, { backgroundColor: statusAccent }])} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s(styles.statusTitleRow)}>
              <Text style={s([styles.statusTitle, { color: colors.textBold }])}>
                {isLunch ? "Lunch Break Active" : isBreak ? "Short Break Active" : "Operational & Ready"}
              </Text>
              {!isAvailable && (
                <View style={s([styles.statusBadgePill, { backgroundColor: statusGlow, borderColor: statusAccent }])}>
                  <Text style={s([styles.statusBadgeText, { color: statusAccent }])}>ON PAUSE</Text>
                </View>
              )}
            </View>
            <Text style={s([styles.statusSubtitle, { color: colors.textMuted }])}>
              {isLunch
                ? "Away for scheduled meal period"
                : isBreak
                ? "Brief pause from station"
                : "Active on floor for management & dispatch"}
            </Text>
          </View>
        </View>

        {!isAvailable && timeLeft !== null && (
          <View style={s([styles.countdownPill, { backgroundColor: statusGlow, borderColor: statusAccent + "40" }])}>
            <Timer size={fs(3.2)} color={statusAccent} />
            <Text style={s([styles.countdownText, { color: statusAccent }])}>{formatTimeLeft(timeLeft)}</Text>
          </View>
        )}
      </View>

      <View style={s(styles.statusActionRow)}>
        {isAvailable ? (
          <>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={statusActionLoading}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleStartLunch();
              }}
              style={s([styles.actionBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}
            >
              <Utensils size={fs(3.4)} color={colors.warning} />
              <Text style={s([styles.actionBtnText, { color: colors.text }])}>Start Lunch</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              disabled={statusActionLoading}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                handleStartBreak();
              }}
              style={s([styles.actionBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }])}
            >
              <Coffee size={fs(3.4)} color={colors.purple} />
              <Text style={s([styles.actionBtnText, { color: colors.text }])}>Take Break</Text>
            </TouchableOpacity>
          </>
        ) : isLunch ? (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={statusActionLoading}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleEndLunch();
            }}
            style={s([styles.resumeBtn, { backgroundColor: colors.success }])}
          >
            <CheckCircle size={fs(3.6)} color="#FFFFFF" />
            <Text style={styles.resumeBtnText}>End Lunch & Resume Work</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={statusActionLoading}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleEndBreak();
            }}
            style={s([styles.resumeBtn, { backgroundColor: colors.success }])}
          >
            <CheckCircle size={fs(3.6)} color="#FFFFFF" />
            <Text style={styles.resumeBtnText}>End Break & Resume Work</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

/* =========================================================================
   3. Collapsible Team Row
========================================================================= */
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
    outputRange: [0, mappings.length * hp(5.2) + hp(1)],
  });

  return (
    <View style={s([styles.teamRowBorder, { borderColor: themeColors.border }])}>
      <TouchableOpacity
        style={s([styles.teamRowHeader, { backgroundColor: themeColors.surfaceMuted }])}
        onPress={toggleLayout}
        activeOpacity={0.7}
      >
        <View style={s(styles.teamRowLeft)}>
          <View style={s([styles.teamRowIconContainer, { backgroundColor: themeColors.primaryGlow }])}>
            <Users size={fs(4)} color={themeColors.primary} />
          </View>
          <View>
            <Text style={s([styles.teamRowLeadText, { color: themeColors.textBold }])}>{teamLead}</Text>
            <Text style={s([styles.teamRowSubText, { color: themeColors.textMuted }])}>
              {mappings.length} team member{mappings.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronUp size={fs(4)} color={themeColors.textMuted} />
        ) : (
          <ChevronDown size={fs(4)} color={themeColors.textMuted} />
        )}
      </TouchableOpacity>

      <Animated.View style={{ height: heightInterpolate, overflow: "hidden" }}>
        <View style={s(styles.teamChildrenWrapper)}>
          {mappings.map((mapping, idx) => (
            <View key={idx} style={s([styles.teamMemberItem, { borderBottomColor: themeColors.border + "30" }])}>
              <View style={s(styles.teamMemberLeft)}>
                <View style={s([styles.teamDot, { backgroundColor: themeColors.primary }])} />
                <Text style={s([styles.teamMemberName, { color: themeColors.text }])}>{mapping.user}</Text>
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

/* =========================================================================
   4. Main Manager Dashboard Screen
========================================================================= */
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
        .then((res) => {
          if (res) setSummary(res);
        })
        .catch(() => null);

      const profilePromise = apiFetch<{ item: any }>("/api/employees/me")
        .then((res) => {
          if (res?.item) setProfile(normalizeProfile(res.item));
        })
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
        .then((res) => {
          if (res?.items) setTeamMappings(res.items);
        })
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
      { label: "Overdue", value: metrics.overdueTasks, color: "#F43F5E", gradientColors: ["#F43F5E", "#E11D48"] },
      { label: "Due Today", value: metrics.dueToday, color: "#F59E0B", gradientColors: ["#F59E0B", "#D97706"] },
      { label: "Active", value: metrics.remainingActive, color: "#38BDF8", gradientColors: ["#38BDF8", "#0284C7"] },
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

  // Current date formatted cleanly
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }).toUpperCase();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={s([styles.centered, { backgroundColor: colors.background }])}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s(styles.scrollContainer)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* =========================================================================
            1. Executive Context & Date Strip
        ========================================================================= */}
        <View style={s(styles.contextStrip)}>
          <View style={s(styles.datePill)}>
            <Calendar size={fs(3.2)} color={colors.primary} />
            <Text style={s([styles.datePillText, { color: colors.textMuted }])}>{todayFormatted}</Text>
          </View>
          <View style={s(styles.liveStatusBeacon)}>
            <View style={s([styles.beaconDot, { backgroundColor: colors.success }])} />
            <Text style={s([styles.beaconText, { color: colors.success }])}>COMMAND ACTIVE</Text>
          </View>
        </View>

        {/* =========================================================================
            2. Executive Status Widget (Dynamic Glass Pill Controller)
        ========================================================================= */}
        <ExecutiveStatusWidget
          profile={profile}
          statusActionLoading={statusActionLoading}
          handleStartLunch={handleStartLunch}
          handleEndLunch={handleEndLunch}
          handleStartBreak={handleStartBreak}
          handleEndBreak={handleEndBreak}
          colors={colors}
        />

        {/* =========================================================================
            3. Executive Bento Grid: Primary Operational Hubs
        ========================================================================= */}
        <View style={s(styles.sectionHeadingRow)}>
          <Text style={s([styles.sectionHeadingTitle, { color: colors.textBold }])}>Operational Command</Text>
          <Text style={s([styles.sectionHeadingSub, { color: colors.textMuted }])}>Core metrics & live throughput</Text>
        </View>

        {/* Hero Bento Card: Projects Engine */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(manager)/tasks");
          }}
          style={s([styles.heroBentoCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
        >
          <LinearGradient
            colors={colors.isDark ? ["#101C38", "#0C1427"] : ["#F0F9FF", "#E0F2FE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s(styles.heroBentoGradient)}
          >
            <View style={s(styles.heroBentoTop)}>
              <View style={s([styles.heroIconBox, { backgroundColor: colors.primaryGlow }])}>
                <FolderRoot size={fs(4.5)} color={colors.primary} />
              </View>
              <View style={s(styles.heroBadgeRow)}>
                <View style={s([styles.heroStatusPill, { backgroundColor: colors.successGlow }])}>
                  <TrendingUp size={fs(3.2)} color={colors.success} />
                  <Text style={s([styles.heroStatusText, { color: colors.success }])}>92% Velocity</Text>
                </View>
                <View style={s(styles.arrowCircle)}>
                  <ArrowUpRight size={fs(3.8)} color={colors.textMuted} />
                </View>
              </View>
            </View>

            <View style={s(styles.heroBentoContent)}>
              <Text style={s([styles.heroBentoNumber, { color: colors.textBold }])}>{metrics.totalProjects}</Text>
              <Text style={s([styles.heroBentoLabel, { color: colors.textMuted }])}>Active Projects in Pipeline</Text>
            </View>

            <View style={s(styles.heroProgressSection)}>
              <View style={s(styles.heroProgressHeader)}>
                <Text style={s([styles.heroProgressTitle, { color: colors.text }])}>Task Completion Flow</Text>
                <Text style={s([styles.heroProgressPercentage, { color: colors.primary }])}>
                  {metrics.completionRate}% On Track
                </Text>
              </View>
              <View style={s([styles.heroProgressBarTrack, { backgroundColor: colors.surfaceMuted }])}>
                <View style={s([styles.heroProgressBarFill, { width: `${metrics.completionRate}%`, backgroundColor: colors.primary }])} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Asymmetrical 2-Column Bento Row */}
        <View style={s(styles.bentoSplitRow)}>
          {/* Card A: Workforce Presence */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(manager)/team");
            }}
            style={s([styles.bentoHalfCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
          >
            <View style={s(styles.bentoCardHeader)}>
              <View style={s([styles.miniIconBox, { backgroundColor: colors.primaryGlow }])}>
                <Users size={fs(3.8)} color={colors.primary} />
              </View>
              <ArrowUpRight size={fs(3.2)} color={colors.textMuted} />
            </View>

            <View style={s(styles.bentoCardBody)}>
              <Text style={s([styles.bentoCardValue, { color: colors.textBold }])}>{metrics.totalEmployees}</Text>
              <Text style={s([styles.bentoCardLabel, { color: colors.textMuted }])}>Total Staff Roster</Text>
            </View>

            <View style={s([styles.bentoFootPill, { backgroundColor: colors.successGlow }])}>
              <View style={s([styles.footBeaconDot, { backgroundColor: colors.success }])} />
              <Text style={s([styles.bentoFootText, { color: colors.success }])}>Active on duty</Text>
            </View>
          </TouchableOpacity>

          {/* Card B: Compliance & EOD Reports */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(manager)/eod-reports");
            }}
            style={s([styles.bentoHalfCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
          >
            <View style={s(styles.bentoCardHeader)}>
              <View style={s([styles.miniIconBox, { backgroundColor: colors.warningGlow }])}>
                <ClipboardCheck size={fs(3.8)} color={colors.warning} />
              </View>
              <ArrowUpRight size={fs(3.2)} color={colors.textMuted} />
            </View>

            <View style={s(styles.bentoCardBody)}>
              <Text style={s([styles.bentoCardValue, { color: colors.textBold }])}>{eodStats.submitted}</Text>
              <Text style={s([styles.bentoCardLabel, { color: colors.textMuted }])}>EOD Reports In</Text>
            </View>

            <View style={s(styles.eodBreakdownRow)}>
              {eodStats.missing > 0 ? (
                <View style={s([styles.eodStatusTag, { backgroundColor: colors.dangerGlow }])}>
                  <Text style={s([styles.eodTagText, { color: colors.danger }])}>{eodStats.missing} Missing</Text>
                </View>
              ) : (
                <View style={s([styles.eodStatusTag, { backgroundColor: colors.successGlow }])}>
                  <Text style={s([styles.eodTagText, { color: colors.success }])}>All Submitted</Text>
                </View>
              )}
              {eodStats.late > 0 && (
                <View style={s([styles.eodStatusTag, { backgroundColor: colors.warningGlow }])}>
                  <Text style={s([styles.eodTagText, { color: colors.warning }])}>{eodStats.late} Late</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* =========================================================================
            4. Horizontal Operational Quick-Rail (Secondary Hubs)
        ========================================================================= */}
        <View style={s(styles.quickRailHeaderRow)}>
          <Text style={s([styles.quickRailHeading, { color: colors.textBold }])}>Operational Hubs</Text>
          <Text style={s([styles.quickRailHint, { color: colors.textMuted }])}>Swipe for modules</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s(styles.quickRailScroll)}
        >
          {/* Rail Item 1: Vehicles */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(manager)/vehicles");
            }}
            style={s([styles.quickRailCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
          >
            <View style={s([styles.quickRailIconBox, { backgroundColor: colors.warningGlow }])}>
              <Car size={fs(4)} color={colors.warning} />
            </View>
            <Text style={s([styles.quickRailValue, { color: colors.textBold }])}>{metrics.totalVehicles}</Text>
            <Text style={s([styles.quickRailTitle, { color: colors.textMuted }])}>Fleet Vehicles</Text>
            <View style={s([styles.quickRailPill, { backgroundColor: colors.surfaceMuted }])}>
              <Text style={s([styles.quickRailPillText, { color: colors.text }])}>Operational</Text>
            </View>
          </TouchableOpacity>

          {/* Rail Item 2: Locations */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(manager)/locations");
            }}
            style={s([styles.quickRailCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
          >
            <View style={s([styles.quickRailIconBox, { backgroundColor: colors.primaryGlow }])}>
              <MapPin size={fs(4)} color={colors.primary} />
            </View>
            <Text style={s([styles.quickRailValue, { color: colors.textBold }])}>{metrics.totalLocations}</Text>
            <Text style={s([styles.quickRailTitle, { color: colors.textMuted }])}>Active Sites</Text>
            <View style={s([styles.quickRailPill, { backgroundColor: colors.surfaceMuted }])}>
              <Text style={s([styles.quickRailPillText, { color: colors.text }])}>Monitored</Text>
            </View>
          </TouchableOpacity>

          {/* Rail Item 3: Bug Tickets */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(manager)/bug");
            }}
            style={s([styles.quickRailCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
          >
            <View style={s([styles.quickRailIconBox, { backgroundColor: colors.dangerGlow }])}>
              <Bug size={fs(4)} color={colors.danger} />
            </View>
            <Text style={s([styles.quickRailValue, { color: colors.textBold }])}>{metrics.pendingBugs}</Text>
            <Text style={s([styles.quickRailTitle, { color: colors.textMuted }])}>Open Bugs</Text>
            <View style={s([styles.quickRailPill, { backgroundColor: colors.dangerGlow }])}>
              <Text style={s([styles.quickRailPillText, { color: colors.danger }])}>Action Required</Text>
            </View>
          </TouchableOpacity>

          {/* Rail Item 4: Time Tracking */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/(manager)/time-tracking");
            }}
            style={s([styles.quickRailCard, { backgroundColor: colors.surface, borderColor: colors.border }])}
          >
            <View style={s([styles.quickRailIconBox, { backgroundColor: colors.purpleGlow }])}>
              <Clock size={fs(4)} color={colors.purple} />
            </View>
            <Text style={s([styles.quickRailValue, { color: colors.textBold }])}>{summary?.hoursLoggedToday ?? 0}h</Text>
            <Text style={s([styles.quickRailTitle, { color: colors.textMuted }])}>Hours Logged</Text>
            <View style={s([styles.quickRailPill, { backgroundColor: colors.surfaceMuted }])}>
              <Text style={s([styles.quickRailPillText, { color: colors.text }])}>Today's Log</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* =========================================================================
            5. Task Analytics & Velocity Visualizer
        ========================================================================= */}
        <View style={s(styles.analyticsContainer)}>
          <View style={s(styles.sectionHeadingRow)}>
            <View style={s(styles.sectionHeadingLeft)}>
              <Sparkles size={fs(4)} color={colors.primary} />
              <Text style={s([styles.sectionHeadingTitle, { color: colors.textBold }])}>Task Analytics & Load</Text>
            </View>
            <Text style={s([styles.sectionHeadingSub, { color: colors.textMuted }])}>Weekly distribution</Text>
          </View>

          <View style={s([styles.analyticsSurface, { backgroundColor: colors.surface, borderColor: colors.border }])}>
            <View style={s(styles.donutRow)}>
              <AnimatedCircularProgressChart data={chartData} totalTasks={metrics.activeTasks} themeColors={colors} />

              <View style={s(styles.chartLegendColumn)}>
                <View style={s([styles.legendItemCard, { backgroundColor: colors.surfaceMuted }])}>
                  <View style={[styles.legendDot, { backgroundColor: "#38BDF8" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s([styles.legendTitle, { color: colors.textMuted }])}>Active Progress</Text>
                    <Text style={s([styles.legendVal, { color: colors.textBold }])}>{metrics.remainingActive} tasks</Text>
                  </View>
                </View>

                <View style={s([styles.legendItemCard, { backgroundColor: colors.surfaceMuted }])}>
                  <View style={[styles.legendDot, { backgroundColor: "#F43F5E" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s([styles.legendTitle, { color: colors.textMuted }])}>Overdue Tasks</Text>
                    <Text style={s([styles.legendVal, { color: colors.danger }])}>{metrics.overdueTasks} urgent</Text>
                  </View>
                </View>

                <View style={s([styles.legendItemCard, { backgroundColor: colors.surfaceMuted }])}>
                  <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s([styles.legendTitle, { color: colors.textMuted }])}>Due Today</Text>
                    <Text style={s([styles.legendVal, { color: colors.warning }])}>{metrics.dueToday} tasks</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Weekly Velocity Bars */}
            <View style={s([styles.weeklyChartDivider, { borderTopColor: colors.border }])}>
              <View style={s(styles.weeklyTitleRow)}>
                <Text style={s([styles.weeklyTitle, { color: colors.textBold }])}>Weekly Output Pace</Text>
                <Text style={s([styles.weeklySubtitle, { color: colors.textMuted }])}>Activity rate by day</Text>
              </View>

              <View style={s(styles.weeklyBarRow)}>
                {[
                  { day: "Mon", h: 45 },
                  { day: "Tue", h: 70 },
                  { day: "Wed", h: 35 },
                  { day: "Thu", h: 85, active: true },
                  { day: "Fri", h: 55 },
                  { day: "Sat", h: 20 },
                  { day: "Sun", h: 15 },
                ].map((item, idx) => (
                  <View key={idx} style={s(styles.barItem)}>
                    <View
                      style={s([
                        styles.barTrack,
                        {
                          backgroundColor: colors.surfaceMuted,
                          borderColor: item.active ? colors.primary : "transparent",
                          borderWidth: item.active ? 1 : 0,
                        },
                      ])}
                    >
                      <View
                        style={s([
                          styles.barFill,
                          {
                            backgroundColor: item.active ? colors.primary : colors.primaryDark,
                            height: `${item.h}%`,
                          },
                        ])}
                      />
                    </View>
                    <Text
                      style={s([
                        styles.barDayText,
                        {
                          color: item.active ? colors.primary : colors.textMuted,
                          fontWeight: item.active ? "700" : "500",
                        },
                      ])}
                    >
                      {item.day}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* =========================================================================
            6. Curated Recent Tasks
        ========================================================================= */}
        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockInteractiveHeader)}>
            <View style={s(styles.blockTitleLeft)}>
              <ClipboardList size={fs(4)} color={colors.primary} />
              <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Recent Dispatches</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(manager)/tasks")}
              style={s(styles.viewAllBtn)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s([styles.viewAllText, { color: colors.primary }])}>View all</Text>
              <ArrowRight size={fs(3.2)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={s([styles.listContainerCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
            {[
              { title: "TQ Software System Update", spec: "Engineering", p: "medium", count: 1, s: "Pending" },
              { title: "Database Migration Schema", spec: "Architecture", p: "high", count: 1, s: "Pending", date: "Jul 1" },
              { title: "Client Web Frontend Launch", spec: "Production", p: "high", count: 2, s: "Pending" },
              { title: "UI Redesign Deployment Layer", spec: "Mobile Design", p: "high", count: 1, s: "In Progress", date: "Jul 1" },
            ].map((task, i) => (
              <View key={i} style={s([styles.taskItemRow, { backgroundColor: colors.surfaceMuted }])}>
                <View style={s(styles.taskItemLeft)}>
                  <View style={s(styles.taskTitleRow)}>
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: task.p === "high" ? colors.danger : colors.warning },
                      ]}
                    />
                    <Text style={s([styles.taskItemTitle, { color: colors.textBold }])} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </View>
                  <Text style={s([styles.taskItemSub, { color: colors.textMuted }])}>
                    {task.spec} • {task.count} assignee{task.count > 1 ? "s" : ""} {task.date ? `• Due ${task.date}` : ""}
                  </Text>
                </View>
                <View style={s(styles.taskBadgeRow)}>
                  <View
                    style={s([
                      styles.statusBadge,
                      {
                        backgroundColor: task.s === "In Progress" ? colors.primaryGlow : colors.surface,
                        borderColor: task.s === "In Progress" ? colors.primary : colors.border,
                      },
                    ])}
                  >
                    <Text
                      style={s([
                        styles.statusText,
                        { color: task.s === "In Progress" ? colors.primary : colors.textMuted },
                      ])}
                    >
                      {task.s}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* =========================================================================
            7. Active Workforce Roster
        ========================================================================= */}
        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockInteractiveHeader)}>
            <View style={s(styles.blockTitleLeft)}>
              <Users size={fs(4)} color={colors.primary} />
              <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Active Workforce</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(manager)/team")}
              style={s(styles.viewAllBtn)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={s([styles.viewAllText, { color: colors.primary }])}>Full Team</Text>
              <ArrowRight size={fs(3.2)} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={s([styles.listContainerCard, { backgroundColor: colors.surface, borderColor: colors.border }])}>
            {[
              { name: "Adeneye Abdulrahman", role: "Software Engineer", code: "AA" },
              { name: "Aqib Saeed", role: "Senior Developer", code: "AS" },
              { name: "Cheyenne Bragdon", role: "Operations Specialist", code: "CB" },
            ].map((emp, i) => (
              <View key={i} style={s([styles.employeeItemRow, { backgroundColor: colors.surfaceMuted }])}>
                <View style={s([styles.employeeAvatar, { backgroundColor: colors.primaryGlow }])}>
                  <Text style={s([styles.employeeAvatarText, { color: colors.primary }])}>{emp.code}</Text>
                  <View style={s([styles.employeeOnlineDot, { backgroundColor: colors.success }])} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s([styles.employeeName, { color: colors.textBold }])}>{emp.name}</Text>
                  <Text style={s([styles.employeeRole, { color: colors.textMuted }])}>{emp.role}</Text>
                </View>
                <View style={s([styles.activeStatusBadge, { backgroundColor: colors.successGlow }])}>
                  <Text style={s([styles.activeText, { color: colors.success }])}>On Shift</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* =========================================================================
            8. Overdue Attention Banner
        ========================================================================= */}
        {metrics.overdueTasks > 0 && (
          <View style={s(styles.blockContainer)}>
            <View style={s(styles.blockHeader)}>
              <AlertTriangle size={fs(4)} color={colors.danger} />
              <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Overdue Attention List</Text>
            </View>

            <View style={s([styles.overdueTaskCard, { backgroundColor: colors.surface, borderColor: colors.danger + "40" }])}>
              <View style={s([styles.overdueHeaderRow, { borderBottomColor: colors.border }])}>
                <View style={s(styles.overdueLeftHeader)}>
                  <View style={s([styles.overdueAlertPill, { backgroundColor: colors.dangerGlow }])}>
                    <Text style={s([styles.overdueTitleText, { color: colors.danger }])}>
                      {metrics.overdueTasks} Overdue Tasks
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: fs(2.8), color: colors.textMuted }}>Immediate review required</Text>
              </View>

              <ScrollView style={{ maxHeight: hp(24) }} nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                {[
                  "Deploy mobile app update to production",
                  "Clear case manufacturer contract review",
                  "Jim Jordan client presentation deck",
                  "UI redesign layout audit and check",
                  "Digital assets synchronization for media team",
                ].map((item, idx) => (
                  <View key={idx} style={s([styles.overdueItemRow, { borderBottomColor: colors.border + "30" }])}>
                    <View style={s(styles.overdueItemLeft)}>
                      <View style={[styles.priorityDot, { backgroundColor: colors.danger }]} />
                      <Text style={s([styles.overdueItemName, { color: colors.text }])} numberOfLines={1}>
                        {item}
                      </Text>
                    </View>
                    <View style={s([styles.urgentTag, { backgroundColor: colors.dangerGlow }])}>
                      <Text style={{ fontSize: fs(2.6), color: colors.danger, fontWeight: "700" }}>CRITICAL</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* =========================================================================
            9. Week Ahead — 7-Day Outlook
        ========================================================================= */}
        <View style={s(styles.blockContainer)}>
          <View style={s(styles.blockHeader)}>
            <Clock size={fs(4)} color={colors.primary} />
            <Text style={s([styles.blockTitle, { color: colors.textBold }])}>7-Day Schedule Outlook</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s(styles.horizonScrollStyle)}>
            {[
              { day: "Thu", num: 9, count: 4, active: true },
              { day: "Fri", num: 10, count: 6 },
              { day: "Sat", num: 11, count: 1 },
              { day: "Sun", num: 12, count: 0 },
              { day: "Mon", num: 13, count: 8 },
              { day: "Tue", num: 14, count: 5 },
              { day: "Wed", num: 15, count: 3 },
            ].map((outlook, idx) => (
              <View
                key={idx}
                style={s([
                  styles.horizonCard,
                  {
                    backgroundColor: outlook.active ? colors.primaryGlow : colors.surface,
                    borderColor: outlook.active ? colors.primary : colors.border,
                  },
                ])}
              >
                <Text
                  style={{
                    fontSize: fs(2.7),
                    color: outlook.active ? colors.primary : colors.textMuted,
                    textTransform: "uppercase",
                    fontWeight: "600",
                  }}
                >
                  {outlook.day}
                </Text>
                <Text style={s([styles.horizonNum, { color: outlook.active ? colors.primary : colors.textBold }])}>
                  {outlook.num}
                </Text>
                <Text style={{ fontSize: fs(2.5), color: outlook.active ? colors.textBold : colors.textMuted }}>
                  {outlook.count} task{outlook.count !== 1 ? "s" : ""}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* =========================================================================
            10. Team Structure Mapping
        ========================================================================= */}
        {(user?.role === "manager" || user?.role === "admin") && (
          <View style={s(styles.blockContainer)}>
            <View style={s(styles.blockHeader)}>
              <UserCog size={fs(4)} color={colors.primary} />
              <Text style={s([styles.blockTitle, { color: colors.textBold }])}>Team Structure & Leads</Text>
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

        {/* API Error Notification Card */}
        {apiError && (
          <View style={s([styles.errorCard, { backgroundColor: colors.dangerGlow, borderColor: colors.danger + "40" }])}>
            <AlertTriangle size={fs(4)} color={colors.danger} />
            <Text style={{ fontSize: fs(3.2), color: colors.danger, flex: 1 }}>{apiError}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* =========================================================================
   Styles: Masterfully Crafted Executive Aesthetics
========================================================================= */
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingHorizontal: wp(4.5),
    paddingTop: hp(1.5),
    paddingBottom: hp(5),
  },

  /* 1. Context Strip */
  contextStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1.8),
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
  },
  datePillText: {
    fontSize: fs(3),
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  liveStatusBeacon: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
  },
  beaconDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
  },
  beaconText: {
    fontSize: fs(2.7),
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  /* 2. Executive Status Widget */
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: wp(4),
    marginBottom: hp(2.5),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statusCardMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
  },
  statusIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
    flex: 1,
  },
  statusPulseOrb: {
    width: wp(11),
    height: wp(11),
    borderRadius: wp(5.5),
    alignItems: "center",
    justifyContent: "center",
  },
  statusInnerOrb: {
    width: wp(4),
    height: wp(4),
    borderRadius: wp(2),
  },
  statusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  statusTitle: {
    fontSize: fs(3.8),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  statusBadgePill: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: fs(2.4),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusSubtitle: {
    fontSize: fs(2.8),
    marginTop: hp(0.3),
  },
  countdownPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.6),
    borderRadius: 12,
    borderWidth: 1,
  },
  countdownText: {
    fontSize: fs(3.2),
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  statusActionRow: {
    flexDirection: "row",
    gap: wp(2.5),
    marginTop: hp(1.8),
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(2),
    paddingVertical: hp(1.2),
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: fs(3.2),
    fontWeight: "600",
  },
  resumeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: wp(2),
    paddingVertical: hp(1.4),
    borderRadius: 12,
  },
  resumeBtnText: {
    color: "#FFFFFF",
    fontSize: fs(3.4),
    fontWeight: "700",
  },

  /* 3. Section Headers */
  sectionHeadingRow: {
    marginBottom: hp(1.2),
  },
  sectionHeadingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  sectionHeadingTitle: {
    fontSize: fs(4.4),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  sectionHeadingSub: {
    fontSize: fs(2.8),
    marginTop: hp(0.2),
  },

  /* 4. Hero Bento Card: Projects Engine */
  heroBentoCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: hp(1.8),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  heroBentoGradient: {
    padding: wp(4.5),
  },
  heroBentoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIconBox: {
    width: wp(11),
    height: wp(11),
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 20,
  },
  heroStatusText: {
    fontSize: fs(2.6),
    fontWeight: "700",
  },
  arrowCircle: {
    width: wp(7.5),
    height: wp(7.5),
    borderRadius: wp(3.75),
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroBentoContent: {
    marginTop: hp(1.8),
    marginBottom: hp(1.8),
  },
  heroBentoNumber: {
    fontSize: fs(9),
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroBentoLabel: {
    fontSize: fs(3.2),
    fontWeight: "500",
    marginTop: hp(0.2),
  },
  heroProgressSection: {
    paddingTop: hp(1.4),
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  heroProgressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(0.8),
  },
  heroProgressTitle: {
    fontSize: fs(2.8),
    fontWeight: "600",
  },
  heroProgressPercentage: {
    fontSize: fs(2.8),
    fontWeight: "800",
  },
  heroProgressBarTrack: {
    height: hp(0.8),
    borderRadius: hp(0.4),
    overflow: "hidden",
  },
  heroProgressBarFill: {
    height: "100%",
    borderRadius: hp(0.4),
  },

  /* 5. Split Bento 2-Column Row */
  bentoSplitRow: {
    flexDirection: "row",
    gap: wp(3),
    marginBottom: hp(2.5),
  },
  bentoHalfCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: wp(3.8),
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  bentoCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniIconBox: {
    width: wp(9),
    height: wp(9),
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoCardBody: {
    marginVertical: hp(1.2),
  },
  bentoCardValue: {
    fontSize: fs(6.5),
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  bentoCardLabel: {
    fontSize: fs(2.8),
    fontWeight: "500",
    marginTop: hp(0.2),
  },
  bentoFootPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1.5),
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.4),
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  footBeaconDot: {
    width: wp(1.8),
    height: wp(1.8),
    borderRadius: wp(0.9),
  },
  bentoFootText: {
    fontSize: fs(2.4),
    fontWeight: "700",
  },
  eodBreakdownRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: wp(1.5),
  },
  eodStatusTag: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: 6,
  },
  eodTagText: {
    fontSize: fs(2.4),
    fontWeight: "700",
  },

  /* 6. Horizontal Quick-Rail */
  quickRailHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1.2),
  },
  quickRailHeading: {
    fontSize: fs(3.8),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  quickRailHint: {
    fontSize: fs(2.6),
  },
  quickRailScroll: {
    gap: wp(3),
    paddingBottom: hp(1.5),
  },
  quickRailCard: {
    width: wp(36),
    borderRadius: 16,
    borderWidth: 1,
    padding: wp(3.5),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  quickRailIconBox: {
    width: wp(9),
    height: wp(9),
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: hp(1),
  },
  quickRailValue: {
    fontSize: fs(5),
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  quickRailTitle: {
    fontSize: fs(2.8),
    fontWeight: "500",
    marginVertical: hp(0.3),
  },
  quickRailPill: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: hp(0.5),
  },
  quickRailPillText: {
    fontSize: fs(2.2),
    fontWeight: "700",
  },

  /* 7. Task Analytics & Velocity */
  analyticsContainer: {
    marginTop: hp(1),
    marginBottom: hp(2.5),
  },
  analyticsSurface: {
    borderRadius: 20,
    borderWidth: 1,
    padding: wp(4),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: wp(3),
  },
  chartWrapper: {
    position: "relative",
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
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  chartSubLabel: {
    fontSize: fs(2.2),
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  chartLegendColumn: {
    flex: 1,
    gap: hp(1),
  },
  legendItemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: 10,
  },
  legendDot: {
    width: wp(2.5),
    height: wp(2.5),
    borderRadius: wp(1.25),
  },
  legendTitle: {
    fontSize: fs(2.4),
    fontWeight: "500",
  },
  legendVal: {
    fontSize: fs(3),
    fontWeight: "700",
  },
  weeklyChartDivider: {
    borderTopWidth: 1,
    marginTop: hp(2.2),
    paddingTop: hp(1.8),
  },
  weeklyTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1.5),
  },
  weeklyTitle: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  weeklySubtitle: {
    fontSize: fs(2.6),
  },
  weeklyBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: hp(11),
    paddingHorizontal: wp(1),
  },
  barItem: {
    alignItems: "center",
    gap: hp(0.6),
    flex: 1,
  },
  barTrack: {
    width: wp(6.5),
    height: hp(8.5),
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 8,
  },
  barDayText: {
    fontSize: fs(2.6),
  },

  /* 8. Recent Tasks List & Active Staff */
  blockContainer: {
    marginBottom: hp(2.5),
  },
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
    marginBottom: hp(1.2),
  },
  blockInteractiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(1.2),
  },
  blockTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  blockTitle: {
    fontSize: fs(4),
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(1),
  },
  viewAllText: {
    fontSize: fs(3),
    fontWeight: "700",
  },
  listContainerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: wp(3),
    gap: hp(1),
  },
  taskItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    borderRadius: 12,
  },
  taskItemLeft: {
    flex: 1,
    paddingRight: wp(2),
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  priorityDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
  },
  taskItemTitle: {
    fontSize: fs(3.4),
    fontWeight: "700",
  },
  taskItemSub: {
    fontSize: fs(2.6),
    marginTop: hp(0.3),
  },
  taskBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: fs(2.6),
    fontWeight: "700",
  },

  /* 9. Employee Items */
  employeeItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    borderRadius: 12,
    gap: wp(3),
  },
  employeeAvatar: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  employeeAvatarText: {
    fontSize: fs(3.2),
    fontWeight: "800",
  },
  employeeOnlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: wp(2.6),
    height: wp(2.6),
    borderRadius: wp(1.3),
    borderWidth: 2,
    borderColor: "#080C14",
  },
  employeeName: {
    fontSize: fs(3.4),
    fontWeight: "700",
  },
  employeeRole: {
    fontSize: fs(2.6),
    marginTop: hp(0.2),
  },
  activeStatusBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: 8,
  },
  activeText: {
    fontSize: fs(2.6),
    fontWeight: "700",
  },

  /* 10. Overdue Container */
  overdueTaskCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: wp(3.8),
  },
  overdueHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    paddingBottom: hp(1),
    marginBottom: hp(1),
  },
  overdueLeftHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  overdueAlertPill: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
    borderRadius: 6,
  },
  overdueTitleText: {
    fontSize: fs(3.2),
    fontWeight: "800",
  },
  overdueItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: hp(1),
    borderBottomWidth: 1,
  },
  overdueItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
    flex: 1,
    paddingRight: wp(2),
  },
  overdueItemName: {
    fontSize: fs(3.2),
    fontWeight: "500",
  },
  urgentTag: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: 6,
  },

  /* 11. Horizon Scroll */
  horizonScrollStyle: {
    gap: wp(2.5),
    paddingBottom: hp(0.5),
  },
  horizonCard: {
    width: wp(19),
    paddingVertical: hp(1.4),
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: hp(0.4),
  },
  horizonNum: {
    fontSize: fs(4.8),
    fontWeight: "900",
  },

  /* 12. Team Structure Collapsible */
  teamRowBorder: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: hp(1),
  },
  teamRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  teamRowLeadText: {
    fontSize: fs(3.2),
    fontWeight: "700",
  },
  teamRowSubText: {
    fontSize: fs(2.6),
  },
  teamChildrenWrapper: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
  },
  teamMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
  },
  teamMemberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  teamDot: {
    width: wp(1.5),
    height: wp(1.5),
    borderRadius: wp(0.75),
  },
  teamMemberName: {
    fontSize: fs(3),
    fontWeight: "500",
  },
  overrideBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.2),
    borderRadius: 6,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
  },
  overrideBadgeText: {
    fontSize: fs(2.2),
    fontWeight: "700",
    color: "#38BDF8",
  },
  fallbackStructureText: {
    fontSize: fs(3),
    fontStyle: "italic",
    padding: wp(3),
    textAlign: "center",
  },

  /* 13. Error Card */
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
    padding: wp(3.5),
    borderRadius: 14,
    borderWidth: 1,
    marginTop: hp(1.5),
  },
});