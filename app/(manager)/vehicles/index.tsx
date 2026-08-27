import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Image,
  useWindowDimensions,
} from "react-native";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Car,
  Search,
  Plus,
  Wrench,
  AlertTriangle,
  Camera,
  Trash2,
  Edit,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Fuel,
  Check,
  CheckCircle,
  ChevronDown,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import { isDarkTheme } from "@/constants/design/presets";

const PAGE_SIZE = 25;

interface MaintenanceNeed {
  id: string;
  taskName: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
}

interface Vehicle {
  id: string;
  name: string;
  type: string;
  licensePlate: string;
  status: "available" | "in-use" | "maintenance";
  assignedTo?: string;
  lastInspection: string;
  nextInspection: string;
  fuelLevel: number;
  mileage: number;
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
  requiresInspection?: boolean;
  needs?: MaintenanceNeed[];
}

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  status: "active" | "inactive" | "pending";
}

interface SelectorOption {
  label: string;
  value: string;
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

function normalizeVehicle(v: any): Vehicle {
  return {
    id: v._id || v.id,
    name: v.name || `${v.make || ""} ${v.model || ""}`.trim() || "Unknown Vehicle",
    type: v.type || "Vehicle",
    licensePlate: v.licensePlate || "",
    status: v.status || "available",
    assignedTo: v.assignedTo,
    lastInspection: v.lastInspection || "",
    nextInspection: v.nextInspection || "",
    fuelLevel: typeof v.fuelLevel === "number" ? v.fuelLevel : 0,
    mileage: typeof v.mileage === "number" ? v.mileage : 0,
    tagPhotoFileName: v.tagPhotoFileName,
    tagPhotoDataUrl: v.tagPhotoDataUrl,
    requiresInspection: v.requiresInspection !== false,
    needs: v.needs || [],
  };
}

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background: isDark ? "#090d13" : "#f8fafc",
    surface: isDark ? "#0d1117" : "#ffffff",
    surfaceMuted: isDark ? "#161b22" : "#f1f5f9",
    border: isDark ? "#21262d" : "#e2e8f0",
    text: isDark ? "#c9d1d9" : "#0f172a",
    textBold: isDark ? "#f0f6fc" : "#020617",
    textMuted: isDark ? "#8b949e" : "#64748b",
    primary: "#0ea5e9",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  };
}

function createStyles(
  c: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean,
  screenWidth: number
) {
  const horizontalPadding = isSmallScreen ? wp(3) : isTablet ? wp(6) : wp(4.2);

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scrollContainer: { paddingHorizontal: horizontalPadding, paddingTop: hp(2), paddingBottom: hp(5) },
    headerBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(2) },
    titleText: { fontSize: isTablet ? 28 : 24, fontWeight: "800", color: c.textBold, letterSpacing: -0.5 },
    subtitleText: { fontSize: isTablet ? 14 : 13, color: c.textMuted, marginTop: hp(0.3) },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.textBold,
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1.2),
      borderRadius: wp(2),
      gap: wp(1),
    },
    addBtnText: { color: c.background, fontWeight: "600", fontSize: isTablet ? 14 : 13 },
    viewToggleContainer: {
      flexDirection: "row",
      backgroundColor: c.surfaceMuted,
      padding: wp(1),
      borderRadius: wp(2.5),
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: hp(2),
    },
    viewToggleBtn: { flex: 1, paddingVertical: hp(1), alignItems: "center", borderRadius: wp(2) },
    viewToggleBtnActive: {
      backgroundColor: c.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    viewToggleText: { fontSize: isTablet ? 14 : 13, fontWeight: "600", color: c.textMuted },
    viewToggleTextActive: { color: c.textBold },
    statsContainer: { flexDirection: isSmallScreen ? "column" : "row", gap: wp(3), marginBottom: hp(2) },
    statCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: wp(2.5),
      padding: wp(3.5),
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    statValue: { fontSize: isTablet ? 24 : 20, fontWeight: "700", color: c.textBold },
    statLabel: { fontSize: isTablet ? 12 : 11, color: c.textMuted, marginTop: hp(0.3) },
    filterCard: { flexDirection: isSmallScreen ? "column" : "row", gap: wp(3), marginBottom: hp(2) },
    searchWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      paddingHorizontal: wp(3),
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: c.border,
      height: hp(5.2),
    },
    searchIcon: { marginRight: wp(2) },
    searchInput: { flex: 1, fontSize: isTablet ? 14 : 13, color: c.text, padding: 0 },
    pickerFilterBtn: {
      width: isSmallScreen ? "100%" : isTablet ? 160 : 120,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: wp(2),
      paddingHorizontal: wp(3),
      height: hp(5.2),
    },
    pickerFilterText: { fontSize: isTablet ? 14 : 13, color: c.text },
    loaderBox: { paddingVertical: hp(8), alignItems: "center", justifyContent: "center" },
    gridContainer: { flexDirection: isTablet ? "row" : "column", flexWrap: "wrap", gap: wp(3) },
    fleetCard: {
      width: isTablet ? "48.5%" : "100%",
      backgroundColor: c.surface,
      borderRadius: wp(3),
      padding: wp(4),
      borderWidth: 1,
      borderColor: c.border,
    },
    cardMainHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: hp(1.5) },
    cardMetaRow: { flexDirection: "row", alignItems: "center", gap: wp(3) },
    avatarPhotoFrame: {
      width: isTablet ? 52 : 44,
      height: isTablet ? 52 : 44,
      borderRadius: wp(2.5),
      backgroundColor: c.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    photoImage: { width: isTablet ? 52 : 44, height: isTablet ? 52 : 44 },
    photoFallback: { width: isTablet ? 52 : 44, height: isTablet ? 52 : 44, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center" },
    cardTitleBlock: { flex: 1, marginLeft: wp(2) },
    vehicleNameText: { fontSize: isTablet ? 17 : 15, fontWeight: "700", color: c.textBold },
    badgeRow: { flexDirection: "row", gap: wp(1.5), marginBottom: hp(1.5) },
    badgeItem: { paddingHorizontal: wp(2), paddingVertical: hp(0.4), borderRadius: wp(1.5) },
    badgeItemText: { fontSize: isTablet ? 11 : 10, fontWeight: "700", textTransform: "capitalize" },
    assignmentText: { fontSize: isTablet ? 14 : 13, color: c.textMuted, marginBottom: hp(1.5) },
    assignmentBold: { color: c.text, fontWeight: "500" },
    gaugeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(1) },
    gaugeLabelRow: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
    gaugeValueBlock: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
    gaugeOuterTrack: { width: isTablet ? 80 : 60, height: 6, backgroundColor: c.surfaceMuted, borderRadius: 3, overflow: "hidden" },
    gaugeInnerFill: { height: "100%", borderRadius: 3 },
    gaugeTextValue: { fontSize: isTablet ? 14 : 13, fontWeight: "600", color: c.textBold },
    mileageLabelRow: { flexDirection: "row", justifyContent: "space-between", color: c.textMuted, marginBottom: hp(0.5) },
    mileageValue: { color: c.text, fontWeight: "500" },
    cardActionsDivider: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: wp(2),
      marginTop: hp(1.5),
      paddingTop: hp(1.5),
      borderTopWidth: 1,
      borderTopColor: c.border + "40",
    },
    actionIconButton: {
      width: isTablet ? 38 : 34,
      height: isTablet ? 38 : 34,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: c.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.background,
    },
    needsAccordionCard: {
      width: isTablet ? "48.5%" : "100%",
      backgroundColor: c.surface,
      borderRadius: wp(3),
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
    },
    accordionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(3.5) },
    accordionLeftBlock: { flexDirection: "row", alignItems: "center", gap: wp(2), flex: 1 },
    accordionTitleText: { fontSize: isTablet ? 15 : 14, fontWeight: "700", color: c.textBold },
    accordionLicenseText: { fontSize: isTablet ? 13 : 12, color: c.textMuted },
    accordionExpandedContent: { backgroundColor: c.background, paddingHorizontal: wp(3.5), paddingVertical: hp(1.5), borderTopWidth: 1, borderTopColor: c.border },
    needsListGridHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: hp(0.8), marginBottom: hp(1), paddingHorizontal: wp(1) },
    needsHeaderColumn: { fontSize: isTablet ? 12 : 11, fontWeight: "600", color: c.textMuted },
    needsRowItem: { flexDirection: "row", alignItems: "center", paddingVertical: hp(1), paddingHorizontal: wp(1), borderBottomWidth: 1, borderBottomColor: c.border + "20" },
    needsCheckboxControl: { height: 16, width: 16, borderRadius: 4, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", marginRight: wp(2) },
    needsCheckboxChecked: { backgroundColor: c.primary, borderColor: c.primary },
    needsTaskText: { fontSize: isTablet ? 14 : 13, color: c.text, flex: 1 },
    needsTaskLineThrough: { textDecorationLine: "line-through", color: c.textMuted },
    needsMetaAssigneeColumn: { fontSize: isTablet ? 13 : 12, color: c.text, width: 80, paddingHorizontal: wp(1) },
    needsMetaDateColumn: { fontSize: isTablet ? 12 : 11, color: c.textMuted, width: 85 },
    inlineQuickFormContainer: { backgroundColor: c.surface, padding: wp(3), borderRadius: wp(2.5), borderWidth: 1, borderColor: c.border, marginTop: hp(1.5), gap: hp(1.2) },
    inlineQuickFormTitle: { fontSize: isTablet ? 13 : 12, fontWeight: "700", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    inlineInputRow: { flexDirection: isSmallScreen ? "column" : "row", gap: wp(2), alignItems: "center" },
    inlineTextInputFull: { width: "100%", borderWidth: 1, borderColor: c.border, borderRadius: wp(1.5), paddingHorizontal: wp(2.5), height: hp(5), fontSize: isTablet ? 14 : 13, color: c.text, backgroundColor: c.background },
    inlineTextInputRowElement: { flex: 1, width: isSmallScreen ? "100%" : undefined, borderWidth: 1, borderColor: c.border, borderRadius: wp(1.5), paddingHorizontal: wp(2.5), height: hp(5), fontSize: isTablet ? 14 : 13, color: c.text, backgroundColor: c.background },
    inlinePickerTrigger: { flex: 1, width: isSmallScreen ? "100%" : undefined, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: c.border, borderRadius: wp(1.5), paddingHorizontal: wp(2), height: hp(5), backgroundColor: c.background },
    inlinePickerText: { fontSize: isTablet ? 13 : 12, color: c.text },
    inlineSubmitBtn: { width: isSmallScreen ? "100%" : undefined, backgroundColor: c.textBold, height: hp(5), paddingHorizontal: wp(4), borderRadius: wp(1.5), alignItems: "center", justifyContent: "center" },
    inlineSubmitBtnText: { color: c.background, fontSize: isTablet ? 13 : 12, fontWeight: "700" },
    paginationContainer: { width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(2), borderTopWidth: 1, borderTopColor: c.border, paddingTop: hp(2) },
    paginationBtn: { padding: wp(2), borderRadius: wp(1.5), borderWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    paginationBtnDisabled: { opacity: 0.4 },
    paginationStateText: { fontSize: isTablet ? 14 : 13, color: c.text, fontWeight: "500" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: wp(5) },
    dropdownContentCard: {
      width: "100%",
      maxWidth: isTablet ? 400 : 320,
      backgroundColor: c.surface,
      borderRadius: wp(4),
      borderWidth: 1,
      borderColor: c.border,
      overflow: "hidden",
      maxHeight: "75%",
    },
    dropdownHeader: { paddingHorizontal: wp(4), paddingVertical: hp(1.8), borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.surfaceMuted },
    dropdownHeaderText: { fontSize: isTablet ? 16 : 15, fontWeight: "700", color: c.textBold },
    dropdownScrollView: { paddingVertical: hp(0.8) },
    dropdownItemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: wp(4), paddingVertical: hp(1.5) },
    dropdownItemText: { fontSize: isTablet ? 15 : 14, color: c.text, flex: 1 },
    dropdownItemTextActive: { color: c.primary, fontWeight: "600" },
    modalContainer: { flex: 1, backgroundColor: c.background },
    modalHeaderBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(4), borderBottomWidth: 1, borderColor: c.border, backgroundColor: c.surface },
    modalTitleText: { fontSize: isTablet ? 20 : 18, fontWeight: "700", color: c.textBold },
    modalScrollBody: {
      padding: wp(4),
      gap: hp(1.8),
      maxWidth: isTablet ? 600 : undefined,
      alignSelf: isTablet ? "center" : undefined,
      width: "100%",
    },
    fieldLabelText: { fontSize: isTablet ? 14 : 13, fontWeight: "600", color: c.text, marginBottom: hp(0.5) },
    inputControlField: { borderWidth: 1, borderColor: c.border, borderRadius: wp(2), paddingHorizontal: wp(2.5), fontSize: isTablet ? 15 : 14, color: c.text, backgroundColor: c.surface, height: hp(5.5) },
    formGridRowBlock: { flexDirection: isSmallScreen ? "column" : "row", gap: wp(3) },
    formGridColBlock: { flex: 1 },
    footerActionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: wp(2.5), marginTop: hp(2), marginBottom: hp(3) },
    formCancelBtn: { borderWidth: 1, borderColor: c.border, paddingHorizontal: wp(4), paddingVertical: hp(1.5), borderRadius: wp(2), alignItems: "center", justifyContent: "center", backgroundColor: c.surface },
    formCancelBtnText: { color: c.text, fontWeight: "600", fontSize: isTablet ? 15 : 14 },
    formSubmitBtn: { backgroundColor: c.primary, paddingHorizontal: wp(4), paddingVertical: hp(1.5), borderRadius: wp(2), alignItems: "center", justifyContent: "center", minWidth: 100 },
    formSubmitBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: isTablet ? 15 : 14 },
    inspectDetailBlock: { gap: hp(2) },
    inspectSection: { gap: hp(0.5) },
    inspectLabel: { fontSize: isTablet ? 13 : 12, fontWeight: "600", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    inspectValue: { fontSize: isTablet ? 15 : 14, color: c.textBold, lineHeight: 20 },
    photoUploadDashedBox: { width: "100%", borderRadius: wp(3), borderStyle: "dashed", borderWidth: 1, padding: wp(4), alignItems: "center", justifyContent: "center", gap: hp(0.8) },
    photoUploadTitle: { fontSize: isTablet ? 14 : 13, fontWeight: "600" },
    photoUploadSubtitle: { fontSize: isTablet ? 12 : 11 },
    photoThumbnailPreview: { height: isTablet ? 150 : 120, width: isTablet ? 150 : 120, borderRadius: wp(3), borderWidth: 1, marginTop: hp(0.5) },
  });
}

const LazyVehiclePhoto = ({ vehicleId, style }: { vehicleId: string; style?: any }) => {
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

    return () => {
      mounted = false;
    };
  }, [vehicleId]);

  if (loading) {
    return (
      <View style={[style, { justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }]}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  if (hasError || !base64Photo) {
    return (
      <View style={[style, { justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }]}>
        <Car color="#3b82f6" size={24} opacity={0.6} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: base64Photo }}
      style={style}
      resizeMode="cover"
    />
  );
};

export default function Vehicles() {
  const { uiTheme } = useTheme();
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen, width),
    [colors, wp, hp, isTablet, isSmallScreen, width]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeView, setActiveView] = useState<"fleet" | "needs">("fleet");
  const [expandedNeedsView, setExpandedNeedsView] = useState<Record<string, boolean>>({});

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [formFields, setFormFields] = useState({
    name: "",
    type: "",
    licensePlate: "",
    status: "available" as Vehicle["status"],
    assignedTo: "",
    lastInspection: "",
    nextInspection: "",
    fuelLevel: 75,
    mileage: 0,
    tagPhotoFileName: "",
    tagPhotoDataUrl: "",
    requiresInspection: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [customPickerVisible, setCustomPickerVisible] = useState<boolean>(false);
  const [customPickerTitle, setCustomPickerTitle] = useState<string>("");
  const [customPickerOptions, setCustomPickerOptions] = useState<SelectorOption[]>([]);
  const [customPickerValue, setCustomPickerValue] = useState<string>("");
  const [customPickerCallback, setCustomPickerCallback] = useState<(val: string) => void>(() => {});

  const [inlineTasksState, setInlineTasksState] = useState<Record<string, { taskName: string; assignee: string; dueDate: string }>>({});

  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;
    const loadEmployees = async () => {
      try {
        let allEmployees: Employee[] = [];
        try {
          const res = await apiFetch<{ items: any[] }>("/api/employees");
          if (res?.items && mounted) {
            allEmployees = res.items.filter((e) => e.status === "active").map(e => ({
              id: e._id || e.id,
              name: e.name || "",
              initials: getInitials(e.name || ""),
              email: e.email || "",
              status: e.status,
            }));
          }
        } catch (err) {
          console.error(err);
        }

        try {
          const userRes = await apiFetch<{ items: UserRecord[] }>("/api/users");
          if (userRes?.items && mounted) {
            const employeeUsers = userRes.items
              .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
              .map((u) => ({
                id: u.id,
                name: u.name,
                initials: getInitials(u.name),
                email: u.email,
                status: "active" as const,
              }));

            employeeUsers.forEach((eu) => {
              if (!allEmployees.some((e) => e.email === eu.email)) {
                allEmployees.push(eu);
              }
            });
          }
        } catch (userErr) {
          console.error(userErr);
        }

        if (mounted) {
          setEmployees(allEmployees);
        }
      } catch (e) {
        console.error(e);
      }
    };

    void loadEmployees();
    return () => { mounted = false; };
  }, []);

  const vehiclesQuery = useQuery({
    queryKey: ["vehicles", currentPage, searchQuery, statusFilter],
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: PAGE_SIZE.toString(),
        search: searchQuery,
        status: statusFilter === "all" ? "" : statusFilter,
      });
      const res = await apiFetch<{ items: any[]; pagination?: { totalPages: number } }>(`/api/vehicles?${params.toString()}`);
      if (res?.pagination) {
        setTotalPages(res.pagination.totalPages);
      } else {
        setTotalPages(1);
      }
      return (res?.items || []).map(normalizeVehicle);
    },
  });

  const vehicles = useMemo(() => vehiclesQuery.data || [], [vehiclesQuery.data]);

  const stats = useMemo(() => {
    return {
      available: vehicles.filter((v) => v.status === "available").length,
      inUse: vehicles.filter((v) => v.status === "in-use").length,
      maintenance: vehicles.filter((v) => v.status === "maintenance").length,
    };
  }, [vehicles]);

  const presentCustomPicker = (title: string, options: SelectorOption[], currentValue: string, onSelect: (val: string) => void) => {
    setCustomPickerTitle(title);
    setCustomPickerOptions(options);
    setCustomPickerValue(currentValue);
    setCustomPickerCallback(() => onSelect);
    setCustomPickerVisible(true);
  };

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Denied", "App requires gallery storage permission mapping streams.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setFormFields((prev) => ({
        ...prev,
        tagPhotoDataUrl: `data:image/jpeg;base64,${asset.base64}`,
        tagPhotoFileName: asset.fileName || `vehicle-${Date.now()}.jpg`,
      }));
    }
  };

  const handleUpdateVehicleNeeds = async (vehicleId: string, updatedNeeds: MaintenanceNeed[]) => {
    try {
      const res = await apiFetch<{ item: any }>(`/api/vehicles/${vehicleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needs: updatedNeeds }),
      });
      const updatedVehicle = normalizeVehicle(res.item);
      if (selectedVehicle && selectedVehicle.id === vehicleId) {
        setSelectedVehicle(updatedVehicle);
      }
      await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    } catch (e) {
      Alert.alert("Error", "Failed to update maintenance task");
    }
  };

  const handleAddNeedForVehicle = async (vehicle: Vehicle, taskName: string, assignee: string, dueDate: string) => {
    if (!taskName.trim()) return;
    const newNeed: MaintenanceNeed = {
      id: `NEED-${Date.now()}`,
      taskName: taskName.trim(),
      assignee,
      dueDate,
      completed: false,
    };
    const updatedNeeds = [...(vehicle.needs || []), newNeed];
    await handleUpdateVehicleNeeds(vehicle.id, updatedNeeds);
  };

  const handleToggleNeedForVehicle = async (vehicle: Vehicle, needId: string) => {
    const updatedNeeds = (vehicle.needs || []).map((n) =>
      n.id === needId ? { ...n, completed: !n.completed } : n
    );
    await handleUpdateVehicleNeeds(vehicle.id, updatedNeeds);
  };

  const handleDeleteNeedForVehicle = async (vehicle: Vehicle, needId: string) => {
    const updatedNeeds = (vehicle.needs || []).filter((n) => n.id !== needId);
    await handleUpdateVehicleNeeds(vehicle.id, updatedNeeds);
  };

  const handleCreateOrUpdateVehicle = async () => {
    if (!formFields.name.trim() || !formFields.type.trim() || !formFields.licensePlate.trim()) {
      Alert.alert("Validation Error", "Name, Type, and License Plate are mandatory fields");
      return;
    }

    setIsSaving(true);
    try {
      let response;
      if (isEditOpen && selectedVehicle) {
        response = await apiFetch<{ item: any }>(`/api/vehicles/${selectedVehicle.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formFields),
        });
      } else {
        response = await apiFetch<{ item: any }>("/api/vehicles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formFields),
        });
      }

      if (response) {
        Alert.alert("Success", `Vehicle record ${isEditOpen ? "updated" : "added"} successfully`);
        setIsCreateOpen(false);
        setIsEditOpen(false);
        setSelectedVehicle(null);
        await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to save vehicle data");
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setFormFields({
      name: vehicle.name,
      type: vehicle.type,
      licensePlate: vehicle.licensePlate,
      status: vehicle.status,
      assignedTo: vehicle.assignedTo || "",
      lastInspection: vehicle.lastInspection ? vehicle.lastInspection.split("T")[0] : "",
      nextInspection: vehicle.nextInspection ? vehicle.nextInspection.split("T")[0] : "",
      fuelLevel: vehicle.fuelLevel,
      mileage: vehicle.mileage,
      tagPhotoFileName: vehicle.tagPhotoFileName || "",
      tagPhotoDataUrl: vehicle.tagPhotoDataUrl || "",
      requiresInspection: vehicle.requiresInspection !== false,
    });
    setIsEditOpen(true);
  };

  const handleDeleteVehicle = (id: string) => {
    Alert.alert("Delete vehicle?", "This action cannot be undone. This will permanently remove the vehicle record.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/api/vehicles/${id}`, { method: "DELETE" });
            Alert.alert("Vehicle deleted", "Vehicle has been removed.");
            await queryClient.invalidateQueries({ queryKey: ["vehicles"] });
          } catch (e) {
            Alert.alert("Error", "Failed to delete vehicle record");
          }
        },
      },
    ]);
  };

  const openViewDetails = async (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsViewOpen(true);
    try {
      const res = await apiFetch<{ item: any }>(`/api/vehicles/${encodeURIComponent(vehicle.id)}`);
      if (res?.item) {
        setSelectedVehicle(normalizeVehicle(res.item));
      }
    } catch (e) {}
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return { bg: colors.success + "20", text: colors.success };
      case "in-use": return { bg: colors.info + "20", text: colors.info };
      case "maintenance": return { bg: colors.warning + "20", text: colors.warning };
      default: return { bg: colors.surfaceMuted, text: colors.textMuted };
    }
  };

  const formIsValid = useMemo(() => {
    return !!formFields.name.trim() && !!formFields.type.trim() && !!formFields.licensePlate.trim();
  }, [formFields]);

  return (
    <SafeAreaView style={s(styles.root)}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerBlock}>
          <View style={{ flex: 1, paddingRight: wp(2) }}>
            <Text style={styles.titleText}>Vehicles Management</Text>
            <Text style={styles.subtitleText}>Track and manage company vehicles</Text>
          </View>
          <TouchableOpacity 
            style={styles.addBtn} 
            onPress={() => {
              setSelectedVehicle(null);
              setFormFields({
                name: "",
                type: "",
                licensePlate: "",
                status: "available",
                assignedTo: "",
                lastInspection: "",
                nextInspection: "",
                fuelLevel: 100,
                mileage: 0,
                tagPhotoFileName: "",
                tagPhotoDataUrl: "",
                requiresInspection: true,
              });
              setIsCreateOpen(true);
            }}
          >
            <Plus size={15} color={colors.background} />
            <Text style={styles.addBtnText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[styles.viewToggleBtn, activeView === "fleet" && styles.viewToggleBtnActive]}
            onPress={() => setActiveView("fleet")}
          >
            <Text style={[styles.viewToggleText, activeView === "fleet" && styles.viewToggleTextActive]}>Fleet List</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleBtn, activeView === "needs" && styles.viewToggleBtnActive]}
            onPress={() => setActiveView("needs")}
          >
            <Text style={[styles.viewToggleText, activeView === "needs" && styles.viewToggleTextActive]}>Vehicle Needs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={[styles.statValue, { color: colors.success }]}>{stats.available}</Text>
            </View>
            <CheckCircle size={24} color={colors.success} opacity={0.3} />
          </View>
          <View style={styles.statCard}>
            <View>
              <Text style={styles.statLabel}>In Use</Text>
              <Text style={[styles.statValue, { color: colors.info }]}>{stats.inUse}</Text>
            </View>
            <Car size={24} color={colors.info} opacity={0.3} />
          </View>
          <View style={styles.statCard}>
            <View>
              <Text style={styles.statLabel}>Maintenance</Text>
              <Text style={[styles.statValue, { color: colors.warning }]}>{stats.maintenance}</Text>
            </View>
            <AlertTriangle size={24} color={colors.warning} opacity={0.3} />
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.searchWrapper}>
            <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search by name or license plate..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={(txt) => { setSearchQuery(txt); setCurrentPage(1); }}
            />
          </View>
          <TouchableOpacity 
            style={styles.pickerFilterBtn}
            onPress={() => {
              const options = [
                { label: "All Status", value: "all" },
                { label: "Available", value: "available" },
                { label: "In Use", value: "in-use" },
                { label: "Maintenance", value: "maintenance" }
              ];
              presentCustomPicker("Status Filter", options, statusFilter, (val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              });
            }}
          >
            <Text style={styles.pickerFilterText} numberOfLines={1}>
              {statusFilter === "all" ? "All Status" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {vehiclesQuery.isLoading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {activeView === "fleet" ? (
              vehicles.map((vehicle) => {
                const statusTheme = getStatusColor(vehicle.status);
                return (
                  <View key={vehicle.id} style={styles.fleetCard}>
                    <View style={styles.cardMainHeader}>
                      <View style={styles.cardMetaRow}>
                        <View style={styles.avatarPhotoFrame}>
                          <LazyVehiclePhoto vehicleId={vehicle.id} style={styles.photoImage} />
                        </View>
                        <View style={styles.cardTitleBlock}>
                          <Text style={styles.vehicleNameText} numberOfLines={1}>{vehicle.name}</Text>
                          <Text style={styles.accordionLicenseText}>{vehicle.licensePlate}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.badgeRow}>
                      <View style={[styles.badgeItem, { backgroundColor: statusTheme.bg }]}>
                        <Text style={[styles.badgeItemText, { color: statusTheme.text }]}>{vehicle.status.replace("-", " ")}</Text>
                      </View>
                      <View style={[styles.badgeItem, { backgroundColor: colors.surfaceMuted }]}>
                        <Text style={[styles.badgeItemText, { color: colors.text }]}>{vehicle.type}</Text>
                      </View>
                    </View>

                    {!!vehicle.assignedTo && (
                      <Text style={styles.assignmentText}>
                        Assigned to: <Text style={styles.assignmentBold}>{vehicle.assignedTo}</Text>
                      </Text>
                    )}

                    <View style={styles.gaugeRow}>
                      <View style={styles.gaugeLabelRow}>
                        <Fuel size={14} color={colors.textMuted} />
                        <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.textMuted, marginLeft: 4 }}>Fuel Level</Text>
                      </View>
                      <View style={styles.gaugeValueBlock}>
                        <View style={styles.gaugeOuterTrack}>
                          <View style={[styles.gaugeInnerFill, {
                            width: `${vehicle.fuelLevel}%`,
                            backgroundColor: vehicle.fuelLevel > 50 ? colors.success : vehicle.fuelLevel > 25 ? colors.warning : colors.danger
                          }]} />
                        </View>
                        <Text style={styles.gaugeTextValue}>{vehicle.fuelLevel}%</Text>
                      </View>
                    </View>

                    <View style={styles.mileageLabelRow}>
                      <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.textMuted }}>Mileage</Text>
                      <Text style={styles.mileageValue}>{vehicle.mileage.toLocaleString()} mi</Text>
                    </View>

                    {vehicle.requiresInspection && !!vehicle.nextInspection && (
                      <View style={[styles.mileageLabelRow, { marginTop: hp(0.5) }]}>
                        <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.textMuted }}>Next Inspection</Text>
                        <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.text }}>{new Date(vehicle.nextInspection).toLocaleDateString()}</Text>
                      </View>
                    )}

                    <VehicleEmbeddedNeedsSection 
                      vehicle={vehicle}
                      employees={employees}
                      onAddNeed={handleAddNeedForVehicle}
                      onToggleNeed={handleToggleNeedForVehicle}
                      onDeleteNeed={handleDeleteNeedForVehicle}
                      colors={colors}
                    />

                    <View style={styles.cardActionsDivider}>
                      <TouchableOpacity style={styles.actionIconButton} onPress={() => openViewDetails(vehicle)}>
                        <Eye size={15} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionIconButton} onPress={() => openEditModal(vehicle)}>
                        <Edit size={14} color={colors.text} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionIconButton} onPress={() => handleDeleteVehicle(vehicle.id)}>
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              vehicles.map((vehicle) => {
                const isExpanded = !!expandedNeedsView[vehicle.id];
                const pendingCount = (vehicle.needs || []).filter(n => !n.completed).length;
                const inlineState = inlineTasksState[vehicle.id] || { taskName: "", assignee: "", dueDate: "" };

                return (
                  <View key={vehicle.id} style={styles.needsAccordionCard}>
                    <TouchableOpacity 
                      style={styles.accordionHeaderRow}
                      onPress={() => setExpandedNeedsView({ ...expandedNeedsView, [vehicle.id]: !isExpanded })}
                    >
                      <View style={styles.accordionLeftBlock}>
                        <ChevronDown size={16} color={colors.textMuted} style={{ transform: [{ rotate: isExpanded ? "0deg" : "-90deg" }] }} />
                        <Text style={styles.accordionTitleText} numberOfLines={1}>{vehicle.name}</Text>
                        <Text style={styles.accordionLicenseText}>({vehicle.licensePlate})</Text>
                      </View>
                      <View style={[styles.badgeItem, { backgroundColor: colors.surfaceMuted }]}>
                        <Text style={[styles.badgeItemText, { color: colors.textBold }]}>{pendingCount} Pending</Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.accordionExpandedContent}>
                        <View style={styles.needsListGridHeader}>
                          <Text style={[styles.needsHeaderColumn, { flex: 1 }]}>Task name</Text>
                          <Text style={[styles.needsHeaderColumn, { width: 80, paddingHorizontal: wp(1) }]}>Assignee</Text>
                          <Text style={[styles.needsHeaderColumn, { width: 85 }]}>Due date</Text>
                        </View>

                        {(vehicle.needs || []).length > 0 ? (
                          (vehicle.needs || []).map((need) => (
                            <View key={need.id} style={styles.needsRowItem}>
                              <TouchableOpacity 
                                style={[styles.needsCheckboxControl, need.completed && styles.needsCheckboxChecked]}
                                onPress={() => handleToggleNeedForVehicle(vehicle, need.id)}
                              >
                                {need.completed && <Check size={10} color="#FFF" />}
                              </TouchableOpacity>
                              <Text style={[styles.needsTaskText, need.completed && styles.needsTaskLineThrough]} numberOfLines={1}>
                                {need.taskName}
                              </Text>
                              <Text style={styles.needsMetaAssigneeColumn} numberOfLines={1}>{need.assignee || "—"}</Text>
                              <View style={{ flexDirection: "row", alignItems: "center", width: 85, justifyContent: "space-between" }}>
                                <Text style={styles.needsMetaDateColumn} numberOfLines={1}>{need.dueDate || "—"}</Text>
                                <TouchableOpacity onPress={() => handleDeleteNeedForVehicle(vehicle, need.id)} style={{ padding: 2 }}>
                                  <Trash2 size={13} color={colors.danger} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))
                        ) : (
                          <Text style={{ fontSize: isTablet ? 13 : 12, color: colors.textMuted, textAlign: "center", paddingVertical: hp(1) }}>No needs listed for this vehicle.</Text>
                        )}

                        <View style={styles.inlineQuickFormContainer}>
                          <Text style={styles.inlineQuickFormTitle}>Add task need</Text>
                          <TextInput 
                            style={styles.inlineTextInputFull}
                            placeholder="e.g. Tire alignment, Coolant check..."
                            placeholderTextColor={colors.textMuted}
                            value={inlineState.taskName}
                            onChangeText={(txt) => setInlineTasksState({ ...inlineTasksState, [vehicle.id]: { ...inlineState, taskName: txt } })}
                          />
                          <View style={styles.inlineInputRow}>
                            <TouchableOpacity 
                              style={styles.inlinePickerTrigger}
                              onPress={() => {
                                const options = employees.map(e => ({ label: e.name, value: e.name }));
                                presentCustomPicker("Assign Person", options, inlineState.assignee, (val) => {
                                  setInlineTasksState({ ...inlineTasksState, [vehicle.id]: { ...inlineState, assignee: val } });
                                });
                              }}
                            >
                              <Text style={styles.inlinePickerText} numberOfLines={1}>
                                {inlineState.assignee || "Assign Person..."}
                              </Text>
                              <ChevronDown size={12} color={colors.textMuted} />
                            </TouchableOpacity>

                            <TextInput 
                              style={styles.inlineTextInputRowElement}
                              placeholder="YYYY-MM-DD"
                              placeholderTextColor={colors.textMuted}
                              value={inlineState.dueDate}
                              onChangeText={(txt) => setInlineTasksState({ ...inlineTasksState, [vehicle.id]: { ...inlineState, dueDate: txt } })}
                            />

                            <TouchableOpacity 
                              style={styles.inlineSubmitBtn}
                              onPress={() => {
                                if (!inlineState.taskName.trim()) return;
                                void handleAddNeedForVehicle(vehicle, inlineState.taskName, inlineState.assignee, inlineState.dueDate);
                                setInlineTasksState({ ...inlineTasksState, [vehicle.id]: { taskName: "", assignee: "", dueDate: "" } });
                              }}
                            >
                              <Text style={styles.inlineSubmitBtnText}>Add</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {vehicles.length === 0 && (
              <View style={{ width: "100%", backgroundColor: colors.surface, padding: wp(8), borderRadius: wp(3), alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
                <Car size={40} color={colors.textMuted} />
                <Text style={{ fontSize: isTablet ? 18 : 16, fontWeight: "700", color: colors.textBold, marginTop: hp(1.5), marginBottom: hp(0.5) }}>No vehicles found</Text>
                <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.textMuted, textAlign: "center" }}>Get started by appending records down the production stream layer</Text>
              </View>
            )}

            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationBtn, currentPage === 1 && styles.paginationBtnDisabled]}
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.paginationStateText}>{`Page ${currentPage} of ${totalPages}`}</Text>
              <TouchableOpacity
                style={[styles.paginationBtn, currentPage === totalPages && styles.paginationBtnDisabled]}
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={16} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={isCreateOpen || isEditOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeaderBlock}>
            <Text style={styles.modalTitleText}>
              {isEditOpen ? "Update Vehicle Record" : "Add Vehicle"}
            </Text>
            <TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
              <X size={20} color={colors.textBold} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
            <View>
              <Text style={styles.fieldLabelText}>Name *</Text>
              <TextInput 
                style={styles.inputControlField}
                placeholder="e.g. Ford Transit Van #6"
                placeholderTextColor={colors.textMuted}
                value={formFields.name}
                onChangeText={(txt) => setFormFields({ ...formFields, name: txt })}
              />
            </View>

            <View style={styles.formGridRowBlock}>
              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>Type *</Text>
                <TextInput 
                  style={styles.inputControlField}
                  placeholder="e.g. Van"
                  placeholderTextColor={colors.textMuted}
                  value={formFields.type}
                  onChangeText={(txt) => setFormFields({ ...formFields, type: txt })}
                />
              </View>
              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>License Plate *</Text>
                <TextInput 
                  style={styles.inputControlField}
                  placeholder="e.g. ABC-1234"
                  placeholderTextColor={colors.textMuted}
                  value={formFields.licensePlate}
                  onChangeText={(txt) => setFormFields({ ...formFields, licensePlate: txt })}
                />
              </View>
            </View>

            <View style={styles.formGridRowBlock}>
              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>Status *</Text>
                <TouchableOpacity 
                  style={[styles.inputControlField, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
                  onPress={() => {
                    const options = [
                      { label: "Available", value: "available" },
                      { label: "In Use", value: "in-use" },
                      { label: "Maintenance", value: "maintenance" }
                    ];
                    presentCustomPicker("Select Status", options, formFields.status, (val) => {
                      setFormFields({ ...formFields, status: val as Vehicle["status"] });
                    });
                  }}
                >
                  <Text style={{ color: colors.text, textTransform: "capitalize", fontSize: isTablet ? 15 : 14 }}>{formFields.status}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>Assigned To</Text>
                <TouchableOpacity 
                  style={[styles.inputControlField, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
                  onPress={() => {
                    const options = [
                      { label: "None", value: "" },
                      ...employees.map(e => ({ label: e.name, value: e.name }))
                    ];
                    presentCustomPicker("Select Employee", options, formFields.assignedTo, (val) => {
                      setFormFields({ ...formFields, assignedTo: val });
                    });
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: isTablet ? 15 : 14 }}>{formFields.assignedTo || "Select employee"}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGridRowBlock}>
              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>Fuel Level (%)</Text>
                <TextInput 
                  style={styles.inputControlField}
                  keyboardType="numeric"
                  value={String(formFields.fuelLevel)}
                  onChangeText={(txt) => setFormFields({ ...formFields, fuelLevel: Number(txt) || 0 })}
                />
              </View>
              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>Mileage</Text>
                <TextInput 
                  style={styles.inputControlField}
                  keyboardType="numeric"
                  value={String(formFields.mileage)}
                  onChangeText={(txt) => setFormFields({ ...formFields, mileage: Number(txt) || 0 })}
                />
              </View>
            </View>

            <View style={styles.formGridRowBlock}>
              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>Last Inspection</Text>
                <TextInput 
                  style={styles.inputControlField}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={formFields.lastInspection}
                  onChangeText={(txt) => setFormFields({ ...formFields, lastInspection: txt })}
                />
              </View>
              <View style={styles.formGridColBlock}>
                <Text style={styles.fieldLabelText}>Next Inspection</Text>
                <TextInput 
                  style={styles.inputControlField}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textMuted}
                  value={formFields.nextInspection}
                  onChangeText={(txt) => setFormFields({ ...formFields, nextInspection: txt })}
                />
              </View>
            </View>

            <View style={{ marginVertical: hp(1.5), alignItems: "center" }}>
              <Text style={[styles.fieldLabelText, { alignSelf: "flex-start" }]}>Vehicle Photo</Text>
              <TouchableOpacity 
                style={[
                  styles.photoUploadDashedBox, 
                  { borderColor: colors.border, backgroundColor: colors.surfaceMuted }
                ]} 
                onPress={handlePickImage}
              >
                {formFields.tagPhotoDataUrl ? (
                  <Image source={{ uri: formFields.tagPhotoDataUrl }} style={styles.photoThumbnailPreview} resizeMode="cover" />
                ) : isEditOpen && selectedVehicle ? (
                  <LazyVehiclePhoto vehicleId={selectedVehicle.id} style={styles.photoThumbnailPreview} />
                ) : (
                  <>
                    <Camera size={24} color={colors.textMuted} />
                    <Text style={[styles.photoUploadTitle, { color: colors.textBold }]}>Select Vehicle Photo</Text>
                    <Text style={[styles.photoUploadSubtitle, { color: colors.textMuted }]}>Tap here to open device camera roll</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {!!formFields.tagPhotoDataUrl && (
                <TouchableOpacity 
                  style={{ marginTop: hp(1), flexDirection: "row", alignItems: "center", gap: wp(1) }} 
                  onPress={() => setFormFields(prev => ({ ...prev, tagPhotoDataUrl: "", tagPhotoFileName: "" }))}
                >
                  <Trash2 size={14} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontSize: isTablet ? 13 : 12, fontWeight: "600" }}>Clear Selection</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footerActionsRow}>
              <TouchableOpacity style={styles.formCancelBtn} onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
                <Text style={styles.formCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.formSubmitBtn, !formIsValid && { opacity: 0.5 }]}
                disabled={isSaving || !formIsValid}
                onPress={handleCreateOrUpdateVehicle}
              >
                <Text style={styles.formSubmitBtnText}>
                  {isSaving ? "Processing..." : isEditOpen ? "Save" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isViewOpen} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeaderBlock}>
            <Text style={styles.modalTitleText}>Vehicle Details</Text>
            <TouchableOpacity onPress={() => setIsViewOpen(false)}>
              <X size={20} color={colors.textBold} />
            </TouchableOpacity>
          </View>

          {selectedVehicle && (
            <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inspectDetailBlock}>
                <View style={{ alignItems: "center", marginVertical: hp(1) }}>
                  <View style={[styles.avatarPhotoFrame, { width: isTablet ? 140 : 120, height: isTablet ? 140 : 120, borderRadius: wp(4) }]}>
                    <LazyVehiclePhoto vehicleId={selectedVehicle.id} style={{ width: isTablet ? 140 : 120, height: isTablet ? 140 : 120 }} />
                  </View>
                  <Text style={[styles.vehicleNameText, { fontSize: isTablet ? 20 : 18, marginTop: hp(1.5) }]}>{selectedVehicle.name}</Text>
                  <Text style={{ fontSize: isTablet ? 14 : 13, color: colors.textMuted, marginTop: hp(0.3) }}>{selectedVehicle.licensePlate}</Text>
                </View>

                <View style={styles.formGridRowBlock}>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Status</Text>
                    <Text style={[styles.inspectValue, { textTransform: "uppercase", fontWeight: "700", color: getStatusColor(selectedVehicle.status).text }]}>
                      {selectedVehicle.status.replace("-", " ")}
                    </Text>
                  </View>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Type</Text>
                    <Text style={styles.inspectValue}>{selectedVehicle.type}</Text>
                  </View>
                </View>

                <View style={styles.formGridRowBlock}>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Assigned To</Text>
                    <Text style={styles.inspectValue}>{selectedVehicle.assignedTo || "—"}</Text>
                  </View>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Fuel Level</Text>
                    <Text style={styles.inspectValue}>{selectedVehicle.fuelLevel}%</Text>
                  </View>
                </View>

                <View style={styles.formGridRowBlock}>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Mileage</Text>
                    <Text style={styles.inspectValue}>{selectedVehicle.mileage.toLocaleString()} mi</Text>
                  </View>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Requires Inspection</Text>
                    <Text style={styles.inspectValue}>{selectedVehicle.requiresInspection ? "Enabled" : "Disabled"}</Text>
                  </View>
                </View>

                <View style={styles.formGridRowBlock}>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Last Inspection</Text>
                    <Text style={styles.inspectValue}>
                      {selectedVehicle.lastInspection ? new Date(selectedVehicle.lastInspection).toLocaleDateString() : "—"}
                    </Text>
                  </View>
                  <View style={styles.formGridColBlock}>
                    <Text style={styles.inspectLabel}>Next Inspection</Text>
                    <Text style={styles.inspectValue}>
                      {selectedVehicle.nextInspection ? new Date(selectedVehicle.nextInspection).toLocaleDateString() : "—"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.footerActionsRow}>
                <TouchableOpacity style={styles.formCancelBtn} onPress={() => setIsViewOpen(false)}>
                  <Text style={styles.formCancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.formCancelBtn, { backgroundColor: colors.textBold, borderColor: colors.textBold }]} 
                  onPress={() => {
                    setIsViewOpen(false);
                    openEditModal(selectedVehicle);
                  }}
                >
                  <Text style={[styles.formCancelBtnText, { color: colors.background }]}>Edit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={customPickerVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownContentCard}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>{customPickerTitle}</Text>
              <TouchableOpacity onPress={() => setCustomPickerVisible(false)} style={{ padding: 4 }}>
                <X size={18} color={colors.textBold} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
              {customPickerOptions.map((opt) => {
                const isActive = customPickerValue === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.dropdownItemRow}
                    onPress={() => {
                      customPickerCallback(opt.value);
                      setCustomPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                      {opt.label}
                    </Text>
                    {isActive && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const VehicleEmbeddedNeedsSection = ({
  vehicle,
  employees,
  onAddNeed,
  onToggleNeed,
  onDeleteNeed,
  colors
}: {
  vehicle: Vehicle;
  employees: Employee[];
  onAddNeed: (vehicle: Vehicle, taskName: string, assignee: string, dueDate: string) => Promise<void>;
  onToggleNeed: (vehicle: Vehicle, needId: string) => Promise<void>;
  onDeleteNeed: (vehicle: Vehicle, needId: string) => Promise<void>;
  colors: any;
}) => {
  const { width, height } = useWindowDimensions();
  const wp = useCallback((percentage: number) => (width * percentage) / 100, [width]);
  const hp = useCallback((percentage: number) => (height * percentage) / 100, [height]);
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;

  const [expanded, setExpanded] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(
    () => createStyles(colors, wp, hp, isTablet, isSmallScreen, width),
    [colors, wp, hp, isTablet, isSmallScreen, width]
  );
  const pendingCount = (vehicle.needs || []).filter((n) => !n.completed).length;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border + "40", marginTop: hp(1.5), paddingTop: hp(1) }}>
      <TouchableOpacity 
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
          <Wrench size={14} color={colors.primary} />
          <Text style={{ fontSize: isTablet ? 13 : 12, fontWeight: "600", color: colors.textMuted }}>Needs & Tasks</Text>
          {(vehicle.needs || []).length > 0 && (
            <View style={{ backgroundColor: colors.surfaceMuted, paddingHorizontal: wp(1.5), paddingVertical: hp(0.2), borderRadius: wp(1) }}>
              <Text style={{ fontSize: isTablet ? 11 : 10, color: colors.text, fontWeight: "700" }}>{pendingCount} pending</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: isTablet ? 12 : 11, color: colors.textMuted }}>{expanded ? "Hide" : "Show"}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: hp(1), gap: hp(0.8) }}>
          <View style={{ gap: hp(0.5) }}>
            {(vehicle.needs || []).map((need) => (
              <View key={need.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: wp(2), backgroundColor: colors.surfaceMuted, borderRadius: wp(1.5), borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
                  <TouchableOpacity 
                    style={[{ height: 14, width: 14, borderRadius: 3, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }, need.completed && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => onToggleNeed(vehicle, need.id)}
                  >
                    {need.completed && <Check size={8} color="#FFF" />}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ fontSize: isTablet ? 13 : 12, color: colors.text }, need.completed && { textDecorationLine: "line-through", color: colors.textMuted }]} numberOfLines={1}>
                      {need.taskName}
                    </Text>
                    {(need.assignee || need.dueDate) && (
                      <Text style={{ fontSize: isTablet ? 10 : 9, color: colors.textMuted, marginTop: 1 }}>
                        {[need.assignee, need.dueDate].filter(Boolean).join(" • ")}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => onDeleteNeed(vehicle, need.id)} style={{ padding: 2 }}>
                  <Trash2 size={12} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
            {(vehicle.needs || []).length === 0 && (
              <Text style={{ fontSize: isTablet ? 12 : 11, color: colors.textMuted, fontStyle: "italic" }}>No tasks listed.</Text>
            )}
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.border + "20", paddingTop: hp(0.8), gap: hp(1) }}>
            <TextInput 
              style={styles.inlineTextInputFull}
              placeholder="New need..."
              placeholderTextColor={colors.textMuted}
              value={taskName}
              onChangeText={setTaskName}
            />
            <View style={styles.inlineInputRow}>
              <TouchableOpacity 
                style={styles.inlinePickerTrigger}
                onPress={() => {
                  Alert.alert(
                    "Assign Employee",
                    "Choose an assignee from the list:",
                    [
                      { text: "Cancel", style: "cancel" },
                      ...employees.map(e => ({
                        text: e.name,
                        onPress: () => setAssignee(e.name)
                      }))
                    ]
                  );
                }}
              >
                <Text style={styles.inlinePickerText} numberOfLines={1}>
                  {assignee || "Assign..."}
                </Text>
                <ChevronDown size={12} color={colors.textMuted} />
              </TouchableOpacity>

              <TextInput 
                style={styles.inlineTextInputRowElement}
                placeholder="Due date"
                placeholderTextColor={colors.textMuted}
                value={dueDate}
                onChangeText={setDueDate}
              />
              <TouchableOpacity 
                style={styles.inlineSubmitBtn}
                disabled={submitting || !taskName.trim()}
                onPress={async () => {
                  if (!taskName.trim()) return;
                  setSubmitting(true);
                  try {
                    await onAddNeed(vehicle, taskName, assignee, dueDate);
                    setTaskName("");
                    setAssignee("");
                    setDueDate("");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <Text style={styles.inlineSubmitBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};