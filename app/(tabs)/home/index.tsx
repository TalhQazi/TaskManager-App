import React, { useMemo, useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Dimensions 
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Svg, Circle } from "react-native-svg";
import { router } from "expo-router";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  MessageSquare, 
  Calendar, 
  Timer, 
  ListTodo, 
  AlertTriangle, 
  DollarSign, 
  CheckSquare2, 
  UserCog, 
  ChevronDown, 
  ChevronUp, 
  Briefcase, 
  Bug, 
  Utensils, 
  Coffee 
} from "lucide-react-native";

import { 
  getEmployeeDashboard, 
  getEmployeeProfile, 
  getOnboardingStatus, 
  startLunch, 
  endLunch, 
  startBreak, 
  endBreak, 
  apiFetch 
} from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";

const { width } = Dimensions.get("window");

interface TeamLeadMapping {
  teamLead: string;
  user: string;
  allowOverrideAdminAssignments: boolean;
}

// --- Reusable Shared Layout Subcomponents ---

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function Badge({ children, variant = "default", style }: { children: React.ReactNode; variant?: string; style?: any }) {
  let bg = "#27272a";
  let border = "#3f3f46";
  let text = "#ffffff";

  if (variant === "secondary") {
    bg = "#3f3f46";
    text = "#e4e4e7";
  } else if (variant === "destructive") {
    bg = "#7f1d1d";
    border = "#b91c1c";
    text = "#fca5a5";
  } else if (variant === "outline") {
    bg = "transparent";
    border = "#27272a";
    text = "#a1a1aa";
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border, borderWidth: 1 }, style]}>
      <Text style={[styles.badgeText, { color: text }]}>{children}</Text>
    </View>
  );
}

function EmployeeStatCardNative({ title, value, icon: Icon, variant, onPress }: any) {
  let color = "#6366f1";
  if (variant === "green") color = "#22c55e";
  if (variant === "blue") color = "#3b82f6";
  if (variant === "orange") color = "#f97316";
  if (variant === "red") color = "#ef4444";

  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon color={color} size={18} />
      </View>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}

function CircularProgress({ value, total, color, icon: Icon, label }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let strokeColor = "#3b82f6";
  if (color.includes("green")) strokeColor = "#22c55e";
  if (color.includes("yellow")) strokeColor = "#eab308";
  if (color.includes("orange")) strokeColor = "#f97316";

  return (
    <View style={styles.circleWidget}>
      <View style={styles.circleWrapper}>
        <Svg width="80" height="80" style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx="40" cy="40" r={radius} stroke="#27272a" strokeWidth="5" fill="transparent" />
          <Circle 
            cx="40" cy="40" r={radius} 
            stroke={strokeColor} strokeWidth="5" fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
          />
        </Svg>
        <View style={styles.circleIconContainer}>
          <Icon color={strokeColor} size={20} />
        </View>
      </View>
      <Text style={styles.circleValue}>{value}</Text>
      <Text style={styles.circleLabel}>{label}</Text>
      {total > 0 && <Text style={styles.circlePercentage}>{Math.round(percentage)}%</Text>}
    </View>
  );
}

// --- Main Formatted Screen Component ---
export default function EmployeeDashboard() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [myBugCount, setMyBugCount] = useState(0);
  const [teamMappings, setTeamMappings] = useState<TeamLeadMapping[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamExpanded, setTeamExpanded] = useState(false);

  // Queries
  const _dashboardQuery = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: async () => (await getEmployeeDashboard()).item,
    refetchOnWindowFocus: false,
  });

  const _profileQuery = useQuery({
    queryKey: ["employee-profile"],
    queryFn: async () => (await getEmployeeProfile()).item,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const _onboardingQuery = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => (await getOnboardingStatus()).item,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Queries rewritten to safely avoid returning 'undefined' values
const dashboardQuery = useQuery({
  queryKey: ["employee-dashboard"],
  queryFn: async () => {
    const res = await getEmployeeDashboard();
    return res?.item ?? null; // Added fallback
  },
  refetchOnWindowFocus: false,
});

const profileQuery = useQuery({
  queryKey: ["employee-profile"],
  queryFn: async () => {
    const res = await getEmployeeProfile();
    return res?.item ?? null; // Added fallback
  },
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
});

const onboardingQuery = useQuery({
  queryKey: ["onboarding-status"],
  queryFn: async () => {
    const res = await getOnboardingStatus();
    return res?.item ?? null; // Added fallback
  },
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
});

  // Time remaining tick effect for lunch/break countdown
  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) {
      setTimeLeft(null);
      return;
    }

    const currentStatus = (profile as any).current_status || "AVAILABLE";
    if (currentStatus === "AVAILABLE") {
      setTimeLeft(null);
      return;
    }

    const tick = () => {
      const now = Date.now();
      let targetTime = 0;

      if (currentStatus === "LUNCH") {
        targetTime = (profile as any).lunch_expected_end ? new Date((profile as any).lunch_expected_end).getTime() : 0;
      } else if (currentStatus === "BREAK") {
        const startTime = (profile as any).break_start_time ? new Date((profile as any).break_start_time).getTime() : 0;
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
  }, [profileQuery.data]);

  // Real-time status update socket listener
  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = (payload: any) => {
      const profile = profileQuery.data;
      if (profile && (profile as any).id === payload.userId) {
        queryClient.setQueryData(["employee-profile"], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            current_status: payload.current_status,
            lunch_start_time: payload.lunch_start_time,
            lunch_expected_end: payload.lunch_expected_end,
            break_start_time: payload.break_start_time,
          };
        });
        queryClient.invalidateQueries({ queryKey: ["employee-dashboard"] });
      }
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket, profileQuery.data, queryClient]);

  // Fetch open bugs count
  useEffect(() => {
    const fetchBugCount = async () => {
      try {
        const res = await apiFetch<{ items?: any[] }>("/api/bugs");
        const items = Array.isArray(res?.items) ? res.items : [];
        const open = items.filter((b: any) => b.status !== "closed");
        setMyBugCount(open.length);
      } catch {
        // silently catch
      }
    };
    fetchBugCount();
  }, []);

  // Safe fetch team info to avoid throwing breaking errors
  useEffect(() => {
    const fetchTeamInfo = async () => {
      try {
        setTeamLoading(true);
        const res = await apiFetch<{ items: TeamLeadMapping[] }>("/api/team-lead-mappings/me");
        setTeamMappings(res?.items || []);
      } catch (e) {
        // Safe catch implementation prevents component layout exception crashes
        console.log("[Dashboard] Team lead endpoint not available yet or returned an error:", e);
        setTeamMappings([]); 
      } finally {
        setTeamLoading(false);
      }
    };
    fetchTeamInfo();
  }, []);

  // Handlers
  const handleStatusChange = async (apiFunc: () => Promise<any>, errorMsg: string) => {
    try {
      setStatusActionLoading(true);
      const res = await apiFunc();
      if (res.ok) {
        queryClient.setQueryData(["employee-profile"], (old: any) => {
          if (!old) return old;
          return { ...old, ...res.employee };
        });
      }
    } catch (e) {
      console.error(errorMsg, e);
    } finally {
      setStatusActionLoading(false);
    }
  };

  const formatTimeLeft = (sec: number | null) => {
    if (sec === null) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Memos
  const myTeamLead = useMemo(() => teamMappings[0]?.teamLead || null, [teamMappings]);
  const teammates = useMemo(() => {
    if (!myTeamLead) return [];
    return teamMappings.filter(m => m.teamLead === myTeamLead).map(m => m.user);
  }, [teamMappings, myTeamLead]);

  const employeeName = useMemo(() => String(profileQuery.data?.name || "").trim(), [profileQuery.data?.name]);
  const data = dashboardQuery.data || null;
  const onboardingStatus = onboardingQuery.data?.overallStatus || "not_started";
  const isOnboardingApproved = onboardingStatus === "approved";
  const stats = data?.tasks || { total: 0, completed: 0, pending: 0, inProgress: 0 };
  const isClockedIn = data?.clock?.clockIn && !data?.clock?.clockOut;

  if (dashboardQuery.isLoading || profileQuery.isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Define dynamic status widget fields matching web colors/icons
  const currentStatus = profileQuery.data?.current_status || "AVAILABLE";
  let statusBg = "#1e293b50";
  let statusBorder = "#47556950";
  let statusAccent = "#94a3b8";
  let statusLabel = "Available";
  let statusDesc = "Ready for tasks and coordination";
  let StatusIcon = CheckCircle;
  let statusIconColor = "#4ade80";

  if (currentStatus === "LUNCH") {
    statusBg = "#7c2d1230";
    statusBorder = "#b4530940";
    statusAccent = "#fdba74";
    statusLabel = "On Lunch Break";
    statusDesc = "Dining or away from station";
    StatusIcon = Utensils;
    statusIconColor = "#f97316";
  } else if (currentStatus === "BREAK") {
    statusBg = "#4c1d9530";
    statusBorder = "#7c3aed40";
    statusAccent = "#ddd6fe";
    statusLabel = "On Short Break";
    statusDesc = "Stepped away for a moment";
    StatusIcon = Coffee;
    statusIconColor = "#8b5cf6";
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      {/* 1. Top Stat Horizontal Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
        <EmployeeStatCardNative title="CURRENT PAY PERIOD" value={`$${(data?.earnings || 0).toFixed(2)}`} icon={DollarSign} variant="green" onPress={() => router.push("/(tabs)/payroll")} />
        <EmployeeStatCardNative title="HOURS WORKED" value={`${data?.hoursWorked || 0} hrs`} icon={Clock} variant="blue" onPress={() => router.push("/(tabs)/clock")} />
        <EmployeeStatCardNative title="PENDING TASKS" value={data?.tasks?.pending || 0} icon={Briefcase} variant="orange" onPress={() => router.push("/(tabs)/tasks")} />
        {/*<EmployeeStatCardNative title="OPEN BUGS" value={myBugCount} icon={Bug} variant={myBugCount > 0 ? "red" : "blue"} onPress={() => router.push("/(tabs)/bugs")} />
        <EmployeeStatCardNative title="ALERTS" value={data?.alerts?.length || 0} icon={AlertCircle} variant={(data?.alerts?.length || 0) > 0 ? "red" : "blue"} onPress={() => router.push("/(tabs)/profile")} />
        */}
      </ScrollView>

      {/* 2. Important Alerts Banner */}
      {(data?.alerts?.length || 0) > 0 && (
        <Card style={styles.errorCard}>
          <View style={styles.row}>
            <AlertCircle color="#ef4444" size={20} />
            <Text style={styles.errorTitle}>Important Alerts</Text>
          </View>
          <View style={styles.alertListContainer}>
            {data?.alerts?.map((alert: string, index: number) => (
              <View key={index} style={styles.alertItem}>
                <AlertCircle color="#fca5a5" size={14} style={{ marginRight: 6 }} />
                <Text style={styles.alertItemText}>{alert}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 3. Welcome Banner */}
      <View style={styles.welcomeBanner}>
        <View style={styles.welcomeLeft}>
          <Text style={styles.welcomeTitle}>Welcome{employeeName ? `, ${employeeName}` : " to Employee Portal"}</Text>
          <Text style={styles.welcomeSub}>View your tasks and manage your work efficiently.</Text>
        </View>
        {isClockedIn ? (
          <View style={styles.clockBadge}>
            <Clock color="#4ade80" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.clockBadgeText}>Clocked In</Text>
          </View>
        ) : data?.clock?.clockOut ? (
          <View style={styles.shiftCompleteBadge}>
            <CheckCircle color="#fbbf24" size={14} style={{ marginRight: 4 }} />
            <Text style={styles.shiftCompleteText}>Shift Complete</Text>
          </View>
        ) : null}
      </View>

      {/* 4. Dynamic Status Widget */}
      <View style={[styles.statusWidget, { backgroundColor: statusBg, borderColor: statusBorder }]}>
        <View style={styles.statusWidgetHeader}>
          <View style={styles.row}>
            <View style={styles.statusIconBox}>
              <StatusIcon color={statusIconColor} size={24} />
            </View>
            <View>
              <View style={styles.row}>
                <Text style={styles.statusLabelText}>{statusLabel}</Text>
                {currentStatus !== "AVAILABLE" && (
                  <Badge variant="outline" style={{ marginLeft: 8 }}><Text style={{ color: statusAccent, fontSize: 10 }}>Active</Text></Badge>
                )}
              </View>
              <Text style={styles.statusDescText}>{statusDesc}</Text>
            </View>
          </View>
        </View>

        <View style={styles.statusControlsRow}>
          {currentStatus !== "AVAILABLE" && timeLeft !== null && (
            <View style={styles.timerBox}>
              <Timer color="#a1a1aa" size={14} style={{ marginRight: 6 }} />
              <Text style={styles.timerLabel}>Remaining: </Text>
              <Text style={[styles.timerValue, { color: statusAccent }]}>{formatTimeLeft(timeLeft)}</Text>
            </View>
          )}

          <View style={styles.buttonGroupRow}>
            {currentStatus === "AVAILABLE" ? (
              <>
                <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(startLunch, "Failed to start lunch")} style={[styles.actionBtn, { backgroundColor: "#d97706" }]}>
                  <Utensils color="#fff" size={14} /><Text style={styles.btnText}>Lunch</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(startBreak, "Failed to start break")} style={[styles.actionBtn, { backgroundColor: "#8b5cf6" }]}>
                  <Coffee color="#fff" size={14} /><Text style={styles.btnText}>Break</Text>
                </TouchableOpacity>
              </>
            ) : currentStatus === "LUNCH" ? (
              <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(endLunch, "Failed to end lunch")} style={[styles.actionBtn, { backgroundColor: "#16a34a" }]}>
                <CheckCircle color="#fff" size={14} /><Text style={styles.btnText}>End Lunch</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(endBreak, "Failed to end break")} style={[styles.actionBtn, { backgroundColor: "#16a34a" }]}>
                <CheckCircle color="#fff" size={14} /><Text style={styles.btnText}>End Break</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* 5. Onboarding Warning Banner */}
      {!isOnboardingApproved && (
        <View style={styles.onboardingBanner}>
          <View style={styles.row}>
            <AlertTriangle color="#d97706" size={24} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.onboardingTitle}>Complete Your Onboarding</Text>
              <Text style={styles.onboardingSub}>
                {onboardingStatus === "submitted" 
                  ? "Your onboarding is pending approval." 
                  : "Please complete your onboarding to unlock access to all features."}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.onboardingBtn} onPress={() => router.push("profile")}>
            <Text style={styles.btnText}>Complete Onboarding</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Grid Metrics Row */}
      <View style={styles.gridRow}>
        <Card style={styles.gridCard}><Text style={styles.gridCardTitle}>Current Earnings</Text><Text style={styles.gridCardValue}>${data?.earnings || 0}</Text></Card>
        <Card style={styles.gridCard}><Text style={styles.gridCardTitle}>Hours Worked</Text><Text style={styles.gridCardValue}>{data?.hoursWorked || 0} hrs</Text></Card>
        <Card style={styles.gridCard}><Text style={styles.gridCardTitle}>Pending Tasks</Text><Text style={styles.gridCardValue}>{data?.tasks?.pending || 0}</Text></Card>
      </View>

      {/* 7. My Team Section */}
      <Card style={{ borderLeftWidth: 4, borderLeftColor: "#3b82f6" }}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <View style={styles.row}>
            <UserCog color="#3b82f6" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>My Team</Text>
          </View>
          {myTeamLead && (
            <TouchableOpacity style={styles.row} onPress={() => setTeamExpanded(!teamExpanded)}>
              {teamExpanded ? <ChevronUp color="#a1a1aa" size={16} /> : <ChevronDown color="#a1a1aa" size={16} />}
              <Text style={styles.toggleText}>{teamExpanded ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {teamLoading ? (
          <ActivityIndicator size="small" color="#3b82f6" style={{ marginVertical: 12 }} />
        ) : !myTeamLead ? (
          <Text style={styles.mutedText}>You are not assigned to any team yet.</Text>
        ) : (
          <View style={{ marginTop: 12 }}>
            <View style={styles.teamLeadBox}>
              <UserCog color="#3b82f6" size={16} style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.tinyLabel}>Team Lead</Text>
                <Text style={styles.teamMemberName}>{myTeamLead}</Text>
              </View>
            </View>

            {teamExpanded && teammates.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.subLabel}>Team Members</Text>
                <View style={styles.teammatesGrid}>
                  {teammates.map((member, idx) => (
                    <View key={idx} style={styles.teammatePill}>
                      <Text style={styles.teammatePillText}>{member}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* 8. Document Checklist Mapping Layout with profile link navigation */}
      <View style={styles.marginVerticalBlock}>
        {(data?.alerts?.length ?? 0) === 0 ? (
          <View style={[styles.documentBox, { backgroundColor: "#14532d20", borderColor: "#16a34a" }]}>
            <Text style={{ color: "#4ade80", fontSize: 13 }}>All documents are up to date 🎉</Text>
          </View>
        ) : (
          data?.alerts.map((alert: string, i: number) => {
            const text = alert.toLowerCase();
            const isMissing = text.includes("missing");
            const isCompleted = text.includes("completed");
            const isPending = text.includes("pending");

            let docBg = "#27272a50";
            let docBorder = "#3f3f46";
            let statusText = "ℹ️ Info";

            if (isMissing) { docBg = "#7f1d1d20"; docBorder = "#b91c1c"; statusText = "❌ Missing"; }
            if (isCompleted) { docBg = "#14532d20"; docBorder = "#16a34a"; statusText = "✅ Done"; }
            if (isPending) { docBg = "#78350f20"; docBorder = "#d97706"; statusText = "⏳ Pending"; }

            return (
              <TouchableOpacity key={i} style={[styles.documentBox, { backgroundColor: docBg, borderColor: docBorder }]} onPress={() => router.push("/(tabs)/documents")}>
                <Text style={styles.documentText}>{alert}</Text>
                <Text style={styles.documentStatusText}>{statusText}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 9. Task Progress Overview */}
      <Card>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <ListTodo color="#a1a1aa" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Task Progress Overview</Text>
        </View>
        
        <View style={styles.chartsContainer}>
          <CircularProgress value={stats.total} total={Math.max(stats.total, 1)} color="stroke-blue-500" icon={ListTodo} label="Total Tasks" />
          <CircularProgress value={stats.completed} total={Math.max(stats.total, 1)} color="stroke-green-500" icon={CheckCircle} label="Completed" />
          <CircularProgress value={stats.inProgress} total={Math.max(stats.total, 1)} color="stroke-yellow-500" icon={Clock} label="In Progress" />
          <CircularProgress value={stats.pending} total={Math.max(stats.total, 1)} color="stroke-orange-500" icon={AlertCircle} label="Pending" />
        </View>

        <View style={styles.progressBarWrapper}>
          <View style={[styles.row, { justifyContent: "space-between", marginBottom: 6 }]}>
            <Text style={styles.progressLabel}>Overall Completion</Text>
            <Text style={styles.progressPercentageText}>
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }]} />
          </View>
          <View style={[styles.row, { justifyContent: "space-between", marginTop: 6 }]}>
            <Text style={styles.progressSubText}>{stats.completed} completed</Text>
            <Text style={styles.progressSubText}>{stats.total - stats.completed} remaining</Text>
          </View>
        </View>
      </Card>

      {/* 10. Secondary Quick Views Grid */}
      <View style={styles.gridRow}>
        <Card style={styles.quickCard}>
          <View style={styles.row}>
            <Calendar color="#c084fc" size={20} />
            <Text style={styles.quickValue}>{data?.scheduleCount || 0}</Text>
          </View>
          <Text style={styles.quickTitle}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/schedule")}><Text style={styles.quickLink}>View</Text></TouchableOpacity>
        </Card>

        <Card style={styles.quickCard}>
          <View style={styles.row}>
            <MessageSquare color="#f472b6" size={20} />
            <Text style={styles.quickValue}>{data?.unreadMessages || 0}</Text>
          </View>
          <Text style={styles.quickTitle}>Unread Messages</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/messages")}><Text style={styles.quickLink}>View</Text></TouchableOpacity>
        </Card>

        <Card style={styles.quickCard}>
          <View style={styles.row}>
            <Timer color="#22d3ee" size={20} />
            <Text style={styles.quickValueStatus}>
              {data?.clock?.clockIn ? (data?.clock?.clockOut ? "Complete" : "Active") : "None"}
            </Text>
          </View>
          <Text style={styles.quickTitle}>Today's Status</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/clock")}><Text style={styles.quickLink}>Clock</Text></TouchableOpacity>
        </Card>
      </View>

      {/* 11. Recent Tasks Block */}
      <Card>
        <View style={[styles.row, { justifyContent: "space-between", marginBottom: 12 }]}>
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/tasks")}><Text style={styles.quickLink}>View All</Text></TouchableOpacity>
        </View> 

        {data?.recentTasks?.length === 0 ? (
          <Text style={styles.mutedTextCenter}>No tasks assigned yet.</Text>
        ) : (
          <View style={styles.taskListContainer}>
            {data?.recentTasks?.map((task: any) => (
              <View key={task.id} style={styles.taskListItem}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskDue}>Due: {task.dueDate || "No due date"}</Text>
                </View>
                <View style={styles.row}>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"} style={{ marginRight: 4 }}>
                    {task.status}
                  </Badge>
                  <Badge variant={task.priority === "high" ? "destructive" : "outline"}>
                    {task.priority}
                  </Badge>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

    </ScrollView>
  );
}

// Single structured central stylesheet
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  contentContainer: { padding: 16, paddingBottom: 40 },
  center: { justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  loadingText: { color: "#a1a1aa", marginTop: 12, fontSize: 14 },
  
  horizontalRow: { flexDirection: "row", marginBottom: 16 },
  statCard: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, padding: 14, marginRight: 10, width: width * 0.38 },
  statIconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  statTitle: { color: "#a1a1aa", fontSize: 10, fontWeight: "600", textTransform: "uppercase" },
  statValue: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginTop: 2 },

  card: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  mutedText: { color: "#71717a", fontSize: 13, marginTop: 8 },
  mutedTextCenter: { color: "#71717a", fontSize: 13, textAlign: "center", paddingVertical: 16 },
  toggleText: { color: "#a1a1aa", fontSize: 12, marginLeft: 4 },

  errorCard: { borderColor: "#7f1d1d", backgroundColor: "#7f1d1d15" },
  errorTitle: { color: "#ef4444", fontWeight: "bold", fontSize: 14, marginLeft: 6 },
  alertListContainer: { marginTop: 10, gap: 6 },
  alertItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#7f1d1d25", padding: 8, borderRadius: 6 },
  alertItemText: { color: "#fca5a5", fontSize: 12, flex: 1 },

  welcomeBanner: { backgroundColor: "#111111", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  welcomeLeft: { flex: 1, paddingRight: 8 },
  welcomeTitle: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  welcomeSub: { color: "#d0d0d0", fontSize: 12, marginTop: 2 },
  clockBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#14532d50", borderColor: "#16a34a", borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  clockBadgeText: { color: "#4ade80", fontSize: 11, fontWeight: "600" },
  shiftCompleteBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#78350f50", borderColor: "#d97706", borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  shiftCompleteText: { color: "#fbbf24", fontSize: 11, fontWeight: "600" },

  statusWidget: { borderWidth: 2, borderRadius: 12, padding: 16, marginBottom: 16 },
  statusWidgetHeader: { marginBottom: 12 },
  statusIconBox: { backgroundColor: "#00000040", width: 44, height: 44, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  statusLabelText: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  statusDescText: { color: "#d1d5db", fontSize: 12, marginTop: 1 },
  statusControlsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  timerBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#00000060", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  timerLabel: { color: "#a1a1aa", fontSize: 12 },
  timerValue: { fontSize: 14, fontWeight: "bold" },
  buttonGroupRow: { flexDirection: "row", gap: 6 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, gap: 4 },
  btnText: { color: "#ffffff", fontSize: 12, fontWeight: "bold" },

  onboardingBanner: { backgroundColor: "#78350f20", borderColor: "#d97706", borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  onboardingTitle: { color: "#fef3c7", fontSize: 14, fontWeight: "bold" },
  onboardingSub: { color: "#f59e0b", fontSize: 12, marginTop: 2 },
  onboardingBtn: { backgroundColor: "#d97706", paddingVertical: 8, borderRadius: 8, alignItems: "center", marginTop: 12 },

  gridRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  gridCard: { flex: 1, backgroundColor: "#18181b", padding: 12, borderRadius: 12, marginBottom: 0 },
  gridCardTitle: { color: "#a1a1aa", fontSize: 11 },
  gridCardValue: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginTop: 4 },

  teamLeadBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, padding: 10, borderRadius: 8 },
  tinyLabel: { color: "#a1a1aa", fontSize: 10 },
  teamMemberName: { color: "#ffffff", fontSize: 13, fontWeight: "500" },
  subLabel: { color: "#a1a1aa", fontSize: 12, marginBottom: 6 },
  teammatesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  teammatePill: { backgroundColor: "#27272a", paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  teammatePillText: { color: "#ffffff", fontSize: 12 },

  marginVerticalBlock: { marginBottom: 16, gap: 6 },
  documentBox: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderWidth: 1, borderRadius: 8 },
  documentText: { color: "#ffffff", fontSize: 13, fontWeight: "500", flex: 1, paddingRight: 8 },
  documentStatusText: { fontSize: 11, color: "#a1a1aa" },

  chartsContainer: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  circleWidget: { alignItems: "center", width: "22%", minWidth: 70 },
  circleWrapper: { width: 80, height: 80, justifyContent: "center", alignItems: "center" },
  circleIconContainer: { position: "absolute", justifyContent: "center", alignItems: "center" },
  circleValue: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginTop: 4 },
  circleLabel: { color: "#a1a1aa", fontSize: 10, textAlign: "center" },
  circlePercentage: { color: "#71717a", fontSize: 9, marginTop: 1 },

  progressBarWrapper: { marginTop: 16 },
  progressLabel: { color: "#ffffff", fontSize: 12, fontWeight: "500" },
  progressPercentageText: { color: "#a1a1aa", fontSize: 12 },
  progressBarTrack: { width: "100%", backgroundColor: "#27272a", height: 8, borderRadius: 4, overflow: "hidden" },
  progressBarFill: { backgroundColor: "#22c55e", height: 8, borderRadius: 4 },
  progressSubText: { color: "#71717a", fontSize: 11 },

  quickCard: { flex: 1, marginBottom: 0, padding: 12, justifyContent: "space-between" },
  quickValue: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginLeft: "auto" },
  quickValueStatus: { color: "#ffffff", fontSize: 13, fontWeight: "bold", marginLeft: "auto" },
  quickTitle: { color: "#a1a1aa", fontSize: 11, marginTop: 4 },
  quickLink: { color: "#3b82f6", fontSize: 12, fontWeight: "500", marginTop: 6 },

  taskListContainer: { gap: 8 },
  taskListItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#27272a30", borderColor: "#27272a", borderWidth: 1, borderRadius: 8 },
  taskTitle: { color: "#ffffff", fontSize: 13, fontWeight: "500" },
  taskDue: { color: "#a1a1aa", fontSize: 11, marginTop: 2 },

  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: "600" }
});