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

// Custom project infrastructure imports
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch, toProxiedUrl } from "@/lib/admin/apiClient";
const { width } = Dimensions.get('window');
// Lucide icons tailored for mobile
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
  Tag,
  Trash2,
  Edit2,
  Eye,
  User,
  Layers,
  FileImage
} from "lucide-react-native";

// --- Interfaces & Types ---
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

// --- Helper Functions ---
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

// --- Validation Schemas ---
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

export default function Appliances() {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  // Screen layout & configuration states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inventoryTypeFilter, setInventoryTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Filter Trigger selectors
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Picker selection references for form elements
  const [activePickerField, setActivePickerField] = useState<{ type: "location" | "employee" | "status" | "inventoryType" | "conditionStatus" | "propertyType" | "unitType"; isEdit: boolean } | null>(null);

  // Modals visibility states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);

  // --- React Query Fetch Engine ---
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

  // --- Mutations ---
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

  // --- Hook Forms Configurations ---
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

  // --- Filtering & Metric Calculations ---
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

  // Dynamic picker options selector based on request payload
  const renderPickerOptions = () => {
    if (!activePickerField) return null;
    const { type, isEdit } = activePickerField;
    const activeForm = isEdit ? editForm : form;

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
    <SafeAreaView style={styles.mainContainer} edges={["top", "left", "right"]}>
      {/* Header Row Component */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Appliances</Text>
          <Text style={styles.headerSubtitle}>Real-time stock & hardware overview</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => setIsCreateOpen(true)}>
          <Plus size={16} color="#09090b" />
          <Text style={styles.addButtonText}>Add Asset</Text>
        </Pressable>
      </View>

      {/* Query Load State Element */}
      {appliancesQuery.isLoading && <ActivityIndicator color="#ffd27a" style={{ marginBottom: 12 }} />}

      {/* Control Search Deck Row */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <Search size={16} color="#71717a" style={styles.searchIcon} />
          <TextInput
            style={styles.searchField}
            placeholder="Search matching assets..."
            placeholderTextColor="#71717a"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.layoutToggleRow}>
          <Pressable style={[styles.toggleBtn, viewMode === "table" && styles.toggleBtnActive]} onPress={() => setViewMode("table")}>
            <List size={16} color={viewMode === "table" ? "#ffd27a" : "#71717a"} />
          </Pressable>
          <Pressable style={[styles.toggleBtn, viewMode === "grid" && styles.toggleBtnActive]} onPress={() => setViewMode("grid")}>
            <Grid size={16} color={viewMode === "grid" ? "#ffd27a" : "#71717a"} />
          </Pressable>
        </View>
      </View>

      {/* Dropdown Layout Filters triggers */}
      <View style={styles.dropdownFiltersContainer}>
        <Pressable style={styles.dropdownTriggerButton} onPress={() => setIsTypeDropdownOpen(true)}>
          <Text style={styles.dropdownTriggerLabel} numberOfLines={1}>
            Type: {inventoryTypeFilter === "all" ? "All Types" : inventoryTypeFilter.toUpperCase()}
          </Text>
          <ChevronDown size={14} color="#ffd27a" />
        </Pressable>

        <Pressable style={styles.dropdownTriggerButton} onPress={() => setIsStatusDropdownOpen(true)}>
          <Text style={styles.dropdownTriggerLabel} numberOfLines={1}>
            Status: {statusFilter === "all" ? "All Statuses" : statusFilter.replace("-", " ").toUpperCase()}
          </Text>
          <ChevronDown size={14} color="#ffd27a" />
        </Pressable>
      </View>

      {/* Main Container List Workspace */}
      <ScrollView contentContainerStyle={styles.scrollInventoryContainer}>
        {filteredAppliances.length === 0 ? (
          <View style={styles.fallbackBox}>
            <Wrench size={40} color="#27272a" />
            <Text style={styles.fallbackText}>No matching appliance items tracked.</Text>
          </View>
        ) : viewMode === "table" ? (
          filteredAppliances.map((item) => {
            const cardImg = getDisplayImageUrl(item.tagPhotoDataUrl);
            return (
              <Pressable key={item.id} style={styles.cardRow} onPress={() => { setSelectedAppliance(item); setIsViewOpen(true); }}>
                <View style={styles.cardHeaderSide}>
                  <View style={styles.iconBoxBg}>
                    {cardImg ? (
                      <Image source={{ uri: cardImg }} style={styles.cardInlineThumbnail} />
                    ) : (
                      <Package size={18} color="#ffd27a" />
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                    <Text style={styles.itemTitleText} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemMetaLabel}>ID: {item.id} • <Text style={{ textTransform: 'uppercase', fontSize: 10, color: '#ffd27a' }}>{item.inventoryType}</Text></Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.statusBadgeText, styles[item.status as keyof typeof styles] || styles.operational]}>
                      {item.status.replace("-", " ")}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFooterMetrics}>
                  <View style={styles.inlineInfo}>
                    <MapPin size={12} color="#a1a1aa" />
                    <Text style={styles.inlineInfoText} numberOfLines={1}>{resolveLocationName(item.location)}</Text>
                  </View>
                  <View style={styles.inlineInfo}>
                    <Calendar size={12} color="#a1a1aa" />
                    <Text style={styles.inlineInfoText} numberOfLines={1}>
                      {item.inventoryType === "asset" ? (item.warrantyUntil ? formatWarrantyDate(item.warrantyUntil) : "No Warranty") : `Qty: ${item.quantity ?? 0}`}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View style={styles.gridContainer}>
            {filteredAppliances.map((item) => {
              const gridImg = getDisplayImageUrl(item.tagPhotoDataUrl);
              return (
                <Pressable key={item.id} style={styles.gridBlock} onPress={() => { setSelectedAppliance(item); setIsViewOpen(true); }}>
                  {gridImg ? (
                    <Image source={{ uri: gridImg }} style={styles.gridHeaderCover} />
                  ) : (
                    <View style={styles.iconBoxBgGrid}>
                      <Wrench size={22} color="#ffd27a" />
                    </View>
                  )}
                  <View style={styles.gridCardContentWrapper}>
                    <Text style={styles.itemTitleText} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.gridLocationText} numberOfLines={1}>{resolveLocationName(item.location)}</Text>
                    <Text style={[styles.statusBadgeTextGrid, styles[item.status as keyof typeof styles] || styles.operational]}>
                      {item.status.replace("-", " ")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Global Bottom Stats Panel */}
      <View style={styles.statsSummaryFooter}>
        <Text style={styles.statsSummaryText}>Total: {filteredAppliances.length}</Text>
        <View style={styles.statsIndicatorGroup}>
          <Text style={[styles.indicatorPill, styles.operational]}>Op: {stats.operational}</Text>
          <Text style={[styles.indicatorPill, styles.needsRepair]}>Rep: {stats.needsRepair}</Text>
          <Text style={[styles.indicatorPill, styles.outOfService]}>Out: {stats.outOfService}</Text>
        </View>
      </View>

      {/* --- FILTER MODAL 1: INVENTORY TYPE --- */}
      <Modal visible={isTypeDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsTypeDropdownOpen(false)}>
        <Pressable style={styles.dropdownModalOverlay} onPress={() => setIsTypeDropdownOpen(false)}>
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Filter by Inventory Type</Text>
            {[
              { id: "all", label: "All Types" },
              { id: "asset", label: "Asset" },
              { id: "consumable", label: "Consumable" },
              { id: "sellable", label: "Sellable" }
            ].map((option) => (
              <Pressable
                key={option.id}
                style={[styles.dropdownOptionRow, inventoryTypeFilter === option.id && styles.dropdownOptionRowActive]}
                onPress={() => { setInventoryTypeFilter(option.id); setIsTypeDropdownOpen(false); }}
              >
                <Text style={[styles.dropdownOptionText, inventoryTypeFilter === option.id && styles.dropdownOptionTextActive]}>{option.label}</Text>
                {inventoryTypeFilter === option.id && <Check size={16} color="#ffd27a" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* --- FILTER MODAL 2: OPERATIONAL STATUS --- */}
      <Modal visible={isStatusDropdownOpen} transparent animationType="fade" onRequestClose={() => setIsStatusDropdownOpen(false)}>
        <Pressable style={styles.dropdownModalOverlay} onPress={() => setIsStatusDropdownOpen(false)}>
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Filter by Operational Status</Text>
            {[
              { id: "all", label: "All Statuses" },
              { id: "operational", label: "Operational" },
              { id: "needs-repair", label: "Needs Repair" },
              { id: "out-of-service", label: "Out Of Service" }
            ].map((option) => (
              <Pressable
                key={option.id}
                style={[styles.dropdownOptionRow, statusFilter === option.id && styles.dropdownOptionRowActive]}
                onPress={() => { setStatusFilter(option.id); setIsStatusDropdownOpen(false); }}
              >
                <Text style={[styles.dropdownOptionText, statusFilter === option.id && styles.dropdownOptionTextActive]}>{option.label}</Text>
                {statusFilter === option.id && <Check size={16} color="#ffd27a" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* --- MODAL 3: PRECISE ASSET DETAIL DRAWERS --- */}
      <Modal visible={isViewOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsViewOpen(false)}>
        <SafeAreaView style={styles.modalViewport}>
          <View style={styles.modalTopNavigation}>
            <Text style={styles.modalHeaderTitle}>Hardware Specifications</Text>
            <Pressable style={styles.modalCloseBtn} onPress={() => setIsViewOpen(false)}>
              <X size={20} color="#fff" />
            </Pressable>
          </View>

          {selectedAppliance && (
            <ScrollView contentContainerStyle={styles.modalScrollBody}>
              {getDisplayImageUrl(selectedAppliance.tagPhotoDataUrl) ? (
                <Image
                  source={{ uri: getDisplayImageUrl(selectedAppliance.tagPhotoDataUrl)! }}
                  style={styles.hardwareHeroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.hardwareHeroImage, styles.hardwareHeroImagePlaceholder]}>
                  <Wrench size={40} color="#52525b" />
                  <Text style={{ color: "#71717a", marginTop: 8, fontSize: 13 }}>No Hardware Image Registered</Text>
                </View>
              )}

              <View style={styles.detailCard}>
                <Text style={styles.detailMainName}>{selectedAppliance.name}</Text>
                <Text style={styles.detailSubId}>Reference ID: {selectedAppliance.id}</Text>

                <View style={styles.specDivider} />

                <View style={styles.specGrid}>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Inventory Class</Text><Text style={styles.specValue}>{selectedAppliance.inventoryType.toUpperCase()}</Text></View>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Operational Status</Text><Text style={styles.specValue}>{selectedAppliance.status.replace("-", " ").toUpperCase()}</Text></View>
                </View>

                <View style={styles.specGrid}>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Brand Infrastructure</Text><Text style={styles.specValue}>{selectedAppliance.brand || "—"}</Text></View>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Model Assignment</Text><Text style={styles.specValue}>{selectedAppliance.model || "—"}</Text></View>
                </View>

                <View style={styles.specGrid}>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Serial Identifier Code</Text><Text style={styles.specValue}>{selectedAppliance.serialNumber || "—"}</Text></View>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Physical Location Site</Text><Text style={styles.specValue}>{resolveLocationName(selectedAppliance.location)}</Text></View>
                </View>

                <View style={styles.specGrid}>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Assigned Custodian</Text><Text style={styles.specValue}>{resolveEmployeeName(selectedAppliance.assignedTo || "")}</Text></View>
                  <View style={styles.specColumn}><Text style={styles.specLabel}>Supply Source Supplier</Text><Text style={styles.specValue}>{selectedAppliance.supplier || "—"}</Text></View>
                </View>

                {selectedAppliance.inventoryType === "asset" && (
                  <>
                    <Text style={styles.sectionFormGroupTitle}>Asset Deployment Logistics</Text>
                    <View style={styles.specGrid}>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Property Type</Text><Text style={styles.specValue}>{selectedAppliance.propertyType}</Text></View>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Condition State</Text><Text style={styles.specValue}>{selectedAppliance.conditionStatus}</Text></View>
                    </View>
                    <View style={styles.specGrid}>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Purchase Date</Text><Text style={styles.specValue}>{selectedAppliance.purchaseDate || "—"}</Text></View>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Warranty Deadline</Text><Text style={styles.specValue}>{formatWarrantyDate(selectedAppliance.warrantyUntil || "")}</Text></View>
                    </View>
                  </>
                )}

                {selectedAppliance.inventoryType === "consumable" && (
                  <>
                    <Text style={styles.sectionFormGroupTitle}>Consumable Auditing Metrics</Text>
                    <View style={styles.specGrid}>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>On-Hand Volume</Text><Text style={styles.specValue}>{selectedAppliance.quantity} ({selectedAppliance.unitType})</Text></View>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Reorder Threshold</Text><Text style={styles.specValue}>{selectedAppliance.reorderPoint || "0"}</Text></View>
                    </View>
                    <View style={styles.specGrid}>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Daily Usage Rate</Text><Text style={styles.specValue}>{selectedAppliance.dailyUsageRate || "0"}</Text></View>
                      <View style={styles.specColumn} />
                    </View>
                  </>
                )}

                {selectedAppliance.inventoryType === "sellable" && (
                  <>
                    <Text style={styles.sectionFormGroupTitle}>Commercial Parameters</Text>
                    <View style={styles.specGrid}>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Stock Keeping SKU</Text><Text style={styles.specValue}>{selectedAppliance.sku || "—"}</Text></View>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Acquisition Cost</Text><Text style={styles.specValue}>${selectedAppliance.costPrice}</Text></View>
                    </View>
                    <View style={styles.specGrid}>
                      <View style={styles.specColumn}><Text style={styles.specLabel}>Retailing Price Target</Text><Text style={styles.specValue}>${selectedAppliance.sellingPrice}</Text></View>
                      <View style={styles.specColumn} />
                    </View>
                  </>
                )}
              </View>

              <View style={styles.modalActionTrayControl}>
                <Pressable style={styles.actionBtnEdit} onPress={() => { setIsViewOpen(false); openEditMode(selectedAppliance); }}>
                  <Edit2 size={14} color="#09090b" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnEditText}>Modify Record</Text>
                </Pressable>

                <Pressable 
                  style={[styles.actionBtnDelete, deleteApplianceMutation.isPending && { opacity: 0.5 }]} 
                  onPress={() => promptDeleteConfirmation(selectedAppliance.id)}
                  disabled={deleteApplianceMutation.isPending}
                >
                  <Trash2 size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnDeleteText}>Delete Record</Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* --- MODAL 4: FULL CREATE DATA MATRIX ASSET FORM --- */}
      <Modal visible={isCreateOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsCreateOpen(false)}>
        <SafeAreaView style={styles.modalViewport}>
          <View style={styles.modalTopNavigation}>
            <Text style={styles.modalHeaderTitle}>Create Asset Record</Text>
            <Pressable style={styles.modalCloseBtn} onPress={() => setIsCreateOpen(false)}>
              <X size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formScrollContainer}>
            {/* Appliance Designation */}
            <Text style={styles.formInputLabel}>Appliance Designation Name *</Text>
            <Controller
              control={form.control}
              name="name"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <View>
                  <TextInput style={styles.formInputBox} placeholder="e.g. Premium Hub Refrigerator" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                  {error && <Text style={styles.formErrorText}>{error.message}</Text>}
                </View>
              )}
            />

            {/* Inventory Type & Operational Status Matrix selects */}
            <View style={styles.formInlineRowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>Inventory Type</Text>
                <Controller
                  control={form.control}
                  name="inventoryType"
                  render={({ field: { value } }) => (
                    <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "inventoryType", isEdit: false })}>
                      <Text style={styles.formInlineSelectorText}>{value.toUpperCase()}</Text>
                      <ChevronDown size={14} color="#ffd27a" />
                    </Pressable>
                  )}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>Status State</Text>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field: { value } }) => (
                    <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "status", isEdit: false })}>
                      <Text style={styles.formInlineSelectorText}>{value.replace("-", " ").toUpperCase()}</Text>
                      <ChevronDown size={14} color="#ffd27a" />
                    </Pressable>
                  )}
                />
              </View>
            </View>

            {/* Facility Location Picker */}
            <Text style={styles.formInputLabel}>Facility Location Area *</Text>
            <Controller
              control={form.control}
              name="location"
              render={({ field: { value }, fieldState: { error } }) => (
                <View>
                  <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "location", isEdit: false })}>
                    <Text style={styles.formInlineSelectorText}>{resolveLocationName(value) || "Select Hub Site"}</Text>
                    <ChevronDown size={14} color="#ffd27a" />
                  </Pressable>
                  {error && <Text style={styles.formErrorText}>{error.message}</Text>}
                </View>
              )}
            />

            {/* Assigned Custodian Picker */}
            <Text style={styles.formInputLabel}>Assigned Custodian / Employee</Text>
            <Controller
              control={form.control}
              name="assignedTo"
              render={({ field: { value } }) => (
                <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "employee", isEdit: false })}>
                  <Text style={styles.formInlineSelectorText}>{resolveEmployeeName(value)}</Text>
                  <ChevronDown size={14} color="#ffd27a" />
                </Pressable>
              )}
            />

            {/* Supplier chain tracker field */}
            <Text style={styles.formInputLabel}>Supplier Source Vendor</Text>
            <Controller
              control={form.control}
              name="supplier"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.formInputBox} placeholder="e.g. Enterprise Logistics Group" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
              )}
            />

            {/* --- CORE ASSET CONFIGS SUBFORM PATH --- */}
            {createInventoryType === "asset" && (
              <View style={styles.subFormGroupWrapper}>
                <Text style={styles.subFormHeaderTitle}>Asset Parameters Schema</Text>
                
                <Text style={styles.formInputLabel}>Brand Manufacturer</Text>
                <Controller control={form.control} name="brand" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholder="e.g. Samsung / Bosch" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Model Identifier Reference</Text>
                <Controller control={form.control} name="model" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholder="e.g. MOD-X900" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Hardware Serial Token Tag</Text>
                <Controller control={form.control} name="serialNumber" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholder="e.g. SN-8917264A" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <View style={styles.formInlineRowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Property Type</Text>
                    <Controller control={form.control} name="propertyType" render={({ field: { value } }) => (
                      <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "propertyType", isEdit: false })}>
                        <Text style={styles.formInlineSelectorText}>{String(value).toUpperCase()}</Text>
                        <ChevronDown size={14} color="#ffd27a" />
                      </Pressable>
                    )} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Condition State</Text>
                    <Controller control={form.control} name="conditionStatus" render={({ field: { value } }) => (
                      <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "conditionStatus", isEdit: false })}>
                        <Text style={styles.formInlineSelectorText}>{String(value).toUpperCase()}</Text>
                        <ChevronDown size={14} color="#ffd27a" />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={styles.formInputLabel}>Purchase Date (YYYY-MM-DD)</Text>
                <Controller control={form.control} name="purchaseDate" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholder="e.g. 2026-01-15" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Warranty Until Date (YYYY-MM-DD)</Text>
                <Controller control={form.control} name="warrantyUntil" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholder="e.g. 2029-12-31" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />
              </View>
            )}

            {/* --- CONSUMABLE METRICS SUBFORM PATH --- */}
            {createInventoryType === "consumable" && (
              <View style={styles.subFormGroupWrapper}>
                <Text style={styles.subFormHeaderTitle}>Consumable Auditing Schema</Text>

                <View style={styles.formInlineRowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Stock Quantity Volume</Text>
                    <Controller control={form.control} name="quantity" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={styles.formInputBox} placeholder="0" placeholderTextColor="#52525b" value={String(value ?? "")} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Unit Scale Classification</Text>
                    <Controller control={form.control} name="unitType" render={({ field: { value } }) => (
                      <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "unitType", isEdit: false })}>
                        <Text style={styles.formInlineSelectorText}>{String(value).toUpperCase()}</Text>
                        <ChevronDown size={14} color="#ffd27a" />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={styles.formInputLabel}>Reorder Point Alert Threshold</Text>
                <Controller control={form.control} name="reorderPoint" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={styles.formInputBox} placeholder="10" placeholderTextColor="#52525b" value={String(value ?? "")} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Daily Usage Rate Velocity</Text>
                <Controller control={form.control} name="dailyUsageRate" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={styles.formInputBox} placeholder="2" placeholderTextColor="#52525b" value={String(value ?? "")} onChangeText={onChange} />
                )} />
              </View>
            )}

            {/* --- COMMERCIAL SELLABLE SUBFORM PATH --- */}
            {createInventoryType === "sellable" && (
              <View style={styles.subFormGroupWrapper}>
                <Text style={styles.subFormHeaderTitle}>Commercial Retailing Schema</Text>

                <Text style={styles.formInputLabel}>Retail SKU Code Identifier</Text>
                <Controller control={form.control} name="sku" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholder="e.g. SKU-REFR-901" placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <View style={styles.formInlineRowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Base Acquisition Cost ($)</Text>
                    <Controller control={form.control} name="costPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={styles.formInputBox} placeholder="0.00" placeholderTextColor="#52525b" value={String(value ?? "")} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Market Outbound Price ($)</Text>
                    <Controller control={form.control} name="sellingPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={styles.formInputBox} placeholder="0.00" placeholderTextColor="#52525b" value={String(value ?? "")} onChangeText={onChange} />
                    )} />
                  </View>
                </View>
              </View>
            )}

            {/* Hardware Media Document Photo Asset Attachments */}
            <Text style={styles.formInputLabel}>Hardware Tag Photo File Verification</Text>
            <Controller
              control={form.control}
              name="tagPhotoFileName"
              render={({ field: { value } }) => (
                <View style={styles.photoPickerContainerBox}>
                  {form.watch("tagPhotoDataUrl") ? (
                    <Image source={{ uri: form.watch("tagPhotoDataUrl") }} style={styles.formMediaAssetPreviewImage} />
                  ) : (
                    <View style={styles.formMediaAssetPlaceholderBox}>
                      <FileImage size={24} color="#71717a" />
                      <Text style={{ color: "#71717a", fontSize: 12, marginTop: 4 }}>No Active Photo Asset Uploaded</Text>
                    </View>
                  )}
                  <Pressable style={styles.formSelectMediaButtonTrigger} onPress={() => handlePickDocument(false)}>
                    <Text style={styles.formSelectMediaButtonText}>{value ? `Replace: ${value}` : "Upload Document Media"}</Text>
                  </Pressable>
                </View>
              )}
            />

            {/* Submit Action Block Row */}
            <Pressable 
              style={[styles.formActionSubmitBtn, createApplianceMutation.isPending && { opacity: 0.7 }]} 
              onPress={form.handleSubmit((values) => createApplianceMutation.mutate(values))}
              disabled={createApplianceMutation.isPending}
            >
              {createApplianceMutation.isPending ? (
                <ActivityIndicator color="#09090b" />
              ) : (
                <Text style={styles.formActionSubmitBtnText}>Authorize Database Provisioning</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* --- MODAL 5: COMPLETE ASSET INTAKE SYSTEM (EDIT MODE) --- */}
      <Modal visible={isEditOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsEditOpen(false)}>
        <SafeAreaView style={styles.modalViewport}>
          <View style={styles.modalTopNavigation}>
            <Text style={styles.modalHeaderTitle}>Modify Equipment Record</Text>
            <Pressable style={styles.modalCloseBtn} onPress={() => setIsEditOpen(false)}>
              <X size={20} color="#fff" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.formScrollContainer}>
            <Text style={styles.formInputLabel}>Appliance Designation Name *</Text>
            <Controller
              control={editForm.control}
              name="name"
              render={({ field: { onChange, value }, fieldState: { error } }) => (
                <View>
                  <TextInput style={styles.formInputBox} placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                  {error && <Text style={styles.formErrorText}>{error.message}</Text>}
                </View>
              )}
            />

            <View style={styles.formInlineRowInputs}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>Inventory Type</Text>
                <Controller
                  control={editForm.control}
                  name="inventoryType"
                  render={({ field: { value } }) => (
                    <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "inventoryType", isEdit: true })}>
                      <Text style={styles.formInlineSelectorText}>{value?.toUpperCase()}</Text>
                      <ChevronDown size={14} color="#ffd27a" />
                    </Pressable>
                  )}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.formInputLabel}>Status State</Text>
                <Controller
                  control={editForm.control}
                  name="status"
                  render={({ field: { value } }) => (
                    <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "status", isEdit: true })}>
                      <Text style={styles.formInlineSelectorText}>{value?.replace("-", " ").toUpperCase()}</Text>
                      <ChevronDown size={14} color="#ffd27a" />
                    </Pressable>
                  )}
                />
              </View>
            </View>

            <Text style={styles.formInputLabel}>Facility Location Area *</Text>
            <Controller
              control={editForm.control}
              name="location"
              render={({ field: { value }, fieldState: { error } }) => (
                <View>
                  <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "location", isEdit: true })}>
                    <Text style={styles.formInlineSelectorText}>{resolveLocationName(value)}</Text>
                    <ChevronDown size={14} color="#ffd27a" />
                  </Pressable>
                  {error && <Text style={styles.formErrorText}>{error.message}</Text>}
                </View>
              )}
            />

            <Text style={styles.formInputLabel}>Assigned Custodian / Employee</Text>
            <Controller
              control={editForm.control}
              name="assignedTo"
              render={({ field: { value } }) => (
                <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "employee", isEdit: true })}>
                  <Text style={styles.formInlineSelectorText}>{resolveEmployeeName(value || "")}</Text>
                  <ChevronDown size={14} color="#ffd27a" />
                </Pressable>
              )}
            />

            <Text style={styles.formInputLabel}>Supplier Source Vendor</Text>
            <Controller
              control={editForm.control}
              name="supplier"
              render={({ field: { onChange, value } }) => (
                <TextInput style={styles.formInputBox} placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
              )}
            />

            {/* --- EDIT ASSET DYNAMIC SUBFORMS PATH --- */}
            {editInventoryType === "asset" && (
              <View style={styles.subFormGroupWrapper}>
                <Text style={styles.subFormHeaderTitle}>Asset Parameters Schema</Text>
                
                <Text style={styles.formInputLabel}>Brand Manufacturer</Text>
                <Controller control={editForm.control} name="brand" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Model Identifier Reference</Text>
                <Controller control={editForm.control} name="model" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Hardware Serial Token Tag</Text>
                <Controller control={editForm.control} name="serialNumber" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <View style={styles.formInlineRowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Property Type</Text>
                    <Controller control={editForm.control} name="propertyType" render={({ field: { value } }) => (
                      <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "propertyType", isEdit: true })}>
                        <Text style={styles.formInlineSelectorText}>{String(value || "").toUpperCase()}</Text>
                        <ChevronDown size={14} color="#ffd27a" />
                      </Pressable>
                    )} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Condition State</Text>
                    <Controller control={editForm.control} name="conditionStatus" render={({ field: { value } }) => (
                      <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "conditionStatus", isEdit: true })}>
                        <Text style={styles.formInlineSelectorText}>{String(value || "").toUpperCase()}</Text>
                        <ChevronDown size={14} color="#ffd27a" />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={styles.formInputLabel}>Purchase Date (YYYY-MM-DD)</Text>
                <Controller control={editForm.control} name="purchaseDate" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Warranty Until Date (YYYY-MM-DD)</Text>
                <Controller control={editForm.control} name="warrantyUntil" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} placeholderTextColor="#52525b" value={value} onChangeText={onChange} />
                )} />
              </View>
            )}

            {editInventoryType === "consumable" && (
              <View style={styles.subFormGroupWrapper}>
                <Text style={styles.subFormHeaderTitle}>Consumable Auditing Schema</Text>
                <View style={styles.formInlineRowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Stock Quantity Volume</Text>
                    <Controller control={editForm.control} name="quantity" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={styles.formInputBox} value={String(value ?? 0)} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Unit Scale Classification</Text>
                    <Controller control={editForm.control} name="unitType" render={({ field: { value } }) => (
                      <Pressable style={styles.formInlineSelectorTrigger} onPress={() => setActivePickerField({ type: "unitType", isEdit: true })}>
                        <Text style={styles.formInlineSelectorText}>{String(value || "").toUpperCase()}</Text>
                        <ChevronDown size={14} color="#ffd27a" />
                      </Pressable>
                    )} />
                  </View>
                </View>

                <Text style={styles.formInputLabel}>Reorder Point Alert Threshold</Text>
                <Controller control={editForm.control} name="reorderPoint" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={styles.formInputBox} value={String(value ?? 0)} onChangeText={onChange} />
                )} />

                <Text style={styles.formInputLabel}>Daily Usage Rate Velocity</Text>
                <Controller control={editForm.control} name="dailyUsageRate" render={({ field: { onChange, value } }) => (
                  <TextInput keyboardType="numeric" style={styles.formInputBox} value={String(value ?? 0)} onChangeText={onChange} />
                )} />
              </View>
            )}

            {editInventoryType === "sellable" && (
              <View style={styles.subFormGroupWrapper}>
                <Text style={styles.subFormHeaderTitle}>Commercial Retailing Schema</Text>
                <Text style={styles.formInputLabel}>Retail SKU Code Identifier</Text>
                <Controller control={editForm.control} name="sku" render={({ field: { onChange, value } }) => (
                  <TextInput style={styles.formInputBox} value={value} onChangeText={onChange} />
                )} />

                <View style={styles.formInlineRowInputs}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Base Acquisition Cost ($)</Text>
                    <Controller control={editForm.control} name="costPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={styles.formInputBox} value={String(value ?? 0)} onChangeText={onChange} />
                    )} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.formInputLabel}>Market Outbound Price ($)</Text>
                    <Controller control={editForm.control} name="sellingPrice" render={({ field: { onChange, value } }) => (
                      <TextInput keyboardType="numeric" style={styles.formInputBox} value={String(value ?? 0)} onChangeText={onChange} />
                    )} />
                  </View>
                </View>
              </View>
            )}

            <Text style={styles.formInputLabel}>Hardware Tag Photo File Verification</Text>
            <Controller
              control={editForm.control}
              name="tagPhotoFileName"
              render={({ field: { value } }) => (
                <View style={styles.photoPickerContainerBox}>
                  {editForm.watch("tagPhotoDataUrl") ? (
                    <Image source={{ uri: editForm.watch("tagPhotoDataUrl") }} style={styles.formMediaAssetPreviewImage} />
                  ) : (
                    <View style={styles.formMediaAssetPlaceholderBox}>
                      <FileImage size={24} color="#71717a" />
                      <Text style={{ color: "#71717a", fontSize: 12, marginTop: 4 }}>No Active Photo Asset Uploaded</Text>
                    </View>
                  )}
                  <Pressable style={styles.formSelectMediaButtonTrigger} onPress={() => handlePickDocument(true)}>
                    <Text style={styles.formSelectMediaButtonText}>{value ? `Replace: ${value}` : "Upload Document Media"}</Text>
                  </Pressable>
                </View>
              )}
            />

            <Pressable 
              style={[styles.formActionSubmitBtn, updateApplianceMutation.isPending && { opacity: 0.7 }]} 
              onPress={editForm.handleSubmit((values) => selectedAppliance && updateApplianceMutation.mutate({ id: selectedAppliance.id, payload: values }))}
              disabled={updateApplianceMutation.isPending}
            >
              {updateApplianceMutation.isPending ? (
                <ActivityIndicator color="#09090b" />
              ) : (
                <Text style={styles.formActionSubmitBtnText}>Commit Parameter Changes</Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* --- REUSABLE DROPDOWN SELECT OPTIONS SHEET MODAL --- */}
      <Modal visible={activePickerField !== null} transparent animationType="fade" onRequestClose={() => setActivePickerField(null)}>
        <Pressable style={styles.dropdownModalOverlay} onPress={() => setActivePickerField(null)}>
          <View style={styles.dropdownModalContent}>
            <Text style={styles.dropdownModalTitle}>Select Value Parameter</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {renderPickerOptions()?.map((opt: any) => {
                const targetForm = activePickerField?.isEdit ? editForm : form;
                const fieldName = activePickerField?.type as any;
                const isSelected = targetForm.getValues(fieldName) === opt.value;

                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.dropdownOptionRow, isSelected && styles.dropdownOptionRowActive]}
                    onPress={() => {
                      targetForm.setValue(fieldName, opt.value);
                      setActivePickerField(null);
                    }}
                  >
                    <Text style={[styles.dropdownOptionText, isSelected && styles.dropdownOptionTextActive]}>{opt.label}</Text>
                    {isSelected && <Check size={16} color="#ffd27a" />}
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

// --- Stylesheet Architecture Optimizations For Deep Zinc/Gold Schemes ---
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fafafa",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#71717a",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    backgroundColor: "#ffd27a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  addButtonText: {
    color: "#09090b",
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
    backgroundColor: "#18181b",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#27272a",
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
    color: "#fafafa",
  },
  layoutToggleRow: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    padding: 2,
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: "#27272a",
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
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    height: 34,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  dropdownTriggerLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#e4e4e7",
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
    color: "#71717a",
    fontSize: 13,
  },
  cardRow: {
    backgroundColor: "#18181b",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
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
    backgroundColor: "#27272a",
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
    color: "#fafafa",
  },
  itemMetaLabel: {
    fontSize: 11,
    color: "#71717a",
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
    borderTopColor: "#27272a",
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
    color: "#a1a1aa",
    maxWidth: width * 0.38,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridBlock: {
    width: (width - 40) / 2,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 4,
  },
  gridHeaderCover: {
    width: "100%",
    height: 90,
    backgroundColor: "#27272a",
  },
  iconBoxBgGrid: {
    width: "100%",
    height: 90,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardContentWrapper: {
    padding: 10,
    gap: 2,
  },
  gridLocationText: {
    fontSize: 11,
    color: "#71717a",
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
  // Global Operational Style Mappings
  operational: { color: "#34d399", backgroundColor: "#064e3b" },
  "needs-repair": { color: "#fbbf24", backgroundColor: "#78350f" },
  "out-of-service": { color: "#f87171", backgroundColor: "#7f1d1d" },

  statsSummaryFooter: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    borderTopWidth: 1,
    borderColor: "#27272a",
    padding: 12,
    justifyContent: "space-between",
    alignItems: "center",
  },
  statsSummaryText: {
    color: "#f4f4f5",
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
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownModalContent: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    width: width * 0.82,
    borderRadius: 8,
    paddingVertical: 12,
  },
  dropdownModalTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#71717a",
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
    backgroundColor: "#27272a",
  },
  dropdownOptionText: {
    fontSize: 13,
    color: "#e4e4e7",
  },
  dropdownOptionTextActive: {
    color: "#ffd27a",
    fontWeight: "600",
  },
  modalViewport: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  modalTopNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#27272a",
    backgroundColor: "#18181b",
  },
  modalHeaderTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fafafa",
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
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderColor: "#27272a",
  },
  detailCard: {
    padding: 16,
  },
  detailMainName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fafafa",
  },
  detailSubId: {
    fontSize: 11,
    color: "#71717a",
    marginTop: 4,
  },
  specDivider: {
    height: 1,
    backgroundColor: "#27272a",
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
    color: "#71717a",
    textTransform: "uppercase",
  },
  specValue: {
    fontSize: 13,
    color: "#e4e4e7",
    marginTop: 2,
    fontWeight: "500",
  },
  sectionFormGroupTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#ffd27a",
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
    backgroundColor: "#ffd27a",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnEditText: {
    color: "#09090b",
    fontWeight: "600",
    fontSize: 13,
  },
  actionBtnDelete: {
    flex: 1,
    flexDirection: "row",
    height: 40,
    backgroundColor: "#7f1d1d",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnDeleteText: {
    color: "#fff",
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
    color: "#a1a1aa",
    marginTop: 12,
    marginBottom: 6,
  },
  formInputBox: {
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    height: 38,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#fafafa",
  },
  formInlineRowInputs: {
    flexDirection: "row",
    gap: 10,
  },
  formInlineSelectorTrigger: {
    flexDirection: "row",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    height: 38,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  formInlineSelectorText: {
    fontSize: 13,
    color: "#fafafa",
  },
  subFormGroupWrapper: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#141416",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#27272a",
  },
  subFormHeaderTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffd27a",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  photoPickerContainerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#27272a",
    borderRadius: 6,
    padding: 8,
    gap: 12,
  },
  formMediaAssetPreviewImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: "#27272a",
  },
  formMediaAssetPlaceholderBox: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: "#27272a",
    alignItems: "center",
    justifyContent: "center",
  },
  formSelectMediaButtonTrigger: {
    flex: 1,
    backgroundColor: "#27272a",
    borderRadius: 4,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  formSelectMediaButtonText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "500",
    paddingHorizontal: 8,
  },
  formActionSubmitBtn: {
    backgroundColor: "#ffd27a",
    borderRadius: 6,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  formActionSubmitBtnText: {
    color: "#09090b",
    fontWeight: "700",
    fontSize: 13,
  },
  formErrorText: {
    fontSize: 11,
    color: "#ef4444",
    marginTop: 3,
  },
});