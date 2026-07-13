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
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Users,
  X,
  ChevronDown,
} from "lucide-react-native";

// Custom API, Sockets and Theme Context imports
import { apiFetch, listResource } from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import MilestoneBadge from "./MilestoneBadge";

// --- Interfaces & Types ---
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

type EmployeeApi = Omit<Employee, "id"> & {
  _id: string;
};

function normalizeEmployee(e: EmployeeApi): Employee {
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
    avatar: e.avatar,
    imageUrl: (e as any).avatarUrl || (e as any).imageUrl,
    milestoneLevel: (e as any).milestoneLevel,
    milestoneLabel: (e as any).milestoneLabel,
    current_status: (e as any).current_status || "AVAILABLE",
    lunch_start_time: (e as any).lunch_start_time || null,
    lunch_expected_end: (e as any).lunch_expected_end || null,
    break_start_time: (e as any).break_start_time || null,
  };
}

const statusLabels = {
  active: "Active",
  inactive: "Inactive",
  "on-leave": "On Leave",
};

// --- Validation Schemas ---
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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return "";
  }
}

export default function Employees() {
  const localParams = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Theme context destruction
  const { uiTheme ,updateTheme} = useTheme();
  const { customColors, panelColors } = uiTheme;



  // Resolve derived semantic theme values based on text background values
  const isDarkBase = true;//panelColors.dashboardTextColor === "#ffffff" || panelColors.dashboardTextColor === "#F9FAFB";
  const textMuted = isDarkBase ? "#94A3B8" : "#64748B";
  const borderColor = isDarkBase ? "#334155" : "#E2E8F0";

  const statusColors = {
    active: "#10B981",
    inactive: textMuted,
    "on-leave": "#F59E0B",
  };

  // Modals Visibility
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);


  useEffect(() => {
  if (panelColors.dashboardBackground !== "#09090b") {
    void updateTheme({
      theme: "metallic-elite",
      customColors: {
        primary: "#ffd27a",
        secondary: "#a1a1aa",
        accent: "#ffd27a"
      },
      panelColors: {
        headerBackground: "#09090b",
        headerOverlayColor: "#000000",
        headerOverlayOpacity: 0,
        sidebarBackground: "#09090b",
        dashboardBackground: "#09090b",     // Deep Premium Pitch Black Canvas
        sidebarIconColor: "#ffd27a",
        dashboardIconColor: "#ffd27a",
        sidebarTextColor: "#ffffff",
        dashboardCardBackground: "#18181b", // Sleek Zinc-900 elevated card panels
        dashboardTextColor: "#ffffff",
      }
    });
  }
}, [panelColors.dashboardBackground]);


  // --- Realtime Sync ---
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

  // --- Queries & Mutations ---
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
      const res = await apiFetch<{ items: EmployeeApi[] }>("/api/employees");
      return res.items.map(normalizeEmployee);
    },
  });
  const employees = employeesQuery.data ?? [];

  useEffect(() => {
    const viewId = String(localParams.view || "").trim();
    if (!viewId) return;
    const match = employees.find((e) => String(e.id) === viewId);
    if (match) openView(match);
  }, [employees, localParams.view]);

  const createEmployeeMutation = useMutation({
    mutationFn: async (payload: Omit<Employee, "id">) => {
      const res = await apiFetch<{ item: EmployeeApi }>("/api/employees", {
        method: "POST",
        body: JSON.stringify(payload),
      });
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
      const res = await apiFetch<{ item: EmployeeApi }>(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(nextPayload),
      });
      return normalizeEmployee(res.item);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/employees/${id}`, { method: "DELETE" });
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

  // --- Handlers ---
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

  const openView = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
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
    Alert.alert("Employee Options", employee.name, [
      { text: "View Details", onPress: () => openView(employee) },
      { text: "Edit Profile", onPress: () => openEdit(employee) },
      { text: "Delete Employee", style: "destructive", onPress: () => confirmDeleteAlert(employee) },
      { text: "Cancel", style: "cancel" },
    ]);
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
    
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: panelColors.dashboardCardBackground, borderColor: borderColor }, isOnLeaveOrBreak && { opacity: 0.75 }]}
        onPress={() => openView(employee)}
      >
        {isOnLeaveOrBreak && (
          <View style={[styles.statusBadgeOverlay, employee.current_status === "LUNCH" ? styles.lunchBg : styles.breakBg]}>
            <Text style={styles.statusBadgeText}>
              {employee.current_status === "LUNCH" ? "On Lunch" : "On Break"} ({formatStatusTime(employee.current_status === "LUNCH" ? employee.lunch_start_time : employee.break_start_time)})
            </Text>
          </View>
        )}

        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, isDarkBase ? { backgroundColor: "#334155" } : { backgroundColor: "#EEF2F6" }, isOnLeaveOrBreak && { borderColor: customColors.accent, borderWidth: 2 }]}>
              <Text style={[styles.avatarText, { color: customColors.secondary }]}>{getInitials(employee.name)}</Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: statusColors[employee.status] }]} />
          </View>

          <View style={styles.headerMeta}>
            <View style={styles.nameRow}>
              <Text style={[styles.employeeName, { color: panelColors.dashboardTextColor }]}>{employee.name}</Text>
              {employee.milestoneLevel && (
                <MilestoneBadge level={employee.milestoneLevel} label={employee.milestoneLabel} size="sm" />
              )}
            </View>
            <Text style={[styles.employeeRole, { color: textMuted }]}>{employee.role}</Text>
          </View>

          <TouchableOpacity onPress={() => openActions(employee)} style={styles.actionButton}>
            <MoreHorizontal size={20} color={textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.cardDetails, { borderBottomColor: borderColor }]}>
          <View style={styles.detailRow}>
            <Mail size={14} color={textMuted} />
            <Text style={[styles.detailText, { color: panelColors.dashboardTextColor }]} numberOfLines={1}>{employee.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Phone size={14} color={textMuted} />
            <Text style={[styles.detailText, { color: panelColors.dashboardTextColor }]}>{employee.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={14} color={textMuted} />
            <Text style={[styles.detailText, { color: panelColors.dashboardTextColor }]}>{employee.location}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.statusIndicatorLabel, { color: statusColors[employee.status] }]}>
            ● {statusLabels[employee.status]}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safeContainer, { backgroundColor: panelColors.dashboardBackground }]}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        
        {/* --- Header Area --- */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: panelColors.dashboardTextColor }]}>Employee Directory</Text>
            <Text style={[styles.subtitle, { color: textMuted }]}>View and manage your team members</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: customColors.primary }]} onPress={() => setIsCreateOpen(true)}>
            <Plus size={18} color="#FFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* --- Filters Area --- */}
        <View style={styles.filterSection}>
          <View style={[styles.searchContainer, { backgroundColor: panelColors.dashboardCardBackground, borderColor: borderColor }]}>
            <Search size={16} color={textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: panelColors.dashboardTextColor }]}
              placeholder="Search by name, email, or role..."
              placeholderTextColor={textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <TouchableOpacity style={[styles.dropdownSelector, { backgroundColor: panelColors.dashboardCardBackground, borderColor: borderColor }]} onPress={() => setStatusPickerOpen(true)}>
            <Text style={[styles.dropdownSelectorText, { color: panelColors.dashboardTextColor }]}>
              {statusFilter === "all" ? "All Status" : statusLabels[statusFilter as keyof typeof statusLabels]}
            </Text>
            <ChevronDown size={16} color={textMuted} />
          </TouchableOpacity>
        </View>

        {/* --- Employee Main Content Row --- */}
        {employeesQuery.isLoading ? (
          <View style={styles.centerSection}>
            <ActivityIndicator size="large" color={customColors.primary} />
            <Text style={[styles.loadingText, { color: textMuted }]}>Loading employees...</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color={textMuted} />
            <Text style={[styles.emptyTitle, { color: panelColors.dashboardTextColor }]}>No employees found</Text>
            <Text style={[styles.emptySubtitle, { color: textMuted }]}>Try adjusting your filter options</Text>
            <TouchableOpacity style={[styles.clearFiltersBtn, { borderColor: borderColor }]} onPress={() => { setSearchQuery(""); setStatusFilter("all"); }}>
              <Text style={[styles.clearFiltersText, { color: panelColors.dashboardTextColor }]}>Clear filters</Text>
            </TouchableOpacity>
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

        {/* --- Stats Footer Summary Bar --- */}
        <View style={[styles.statsFooter, { backgroundColor: panelColors.dashboardBackground, borderTopColor: borderColor }]}>
          <Text style={[styles.statsMainCount, { color: textMuted }]}>
            Showing {filteredEmployees.length} of {employees.length}
          </Text>
          <View style={styles.statsIndicatorContainer}>
            <Text style={[styles.statDotUnit, { color: statusColors.active }]}>
              ● {employees.filter((e) => e.status === "active").length} Active
            </Text>
            <Text style={[styles.statDotUnit, { color: statusColors["on-leave"] }]}>
              ● {employees.filter((e) => e.status === "on-leave").length} Leave
            </Text>
          </View>
        </View>

        {/* --- Global Filter Dropdown Picker Overlay --- */}
        <Modal visible={statusPickerOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.bottomSheetContainer, { backgroundColor: panelColors.dashboardCardBackground }]}>
              <View style={styles.bottomSheetHeader}>
                <Text style={[styles.bottomSheetTitle, { color: panelColors.dashboardTextColor }]}>Select Status Filter</Text>
                <TouchableOpacity onPress={() => setStatusPickerOpen(false)}>
                  <X size={20} color={panelColors.dashboardTextColor} />
                </TouchableOpacity>
              </View>
              {["all", "active", "inactive", "on-leave"].map((statusOption) => (
                <TouchableOpacity
                  key={statusOption}
                  style={[styles.pickerItem, { borderBottomColor: borderColor }]}
                  onPress={() => {
                    setStatusFilter(statusOption);
                    setStatusPickerOpen(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, { color: panelColors.dashboardTextColor }]}>
                    {statusOption === "all" ? "All Status" : statusLabels[statusOption as keyof typeof statusLabels]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* --- Input Form Modals --- */}
        <EmployeeFormModal
          visible={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={onCreateEmployee}
          companies={companies}
          formTitle="Add Employee"
          formHook={createForm}
          themeContext={{ panelColors, customColors, textMuted, borderColor }}
        />

        <EmployeeFormModal
          visible={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={onEditEmployee}
          companies={companies}
          formTitle="Edit Employee"
          formHook={editForm}
          themeContext={{ panelColors, customColors, textMuted, borderColor }}
        />

        {/* --- Detailed Profile View Modal Overlays --- */}
        <Modal visible={isViewOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.viewDetailsContainer, { backgroundColor: panelColors.dashboardCardBackground }]}>
              <View style={styles.bottomSheetHeader}>
                <Text style={[styles.bottomSheetTitle, { color: panelColors.dashboardTextColor }]}>Employee Details</Text>
                <TouchableOpacity onPress={() => setIsViewOpen(false)}>
                  <X size={20} color={panelColors.dashboardTextColor} />
                </TouchableOpacity>
              </View>

              {selectedEmployee && (
                <View style={styles.viewDetailsBody}>
                  <View style={styles.viewDetailsHeaderArea}>
                    <View style={[styles.largeAvatar, isDarkBase ? { backgroundColor: "#334155" } : { backgroundColor: "#EEF2F6" }]}>
                      <Text style={[styles.largeAvatarText, { color: customColors.secondary }]}>{getInitials(selectedEmployee.name)}</Text>
                    </View>
                    <Text style={[styles.viewDetailsName, { color: panelColors.dashboardTextColor }]}>{selectedEmployee.name}</Text>
                    <Text style={[styles.viewDetailsRole, { color: textMuted }]}>{selectedEmployee.role}</Text>
                  </View>

                  <ScrollView style={styles.viewDetailsGrid}>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Email</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{selectedEmployee.email}</Text></View>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Phone</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{selectedEmployee.phone}</Text></View>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Location</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{selectedEmployee.location}</Text></View>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Category</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{selectedEmployee.category || "N/A"}</Text></View>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Company</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{selectedEmployee.company || "N/A"}</Text></View>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Status</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{statusLabels[selectedEmployee.status]}</Text></View>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Shift</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{selectedEmployee.shift || "N/A"}</Text></View>
                    <View style={styles.infoBlock}><Text style={[styles.infoLabel, { color: textMuted }]}>Join Date</Text><Text style={[styles.infoValue, { color: panelColors.dashboardTextColor }]}>{new Date(selectedEmployee.joinDate).toLocaleDateString()}</Text></View>
                  </ScrollView>

                  <View style={styles.viewDetailsFooterRow}>
                    <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: panelColors.dashboardCardBackground, borderColor: borderColor }]} onPress={() => setIsViewOpen(false)}>
                      <Text style={[styles.secondaryBtnText, { color: panelColors.dashboardTextColor }]}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: customColors.primary }]} onPress={() => { setIsViewOpen(false); openEdit(selectedEmployee); }}>
                      <Text style={styles.primaryBtnText}>Edit Profile</Text>
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

// --- Dynamic Theme Aware Input Form Modal Component ---
function EmployeeFormModal({
  visible, onClose, onSubmit, companies, formTitle, formHook, themeContext
}: {
  visible: boolean; onClose: () => void; onSubmit: (values: CreateEmployeeValues) => void;
  companies: Company[]; formTitle: string; formHook: any; themeContext: any;
}) {
  const { panelColors, customColors, textMuted, borderColor } = themeContext;
  const [formCompanyPicker, setFormCompanyPicker] = useState(false);
  const [formStatusPicker, setFormStatusPicker] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
        <View style={[styles.formContainerSheet, { backgroundColor: panelColors.dashboardCardBackground }]}>
          <View style={styles.bottomSheetHeader}>
            <Text style={[styles.bottomSheetTitle, { color: panelColors.dashboardTextColor }]}>{formTitle}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={panelColors.dashboardTextColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScrollBody} showsVerticalScrollIndicator={false}>
            {/* Input fields render loop context mapping */}
            {[
              { id: "firstName", label: "First Name *" },
              { id: "lastName", label: "Last Name *" },
              { id: "email", label: "Email *", keyboard: "email-address" },
              { id: "phone", label: "Phone *", keyboard: "phone-pad" },
              { id: "category", label: "Category" },
              { id: "role", label: "Role *" },
            ].map((fieldItem) => (
              <React.Fragment key={fieldItem.id}>
                <Text style={[styles.formLabelText, { color: panelColors.dashboardTextColor }]}>{fieldItem.label}</Text>
                <Controller
                  control={formHook.control}
                  name={fieldItem.id}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput
                        style={[styles.formTextInput, { backgroundColor: panelColors.dashboardBackground, borderColor: borderColor, color: panelColors.dashboardTextColor }]}
                        placeholder={fieldItem.label}
                        placeholderTextColor={textMuted}
                        keyboardType={fieldItem.keyboard as any || "default"}
                        autoCapitalize={fieldItem.id === "email" ? "none" : "sentences"}
                        value={value}
                        onChangeText={onChange}
                      />
                      {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                  )}
                />
              </React.Fragment>
            ))}

            {/* Company Custom Picker Dropdown */}
            <Text style={[styles.formLabelText, { color: panelColors.dashboardTextColor }]}>Company</Text>
            <Controller
              control={formHook.control}
              name="company"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TouchableOpacity style={[styles.formDropdownRow, { backgroundColor: panelColors.dashboardBackground, borderColor: borderColor }]} onPress={() => setFormCompanyPicker(true)}>
                    <Text style={{ color: value ? panelColors.dashboardTextColor : textMuted }}>{value || "Select Company"}</Text>
                    <ChevronDown size={16} color={textMuted} />
                  </TouchableOpacity>

                  <Modal visible={formCompanyPicker} transparent animationType="fade">
                    <View style={styles.modalOverlayInside}>
                      <View style={[styles.innerPickerBox, { backgroundColor: panelColors.dashboardCardBackground }]}>
                        <FlatList
                          data={[...companies, { id: "__other__", name: "Other" }]}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item }) => (
                            <TouchableOpacity
                              style={[styles.innerPickerOption, { borderBottomColor: borderColor }]}
                              onPress={() => {
                                onChange(item.id === "__other__" ? "" : item.name);
                                setFormCompanyPicker(false);
                              }}
                            >
                              <Text style={{ color: panelColors.dashboardTextColor, textAlign: "center" }}>{item.name}</Text>
                            </TouchableOpacity>
                          )}
                        />
                      </View>
                    </View>
                  </Modal>
                </View>
              )}
            />

            {/* Status Custom Picker Dropdown */}
            <Text style={[styles.formLabelText, { color: panelColors.dashboardTextColor }]}>Status *</Text>
            <Controller
              control={formHook.control}
              name="status"
              render={({ field: { onChange, value } }) => (
                <View>
                  <TouchableOpacity style={[styles.formDropdownRow, { backgroundColor: panelColors.dashboardBackground, borderColor: borderColor }]} onPress={() => setFormStatusPicker(true)}>
                    <Text style={{ color: panelColors.dashboardTextColor }}>{statusLabels[value as keyof typeof statusLabels] || "Select Status"}</Text>
                    <ChevronDown size={16} color={textMuted} />
                  </TouchableOpacity>

                  <Modal visible={formStatusPicker} transparent animationType="fade">
                    <View style={styles.modalOverlayInside}>
                      <View style={[styles.innerPickerBox, { backgroundColor: panelColors.dashboardCardBackground }]}>
                        {["active", "inactive", "on-leave"].map((statusKey) => (
                          <TouchableOpacity
                            key={statusKey}
                            style={[styles.innerPickerOption, { borderBottomColor: borderColor }]}
                            onPress={() => {
                              onChange(statusKey);
                              setFormStatusPicker(false);
                            }}
                          >
                            <Text style={{ color: panelColors.dashboardTextColor, textAlign: "center" }}>{statusLabels[statusKey as keyof typeof statusLabels]}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </Modal>
                </View>
              )}
            />

            {/* Remaining Descriptive Info Fields */}
            {[
              { id: "payRate", label: "Pay Rate", placeholder: "e.g. $25/hr" },
              { id: "shift", label: "Shift", placeholder: "e.g. 09:00 - 17:00" },
              { id: "hireDate", label: "Hire Date (YYYY-MM-DD)", placeholder: "YYYY-MM-DD" },
              { id: "location", label: "Location *", placeholder: "e.g. Main Office" },
              { id: "joinDate", label: "Join Date * (YYYY-MM-DD)", placeholder: "YYYY-MM-DD" },
            ].map((descField) => (
              <React.Fragment key={descField.id}>
                <Text style={[styles.formLabelText, { color: panelColors.dashboardTextColor }]}>{descField.label}</Text>
                <Controller
                  control={formHook.control}
                  name={descField.id}
                  render={({ field: { onChange, value }, fieldState: { error } }) => (
                    <View>
                      <TextInput
                        style={[styles.formTextInput, { backgroundColor: panelColors.dashboardBackground, borderColor: borderColor, color: panelColors.dashboardTextColor }]}
                        placeholder={descField.placeholder}
                        placeholderTextColor={textMuted}
                        value={value}
                        onChangeText={onChange}
                      />
                      {error && <Text style={styles.errorText}>{error.message}</Text>}
                    </View>
                  )}
                />
              </React.Fragment>
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={[styles.bottomSheetFooterRow, { borderTopColor: borderColor }]}>
            <TouchableOpacity style={[styles.secondaryBtn, { backgroundColor: panelColors.dashboardCardBackground, borderColor: borderColor }]} onPress={onClose}>
              <Text style={[styles.secondaryBtnText, { color: panelColors.dashboardTextColor }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: customColors.primary }]} onPress={formHook.handleSubmit(onSubmit)}>
              <Text style={styles.primaryBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- Component Static Styles Base Configuration ---
const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
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
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
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
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  dropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 6,
  },
  dropdownSelectorText: {
    fontSize: 14,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  lunchBg: { backgroundColor: "#D97706" },
  breakBg: { backgroundColor: "#7C3AED" },
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
  },
  avatarText: {
    fontWeight: "600",
    fontSize: 15,
  },
  statusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#FFF",
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
  },
  employeeRole: {
    fontSize: 13,
    marginTop: 1,
  },
  actionButton: {
    padding: 6,
  },
  cardDetails: {
    gap: 6,
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
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
  },
  statsMainCount: {
    fontSize: 12,
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
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  clearFiltersBtn: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
  },
  clearFiltersText: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalOverlayInside: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 34,
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
  },
  pickerItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pickerItemText: {
    fontSize: 15,
  },
  viewDetailsContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "85%",
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
  },
  largeAvatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  viewDetailsName: {
    fontSize: 18,
    fontWeight: "700",
  },
  viewDetailsRole: {
    fontSize: 14,
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
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 2,
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
  },
  secondaryBtnText: {
    fontWeight: "600",
    fontSize: 14,
  },
  formContainerSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    height: "90%",
  },
  formScrollBody: {
    flex: 1,
  },
  formLabelText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 12,
  },
  formTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  formDropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
  },
  bottomSheetFooterRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  innerPickerBox: {
    width: "80%",
    borderRadius: 12,
    padding: 16,
    maxHeight: "60%",
  },
  innerPickerOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});