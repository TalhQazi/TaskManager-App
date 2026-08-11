import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  Alert,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  KeyboardTypeOptions,
  Image,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Search,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Users,
  X,
  ChevronDown,
  Eye,
  Edit2,
  Trash2,
} from "lucide-react-native";

import { apiFetch, listResource } from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { s } from "@/util/styles";
import { toProxiedUrl, initToken } from "@/util/toProxiedUrl";
import MilestoneBadge from "./MilestoneBadge";

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
  imageUrl?: string;
  milestoneLevel?: string;
  milestoneLabel?: string;
  current_status?: "AVAILABLE" | "LUNCH" | "BREAK";
  lunch_start_time?: string | null;
  lunch_expected_end?: string | null;
  break_start_time?: string | null;
}

interface Company {
  id: string;
  name: string;
  code?: string;
  status: "active" | "inactive" | "suspended";
}

interface EmployeeApi {
  _id: string;
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
  avatar?: string;
  avatarUrl?: string;
  avatarDataUrl?: string;
  imageUrl?: string;
  milestoneLevel?: string;
  milestoneLabel?: string;
  current_status?: "AVAILABLE" | "LUNCH" | "BREAK";
  lunch_start_time?: string | null;
  lunch_expected_end?: string | null;
  break_start_time?: string | null;
}

/**
 * Normalizes image paths and appends authenticated S3 proxy token
 */
const getDisplayImageUrl = (rawPath?: string | null, activeToken?: string | null) => {
  if (!rawPath || typeof rawPath !== "string" || !rawPath.trim()) return null;

  if (rawPath.startsWith("data:") || rawPath.startsWith("file://") || rawPath.startsWith("content://")) {
    return rawPath;
  }

  let path = rawPath.trim();

  if (path.includes("token=")) return path;

  if (path.startsWith("/uploads/")) {
    path = path.replace("/uploads/", "/api/s3-proxy/");
  } else if (path.startsWith("uploads/")) {
    path = path.replace("uploads/", "/api/s3-proxy/");
  } else if (!path.startsWith("/api/s3-proxy/") && !path.startsWith("http")) {
    path = `/api/s3-proxy/${path.replace(/^\//, "")}`;
  }

  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    path = `https://task.se7eninc.com${path.startsWith("/") ? path : `/${path}`}`;
  }

  try {
    const proxied = toProxiedUrl(path);
    if (proxied && proxied.includes("token=")) return proxied;
  } catch (e) {
    // Fall back to manual token attachment
  }

  if (activeToken) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}token=${activeToken}`;
  }

  return path;
};

function normalizeEmployee(e: EmployeeApi): Employee {
  const rawImage =
    e.avatarUrl ||
    e.avatarDataUrl ||
    e.imageUrl ||
    (e.avatar && e.avatar.includes("/") ? e.avatar : undefined);

  return {
    id: e._id,
    name: e.name,
    email: e.email,
    phone: e.phone,
    category: e.category,
    role: e.role,
    company: e.company,
    status: e.status,
    payRate: e.payRate,
    shift: e.shift,
    hireDate: e.hireDate,
    location: e.location,
    joinDate: e.joinDate,
    avatar: e.avatar || "",
    imageUrl: rawImage,
    milestoneLevel: e.milestoneLevel,
    milestoneLabel: e.milestoneLabel,
    current_status: e.current_status || "AVAILABLE",
    lunch_start_time: e.lunch_start_time || null,
    lunch_expected_end: e.lunch_expected_end || null,
    break_start_time: e.break_start_time || null,
  };
}

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  "on-leave": "On Leave",
};

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  phone: z.string().min(1, "Phone is required"),
  category: z.string().optional().default(""),
  role: z.string().min(1, "Role is required"),
  company: z.string().optional().default(""),
  status: z.enum(["active", "inactive", "on-leave"]),
  payRate: z.string().optional().default(""),
  shift: z.string().optional().default(""),
  hireDate: z.string().optional().default(""),
  location: z.string().min(1, "Location is required"),
  joinDate: z.string().min(1, "Join date is required"),
});

type CreateEmployeeValues = z.infer<typeof createEmployeeSchema>;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "?" : "";
  return (first + last).toUpperCase();
}

function formatStatusTime(timeStr?: string | null) {
  if (!timeStr) return "";
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:      uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#f8fafc"),
    cardBg:          uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#ffffff"),
    text:            uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#ffffff" : "#0f172a"),
    textSecondary:   isDark ? "#94a3b8" : "#64748b",
    border:          isDark ? "#334155" : "#e2e8f0",
    primary:         uiTheme.customColors?.primary                || "#2563eb",
    secondary:       uiTheme.customColors?.secondary              || (isDark ? "#a1a1aa" : "#475569"),
    accent:          uiTheme.customColors?.accent                 || "#ffd27a",
    overlayBg:       "rgba(0, 0, 0, 0.6)",
    lunchBg:         "#d97706",
    breakBg:         "#7c3aed",
    activeStatus:    "#10b981",
    leaveStatus:     "#f59e0b",
    destructive:     "#ef4444",
  };
}

type ThemeColors = ReturnType<typeof buildColors>;
type ThemeStyles = ReturnType<typeof createStyles>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      width: "100%",
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      marginTop: 2,
      color: colors.textSecondary,
    },
    filterSection: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 16,
      alignItems: "center",
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      height: 40,
      fontSize: 14,
      color: colors.text,
    },
    dropdownSelector: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      height: 40,
      gap: 6,
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    dropdownSelectorText: {
      fontSize: 14,
      color: colors.text,
    },
    listContainer: {
      paddingBottom: 20,
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 16,
      marginBottom: 12,
      position: "relative",
      overflow: "hidden",
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    statusBadgeOverlay: {
      position: "absolute",
      top: 10,
      right: 10,
      paddingVertical: 2,
      paddingHorizontal: 8,
      borderRadius: 12,
      zIndex: 10,
    },
    lunchBg: { backgroundColor: colors.lunchBg },
    breakBg: { backgroundColor: colors.breakBg },
    statusBadgeText: {
      color: "#FFF",
      fontSize: 11,
      fontWeight: "600",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    avatarContainer: {
      position: "relative",
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#334155",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: 22,
    },
    avatarText: {
      fontWeight: "600",
      fontSize: 15,
      color: colors.secondary,
    },
    statusDot: {
      position: "absolute",
      bottom: -1,
      right: -1,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.cardBg,
    },
    headerMeta: {
      flex: 1,
      marginLeft: 12,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    employeeRole: {
      fontSize: 13,
      marginTop: 1,
      color: colors.textSecondary,
    },
    actionButton: {
      padding: 6,
    },
    cardDetails: {
      gap: 6,
      borderBottomWidth: 1,
      paddingBottom: 12,
      marginBottom: 10,
      borderBottomColor: colors.border,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    detailText: {
      fontSize: 13,
      flex: 1,
      color: colors.text,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "flex-start",
    },
    statusIndicatorLabel: {
      fontSize: 12,
      fontWeight: "600",
    },
    statsFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: 1,
      paddingVertical: 12,
      width: "100%",
      backgroundColor: colors.background,
      borderTopColor: colors.border,
    },
    statsMainCount: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    statsIndicatorContainer: {
      flexDirection: "row",
      gap: 12,
    },
    statDotUnit: {
      fontSize: 12,
      fontWeight: "500",
    },
    centerSection: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 8,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginTop: 12,
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: 14,
      marginTop: 4,
      color: colors.textSecondary,
    },
    clearFiltersBtn: {
      marginTop: 14,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderRadius: 6,
      borderColor: colors.border,
    },
    clearFiltersText: {
      fontSize: 13,
      color: colors.text,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    modalOverlayInside: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
    },
    bottomSheetContainer: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      paddingBottom: 34,
      backgroundColor: colors.cardBg,
    },
    bottomSheetHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    bottomSheetTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    pickerItem: {
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerItemText: {
      fontSize: 15,
      color: colors.text,
    },
    viewDetailsContainer: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      maxHeight: "85%",
      backgroundColor: colors.cardBg,
    },
    viewDetailsBody: {
      gap: 16,
    },
    viewDetailsHeaderArea: {
      alignItems: "center",
      marginBottom: 10,
    },
    largeAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      backgroundColor: "#334155",
      overflow: "hidden",
    },
    largeAvatarImage: {
      width: "100%",
      height: "100%",
      borderRadius: 30,
    },
    largeAvatarText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.secondary,
    },
    viewDetailsName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    viewDetailsRole: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    viewDetailsGrid: {
      maxHeight: 240,
    },
    infoBlock: {
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 12,
      textTransform: "uppercase",
      color: colors.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: "500",
      marginTop: 2,
      color: colors.text,
    },
    viewDetailsFooterRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 10,
    },
    primaryBtn: {
      flex: 1,
      height: 44,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primary,
    },
    primaryBtnText: {
      color: "#FFF",
      fontWeight: "600",
      fontSize: 14,
    },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      height: 44,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderColor: colors.border,
    },
    secondaryBtnText: {
      fontWeight: "600",
      fontSize: 14,
      color: colors.text,
    },
    formContainerSheet: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
      height: "90%",
      backgroundColor: colors.cardBg,
    },
    formScrollBody: {
      flex: 1,
    },
    formLabelText: {
      fontSize: 14,
      fontWeight: "500",
      marginBottom: 6,
      marginTop: 12,
      color: colors.text,
    },
    formTextInput: {
      borderWidth: 1,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 12,
      fontSize: 14,
      backgroundColor: colors.background,
      borderColor: colors.border,
      color: colors.text,
    },
    formDropdownRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderRadius: 8,
      height: 40,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    bottomSheetFooterRow: {
      flexDirection: "row",
      gap: 10,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    errorText: {
      color: colors.destructive,
      fontSize: 12,
      marginTop: 4,
    },
    innerPickerBox: {
      width: "80%",
      borderRadius: 12,
      padding: 16,
      maxHeight: "60%",
      backgroundColor: colors.cardBg,
    },
    innerPickerOption: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    actionMenuOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 8,
      gap: 12,
      borderBottomWidth: 1,
    },
    actionMenuOptionText: {
      fontSize: 16,
      fontWeight: "500",
    },
  });
}

export default function Employees() {
  const localParams = useLocalSearchParams();
  const { user } = useAuth();
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  
  const { uiTheme } = useTheme();

  const isDark = (uiTheme?.theme as string) === "dark" || (uiTheme?.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const statusColors = useMemo(() => ({
    active: colors.activeStatus,
    inactive: colors.textSecondary,
    "on-leave": colors.leaveStatus,
  }), [colors]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Retrieve JWT Token
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await initToken();
        let token =
          (user as any)?.token ||
          (user as any)?.accessToken ||
          (user as any)?.jwt;

        if (!token) {
          const keys = await AsyncStorage.getAllKeys();
          const possibleTokenKeys = keys.filter((k) =>
            /token|jwt|auth|session/i.test(k)
          );
          for (const key of possibleTokenKeys) {
            const val = await AsyncStorage.getItem(key);
            if (val && typeof val === "string" && val.length > 10) {
              token = val;
              break;
            }
          }
        }

        if (isMounted && token) {
          setJwtToken(token);
        }
      } catch (err) {
        console.error("Failed to load token in Employees screen:", err);
      }
    })();

    return () => { isMounted = false; };
  }, [user]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (payload: {
      userId: string;
      current_status: "AVAILABLE" | "LUNCH" | "BREAK";
      lunch_start_time: string | null;
      lunch_expected_end: string | null;
      break_start_time: string | null;
    }) => {
      queryClient.setQueryData<Employee[]>(["employees"], (old) => {
        if (!old) return old;
        return old.map((emp) => {
          if (emp.id === payload.userId) {
            return {
              ...emp,
              current_status: payload.current_status,
              lunch_start_time: payload.lunch_start_time,
              lunch_expected_end: payload.lunch_expected_end,
              break_start_time: payload.break_start_time,
            };
          }
          return emp;
        });
      });
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket, queryClient]);

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const list = await listResource<Company>("companies");
      return list.filter((c) => c.status === "active");
    },
  });
  const companies = companiesQuery.data ?? [];

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = (await apiFetch("/api/employees")) as { items?: EmployeeApi[] } | EmployeeApi[];
      const itemsList = Array.isArray(res) ? res : res.items || [];
      return itemsList.map(normalizeEmployee);
    },
  });
  const employees = employeesQuery.data ?? [];

  const openView = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
  };

  useEffect(() => {
    const viewId = String(localParams.view || "").trim();
    if (!viewId) return;
    const match = employees.find((e) => String(e.id) === viewId);
    if (match) openView(match);
  }, [employees, localParams.view]);

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: Omit<Employee, "id">) => {
      const res = (await apiFetch("/api/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as { item: EmployeeApi };
      return normalizeEmployee(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateEmployeeValues }) => {
      const fullName = `${payload.firstName} ${payload.lastName}`.trim();
      const nextPayload = {
        ...payload,
        name: fullName,
        avatar: getInitials(fullName),
      };
      const res = (await apiFetch(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(nextPayload),
      })) as { item: EmployeeApi };
      return normalizeEmployee(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/employees/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const defaultFormValues: CreateEmployeeValues = {
    firstName: "", lastName: "", email: "", phone: "", category: "", role: "",
    company: "", status: "active", payRate: "", shift: "", hireDate: "", location: "", joinDate: "",
  };

  const createForm = useForm<CreateEmployeeValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: defaultFormValues,
  });

  const editForm = useForm<CreateEmployeeValues>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: defaultFormValues,
  });

  const onCreateEmployee = (values: CreateEmployeeValues) => {
    const fullName = `${values.firstName} ${values.lastName}`.trim();
    const payload: Omit<Employee, "id"> = {
      ...values,
      name: fullName,
      avatar: getInitials(fullName),
    };

    createEmployeeMutation.mutate(payload, {
      onSuccess: () => {
        setIsCreateOpen(false);
        createForm.reset();
        Alert.alert("Success", "New employee has been added to the directory.");
      },
      onError: (err) => {
        Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong");
      },
    });
  };

  const onEditEmployee = (values: CreateEmployeeValues) => {
    if (!selectedEmployee) return;
    updateEmployeeMutation.mutate(
      { id: selectedEmployee.id, payload: values },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          Alert.alert("Success", "Employee profile has been updated.");
        },
        onError: (err) => {
          Alert.alert("Error", err instanceof Error ? err.message : "Something went wrong");
        },
      }
    );
  };

  const openEdit = (employee: Employee) => {
    const [firstName, ...rest] = employee.name.trim().split(/\s+/).filter(Boolean);
    const lastName = rest.join(" ");
    setSelectedEmployee(employee);
    editForm.reset({
      firstName: firstName ?? "",
      lastName,
      email: employee.email,
      phone: employee.phone,
      category: employee.category,
      role: employee.role,
      company: employee.company,
      status: employee.status,
      payRate: employee.payRate,
      shift: employee.shift,
      hireDate: employee.hireDate,
      location: employee.location,
      joinDate: employee.joinDate,
    });
    setIsEditOpen(true);
  };

  const openActions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setOptionsMenuOpen(true);
  };

  const confirmDeleteAlert = (employee: Employee) => {
    Alert.alert("Delete employee?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteEmployeeMutation.mutate(employee.id, {
            onSuccess: () => Alert.alert("Deleted", "Employee profile removed."),
            onError: (err) => Alert.alert("Error", err instanceof Error ? err.message : "Mutation failed"),
          });
        },
      },
    ]);
  };

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchQuery, statusFilter]);

  const renderEmployeeCard = ({ item: employee }: { item: Employee }) => {
    const isOnLeaveOrBreak = employee.current_status && employee.current_status !== "AVAILABLE";
    const imageUri = getDisplayImageUrl(employee.imageUrl, jwtToken);
    const hasError = imageErrorMap[employee.id];

    return (
      <TouchableOpacity
        style={s([styles.card, isOnLeaveOrBreak && { opacity: 0.75 }])}
        onPress={() => openView(employee)}
      >
        {isOnLeaveOrBreak && (
          <View style={s([styles.statusBadgeOverlay, employee.current_status === "LUNCH" ? styles.lunchBg : styles.breakBg])}>
            <Text style={s(styles.statusBadgeText)}>
              {employee.current_status === "LUNCH" ? "On Lunch" : "On Break"} ({formatStatusTime(employee.current_status === "LUNCH" ? employee.lunch_start_time : employee.break_start_time)})
            </Text>
          </View>
        )}

        <View style={s(styles.cardHeader)}>
          <View style={s(styles.avatarContainer)}>
            <View style={s([styles.avatar, isOnLeaveOrBreak && { borderColor: colors.accent, borderWidth: 2 }])}>
              {imageUri && !hasError ? (
                <Image
                  source={{ uri: imageUri }}
                  style={s(styles.avatarImage)}
                  resizeMode="cover"
                  onError={() => setImageErrorMap((prev) => ({ ...prev, [employee.id]: true }))}
                />
              ) : (
                <Text style={s(styles.avatarText)}>{getInitials(employee.name)}</Text>
              )}
            </View>
            <View style={s([styles.statusDot, { backgroundColor: statusColors[employee.status] }])} />
          </View>

          <View style={s(styles.headerMeta)}>
            <View style={s(styles.nameRow)}>
              <Text style={s(styles.employeeName)}>{employee.name}</Text>
              {employee.milestoneLevel && (
                <MilestoneBadge level={employee.milestoneLevel} label={employee.milestoneLabel} size="sm" />
              )}
            </View>
            <Text style={s(styles.employeeRole)}>{employee.role}</Text>
          </View>

          <TouchableOpacity onPress={() => openActions(employee)} style={s(styles.actionButton)}>
            <MoreHorizontal size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s(styles.cardDetails)}>
          <View style={s(styles.detailRow)}>
            <Mail size={14} color={colors.textSecondary} />
            <Text style={s(styles.detailText)} numberOfLines={1}>{employee.email}</Text>
          </View>
          <View style={s(styles.detailRow)}>
            <Phone size={14} color={colors.textSecondary} />
            <Text style={s(styles.detailText)}>{employee.phone}</Text>
          </View>
          <View style={s(styles.detailRow)}>
            <MapPin size={14} color={colors.textSecondary} />
            <Text style={s(styles.detailText)}>{employee.location}</Text>
          </View>
        </View>

        <View style={s(styles.cardFooter)}>
          <Text style={s([styles.statusIndicatorLabel, { color: statusColors[employee.status] }])}>
            ● {statusLabels[employee.status]}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedImageUri = selectedEmployee ? getDisplayImageUrl(selectedEmployee.imageUrl, jwtToken) : null;
  const selectedHasError = selectedEmployee ? imageErrorMap[selectedEmployee.id] : false;

  return (
    <SafeAreaView style={s(styles.safeContainer)}>
      <Animated.View style={s([styles.container, { opacity: fadeAnim }])}>
        
        <View style={s(styles.header)}>
          <View>
            <Text style={s(styles.title)}>Employee Directory</Text>
            <Text style={s(styles.subtitle)}>View and manage your team members</Text>
          </View>
        </View>

        <View style={s(styles.filterSection)}>
          <View style={s(styles.searchContainer)}>
            <Search size={16} color={colors.textSecondary} style={s(styles.searchIcon)} />
            <TextInput
              style={s(styles.searchInput)}
              placeholder="Search by name, email, or role..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={s(styles.dropdownSelector)} onPress={() => setStatusPickerOpen(true)}>
            <Text style={s(styles.dropdownSelectorText)}>
              {statusFilter === "all" ? "All Status" : statusLabels[statusFilter as keyof typeof statusLabels]}
            </Text>
            <ChevronDown size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {employeesQuery.isLoading ? (
          <View style={s(styles.centerSection)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={s(styles.loadingText)}>Loading employees...</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={s(styles.emptyContainer)}>
            <Users size={48} color={colors.textSecondary} />
            <Text style={s(styles.emptyTitle)}>No employees found</Text>
            <Text style={s(styles.emptySubtitle)}>Try adjusting your filter options</Text>
            <TouchableOpacity style={s(styles.clearFiltersBtn)} onPress={() => { setSearchQuery(""); setStatusFilter("all"); }}>
              <Text style={s(styles.clearFiltersText)}>Clear filters</Text>
            </TouchableOpacity>
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

        <View style={s(styles.statsFooter)}>
          <Text style={s(styles.statsMainCount)}>
            Showing {filteredEmployees.length} of {employees.length}
          </Text>
          <View style={s(styles.statsIndicatorContainer)}>
            <Text style={s([styles.statDotUnit, { color: statusColors.active }])}>
              ● {employees.filter((e) => e.status === "active").length} Active
            </Text>
            <Text style={s([styles.statDotUnit, { color: statusColors["on-leave"] }])}>
              ● {employees.filter((e) => e.status === "on-leave").length} Leave
            </Text>
          </View>
        </View>

        <Modal visible={statusPickerOpen} transparent animationType="slide">
          <View style={s(styles.modalOverlay)}>
            <View style={s(styles.bottomSheetContainer)}>
              <View style={s(styles.bottomSheetHeader)}>
                <Text style={s(styles.bottomSheetTitle)}>Select Status Filter</Text>
                <TouchableOpacity onPress={() => setStatusPickerOpen(false)}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              {["all", "active", "inactive", "on-leave"].map((statusOption) => (
                <TouchableOpacity
                  key={statusOption}
                  style={s(styles.pickerItem)}
                  onPress={() => {
                    setStatusFilter(statusOption);
                    setStatusPickerOpen(false);
                  }}
                >
                  <Text style={s(styles.pickerItemText)}>
                    {statusOption === "all" ? "All Status" : statusLabels[statusOption as keyof typeof statusLabels]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        <Modal visible={optionsMenuOpen} transparent animationType="slide">
          <View style={s(styles.modalOverlay)}>
            <View style={s(styles.bottomSheetContainer)}>
              <View style={s(styles.bottomSheetHeader)}>
                <Text style={s(styles.bottomSheetTitle)}>{selectedEmployee?.name || "Options"}</Text>
                <TouchableOpacity onPress={() => setOptionsMenuOpen(false)}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              {selectedEmployee && (
                <View>
                  <TouchableOpacity 
                    style={s([styles.pickerItem, styles.actionMenuOptionRow])} 
                    onPress={() => { setOptionsMenuOpen(false); openView(selectedEmployee); }}
                  >
                    <Eye size={18} color={colors.primary} />
                    <Text style={s([styles.actionMenuOptionText, { color: colors.text }])}>View Details</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={s([styles.pickerItem, styles.actionMenuOptionRow])} 
                    onPress={() => { setOptionsMenuOpen(false); openEdit(selectedEmployee); }}
                  >
                    <Edit2 size={18} color={colors.leaveStatus} />
                    <Text style={s([styles.actionMenuOptionText, { color: colors.text }])}>Edit Profile</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={s([styles.pickerItem, styles.actionMenuOptionRow, { borderBottomWidth: 0 }])} 
                    onPress={() => { setOptionsMenuOpen(false); confirmDeleteAlert(selectedEmployee); }}
                  >
                    <Trash2 size={18} color={colors.destructive} />
                    <Text style={s([styles.actionMenuOptionText, { color: colors.destructive }])}>Delete Employee</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

        <EmployeeFormModal
          visible={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={onCreateEmployee}
          companies={companies}
          formTitle="Add Employee"
          formHook={createForm}
          themeContext={{ colors, styles }}
        />

        <EmployeeFormModal
          visible={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={onEditEmployee}
          companies={companies}
          formTitle="Edit Employee"
          formHook={editForm}
          themeContext={{ colors, styles }}
        />

        <Modal visible={isViewOpen} transparent animationType="fade">
          <View style={s(styles.modalOverlay)}>
            <View style={s(styles.viewDetailsContainer)}>
              <View style={s(styles.bottomSheetHeader)}>
                <Text style={s(styles.bottomSheetTitle)}>Employee Details</Text>
                <TouchableOpacity onPress={() => setIsViewOpen(false)}>
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {selectedEmployee && (
                <View style={s(styles.viewDetailsBody)}>
                  <View style={s(styles.viewDetailsHeaderArea)}>
                    <View style={s(styles.largeAvatar)}>
                      {selectedImageUri && !selectedHasError ? (
                        <Image
                          source={{ uri: selectedImageUri }}
                          style={s(styles.largeAvatarImage)}
                          resizeMode="cover"
                          onError={() => setImageErrorMap((prev) => ({ ...prev, [selectedEmployee.id]: true }))}
                        />
                      ) : (
                        <Text style={s(styles.largeAvatarText)}>{getInitials(selectedEmployee.name)}</Text>
                      )}
                    </View>
                    <Text style={s(styles.viewDetailsName)}>{selectedEmployee.name}</Text>
                    <Text style={s(styles.viewDetailsRole)}>{selectedEmployee.role}</Text>
                  </View>

                  <ScrollView style={s(styles.viewDetailsGrid)}>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Email</Text><Text style={s(styles.infoValue)}>{selectedEmployee.email}</Text></View>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Phone</Text><Text style={s(styles.infoValue)}>{selectedEmployee.phone}</Text></View>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Location</Text><Text style={s(styles.infoValue)}>{selectedEmployee.location}</Text></View>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Category</Text><Text style={s(styles.infoValue)}>{selectedEmployee.category || "N/A"}</Text></View>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Company</Text><Text style={s(styles.infoValue)}>{selectedEmployee.company || "N/A"}</Text></View>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Status</Text><Text style={s(styles.infoValue)}>{statusLabels[selectedEmployee.status]}</Text></View>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Shift</Text><Text style={s(styles.infoValue)}>{selectedEmployee.shift || "N/A"}</Text></View>
                    <View style={s(styles.infoBlock)}><Text style={s(styles.infoLabel)}>Join Date</Text><Text style={s(styles.infoValue)}>{new Date(selectedEmployee.joinDate).toLocaleDateString()}</Text></View>
                  </ScrollView>

                  <View style={s(styles.viewDetailsFooterRow)}>
                    <TouchableOpacity style={s(styles.secondaryBtn)} onPress={() => setIsViewOpen(false)}>
                      <Text style={s(styles.secondaryBtnText)}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s(styles.primaryBtn)} onPress={() => { setIsViewOpen(false); openEdit(selectedEmployee); }}>
                      <Text style={s(styles.primaryBtnText)}>Edit Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

      </Animated.View>
    </SafeAreaView>
  );
}

function EmployeeFormModal({
  visible, onClose, onSubmit, companies, formTitle, formHook, themeContext
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: CreateEmployeeValues) => void;
  companies: Company[];
  formTitle: string;
  formHook: UseFormReturn<CreateEmployeeValues>;
  themeContext: { colors: ThemeColors; styles: ThemeStyles };
}) {
  const { colors, styles } = themeContext;
  const [formCompanyPicker, setFormCompanyPicker] = useState(false);
  const [formStatusPicker, setFormStatusPicker] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s(styles.modalOverlay)}>
        <View style={s(styles.formContainerSheet)}>
          <View style={s(styles.bottomSheetHeader)}>
            <Text style={s(styles.bottomSheetTitle)}>{formTitle}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s(styles.formScrollBody)} showsVerticalScrollIndicator={false}>
            {[
              { id: "firstName", label: "First Name *" },
              { id: "lastName", label: "Last Name *" },
              { id: "email", label: "Email *", keyboard: "email-address" },
              { id: "phone", label: "Phone *", keyboard: "phone-pad" },
              { id: "category", label: "Category" },
              { id: "role", label: "Role *" },
            ].map((fieldItem) => (
              <React.Fragment key={fieldItem.id}>
                <Text style={s(styles.formLabelText)}>{fieldItem.label}</Text>
                <Controller
                  control={formHook.control}
                  name={fieldItem.id as keyof CreateEmployeeValues}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput
                        style={s(styles.formTextInput)}
                        placeholder={fieldItem.label}
                        placeholderTextColor={colors.textSecondary}
                        keyboardType={(fieldItem.keyboard as KeyboardTypeOptions) || "default"}
                        autoCapitalize={fieldItem.id === "email" ? "none" : "sentences"}
                        value={value}
                        onChangeText={onChange}
                      />
                      {error && <Text style={s(styles.errorText)}>{error.message}</Text>}
                    </View>
                  )}
                />
              </React.Fragment>
            ))}

            <Text style={s(styles.formLabelText)}>Company</Text>
            <Controller
              control={formHook.control}
              name="company"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TouchableOpacity style={s(styles.formDropdownRow)} onPress={() => setFormCompanyPicker(true)}>
                    <Text style={s({ color: value ? colors.text : colors.textSecondary })}>{value || "Select Company"}</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Modal visible={formCompanyPicker} transparent animationType="fade">
                    <View style={s(styles.modalOverlayInside)}>
                      <View style={s(styles.innerPickerBox)}>
                        <FlatList
                          data={[...companies, { id: "__other__", name: "Other", status: "active", code: "" } as Company]}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={s(styles.innerPickerOption)}
                              onPress={() => {
                                onChange(item.id === "__other__" ? "" : item.name);
                                setFormCompanyPicker(false);
                              }}
                            >
                              <Text style={s({ color: colors.text, textAlign: "center" })}>{item.name}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    </View>
                  </Modal>
                </View>
              )}
            />

            <Text style={s(styles.formLabelText)}>Status *</Text>
            <Controller
              control={formHook.control}
              name="status"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TouchableOpacity style={s(styles.formDropdownRow)} onPress={() => setFormStatusPicker(true)}>
                    <Text style={s({ color: colors.text })}>{statusLabels[value as keyof typeof statusLabels] || "Select Status"}</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <Modal visible={formStatusPicker} transparent animationType="fade">
                    <View style={s(styles.modalOverlayInside)}>
                      <View style={s(styles.innerPickerBox)}>
                        {["active", "inactive", "on-leave"].map((statusKey) => (
                          <TouchableOpacity
                            key={statusKey}
                            style={s(styles.innerPickerOption)}
                            onPress={() => {
                              onChange(statusKey as any);
                              setFormStatusPicker(false);
                            }}
                          >
                            <Text style={s({ color: colors.text, textAlign: "center" })}>{statusLabels[statusKey as keyof typeof statusLabels]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </Modal>
                </View>
              )}
            />

            {[
              { id: "payRate", label: "Pay Rate", placeholder: "e.g. $25/hr" },
              { id: "shift", label: "Shift", placeholder: "e.g. 09:00 - 17:00" },
              { id: "hireDate", label: "Hire Date (YYYY-MM-DD)", placeholder: "YYYY-MM-DD" },
              { id: "location", label: "Location *", placeholder: "e.g. Main Office" },
              { id: "joinDate", label: "Join Date * (YYYY-MM-DD)", placeholder: "YYYY-MM-DD" },
            ].map((descField) => (
              <React.Fragment key={descField.id}>
                <Text style={s(styles.formLabelText)}>{descField.label}</Text>
                <Controller
                  control={formHook.control}
                  name={descField.id as keyof CreateEmployeeValues}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput
                        style={s(styles.formTextInput)}
                        placeholder={descField.placeholder}
                        placeholderTextColor={colors.textSecondary}
                        value={value}
                        onChangeText={onChange}
                      />
                      {error && <Text style={s(styles.errorText)}>{error.message}</Text>}
                    </View>
                  )}
                />
              </React.Fragment>
            ))}
            <View style={s({ height: 40 })} />
          </ScrollView>

          <View style={s(styles.bottomSheetFooterRow)}>
            <TouchableOpacity style={s(styles.secondaryBtn)} onPress={onClose}>
              <Text style={s(styles.secondaryBtnText)}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.primaryBtn)} onPress={formHook.handleSubmit(onSubmit)}>
              <Text style={s(styles.primaryBtnText)}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}