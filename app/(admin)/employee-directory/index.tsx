import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  DollarSign,
  Users,
  AlertTriangle,
  Clock,
  Key,
  Archive,
  X,
  ChevronDown,
} from "lucide-react-native";
import { useForm, Controller } from "react-hook-form";
import { createResource, deleteResource, listResource, updateResource, apiFetch } from "@/lib/admin/apiClient";

import { Pagination } from "@/components/Pagination";
import { useSocket } from "@/contexts/SocketContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  category?: string;
  role: string;
  company?: string;
  status: "active" | "inactive" | "on-leave";
  payType: "hourly" | "monthly";
  payRate: string;
  hireDate: string;
  shift?: string;
  avatarUrl?: string;
  current_status?: "AVAILABLE" | "LUNCH" | "BREAK";
  lunch_start_time?: string | null;
  lunch_expected_end?: string | null;
  break_start_time?: string | null;
}

interface Company {
  id: string;
  name: string;
  code: string;
  status: "active" | "inactive" | "suspended";
}

type AddEmployeeValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  category: string;
  createUser: "no" | "yes";
  userRole: "super-admin" | "admin" | "manager" | "team-lead" | "employee";
  userStatus: "active" | "inactive" | "pending";
  role: string;
  company: string;
  status: Employee["status"];
  payType: "hourly" | "monthly";
  payRate: string;
  shift: string;
  hireDate: string;
  password: string;
  department: string;
};

const CATEGORY_OPTIONS = ["assistant", "coders", "mechanics", "carpenters", "accountant", "marketing"];
const PAGE_SIZE = 25;

function formatStatusTime(timeStr?: string | null) {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "";
  }
}

export default function Employees() {
  const { uiTheme } = useTheme();
  const auth = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const localParams = useLocalSearchParams();
  const viewParam = localParams.view;

 
   const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";

  const colors = useMemo(() => ({
    background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
    cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
    text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    mutedText: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#cbd5e1",
    inputBg: isDark ? "#1e293b" : "#ffffff",
    inputText: isDark ? "#f8fafc" : "#0f172a",
    primary: uiTheme.customColors?.primary || "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    destructive: "#ef4444",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [editEmployeeOpen, setEditEmployeeOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<{ title: string; options: { label: string; value: string }[]; onSelect: (val: string) => void } | null>(null);

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    role: "",
    company: "",
    department: "",
    shift: "",
    status: "active" as Employee["status"],
    payType: "hourly" as "hourly" | "monthly",
    payRate: "",
    hireDate: "",
    userRole: "employee" as AddEmployeeValues["userRole"],
    userStatus: "active" as AddEmployeeValues["userStatus"],
  });

  const [shiftFormData, setShiftFormData] = useState({ shift: "" });
  const [resetPasswordData, setResetPasswordData] = useState({ newPassword: "", confirmPassword: "" });
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  const addForm = useForm<AddEmployeeValues>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      category: "",
      createUser: "no",
      userRole: "manager",
      userStatus: "active",
      role: "",
      company: "",
      status: "active",
      payType: "hourly",
      payRate: "",
      shift: "",
      hireDate: "",
      password: "",
      department: "",
    },
  });

  const openCustomPicker = (title: string, options: { label: string; value: string }[], onSelect: (val: string) => void) => {
    setPickerConfig({ title, options, onSelect });
    setPickerModalOpen(true);
  };

  const fetchEmployeesList = useCallback(async () => {
    try {
      setLoading(true);
      setApiError(null);
      const params = {
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchQuery,
        status: statusFilter === "all" ? undefined : statusFilter,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        role: roleFilter === "all" ? undefined : roleFilter,
        company: companyFilter === "all" ? undefined : companyFilter,
      };

      const res = await listResource<Employee>("employees", params);
      if (res && typeof res === "object" && "items" in res) {
        setEmployeesList(res.items);
        setTotalPages(res.pagination?.totalPages || 1);
      } else {
        setEmployeesList(res || []);
        setTotalPages(1);
      }

      if (companies.length === 0) {
        const companyList = await listResource<Company>("companies");
        setCompanies(Array.isArray(companyList) ? companyList.filter(c => c.status === "active") : []);
      }
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to load directory data");
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, categoryFilter, roleFilter, companyFilter, companies.length]);

  useEffect(() => {
    
    setIsSuperAdmin(auth.role === "super-admin" || auth?.user?.role === "super-admin");
    fetchEmployeesList();
  }, [fetchEmployeesList, auth]);

  useEffect(() => {
    if (!socket) return;
    const handleStatusUpdate = (payload: any) => {
      setEmployeesList(prev => prev.map(emp => emp.id === payload.userId ? {
        ...emp,
        current_status: payload.current_status,
        lunch_start_time: payload.lunch_start_time,
        lunch_expected_end: payload.lunch_expected_end,
        break_start_time: payload.break_start_time,
      } : emp));
    };
    socket.on("status-update", handleStatusUpdate);
    return () => { socket.off("status-update", handleStatusUpdate); };
  }, [socket]);

  useEffect(() => {
    const viewId = typeof viewParam === "string" ? viewParam.trim() : "";
    if (!viewId || loading || employeesList.length === 0) return;

    const match = employeesList.find((e) => String(e.id) === viewId);
    if (match) {
      setSelectedEmployee(match);
      setViewProfileOpen(true);
      router.setParams({ view: undefined });
    }
  }, [employeesList, viewParam, loading, router]);

  const handleAddEmployee = async (values: AddEmployeeValues) => {
    try {
      setApiError(null);
      const fullName = `${values.firstName.trim()} ${values.lastName.trim()}`.trim();
      const payload = {
        id: `EMP-${Date.now().toString().slice(-6)}`,
        name: fullName,
        initials: fullName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase(),
        email: values.email.trim(),
        phone: values.phone,
        category: values.category,
        role: values.role,
        company: values.company || "",
        department: values.department,
        status: values.status,
        payType: values.payType,
        payRate: values.payRate,
        shift: values.shift,
        hireDate: values.hireDate,
        ...(values.createUser === "yes" && {
          password: values.password,
          userRole: values.userRole,
          userStatus: values.userStatus,
        }),
      };
      await createResource<Employee>("employees", payload);
      setAddEmployeeOpen(false);
      addForm.reset();
      fetchEmployeesList();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to create record");
    }
  };

  const saveEditEmployee = async () => {
    if (!selectedEmployee || !editFormData.name || !editFormData.email || !editFormData.role) return;
    try {
      setApiError(null);
      await updateResource<Employee>("employees", selectedEmployee.id, {
        ...selectedEmployee,
        name: editFormData.name,
        initials: editFormData.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase(),
        email: editFormData.email,
        phone: editFormData.phone,
        category: editFormData.category,
        role: editFormData.role,
        company: editFormData.company || "",
        department: editFormData.department,
        shift: editFormData.shift,
        status: editFormData.status,
        payType: editFormData.payType,
        payRate: editFormData.payRate,
        hireDate: editFormData.hireDate,
        userRole: editFormData.userRole,
        userStatus: editFormData.userStatus,
      } as any);

      setEditEmployeeOpen(false);
      setSelectedEmployee(null);
      fetchEmployeesList();

      listResource<any>("users", { limit: 1000 }).then((usersResult) => {
        const usersList: any[] = Array.isArray(usersResult) ? usersResult : (usersResult?.items ?? []);
        const linkedUser = usersList.find(
          (u: any) => String(u.email || "").toLowerCase() === String(editFormData.email || "").toLowerCase()
        );
        if (linkedUser) {
          updateResource("users", linkedUser.id || linkedUser._id, {
            ...linkedUser,
            name: editFormData.name,
            email: editFormData.email,
            role: editFormData.userRole,
            status: editFormData.userStatus,
          }).catch(() => {});
        }
      }).catch(() => {});
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to save metrics");
    }
  };

  const confirmToggleActive = async () => {
    if (!selectedEmployee) return;
    try {
      setApiError(null);
      await updateResource<Employee>("employees", selectedEmployee.id, {
        ...selectedEmployee,
        status: selectedEmployee.status === "inactive" ? "active" : "inactive",
      });
      setDeactivateConfirmOpen(false);
      setSelectedEmployee(null);
      fetchEmployeesList();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to toggle execution state");
    }
  };

  const confirmDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      setApiError(null);
      await deleteResource("employees", selectedEmployee.id);
      setDeleteConfirmOpen(false);
      setSelectedEmployee(null);
      fetchEmployeesList();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Deletion operation failed");
    }
  };

  const confirmResetPassword = async () => {
    if (!selectedEmployee || !isSuperAdmin) return;
    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setApiError("Passwords do not match");
      return;
    }
    if (resetPasswordData.newPassword.length < 6) {
      setApiError("Password must contain at least 6 characters");
      return;
    }
    try {
      setResetPasswordLoading(true);
      setApiError(null);
      await apiFetch(`/api/employees/${selectedEmployee.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({
          newPassword: resetPasswordData.newPassword,
          confirmPassword: resetPasswordData.confirmPassword,
        }),
      });
      setResetPasswordOpen(false);
      setSelectedEmployee(null);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Security configuration failure");
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const saveShift = async () => {
    if (!selectedEmployee) return;
    try {
      setApiError(null);
      await updateResource<Employee>("employees", selectedEmployee.id, {
        ...selectedEmployee,
        shift: shiftFormData.shift,
      });
      setShiftOpen(false);
      setSelectedEmployee(null);
      fetchEmployeesList();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "Failed to reassign shift");
    }
  };

  const roles = useMemo(() => [...new Set(employeesList.map(e => e.role).filter(Boolean))], [employeesList]);
  const categories = useMemo(() => [...new Set(employeesList.map(e => String(e.category || "")).filter(Boolean))], [employeesList]);
  const categoryOptions = useMemo(() => [...new Set([...CATEGORY_OPTIONS, ...categories])], [categories]);

  const filteredEmployees = useMemo(() => {
    return employeesList.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isArchived = employee.status === "inactive";
      const matchesTab = activeTab === "archived" ? isArchived : !isArchived;
      const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || String(employee.category || "") === categoryFilter;
      const matchesRole = roleFilter === "all" || employee.role === roleFilter;
      const matchesCompany = companyFilter === "all" || (employee.company || "") === companyFilter;
      
      return matchesSearch && matchesTab && matchesStatus && matchesCategory && matchesRole && matchesCompany;
    });
  }, [employeesList, searchQuery, activeTab, statusFilter, categoryFilter, roleFilter, companyFilter]);

  const stats = useMemo(() => ({
    active: employeesList.filter(e => e.status === "active").length,
    leave: employeesList.filter(e => e.status === "on-leave").length,
    total: employeesList.length,
    inactive: employeesList.filter(e => e.status === "inactive").length,
  }), [employeesList]);

  const handleRowAction = (action: string, employee: Employee) => {
    setSelectedEmployee(employee);
    setActionsMenuOpen(false);
    if (action === "view") setViewProfileOpen(true);
    if (action === "edit") {
      setEditFormData({
        name: employee.name,
        email: employee.email,
        phone: employee.phone,
        category: employee.category || "",
        role: employee.role,
        company: employee.company || "",
        department: (employee as any).department || "",
        shift: employee.shift || "",
        status: employee.status,
        payType: employee.payType || "hourly",
        payRate: employee.payRate,
        hireDate: employee.hireDate,
        userRole: (employee as any).userRole || "employee",
        userStatus: (employee as any).userStatus || "active",
      });
      setEditEmployeeOpen(true);
    }
    if (action === "password") setResetPasswordOpen(true);
    if (action === "shift") {
      setShiftFormData({ shift: employee.shift || "" });
      setShiftOpen(true);
    }
    if (action === "toggle") setDeactivateConfirmOpen(true);
    if (action === "delete") setDeleteConfirmOpen(true);
  };

  const renderEmployeeCard = ({ item }: { item: Employee }) => {
    const isMutedLayout = item.current_status === "LUNCH" || item.current_status === "BREAK";
    return (
      <View style={[styles.employeeCard, isMutedLayout && { opacity: 0.65 }]}>
        <View style={styles.cardMainHeader}>
          <TouchableOpacity style={styles.avatarCluster} onPress={() => handleRowAction("view", item)}>
            <View style={styles.avatarWrapper}>
              <Text style={styles.avatarText}>{item.initials}</Text>
              {item.current_status && item.current_status !== "AVAILABLE" && (
                <View style={[styles.statusDotIndicator, { backgroundColor: item.current_status === "LUNCH" ? colors.warning : "#8b5cf6" }]} />
              )}
            </View>
            <View style={styles.headerInfoBlock}>
              <Text style={styles.employeeNameText} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.employeeRoleLabel} numberOfLines={1}>{item.role}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.actionItemsHeaderGroup}>
            <TouchableOpacity 
              style={styles.cardMenuTrigger} 
              onPress={() => {
                setSelectedEmployee(item);
                setActionsMenuOpen(true);
              }}
            >
              <MoreHorizontal size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tagWrapperContainer}>
          <View style={[styles.statusTagBlock, { backgroundColor: item.status === "active" ? `${colors.success}20` : item.status === "on-leave" ? `${colors.warning}20` : `${colors.mutedText}20` }]}>
            <Text style={[styles.statusTagText, { color: item.status === "active" ? colors.success : item.status === "on-leave" ? colors.warning : colors.mutedText }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          {item.current_status && item.current_status !== "AVAILABLE" && (
            <View style={[styles.statusTagBlock, { backgroundColor: item.current_status === "LUNCH" ? `${colors.warning}20` : "#8b5cf620", marginLeft: 6 }]}>
              <Text style={[styles.statusTagText, { color: item.current_status === "LUNCH" ? colors.warning : "#8b5cf6" }]}>
                {item.current_status === "LUNCH" ? "ON LUNCH" : "ON BREAK"} ({formatStatusTime(item.current_status === "LUNCH" ? item.lunch_start_time : item.break_start_time)})
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardDetailsSection}>
          <View style={styles.detailGridRow}>
            <Building2 size={13} color={colors.mutedText} />
            <Text style={styles.detailGridText} numberOfLines={1}>{item.company || "No Company Data Setup"}</Text>
          </View>
          <View style={styles.detailGridRow}>
            <Mail size={13} color={colors.mutedText} />
            <Text style={styles.detailGridText} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={styles.detailGridRow}>
            <Phone size={13} color={colors.mutedText} />
            <Text style={styles.detailGridText} numberOfLines={1}>{item.phone || "—"}</Text>
          </View>
          <View style={styles.detailGridRow}>
            <DollarSign size={13} color={colors.mutedText} />
            <Text style={styles.detailGridText}>{item.payRate || "Not specified"}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.rootViewport}>
      <View style={styles.structuralHeader}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.viewportHeading}>Employee Directory</Text>
          <Text style={styles.viewportSubheading}>Manage profiles, credentials, and access groups</Text>
        </View>
        <TouchableOpacity style={styles.globalActionTrigger} onPress={() => setAddEmployeeOpen(true)}>
          <Plus size={16} color="#fff" style={{ marginRight: 4 }} />
          <Text style={styles.globalActionTriggerText}>Add Employee</Text>
        </TouchableOpacity>
      </View>

      {apiError && (
        <View style={styles.runtimeErrorCard}>
          <AlertTriangle size={15} color={colors.destructive} style={{ marginRight: 8 }} />
          <Text style={styles.runtimeErrorText}>{apiError}</Text>
        </View>
      )}

      <View style={{ height: 68, marginVertical: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.summaryScrollContext}>
          <View style={[styles.metricSummaryBox, { borderLeftColor: colors.primary }]}><Text style={styles.metricCount}>{stats.total}</Text><Text style={styles.metricLabel}>Total Employees</Text></View>
          <View style={[styles.metricSummaryBox, { borderLeftColor: colors.success }]}><Text style={styles.metricCount}>{stats.active}</Text><Text style={styles.metricLabel}>Active</Text></View>
          <View style={[styles.metricSummaryBox, { borderLeftColor: colors.warning }]}><Text style={styles.metricCount}>{stats.leave}</Text><Text style={styles.metricLabel}>On Leave</Text></View>
          <View style={[styles.metricSummaryBox, { borderLeftColor: colors.mutedText }]}><Text style={styles.metricCount}>{stats.inactive}</Text><Text style={styles.metricLabel}>Inactive</Text></View>
        </ScrollView>
      </View>

      <View style={styles.directoryFilterPanel}>
        <ButtonTabSwitcher activeTab={activeTab} onChange={setActiveTab} colors={colors} />
        
        <View style={styles.searchBarFormItem}>
          <Search size={16} color={colors.mutedText} style={{ marginLeft: 10, marginRight: 6 }} />
          <TextInput
            placeholder="Search by name, email, or role..."
            placeholderTextColor={colors.mutedText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchBarInputElement}
            underlineColorAndroid="transparent"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dropdownFiltersRowContext}>
          <TouchableOpacity style={styles.inlineFilterDropdownButton} onPress={() => openCustomPicker("All Status", [{ label: "All Status", value: "all" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "On Leave", value: "on-leave" }], setStatusFilter)}>
            <Text style={styles.inlineFilterDropdownText}>{statusFilter === "all" ? "Status" : statusFilter.toUpperCase()}</Text>
            <ChevronDown size={12} color={colors.text} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.inlineFilterDropdownButton} onPress={() => openCustomPicker("All Categories", [{ label: "All Categories", value: "all" }, ...categoryOptions.map(c => ({ label: c, value: c }))], setCategoryFilter)}>
            <Text style={styles.inlineFilterDropdownText}>{categoryFilter === "all" ? "Category" : categoryFilter}</Text>
            <ChevronDown size={12} color={colors.text} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.inlineFilterDropdownButton} onPress={() => openCustomPicker("All Roles", [{ label: "All Roles", value: "all" }, ...roles.map(r => ({ label: r, value: r }))], setRoleFilter)}>
            <Text style={styles.inlineFilterDropdownText}>{roleFilter === "all" ? "Role" : roleFilter}</Text>
            <ChevronDown size={12} color={colors.text} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.inlineFilterDropdownButton} onPress={() => openCustomPicker("All Companies", [{ label: "All Companies", value: "all" }, ...companies.map(c => ({ label: c.name, value: c.name }))], setCompanyFilter)}>
            <Text style={styles.inlineFilterDropdownText}>{companyFilter === "all" ? "Company" : companyFilter}</Text>
            <ChevronDown size={12} color={colors.text} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingPlaceholderLayout}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredEmployees.length === 0 ? (
        <View style={styles.loadingPlaceholderLayout}>
          <Users size={40} color={colors.mutedText} style={{ marginBottom: 8 }} />
          <Text style={styles.fallbackTitleText}>No employees found</Text>
          <Text style={styles.fallbackSubtitleText}>Try adjusting your keywords or active state filter</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredEmployees}
            keyExtractor={item => item.id}
            renderItem={renderEmployeeCard}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          />
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} style={{ marginHorizontal: 16, borderTopWidth: 1, borderColor: colors.border }} />
        </View>
      )}

      {/* THREE DOTS ACTION SHEET MENU */}
      <Modal visible={actionsMenuOpen} transparent animationType="slide">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.actionSheetContainer}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>{selectedEmployee?.name || "Options"}</Text>
              <TouchableOpacity onPress={() => setActionsMenuOpen(false)} style={styles.sheetCloseTrigger}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.actionSheetContentGrid}>
              <TouchableOpacity style={styles.actionSheetRowUnit} onPress={() => selectedEmployee && handleRowAction("view", selectedEmployee)}>
                <Eye size={16} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.actionSheetItemText, { color: colors.text }]}>View Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionSheetRowUnit} onPress={() => selectedEmployee && handleRowAction("edit", selectedEmployee)}>
                <Edit size={16} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.actionSheetItemText, { color: colors.text }]}>Edit Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionSheetRowUnit} onPress={() => selectedEmployee && handleRowAction("shift", selectedEmployee)}>
                <Clock size={16} color={colors.text} style={{ marginRight: 12 }} />
                <Text style={[styles.actionSheetItemText, { color: colors.text }]}>Assign Shift</Text>
              </TouchableOpacity>

              {isSuperAdmin && (
                <TouchableOpacity style={styles.actionSheetRowUnit} onPress={() => selectedEmployee && handleRowAction("password", selectedEmployee)}>
                  <Key size={16} color={colors.text} style={{ marginRight: 12 }} />
                  <Text style={[styles.actionSheetItemText, { color: colors.text }]}>Reset Password</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.actionSheetRowUnit} onPress={() => selectedEmployee && handleRowAction("toggle", selectedEmployee)}>
                <Archive size={16} color={colors.destructive} style={{ marginRight: 12 }} />
                <Text style={[styles.actionSheetItemText, { color: colors.destructive }]}>
                  {selectedEmployee?.status === "inactive" ? "Restore Employee" : "Archive Employee"}
                </Text>
              </TouchableOpacity>

              {/*<TouchableOpacity style={[styles.actionSheetRowUnit, { borderBottomWidth: 0 }]} onPress={() => selectedEmployee && handleRowAction("delete", selectedEmployee)}>
                <Trash2 size={16} color={colors.destructive} style={{ marginRight: 12 }} />
                <Text style={[styles.actionSheetItemText, { color: colors.destructive, fontWeight: "600" }]}>Delete Permanently</Text>
              </TouchableOpacity>*/}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={addEmployeeOpen} transparent animationType="slide">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.formSheetContainer}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>Add New Employee</Text>
              <TouchableOpacity onPress={() => setAddEmployeeOpen(false)} style={styles.sheetCloseTrigger}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formRowFieldsGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldTitleLabel}>First Name *</Text>
                  <Controller
                    control={addForm.control}
                    name="firstName"
                    rules={{ required: true }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={styles.baseTextInputField} value={value} onChangeText={onChange} placeholder="John" placeholderTextColor={colors.mutedText} />
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldTitleLabel}>Last Name *</Text>
                  <Controller
                    control={addForm.control}
                    name="lastName"
                    rules={{ required: true }}
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={styles.baseTextInputField} value={value} onChangeText={onChange} placeholder="Doe" placeholderTextColor={colors.mutedText} />
                    )}
                  />
                </View>
              </View>

              <Text style={styles.formFieldTitleLabel}>Email *</Text>
              <Controller
                control={addForm.control}
                name="email"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.baseTextInputField} keyboardType="email-address" autoCapitalize="none" value={value} onChangeText={onChange} placeholder="john@company.com" placeholderTextColor={colors.mutedText} />
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Phone</Text>
              <Controller
                control={addForm.control}
                name="phone"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.baseTextInputField} keyboardType="phone-pad" value={value} onChangeText={onChange} placeholder="+1 (555) 123-4567" placeholderTextColor={colors.mutedText} />
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Category</Text>
              <Controller
                control={addForm.control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity 
                    style={styles.customSelectorBoxButton}
                    onPress={() => openCustomPicker("Select Category", categoryOptions.map(c => ({ label: c, value: c })), onChange)}
                  >
                    <Text style={{ color: value ? colors.inputText : colors.mutedText, fontSize: 14 }}>{value || "Select category"}</Text>
                    <ChevronDown size={16} color={colors.text} />
                  </TouchableOpacity>
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Role *</Text>
              <Controller
                control={addForm.control}
                name="role"
                rules={{ required: true }}
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.baseTextInputField} value={value} onChangeText={onChange} placeholder="e.g., Technician" placeholderTextColor={colors.mutedText} />
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Company</Text>
              <Controller
                control={addForm.control}
                name="company"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity 
                    style={styles.customSelectorBoxButton}
                    onPress={() => openCustomPicker("Select Company", companies.map(c => ({ label: c.name, value: c.name })), onChange)}
                  >
                    <Text style={{ color: value ? colors.inputText : colors.mutedText, fontSize: 14 }}>{value || "Select company"}</Text>
                    <ChevronDown size={16} color={colors.text} />
                  </TouchableOpacity>
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Department</Text>
              <Controller
                control={addForm.control}
                name="department"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity 
                    style={styles.customSelectorBoxButton}
                    onPress={() => openCustomPicker("Select Department", [{ label: "Coding", value: "Coding" }, { label: "Electrician", value: "Electrician" }, { label: "Mechanic", value: "Mechanic" }], onChange)}
                  >
                    <Text style={{ color: value ? colors.inputText : colors.mutedText, fontSize: 14 }}>{value || "Select department"}</Text>
                    <ChevronDown size={16} color={colors.text} />
                  </TouchableOpacity>
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Password *</Text>
              <Controller
                control={addForm.control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.baseTextInputField} secureTextEntry value={value} onChangeText={onChange} placeholder="Enter password" placeholderTextColor={colors.mutedText} />
                )}
              />

              <View style={styles.formRowFieldsGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldTitleLabel}>Pay Type</Text>
                  <Controller
                    control={addForm.control}
                    name="payType"
                    render={({ field: { onChange, value } }) => (
                      <TouchableOpacity 
                        style={styles.customSelectorBoxButton}
                        onPress={() => openCustomPicker("Select Pay Type", [{ label: "Per Hour", value: "hourly" }, { label: "Per Month", value: "monthly" }], onChange)}
                      >
                        <Text style={{ color: colors.inputText, fontSize: 14 }}>{value === "monthly" ? "Per Month" : "Per Hour"}</Text>
                        <ChevronDown size={16} color={colors.text} />
                      </TouchableOpacity>
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldTitleLabel}>Pay Rate</Text>
                  <Controller
                    control={addForm.control}
                    name="payRate"
                    render={({ field: { onChange, value } }) => (
                      <TextInput style={styles.baseTextInputField} value={value} onChangeText={onChange} placeholder="$25/hr" placeholderTextColor={colors.mutedText} />
                    )}
                  />
                </View>
              </View>

              <Text style={styles.formFieldTitleLabel}>Hire Date</Text>
              <Controller
                control={addForm.control}
                name="hireDate"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.baseTextInputField} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedText} />
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Shift</Text>
              <Controller
                control={addForm.control}
                name="shift"
                render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.baseTextInputField} value={value} onChangeText={onChange} placeholder="e.g., 09:00 - 17:00" placeholderTextColor={colors.mutedText} />
                )}
              />

              <Text style={styles.formFieldTitleLabel}>Status</Text>
              <Controller
                control={addForm.control}
                name="status"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity 
                    style={styles.customSelectorBoxButton}
                    onPress={() => openCustomPicker("Select Status", [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "On Leave", value: "on-leave" }], onChange)}
                  >
                    <Text style={{ color: colors.inputText, fontSize: 14 }}>{value ? value.toUpperCase() : "ACTIVE"}</Text>
                    <ChevronDown size={16} color={colors.text} />
                  </TouchableOpacity>
                )}
              />

              <View style={styles.formRowFieldsGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldTitleLabel}>User Role</Text>
                  <Controller
                    control={addForm.control}
                    name="userRole"
                    render={({ field: { onChange, value } }) => (
                      <TouchableOpacity 
                        style={styles.customSelectorBoxButton}
                        onPress={() => openCustomPicker("Select User Role", [{ label: "Employee", value: "employee" }, { label: "Super Admin", value: "super-admin" }, { label: "Admin", value: "admin" }, { label: "Manager", value: "manager" }], onChange)}
                      >
                        <Text style={{ color: colors.inputText, fontSize: 14 }}>{value || "employee"}</Text>
                        <ChevronDown size={16} color={colors.text} />
                      </TouchableOpacity>
                    )}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldTitleLabel}>User Status</Text>
                  <Controller
                    control={addForm.control}
                    name="userStatus"
                    render={({ field: { onChange, value } }) => (
                      <TouchableOpacity 
                        style={styles.customSelectorBoxButton}
                        onPress={() => openCustomPicker("Select User Status", [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Pending", value: "pending" }], onChange)}
                      >
                        <Text style={{ color: colors.inputText, fontSize: 14 }}>{value || "active"}</Text>
                        <ChevronDown size={16} color={colors.text} />
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>

              <Text style={styles.formFieldTitleLabel}>Task Manager Access?</Text>
              <Controller
                control={addForm.control}
                name="createUser"
                render={({ field: { onChange, value } }) => (
                  <TouchableOpacity 
                    style={styles.customSelectorBoxButton}
                    onPress={() => openCustomPicker("System Access", [{ label: "Record only (no login)", value: "no" }, { label: "Yes — can log in", value: "yes" }], onChange)}
                  >
                    <Text style={{ color: colors.inputText, fontSize: 14 }}>{value === "yes" ? "Yes — can log in" : "Record only (no login)"}</Text>
                    <ChevronDown size={16} color={colors.text} />
                  </TouchableOpacity>
                )}
              />

              <View style={{ height: 60 }} />
            </ScrollView>

            <View style={styles.sheetFooterActionLayout}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setAddEmployeeOpen(false)}>
                <Text style={[styles.sheetActionBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.primary }]} onPress={addForm.handleSubmit(handleAddEmployee)}>
                <Text style={[styles.sheetActionBtnText, { color: "#fff" }]}>Add Employee</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={viewProfileOpen} transparent animationType="fade">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.dialogCardWrapper}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>Employee Profile</Text>
              <TouchableOpacity onPress={() => setViewProfileOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {selectedEmployee && (
              <ScrollView style={{ padding: 20 }}>
                <View style={styles.profileMetaHeaderRow}>
                  <View style={[styles.avatarWrapper, { width: 46, height: 46, borderRadius: 23 }]}>
                    <Text style={[styles.avatarText, { fontSize: 16 }]}>{selectedEmployee.initials}</Text>
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>{selectedEmployee.name}</Text>
                    <Text style={{ color: colors.mutedText, fontSize: 13, marginTop: 2 }}>{selectedEmployee.role}</Text>
                  </View>
                </View>

                <View style={styles.profileStructureGrid}>
                  <Text style={styles.profileSectionTitleLabel}>Email</Text>
                  <Text style={styles.profileValueString}>{selectedEmployee.email}</Text>

                  <Text style={styles.profileSectionTitleLabel}>Phone</Text>
                  <Text style={styles.profileValueString}>{selectedEmployee.phone || "—"}</Text>

                  <Text style={styles.profileSectionTitleLabel}>Role</Text>
                  <Text style={styles.profileValueString}>{selectedEmployee.role}</Text>

                  <Text style={styles.profileSectionTitleLabel}>Company</Text>
                  <Text style={styles.profileValueString}>{selectedEmployee.company || "—"}</Text>

                  <Text style={styles.profileSectionTitleLabel}>Pay Rate</Text>
                  <Text style={styles.profileValueString}>{selectedEmployee.payRate || "—"}</Text>

                  <Text style={styles.profileSectionTitleLabel}>Hire Date</Text>
                  <Text style={styles.profileValueString}>{selectedEmployee.hireDate || "—"}</Text>

                  <Text style={styles.profileSectionTitleLabel}>Shift Details</Text>
                  <Text style={styles.profileValueString}>{selectedEmployee.shift || "—"}</Text>
                </View>
              </ScrollView>
            )}
            <View style={{ padding: 16, borderTopWidth: 1, borderColor: colors.border }}>
              <TouchableOpacity style={[styles.sheetSecondaryActionBtn, { width: "100%" }]} onPress={() => setViewProfileOpen(false)}>
                <Text style={{ color: colors.text, fontWeight: "600", textAlign: "center" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editEmployeeOpen} transparent animationType="slide">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.formSheetContainer}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>Edit Employee</Text>
              <TouchableOpacity onPress={() => setEditEmployeeOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.formFieldTitleLabel}>Full Name *</Text>
              <TextInput style={styles.baseTextInputField} value={editFormData.name} onChangeText={(t) => setEditFormData({ ...editFormData, name: t })} placeholder="Full Name" placeholderTextColor={colors.mutedText} />

              <Text style={styles.formFieldTitleLabel}>Email *</Text>
              <TextInput style={styles.baseTextInputField} keyboardType="email-address" value={editFormData.email} onChangeText={(t) => setEditFormData({ ...editFormData, email: t })} placeholder="Email" placeholderTextColor={colors.mutedText} />

              <Text style={styles.formFieldTitleLabel}>Phone</Text>
              <TextInput style={styles.baseTextInputField} keyboardType="phone-pad" value={editFormData.phone} onChangeText={(t) => setEditFormData({ ...editFormData, phone: t })} placeholder="Phone" placeholderTextColor={colors.mutedText} />

              <Text style={styles.formFieldTitleLabel}>Role *</Text>
              <TextInput style={styles.baseTextInputField} value={editFormData.role} onChangeText={(t) => setEditFormData({ ...editFormData, role: t })} placeholder="Role" placeholderTextColor={colors.mutedText} />

              <Text style={styles.formFieldTitleLabel}>Company</Text>
              <TouchableOpacity 
                style={styles.customSelectorBoxButton}
                onPress={() => openCustomPicker("Select Company", companies.map(c => ({ label: c.name, value: c.name })), (val) => setEditFormData({ ...editFormData, company: val }))}
              >
                <Text style={{ color: editFormData.company ? colors.inputText : colors.mutedText, fontSize: 14 }}>{editFormData.company || "Select company"}</Text>
                <ChevronDown size={16} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.formFieldTitleLabel}>Department</Text>
              <TouchableOpacity 
                style={styles.customSelectorBoxButton}
                onPress={() => openCustomPicker("Select Department", [{ label: "Coding", value: "Coding" }, { label: "Electrician", value: "Electrician" }, { label: "Mechanic", value: "Mechanic" }], (val) => setEditFormData({ ...editFormData, department: val }))}
              >
                <Text style={{ color: editFormData.department ? colors.inputText : colors.mutedText, fontSize: 14 }}>{editFormData.department || "Select department"}</Text>
                <ChevronDown size={16} color={colors.text} />
              </TouchableOpacity>

              <Text style={styles.formFieldTitleLabel}>Pay Rate</Text>
              <TextInput style={styles.baseTextInputField} value={editFormData.payRate} onChangeText={(t) => setEditFormData({ ...editFormData, payRate: t })} placeholder="Pay Rate" placeholderTextColor={colors.mutedText} />

              <Text style={styles.formFieldTitleLabel}>Shift</Text>
              <TextInput style={styles.baseTextInputField} value={editFormData.shift} onChangeText={(t) => setEditFormData({ ...editFormData, shift: t })} placeholder="Shift details" placeholderTextColor={colors.mutedText} />
              
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.sheetFooterActionLayout}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setEditEmployeeOpen(false)}>
                <Text style={[styles.sheetActionBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.primary }]} onPress={saveEditEmployee}>
                <Text style={[styles.sheetActionBtnText, { color: "#fff" }]}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deactivateConfirmOpen} transparent animationType="fade">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.dialogCardWrapper}>
            <Text style={[styles.alertTitleHeader, { color: colors.text }]}>
              {selectedEmployee?.status === "inactive" ? "Restore Employee" : "Archive Employee"}
            </Text>
            <Text style={[styles.alertBodyDescription, { color: colors.mutedText }]}>
              {selectedEmployee?.status === "inactive"
                ? `Move back to directory.`
                : `This will send the profile to the architecture layout.`}
            </Text>
            <View style={styles.alertActionButtonsGrid}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setDeactivateConfirmOpen(false)}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.primary }]} onPress={confirmToggleActive}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>{selectedEmployee?.status === "inactive" ? "Restore" : "Archive"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteConfirmOpen} transparent animationType="fade">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.dialogCardWrapper}>
            <Text style={[styles.alertTitleHeader, { color: colors.destructive }]}>Delete Employee</Text>
            <Text style={[styles.alertBodyDescription, { color: colors.mutedText }]}>
              Are you sure you want to permanently delete <Text style={{ color: colors.text, fontWeight: '700' }}>{selectedEmployee?.name}</Text>? This action is irreversible and deletes all associated directory history.
            </Text>
            <View style={styles.alertActionButtonsGrid}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setDeleteConfirmOpen(false)}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.destructive }]} onPress={confirmDeleteEmployee}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Delete Permanently</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={shiftOpen} transparent animationType="fade">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.dialogCardWrapper}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>Assign Shift</Text>
              <TouchableOpacity onPress={() => setShiftOpen(false)}><X size={18} color={colors.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={styles.formFieldTitleLabel}>Shift Details</Text>
              <TextInput style={styles.baseTextInputField} value={shiftFormData.shift} onChangeText={(t) => setShiftFormData({ shift: t })} placeholder="e.g., Morning (9am - 5pm)" placeholderTextColor={colors.mutedText} />
            </View>
            <View style={[styles.alertActionButtonsGrid, { padding: 16, borderTopWidth: 1, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setShiftOpen(false)}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.primary }]} onPress={saveShift}><Text style={{ color: "#fff" }}>Save Shift</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={resetPasswordOpen} transparent animationType="fade">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.dialogCardWrapper}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>Reset Password</Text>
              <TouchableOpacity onPress={() => setResetPasswordOpen(false)}><X size={18} color={colors.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <Text style={styles.formFieldTitleLabel}>New Password</Text>
              <TextInput style={styles.baseTextInputField} secureTextEntry value={resetPasswordData.newPassword} onChangeText={(t) => setResetPasswordData({ ...resetPasswordData, newPassword: t })} placeholder="Minimum 6 characters" placeholderTextColor={colors.mutedText} />
              
              <Text style={styles.formFieldTitleLabel}>Confirm Password</Text>
              <TextInput style={styles.baseTextInputField} secureTextEntry value={resetPasswordData.confirmPassword} onChangeText={(t) => setResetPasswordData({ ...resetPasswordData, confirmPassword: t })} placeholder="Re-enter password" placeholderTextColor={colors.mutedText} />
            </View>
            <View style={[styles.alertActionButtonsGrid, { padding: 16, borderTopWidth: 1, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.sheetSecondaryActionBtn} onPress={() => setResetPasswordOpen(false)}><Text style={{ color: colors.text }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.sheetPrimaryActionBtn, { backgroundColor: colors.primary }]} onPress={confirmResetPassword} disabled={resetPasswordLoading}>
                <Text style={{ color: "#fff" }}>{resetPasswordLoading ? "Processing..." : "Reset Password"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={pickerModalOpen} transparent animationType="fade">
        <View style={styles.modalViewportBackdrop}>
          <View style={styles.dialogCardWrapper}>
            <View style={styles.sheetTopBarHeader}>
              <Text style={styles.sheetHeaderHeading}>{pickerConfig?.title || "Choose Option"}</Text>
              <TouchableOpacity onPress={() => setPickerModalOpen(false)}><X size={18} color={colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 280, padding: 10 }}>
              {pickerConfig?.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.pickerItemRowUnit}
                  onPress={() => {
                    pickerConfig.onSelect(opt.value);
                    setPickerModalOpen(false);
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ButtonTabSwitcher({ activeTab, onChange, colors }: { activeTab: string; onChange: (tab: "active" | "archived") => void; colors: any }) {
  return (
    <View style={tabsStyles.tabTrack}>
      <TouchableOpacity style={[tabsStyles.tabUnit, activeTab === "active" && { backgroundColor: colors.primary }]} onPress={() => onChange("active")}>
        <Text style={[tabsStyles.tabLabel, { color: activeTab === "active" ? "#fff" : colors.mutedText }]}>Active Directory</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[tabsStyles.tabUnit, activeTab === "archived" && { backgroundColor: colors.mutedText }]} onPress={() => onChange("archived")}>
        <Text style={[tabsStyles.tabLabel, { color: activeTab === "archived" ? "#fff" : colors.mutedText }]}>Archive</Text>
      </TouchableOpacity>
    </View>
  );
}

const tabsStyles = StyleSheet.create({
  tabTrack: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 24,
    padding: 3,
    marginBottom: 8,
  },
  tabUnit: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});

function createStyles(colors: any) {
  return StyleSheet.create({
    rootViewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    structuralHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    viewportHeading: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.5,
    },
    viewportSubheading: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 2,
    },
    globalActionTrigger: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
    },
    globalActionTriggerText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    summaryScrollContext: {
      paddingHorizontal: 16,
      alignItems: "center",
      gap: 10,
    },
    metricSummaryBox: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      minWidth: 120,
    },
    metricCount: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    metricLabel: {
      fontSize: 11,
      color: colors.mutedText,
      marginTop: 1,
    },
    directoryFilterPanel: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    searchBarFormItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      height: 42,
      marginTop: 4,
    },
    searchBarInputElement: {
      flex: 1,
      fontSize: 14,
      color: colors.inputText,
      paddingVertical: 4,
    },
    dropdownFiltersRowContext: {
      marginTop: 8,
      gap: 8,
      paddingBottom: 4,
    },
    inlineFilterDropdownButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inlineFilterDropdownText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.inputText,
    },
    loadingPlaceholderLayout: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 32,
      paddingBottom: 64,
    },
    fallbackTitleText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginTop: 4,
    },
    fallbackSubtitleText: {
      fontSize: 12,
      color: colors.mutedText,
      textAlign: "center",
      marginTop: 2,
    },
    employeeCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    cardMainHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    avatarCluster: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    avatarWrapper: {
      width: 36,
      height: 36,
      borderRadius: 18,
     // backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    avatarText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    statusDotIndicator: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 9,
      height: 9,
      borderRadius: 4.5,
      borderWidth: 1.5,
      borderColor: colors.cardBg,
    },
    headerInfoBlock: {
      flex: 1,
      marginLeft: 10,
    },
    employeeNameText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    employeeRoleLabel: {
      fontSize: 12,
      color: colors.mutedText,
      marginTop: 1,
    },
    actionItemsHeaderGroup: {
      flexDirection: "row",
      alignItems: "center",
    },
    cardMenuTrigger: {
      padding: 6,
      marginLeft: 4,
    },
    tagWrapperContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 10,
    },
    statusTagBlock: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      justifyContent: "center",
    },
    statusTagText: {
      fontSize: 10,
      fontWeight: "700",
    },
    cardDetailsSection: {
      marginTop: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 6,
    },
    detailGridRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    detailGridText: {
      fontSize: 12,
      color: colors.text,
      marginLeft: 8,
      flex: 1,
    },
    modalViewportBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    formSheetContainer: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: "88%",
    },
    actionSheetContainer: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: Platform.OS === "ios" ? 32 : 16,
    },
    actionSheetContentGrid: {
      paddingHorizontal: 16,
    },
    actionSheetRowUnit: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    actionSheetItemText: {
      fontSize: 15,
      fontWeight: "500",
    },
    dialogCardWrapper: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: Platform.OS === "ios" ? 24 : 12,
    },
    sheetTopBarHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    sheetHeaderHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    sheetCloseTrigger: {
      padding: 4,
    },
    formFieldTitleLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      marginTop: 14,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.3,
    },
    baseTextInputField: {
      height: 42,
      backgroundColor: colors.inputBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.inputText,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formRowFieldsGrid: {
      flexDirection: "row",
      gap: 12,
    },
    customSelectorBoxButton: {
      height: 42,
      backgroundColor: colors.inputBg,
      borderRadius: 8,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
    },
    sheetFooterActionLayout: {
      flexDirection: "row",
      padding: 16,
      borderTopWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    sheetSecondaryActionBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetPrimaryActionBtn: {
      flex: 1,
      height: 40,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetActionBtnText: {
      fontSize: 14,
      fontWeight: "600",
    },
    profileMetaHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    profileStructureGrid: {
      gap: 4,
    },
    profileSectionTitleLabel: {
      fontSize: 11,
      color: colors.mutedText,
      fontWeight: "600",
      textTransform: "uppercase",
      marginTop: 10,
    },
    profileValueString: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
    alertTitleHeader: {
      fontSize: 16,
      fontWeight: "700",
      paddingHorizontal: 20,
      paddingTop: 20,
      textAlign: "center",
    },
    alertBodyDescription: {
      fontSize: 13,
      textAlign: "center",
      paddingHorizontal: 20,
      marginTop: 8,
      marginBottom: 20,
      lineHeight: 18,
    },
    alertActionButtonsGrid: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 12,
    },
    pickerItemRowUnit: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    runtimeErrorCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(239, 68, 68, 0.08)",
      marginHorizontal: 16,
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.2)",
    },
    runtimeErrorText: {
      color: colors.destructive,
      fontSize: 12,
      flex: 1,
    },
  });
}