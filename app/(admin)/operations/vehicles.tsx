import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  Switch,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Car,
  Search,
  Plus,
  Wrench,
  Clock,
  AlertTriangle,
  Camera,
  Trash2,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  Gauge,
  User,
} from "lucide-react-native";

// Import central API layer config 
import {
  createResource,
  deleteResource,
  listResource,
  updateResource,
  getResource,
  apiFetch
} from "@/lib/admin/apiClient";

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ROLE_GROUPS } from "@/constants/roles";
import { API_BASE_URL } from "@/services/api";


const { width } = Dimensions.get("window");
const PAGE_SIZE = 25;

interface Vehicle {
  id: string;
  frontendId: string;
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  vin: string;
  mileage: string;
  status: "active" | "maintenance" | "inactive";
  lastInspection: string;
  nextInspection: string;
  assignedTo: string;
  insuranceInfo?: string;
  documents?: { fileName: string; dataUrl: string }[];
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
  requiresInspection?: boolean;
}

interface Employee {
  id: string;
  name: string;
  status: string;
}

// Helper date functions matching the web layer layout
const toDateOnly = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

function parseISODate(date: string) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date: string) {
  const d = parseISODate(date);
  if (!d) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = d.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#0F172A" : "#FFFFFF"),
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
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 22, fontWeight: "700", color: colors.text},
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    addButton: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    addButtonText: { color: colors.primaryText, fontWeight: "600", fontSize: 13, marginLeft: 4 },
    metricsContainer: { paddingLeft: 16, paddingVertical: 10, backgroundColor: colors.cardBg },
    metricsContent: { paddingRight: 32 },
    metricCard: { minWidth: 100, padding: 12, marginRight: 12, borderRadius: 10, borderWidth: 1, backgroundColor: colors.cardBg },
    metricValue: { fontSize: 18, fontWeight: "700", color: colors.text },
    metricLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.cardBg, margin: 16, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border, height: 44 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: colors.inputText },
    errorBanner: { flexDirection: "row", alignItems: "center", backgroundColor: colors.dangerBg, marginHorizontal: 16, padding: 10, borderRadius: 6 },
    errorText: { color: colors.dangerText, marginLeft: 8, fontSize: 13, flex: 1 },
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },
    card: { backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
    cardBodyRow: { flexDirection: "row" },
    thumbnail: { width: 64, height: 64, borderRadius: 8 },
    photoFallback: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
    photoImage: { width: 64, height: 64, borderRadius: 8 },
    detailsContainer: { flex: 1, marginLeft: 12, justifyContent: "space-between" },
    cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    cardTitle: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1, marginRight: 8 },
    statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    statusBadgeText: { fontSize: 10, fontWeight: "700" },
    statusActive: { backgroundColor: colors.activeBadgeBg },
    statusActiveText: { color: colors.activeBadgeText },
    statusMaint: { backgroundColor: colors.warning },
    statusMaintText: { color: colors.warning },
    statusInactive: { backgroundColor: colors.borderLight },
    statusInactiveText: { color: colors.textSecondary },
    cardSubtitle: { fontSize: 13, color: colors.textMuted },
    assignedText: { fontSize: 12, color: colors.textSecondary, fontWeight: "500", marginTop: 2 },
    cardFooter: { flexDirection: "row", alignItems: "center", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
    mileageText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    actionRow: { flexDirection: "row" },
    actionIcon: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
    paginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.cardBg },
    pageButton: { padding: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
    disabledButton: { opacity: 0.4 },
    pageText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
    modalContainer: { flex: 1, backgroundColor: colors.cardBg },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text },
    modalScroll: { padding: 16 },
    detailRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    detailLabel: { fontSize: 14, color: colors.textMuted },
    detailValue: { fontSize: 14, fontWeight: "500", color: colors.text },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginTop: 14, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 10, fontSize: 14, color: colors.inputText, backgroundColor: colors.inputBg, minHeight: 44 },
    inputGrid: { flexDirection: "row" },
    switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingVertical: 4 },
    imagePreviewWrapper: { marginTop: 16, padding: 10, backgroundColor: colors.inputBg, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
    modalLivePreview: { width: "100%", height: 160, borderRadius: 6, marginTop: 8 },
    modalActions: { marginTop: 24, marginBottom: 32 },
    modalButton: { borderRadius: 8, padding: 12, alignItems: "center" },
    submitBtn: { backgroundColor: colors.primary },
    submitBtnText: { color: colors.primaryText, fontWeight: "600", fontSize: 15 },
    formErrorText: { color: colors.dangerText, fontWeight: "600", marginBottom: 12, fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "center", alignItems: "center" },
    pickerMenu: { backgroundColor: colors.cardBg, width: width * 0.8, borderRadius: 12, paddingVertical: 8, elevation: 5, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10 },
    pickerItem: { paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  });
}

// Structural Normalizer mirroring web layer logic
function normalizeVehicle(v: any): Vehicle {
  const id = String(v.id || v._id || "").trim();
  const frontendId = String(v.frontendId || "").trim();
  const makeRaw = String(v.make || "").trim();
  const modelRaw = String(v.model || "").trim();
  const yearRaw = String(v.year || "").trim();
  const nameRaw = String(v.name || "").trim();

  // Handle fallback to manager-style name property if make is blank
  const make = makeRaw || nameRaw;

  return {
    id,
    frontendId,
    make,
    model: modelRaw,
    year: yearRaw,
    licensePlate: String(v.licensePlate || "").trim(),
    vin: String(v.vin || "").trim(),
    mileage: String(v.mileage || "").trim(),
    status: (String(v.status || "active") as Vehicle["status"]) || "active",
    lastInspection: toDateOnly(String(v.lastInspection || "").trim()),
    nextInspection: toDateOnly(String(v.nextInspection || "").trim()),
    assignedTo: String(v.assignedTo || "-").trim() || "-",
    insuranceInfo: String(v.insuranceInfo || "").trim(),
    documents: Array.isArray(v.documents) ? v.documents : [],
    tagPhotoFileName: String(v.tagPhotoFileName || "").trim() || undefined,
    tagPhotoDataUrl: String(v.tagPhotoDataUrl || "").trim() || undefined,
    requiresInspection: v.requiresInspection !== false,
  };
}

// Optimized Async Native Vehicle Image Renderer
const LazyVehiclePhoto = ({ vehicleId, model, style, tintColor }: { vehicleId: string; model: string; style?: any; tintColor?: string }) => {
  const [base64Photo, setBase64Photo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setHasError(false);

    apiFetch<{ photo: string; fileName: string }>(`/api/vehicles/${vehicleId}/photo`)
      .then((data) => {
        if (mounted) {
          if (data?.photo) {
            setBase64Photo(data.photo);
          } else {
            setHasError(true);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Image fetch error:", err);
        if (mounted) {
          setHasError(true);
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [vehicleId]);

  if (loading) {
    return (
      <View style={[{ width: 64, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' }, style, { justifyContent: 'center' }] }>
        <ActivityIndicator size="small" color={tintColor || '#3b82f6'} />
      </View>
    );
  }

  if (hasError || !base64Photo) {
    return (
      <View style={[{ width: 64, height: 64, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' }, style]}>
        <Car color={tintColor || '#3b82f6'} size={28} opacity={0.6} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: base64Photo }}
      style={[{ width: 64, height: 64, borderRadius: 8 }, style]}
      resizeMode="cover"
    />
  );
};

export default function VehiclesScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editVehicleOpen, setEditVehicleOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const [isAssigneePickerOpen, setIsAssigneePickerOpen] = useState(false);

  const { user } = useAuth();

  // Separated states for independent form control
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    vin: "",
    mileage: "",
    status: "active" as Vehicle["status"],
    lastInspection: "",
    nextInspection: "",
    assignedTo: "",
    insuranceInfo: "",
    documents: [] as { fileName: string; dataUrl: string }[],
    tagPhotoFileName: "",
    tagPhotoDataUrl: "",
    requiresInspection: true,
  });

  const [editFormData, setEditFormData] = useState({
    make: "",
    model: "",
    year: "",
    licensePlate: "",
    vin: "",
    mileage: "",
    status: "active" as Vehicle["status"],
    lastInspection: "",
    nextInspection: "",
    assignedTo: "",
    insuranceInfo: "",
    documents: [] as { fileName: string; dataUrl: string }[],
    tagPhotoFileName: "",
    tagPhotoDataUrl: "",
    requiresInspection: true,
  });

  const queryClient = useQueryClient();

  const PickerTrigger = ({ label, onPress }: { label: string, onPress: () => void }) => (
    <TouchableOpacity style={[styles.input, { justifyContent: 'center' }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={{ color: colors.text }}>{label}</Text>
    </TouchableOpacity>
  );

  // Parallel fetch of active assignees (Employees + Users) matching web layer optimization
  const { data: allAssignees = [] } = useQuery({
    queryKey: ["vehicle-assignees"],
    queryFn: async () => {
      const [employeeList, userList] = await Promise.all([
        listResource<Employee>("employees").catch(() => []),
        listResource<any>("users").catch(() => []),
      ]);

      const allEmployees: Employee[] = Array.isArray(employeeList)
        ? (employeeList as any[]).filter((e: any) => e.status === "active")
        : [];

      if (Array.isArray(userList)) {
        const employeeUsers = userList
          .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
          .map((u) => ({
            id: u.id || u._id,
            name: u.name,
            status: "active",
          }));
        
        employeeUsers.forEach((eu) => {
          if (!allEmployees.some((e) => e.name === eu.name)) {
            allEmployees.push(eu);
          }
        });
      }
      return allEmployees;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (allAssignees.length > 0) setEmployees(allAssignees);
  }, [allAssignees]);

  // Fleet queries with normalized layout structure mapped across pages
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", currentPage, searchQuery],
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await listResource<any>("vehicles", {
        page: currentPage,
        limit: PAGE_SIZE,
        search: searchQuery,
      });
      let items: any[] = [];
      let total = 1;
      if (res && typeof res === "object" && "items" in res) {
        items = res.items;
        total = res.pagination?.totalPages || 1;
      } else if (Array.isArray(res)) {
        items = res;
      }
      return { items, totalPages: total };
    },
  });

  const rawVehiclesList = vehiclesQuery.data?.items || [];
  
  const vehiclesList = useMemo(() => {
    return rawVehiclesList.map(normalizeVehicle);
  }, [rawVehiclesList]);

  const totalPages = vehiclesQuery.data?.totalPages || 1;

  // Analytical summary computations
  const stats = useMemo(() => {
    let active = 0;
    let maintenance = 0;
    let inactive = 0;
    let inspectionsDue = 0;

    vehiclesList.forEach((v) => {
      if (v.status === "active") active++;
      else if (v.status === "maintenance") maintenance++;
      else if (v.status === "inactive") inactive++;

      if (v.nextInspection) {
        const days = daysUntil(v.nextInspection);
        if (days !== null && days <= 30) {
          inspectionsDue++;
        }
      }
    });

    return { total: vehiclesList.length, active, maintenance, inactive, inspectionsDue };
  }, [vehiclesList]);

  const handleAddVehicle = async () => {
    if (!formData.make || !formData.model || !formData.year || !formData.licensePlate) {
      setFormError("Make, Model, Year, and License Plate are mandatory fields.");
      return;
    }
    setFormError(null);
    try {
      setIsAdding(true);
      await createResource("vehicles", formData);
      vehiclesQuery.refetch();
      setAddVehicleOpen(false);
      resetForm();
    } catch (e: any) {
      setApiError(e.message || "Failed to create vehicle entry");
    } finally {
      setIsAdding(false);
    }
  };

  // FIXED: Opens modal instantly with active vehicle details, then performs full update in background
  const handleEditVehicle = async (vehicle: Vehicle) => {
    setApiError(null);
    setSelectedVehicle(vehicle);
    
    // Step 1: Pre-populate state immediately from standard list item row data
    setEditFormData({
      make: vehicle.make || "",
      model: vehicle.model || "",
      year: vehicle.year ? String(vehicle.year) : "",
      licensePlate: vehicle.licensePlate || "",
      vin: vehicle.vin || "",
      mileage: vehicle.mileage ? String(vehicle.mileage) : "",
      status: vehicle.status || "active",
      lastInspection: vehicle.lastInspection || "",
      nextInspection: vehicle.nextInspection || "",
      assignedTo: vehicle.assignedTo || "",
      insuranceInfo: vehicle.insuranceInfo || "",
      documents: vehicle.documents || [],
      tagPhotoFileName: vehicle.tagPhotoFileName || "",
      tagPhotoDataUrl: vehicle.tagPhotoDataUrl || "",
      requiresInspection: vehicle.requiresInspection !== false,
    });
    
    // Open UI modal directly without waiting for asynchronous network response
    setEditVehicleOpen(true);

    // Step 2: Request server live fresh data structure down the pipeline
    try {
      const fullVehicle: any = await getResource("vehicles", vehicle.id);
      const normalized = normalizeVehicle(fullVehicle);
      setSelectedVehicle(normalized);
      setEditFormData({
        make: normalized.make || "",
        model: normalized.model || "",
        year: normalized.year ? String(normalized.year) : "",
        licensePlate: normalized.licensePlate || "",
        vin: normalized.vin || "",
        mileage: normalized.mileage ? String(normalized.mileage) : "",
        status: normalized.status || "active",
        lastInspection: normalized.lastInspection || "",
        nextInspection: normalized.nextInspection || "",
        assignedTo: normalized.assignedTo || "",
        insuranceInfo: normalized.insuranceInfo || "",
        documents: normalized.documents || [],
        tagPhotoFileName: normalized.tagPhotoFileName || "",
        tagPhotoDataUrl: normalized.tagPhotoDataUrl || "",
        requiresInspection: normalized.requiresInspection !== false,
      });
    } catch (e) {
      console.warn("Background detail sync failed, continuing safely with list data fallback.", e);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedVehicle) return;
    if (!editFormData.make || !editFormData.model || !editFormData.year || !editFormData.licensePlate) {
      setFormError("Make, Model, Year, and License Plate are mandatory fields.");
      return;
    }
    try {
      setIsSaving(true);
      await updateResource("vehicles", selectedVehicle.id, editFormData);
      vehiclesQuery.refetch();
      setEditVehicleOpen(false);
      resetForm();
    } catch (e: any) {
      Alert.alert("Update Error", e.message || "Could not update entity details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveConfirm = (vehicle: Vehicle) => {
    Alert.alert(
      "Remove Vehicle",
      `Are you sure you want to permanently remove ${vehicle.make} ${vehicle.model}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteResource("vehicles", vehicle.id);
              vehiclesQuery.refetch();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to remove vehicle record");
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setSelectedVehicle(null);
    setFormError(null);
    setFormData({
      make: "",
      model: "",
      year: "",
      licensePlate: "",
      vin: "",
      mileage: "",
      status: "active",
      lastInspection: "",
      nextInspection: "",
      assignedTo: "",
      insuranceInfo: "",
      documents: [],
      tagPhotoFileName: "",
      tagPhotoDataUrl: "",
      requiresInspection: true,
    });
    setEditFormData({
      make: "",
      model: "",
      year: "",
      licensePlate: "",
      vin: "",
      mileage: "",
      status: "active",
      lastInspection: "",
      nextInspection: "",
      assignedTo: "",
      insuranceInfo: "",
      documents: [],
      tagPhotoFileName: "",
      tagPhotoDataUrl: "",
      requiresInspection: true,
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return { container: styles.statusActive, text: styles.statusActiveText };
      case "maintenance":
        return { container: styles.statusMaint, text: styles.statusMaintText };
      default:
        return { container: styles.statusInactive, text: styles.statusInactiveText };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Page Title Header Container */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Fleet Vehicles</Text>
          <Text style={styles.subtitle}>Track fleet models, inspections & photos</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setAddVehicleOpen(true); }}>
          <Plus color={colors.primaryText} size={16} />
          <Text style={styles.addButtonText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {/* Analytical Metric Summaries Grid */}
      <View style={{ backgroundColor: colors.cardBg, paddingBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsContainer} contentContainerStyle={styles.metricsContent}>
          <View style={[styles.metricCard, { borderColor: colors.primary }]}>
            <Text style={styles.metricValue}>{stats.total}</Text>
            <Text style={styles.metricLabel}>Total Fleet</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: colors.activeBadgeText }]}>
            <Text style={[styles.metricValue, { color: colors.activeBadgeText }]}>{stats.active}</Text>
            <Text style={styles.metricLabel}>Active</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: colors.warning }]}>
            <Text style={[styles.metricValue, { color: colors.warning }]}>{stats.maintenance}</Text>
            <Text style={styles.metricLabel}>Maintenance</Text>
          </View>
          <View style={[styles.metricCard, { borderColor: colors.dangerText }]}>
            <Text style={[styles.metricValue, { color: colors.dangerText }]}>{stats.inspectionsDue}</Text>
            <Text style={styles.metricLabel}>Due soon</Text>
          </View>
        </ScrollView>
      </View>

      {/* Filtration Input Field */}
      <View style={styles.searchContainer}>
        <Search color={colors.textMuted} size={18} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vehicles via license or make..."
          value={searchQuery}
          onChangeText={(text) => { setSearchQuery(text); setCurrentPage(1); }}
          placeholderTextColor={colors.placeholderText}
        />
      </View>

      {apiError && (
        <View style={styles.errorBanner}>
          <AlertTriangle color={colors.dangerText} size={16} />
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      )}

      {/* Main FlatList Engine rendering full Async Photo feeds */}
      {vehiclesQuery.isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={vehiclesList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <View style={styles.card}>
                <View style={styles.cardBodyRow}>
                    <LazyVehiclePhoto vehicleId={item.id} model={item.model} style={styles.thumbnail} tintColor={colors.primary} />

                  <View style={styles.detailsContainer}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.make} {item.model}
                      </Text>
                      <View style={[styles.statusBadge, statusStyle.container]}>
                        <Text style={[styles.statusBadgeText, statusStyle.text]}>
                          {item.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardSubtitle}>
                      {item.year} • {item.licensePlate || "No Plate"}
                    </Text>
                    {/* CHANGED: Replaced Label with Assigned To */}
                    <Text style={styles.assignedText}>Assigned To: {item.assignedTo || "-"}</Text>
                  </View>
                </View>

                {/* Operations Menu Layout */}
                <View style={styles.cardFooter}>
                  <Text style={styles.mileageText}>{item.mileage ? `${item.mileage} mi` : "0 mi"}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => { setSelectedVehicle(item); setViewDetailsOpen(true); }}>
                      <Eye color={colors.activeBadgeText} size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => handleEditVehicle(item)}>
                      <Edit color={colors.primary} size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => handleRemoveConfirm(item)}>
                      <Trash2 color={colors.dangerText} size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Pagination View Bar */}
      <View style={styles.paginationRow}>
        <TouchableOpacity
          disabled={currentPage === 1}
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          style={[styles.pageButton, currentPage === 1 && styles.disabledButton]}
        >
          <ChevronLeft color={currentPage === 1 ? colors.border : colors.text} size={20} />
        </TouchableOpacity>
        <Text style={styles.pageText}>{`Page ${currentPage} of ${totalPages}`}</Text>
        <TouchableOpacity
          disabled={currentPage === totalPages}
          onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          style={[styles.pageButton, currentPage === totalPages && styles.disabledButton]}
        >
          <ChevronRight color={currentPage === totalPages ? colors.border : colors.text} size={20} />
        </TouchableOpacity>
      </View>

      {/* Full Vehicle Specifications / View Details Modal */}
      <Modal visible={viewDetailsOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vehicle Specifications</Text>
            <TouchableOpacity onPress={() => setViewDetailsOpen(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>
          {selectedVehicle && (
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <LazyVehiclePhoto vehicleId={selectedVehicle.id} model={selectedVehicle.model} style={{ width: 130, height: 130, borderRadius: 12 }} tintColor={colors.primary} />
                <Text style={[styles.title, { marginTop: 14 }]}>{selectedVehicle.make} {selectedVehicle.model}</Text>
                <Text style={styles.subtitle}>{selectedVehicle.year} • {selectedVehicle.licensePlate || "No Plate"}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, { textTransform: 'uppercase', fontWeight: '700' }]}>{selectedVehicle.status}</Text>
              </View>
              {/* CHANGED: Replaced Assigned Driver with Assigned To */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Assigned To</Text>
                <Text style={styles.detailValue}>{selectedVehicle.assignedTo}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>VIN Sequence</Text>
                <Text style={styles.detailValue}>{selectedVehicle.vin || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Mileage</Text>
                <Text style={styles.detailValue}>{selectedVehicle.mileage ? `${selectedVehicle.mileage} mi` : "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Inspection</Text>
                <Text style={styles.detailValue}>{selectedVehicle.lastInspection || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Next Inspection</Text>
                <Text style={styles.detailValue}>{selectedVehicle.nextInspection || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Insurance Details</Text>
                <Text style={styles.detailValue}>{selectedVehicle.insuranceInfo || "—"}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Inspection Status</Text>
                <Text style={styles.detailValue}>{selectedVehicle.requiresInspection ? "Cycles Active" : "Disabled"}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Reusable Data Management Modal Sheet */}
      <Modal visible={addVehicleOpen || editVehicleOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editVehicleOpen ? "Modify Vehicle" : "Add New Vehicle"}</Text>
            <TouchableOpacity onPress={() => { setAddVehicleOpen(false); setEditVehicleOpen(false); resetForm(); }}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            {formError && <Text style={styles.formErrorText}>{formError}</Text>}

            <Text style={styles.fieldLabel}>Make *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chevrolet"
              value={editVehicleOpen ? editFormData.make : formData.make}
              onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, make: txt }) : setFormData({ ...formData, make: txt })}
            />

            <Text style={styles.fieldLabel}>Model *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Silverado"
              value={editVehicleOpen ? editFormData.model : formData.model}
              onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, model: txt }) : setFormData({ ...formData, model: txt })}
            />

            <View style={styles.inputGrid}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.fieldLabel}>Year *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2025"
                  keyboardType="numeric"
                  value={editVehicleOpen ? editFormData.year : formData.year}
                  onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, year: txt }) : setFormData({ ...formData, year: txt })}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.fieldLabel}>License Plate *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="XYZ-7890"
                  value={editVehicleOpen ? editFormData.licensePlate : formData.licensePlate}
                  onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, licensePlate: txt }) : setFormData({ ...formData, licensePlate: txt })}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>VIN Sequence</Text>
            <TextInput
              style={styles.input}
              placeholder="1FTEW1EP5NFA..."
              value={editVehicleOpen ? editFormData.vin : formData.vin}
              onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, vin: txt }) : setFormData({ ...formData, vin: txt })}
            />

            <Text style={styles.fieldLabel}>Current Mileage (mi)</Text>
            <TextInput
              style={styles.input}
              placeholder="45000"
              keyboardType="numeric"
              value={editVehicleOpen ? editFormData.mileage : formData.mileage}
              onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, mileage: txt }) : setFormData({ ...formData, mileage: txt })}
            />

            <Text style={styles.fieldLabel}>Status *</Text>
            <PickerTrigger 
              label={editVehicleOpen ? editFormData.status.toUpperCase() : formData.status.toUpperCase()} 
              onPress={() => setIsStatusPickerOpen(true)} 
            />

            {/* CHANGED: Replaced Driver with Assigned To / Assignee dropdown parameters */}
            <Text style={styles.fieldLabel}>Assigned To</Text>
            <PickerTrigger 
              label={(editVehicleOpen ? editFormData.assignedTo : formData.assignedTo) || "Select Assignee"} 
              onPress={() => setIsAssigneePickerOpen(true)} 
            />

            <Text style={styles.fieldLabel}>Last Inspection Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-05-12"
              value={editVehicleOpen ? editFormData.lastInspection : formData.lastInspection}
              onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, lastInspection: txt }) : setFormData({ ...formData, lastInspection: txt })}
            />

            <Text style={styles.fieldLabel}>Next Inspection Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2026-11-12"
              value={editVehicleOpen ? editFormData.nextInspection : formData.nextInspection}
              onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, nextInspection: txt }) : setFormData({ ...formData, nextInspection: txt })}
            />

            <Text style={styles.fieldLabel}>Insurance Information</Text>
            <TextInput
              style={styles.input}
              placeholder="Policy, insurance provider details..."
              value={editVehicleOpen ? editFormData.insuranceInfo : formData.insuranceInfo}
              onChangeText={(txt) => editVehicleOpen ? setEditFormData({ ...editFormData, insuranceInfo: txt }) : setFormData({ ...formData, insuranceInfo: txt })}
            />

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Requires Active Inspection Cycles</Text>
              <Switch
                value={editVehicleOpen ? editFormData.requiresInspection : formData.requiresInspection}
                onValueChange={(val) => editVehicleOpen ? setEditFormData({ ...editFormData, requiresInspection: val }) : setFormData({ ...formData, requiresInspection: val })}
              />
            </View>

            {editVehicleOpen && selectedVehicle && (
              <View style={styles.imagePreviewWrapper}>
                <Text style={styles.fieldLabel}>Current Server Live Photo Preview</Text>
                <LazyVehiclePhoto vehicleId={selectedVehicle.id} model={selectedVehicle.model} style={styles.modalLivePreview} tintColor={colors.primary} />
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitBtn]}
                onPress={editVehicleOpen ? handleSaveEdit : handleAddVehicle}
                disabled={isAdding || isSaving}
              >
                {isAdding || isSaving ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={styles.submitBtnText}>{editVehicleOpen ? "Save Changes" : "Create Vehicle"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      <Modal visible={isStatusPickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerMenu}>
            {['active', 'maintenance', 'inactive'].map((s) => (
              <TouchableOpacity key={s} style={styles.pickerItem} onPress={() => { 
                if (editVehicleOpen) {
                  setEditFormData({ ...editFormData, status: s as any });
                } else {
                  setFormData({ ...formData, status: s as any });
                }
                setIsStatusPickerOpen(false); 
              }}>
                <Text style={{ textTransform: 'capitalize', fontSize: 16, color: colors.text }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
      <Modal visible={isAssigneePickerOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerMenu}>
            <ScrollView style={{ maxHeight: 300 }}>
              {/* Unassign Target Field option matching web layout pattern */}
              <TouchableOpacity style={styles.pickerItem} onPress={() => { 
                if (editVehicleOpen) {
                  setEditFormData({ ...editFormData, assignedTo: "-" });
                } else {
                  setFormData({ ...formData, assignedTo: "-" });
                }
                setIsAssigneePickerOpen(false); 
              }}>
                <Text style={{ fontSize: 16, color: colors.textMuted, fontWeight: '500' }}>Unassigned (-)</Text>
              </TouchableOpacity>

              {employees.map((emp) => (
                <TouchableOpacity key={emp.id} style={styles.pickerItem} onPress={() => { 
                  if (editVehicleOpen) {
                    setEditFormData({ ...editFormData, assignedTo: emp.name });
                  } else {
                    setFormData({ ...formData, assignedTo: emp.name });
                  }
                  setIsAssigneePickerOpen(false); 
                }}>
                  <Text style={{ fontSize: 16, color: colors.text }}>{emp.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

