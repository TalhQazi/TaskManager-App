import React, { useMemo, useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
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
  UserCog, 
  ChevronDown, 
  ChevronUp, 
  Briefcase, 
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
import { s, wp, hp, fs } from "@/util/styles";

interface TeamLeadMapping {
  teamLead: string;
  user: string;
  allowOverrideAdminAssignments: boolean;
}

// --- Reusable Shared Layout Subcomponents ---

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={s([styles.card, style])}>{children}</View>;
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
    <View style={s([styles.badge, { backgroundColor: bg, borderColor: border, borderWidth: 1 }, style])}>
      <Text style={s([styles.badgeText, { color: text }])}>{children}</Text>
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
    <TouchableOpacity style={s(styles.statCard)} onPress={onPress} activeOpacity={0.7}>
      <View style={s([styles.statIconContainer, { backgroundColor: `${color}15` }])}>
        <Icon color={color} size={fs(4.5)} />
      </View>
      <Text style={s(styles.statTitle)}>{title}</Text>
      <Text style={s(styles.statValue)} numberOfLines={1}>{value}</Text>
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
    <View style={s(styles.circleWidget)}>
      <View style={s(styles.circleWrapper)}>
        <Svg width="80" height="80" style={{ transform: [{ rotate: "-90deg" }] }}>
          <Circle cx="40" cy="40" r={radius} stroke="#27272a" strokeWidth="5" fill="transparent" />
          <Circle 
            cx="40" cy="40" r={radius} 
            stroke={strokeColor} strokeWidth="5" fill="transparent" 
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
            strokeLinecap="round" 
          />
        </Svg>
        <View style={s(styles.circleIconContainer)}>
          <Icon color={strokeColor} size={fs(5)} />
        </View>
      </View>
      <Text style={s(styles.circleValue)}>{value}</Text>
      <Text style={s(styles.circleLabel)}>{label}</Text>
      {total > 0 && <Text style={s(styles.circlePercentage)}>{Math.round(percentage)}%</Text>}
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

  // Queries safely rewritten to avoid returning 'undefined' values
  const dashboardQuery = useQuery({
    queryKey: ["employee-dashboard"],
    queryFn: async () => {
      const res = await getEmployeeDashboard();
      return res?.item ?? null;
    },
    refetchOnWindowFocus: false,
  });

  const profileQuery = useQuery({
    queryKey: ["employee-profile"],
    queryFn: async () => {
      const res = await getEmployeeProfile();
      return res?.item ?? null;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const onboardingQuery = useQuery({
    queryKey: ["onboarding-status"],
    queryFn: async () => {
      const res = await getOnboardingStatus();
      return res?.item ?? null;
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
      <View style={s([styles.container, styles.center])}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={s(styles.loadingText)}>Loading your dashboard...</Text>
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
    <ScrollView style={s(styles.container)} contentContainerStyle={s(styles.contentContainer)}>
      
      {/* 1. Top Stat Horizontal Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s(styles.horizontalRow)}>
        <EmployeeStatCardNative title="CURRENT PAY PERIOD" value={`$${(data?.earnings || 0).toFixed(2)}`} icon={DollarSign} variant="green" onPress={() => router.push("/(tabs)/payroll")} />
        <EmployeeStatCardNative title="HOURS WORKED" value={`${data?.hoursWorked || 0} hrs`} icon={Clock} variant="blue" onPress={() => router.push("/(tabs)/clock")} />
        <EmployeeStatCardNative title="PENDING TASKS" value={data?.tasks?.pending || 0} icon={Briefcase} variant="orange" onPress={() => router.push("/(tabs)/tasks")} />
      </ScrollView>

      {/* 2. Important Alerts Banner */}
      {(data?.alerts?.length || 0) > 0 && (
        <Card style={styles.errorCard}>
          <View style={s(styles.row)}>
            <AlertCircle color="#ef4444" size={fs(5)} />
            <Text style={s(styles.errorTitle)}>Important Alerts</Text>
          </View>
          <View style={s(styles.alertListContainer)}>
            {data?.alerts?.map((alert: string, index: number) => (
              <View key={index} style={s(styles.alertItem)}>
                <AlertCircle color="#fca5a5" size={fs(3.5)} style={s({ marginRight: wp(1.5) })} />
                <Text style={s(styles.alertItemText)}>{alert}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* 3. Welcome Banner */}
      <View style={s(styles.welcomeBanner)}>
        <View style={s(styles.welcomeLeft)}>
          <Text style={s(styles.welcomeTitle)}>Welcome{employeeName ? `, ${employeeName}` : " to Employee Portal"}</Text>
          <Text style={s(styles.welcomeSub)}>View your tasks and manage your work efficiently.</Text>
        </View>
        {isClockedIn ? (
          <View style={s(styles.clockBadge)}>
            <Clock color="#4ade80" size={fs(3.5)} style={s({ marginRight: wp(1) })} />
            <Text style={s(styles.clockBadgeText)}>Clocked In</Text>
          </View>
        ) : data?.clock?.clockOut ? (
          <View style={s(styles.shiftCompleteBadge)}>
            <CheckCircle color="#fbbf24" size={fs(3.5)} style={s({ marginRight: wp(1) })} />
            <Text style={s(styles.shiftCompleteText)}>Shift Complete</Text>
          </View>
        ) : null}
      </View>

      {/* 4. Dynamic Status Widget */}
      <View style={s([styles.statusWidget, { backgroundColor: statusBg, borderColor: statusBorder }])}>
        <View style={s(styles.statusWidgetHeader)}>
          <View style={s(styles.row)}>
            <View style={s(styles.statusIconBox)}>
              <StatusIcon color={statusIconColor} size={fs(6)} />
            </View>
            <View>
              <View style={s(styles.row)}>
                <Text style={s(styles.statusLabelText)}>{statusLabel}</Text>
                {currentStatus !== "AVAILABLE" && (
                  <Badge variant="outline" style={s({ marginLeft: wp(2) })}><Text style={{ color: statusAccent, fontSize: fs(2.5) }}>Active</Text></Badge>
                )}
              </View>
              <Text style={s(styles.statusDescText)}>{statusDesc}</Text>
            </View>
          </View>
        </View>

        <View style={s(styles.statusControlsRow)}>
          {currentStatus !== "AVAILABLE" && timeLeft !== null && (
            <View style={s(styles.timerBox)}>
              <Timer color="#a1a1aa" size={fs(3.5)} style={s({ marginRight: wp(1.5) })} />
              <Text style={s(styles.timerLabel)}>Remaining: </Text>
              <Text style={s([styles.timerValue, { color: statusAccent }])}>{formatTimeLeft(timeLeft)}</Text>
            </View>
          )}

          <View style={s(styles.buttonGroupRow)}>
            {currentStatus === "AVAILABLE" ? (
              <>
                <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(startLunch, "Failed to start lunch")} style={s([styles.actionBtn, { backgroundColor: "#d97706" }])}>
                  <Utensils color="#fff" size={fs(3.5)} /><Text style={s(styles.btnText)}>Lunch</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(startBreak, "Failed to start break")} style={s([styles.actionBtn, { backgroundColor: "#8b5cf6" }])}>
                  <Coffee color="#fff" size={fs(3.5)} /><Text style={s(styles.btnText)}>Break</Text>
                </TouchableOpacity>
              </>
            ) : currentStatus === "LUNCH" ? (
              <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(endLunch, "Failed to end lunch")} style={s([styles.actionBtn, { backgroundColor: "#16a34a" }])}>
                <CheckCircle color="#fff" size={fs(3.5)} /><Text style={s(styles.btnText)}>End Lunch</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity disabled={statusActionLoading} onPress={() => handleStatusChange(endBreak, "Failed to end break")} style={s([styles.actionBtn, { backgroundColor: "#16a34a" }])}>
                <CheckCircle color="#fff" size={fs(3.5)} /><Text style={s(styles.btnText)}>End Break</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* 5. Onboarding Warning Banner */}
      {onboardingQuery.data && !isOnboardingApproved && onboardingStatus !== "not_started" && (
        <View style={s(styles.onboardingBanner)}>
          <View style={s(styles.row)}>
            <AlertTriangle color="#d97706" size={fs(6)} style={s({ marginRight: wp(3) })} />
            <View style={s({ flex: 1 })}>
              <Text style={s(styles.onboardingTitle)}>Complete Your Onboarding</Text>
              <Text style={s(styles.onboardingSub)}>
                {onboardingStatus === "submitted" 
                  ? "Your onboarding is pending approval." 
                  : "Please complete your onboarding to unlock access to all features."}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s(styles.onboardingBtn)} onPress={() => router.push("/(tabs)/profile")}>
            <Text style={s(styles.btnText)}>Complete Onboarding</Text> 
          </TouchableOpacity>
        </View>
      )}

      {/* 6. Grid Metrics Row */}
      <View style={s(styles.gridRow)}>
        <Card style={styles.gridCard}><Text style={s(styles.gridCardTitle)}>Current Earnings</Text><Text style={s(styles.gridCardValue)}>${data?.earnings || 0}</Text></Card>
        <Card style={styles.gridCard}><Text style={s(styles.gridCardTitle)}>Hours Worked</Text><Text style={s(styles.gridCardValue)}>{data?.hoursWorked || 0} hrs</Text></Card>
        <Card style={styles.gridCard}><Text style={s(styles.gridCardTitle)}>Pending Tasks</Text><Text style={s(styles.gridCardValue)}>{data?.tasks?.pending || 0}</Text></Card>
      </View>

      {/* 7. My Team Section */}
      <Card style={{ borderLeftWidth: 4, borderLeftColor: "#3b82f6" }}>
        <View style={s([styles.row, { justifyContent: "space-between" }])}>
          <View style={s(styles.row)}>
            <UserCog color="#3b82f6" size={fs(4.5)} style={s({ marginRight: wp(2) })} />
            <Text style={s(styles.sectionTitle)}>My Team</Text>
          </View>
          {myTeamLead && (
            <TouchableOpacity style={s(styles.row)} onPress={() => setTeamExpanded(!teamExpanded)}>
              {teamExpanded ? <ChevronUp color="#a1a1aa" size={fs(4)} /> : <ChevronDown color="#a1a1aa" size={fs(4)} />}
              <Text style={s(styles.toggleText)}>{teamExpanded ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {teamLoading ? (
          <ActivityIndicator size="small" color="#3b82f6" style={s({ marginVertical: hp(1.5) })} />
        ) : !myTeamLead ? (
          <Text style={s(styles.mutedText)}>You are not assigned to any team yet.</Text>
        ) : (
          <View style={s({ marginTop: hp(1.5) })}>
            <View style={s(styles.teamLeadBox)}>
              <UserCog color="#3b82f6" size={fs(4)} style={s({ marginRight: wp(2) })} />
              <View>
                <Text style={s(styles.tinyLabel)}>Team Lead</Text>
                <Text style={s(styles.teamMemberName)}>{myTeamLead}</Text>
              </View>
            </View>

            {teamExpanded && teammates.length > 0 && (
              <View style={s({ marginTop: hp(1.5) })}>
                <Text style={s(styles.subLabel)}>Team Members</Text>
                <View style={s(styles.teammatesGrid)}>
                  {teammates.map((member, idx) => (
                    <View key={idx} style={s(styles.teammatePill)}>
                      <Text style={s(styles.teammatePillText)}>{member}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* 8. Document Checklist Mapping Layout */}
      <View style={s(styles.marginVerticalBlock)}>
        {(data?.alerts?.length ?? 0) === 0 ? (
          <View style={s([styles.documentBox, { backgroundColor: "#14532d20", borderColor: "#16a34a" }])}>
            <Text style={s({ color: "#4ade80", fontSize: fs(3.2) })}>All documents are up to date 🎉</Text>
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
              <TouchableOpacity key={i} style={s([styles.documentBox, { backgroundColor: docBg, borderColor: docBorder }])} onPress={() => router.push("/(tabs)/documents")}>
                <Text style={s(styles.documentText)}>{alert}</Text>
                <Text style={s(styles.documentStatusText)}>{statusText}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* 9. Task Progress Overview */}
      <Card>
        <View style={s([styles.row, { marginBottom: hp(2) }])}>
          <ListTodo color="#a1a1aa" size={fs(4.5)} style={s({ marginRight: wp(2) })} />
          <Text style={s(styles.sectionTitle)}>Task Progress Overview</Text>
        </View>
        
        <View style={s(styles.chartsContainer)}>
          <CircularProgress value={stats.total} total={Math.max(stats.total, 1)} color="stroke-blue-500" icon={ListTodo} label="Total Tasks" />
          <CircularProgress value={stats.completed} total={Math.max(stats.total, 1)} color="stroke-green-500" icon={CheckCircle} label="Completed" />
          <CircularProgress value={stats.inProgress} total={Math.max(stats.total, 1)} color="stroke-yellow-500" icon={Clock} label="In Progress" />
          <CircularProgress value={stats.pending} total={Math.max(stats.total, 1)} color="stroke-orange-500" icon={AlertCircle} label="Pending" />
        </View>

        <View style={s(styles.progressBarWrapper)}>
          <View style={s([styles.row, { justifyContent: "space-between", marginBottom: hp(0.8) }])}>
            <Text style={s(styles.progressLabel)}>Overall Completion</Text>
            <Text style={s(styles.progressPercentageText)}>
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </Text>
          </View>
          <View style={s(styles.progressBarTrack)}>
            <View style={s([styles.progressBarFill, { width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }])} />
          </View>
          <View style={s([styles.row, { justifyContent: "space-between", marginTop: hp(0.8) }])}>
            <Text style={s(styles.progressSubText)}>{stats.completed} completed</Text>
            <Text style={s(styles.progressSubText)}>{stats.total - stats.completed} remaining</Text>
          </View>
        </View>
      </Card>

      {/* 10. Secondary Quick Views Grid */}
      <View style={s(styles.gridRow)}>
        <Card style={styles.quickCard}>
          <View style={s(styles.row)}>
            <Calendar color="#c084fc" size={fs(5)} />
            <Text style={s(styles.quickValue)}>{data?.scheduleCount || 0}</Text>
          </View>
          <Text style={s(styles.quickTitle)}>Upcoming Events</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/schedule")}><Text style={s(styles.quickLink)}>View</Text></TouchableOpacity>
        </Card>

        <Card style={styles.quickCard}>
          <View style={s(styles.row)}>
            <MessageSquare color="#f472b6" size={fs(5)} />
            <Text style={s(styles.quickValue)}>{data?.unreadMessages || 0}</Text>
          </View>
          <Text style={s(styles.quickTitle)}>Unread Messages</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/messages")}><Text style={s(styles.quickLink)}>View</Text></TouchableOpacity>
        </Card>

        <Card style={styles.quickCard}>
          <View style={s(styles.row)}>
            <Timer color="#22d3ee" size={fs(5)} />
            <Text style={s(styles.quickValueStatus)}>
              {data?.clock?.clockIn ? (data?.clock?.clockOut ? "Complete" : "Active") : "None"}
            </Text>
          </View>
          <Text style={s(styles.quickTitle)}>Today's Status</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/clock")}><Text style={s(styles.quickLink)}>Clock</Text></TouchableOpacity>
        </Card>
      </View>

      {/* 11. Recent Tasks Block */}
      <Card>
        <View style={s([styles.row, { justifyContent: "space-between", marginBottom: hp(1.5) }])}>
          <Text style={s(styles.sectionTitle)}>Recent Tasks</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/tasks")}><Text style={s(styles.quickLink)}>View All</Text></TouchableOpacity>
        </View> 

        {data?.recentTasks?.length === 0 ? (
          <Text style={s(styles.mutedTextCenter)}>No tasks assigned yet.</Text>
        ) : (
          <View style={s(styles.taskListContainer)}>
            {data?.recentTasks?.map((task: any) => (
              <View key={task.id} style={s(styles.taskListItem)}>
                <View style={s({ flex: 1, paddingRight: wp(2) })}>
                  <Text style={s(styles.taskTitle)} numberOfLines={1}>{task.title}</Text>
                  <Text style={s(styles.taskDue)}>Due: {task.dueDate || "No due date"}</Text>
                </View>
                <View style={s(styles.row)}>
                  <Badge variant={task.status === "completed" ? "default" : "secondary"} style={s({ marginRight: wp(1) })}>
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
  container: { 
    flex: 1, 
    backgroundColor: "#09090b" 
  },
  contentContainer: { 
    padding: wp(4), 
    paddingBottom: hp(5) 
  },
  center: { 
    justifyContent: "center", 
    alignItems: "center" 
  },
  row: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  loadingText: { 
    color: "#a1a1aa", 
    marginTop: hp(1.5), 
    fontSize: fs(3.5) 
  },
  
  horizontalRow: { 
    flexDirection: "row", 
    marginBottom: hp(2) 
  },
  statCard: { 
    backgroundColor: "#18181b", 
    borderColor: "#27272a", 
    borderWidth: 1, 
    borderRadius: wp(3), 
    padding: wp(3.5), 
    marginRight: wp(2.5), 
    width: wp(38) 
  },
  statIconContainer: { 
    width: wp(8), 
    height: wp(8), 
    borderRadius: wp(2), 
    justifyContent: "center", 
    alignItems: "center", 
    marginBottom: hp(1) 
  },
  statTitle: { 
    color: "#a1a1aa", 
    fontSize: fs(2.5), 
    fontWeight: "600", 
    textTransform: "uppercase" 
  },
  statValue: { 
    color: "#ffffff", 
    fontSize: fs(4), 
    fontWeight: "bold", 
    marginTop: 2 
  },

  card: { 
    backgroundColor: "#18181b", 
    borderColor: "#27272a", 
    borderWidth: 1, 
    borderRadius: wp(3), 
    padding: wp(4), 
    marginBottom: hp(2) 
  },
  sectionTitle: { 
    color: "#ffffff", 
    fontSize: fs(3.8), 
    fontWeight: "bold" 
  },
  mutedText: { 
    color: "#71717a", 
    fontSize: fs(3.2), 
    marginTop: hp(1) 
  },
  mutedTextCenter: { 
    color: "#71717a", 
    fontSize: fs(3.2), 
    textAlign: "center", 
    paddingVertical: hp(2) 
  },
  toggleText: { 
    color: "#a1a1aa", 
    fontSize: fs(3), 
    marginLeft: wp(1) 
  },

  badge: { 
    paddingVertical: hp(0.3), 
    paddingHorizontal: wp(1.8), 
    borderRadius: wp(1) 
  },
  badgeText: { 
    fontSize: fs(2.8), 
    fontWeight: "500" 
  },

  errorCard: { 
    borderColor: "#7f1d1d", 
    backgroundColor: "#7f1d1d15" 
  },
  errorTitle: { 
    color: "#ef4444", 
    fontWeight: "bold", 
    fontSize: fs(3.5), 
    marginLeft: wp(1.5) 
  },
  alertListContainer: { 
    marginTop: hp(1.2), 
    gap: hp(0.8) 
  },
  alertItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#7f1d1d25", 
    padding: wp(2), 
    borderRadius: wp(1.5) 
  },
  alertItemText: { 
    color: "#fca5a5", 
    fontSize: fs(3), 
    flex: 1 
  },

  welcomeBanner: { 
    backgroundColor: "#111111", 
    borderColor: "#27272a", 
    borderWidth: 1, 
    borderRadius: wp(3), 
    padding: wp(4), 
    marginBottom: hp(2), 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  welcomeLeft: { 
    flex: 1, 
    paddingRight: wp(2) 
  },
  welcomeTitle: { 
    color: "#ffffff", 
    fontSize: fs(4.5), 
    fontWeight: "bold" 
  },
  welcomeSub: { 
    color: "#d0d0d0", 
    fontSize: fs(3), 
    marginTop: 2 
  },
  clockBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#14532d50", 
    borderColor: "#16a34a", 
    borderWidth: 1, 
    paddingVertical: hp(0.5), 
    paddingHorizontal: wp(2), 
    borderRadius: wp(1.5) 
  },
  clockBadgeText: { 
    color: "#4ade80", 
    fontSize: fs(2.8), 
    fontWeight: "600" 
  },
  shiftCompleteBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#78350f50", 
    borderColor: "#d97706", 
    borderWidth: 1, 
    paddingVertical: hp(0.5), 
    paddingHorizontal: wp(2), 
    borderRadius: wp(1.5) 
  },
  shiftCompleteText: { 
    color: "#fbbf24", 
    fontSize: fs(2.8), 
    fontWeight: "600" 
  },

  statusWidget: { 
    borderWidth: 2, 
    borderRadius: wp(3), 
    padding: wp(4), 
    marginBottom: hp(2) 
  },
  statusWidgetHeader: { 
    marginBottom: hp(1.5) 
  },
  statusIconBox: { 
    backgroundColor: "#00000040", 
    width: wp(11), 
    height: wp(11), 
    borderRadius: wp(2.5), 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: wp(3) 
  },
  statusLabelText: { 
    color: "#ffffff", 
    fontSize: fs(3.8), 
    fontWeight: "bold" 
  },
  statusDescText: { 
    color: "#d1d5db", 
    fontSize: fs(3), 
    marginTop: 1 
  },
  statusControlsRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    flexWrap: "wrap", 
    gap: wp(2) 
  },
  timerBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#00000060", 
    paddingVertical: hp(0.8), 
    paddingHorizontal: wp(2.5), 
    borderRadius: wp(2) 
  },
  timerLabel: { 
    color: "#a1a1aa", 
    fontSize: fs(3) 
  },
  timerValue: { 
    fontSize: fs(3.5), 
    fontWeight: "bold" 
  },
  buttonGroupRow: { 
    flexDirection: "row", 
    gap: wp(1.5) 
  },
  actionBtn: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: hp(0.8), 
    paddingHorizontal: wp(3), 
    borderRadius: wp(2), 
    gap: wp(1) 
  },
  btnText: { 
    color: "#ffffff", 
    fontSize: fs(3), 
    fontWeight: "bold" 
  },

  onboardingBanner: { 
    backgroundColor: "#78350f20", 
    borderColor: "#d97706", 
    borderWidth: 1, 
    borderRadius: wp(3), 
    padding: wp(4), 
    marginBottom: hp(2) 
  },
  onboardingTitle: { 
    color: "#fef3c7", 
    fontSize: fs(3.5), 
    fontWeight: "bold" 
  },
  onboardingSub: { 
    color: "#f59e0b", 
    fontSize: fs(3), 
    marginTop: 2 
  },
  onboardingBtn: { 
    backgroundColor: "#d97706", 
    paddingVertical: hp(1), 
    borderRadius: wp(2), 
    alignItems: "center", 
    marginTop: hp(1.5) 
  },

  gridRow: { 
    flexDirection: "row", 
    gap: wp(2.5), 
    marginBottom: hp(2) 
  },
  gridCard: { 
    flex: 1, 
    backgroundColor: "#18181b", 
    padding: wp(3), 
    borderRadius: wp(3), 
    marginBottom: 0 
  },
  gridCardTitle: { 
    color: "#a1a1aa", 
    fontSize: fs(2.8) 
  },
  gridCardValue: { 
    color: "#ffffff", 
    fontSize: fs(4), 
    fontWeight: "bold", 
    marginTop: hp(0.5) 
  },

  teamLeadBox: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#18181b", 
    borderColor: "#27272a", 
    borderWidth: 1, 
    padding: wp(2.5), 
    borderRadius: wp(2) 
  },
  tinyLabel: { 
    color: "#a1a1aa", 
    fontSize: fs(2.5) 
  },
  teamMemberName: { 
    color: "#ffffff", 
    fontSize: fs(3.2), 
    fontWeight: "500" 
  },
  subLabel: { 
    color: "#a1a1aa", 
    fontSize: fs(3), 
    marginBottom: hp(0.8) 
  },
  teammatesGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: wp(1.5) 
  },
  teammatePill: { 
    backgroundColor: "#27272a", 
    paddingVertical: hp(0.5), 
    paddingHorizontal: wp(2), 
    borderRadius: wp(1.5) 
  },
  teammatePillText: { 
    color: "#e4e4e7", 
    fontSize: fs(3) 
  },

  marginVerticalBlock: { 
    marginVertical: hp(1), 
    gap: hp(1) 
  },
  documentBox: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    borderWidth: 1, 
    borderRadius: wp(2), 
    padding: wp(3) 
  },
  documentText: { 
    color: "#ffffff", 
    fontSize: fs(3.2), 
    flex: 1, 
    paddingRight: wp(2) 
  },
  documentStatusText: { 
    fontSize: fs(2.8), 
    fontWeight: "600" 
  },

  circleWidget: { 
    alignItems: "center", 
    flex: 1 
  },
  circleWrapper: { 
    width: wp(20), 
    height: wp(20), 
    justifyContent: "center", 
    alignItems: "center" 
  },
  circleIconContainer: { 
    position: "absolute" 
  },
  circleValue: { 
    color: "#ffffff", 
    fontSize: fs(4), 
    fontWeight: "bold", 
    marginTop: hp(0.8) 
  },
  circleLabel: { 
    color: "#a1a1aa", 
    fontSize: fs(2.8), 
    textAlign: "center", 
    marginTop: 2 
  },
  circlePercentage: { 
    color: "#71717a", 
    fontSize: fs(2.5), 
    marginTop: 1 
  },
  chartsContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: hp(2.5) 
  },

  progressBarWrapper: { 
    marginTop: hp(0.5) 
  },
  progressLabel: { 
    color: "#a1a1aa", 
    fontSize: fs(3) 
  },
  progressPercentageText: { 
    color: "#ffffff", 
    fontSize: fs(3), 
    fontWeight: "bold" 
  },
  progressBarTrack: { 
    height: hp(0.8), 
    backgroundColor: "#27272a", 
    borderRadius: wp(1), 
    overflow: "hidden" 
  },
  progressBarFill: { 
    height: "100%", 
    backgroundColor: "#3b82f6", 
    borderRadius: wp(1) 
  },
  progressSubText: { 
    color: "#71717a", 
    fontSize: fs(2.8) 
  },

  quickCard: { 
    flex: 1, 
    marginBottom: 0, 
    padding: wp(3) 
  },
  quickValue: { 
    color: "#ffffff", 
    fontSize: fs(5), 
    fontWeight: "bold", 
    marginLeft: "auto" 
  },
  quickValueStatus: { 
    color: "#4ade80", 
    fontSize: fs(3.2), 
    fontWeight: "600", 
    marginLeft: "auto" 
  },
  quickTitle: { 
    color: "#a1a1aa", 
    fontSize: fs(2.8), 
    marginTop: hp(1) 
  },
  quickLink: { 
    color: "#3b82f6", 
    fontSize: fs(3), 
    fontWeight: "600", 
    marginTop: hp(0.5) 
  },

  taskListContainer: { 
    gap: hp(1) 
  },
  taskListItem: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    backgroundColor: "#27272a30", 
    padding: wp(2.5), 
    borderRadius: wp(2), 
    borderColor: "#27272a", 
    borderWidth: 1 
  },
  taskTitle: { 
    color: "#ffffff", 
    fontSize: fs(3.2), 
    fontWeight: "500" 
  },
  taskDue: { 
    color: "#71717a", 
    fontSize: fs(2.8), 
    marginTop: 2 
  }
});