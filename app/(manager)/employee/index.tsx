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
  Dimensions
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  MoreHorizontal, 
  Users, 
  X
} from "lucide-react-native";

// --- Design System Tokens ---
const COLORS = {
  primary: "#2563eb",
  primaryLight: "#dbeafe",
  success: "#10b981",
  successLight: "#d1fae5",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  destructive: "#ef4444",
  destructiveLight: "#fee2e2",
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textLight: "#64748b",
};

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

const statusColors = {
  active: COLORS.success,
  inactive: COLORS.textLight,
  "on-leave": COLORS.warning,
};

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
  console.log(res);
  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`API error (${res.status}): ${errorText}`);
  }
  return res.json();
};

export default function Employees() {
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
      // The API endpoint directly returns either an array or an object holding the items array
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{getInitials(employee.name)}</Text>
              <View style={[styles.statusIndicatorDot, { backgroundColor: statusColors[employee.status] }]} />
            </View>
            <View style={styles.headerMetaData}>
              <Text style={styles.employeeName} numberOfLines={1}>{employee.name}</Text>
              <Text style={styles.employeeRole} numberOfLines={1}>{employee.role}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.moreButton} 
            onPress={() => setActiveMenuId(isMenuOpen ? null : employee.id)}
          >
            <MoreHorizontal size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {isMenuOpen && (
          <View style={styles.inlineActionDropdown}>
            <TouchableOpacity style={styles.inlineActionItem} onPress={() => openView(employee)}>
              <Text style={styles.actionTextView}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionItem} onPress={() => triggerDelete(employee)}>
              <Text style={styles.actionTextDelete}>Delete Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardBody}>
          <View style={styles.infoLine}>
            <Mail size={14} color={COLORS.textLight} style={styles.iconSpaced} />
            <Text style={styles.infoLineText} numberOfLines={1}>{employee.email}</Text>
          </View>
          <View style={styles.infoLine}>
            <Phone size={14} color={COLORS.textLight} style={styles.iconSpaced} />
            <Text style={styles.infoLineText} numberOfLines={1}>{employee.phone}</Text>
          </View>
          <View style={styles.infoLine}>
            <MapPin size={14} color={COLORS.textLight} style={styles.iconSpaced} />
            <Text style={styles.infoLineText} numberOfLines={1}>{employee.location}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.badgeWrapper}>
            <View style={[styles.statusIndicatorDotSmall, { backgroundColor: statusColors[employee.status] }]} />
            <Text style={[styles.statusBadgeText, { color: statusColors[employee.status] }]}>
              {statusLabels[employee.status]}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.mainContainer}>
        
        {/* Top Header Block */}
        <View style={styles.header}>
          <Text style={styles.title}>Employee Directory</Text>
          <Text style={styles.subtitle}>View and manage corporate team members</Text>
        </View>

        {/* Input Controls Pipeline */}
        <View style={styles.filterSection}>
          <View style={styles.searchContainer}>
            <Search size={16} color={COLORS.textLight} style={styles.searchIcon} />
            <TextInput
              placeholder="Search by name, email, or position..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScroll}>
            {["all", "active", "on-leave", "inactive"].map((statusOption) => (
              <TouchableOpacity
                key={statusOption}
                style={[
                  styles.pillButton,
                  statusFilter === statusOption && styles.pillButtonActive
                ]}
                onPress={() => setStatusFilter(statusOption)}
              >
                <Text style={[
                  styles.pillText,
                  statusFilter === statusOption && styles.pillTextActive
                ]}>
                  {statusOption === "all" ? "All Status" : statusLabels[statusOption as keyof typeof statusLabels]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Fetch Engine Views */}
        {employeesQuery.isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Syncing live directory records...</Text>
          </View>
        ) : employeesQuery.isError ? (
          <View style={styles.centerBox}>
            <Text style={styles.errorText}>Failed connection to live directory API endpoint.</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={styles.centerBox}>
            <Users size={48} color={COLORS.textLight} />
            <Text style={styles.noResultsTitle}>No structural profiles found</Text>
            <Text style={styles.noResultsSubtitle}>Try modifying your filters or text search query values.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.id}
            renderItem={renderEmployeeCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Real-Time Total Metrics Footer panel */}
        <View style={styles.footerStatsRow}>
          <Text style={styles.showingText}>Showing {filteredEmployees.length} of {employees.length}</Text>
          <View style={styles.footerStatusMetrics}>
            <Text style={styles.metricItem}>
              🟢 {employees.filter((e) => e.status === "active").length} Active
            </Text>
            <Text style={styles.metricItem}>
              🟡 {employees.filter((e) => e.status === "on-leave").length} Leave
            </Text>
          </View>
        </View>

      </View>

      {/* Modal Profile Sheet Details View */}
      <Modal visible={isViewOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />

            {selectedEmployee && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalProfileRow}>
                    <View style={styles.modalAvatarPlaceholder}>
                      <Text style={styles.modalAvatarText}>{getInitials(selectedEmployee.name)}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.detailsViewTitle}>{selectedEmployee.name}</Text>
                      <Text style={styles.detailsViewSubtitle}>{selectedEmployee.role}</Text>
                    </View>
                    <TouchableOpacity style={styles.closeCircle} onPress={() => setIsViewOpen(false)}>
                      <X size={16} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.detailsGrid}>
                    <View style={styles.detailBlockFull}>
                      <Text style={styles.detailLabel}>Email Address</Text>
                      <Text style={styles.detailValueText}>{selectedEmployee.email}</Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Contact Phone Line</Text>
                      <Text style={styles.detailValueText}>{selectedEmployee.phone}</Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Assigned Workstation Location</Text>
                      <Text style={styles.detailValueText}>{selectedEmployee.location}</Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Job Category Structure</Text>
                      <Text style={styles.detailValueText}>{selectedEmployee.category}</Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Assigned Operational Shift</Text>
                      <Text style={styles.detailValueText}>{selectedEmployee.shift}</Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Compensation Pay Rate</Text>
                      <Text style={styles.detailValueText}>{selectedEmployee.payRate}</Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Employment Status Tag</Text>
                      <Text style={styles.detailValueText}>{statusLabels[selectedEmployee.status]}</Text>
                    </View>

                    <View style={styles.detailBlockHalf}>
                      <Text style={styles.detailLabel}>Onboarding Hire Date</Text>
                      <Text style={styles.detailValueText}>
                        {selectedEmployee.hireDate ? new Date(selectedEmployee.hireDate).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.dismissActionBtn} onPress={() => setIsViewOpen(false)}>
                    <Text style={styles.dismissActionBtnText}>Close Detailed Sheet</Text>
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

// --- Layout Optimization StyleSheet Matrix ---
const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: COLORS.background },
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 2 },
  filterSection: { marginBottom: 16, gap: 12 },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  pillsScroll: { flexDirection: "row", marginVertical: 4 },
  pillButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  pillButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pillText: { fontSize: 13, fontWeight: "500", color: COLORS.textLight },
  pillTextActive: { color: "#fff" },
  listContainer: { paddingBottom: 24, gap: 12 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  profileRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center", position: "relative" },
  avatarText: { fontSize: 14, fontWeight: "600", color: COLORS.primary },
  statusIndicatorDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: COLORS.card },
  headerMetaData: { flex: 1 },
  employeeName: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  employeeRole: { fontSize: 13, color: COLORS.textLight, marginTop: 1 },
  moreButton: { padding: 4 },
  inlineActionDropdown: { flexDirection: "row", justifyContent: "space-around", backgroundColor: COLORS.background, borderRadius: 8, paddingVertical: 8, marginVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  inlineActionItem: { paddingVertical: 4, paddingHorizontal: 12 },
  actionTextView: { color: COLORS.primary, fontSize: 13, fontWeight: "600" },
  actionTextDelete: { color: COLORS.destructive, fontSize: 13, fontWeight: "600" },
  cardBody: { marginTop: 14, gap: 8 },
  infoLine: { flexDirection: "row", alignItems: "center" },
  iconSpaced: { marginRight: 8 },
  infoLineText: { fontSize: 13, color: COLORS.textLight },
  cardFooter: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: "row", alignItems: "center" },
  badgeWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusIndicatorDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusBadgeText: { fontSize: 12, fontWeight: "500" },
  centerBox: { flex: 1, alignItems: "center", justifyValue: "center", paddingVertical: 40, justifyContent: "center" },
  loadingText: { fontSize: 14, color: COLORS.textLight, marginTop: 10 },
  errorText: { color: COLORS.destructive, fontSize: 14 },
  noResultsTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text, marginTop: 12 },
  noResultsSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  footerStatsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  showingText: { fontSize: 12, color: COLORS.textLight },
  footerStatusMetrics: { flexDirection: "row", gap: 12 },
  metricItem: { fontSize: 12, color: COLORS.textLight },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingBottom: 32 },
  modalDragHandle: { width: 38, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 10 },
  modalHeader: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalProfileRow: { flexDirection: "row", alignItems: "center" },
  modalAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: "center", justifyContent: "center" },
  modalAvatarText: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  detailsViewTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  detailsViewSubtitle: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
  closeCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  modalBody: { padding: 20 },
  detailsGrid: { gap: 16 },
  detailBlockFull: { width: "100%" },
  detailBlockHalf: { width: "100%" },
  detailLabel: { fontSize: 12, color: COLORS.textLight, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  detailValueText: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  modalFooter: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  dismissActionBtn: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, height: 48, alignItems: "center", justifyContent: "center" },
  dismissActionBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
});