import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  MoreHorizontal, 
  Users, 
  X
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";

// --- Interfaces & Data Mappers ---
interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  role: string;
  company: string;
  status: "active" | "inactive" | "on-leave";
  payRate: string;
  shift: string;
  hireDate: string;
  location: string;
  joinDate: string;
  avatar: string;
}

type EmployeeApi = Omit<Employee, "id"> & { _id: string };

function normalizeEmployee(e: EmployeeApi): Employee {
  return {
    id: e._id,
    name: e.name || "Unknown Name",
    email: e.email || "—",
    phone: e.phone || "—",
    category: e.category || "—",
    role: e.role || "Employee",
    company: e.company || "—",
    status: (e.status === "active" || e.status === "inactive" || e.status === "on-leave") ? e.status : "active",
    payRate: e.payRate || "—",
    shift: e.shift || "—",
    hireDate: e.hireDate || "",
    location: e.location || "—",
    joinDate: e.joinDate || e.hireDate || new Date().toISOString(),
    avatar: e.avatar || "",
  };
}

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  "on-leave": "On Leave",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "?" : "";
  return (first + last).toUpperCase();
}

// --- Live Real API Utility ---
const BASE_API_URL = "https://task.se7eninc.com/api/employees";

const apiFetch = async <T,>(urlSuffix: string = "", init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_API_URL}${urlSuffix}`, init);
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`API error (${res.status}): ${errorText}`);
  }
  return res.json();
};

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0b0c16" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "rgba(255, 255, 255, 0.03)" : "#ffffff"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#ffffff" : "#0f172a"),
    textSecondary:   isDark ? "#94a3b8" : "#64748b",
    textMuted:       isDark ? "#64748b" : "#94a3b8",
    border:          isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
    borderLight:     isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
    inputBg:         isDark ? "rgba(0, 0, 0, 0.4)" : "#ffffff",
    primary:         uiTheme.customColors?.primary || "#2563eb",
    primaryLight:    isDark ? "rgba(37, 99, 235, 0.15)" : "#dbeafe",
    success:         "#10b981",
    warning:         "#f59e0b",
    destructive:     "#ef4444",
    modalBg:         isDark ? "#1e293b" : "#ffffff",
    overlayBg:       isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(15, 23, 42, 0.6)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeContainer: { flex: 1, backgroundColor: colors.background },
    mainContainer: { flex: 1, paddingHorizontal: wp(4), paddingTop: hp(1.5) },
    header: { marginBottom: hp(2) },
    title: { fontSize: fs(6), fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
    subtitle: { fontSize: fs(3.2), color: colors.textSecondary, marginTop: hp(0.25) },
    filterSection: { marginBottom: hp(2), gap: hp(1.5) },
    searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2.5), paddingHorizontal: wp(3), height: hp(5.2) },
    searchIcon: { marginRight: wp(2) },
    searchInput: { flex: 1, fontSize: fs(3.2), color: colors.text },
    pillsScroll: { flexDirection: "row", marginVertical: hp(0.5) },
    pillButton: { paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: wp(5), backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, marginRight: wp(2) },
    pillButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { fontSize: fs(3), fontWeight: "500", color: colors.textSecondary },
    pillTextActive: { color: "#fff" },
    listContainer: { paddingBottom: hp(3), gap: hp(1.5) },
    card: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: wp(3), padding: wp(4) },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    profileRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: wp(3) },
    avatarContainer: { width: wp(11), height: wp(11), borderRadius: wp(5.5), backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", position: "relative" },
    avatarText: { fontSize: fs(3.5), fontWeight: "600", color: colors.primary },
    statusIndicatorDot: { position: "absolute", bottom: 0, right: 0, width: wp(3), height: wp(3), borderRadius: wp(1.5), borderWidth: 2, borderColor: colors.cardBg },
    headerMetaData: { flex: 1 },
    employeeName: { fontSize: fs(3.8), fontWeight: "600", color: colors.text },
    employeeRole: { fontSize: fs(3), color: colors.textSecondary, marginTop: hp(0.25) },
    moreButton: { padding: wp(1) },
    inlineActionDropdown: { flexDirection: "row", justifyContent: "space-around", backgroundColor: colors.background, borderRadius: wp(2), paddingVertical: hp(1), marginVertical: hp(1.2), borderWidth: 1, borderColor: colors.border },
    inlineActionItem: { paddingVertical: hp(0.5), paddingHorizontal: wp(3) },
    actionTextView: { color: colors.primary, fontSize: fs(3), fontWeight: "600" },
    actionTextDelete: { color: colors.destructive, fontSize: fs(3), fontWeight: "600" },
    cardBody: { marginTop: hp(1.8), gap: hp(1) },
    infoLine: { flexDirection: "row", alignItems: "center" },
    iconSpaced: { marginRight: wp(2) },
    infoLineText: { fontSize: fs(3), color: colors.textSecondary },
    cardFooter: { marginTop: hp(1.8), paddingTop: hp(1.5), borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center" },
    badgeWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, paddingHorizontal: wp(2), paddingVertical: hp(0.5), borderRadius: wp(1.5) },
    statusIndicatorDotSmall: { width: wp(1.5), height: wp(1.5), borderRadius: wp(0.75), marginRight: wp(1.5) },
    statusBadgeText: { fontSize: fs(2.8), fontWeight: "500" },
    centerBox: { flex: 1, alignItems: "center", paddingVertical: hp(5), justifyContent: "center" },
    loadingText: { fontSize: fs(3.2), color: colors.textSecondary, marginTop: hp(1.2) },
    errorText: { color: colors.destructive, fontSize: fs(3.2) },
    noResultsTitle: { fontSize: fs(4), fontWeight: "600", color: colors.text, marginTop: hp(1.5) },
    noResultsSubtitle: { fontSize: fs(3), color: colors.textSecondary, marginTop: hp(0.5) },
    footerStatsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: hp(1.5), borderTopWidth: 1, borderTopColor: colors.border },
    showingText: { fontSize: fs(2.8), color: colors.textSecondary },
    footerStatusMetrics: { flexDirection: "row", gap: wp(3) },
    metricItem: { fontSize: fs(2.8), color: colors.textSecondary },
    modalOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    modalContent: { backgroundColor: colors.modalBg, borderTopLeftRadius: wp(5), borderTopRightRadius: wp(5), maxHeight: "85%", paddingBottom: hp(4) },
    modalDragHandle: { width: wp(10), height: hp(0.5), backgroundColor: colors.border, borderRadius: wp(0.5), alignSelf: "center", marginTop: hp(1.2), marginBottom: hp(1.2) },
    modalHeader: { paddingHorizontal: wp(5), paddingBottom: hp(2), borderBottomWidth: 1, borderBottomColor: colors.border },
    modalProfileRow: { flexDirection: "row", alignItems: "center" },
    modalAvatarPlaceholder: { width: wp(12), height: wp(12), borderRadius: wp(6), backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
    modalAvatarText: { fontSize: fs(4), fontWeight: "700", color: colors.primary },
    detailsViewTitle: { fontSize: fs(4.5), fontWeight: "700", color: colors.text },
    detailsViewSubtitle: { fontSize: fs(3), color: colors.textSecondary, marginTop: hp(0.25) },
    closeCircle: { width: wp(7), height: wp(7), borderRadius: wp(3.5), backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
    modalBody: { padding: wp(5) },
    detailsGrid: { gap: hp(2) },
    detailBlockFull: { width: "100%" },
    detailBlockHalf: { width: "100%" },
    detailLabel: { fontSize: fs(2.8), color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: hp(0.5) },
    detailValueText: { fontSize: fs(3.8), fontWeight: "500", color: colors.text },
    modalFooter: { paddingHorizontal: wp(5), paddingTop: hp(2), borderTopWidth: 1, borderTopColor: colors.border },
    dismissActionBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2.5), height: hp(5.8), alignItems: "center", justifyContent: "center" },
    dismissActionBtnText: { fontSize: fs(3.5), fontWeight: "600", color: colors.text },
  });
}

export default function Employees() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme?.theme as string) === 'dark' || (uiTheme?.theme as string) === 'metallic-elite';
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusColors = useMemo(() => ({
    active: colors.success,
    inactive: colors.textSecondary,
    "on-leave": colors.warning,
  }), [colors]);

  const { view } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Modal controllers
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // --- TanStack Query: Fetch from Production Endpoint ---
  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const responseData = await apiFetch<any>("");
      const items = Array.isArray(responseData) 
        ? responseData 
        : (responseData?.items || responseData?.data || []);
      
      return items.map(normalizeEmployee);
    },
  });

  const employees = employeesQuery.data ?? [];

  // Handle explicit deep-linking checking
  useEffect(() => {
    const viewId = typeof view === "string" ? view.trim() : "";
    if (!viewId || isViewOpen) return;

    const match = employees.find((e) => String(e.id) === viewId);
    if (!match) return;

    openView(match);
  }, [employees, view]);

  // --- TanStack Mutation: Live API Delete Call ---
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      Alert.alert("Success", "Employee profile was deleted successfully.");
    },
    onError: (err) => {
      Alert.alert("Deletion Error", err instanceof Error ? err.message : "Unable to delete employee entry.");
    }
  });

  // --- Navigation Handlers ---
  const openView = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
    setActiveMenuId(null);
  };

  const triggerDelete = (employee: Employee) => {
    setActiveMenuId(null);
    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to completely remove ${employee.name} from the database records?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Profile", 
          style: "destructive", 
          onPress: () => deleteEmployeeMutation.mutate(employee.id) 
        }
      ]
    );
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || employee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const renderEmployeeCard = ({ item: employee }: { item: Employee }) => {
    const isMenuOpen = activeMenuId === employee.id;

    return (
      <View style={s(styles.card)}>
        <View style={s(styles.cardHeader)}>
          <View style={s(styles.profileRow)}>
            <View style={s(styles.avatarContainer)}>
              <Text style={s(styles.avatarText)}>{getInitials(employee.name)}</Text>
              <View style={s([styles.statusIndicatorDot, { backgroundColor: statusColors[employee.status] }])} />
            </View>
            <View style={s(styles.headerMetaData)}>
              <Text style={s(styles.employeeName)} numberOfLines={1}>{employee.name}</Text>
              <Text style={s(styles.employeeRole)} numberOfLines={1}>{employee.role}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={s(styles.moreButton)} 
            onPress={() => setActiveMenuId(isMenuOpen ? null : employee.id)}
          >
            <MoreHorizontal size={fs(4.5)} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {isMenuOpen && (
          <View style={s(styles.inlineActionDropdown)}>
            <TouchableOpacity style={s(styles.inlineActionItem)} onPress={() => openView(employee)}>
              <Text style={s(styles.actionTextView)}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.inlineActionItem)} onPress={() => triggerDelete(employee)}>
              <Text style={s(styles.actionTextDelete)}>Delete Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s(styles.cardBody)}>
          <View style={s(styles.infoLine)}>
            <Mail size={fs(3.2)} color={colors.textSecondary} style={s(styles.iconSpaced)} />
            <Text style={s(styles.infoLineText)} numberOfLines={1}>{employee.email}</Text>
          </View>
          <View style={s(styles.infoLine)}>
            <Phone size={fs(3.2)} color={colors.textSecondary} style={s(styles.iconSpaced)} />
            <Text style={s(styles.infoLineText)} numberOfLines={1}>{employee.phone}</Text>
          </View>
          <View style={s(styles.infoLine)}>
            <MapPin size={fs(3.2)} color={colors.textSecondary} style={s(styles.iconSpaced)} />
            <Text style={s(styles.infoLineText)} numberOfLines={1}>{employee.location}</Text>
          </View>
        </View>

        <View style={s(styles.cardFooter)}>
          <View style={s(styles.badgeWrapper)}>
            <View style={s([styles.statusIndicatorDotSmall, { backgroundColor: statusColors[employee.status] }])} />
            <Text style={s([styles.statusBadgeText, { color: statusColors[employee.status] }])}>
              {statusLabels[employee.status]}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s(styles.safeContainer)}>
      <View style={s(styles.mainContainer)}>
        
        {/* Top Header Block */}
        <View style={s(styles.header)}>
          <Text style={s(styles.title)}>Employee Directory</Text>
          <Text style={s(styles.subtitle)}>View and manage corporate team members</Text>
        </View>

        {/* Input Controls Pipeline */}
        <View style={s(styles.filterSection)}>
          <View style={s(styles.searchContainer)}>
            <Search size={fs(3.8)} color={colors.textSecondary} style={s(styles.searchIcon)} />
            <TextInput
              placeholder="Search by name, email, or position..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={s(styles.searchInput)}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s(styles.pillsScroll)}>
            {["all", "active", "on-leave", "inactive"].map((statusOption) => (
              <TouchableOpacity
                key={statusOption}
                style={s([
                  styles.pillButton,
                  statusFilter === statusOption && styles.pillButtonActive
                ])}
                onPress={() => setStatusFilter(statusOption)}
              >
                <Text style={s([
                  styles.pillText,
                  statusFilter === statusOption && styles.pillTextActive
                ])}>
                  {statusOption === "all" ? "All Status" : statusLabels[statusOption as keyof typeof statusLabels]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Fetch Engine Views */}
        {employeesQuery.isLoading ? (
          <View style={s(styles.centerBox)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s(styles.loadingText)}>Syncing live directory records...</Text>
          </View>
        ) : employeesQuery.isError ? (
          <View style={s(styles.centerBox)}>
            <Text style={s(styles.errorText)}>Failed connection to live directory API endpoint.</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={s(styles.centerBox)}>
            <Users size={fs(10)} color={colors.textSecondary} />
            <Text style={s(styles.noResultsTitle)}>No structural profiles found</Text>
            <Text style={s(styles.noResultsSubtitle)}>Try modifying your filters or text search query values.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            renderItem={renderEmployeeCard}
            contentContainerStyle={s(styles.listContainer)}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Real-Time Total Metrics Footer panel */}
        <View style={s(styles.footerStatsRow)}>
          <Text style={s(styles.showingText)}>Showing {filteredEmployees.length} of {employees.length}</Text>
          <View style={s(styles.footerStatusMetrics)}>
            <Text style={s(styles.metricItem)}>
              🟢 {employees.filter((e) => e.status === "active").length} Active
            </Text>
            <Text style={s(styles.metricItem)}>
              🟡 {employees.filter((e) => e.status === "on-leave").length} Leave
            </Text>
          </View>
        </View>

      </View>

      {/* Modal Profile Sheet Details View */}
      <Modal visible={isViewOpen} animationType="slide" transparent>
        <View style={s(styles.modalOverlay)}>
          <View style={s(styles.modalContent)}>
            <View style={s(styles.modalDragHandle)} />

            {selectedEmployee && (
              <>
                <View style={s(styles.modalHeader)}>
                  <View style={s(styles.modalProfileRow)}>
                    <View style={s(styles.modalAvatarPlaceholder)}>
                      <Text style={s(styles.modalAvatarText)}>{getInitials(selectedEmployee.name)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: wp(3) }}>
                      <Text style={s(styles.detailsViewTitle)}>{selectedEmployee.name}</Text>
                      <Text style={s(styles.detailsViewSubtitle)}>{selectedEmployee.role}</Text>
                    </View>
                    <TouchableOpacity style={s(styles.closeCircle)} onPress={() => setIsViewOpen(false)}>
                      <X size={fs(3.8)} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={s(styles.modalBody)}>
                  <View style={s(styles.detailsGrid)}>
                    <View style={s(styles.detailBlockFull)}>
                      <Text style={s(styles.detailLabel)}>Email Address</Text>
                      <Text style={s(styles.detailValueText)}>{selectedEmployee.email}</Text>
                    </View>

                    <View style={s(styles.detailBlockHalf)}>
                      <Text style={s(styles.detailLabel)}>Contact Phone Line</Text>
                      <Text style={s(styles.detailValueText)}>{selectedEmployee.phone}</Text>
                    </View>

                    <View style={s(styles.detailBlockHalf)}>
                      <Text style={s(styles.detailLabel)}>Assigned Workstation Location</Text>
                      <Text style={s(styles.detailValueText)}>{selectedEmployee.location}</Text>
                    </View>

                    <View style={s(styles.detailBlockHalf)}>
                      <Text style={s(styles.detailLabel)}>Job Category Structure</Text>
                      <Text style={s(styles.detailValueText)}>{selectedEmployee.category}</Text>
                    </View>

                    <View style={s(styles.detailBlockHalf)}>
                      <Text style={s(styles.detailLabel)}>Assigned Operational Shift</Text>
                      <Text style={s(styles.detailValueText)}>{selectedEmployee.shift}</Text>
                    </View>

                    <View style={s(styles.detailBlockHalf)}>
                      <Text style={s(styles.detailLabel)}>Compensation Pay Rate</Text>
                      <Text style={s(styles.detailValueText)}>{selectedEmployee.payRate}</Text>
                    </View>

                    <View style={s(styles.detailBlockHalf)}>
                      <Text style={s(styles.detailLabel)}>Employment Status Tag</Text>
                      <Text style={s(styles.detailValueText)}>{statusLabels[selectedEmployee.status]}</Text>
                    </View>

                    <View style={s(styles.detailBlockHalf)}>
                      <Text style={s(styles.detailLabel)}>Onboarding Hire Date</Text>
                      <Text style={s(styles.detailValueText)}>
                        {selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={s(styles.modalFooter)}>
                  <TouchableOpacity style={s(styles.dismissActionBtn)} onPress={() => setIsViewOpen(false)}>
                    <Text style={s(styles.dismissActionBtnText)}>Close Detailed Sheet</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}