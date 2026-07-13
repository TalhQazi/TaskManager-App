import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Shield,
  UserCog,
  Mail,
  Calendar,
  Clock,
  AlertTriangle,
  Key,
  X,
  ChevronDown,
} from "lucide-react-native";
import {
  createResource,
  deleteResource,
  listResource,
  updateResource,
  apiFetch,
  toProxiedUrl,
} from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: "super-admin" | "admin" | "manager" | "team-lead";
  lastLogin: string;
  status: "active" | "inactive" | "pending";
  createdAt: string;
  avatarUrl?: string;
}

type BackendUser = {
  _id?: string;
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  role: "super-admin" | "admin" | "manager" | "team-lead";
  status?: "active" | "inactive" | "pending";
  createdAt?: string;
  updatedAt?: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
  lastLogin?: string;
  last_login?: string;
  created_at?: string;
};

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    textSubtle:       isDark ? "#64748B" : "#94A3B8",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#FFFFFF",
    inputBorder:      isDark ? "#334155" : "#CBD5E1",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    searchBg:         isDark ? "#0F172A" : "#F1F5F9",
    primary:          uiTheme.customColors?.primary || (isDark ? "#6366F1" : "#4F46E5"),
    primaryText:      "#FFFFFF",
    primaryMuted:     isDark ? "rgba(99,102,241,0.12)" : "rgba(99,102,241,0.08)",
    activeBadgeBg:    isDark ? "rgba(16,185,129,0.15)"  : "#DCFCE7",
    activeBadgeText:  isDark ? "#34D399"  : "#15803D",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)"  : "#FEE2E2",
    dangerBorder:     "rgba(239,68,68,0.25)",
    dangerText:       isDark ? "#FCA5A5" : "#DC2626",
    warning:          uiTheme.customColors?.warning || "#f59e0b",
    overlayBg:        "rgba(0,0,0,0.4)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loaderCenteredFrame: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    headerWrapper: {
      backgroundColor: colors.background,
    },
    headerTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    titleColumn: {
      flex: 1,
      paddingRight: 8,
    },
    mainScreenTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    mainScreenSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    createProfileBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    createProfileBtnText: {
      color: colors.primaryText,
      marginLeft: 6,
      fontWeight: "600",
      fontSize: 13,
    },
    errorAlertContainer: {
      flexDirection: "row",
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
      margin: 16,
      padding: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    errorAlertText: {
      color: colors.dangerText,
      marginLeft: 8,
      fontSize: 13,
      flex: 1,
    },
    metricsSummaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      marginTop: 16,
      gap: 8,
    },
    metricCard: {
      flex: 1,
      borderRadius: 12,
      padding: 12,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricLabel: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 6,
      fontWeight: "500",
    },
    metricValue: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginTop: 2,
    },
    filterControlRow: {
      flexDirection: "row",
      margin: 16,
      gap: 10,
    },
    searchBarContainer: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: "center",
      paddingHorizontal: 12,
      height: 44,
    },
    searchIconLayout: {
      marginRight: 8,
    },
    searchInputElement: {
      flex: 1,
      color: colors.inputText,
      fontSize: 14,
    },
    pickerFilterSelector: {
      width: 120,
      height: 44,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
    },
    pickerFilterSelectorText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      marginRight: 4,
    },
    listScrollContent: {
      paddingBottom: 40,
    },
    emptyResultsWrapper: {
      padding: 40,
      alignItems: "center",
    },
    emptyResultsText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    userListItemCard: {
      backgroundColor: colors.cardBg,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    listItemMainLayout: {
      flexDirection: "row",
      alignItems: "center",
    },
    profileAvatarFrame: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
    },
    profileAvatarImg: {
      width: 44,
      height: 44,
      borderRadius: 22,
    },
    profileAvatarFallback: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 14,
    },
    profileInfoDetailsColumn: {
      flex: 1,
      marginLeft: 12,
      paddingRight: 8,
    },
    profileNameText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    profileEmailRowInline: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    smallMailIconSpace: {
      marginRight: 4,
    },
    profileEmailText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    badgeContainersStack: {
      flexDirection: "row",
      gap: 6,
      marginTop: 6,
    },
    pillBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    pillBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    moreActionMenuTrigger: {
      padding: 6,
    },
    overlayClickDismiss: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    bottomMenuActionSheet: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: Platform.OS === "ios" ? 34 : 24,
    },
    bottomSheetTopDraggerDrag: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginBottom: 12,
    },
    bottomSheetHeaderTitleText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
      textAlign: "center",
    },
    bottomSheetRowItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    sheetRowIconPad: {
      marginRight: 12,
    },
    sheetRowTextContent: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    fullScreenFormContainer: {
      flex: 1,
      backgroundColor: colors.cardBg,
    },
    fullScreenFormHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    formPanelHeaderTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    formScrollInnerLayout: {
      padding: 20,
    },
    inputFieldDescriptionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: 14,
      marginBottom: 6,
    },
    cleanFormTextInput: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.inputBg,
      color: colors.inputText,
      fontSize: 14,
    },
    formInlineDropdownSelect: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.inputBg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    dropdownSelectedStringStyle: {
      color: colors.inputText,
      fontSize: 14,
    },
    primaryActionSubmitTriggerButton: {
      backgroundColor: colors.primary,
      height: 46,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
      marginBottom: 40,
    },
    primaryActionSubmitTriggerButtonText: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 15,
    },
    profileInspectorFrameBlock: {
      padding: 20,
      alignItems: "center",
    },
    inspectorAvatarCluster: {
      marginBottom: 16,
    },
    inspectorAvatarFrameContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    inspectorAvatarImageFrame: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    inspectorAvatarFallbackText: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 24,
    },
    inspectorProfileDisplayName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 20,
    },
    inspectorDetailedFieldsBox: {
      width: "100%",
      backgroundColor: colors.inputBg,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inspectorFieldLabelHeading: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textMuted,
      textTransform: "uppercase",
      marginTop: 10,
    },
    inspectorFieldValueText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
      marginTop: 2,
    },
    alertOverlayCenterFrame: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    alertSurfaceBoxFrame: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    alertBoxLayoutHeaderTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 10,
    },
    alertBoxDescriptionParaText: {
      color: colors.textMuted,
      marginVertical: 8,
      fontSize: 13,
      lineHeight: 18,
    },
    pickerBoxRowItemLink: {
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      alignItems: "center",
      backgroundColor: colors.inputBg,
    },
    pickerBoxRowItemLinkActive: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    pickerBoxRowItemLinkLabelText: {
      fontWeight: "600",
      color: colors.textSecondary,
    },
    pickerBoxRowItemLinkLabelTextActive: {
      color: colors.primary,
    },
    modalFooterActionsLayoutTwinRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 20,
    },
    formActionCancelControlBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.borderLight,
    },
    formActionCancelControlBtnLabelText: {
      color: colors.textSecondary,
      fontWeight: "600",
    },
    formActionConfirmControlBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.primary,
    },
    formActionConfirmControlBtnLabelText: {
      color: colors.primaryText,
      fontWeight: "600",
    },
    pickerInlineDropdownFlyoutSurface: {
      backgroundColor: colors.cardBg,
      marginHorizontal: 20,
      marginBottom: Platform.OS === "ios" ? 40 : 20,
      borderRadius: 12,
      padding: 8,
      maxHeight: 280,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
    },
    pickerInlineDropdownFlyoutItemRow: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      alignItems: "center",
    },
    pickerInlineDropdownFlyoutItemRowLabelText: {
      fontWeight: "600",
      color: colors.text,
    },
  });
}

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const { uiTheme } = useTheme();

  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [changeRoleOpen, setChangeRoleOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);

  const [roleFilterPickerOpen, setRoleFilterPickerOpen] = useState(false);
  const [formRolePickerOpen, setFormRolePickerOpen] = useState(false);
  const [formStatusPickerOpen, setFormStatusPickerOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<User["role"]>("manager");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const [addFormData, setAddFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "manager" as User["role"],
    status: "active" as User["status"],
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "manager" as User["role"],
    status: "active" as User["status"],
  });

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const isSuperAdmin = useMemo(() => {
    return currentUser?.role === "super-admin";
  }, [currentUser]);

  const roleStyles = useMemo(() => ({
    "super-admin": { bg: colors.borderLight, text: colors.text, border: colors.border },
    admin: { bg: colors.dangerBg, text: colors.dangerText, border: colors.dangerBorder },
    manager: { bg: colors.primaryMuted, text: colors.primary, border: colors.primary },
    "team-lead": { bg: colors.activeBadgeBg, text: colors.activeBadgeText, border: colors.activeBadgeText },
  }), [colors]);

  const statusStyles = useMemo(() => ({
    active: { bg: colors.activeBadgeBg, text: colors.activeBadgeText },
    inactive: { bg: colors.borderLight, text: colors.textMuted },
    pending: { bg: colors.dangerBg, text: colors.warning },
  }), [colors]);

  const getInitials = (name: string) => {
    return String(name || "")
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const loadUsersData = useCallback(async (showIndicator = true) => {
    try {
      if (showIndicator) setLoading(true);
      setApiError(null);

      const response = await listResource<any>("users", { search: searchQuery || undefined });
      const rawItems = Array.isArray(response) ? response : (response as any)?.items || [];

      const normalized = rawItems.map((u: any) => ({
        id: u.id || u._id || "",
        name: u.name || u.username || "",
        initials: getInitials(u.name || u.username || "U"),
        email: u.email || "",
        role: u.role || "team-lead",
        lastLogin: u.lastLogin || u.last_login || "Never",
        status: u.status || "active",
        createdAt: u.createdAt || u.created_at ? (u.createdAt || u.created_at).split("T")[0] : "—",
        avatarUrl: u.avatarDataUrl || u.avatarUrl || "",
      }));

      setUsers(normalized);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to load user directories.");
    } finally {
      if (showIndicator) setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadUsersData(true);
  }, [loadUsersData]);

  const handleAddUserSubmit = async () => {
    if (!addFormData.firstName.trim() || !addFormData.lastName.trim() || !addFormData.email.trim() || !addFormData.password) {
      Alert.alert("Validation Error", "Please completely fill in all mandatory text fields.");
      return;
    }
    try {
      setApiError(null);
      const fullName = `${addFormData.firstName.trim()} ${addFormData.lastName.trim()}`;
      await createResource<BackendUser>("users", {
        name: fullName,
        email: addFormData.email.trim(),
        password: addFormData.password,
        role: addFormData.role,
        status: addFormData.status,
      });
      await loadUsersData(false);
      setAddUserOpen(false);
      setAddFormData({ firstName: "", lastName: "", email: "", password: "", role: "manager", status: "active" });
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to provision new account.");
    }
  };

  const saveEditUser = async () => {
    if (!selectedUser) return;
    try {
      setApiError(null);
      await updateResource<User>("users", selectedUser.id, {
        ...selectedUser,
        name: editFormData.name,
        initials: getInitials(editFormData.name || "U"),
        email: editFormData.email,
        role: editFormData.role,
        status: editFormData.status,
      });
      await loadUsersData(false);
      setEditUserOpen(false);
      setSelectedUser(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to apply runtime edits.");
    }
  };

  const confirmChangeRole = async () => {
    if (!selectedUser) return;
    try {
      setApiError(null);
      await updateResource<User>("users", selectedUser.id, { role: newRole } as any);
      await loadUsersData(false);
      setChangeRoleOpen(false);
      setSelectedUser(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to re-assign role access levels.");
    }
  };

  const confirmResetPassword = async () => {
    if (!selectedUser) return;
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      Alert.alert("Error", "Passwords fields do not identically match.");
      return;
    }
    if (resetPasswordData.newPassword.length < 6) {
      Alert.alert("Error", "Password length parameters require at least 6 tokens.");
      return;
    }
    try {
      setResetPasswordLoading(true);
      setApiError(null);
      await apiFetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({
          newPassword: resetPasswordData.newPassword,
          confirmPassword: resetPasswordData.confirmPassword,
        }),
      });
      setResetPasswordOpen(false);
      setResetPasswordData({ newPassword: "", confirmPassword: "" });
      setSelectedUser(null);
      Alert.alert("Success", "Security context updated smoothly.");
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed processing password overwrite routine.");
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleDeactivatePress = (userTarget: User) => {
    const isInactive = userTarget.status === "inactive";
    Alert.alert(
      isInactive ? "Activate User" : "Deactivate User",
      `Are you sure you want to proceed with processing status updates for ${userTarget.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isInactive ? "Activate" : "Deactivate",
          style: "destructive",
          onPress: async () => {
            try {
              if (isInactive) {
                await updateResource<User>("users", userTarget.id, { ...userTarget, status: "active" });
              } else {
                await apiFetch(`/api/users/${userTarget.id}/archive`, { method: "POST" });
              }
              await loadUsersData(false);
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Operation aborted prematurely.");
            }
          },
        },
      ]
    );
  };

  const handleDeletePress = (userTarget: User) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to permanently erase records for ${userTarget.name}? This action cannot be revoked.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteResource("users", userTarget.id);
              await loadUsersData(false);
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Erase cycle faulted.");
            }
          },
        },
      ]
    );
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRole = roleFilter === "all" || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, searchQuery, roleFilter]);

  const metricCounts = useMemo(() => {
    return {
      adminTotal: users.filter((u) => u.role === "super-admin" || u.role === "admin").length,
      manager: users.filter((u) => u.role === "manager").length,
      teamLead: users.filter((u) => u.role === "team-lead").length,
    };
  }, [users]);

  const renderHeaderLayout = () => (
    <View style={styles.headerWrapper}>
      <View style={styles.headerTitleRow}>
        <View style={styles.titleColumn}>
          <Text style={styles.mainScreenTitle}>User Management</Text>
          <Text style={styles.mainScreenSubtitle}>Manage system users, roles, and permissions.</Text>
        </View>
        <TouchableOpacity style={styles.createProfileBtn} onPress={() => setAddUserOpen(true)}>
          <Plus color={colors.primaryText} size={16} />
          <Text style={styles.createProfileBtnText}>Add User</Text>
        </TouchableOpacity>
      </View>

      {apiError && (
        <View style={styles.errorAlertContainer}>
          <AlertTriangle color={colors.dangerText} size={16} />
          <Text style={styles.errorAlertText}>{apiError}</Text>
        </View>
      )}

      <View style={styles.metricsSummaryRow}>
        <View style={styles.metricCard}>
          <Shield color={colors.text} size={20} />
          <Text style={styles.metricLabel}>Admins</Text>
          <Text style={styles.metricValue}>{metricCounts.adminTotal}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
          <UserCog color={colors.primary} size={20} />
          <Text style={styles.metricLabel}>Managers</Text>
          <Text style={styles.metricValue}>{metricCounts.manager}</Text>
        </View>
        <View style={[styles.metricCard, { backgroundColor: colors.activeBadgeBg, borderColor: colors.activeBadgeText }]}>
          <UserCog color={colors.activeBadgeText} size={20} />
          <Text style={styles.metricLabel}>Team Leads</Text>
          <Text style={styles.metricValue}>{metricCounts.teamLead}</Text>
        </View>
      </View>

      <View style={styles.filterControlRow}>
        <View style={styles.searchBarContainer}>
          <Search color={colors.textMuted} size={18} style={styles.searchIconLayout} />
          <TextInput
            placeholder="Search by name or email..."
            placeholderTextColor={colors.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInputElement}
          />
        </View>
        <TouchableOpacity style={styles.pickerFilterSelector} onPress={() => setRoleFilterPickerOpen(true)}>
          <Text style={styles.pickerFilterSelectorText} numberOfLines={1}>
            {roleFilter === "all" ? "All Roles" : roleFilter.toUpperCase()}
          </Text>
          <ChevronDown color={colors.textMuted} size={16} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.rootContainer}>
      {loading ? (
        <View style={styles.loaderCenteredFrame}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeaderLayout}
          contentContainerStyle={styles.listScrollContent}
          ListEmptyComponent={
            <View style={styles.emptyResultsWrapper}>
              <Text style={styles.emptyResultsText}>No users match the criteria specified.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const roleTheme = roleStyles[item.role] || roleStyles["team-lead"];
            const statusTheme = statusStyles[item.status] || statusStyles["pending"];
            return (
              <View style={styles.userListItemCard}>
                <View style={styles.listItemMainLayout}>
                  <View style={[styles.profileAvatarFrame, { backgroundColor: roleTheme.text }]}>
                    {item.avatarUrl ? (
                      <Image source={{ uri: toProxiedUrl(item.avatarUrl) }} style={styles.profileAvatarImg} />
                    ) : (
                      <Text style={styles.profileAvatarFallback}>{item.initials}</Text>
                    )}
                  </View>

                  <View style={styles.profileInfoDetailsColumn}>
                    <Text style={styles.profileNameText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.profileEmailRowInline}>
                      <Mail color={colors.textMuted} size={12} style={styles.smallMailIconSpace} />
                      <Text style={styles.profileEmailText} numberOfLines={1}>
                        {item.email}
                      </Text>
                    </View>
                    <View style={styles.badgeContainersStack}>
                      <View style={[styles.pillBadge, { backgroundColor: roleTheme.bg, borderColor: roleTheme.border, borderWidth: 1 }]}>
                        <Text style={[styles.pillBadgeText, { color: roleTheme.text }]}>{item.role.toUpperCase()}</Text>
                      </View>
                      <View style={[styles.pillBadge, { backgroundColor: statusTheme.bg }]}>
                        <Text style={[styles.pillBadgeText, { color: statusTheme.text }]}>{item.status.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.moreActionMenuTrigger}
                    onPress={() => {
                      setSelectedUser(item);
                      setActionMenuOpen(true);
                    }}
                  >
                    <MoreHorizontal color={colors.textMuted} size={20} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Options Sheet Overlay */}
      <Modal visible={actionMenuOpen} transparent animationType="slide" onRequestClose={() => setActionMenuOpen(false)}>
        <TouchableOpacity style={styles.overlayClickDismiss} activeOpacity={1} onPress={() => setActionMenuOpen(false)}>
          <View style={styles.bottomMenuActionSheet}>
            <View style={styles.bottomSheetTopDraggerDrag} />
            <Text style={styles.bottomSheetHeaderTitleText}>{selectedUser?.name}</Text>

            <TouchableOpacity
              style={styles.bottomSheetRowItem}
              onPress={() => {
                setActionMenuOpen(false);
                setViewDetailsOpen(true);
              }}
            >
              <Eye color={colors.textMuted} size={18} style={styles.sheetRowIconPad} />
              <Text style={styles.sheetRowTextContent}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetRowItem}
              onPress={() => {
                setActionMenuOpen(false);
                if (selectedUser) {
                  setEditFormData({
                    name: selectedUser.name,
                    email: selectedUser.email,
                    role: selectedUser.role,
                    status: selectedUser.status,
                  });
                  setEditUserOpen(true);
                }
              }}
            >
              <Edit color={colors.primary} size={18} style={styles.sheetRowIconPad} />
              <Text style={styles.sheetRowTextContent}>Edit User</Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity
                style={styles.bottomSheetRowItem}
                onPress={() => {
                  setActionMenuOpen(false);
                  setResetPasswordOpen(true);
                }}
              >
                <Key color={colors.warning} size={18} style={styles.sheetRowIconPad} />
                <Text style={styles.sheetRowTextContent}>Reset Password</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.bottomSheetRowItem}
              onPress={() => {
                setActionMenuOpen(false);
                if (selectedUser) {
                  setNewRole(selectedUser.role);
                  setChangeRoleOpen(true);
                }
              }}
            >
              <Shield color={colors.primary} size={18} style={styles.sheetRowIconPad} />
              <Text style={styles.sheetRowTextContent}>Change Role</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bottomSheetRowItem}
              onPress={() => {
                setActionMenuOpen(false);
                if (selectedUser) handleDeactivatePress(selectedUser);
              }}
            >
              <Trash2 color={colors.warning} size={18} style={styles.sheetRowIconPad} />
              <Text style={[styles.sheetRowTextContent, { color: colors.warning }]}>Toggle Operational Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bottomSheetRowItem, { borderBottomWidth: 0 }]}
              onPress={() => {
                setActionMenuOpen(false);
                if (selectedUser) handleDeletePress(selectedUser);
              }}
            >
              <Trash2 color={colors.dangerText} size={18} style={styles.sheetRowIconPad} />
              <Text style={[styles.sheetRowTextContent, { color: colors.dangerText }]}>Permanently Delete Account</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Add User Modal */}
      <Modal visible={addUserOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAddUserOpen(false)}>
        <SafeAreaView style={styles.fullScreenFormContainer}>
          <View style={styles.fullScreenFormHeader}>
            <Text style={styles.formPanelHeaderTitle}>Add New User</Text>
            <TouchableOpacity onPress={() => setAddUserOpen(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formScrollInnerLayout}>
            <Text style={styles.inputFieldDescriptionLabel}>First Name *</Text>
            <TextInput
              style={styles.cleanFormTextInput}
              placeholder="Jane"
              placeholderTextColor={colors.placeholderText}
              value={addFormData.firstName}
              onChangeText={(t) => setAddFormData({ ...addFormData, firstName: t })}
            />

            <Text style={styles.inputFieldDescriptionLabel}>Last Name *</Text>
            <TextInput
              style={styles.cleanFormTextInput}
              placeholder="Doe"
              placeholderTextColor={colors.placeholderText}
              value={addFormData.lastName}
              onChangeText={(t) => setAddFormData({ ...addFormData, lastName: t })}
            />

            <Text style={styles.inputFieldDescriptionLabel}>Email Address *</Text>
            <TextInput
              style={styles.cleanFormTextInput}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="jane.doe@company.com"
              placeholderTextColor={colors.placeholderText}
              value={addFormData.email}
              onChangeText={(t) => setAddFormData({ ...addFormData, email: t })}
            />

            <Text style={styles.inputFieldDescriptionLabel}>Password *</Text>
            <TextInput
              style={styles.cleanFormTextInput}
              secureTextEntry
              placeholder="Minimum 6 characters"
              placeholderTextColor={colors.placeholderText}
              value={addFormData.password}
              onChangeText={(t) => setAddFormData({ ...addFormData, password: t })}
            />

            <Text style={styles.inputFieldDescriptionLabel}>System Role *</Text>
            <TouchableOpacity style={styles.formInlineDropdownSelect} onPress={() => setFormRolePickerOpen(true)}>
              <Text style={styles.dropdownSelectedStringStyle}>{addFormData.role.toUpperCase()}</Text>
              <ChevronDown color={colors.textMuted} size={16} />
            </TouchableOpacity>

            <Text style={styles.inputFieldDescriptionLabel}>Status *</Text>
            <TouchableOpacity style={styles.formInlineDropdownSelect} onPress={() => setFormStatusPickerOpen(true)}>
              <Text style={styles.dropdownSelectedStringStyle}>{addFormData.status.toUpperCase()}</Text>
              <ChevronDown color={colors.textMuted} size={16} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryActionSubmitTriggerButton} onPress={handleAddUserSubmit}>
              <Text style={styles.primaryActionSubmitTriggerButtonText}>Create User Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* View Details Modal */}
      <Modal visible={viewDetailsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setViewDetailsOpen(false)}>
        <SafeAreaView style={styles.fullScreenFormContainer}>
          <View style={styles.fullScreenFormHeader}>
            <Text style={styles.formPanelHeaderTitle}>User Profile Context</Text>
            <TouchableOpacity onPress={() => setViewDetailsOpen(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
          {selectedUser && (
            <View style={styles.profileInspectorFrameBlock}>
              <View style={styles.inspectorAvatarCluster}>
                <View style={[styles.inspectorAvatarFrameContainer, { backgroundColor: colors.primary }]}>
                  {selectedUser.avatarUrl ? (
                    <Image source={{ uri: toProxiedUrl(selectedUser.avatarUrl) }} style={styles.inspectorAvatarImageFrame} />
                  ) : (
                    <Text style={styles.inspectorAvatarFallbackText}>{selectedUser.initials}</Text>
                  )}
                </View>
              </View>
              <Text style={styles.inspectorProfileDisplayName}>{selectedUser.name}</Text>

              <View style={styles.inspectorDetailedFieldsBox}>
                <Text style={styles.inspectorFieldLabelHeading}>Email Address</Text>
                <Text style={styles.inspectorFieldValueText}>{selectedUser.email}</Text>

                <Text style={styles.inspectorFieldLabelHeading}>Assigned Structural Role</Text>
                <Text style={styles.inspectorFieldValueText}>{selectedUser.role.toUpperCase()}</Text>

                <Text style={styles.inspectorFieldLabelHeading}>System Status State</Text>
                <Text style={styles.inspectorFieldValueText}>{selectedUser.status.toUpperCase()}</Text>

                <Text style={styles.inspectorFieldLabelHeading}>Profile Timestamp Metadata</Text>
                <Text style={styles.inspectorFieldValueText}>{selectedUser.createdAt}</Text>

                <Text style={styles.inspectorFieldLabelHeading}>Network Session Activity</Text>
                <Text style={styles.inspectorFieldValueText}>{selectedUser.lastLogin}</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={editUserOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditUserOpen(false)}>
        <SafeAreaView style={styles.fullScreenFormContainer}>
          <View style={styles.fullScreenFormHeader}>
            <Text style={styles.formPanelHeaderTitle}>Modify Security Profile</Text>
            <TouchableOpacity onPress={() => setEditUserOpen(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.formScrollInnerLayout}>
            <Text style={styles.inputFieldDescriptionLabel}>Full Profile Name</Text>
            <TextInput
              style={styles.cleanFormTextInput}
              value={editFormData.name}
              onChangeText={(t) => setEditFormData({ ...editFormData, name: t })}
              placeholderTextColor={colors.placeholderText}
            />

            <Text style={styles.inputFieldDescriptionLabel}>Registered Email</Text>
            <TextInput
              style={styles.cleanFormTextInput}
              keyboardType="email-address"
              autoCapitalize="none"
              value={editFormData.email}
              onChangeText={(t) => setEditFormData({ ...editFormData, email: t })}
              placeholderTextColor={colors.placeholderText}
            />

            <Text style={styles.inputFieldDescriptionLabel}>Assigned Role</Text>
            <TouchableOpacity style={styles.formInlineDropdownSelect} onPress={() => setFormRolePickerOpen(true)}>
              <Text style={styles.dropdownSelectedStringStyle}>{editFormData.role.toUpperCase()}</Text>
              <ChevronDown color={colors.textMuted} size={16} />
            </TouchableOpacity>

            <Text style={styles.inputFieldDescriptionLabel}>Status Designation</Text>
            <TouchableOpacity style={styles.formInlineDropdownSelect} onPress={() => setFormStatusPickerOpen(true)}>
              <Text style={styles.dropdownSelectedStringStyle}>{editFormData.status.toUpperCase()}</Text>
              <ChevronDown color={colors.textMuted} size={16} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryActionSubmitTriggerButton} onPress={saveEditUser}>
              <Text style={styles.primaryActionSubmitTriggerButtonText}>Commit Target Settings</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Change Role Inline Dialog */}
      <Modal visible={changeRoleOpen} transparent animationType="fade" onRequestClose={() => setChangeRoleOpen(false)}>
        <View style={styles.alertOverlayCenterFrame}>
          <View style={styles.alertSurfaceBoxFrame}>
            <Text style={styles.alertBoxLayoutHeaderTitle}>Alter Dynamic Scope Assignment</Text>
            <Text style={styles.alertBoxDescriptionParaText}>Modify explicit organizational scope configuration settings.</Text>

            {["super-admin", "admin", "manager", "team-lead"].map((roleNode) => (
              <TouchableOpacity
                key={roleNode}
                style={[styles.pickerBoxRowItemLink, newRole === roleNode && styles.pickerBoxRowItemLinkActive]}
                onPress={() => setNewRole(roleNode as any)}
              >
                <Text style={[styles.pickerBoxRowItemLinkLabelText, newRole === roleNode && styles.pickerBoxRowItemLinkLabelTextActive]}>
                  {roleNode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalFooterActionsLayoutTwinRow}>
              <TouchableOpacity style={styles.formActionCancelControlBtn} onPress={() => setChangeRoleOpen(false)}>
                <Text style={styles.formActionCancelControlBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formActionConfirmControlBtn} onPress={confirmChangeRole}>
                <Text style={styles.formActionConfirmControlBtnLabelText}>Update Scope</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={resetPasswordOpen} transparent animationType="fade" onRequestClose={() => setResetPasswordOpen(false)}>
        <View style={styles.alertOverlayCenterFrame}>
          <View style={styles.alertSurfaceBoxFrame}>
            <Text style={styles.alertBoxLayoutHeaderTitle}>Overwrite Context Credentials</Text>

            <Text style={styles.inputFieldDescriptionLabel}>New System Password</Text>
            <TextInput
              secureTextEntry
              style={styles.cleanFormTextInput}
              placeholderTextColor={colors.placeholderText}
              value={resetPasswordData.newPassword}
              onChangeText={(t) => setResetPasswordData({ ...resetPasswordData, newPassword: t })}
            />

            <Text style={styles.inputFieldDescriptionLabel}>Verify System Password</Text>
            <TextInput
              secureTextEntry
              style={styles.cleanFormTextInput}
              placeholderTextColor={colors.placeholderText}
              value={resetPasswordData.confirmPassword}
              onChangeText={(t) => setResetPasswordData({ ...resetPasswordData, confirmPassword: t })}
            />

            <View style={styles.modalFooterActionsLayoutTwinRow}>
              <TouchableOpacity style={styles.formActionCancelControlBtn} onPress={() => setResetPasswordOpen(false)}>
                <Text style={styles.formActionCancelControlBtnLabelText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formActionConfirmControlBtn, { backgroundColor: colors.warning }]}
                disabled={resetPasswordLoading}
                onPress={confirmResetPassword}
              >
                {resetPasswordLoading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={styles.formActionConfirmControlBtnLabelText}>Overwrite</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Options Sheet */}
      <Modal visible={roleFilterPickerOpen} transparent animationType="fade" onRequestClose={() => setRoleFilterPickerOpen(false)}>
        <TouchableOpacity style={styles.overlayClickDismiss} activeOpacity={1} onPress={() => setRoleFilterPickerOpen(false)}>
          <View style={styles.pickerInlineDropdownFlyoutSurface}>
            {["all", "super-admin", "admin", "manager", "team-lead"].map((r) => (
              <TouchableOpacity
                key={r}
                style={styles.pickerInlineDropdownFlyoutItemRow}
                onPress={() => {
                  setRoleFilter(r);
                  setRoleFilterPickerOpen(false);
                }}
              >
                <Text style={styles.pickerInlineDropdownFlyoutItemRowLabelText}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Selector Options Sheets */}
      <Modal visible={formRolePickerOpen} transparent animationType="fade" onRequestClose={() => setFormRolePickerOpen(false)}>
        <TouchableOpacity style={styles.overlayClickDismiss} activeOpacity={1} onPress={() => setFormRolePickerOpen(false)}>
          <View style={styles.pickerInlineDropdownFlyoutSurface}>
            {["super-admin", "admin", "manager", "team-lead"].map((r) => (
              <TouchableOpacity
                key={r}
                style={styles.pickerInlineDropdownFlyoutItemRow}
                onPress={() => {
                  if (addUserOpen) setAddFormData({ ...addFormData, role: r as any });
                  if (editUserOpen) setEditFormData({ ...editFormData, role: r as any });
                  setFormRolePickerOpen(false);
                }}
              >
                <Text style={styles.pickerInlineDropdownFlyoutItemRowLabelText}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={formStatusPickerOpen} transparent animationType="fade" onRequestClose={() => setFormStatusPickerOpen(false)}>
        <TouchableOpacity style={styles.overlayClickDismiss} activeOpacity={1} onPress={() => setFormStatusPickerOpen(false)}>
          <View style={styles.pickerInlineDropdownFlyoutSurface}>
            {["active", "inactive", "pending"].map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.pickerInlineDropdownFlyoutItemRow}
                onPress={() => {
                  if (addUserOpen) setAddFormData({ ...addFormData, status: s as any });
                  if (editUserOpen) setEditFormData({ ...editFormData, status: s as any });
                  setFormStatusPickerOpen(false);
                }}
              >
                <Text style={styles.pickerInlineDropdownFlyoutItemRowLabelText}>{s.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}