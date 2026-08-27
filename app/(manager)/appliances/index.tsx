import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import {
  Plus,
  Search,
  Wrench,
  MapPin,
  Calendar,
  Grid,
  List,
  Package,
  X,
  ChevronDown,
  Check,
  Trash2,
  Edit2,
  FileImage
} from "lucide-react-native";
import { isDarkTheme } from "@/constants/design/presets";

const { width } = Dimensions.get('window');

interface Appliance {
  id: string;
  name: string;
  inventoryType: "asset" | "consumable" | "sellable";
  brand?: string;
  model?: string;
  serialNumber?: string;
  location: string;
  status: string;
  assignedTo?: string;
  propertyType?: "commercial" | "residential";
  purchaseDate?: string;
  warrantyUntil?: string;
  conditionStatus?: "excellent" | "good" | "fair" | "damaged";
  quantity?: number;
  unitType?: "pieces" | "boxes" | "liters" | "kg";
  reorderPoint?: number;
  dailyUsageRate?: number;
  sku?: string;
  costPrice?: number;
  sellingPrice?: number;
  supplier?: string;
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
}

const getDisplayImageUrl = (url?: string) => {
  if (!url || url.trim() === "") return null;
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("file://") ||
    url.startsWith("content://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return toProxiedUrl(url);
};

function normalizeAppliance(a: any): Appliance {
  const id = String(a.id || a._id || "");
  const backendStatus = String(a.status || "");
  const normalizedStatus =
    backendStatus === "operational" || backendStatus === "needs-repair" || backendStatus === "out-of-service"
      ? backendStatus
      : "operational";

  const warrantyDate = String(a.warrantyExpiry || a.warrantyUntil || a.warrantyExpiryDate || a.warrantyDate || "");

  return {
    id,
    name: String(a.name || ""),
    inventoryType:
      String(a.inventoryType) === "consumable"
        ? "consumable"
        : String(a.inventoryType) === "sellable"
        ? "sellable"
        : "asset",
    brand: String(a.brand || ""),
    model: String(a.model || ""),
    serialNumber: String(a.serialNumber || ""),
    location: String(a.location || ""),
    status: normalizedStatus,
    assignedTo: String(a.assignedTo || ""),
    propertyType: String(a.propertyType) === "residential" ? "residential" : "commercial",
    purchaseDate: String(a.purchaseDate === "-" ? "" : a.purchaseDate || ""),
    warrantyUntil: warrantyDate,
    conditionStatus:
      String(a.conditionStatus) === "excellent"
        ? "excellent"
        : String(a.conditionStatus) === "fair"
        ? "fair"
        : String(a.conditionStatus) === "damaged"
        ? "damaged"
        : "good",
    quantity: typeof a.quantity === "number" ? a.quantity : undefined,
    unitType: String(a.unitType) === "boxes" ? "boxes" : String(a.unitType) === "liters" ? "liters" : String(a.unitType) === "kg" ? "kg" : "pieces",
    reorderPoint: typeof a.reorderPoint === "number" ? a.reorderPoint : undefined,
    dailyUsageRate: typeof a.dailyUsageRate === "number" ? a.dailyUsageRate : undefined,
    sku: String(a.sku || ""),
    costPrice: typeof a.costPrice === "number" ? a.costPrice : undefined,
    sellingPrice: typeof a.sellingPrice === "number" ? a.sellingPrice : undefined,
    supplier: String(a.supplier || ""),
    tagPhotoFileName: String(a.tagPhotoFileName || ""),
    tagPhotoDataUrl: String(a.tagPhotoDataUrl || ""),
  };
}

function formatWarrantyDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toISOString().split("T")[0];
}

const createApplianceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  inventoryType: z.enum(["asset", "consumable", "sellable"]),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  status: z.enum(["operational", "needs-repair", "out-of-service"]),
  assignedTo: z.string().optional(),
  propertyType: z.enum(["commercial", "residential"]).optional(),
  purchaseDate: z.string().optional(),
  warrantyUntil: z.string().optional(),
  conditionStatus: z.enum(["excellent", "good", "fair", "damaged"]).optional(),
  quantity: z.coerce.number().optional(),
  unitType: z.enum(["pieces", "boxes", "liters", "kg"]).optional(),
  reorderPoint: z.coerce.number().optional(),
  dailyUsageRate: z.coerce.number().optional(),
  sku: z.string().optional(),
  costPrice: z.coerce.number().optional(),
  sellingPrice: z.coerce.number().optional(),
  supplier: z.string().optional(),
  tagPhotoFileName: z.string().optional(),
  tagPhotoDataUrl: z.string().optional(),
});

type CreateApplianceValues = z.infer<typeof createApplianceSchema>;

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:     uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#f8fafc"),
    cardBg:         uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#ffffff"),
    text:           uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#fafafa" : "#0f172a"),
    textSecondary:   isDark ? "#71717a" : "#475569",
    textMuted:       isDark ? "#a1a1aa" : "#64748b",
    border:          isDark ? "#27272a" : "#e2e8f0",
    primary:         uiTheme.customColors?.primary                || "#ffd27a",
    overlayBg:       "rgba(0,0,0,0.7)",
    opText:          "#34d399",
    opBg:            "#064e3b",
    repText:         "#fbbf24",
    repBg:           "#78350f",
    outText:         "#f87171",
    outBg:           "#7f1d1d",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    mainContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addButton: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: "center",
    },
    addButtonText: {
      color: colors.background,
      fontWeight: "600",
      fontSize: 12,
      marginLeft: 4,
    },
    searchSection: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginTop: 6,
      gap: 8,
    },
    searchWrapper: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      paddingHorizontal: 10,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchField: {
      flex: 1,
      height: 36,
      fontSize: 13,
      color: colors.text,
    },
    layoutToggleRow: {
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 2,
    },
    toggleBtn: {
      padding: 6,
      borderRadius: 4,
    },
    toggleBtnActive: {
      backgroundColor: colors.border,
    },
    dropdownFiltersContainer: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginTop: 10,
      gap: 8,
    },
    dropdownTriggerButton: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 34,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
    },
    dropdownTriggerLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.text,
    },
    scrollInventoryContainer: {
      paddingHorizontal: 16,
      paddingBottom: 32,
      marginTop: 12,
    },
    fallbackBox: {
      alignItems: "center",
      marginTop: 64,
      gap: 8,
    },
    fallbackText: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    cardRow: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
    },
    cardHeaderSide: {
      flexDirection: "row",
      alignItems: "center",
    },
    iconBoxBg: {
      width: 34,
      height: 34,
      borderRadius: 6,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    cardInlineThumbnail: {
      width: "100%",
      height: "100%",
    },
    itemTitleText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    itemMetaLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    badgeRow: {
      alignItems: "flex-end",
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: "600",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      textTransform: "uppercase",
    },
    cardFooterMetrics: {
      flexDirection: "row",
      marginTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 8,
      justifyContent: "space-between",
    },
    inlineInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    inlineInfoText: {
      fontSize: 11,
      color: colors.textMuted,
      maxWidth: width * 0.38,
    },
    gridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    gridBlock: {
      width: (width - 40) / 2,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 4,
    },
    gridHeaderCover: {
      width: "100%",
      height: 90,
      backgroundColor: colors.border,
    },
    iconBoxBgGrid: {
      width: "100%",
      height: 90,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    gridCardContentWrapper: {
      padding: 10,
      gap: 2,
    },
    gridLocationText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    statusBadgeTextGrid: {
      fontSize: 9,
      fontWeight: "600",
      textTransform: "uppercase",
      alignSelf: "flex-start",
      marginTop: 4,
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
    },
    operational: { color: colors.opText, backgroundColor: colors.opBg },
    "needs-repair": { color: colors.repText, backgroundColor: colors.repBg },
    "out-of-service": { color: colors.outText, backgroundColor: colors.outBg },
    statsSummaryFooter: {
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderTopWidth: 1,
      borderColor: colors.border,
      padding: 12,
      justifyContent: "space-between",
      alignItems: "center",
    },
    statsSummaryText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "600",
    },
    statsIndicatorGroup: {
      flexDirection: "row",
      gap: 6,
    },
    indicatorPill: {
      fontSize: 10,
      fontWeight: "500",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    dropdownModalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      alignItems: "center",
    },
    dropdownModalContent: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      width: width * 0.82,
      borderRadius: 8,
      paddingVertical: 12,
    },
    dropdownModalTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      paddingHorizontal: 14,
      marginBottom: 8,
    },
    dropdownOptionRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: "center",
    },
    dropdownOptionRowActive: {
      backgroundColor: colors.border,
    },
    dropdownOptionText: {
      fontSize: 13,
      color: colors.text,
    },
    dropdownOptionTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    modalViewport: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalTopNavigation: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    modalHeaderTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    modalCloseBtn: {
      padding: 4,
    },
    modalScrollBody: {
      paddingBottom: 48,
    },
    hardwareHeroImage: {
      width: "100%",
      height: 180,
    },
    hardwareHeroImagePlaceholder: {
      backgroundColor: colors.cardBg,
      alignItems: "center",
      justifyContent: "center",
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    detailCard: {
      padding: 16,
    },
    detailMainName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    detailSubId: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    specDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 14,
    },
    specGrid: {
      flexDirection: "row",
      marginBottom: 12,
      gap: 12,
    },
    specColumn: {
      flex: 1,
    },
    specLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    specValue: {
      fontSize: 13,
      color: colors.text,
      marginTop: 2,
      fontWeight: "500",
    },
    sectionFormGroupTitle: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primary,
      marginTop: 14,
      marginBottom: 10,
      textTransform: "uppercase",
    },
    modalActionTrayControl: {
      flexDirection: "row",
      marginHorizontal: 16,
      gap: 10,
      marginTop: 12,
    },
    actionBtnEdit: {
      flex: 1,
      flexDirection: "row",
      height: 40,
      backgroundColor: colors.primary,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    actionBtnEditText: {
      color: colors.background,
      fontWeight: "600",
      fontSize: 13,
    },
    actionBtnDelete: {
      flex: 1,
      flexDirection: "row",
      height: 40,
      backgroundColor: colors.outBg,
      borderRadius: 6,
      justifyContent: "center",
      alignItems: "center",
    },
    actionBtnDeleteText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 13,
    },
    formScrollContainer: {
      padding: 16,
      paddingBottom: 64,
    },
    formInputLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textMuted,
      marginTop: 12,
      marginBottom: 6,
    },
    formInputBox: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 12,
      fontSize: 13,
      color: colors.text,
    },
    formInlineRowInputs: {
      flexDirection: "row",
      gap: 10,
    },
    formInlineSelectorTrigger: {
      flexDirection: "row",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 38,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
    },
    formInlineSelectorText: {
      fontSize: 13,
      color: colors.text,
    },
    subFormGroupWrapper: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subFormGroupWrapperEdit: {
      marginTop: 16,
      padding: 12,
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    subFormHeaderTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.primary,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    photoPickerContainerBox: {
      flexDirection: "column",
      alignItems: "center",
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      padding: 10,
      gap: 10,
    },
    formMediaAssetPreviewImage: {
      width: "100%",
      height: 140,
      borderRadius: 6,
      backgroundColor: colors.border,
    },
    formMediaAssetPlaceholderBox: {
      width: "100%",
      height: 100,
      borderRadius: 6,
      backgroundColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    formSelectMediaButtonTrigger: {
      width: "100%",
      backgroundColor: colors.primary,
      borderRadius: 6,
      height: 38,
      justifyContent: "center",
      alignItems: "center",
    },
    formSelectMediaButtonText: {
      color: "#000000",
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 8,
    },
    formRemoveMediaButtonTrigger: {
      width: "100%",
      backgroundColor: colors.outBg,
      borderRadius: 6,
      height: 38,
      justifyContent: "center",
      alignItems: "center",
    },
    formRemoveMediaButtonText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 8,
    },
    formActionSubmitBtn: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      height: 42,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 24,
    },
    formActionSubmitBtnText: {
      color: colors.background,
      fontWeight: "700",
      fontSize: 13,
    },
    formActionSubmitBtnTextEdit: {
      color: colors.background,
      fontWeight: "700",
      fontSize: 13,
    },
    formErrorText: {
      fontSize: 11,
      color: "#ef4444",
      marginTop: 3,
    },
  });
}

export default function Appliances() {
  
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();

  const isDark = isDarkTheme(uiTheme?.theme);
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const [activePickerField, setActivePickerField] = useState<{ type: "location" | "employee" | "status" | "inventoryType" | "conditionStatus" | "propertyType" | "unitType"; isEdit: boolean } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);

  const appliancesQuery = useQuery({
    queryKey: ["appliances"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/appliances");
      const items = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      return items.map(normalizeAppliance).filter((a: Appliance) => Boolean(a.id));
    },
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/locations");
      return Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
    },
  });

  const employeesQuery = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch<any>("/api/employees");
      const items = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
      return items.filter((e: any) => e.status !== "inactive");
    },
  });

  const appliances = appliancesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const employees = employeesQuery.data ?? [];

  const resolveLocationName = (locationValue: string) => {
    const key = String(locationValue || "").trim();
    const match = locations.find((l: any) => String(l.id) === key);
    return match?.name || key || "—";
  };

  const resolveEmployeeName = (empValue: string) => {
    const key = String(empValue || "").trim();
    if (!key || key === "__unassigned__") return "Unassigned";
    const match = employees.find((e: any) => String(e.id) === key);
    return match?.name || key;
  };

  const createApplianceMutation = useMutation({
    mutationFn: async (payload: CreateApplianceValues) => {
      const formattedPayload = {
        ...payload,
        assignedTo: payload.assignedTo === "__unassigned__" ? undefined : payload.assignedTo,
      };
      const res = await apiFetch<{ item: any }>("/api/appliances", {
        method: "POST",
        body: JSON.stringify(formattedPayload),
      });
      return normalizeAppliance(res.item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appliances"] });
      setIsCreateOpen(false);
      form.reset();
      Alert.alert("Success", "Appliance added completely.");
    },
    onError: (err) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to add appliance");
    },
  });

  const updateApplianceMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: CreateApplianceValues }) => {
      const nextPayload = {
        ...payload,
        assignedTo: payload.assignedTo?.trim() && payload.assignedTo !== "__unassigned__" ? payload.assignedTo.trim() : undefined,
      };
      const res = await apiFetch<{ item: any }>(`/api/appliances/${id}`, {
        method: "PUT",
        body: JSON.stringify(nextPayload),
      });
      return normalizeAppliance(res.item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appliances"] });
      setIsEditOpen(false);
      Alert.alert("Success", "Appliance updated completely.");
    },
    onError: (err) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to update appliance");
    },
  });

  const deleteApplianceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/appliances/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appliances"] });
      setIsViewOpen(false);
      setSelectedAppliance(null);
      Alert.alert("Deleted", "Appliance has been removed permanently.");
    },
    onError: (err) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to delete appliance");
    },
  });

  const promptDeleteConfirmation = (id: string) => {
    Alert.alert(
      "Confirm Destructive Action",
      "Are you absolutely certain you want to permanently delete this appliance record? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Asset", style: "destructive", onPress: () => deleteApplianceMutation.mutate(id) }
      ]
    );
  };

  const form = useForm<CreateApplianceValues>({
    resolver: zodResolver(createApplianceSchema),
    defaultValues: {
      name: "", inventoryType: "asset", status: "operational", brand: "", model: "",
      serialNumber: "", location: "", propertyType: "commercial", purchaseDate: "",
      warrantyUntil: "", assignedTo: "__unassigned__", conditionStatus: "good",
      quantity: 0, unitType: "pieces", reorderPoint: 0, dailyUsageRate: 0,
      sku: "", costPrice: 0, sellingPrice: 0, supplier: "", tagPhotoFileName: "", tagPhotoDataUrl: ""
    },
  });

  const editForm = useForm<CreateApplianceValues>({
    resolver: zodResolver(createApplianceSchema),
  });

  const createInventoryType = form.watch("inventoryType");
  const editInventoryType = editForm.watch("inventoryType");

  const handlePickDocument = async (isEdit: boolean) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const targetForm = isEdit ? editForm : form;
        targetForm.setValue("tagPhotoFileName", asset.name);
        targetForm.setValue("tagPhotoDataUrl", asset.uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to acquire photo asset.");
    }
  };

  const handleRemoveDocument = (isEdit: boolean) => {
    const targetForm = isEdit ? editForm : form;
    targetForm.setValue("tagPhotoFileName", "");
    targetForm.setValue("tagPhotoDataUrl", "");
  };

  const openEditMode = (appliance: Appliance) => {
    setSelectedAppliance(appliance);
    editForm.reset({
      name: appliance.name, status: appliance.status as any, location: appliance.location,
      inventoryType: appliance.inventoryType, brand: appliance.brand || "", model: appliance.model || "",
      serialNumber: appliance.serialNumber || "", propertyType: appliance.propertyType || "commercial",
      purchaseDate: appliance.purchaseDate || "", warrantyUntil: appliance.warrantyUntil || "",
      conditionStatus: appliance.conditionStatus || "good", quantity: appliance.quantity || 0,
      unitType: appliance.unitType || "pieces", reorderPoint: appliance.reorderPoint || 0,
      dailyUsageRate: appliance.dailyUsageRate || 0, sku: appliance.sku || "",
      costPrice: appliance.costPrice || 0, sellingPrice: appliance.sellingPrice || 0, supplier: appliance.supplier || "",
      assignedTo: appliance.assignedTo || "__unassigned__", tagPhotoFileName: appliance.tagPhotoFileName || "",
      tagPhotoDataUrl: appliance.tagPhotoDataUrl || "",
    });
    setIsEditOpen(true);
  };

  const filteredAppliances = useMemo(() => {
    return appliances.filter((a) => {
      const locationLabel = resolveLocationName(a.location);
      const matchesSearch =
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        locationLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(a.serialNumber || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      const matchesType = inventoryTypeFilter === "all" || a.inventoryType === inventoryTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [appliances, searchQuery, statusFilter, inventoryTypeFilter, locations]);

  const stats = useMemo(() => {
    return {
      operational: appliances.filter((a) => a.status === "operational").length,
      needsRepair: appliances.filter((a) => a.status === "needs-repair").length,
      outOfService: appliances.filter((a) => a.status === "out-of-service").length,
    };
  }, [appliances]);

  const renderPickerOptions = () => {
    if (!activePickerField) return null;
    const { type } = activePickerField;

    if (type === "location") {
      return locations.map((loc: any) => ({ value: String(loc.id), label: loc.name }));
    }
    if (type === "employee") {
      return [
        { value: "__unassigned__", label: "Unassigned" },
        ...employees.map((emp: any) => ({ value: String(emp.id), label: emp.name }))
      ];
    }
    if (type === "status") {
      return [
        { value: "operational", label: "Operational" },
        { value: "needs-repair", label: "Needs Repair" },
        { value: "out-of-service", label: "Out of Service" }
      ];
    }
    if (type === "inventoryType") {
      return [
        { value: "asset", label: "Asset" },
        { value: "consumable", label: "Consumable" },
        { value: "sellable", label: "Sellable" }
      ];
    }
    if (type === "conditionStatus") {
      return [
        { value: "excellent", label: "Excellent" },
        { value: "good", label: "Good" },
        { value: "fair", label: "Fair" },
        { value: "damaged", label: "Damaged" }
      ];
    }
    if (type === "propertyType") {
      return [
        { value: "commercial", label: "Commercial" },
        { value: "residential", label: "Residential" }
      ];
    }
    if (type === "unitType") {
      return [
        { value: "pieces", label: "Pieces" },
        { value: "boxes", label: "Boxes" },
        { value: "liters", label: "Liters" },
        { value: "kg", label: "Kilograms (KG)" }
      ];
    }
    return [];
  };

  return (
    <SafeAreaView style={s(styles.mainContainer)} edges={["top", "left", "right"]}>
      <View style={s(styles.headerRow)}>
        <View>
          <Text style={s(styles.headerTitle)}>Appliances</Text>
          <Text style={s(styles.headerSubtitle)}>Real-time stock & hardware overview</Text>
        </View>
        <Pressable style={s(styles.addButton)} onPress={() => setIsCreateOpen(true)}>
          <Plus size={16} color={colors.background} />
          <Text style={s(styles.addButtonText)}>Add Asset</Text>
        </Pressable>
      </View>

      {appliancesQuery.isLoading && <ActivityIndicator color={colors.primary} style={s({ marginBottom: 12 })} />}

      <View style={s(styles.searchSection)}>
        <View style={s(styles.searchWrapper)}>
          <Search size={16} color={colors.textSecondary} style={s(styles.searchIcon)} />
          <TextInput
            style={s(styles.searchField)}
            placeholder="Search matching assets..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={s(styles.layoutToggleRow)}>
          <Pressable style={s([styles.toggleBtn, viewMode === "table" && styles.toggleBtnActive])} onPress={() => setViewMode("table")}>
            <List size={16} color={viewMode === "table" ? colors.primary : colors.textSecondary} />
          </Pressable>
          <Pressable style={s([styles.toggleBtn, viewMode === "grid" && styles.toggleBtnActive])} onPress={() => setViewMode("grid")}>
            <Grid size={16} color={viewMode === "grid" ? colors.primary : colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={s(styles.dropdownFiltersContainer)}>
        <Pressable style={s(styles.dropdownTriggerButton)} onPress={() => setIsTypeDropdownOpen(true)}>
          <Text style={s(styles.dropdownTriggerLabel)} numberOfLines={1}>
            Type: {inventoryTypeFilter === "all" ? "All Types" : inventoryTypeFilter.toUpperCase()}
          </Text>
          <ChevronDown size={14} color={colors.primary} />
        </Pressable>

        <Pressable style={s(styles.dropdownTriggerButton)} onPress={() => setIsStatusDropdownOpen(true)}>
          <Text style={s(styles.dropdownTriggerLabel)} numberOfLines={1}>
            Status: {statusFilter === "all" ? "All Statuses" : statusFilter.replace("-", " ").toUpperCase()}
          </Text>
          <ChevronDown size={14} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s(styles.scrollInventoryContainer)}>
        {filteredAppliances.length === 0 ? (
          <View style={s(styles.fallbackBox)}>
            <Wrench size={40} color={colors.border} />
            <Text style={s(styles.fallbackText)}>No matching appliance items tracked.</Text>
          </View>
        ) : viewMode === "table" ? (
          filteredAppliances.map((item) => {
            const cardImg = getDisplayImageUrl(item.tagPhotoDataUrl);
            return (
              <Pressable key={item.id} style={s(styles.cardRow)} onPress={() => { setSelectedAppliance(item); setIsViewOpen(true); }}>
                <View style={s(styles.cardHeaderSide)}>
                  <View style={s(styles.iconBoxBg)}>
                    {cardImg ? (
                      <Image source={{ uri: cardImg }} style={s(styles.cardInlineThumbnail)} />
                    ) : (
                      <Package size={18} color={colors.primary} />
                    )}
                  </View>
                  <View style={s({ flex: 1, marginLeft: 12, marginRight: 8 })}>
                    <Text style={s(styles.itemTitleText)} numberOfLines={1}>{item.name}</Text>
                    <Text style={s(styles.itemMetaLabel)}>ID: {item.id} • <Text style={s({ textTransform: 'uppercase', fontSize: 10, color: colors.primary })}>{item.inventoryType}</Text></Text>
                  </View>
                  <View style={s(styles.badgeRow)}>
                    <Text style={s([styles.statusBadgeText, styles[item.status as keyof typeof styles] || styles.operational])}>
                      {item.status.replace("-", " ")}
                    </Text>
                  </View>
                </View>

                <View style={s(styles.cardFooterMetrics)}>
                  <View style={s(styles.inlineInfo)}>
                    <MapPin size={12} color={colors.textMuted} />
                    <Text style={s(styles.inlineInfoText)} numberOfLines={1}>{resolveLocationName(item.location)}</Text>
                  </View>
                  <View style={s(styles.inlineInfo)}>
                    <Calendar size={12} color={colors.textMuted} />
                    <Text style={s(styles.inlineInfoText)} numberOfLines={1}>
                      {item.inventoryType === "asset" ? (item.warrantyUntil ? formatWarrantyDate(item.warrantyUntil) : "No Warranty") : `Qty: ${item.quantity ?? 0}`}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={s(styles.gridContainer)}>
            {filteredAppliances.map((item) => {
              const gridImg = getDisplayImageUrl(item.tagPhotoDataUrl);
              return (
                <Pressable key={item.id} style={s(styles.gridBlock)} onPress={() => { setSelectedAppliance(item); setIsViewOpen(true); }}>
                  {gridImg ? (
                    <Image source={{ uri: gridImg }} style={s(styles.gridHeaderCover)} />
                  ) : (
                    <View style={s(styles.iconBoxBgGrid)}>
                      <Wrench size={22} color={colors.primary} />
                    </View>
                  )}
                  <View style={s(styles.gridCardContentWrapper)}>
                    <Text style={s(styles.itemTitleText)} numberOfLines={1}>{item.name}</Text>
                    <Text style={s(styles.gridLocationText)} numberOfLines={1}>{resolveLocationName(item.location)}</Text>
                    <Text style={s([styles.statusBadgeTextGrid, styles[item.status as keyof typeof styles] || styles.operational])}>
                      {item.status.replace("-", " ")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={s(styles.statsSummaryFooter)}>
        <Text style={s(styles.statsSummaryText)}>Total: {filteredAppliances.length}</Text>
        <View style={s(styles.statsIndicatorGroup)}>
          <Text style={s([styles.indicatorPill, styles.operational])}>Op: {stats.operational}</Text>
          <Text style={s([styles.indicatorPill, styles.needsRepair])}>Rep: {stats.needsRepair}</Text>
          <Text style={s([styles.indicatorPill, styles.outOfService])}>Out: {stats.outOfService}</Text>
        </View>
      </View>

      <Modal visible={isTypeDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsTypeDropdownOpen(false)}>
        <Pressable style={s(styles.dropdownModalOverlay)} onPress={() => setIsTypeDropdownOpen(false)}>
          <View style={s(styles.dropdownModalContent)}>
            <Text style={s(styles.dropdownModalTitle)}>Filter by Inventory Type</Text>
            {[
              { id: "all", label: "All Types" },
              { id: "asset", label: "Asset" },
              { id: "consumable", label: "Consumable" },
              { id: "sellable", label: "Sellable" }
            ].map((option) => (
              <Pressable
                key={option.id}
                style={s([styles.dropdownOptionRow, inventoryTypeFilter === option.id && styles.dropdownOptionRowActive])}
                onPress={() => { setInventoryTypeFilter(option.id); setIsTypeDropdownOpen(false); }}
              >
                <Text style={s([styles.dropdownOptionText, inventoryTypeFilter === option.id && styles.dropdownOptionTextActive])}>{option.label}</Text>
                {inventoryTypeFilter === option.id && <Check size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isStatusDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsStatusDropdownOpen(false)}>
        <Pressable style={s(styles.dropdownModalOverlay)} onPress={() => setIsStatusDropdownOpen(false)}>
          <View style={s(styles.dropdownModalContent)}>
            <Text style={s(styles.dropdownModalTitle)}>Filter by Operational Status</Text>
            {[
              { id: "all", label: "All Statuses" },
              { id: "operational", label: "Operational" },
              { id: "needs-repair", label: "Needs Repair" },
              { id: "out-of-service", label: "Out Of Service" }
            ].map((option) => (
              <Pressable
                key={option.id}
                style={s([styles.dropdownOptionRow, statusFilter === option.id && styles.dropdownOptionRowActive])}
                onPress={() => { setStatusFilter(option.id); setIsStatusDropdownOpen(false); }}
              >
                <Text style={s([styles.dropdownOptionText, statusFilter === option.id && styles.dropdownOptionTextActive])}>{option.label}</Text>
                {statusFilter === option.id && <Check size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isViewOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsViewOpen(false)}>
        <SafeAreaView style={s(styles.modalViewport)}>
          <View style={s(styles.modalTopNavigation)}>
            <Text style={s(styles.modalHeaderTitle)}>Hardware Specifications</Text>
            <Pressable style={s(styles.modalCloseBtn)} onPress={() => setIsViewOpen(false)}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          {selectedAppliance && (
            <ScrollView contentContainerStyle={s(styles.modalScrollBody)}>
              {getDisplayImageUrl(selectedAppliance.tagPhotoDataUrl) ? (
                <Image
                  source={{ uri: getDisplayImageUrl(selectedAppliance.tagPhotoDataUrl)! }}
                  style={s(styles.hardwareHeroImage)}
                  resizeMode="cover"
                />
              ) : (
                <View style={s([styles.hardwareHeroImage, styles.hardwareHeroImagePlaceholder])}>
                  <Wrench size={40} color={colors.textSecondary} />
                  <Text style={s({ color: colors.textSecondary, marginTop: 8, fontSize: 13 })}>No Hardware Image Registered</Text>
                </View>
              )}

              <View style={s(styles.detailCard)}>
                <Text style={s(styles.detailMainName)}>{selectedAppliance.name}</Text>
                <Text style={s(styles.detailSubId)}>Reference ID: {selectedAppliance.id}</Text>

                <View style={s(styles.specDivider)} />

                <View style={s(styles.specGrid)}>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Inventory Class</Text><Text style={s(styles.specValue)}>{selectedAppliance.inventoryType.toUpperCase()}</Text></View>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Operational Status</Text><Text style={s(styles.specValue)}>{selectedAppliance.status.replace("-", " ").toUpperCase()}</Text></View>
                </View>

                <View style={s(styles.specGrid)}>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Brand Infrastructure</Text><Text style={s(styles.specValue)}>{selectedAppliance.brand || "—"}</Text></View>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Model Assignment</Text><Text style={s(styles.specValue)}>{selectedAppliance.model || "—"}</Text></View>
                </View>

                <View style={s(styles.specGrid)}>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Serial Identifier Code</Text><Text style={s(styles.specValue)}>{selectedAppliance.serialNumber || "—"}</Text></View>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Physical Location Site</Text><Text style={s(styles.specValue)}>{resolveLocationName(selectedAppliance.location)}</Text></View>
                </View>

                <View style={s(styles.specGrid)}>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Assigned Custodian</Text><Text style={s(styles.specValue)}>{resolveEmployeeName(selectedAppliance.assignedTo || "")}</Text></View>
                  <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Supply Source Supplier</Text><Text style={s(styles.specValue)}>{selectedAppliance.supplier || "—"}</Text></View>
                </View>

                {selectedAppliance.inventoryType === "asset" && (
                  <>
                    <Text style={s(styles.sectionFormGroupTitle)}>Asset Deployment Logistics</Text>
                    <View style={s(styles.specGrid)}>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Property Type</Text><Text style={s(styles.specValue)}>{selectedAppliance.propertyType}</Text></View>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Condition State</Text><Text style={s(styles.specValue)}>{selectedAppliance.conditionStatus}</Text></View>
                    </View>
                    <View style={s(styles.specGrid)}>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Purchase Date</Text><Text style={s(styles.specValue)}>{selectedAppliance.purchaseDate || "—"}</Text></View>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Warranty Deadline</Text><Text style={s(styles.specValue)}>{formatWarrantyDate(selectedAppliance.warrantyUntil || "")}</Text></View>
                    </View>
                  </>
                )}

                {selectedAppliance.inventoryType === "consumable" && (
                  <>
                    <Text style={s(styles.sectionFormGroupTitle)}>Consumable Auditing Metrics</Text>
                    <View style={s(styles.specGrid)}>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>On-Hand Volume</Text><Text style={s(styles.specValue)}>{selectedAppliance.quantity} ({selectedAppliance.unitType})</Text></View>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Reorder Threshold</Text><Text style={s(styles.specValue)}>{selectedAppliance.reorderPoint || "0"}</Text></View>
                    </View>
                    <View style={s(styles.specGrid)}>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Daily Usage Rate</Text><Text style={s(styles.specValue)}>{selectedAppliance.dailyUsageRate || "0"}</Text></View>
                      <View style={s(styles.specColumn)} />
                    </View>
                  </>
                )}

                {selectedAppliance.inventoryType === "sellable" && (
                  <>
                    <Text style={s(styles.sectionFormGroupTitle)}>Commercial Parameters</Text>
                    <View style={s(styles.specGrid)}>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Stock Keeping SKU</Text><Text style={s(styles.specValue)}>{selectedAppliance.sku || "—"}</Text></View>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Acquisition Cost</Text><Text style={s(styles.specValue)}>${selectedAppliance.costPrice}</Text></View>
                    </View>
                    <View style={s(styles.specGrid)}>
                      <View style={s(styles.specColumn)}><Text style={s(styles.specLabel)}>Retailing Price Target</Text><Text style={s(styles.specValue)}>${selectedAppliance.sellingPrice}</Text></View>
                      <View style={s(styles.specColumn)} />
                    </View>
                  </>
                )}
              </View>

              <View style={s(styles.modalActionTrayControl)}>
                <Pressable style={s(styles.actionBtnEdit)} onPress={() => { setIsViewOpen(false); openEditMode(selectedAppliance); }}>
                  <Edit2 size={14} color={colors.background} style={s({ marginRight: 6 })} />
                  <Text style={s(styles.actionBtnEditText)}>Modify Record</Text>
                </Pressable>

                <Pressable 
                  style={s([styles.actionBtnDelete, deleteApplianceMutation.isPending && { opacity: 0.5 }])} 
                  onPress={() => promptDeleteConfirmation(selectedAppliance.id)}
                  disabled={deleteApplianceMutation.isPending}
                >
                  <Trash2 size={14} color={colors.text} style={s({ marginRight: 6 })} />
                  <Text style={s(styles.actionBtnDeleteText)}>Delete Record</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      <Modal visible={isCreateOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCreateOpen(false)}>
        <SafeAreaView style={s(styles.modalViewport)}>
          <View style={s(styles.modalTopNavigation)}>
            <Text style={s(styles.modalHeaderTitle)}>Create Asset Record</Text>
            <Pressable style={s(styles.modalCloseBtn)} onPress={() => setIsCreateOpen(false)}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s(styles.formScrollContainer)}>
            <Text style={s(styles.formInputLabel)}>Appliance Designation Name *</Text>
            <Controller
              control={form.control}
              name="name"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <View>
                  <TextInput style={s(styles.formInputBox)} placeholder="e.g. Premium Hub Refrigerator" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                  {error && <Text style={s(styles.formErrorText)}>{error.message}</Text>}
                </View>
              )}
            />

            <View style={s(styles.formInlineRowInputs)}>
              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formInputLabel)}>Inventory Type</Text>
                <Controller
                  control={form.control}
                  name="inventoryType"
                  render={({ field: { value } }) => (
                    <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "inventoryType", isEdit: false })}>
                      <Text style={s(styles.formInlineSelectorText)}>{value.toUpperCase()}</Text>
                      <ChevronDown size={14} color={colors.primary} />
                    </Pressable>
                  )}
                />
              </View>

              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formInputLabel)}>Status State</Text>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field: { value } }) => (
                    <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "status", isEdit: false })}>
                      <Text style={s(styles.formInlineSelectorText)}>{value.replace("-", " ").toUpperCase()}</Text>
                      <ChevronDown size={14} color={colors.primary} />
                    </Pressable>
                  )}
                />
              </View>
            </View>

            <Text style={s(styles.formInputLabel)}>Facility Location Area *</Text>
            <Controller
              control={form.control}
              name="location"
              render={({ field: { value }, fieldState: { error } }) => (
                <View>
                  <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "location", isEdit: false })}>
                    <Text style={s(styles.formInlineSelectorText)}>{resolveLocationName(value) || "Select Hub Site"}</Text>
                    <ChevronDown size={14} color={colors.primary} />
                  </Pressable>
                  {error && <Text style={s(styles.formErrorText)}>{error.message}</Text>}
                </View>
              )}
            />

            <Text style={s(styles.formInputLabel)}>Assigned Custodian / Employee</Text>
            <Controller
              control={form.control}
              name="assignedTo"
              render={({ field: { value } }) => (
                <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "employee", isEdit: false })}>
                  <Text style={s(styles.formInlineSelectorText)}>{resolveEmployeeName(value)}</Text>
                  <ChevronDown size={14} color={colors.primary} />
                </Pressable>
              )}
            />

            <Text style={s(styles.formInputLabel)}>Supplier Source Vendor</Text>
            <Controller
              control={form.control}
              name="supplier"
              render={({ field: { onChange, value } }) => (
                <TextInput style={s(styles.formInputBox)} placeholder="e.g. Enterprise Logistics Group" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
              )}
            />

            {createInventoryType === "asset" && (
              <View style={s(styles.subFormGroupWrapper)}>
                <Text style={s(styles.subFormHeaderTitle)}>Asset Parameters Schema</Text>
                
                <Text style={s(styles.formInputLabel)}>Brand Manufacturer</Text>
                <Controller control={form.control} name="brand" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholder="e.g. Samsung / Bosch" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Model Identifier Reference</Text>
                <Controller control={form.control} name="model" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholder="e.g. MOD-X900" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Hardware Serial Token Tag</Text>
                <Controller control={form.control} name="serialNumber" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholder="e.g. SN-8917264A" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <View style={s(styles.formInlineRowInputs)}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Property Type</Text>
                    <Controller control={form.control} name="propertyType" render={({ field: { value } }) => (
                      <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "propertyType", isEdit: false })}>
                        <Text style={s(styles.formInlineSelectorText)}>{String(value).toUpperCase()}</Text>
                        <ChevronDown size={14} color={colors.primary} />
                      </Pressable>
                    )} />
                  </View>

                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Condition State</Text>
                    <Controller control={form.control} name="conditionStatus" render={({ field: { value } }) => (
                      <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "conditionStatus", isEdit: false })}>
                        <Text style={s(styles.formInlineSelectorText)}>{String(value).toUpperCase()}</Text>
                        <ChevronDown size={14} color={colors.primary} />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={s(styles.formInputLabel)}>Purchase Date (YYYY-MM-DD)</Text>
                <Controller control={form.control} name="purchaseDate" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholder="e.g. 2026-01-15" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Warranty Until Date (YYYY-MM-DD)</Text>
                <Controller control={form.control} name="warrantyUntil" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholder="e.g. 2029-12-31" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />
              </View>
            )}

            {createInventoryType === "consumable" && (
              <View style={s(styles.subFormGroupWrapper)}>
                <Text style={s(styles.subFormHeaderTitle)}>Consumable Auditing Schema</Text>

                <View style={s(styles.formInlineRowInputs)}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Stock Quantity Volume</Text>
                    <Controller control={form.control} name="quantity" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={s(styles.formInputBox)} placeholder="0" placeholderTextColor={colors.textSecondary} value={String(value ?? "")} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Unit Scale Classification</Text>
                    <Controller control={form.control} name="unitType" render={({ field: { value } }) => (
                      <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "unitType", isEdit: false })}>
                        <Text style={s(styles.formInlineSelectorText)}>{String(value).toUpperCase()}</Text>
                        <ChevronDown size={14} color={colors.primary} />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={s(styles.formInputLabel)}>Reorder Point Alert Threshold</Text>
                <Controller control={form.control} name="reorderPoint" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={s(styles.formInputBox)} placeholder="10" placeholderTextColor={colors.textSecondary} value={String(value ?? "")} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Daily Usage Rate Velocity</Text>
                <Controller control={form.control} name="dailyUsageRate" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={s(styles.formInputBox)} placeholder="2" placeholderTextColor={colors.textSecondary} value={String(value ?? "")} onChangeText={onChange} />
                )} />
              </View>
            )}

            {createInventoryType === "sellable" && (
              <View style={s(styles.subFormGroupWrapper)}>
                <Text style={s(styles.subFormHeaderTitle)}>Commercial Retailing Schema</Text>

                <Text style={s(styles.formInputLabel)}>Retail SKU Code Identifier</Text>
                <Controller control={form.control} name="sku" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholder="e.g. SKU-REFR-901" placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <View style={s(styles.formInlineRowInputs)}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Base Acquisition Cost ($)</Text>
                    <Controller control={form.control} name="costPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={s(styles.formInputBox)} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={String(value ?? "")} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Market Outbound Price ($)</Text>
                    <Controller control={form.control} name="sellingPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={s(styles.formInputBox)} placeholder="0.00" placeholderTextColor={colors.textSecondary} value={String(value ?? "")} onChangeText={onChange} />
                    )} />
                  </View>
                </View>
              </View>
            )}

            <Text style={s(styles.formInputLabel)}>Hardware Tag Photo File Verification</Text>
            <Controller
              control={form.control} 
              name="tagPhotoFileName"
              render={({ field: { value } }) => (
                <View style={s(styles.photoPickerContainerBox)}>
                  {form.watch("tagPhotoDataUrl") ? (
                    <>
                      <Image source={{ uri: form.watch("tagPhotoDataUrl")! }} style={s(styles.formMediaAssetPreviewImage)} resizeMode="cover" />
                      <Pressable style={s(styles.formRemoveMediaButtonTrigger)} onPress={() => handleRemoveDocument(false)}>
                        <Text style={s(styles.formRemoveMediaButtonText)}>Remove Photo</Text>
                      </Pressable>
                    </>
                  ) : (
                    <View style={s(styles.formMediaAssetPlaceholderBox)}>
                      <FileImage size={24} color={colors.textSecondary} />
                      <Text style={s({ color: colors.textSecondary, fontSize: 12, marginTop: 4, textAlign: "center" })}>
                        No Active Photo Asset Uploaded
                      </Text>
                    </View>
                  )}
                  <Pressable style={s(styles.formSelectMediaButtonTrigger)} onPress={() => handlePickDocument(false)}>
                    <Text style={s(styles.formSelectMediaButtonText)}>{value ? `Replace: ${value}` : "Upload Document Media"}</Text>
                  </Pressable>
                </View>
              )}
            />

            <Pressable 
              style={s([styles.formActionSubmitBtn, createApplianceMutation.isPending && { opacity: 0.7 }])} 
              onPress={form.handleSubmit((values) => createApplianceMutation.mutate(values))}
              disabled={createApplianceMutation.isPending}
            >
              {createApplianceMutation.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={s(styles.formActionSubmitBtnText)}>Create Record</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isEditOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditOpen(false)}>
        <SafeAreaView style={s(styles.modalViewport)}>
          <View style={s(styles.modalTopNavigation)}>
            <Text style={s(styles.modalHeaderTitle)}>Modify Equipment Record</Text>
            <Pressable style={s(styles.modalCloseBtn)} onPress={() => setIsEditOpen(false)}>
              <X size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s(styles.formScrollContainer)}>
            <Text style={s(styles.formInputLabel)}>Appliance Designation Name *</Text>
            <Controller
              control={editForm.control}
              name="name"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <View>
                  <TextInput style={s(styles.formInputBox)} placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                  {error && <Text style={s(styles.formErrorText)}>{error.message}</Text>}
                </View>
              )}
            />

            <View style={s(styles.formInlineRowInputs)}>
              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formInputLabel)}>Inventory Type</Text>
                <Controller
                  control={editForm.control}
                  name="inventoryType"
                  render={({ field: { value } }) => (
                    <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "inventoryType", isEdit: true })}>
                      <Text style={s(styles.formInlineSelectorText)}>{value?.toUpperCase()}</Text>
                      <ChevronDown size={14} color={colors.primary} />
                    </Pressable>
                  )}
                />
              </View>

              <View style={s({ flex: 1 })}>
                <Text style={s(styles.formInputLabel)}>Status State</Text>
                <Controller
                  control={editForm.control}
                  name="status"
                  render={({ field: { value } }) => (
                    <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "status", isEdit: true })}>
                      <Text style={s(styles.formInlineSelectorText)}>{value?.replace("-", " ").toUpperCase()}</Text>
                      <ChevronDown size={14} color={colors.primary} />
                    </Pressable>
                  )}
                />
              </View>
            </View>

            <Text style={s(styles.formInputLabel)}>Facility Location Area *</Text>
            <Controller
              control={editForm.control}
              name="location"
              render={({ field: { value }, fieldState: { error } }) => (
                <View>
                  <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "location", isEdit: true })}>
                    <Text style={s(styles.formInlineSelectorText)}>{resolveLocationName(value)}</Text>
                    <ChevronDown size={14} color={colors.primary} />
                  </Pressable>
                  {error && <Text style={s(styles.formErrorText)}>{error.message}</Text>}
                </View>
              )}
            />

            <Text style={s(styles.formInputLabel)}>Assigned Custodian / Employee</Text>
            <Controller
              control={editForm.control}
              name="assignedTo"
              render={({ field: { value } }) => (
                <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "employee", isEdit: true })}>
                  <Text style={s(styles.formInlineSelectorText)}>{resolveEmployeeName(value || "")}</Text>
                  <ChevronDown size={14} color={colors.primary} />
                </Pressable>
              )}
            />

            <Text style={s(styles.formInputLabel)}>Supplier Source Vendor</Text>
            <Controller
              control={editForm.control}
              name="supplier"
              render={({ field: { onChange, value } }) => (
                <TextInput style={s(styles.formInputBox)} placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
              )}
            />

            {editInventoryType === "asset" && (
              <View style={s(styles.subFormGroupWrapperEdit)}>
                <Text style={s(styles.subFormHeaderTitle)}>Asset Parameters Schema</Text>
                
                <Text style={s(styles.formInputLabel)}>Brand Manufacturer</Text>
                <Controller control={editForm.control} name="brand" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Model Identifier Reference</Text>
                <Controller control={editForm.control} name="model" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Hardware Serial Token Tag</Text>
                <Controller control={editForm.control} name="serialNumber" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <View style={s(styles.formInlineRowInputs)}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Property Type</Text>
                    <Controller control={editForm.control} name="propertyType" render={({ field: { value } }) => (
                      <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "propertyType", isEdit: true })}>
                        <Text style={s(styles.formInlineSelectorText)}>{String(value || "").toUpperCase()}</Text>
                        <ChevronDown size={14} color={colors.primary} />
                      </Pressable>
                    )} />
                  </View>

                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Condition State</Text>
                    <Controller control={editForm.control} name="conditionStatus" render={({ field: { value } }) => (
                      <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "conditionStatus", isEdit: true })}>
                        <Text style={s(styles.formInlineSelectorText)}>{String(value || "").toUpperCase()}</Text>
                        <ChevronDown size={14} color={colors.primary} />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={s(styles.formInputLabel)}>Purchase Date (YYYY-MM-DD)</Text>
                <Controller control={editForm.control} name="purchaseDate" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Warranty Until Date (YYYY-MM-DD)</Text>
                <Controller control={editForm.control} name="warrantyUntil" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} placeholderTextColor={colors.textSecondary} value={value} onChangeText={onChange} />
                )} />
              </View>
            )}

            {editInventoryType === "consumable" && (
              <View style={s(styles.subFormGroupWrapperEdit)}>
                <Text style={s(styles.subFormHeaderTitle)}>Consumable Auditing Schema</Text>
                <View style={s(styles.formInlineRowInputs)}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Stock Quantity Volume</Text>
                    <Controller control={editForm.control} name="quantity" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={s(styles.formInputBox)} value={String(value ?? 0)} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Unit Scale Classification</Text>
                    <Controller control={editForm.control} name="unitType" render={({ field: { value } }) => (
                      <Pressable style={s(styles.formInlineSelectorTrigger)} onPress={() => setActivePickerField({ type: "unitType", isEdit: true })}>
                        <Text style={s(styles.formInlineSelectorText)}>{String(value || "").toUpperCase()}</Text>
                        <ChevronDown size={14} color={colors.primary} />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={s(styles.formInputLabel)}>Reorder Point Alert Threshold</Text>
                <Controller control={editForm.control} name="reorderPoint" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={s(styles.formInputBox)} value={String(value ?? 0)} onChangeText={onChange} />
                )} />

                <Text style={s(styles.formInputLabel)}>Daily Usage Rate Velocity</Text>
                <Controller control={editForm.control} name="dailyUsageRate" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={s(styles.formInputBox)} value={String(value ?? 0)} onChangeText={onChange} />
                )} />
              </View>
            )}

            {editInventoryType === "sellable" && (
              <View style={s(styles.subFormGroupWrapperEdit)}>
                <Text style={s(styles.subFormHeaderTitle)}>Commercial Retailing Schema</Text>
                <Text style={s(styles.formInputLabel)}>Retail SKU Code Identifier</Text>
                <Controller control={editForm.control} name="sku" render={({ field: { onChange, value } }) => (
                  <TextInput style={s(styles.formInputBox)} value={value} onChangeText={onChange} />
                )} />

                <View style={s(styles.formInlineRowInputs)}>
                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Base Acquisition Cost ($)</Text>
                    <Controller control={editForm.control} name="costPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={s(styles.formInputBox)} value={String(value ?? 0)} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={s({ flex: 1 })}>
                    <Text style={s(styles.formInputLabel)}>Market Outbound Price ($)</Text>
                    <Controller control={editForm.control} name="sellingPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={s(styles.formInputBox)} value={String(value ?? 0)} onChangeText={onChange} />
                    )} />
                  </View>
                </View>
              </View>
            )}

            <Text style={s(styles.formInputLabel)}>Hardware Tag Photo File Verification</Text>
            <Controller
              control={editForm.control}
              name="tagPhotoFileName"
              render={({ field: { value } }) => (
                <View style={s(styles.photoPickerContainerBox)}>
                  {editForm.watch("tagPhotoDataUrl") ? (
                    <>
                      <Image source={{ uri: editForm.watch("tagPhotoDataUrl")! }} style={s(styles.formMediaAssetPreviewImage)} resizeMode="cover" />
                      <Pressable style={s(styles.formRemoveMediaButtonTrigger)} onPress={() => handleRemoveDocument(true)}>
                        <Text style={s(styles.formRemoveMediaButtonText)}>Remove Photo</Text>
                      </Pressable>
                    </>
                  ) : (
                    <View style={s(styles.formMediaAssetPlaceholderBox)}>
                      <FileImage size={24} color={colors.textSecondary} />
                      <Text style={s({ color: colors.textSecondary, fontSize: 12, marginTop: 4 })}>No Active Photo Asset Uploaded</Text>
                    </View>
                  )}
                  <Pressable style={s(styles.formSelectMediaButtonTrigger)} onPress={() => handlePickDocument(true)}>
                    <Text style={s(styles.formSelectMediaButtonText)}>{value ? `Replace: ${value}` : "Upload Document Media"}</Text>
                  </Pressable>
                </View>
              )}
            />

            <Pressable 
              style={s([styles.formActionSubmitBtn, updateApplianceMutation.isPending && { opacity: 0.7 }])} 
              onPress={editForm.handleSubmit((values) => selectedAppliance && updateApplianceMutation.mutate({ id: selectedAppliance.id, payload: values }))}
              disabled={updateApplianceMutation.isPending}
            >
              {updateApplianceMutation.isPending ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={s(styles.formActionSubmitBtnTextEdit)}>Commit Parameter Changes</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={activePickerField !== null} transparent animationType="fade" onRequestClose={() => setActivePickerField(null)}>
        <Pressable style={s(styles.dropdownModalOverlay)} onPress={() => setActivePickerField(null)}>
          <View style={s(styles.dropdownModalContent)}>
            <Text style={s(styles.dropdownModalTitle)}>Select Value Parameter</Text>
            <ScrollView style={s({ maxHeight: 300 })}>
              {renderPickerOptions()?.map((opt: any) => {
                const targetForm = activePickerField?.isEdit ? editForm : form;
                const fieldName = activePickerField?.type as any;
                const isSelected = targetForm.getValues(fieldName) === opt.value;

                return (
                  <Pressable
                    key={opt.value}
                    style={s([styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowActive])}
                    onPress={() => {
                      targetForm.setValue(fieldName, opt.value);
                      setActivePickerField(null);
                    }}
                  >
                    <Text style={s([styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive])}>{opt.label}</Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}