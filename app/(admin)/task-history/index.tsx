import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
} from "react-native";
import { 
  Search, 
  Users, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X,
  Calendar,
  FileText,
  AlertTriangle 
} from "lucide-react-native";
import { listResource } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface Employee {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  status: "active" | "inactive" | "pending";
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  assignee?: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed" | "overdue";
  dueDate: string;
  dueTime: string;
  createdAt: string;
  attachmentFileName?: string;
  attachmentNote?: string;
}

const getInitials = (name: string) => {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const toDateOnly = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "—";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

const normalizeTaskAssignees = (task: Task): Task => {
  const legacyAssignee = typeof task.assignee === "string" ? task.assignee.trim() : "";
  const assignees = Array.isArray(task.assignees)
    ? task.assignees.filter(Boolean)
    : legacyAssignee
      ? [legacyAssignee]
      : [];
  return { ...task, assignees };
};

const getEmployeeTaskStats = (employeeName: string, allTasks: Task[]) => {
  const employeeTasks = allTasks.filter((task) =>
    task.assignees?.includes(employeeName) || task.assignee === employeeName
  );

  const sortedTasks = [...employeeTasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = sortedTasks.length;
  const completed = sortedTasks.filter((t) => t.status === "completed").length;
  const pending = sortedTasks.filter((t) => t.status === "pending" || t.status === "in-progress").length;
  const overdue = sortedTasks.filter((t) => t.status === "overdue").length;

  return { total, completed, pending, overdue, sortedTasks };
};

const getPriorityStyles = (priority: string) => {
  switch (priority) {
    case "high":
      return { bg: "#ef44441a", text: "#ef4444" };
    case "medium":
      return { bg: "#eab3081a", text: "#eab308" };
    default:
      return { bg: "#22c55e1a", text: "#22c55e" };
  }
};

const getStatusStyles = (status: string) => {
  switch (status) {
    case "completed":
      return { bg: "#22c55e1a", text: "#22c55e", label: "completed" };
    case "in-progress":
      return { bg: "#3b82f61a", text: "#3b82f6", label: "in-progress" };
    case "overdue":
      return { bg: "#ef44441a", text: "#ef4444", label: "overdue" };
    default:
      return { bg: "#f4f4f5", text: "#71717a", label: "pending" };
  }
};

export default function TaskHistory() {
  const { uiTheme } = useTheme();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme?.theme || ""),
    [uiTheme?.theme]
  );

  const themeColors = useMemo(() => {
    const goldPrimary = "#D4AF37";
    const goldAccent = "#AA7C11";

    if (isDark) {
      return {
        background: "#0D1117",
        cardBg: "#161B22",
        text: "#FFFFFF",
        muted: "#8B949E",
        border: "#30363D",
        primary: goldPrimary,
        accent: goldAccent,
        surface: "#21262D",
        success: "#2EA44F",
        warning: "#F59E0B",
        danger: "#F85149",
        inputBg: "#0D1117",
        white: "#FFFFFF",
      };
    }
    return {
      background: "#F8FAFC",
      cardBg: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",
      primary: goldAccent,
      accent: goldPrimary,
      surface: "#F1F5F9",
      success: "#166534",
      warning: "#D97706",
      danger: "#DC2626",
      inputBg: "#F8FAFC",
      white: "#FFFFFF",
    };
  }, [isDark]);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);

      const taskResponse = await listResource<any>("tasks");
      let extractedTasks: Task[] = [];
      if (taskResponse && Array.isArray(taskResponse.items)) {
        extractedTasks = taskResponse.items;
      } else if (Array.isArray(taskResponse)) {
        extractedTasks = taskResponse;
      }
      setTasks(extractedTasks.map(normalizeTaskAssignees));

      let allEmployees: Employee[] = [];
      try {
        const employeeResponse = await listResource<any>("employees");
        let extractedEmployees: Employee[] = [];
        if (employeeResponse && Array.isArray(employeeResponse.items)) {
          extractedEmployees = employeeResponse.items;
        } else if (Array.isArray(employeeResponse)) {
          extractedEmployees = employeeResponse;
        }
        allEmployees = extractedEmployees.filter((e) => e.status === "active");
      } catch (err) {
        console.error(err);
      }

      try {
        const userResponse = await listResource<any>("users");
        let extractedUsers: User[] = [];
        if (userResponse && Array.isArray(userResponse.items)) {
          extractedUsers = userResponse.items;
        } else if (Array.isArray(userResponse)) {
          extractedUsers = userResponse;
        }

        const employeeUsers = extractedUsers
          .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
          .map((u) => ({
            id: u.id || u._id || String(Math.random()),
            name: u.name,
            email: u.email,
            status: "active" as const,
          }));

        employeeUsers.forEach((eu) => {
          if (!allEmployees.some((e) => e.email === eu.email)) {
            allEmployees.push(eu);
          }
        });
      } catch (err) {
        console.error(err);
      }

      setEmployees(allEmployees);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  void loadData();
}, []);

  const filteredEmployees = employees.filter((emp) =>
    (emp.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (emp.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setModalVisible(true);
  };

  const modalStats = selectedEmployee ? getEmployeeTaskStats(selectedEmployee.name, tasks) : null;
  const sortedEmployeeTasks = modalStats?.sortedTasks || [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>Task History</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.muted }]}>View task history for all employees</Text>
        </View>

        <View style={[styles.card, styles.shadow, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <View style={styles.searchContainer}>
            <Search size={18} color={themeColors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.input, { color: themeColors.text }]}
              placeholder="Search employees..."
              placeholderTextColor={themeColors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <View style={[styles.card, styles.shadow, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: themeColors.border }]}>
            <Users size={20} color={themeColors.primary} />
            <Text style={[styles.cardTitle, { color: themeColors.text }]}>All Employees ({filteredEmployees.length})</Text>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={[styles.loadingText, { color: themeColors.muted }]}>Loading employees...</Text>
            </View>
          ) : filteredEmployees.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, { color: themeColors.muted }]}>No employees found</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredEmployees.map((employee) => {
                const stats = getEmployeeTaskStats(employee.name, tasks);
                return (
                  <TouchableOpacity
                    key={employee.id}
                    style={[styles.listItem, { borderBottomColor: themeColors.border }]}
                    onPress={() => handleEmployeeClick(employee)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.leftRow}>
                      <View style={[styles.avatar, { backgroundColor: themeColors.primary }]}>
                        <Text style={styles.avatarText}>{getInitials(employee.name)}</Text>
                      </View>
                      <View style={styles.infoContainer}>
                        <Text style={[styles.employeeName, { color: themeColors.text }]} numberOfLines={1}>
                          {employee.name}
                        </Text>
                        <Text style={[styles.employeeEmail, { color: themeColors.muted }]} numberOfLines={1}>
                          {employee.email}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.rightRow}>
                      {stats.total > 0 ? (
                        <View style={styles.statsContainer}>
                          <View style={[styles.totalBadge, { backgroundColor: themeColors.surface }]}>
                            <Text style={[styles.totalBadgeText, { color: themeColors.text }]}>{stats.total} Total</Text>
                          </View>
                          {stats.completed > 0 && <CheckCircle2 size={14} color={themeColors.success} style={styles.statMiniIcon} />}
                          {stats.pending > 0 && <Clock size={14} color={themeColors.warning} style={styles.statMiniIcon} />}
                          {stats.overdue > 0 && <AlertCircle size={14} color={themeColors.danger} style={styles.statMiniIcon} />}
                        </View>
                      ) : (
                        <Text style={[styles.noTasksText, { color: themeColors.muted }]}>No tasks</Text>
                      )}
                      <ChevronRight size={18} color={themeColors.muted} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBg }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={[styles.modalAvatar, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.modalAvatarText}>
                    {selectedEmployee ? getInitials(selectedEmployee.name) : ""}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {selectedEmployee?.name}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: themeColors.muted }]} numberOfLines={1}>
                    Task History
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: themeColors.surface }]} 
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={18} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={[styles.modalScrollView, { backgroundColor: themeColors.background }]} 
              contentContainerStyle={styles.modalScrollBody}
              showsVerticalScrollIndicator={true}
            >
              
              {modalStats && (
                <View style={styles.statsGrid}>
                  <View style={[styles.statBox, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                    <Text style={[styles.statBoxLabel, { color: themeColors.muted }]}>Total Tasks</Text>
                    <Text style={[styles.statBoxCount, { color: themeColors.text }]}>{modalStats.total}</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                    <Text style={[styles.statBoxLabel, { color: themeColors.success }]}>Completed</Text>
                    <Text style={[styles.statBoxCount, { color: themeColors.success }]}>{modalStats.completed}</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                    <Text style={[styles.statBoxLabel, { color: themeColors.warning }]}>Pending</Text>
                    <Text style={[styles.statBoxCount, { color: themeColors.warning }]}>{modalStats.pending}</Text>
                  </View>
                  <View style={[styles.statBox, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                    <Text style={[styles.statBoxLabel, { color: themeColors.danger }]}>Overdue</Text>
                    <Text style={[styles.statBoxCount, { color: themeColors.danger }]}>{modalStats.overdue}</Text>
                  </View>
                </View>
              )}

              <View style={styles.sectionHeaderRow}>
                <FileText size={18} color={themeColors.primary} />
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>All Tasks ({sortedEmployeeTasks.length})</Text>
              </View>

              {sortedEmployeeTasks.length === 0 ? (
                <View style={styles.emptyTasksContainer}>
                  <View style={[styles.emptyTaskIconCircle, { backgroundColor: themeColors.surface }]}>
                    <FileText size={24} color={themeColors.muted} />
                  </View>
                  <Text style={[styles.emptyText, { color: themeColors.muted }]}>No tasks assigned to this employee</Text>
                </View>
              ) : (
                sortedEmployeeTasks.map((task) => {
                  const priorityConfig = getPriorityStyles(task.priority);
                  const statusConfig = getStatusStyles(task.status);
                  
                  return (
                    <View key={task.id} style={[styles.richTaskCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                      
                      <View style={styles.taskMetaRow}>
                        <Text style={[styles.taskShortId, { color: themeColors.muted }]}>#{task.id.slice(-6)}</Text>
                        
                        <View style={styles.badgeGroup}>
                          <View style={[styles.metaBadge, { backgroundColor: priorityConfig.bg }]}>
                            <Text style={[styles.metaBadgeText, { color: priorityConfig.text }]}>
                              {task.priority}
                            </Text>
                          </View>
                          
                          <View style={[styles.metaBadge, { backgroundColor: statusConfig.bg }]}>
                            <Text style={[styles.metaBadgeText, { color: statusConfig.text }]}>
                              {statusConfig.label}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <Text style={[styles.richTaskTitle, { color: themeColors.text }]}>{task.title}</Text>
                      
                      {task.description ? (
                        <Text style={[styles.richTaskDesc, { color: themeColors.muted }]}>{task.description}</Text>
                      ) : null}

                      <View style={styles.taskTimeRow}>
                        <View style={styles.timeItem}>
                          <Calendar size={13} color={themeColors.muted} />
                          <Text style={[styles.timeItemText, { color: themeColors.muted }]}>
                            Assigned: {toDateOnly(task.createdAt)}
                          </Text>
                        </View>
                        
                        <View style={styles.timeItem}>
                          <Clock size={13} color={themeColors.muted} />
                          <Text style={[styles.timeItemText, { color: themeColors.muted }]}>
                            Due: {toDateOnly(task.dueDate)} {task.dueTime ? `at ${task.dueTime}` : ""}
                          </Text>
                        </View>
                      </View>

                      {task.attachmentFileName ? (
                        <View style={[styles.attachmentBanner, { backgroundColor: themeColors.surface }]}>
                          <FileText size={13} color={themeColors.muted} style={{ marginRight: 4 }} />
                          <Text style={[styles.attachmentText, { color: themeColors.text }]} numberOfLines={1}>
                            Has attachment: {task.attachmentFileName}
                          </Text>
                        </View>
                      ) : null}

                      {task.attachmentNote ? (
                        <View style={[styles.noteContainer, { backgroundColor: `${themeColors.surface}66`, borderLeftColor: themeColors.muted }]}>
                          <Text style={[styles.noteText, { color: themeColors.text }]}>
                            <Text style={{ fontWeight: "600", color: themeColors.text }}>Note: </Text>
                            {task.attachmentNote}
                          </Text>
                        </View>
                      ) : null}

                      <View style={[styles.cardDivider, { backgroundColor: themeColors.border }]} />
                      
                      <View style={styles.statusFooterMsg}>
                        {task.status === "completed" && (
                          <View style={styles.footerMsgItem}>
                            <CheckCircle2 size={14} color={themeColors.success} />
                            <Text style={[styles.footerMsgText, { color: themeColors.success }]}>
                              Task completed successfully
                            </Text>
                          </View>
                        )}
                        {task.status === "overdue" && (
                          <View style={styles.footerMsgItem}>
                            <AlertTriangle size={14} color={themeColors.danger} />
                            <Text style={[styles.footerMsgText, { color: themeColors.danger }]}>
                              Task is overdue
                            </Text>
                          </View>
                        )}
                        {(task.status === "pending" || task.status === "in-progress") && (
                          <View style={styles.footerMsgItem}>
                            <Clock size={14} color={themeColors.warning} />
                            <Text style={[styles.footerMsgText, { color: themeColors.warning }]}>
                              Task is pending
                            </Text>
                          </View>
                        )}
                      </View>

                    </View>
                  );
                })
              )}
            </ScrollView>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
    },
    container: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32,
    },
    header: {
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
    },
    headerSubtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    card: {
      borderRadius: 12,
      marginBottom: 16,
      overflow: "hidden",
      borderWidth: 1,
    },
    shadow: {
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      height: 48,
    },
    searchIcon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      fontSize: 15,
      height: "100%",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    centerContainer: {
      padding: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      fontSize: 14,
      marginTop: 8,
    },
    emptyText: {
      fontSize: 14,
      textAlign: "center",
    },
    listContainer: {
      width: "100%",
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
    },
    leftRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
      marginRight: 8,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "600",
    },
    infoContainer: {
      marginLeft: 12,
      flex: 1,
    },
    employeeName: {
      fontSize: 15,
      fontWeight: "500",
    },
    employeeEmail: {
      fontSize: 12,
      marginTop: 2,
    },
    rightRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statsContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 4,
    },
    totalBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 6,
    },
    totalBadgeText: {
      fontSize: 11,
      fontWeight: "500",
    },
    statMiniIcon: {
      marginLeft: 4,
    },
    noTasksText: {
      fontSize: 12,
      marginRight: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      width: "100%",
      height: "85%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      overflow: "hidden",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
    },
    modalHeaderTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    modalAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    modalAvatarText: {
      color: "#ffffff",
      fontSize: 15,
      fontWeight: "700",
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
    },
    modalSubtitle: {
      fontSize: 13,
      marginTop: 1,
    },
    closeButton: {
      padding: 6,
      borderRadius: 20,
      marginLeft: 12,
    },
    modalScrollView: {
      flex: 1,
    },
    modalScrollBody: {
      padding: 20,
      paddingBottom: 40,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 24,
    },
    statBox: {
      flex: 1,
      minWidth: "45%",
      padding: 14,
      borderRadius: 10,
      borderWidth: 1,
    },
    statBoxLabel: {
      fontSize: 12,
      fontWeight: "500",
    },
    statBoxCount: {
      fontSize: 24,
      fontWeight: "700",
      marginTop: 4,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "600",
    },
    emptyTasksContainer: {
      paddingVertical: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyTaskIconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    richTaskCard: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 14,
      borderWidth: 1,
    },
    taskMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    taskShortId: {
      fontSize: 12,
      fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
    badgeGroup: {
      flexDirection: "row",
      gap: 6,
    },
    metaBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    metaBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      textTransform: "lowercase",
    },
    richTaskTitle: {
      fontSize: 16,
      fontWeight: "600",
      lineHeight: 22,
    },
    richTaskDesc: {
      fontSize: 13,
      marginTop: 4,
      lineHeight: 18,
    },
    taskTimeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      columnGap: 16,
      rowGap: 6,
      marginTop: 12,
    },
    timeItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    timeItemText: {
      fontSize: 12,
    },
    attachmentBanner: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 6,
      marginTop: 12,
    },
    attachmentText: {
      fontSize: 12,
      flex: 1,
    },
    noteContainer: {
      padding: 10,
      borderRadius: 8,
      marginTop: 12,
      borderLeftWidth: 3,
    },
    noteText: {
      fontSize: 12,
      lineHeight: 16,
    },
    cardDivider: {
      height: 1,
      marginTop: 14,
      marginBottom: 10,
    },
    statusFooterMsg: {
      width: "100%",
    },
    footerMsgItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    footerMsgText: {
      fontSize: 12,
      fontWeight: "500",
    },
  });
}