import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Wrench,
  Power,
  AlertTriangle,
  Calendar,
  Home,
  Building2,
  User,
  ChevronDown,
  X,
  FileText,
} from "lucide-react-native";
import { listResource, apiFetch } from "@/lib/admin/apiClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Appliance {
  id: string;
  frontendId: string;
  inventoryType: "asset" | "consumable" | "sellable";
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  location: string;
  status: string;
  photoFileName?: string;
  photoDataUrl?: string;
  assignedTo?: string;
  supplier?: string;
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
  tagPhotoFileName?: string;
  tagPhotoDataUrl?: string;
}

interface Employee {
  id: string;
  name: string;
  initials: string;
  email: string;
  status: "active" | "inactive" | "on-leave";
}

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
  status: "active" | "inactive" | "pending";
}

interface Location {
  id: string;
  name: string;
  city?: string;
}

type ActiveTab = "all" | Appliance["inventoryType"];

const getInitials = (name: string): string =>
  String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const extractArray = <T,>(response: unknown, extraKeys: string[] = []): T[] => {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    for (const key of ["data", "items", ...extraKeys]) {
      if (Array.isArray(r[key])) return r[key] as T[];
    }
  }
  return [];
};

const typeColors = {
  asset:      { bg: "rgba(59,130,246,0.12)",  text: "#3b82f6",  border: "rgba(59,130,246,0.25)"  },
  consumable: { bg: "rgba(34,197,94,0.12)",   text: "#22c55e",  border: "rgba(34,197,94,0.25)"   },
  sellable:   { bg: "rgba(245,158,11,0.12)",  text: "#f59e0b",  border: "rgba(245,158,11,0.25)"  },
} as const;

function buildColors(uiTheme: ReturnType<typeof useTheme>["uiTheme"], isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground    || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    headerBg:         isDark ? "#1E293B" : "#FFFFFF",
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
    primaryBorder:    isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.3)",
    activeBadgeBg:    isDark ? "rgba(16,185,129,0.15)"  : "#DCFCE7",
    activeBadgeText:  isDark ? "#34D399"  : "#15803D",
    inactiveBadgeBg:  isDark ? "rgba(100,116,139,0.15)" : "#F1F5F9",
    inactiveBadgeText:isDark ? "#94A3B8"  : "#475569",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)"  : "#FEE2E2",
    dangerBorder:     "rgba(239,68,68,0.25)",
    dangerText:       isDark ? "#FCA5A5" : "#DC2626",
    danger:           "#EF4444",
    sheetBg:          isDark ? "#1E293B" : "#FFFFFF",
    white:            "#FFFFFF",
    overlayBg:        "rgba(0,0,0,0.6)",
  };
}

type Colors = ReturnType<typeof buildColors>;

const emptyForm = {
  inventoryType: "asset" as Appliance["inventoryType"],
  name: "",
  brand: "",
  model: "",
  serialNumber: "",
  location: "",
  photoFileName: "",
  photoDataUrl: "",
  assignedTo: "",
  supplier: "",
  propertyType: "commercial" as "commercial" | "residential",
  purchaseDate: "",
  warrantyUntil: "",
  conditionStatus: "good" as "excellent" | "good" | "fair" | "damaged",
  quantity: "",
  unitType: "pieces" as "pieces" | "boxes" | "liters" | "kg",
  reorderPoint: "",
  dailyUsageRate: "",
  sku: "",
  costPrice: "",
  sellingPrice: "",
  status: "active",
};

type FormData = typeof emptyForm;

function PickerModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  colors,
  styles,
}: {
  visible: boolean;
  options: { label: string; value: string }[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.pickerRow, selected === opt.value && styles.pickerRowSelected]}
                onPress={() => { onSelect(opt.value); onClose(); }}
              >
                <Text style={[styles.pickerRowText, selected === opt.value && { color: colors.primary, fontWeight: "700" }]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: Colors }) {
  return <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: 6, marginTop: 14 }}>{label}</Text>;
}

function StyledInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  styles,
  colors,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.inputMultiline]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholderText}
      keyboardType={keyboardType ?? "default"}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      textAlignVertical={multiline ? "top" : "center"}
    />
  );
}

function TypeBadge({ type }: { type: Appliance["inventoryType"] }) {
  const c = typeColors[type];
  return (
    <View style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" }}>
      <Text style={{ color: c.text, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{type}</Text>
    </View>
  );
}

function StatusBadge({ status, colors }: { status: string; colors: Colors }) {
  const isActive = status === "active";
  return (
    <View style={{
      backgroundColor: isActive ? colors.activeBadgeBg : colors.inactiveBadgeBg,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start",
      flexDirection: "row", alignItems: "center", gap: 4,
    }}>
      {isActive
        ? <Power size={10} color={colors.activeBadgeText} />
        : <AlertTriangle size={10} color={colors.inactiveBadgeText} />}
      <Text style={{ color: isActive ? colors.activeBadgeText : colors.inactiveBadgeText, fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>
        {status}
      </Text>
    </View>
  );
}

function DetailRow({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.textMuted, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary }}>{value || "—"}</Text>
    </View>
  );
}

export default function Appliances() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery]     = useState("");
  const [activeTab, setActiveTab]         = useState<ActiveTab>("all");
  const [addOpen, setAddOpen]             = useState(false);
  const [viewOpen, setViewOpen]           = useState(false);
  const [editOpen, setEditOpen]           = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selected, setSelected]           = useState<Appliance | null>(null);
  const [employees, setEmployees]         = useState<Employee[]>([]);
  const [formData, setFormData]           = useState<FormData>(emptyForm);
  const [editFormData, setEditFormData]   = useState<FormData>(emptyForm);
  const [apiError, setApiError]           = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [activePicker, setActivePicker] = useState<{
    field: keyof FormData;
    target: "add" | "edit";    options: { label: string; value: string }[];
  } | null>(null);

  const appliancesQuery = useQuery({
    queryKey: ["appliances"],
    queryFn: async () => {
      const res = await apiFetch<{ items?: unknown[] }>("/api/appliances");
      return res.items || [];
    },
  });

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await apiFetch<{ items?: Location[] } | Location[]>("/api/locations");
      const items = Array.isArray(res) ? res : Array.isArray((res as { items?: Location[] }).items) ? (res as { items: Location[] }).items : [];
      return items.filter((l) => Boolean(l.id));
    },
  });

  const locations: Location[] = locationsQuery.data ?? [];

  const getLocationLabel = (locationIdOrName: string): string => {
    const v = String(locationIdOrName || "").trim();
    if (!v) return "";
    const found = locations.find((l) => l.id === v);
    if (!found) return v;
    return `${found.name}${found.city ? ` (${found.city})` : ""}`;
  };

  const appliancesList = useMemo<Appliance[]>(() => {
    const items = appliancesQuery.data || [];
    return (items as Record<string, unknown>[]).map((a) => ({
      id:             String(a._id || a.id || ""),
      frontendId:     String(a.frontendId || ""),
      inventoryType:  String(a.inventoryType || "asset") as Appliance["inventoryType"],
      name:           String(a.name || ""),
      brand:          String(a.brand || ""),
      model:          String(a.model || ""),
      serialNumber:   String(a.serialNumber || ""),
      location:       String(a.location || ""),
      status:         String(a.status || "active"),
      photoFileName:  String(a.photoFileName || ""),
      photoDataUrl:   String(a.photoDataUrl || (a.photoAttachment as Record<string, unknown>)?.url || ""),
      assignedTo:     String(a.assignedTo || ""),
      supplier:       String(a.supplier || ""),
      propertyType:   (a.propertyType as Appliance["propertyType"]) || "commercial",
      purchaseDate:   String(a.purchaseDate || a.lastMaintenance || ""),
      warrantyUntil:  String(a.warrantyUntil || a.warrantyExpiry || ""),
      conditionStatus:(a.conditionStatus as Appliance["conditionStatus"]) || "good",
      quantity:       Number(a.quantity || 0),
      unitType:       (a.unitType as Appliance["unitType"]) || "pieces",
      reorderPoint:   Number(a.reorderPoint || 0),
      dailyUsageRate: Number(a.dailyUsageRate || 0),
      sku:            String(a.sku || ""),
      costPrice:      Number(a.costPrice || 0),
      sellingPrice:   Number(a.sellingPrice || 0),
      tagPhotoFileName: String(a.tagPhotoFileName || ""),
      tagPhotoDataUrl:  String(a.tagPhotoDataUrl || (a.tagPhotoAttachment as Record<string, unknown>)?.url || ""),
    }));
  }, [appliancesQuery.data]);

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<Appliance, "id" | "frontendId">) => {
      const res = await apiFetch<{ item: unknown }>("/api/appliances", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      return res.item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appliances"] }),
    onError:   (e: unknown) => setApiError(e instanceof Error ? e.message : "Failed to create appliance"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Appliance> }) => {
      const res = await apiFetch<{ item: unknown }>(`/api/appliances/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return res.item;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appliances"] }),
    onError:   (e: unknown) => setApiError(e instanceof Error ? e.message : "Failed to update appliance"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<{ ok: true }>(`/api/appliances/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appliances"] }),
    onError:   (e: unknown) => setApiError(e instanceof Error ? e.message : "Failed to delete appliance"),
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        let all: Employee[] = [];
        try {
          const empList = await listResource<Employee>("employees");
          if (mounted) all = extractArray<Employee>(empList, ["employees"]).filter((e) => e.status === "active");
        } catch { }
        try {
          const userList = await listResource<User>("users");
          if (mounted) {
            const users = extractArray<User>(userList, ["users"])
              .filter((u) => u.role === "employee" && (u.status === "active" || u.status === "pending"))
              .map((u): Employee => ({ id: u.id, name: u.name, initials: getInitials(u.name), email: u.email, status: "active" }));
            users.forEach((eu) => { if (!all.some((e) => e.email === eu.email)) all.push(eu); });
          }
        } catch { }
        if (mounted) setEmployees(all);
      } catch { }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = !q ? appliancesList : appliancesList.filter(
      (a) => a.name.toLowerCase().includes(q) ||
             a.location.toLowerCase().includes(q) ||
             a.inventoryType.toLowerCase().includes(q) ||
             (a.assignedTo && a.assignedTo.toLowerCase().includes(q))
    );
    return activeTab === "all" ? base : base.filter((a) => a.inventoryType === activeTab);
  }, [appliancesList, searchQuery, activeTab]);

  const getPhotoSrc = (a?: Pick<Appliance, "photoDataUrl" | "photoFileName" | "tagPhotoDataUrl" | "tagPhotoFileName"> | null): string | null => {
    if (!a) return null;
    const dataUrl = String(a.photoDataUrl || a.tagPhotoDataUrl || "").trim();
    if (dataUrl) return dataUrl;
    const fileName = String(a.photoFileName || a.tagPhotoFileName || "").trim();
    if (!fileName) return null;
    if (fileName.startsWith("data:") || fileName.startsWith("http") || fileName.startsWith("/")) return fileName;
    return null;
  };

  const pickImage = async (target: "add" | "edit") => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert("Permission required", "Allow media access to upload photos."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    const name = uri.split("/").pop() || "photo.jpg";
    if (target === "add") setFormData((p) => ({ ...p, photoFileName: name, photoDataUrl: uri }));
    else setEditFormData((p) => ({ ...p, photoFileName: name, photoDataUrl: uri }));
  };

  const openPicker = (field: keyof FormData, target: "add" | "edit", title: string, options: { label: string; value: string }[]) => {
    setActivePicker({ field, target, title, options });
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.location) {
      Alert.alert("Required Fields", "Name and location are required.");
      return;
    }
    setApiError(null);
    try {
      await createMutation.mutateAsync({
        inventoryType:  formData.inventoryType,
        name:           formData.name,
        brand:          formData.brand,
        model:          formData.model,
        serialNumber:   formData.serialNumber,
        location:       formData.location,
        status:         formData.status,
        photoFileName:  formData.photoFileName,
        photoDataUrl:   formData.photoDataUrl,
        assignedTo:     formData.assignedTo,
        supplier:       formData.supplier,
        propertyType:   formData.propertyType,
        purchaseDate:   formData.purchaseDate,
        warrantyUntil:  formData.warrantyUntil,
        conditionStatus: formData.conditionStatus,
        quantity:       formData.quantity       ? Number(formData.quantity)       : undefined,
        unitType:       formData.unitType,
        reorderPoint:   formData.reorderPoint   ? Number(formData.reorderPoint)   : undefined,
        dailyUsageRate: formData.dailyUsageRate ? Number(formData.dailyUsageRate) : undefined,
        sku:            formData.sku,
        costPrice:      formData.costPrice      ? Number(formData.costPrice)      : undefined,
        sellingPrice:   formData.sellingPrice   ? Number(formData.sellingPrice)   : undefined,
      });
      setAddOpen(false);
      setFormData(emptyForm);
    } catch { }
  };

  const handleSaveEdit = async () => {
    if (!selected || !editFormData.name || !editFormData.location) {
      Alert.alert("Required Fields", "Name and location are required.");
      return;
    }
    setApiError(null);
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        payload: {
          inventoryType:  editFormData.inventoryType,
          name:           editFormData.name,
          brand:          editFormData.brand,
          model:          editFormData.model,
          serialNumber:   editFormData.serialNumber,
          location:       editFormData.location,
          status:         editFormData.status,
          photoFileName:  editFormData.photoFileName,
          photoDataUrl:   editFormData.photoDataUrl,
          assignedTo:     editFormData.assignedTo,
          supplier:       editFormData.supplier,
          propertyType:   editFormData.propertyType,
          purchaseDate:   editFormData.purchaseDate,
          warrantyUntil:  editFormData.warrantyUntil,
          conditionStatus: editFormData.conditionStatus,
          quantity:       editFormData.quantity       ? Number(editFormData.quantity)       : undefined,
          unitType:       editFormData.unitType,
          reorderPoint:   editFormData.reorderPoint   ? Number(editFormData.reorderPoint)   : undefined,
          dailyUsageRate: editFormData.dailyUsageRate ? Number(editFormData.dailyUsageRate) : undefined,
          sku:            editFormData.sku,
          costPrice:      editFormData.costPrice      ? Number(editFormData.costPrice)      : undefined,
          sellingPrice:   editFormData.sellingPrice   ? Number(editFormData.sellingPrice)   : undefined,
        },
      });
      setEditOpen(false);
      setSelected(null);
    } catch { }
  };

  const handleToggleStatus = async () => {
    if (!selected) return;
    setApiError(null);
    try {
      await updateMutation.mutateAsync({ id: selected.id, payload: { status: selected.status === "inactive" ? "active" : "inactive" } });
      setDeactivateOpen(false);
      setSelected(null);
    } catch { }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setApiError(null);
    try {
      await deleteMutation.mutateAsync(selected.id);
      setDeleteOpen(false);
      setSelected(null);
    } catch { }
  };

  const openActionMenu = (item: Appliance) => { setSelected(item); setActionMenuOpen(true); };

  const tabOptions: { key: ActiveTab; label: string }[] = [
    { key: "all",        label: "All"         },
    { key: "asset",      label: "Assets"      },
    { key: "consumable", label: "Consumables" },
    { key: "sellable",   label: "Sellables"   },
  ];

  const inventoryTypeOptions    = [{ label: "Asset", value: "asset" }, { label: "Consumable", value: "consumable" }, { label: "Sellable", value: "sellable" }];
  const propertyTypeOptions     = [{ label: "Commercial", value: "commercial" }, { label: "Residential", value: "residential" }];
  const conditionOptions        = [{ label: "Excellent", value: "excellent" }, { label: "Good", value: "good" }, { label: "Fair", value: "fair" }, { label: "Damaged", value: "damaged" }];
  const unitTypeOptions         = [{ label: "Pieces", value: "pieces" }, { label: "Boxes", value: "boxes" }, { label: "Liters", value: "liters" }, { label: "Kg", value: "kg" }];
  const assetStatusOptions      = [{ label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }, { label: "Maintenance", value: "maintenance" }, { label: "Retired", value: "retired" }];
  const consumableStatusOptions = [{ label: "In Stock", value: "In Stock" }, { label: "Low Stock", value: "Low Stock" }, { label: "Out of Stock", value: "Out of Stock" }];
  const sellableStatusOptions   = [{ label: "Available", value: "Available" }, { label: "Low Stock", value: "Low Stock" }, { label: "Out of Stock", value: "Out of Stock" }, { label: "Discontinued", value: "Discontinued" }];
  const locationOptions         = locations.map((l) => ({ label: `${l.name}${l.city ? ` (${l.city})` : ""}`, value: l.id }));
  const employeeOptions         = [{ label: "Unassigned", value: "" }, ...employees.map((e) => ({ label: e.name, value: e.name }))];

  const renderFormFields = (fd: FormData, setFd: (f: FormData) => void, target: "add" | "edit") => {
    const nameLabelMap = { asset: "Asset Name *", consumable: "Item Name *", sellable: "Product Name *" };
    return (
      <>
        <FieldLabel label="Inventory Type *" colors={colors} />
        <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("inventoryType", target, "Inventory Type", inventoryTypeOptions)}>
          <Text style={styles.pickerBtnText}>{inventoryTypeOptions.find((o) => o.value === fd.inventoryType)?.label ?? fd.inventoryType}</Text>
          <ChevronDown size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <FieldLabel label={nameLabelMap[fd.inventoryType]} colors={colors} />
        <StyledInput value={fd.name} onChangeText={(t) => setFd({ ...fd, name: t })} placeholder="Enter name" styles={styles} colors={colors} />

        <FieldLabel label="Brand" colors={colors} />
        <StyledInput value={fd.brand} onChangeText={(t) => setFd({ ...fd, brand: t })} placeholder="e.g. Samsung" styles={styles} colors={colors} />

        <FieldLabel label="Model" colors={colors} />
        <StyledInput value={fd.model} onChangeText={(t) => setFd({ ...fd, model: t })} placeholder="e.g. WF45T6000AW" styles={styles} colors={colors} />

        <FieldLabel label="Location *" colors={colors} />
        <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("location", target, "Location", locationOptions.length ? locationOptions : [{ label: "No locations found", value: "" }])}>
          <Text style={styles.pickerBtnText}>{locationOptions.find((o) => o.value === fd.location)?.label || "Select location..."}</Text>
          <ChevronDown size={16} color={colors.textMuted} />
        </TouchableOpacity>

        {fd.inventoryType === "asset" && (
          <>
            <FieldLabel label="Serial Number" colors={colors} />
            <StyledInput value={fd.serialNumber} onChangeText={(t) => setFd({ ...fd, serialNumber: t })} placeholder="SN-XXXX" styles={styles} colors={colors} />

            <FieldLabel label="Assigned To" colors={colors} />
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("assignedTo", target, "Assigned To", employeeOptions)}>
              <Text style={styles.pickerBtnText}>{fd.assignedTo || "Select assignee..."}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <FieldLabel label="Property Type" colors={colors} />
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("propertyType", target, "Property Type", propertyTypeOptions)}>
              <Text style={styles.pickerBtnText}>{propertyTypeOptions.find((o) => o.value === fd.propertyType)?.label ?? fd.propertyType}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <FieldLabel label="Purchase Date" colors={colors} />
            <StyledInput value={fd.purchaseDate} onChangeText={(t) => setFd({ ...fd, purchaseDate: t })} placeholder="YYYY-MM-DD" styles={styles} colors={colors} />

            <FieldLabel label="Warranty Until" colors={colors} />
            <StyledInput value={fd.warrantyUntil} onChangeText={(t) => setFd({ ...fd, warrantyUntil: t })} placeholder="YYYY-MM-DD" styles={styles} colors={colors} />

            <FieldLabel label="Condition Status" colors={colors} />
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("conditionStatus", target, "Condition Status", conditionOptions)}>
              <Text style={styles.pickerBtnText}>{conditionOptions.find((o) => o.value === fd.conditionStatus)?.label ?? fd.conditionStatus}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <FieldLabel label="Asset Status" colors={colors} />
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("status", target, "Asset Status", assetStatusOptions)}>
              <Text style={styles.pickerBtnText}>{assetStatusOptions.find((o) => o.value === fd.status)?.label ?? fd.status}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {fd.inventoryType === "consumable" && (
          <>
            <FieldLabel label="Quantity *" colors={colors} />
            <StyledInput value={fd.quantity} onChangeText={(t) => setFd({ ...fd, quantity: t })} placeholder="0" keyboardType="numeric" styles={styles} colors={colors} />

            <FieldLabel label="Unit Type" colors={colors} />
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("unitType", target, "Unit Type", unitTypeOptions)}>
              <Text style={styles.pickerBtnText}>{unitTypeOptions.find((o) => o.value === fd.unitType)?.label ?? fd.unitType}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <FieldLabel label="Supplier" colors={colors} />
            <StyledInput value={fd.supplier} onChangeText={(t) => setFd({ ...fd, supplier: t })} placeholder="Supplier name" styles={styles} colors={colors} />

            <FieldLabel label="Reorder Point *" colors={colors} />
            <StyledInput value={fd.reorderPoint} onChangeText={(t) => setFd({ ...fd, reorderPoint: t })} placeholder="0" keyboardType="numeric" styles={styles} colors={colors} />

            <FieldLabel label="Daily Usage Rate" colors={colors} />
            <StyledInput value={fd.dailyUsageRate} onChangeText={(t) => setFd({ ...fd, dailyUsageRate: t })} placeholder="0" keyboardType="numeric" styles={styles} colors={colors} />

            <FieldLabel label="Status" colors={colors} />
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("status", target, "Status", consumableStatusOptions)}>
              <Text style={styles.pickerBtnText}>{consumableStatusOptions.find((o) => o.value === fd.status)?.label ?? fd.status}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {fd.inventoryType === "sellable" && (
          <>
            <FieldLabel label="SKU *" colors={colors} />
            <StyledInput value={fd.sku} onChangeText={(t) => setFd({ ...fd, sku: t })} placeholder="SKU-001" styles={styles} colors={colors} />

            <FieldLabel label="Quantity *" colors={colors} />
            <StyledInput value={fd.quantity} onChangeText={(t) => setFd({ ...fd, quantity: t })} placeholder="0" keyboardType="numeric" styles={styles} colors={colors} />

            <FieldLabel label="Cost Price *" colors={colors} />
            <StyledInput value={fd.costPrice} onChangeText={(t) => setFd({ ...fd, costPrice: t })} placeholder="0.00" keyboardType="numeric" styles={styles} colors={colors} />

            <FieldLabel label="Selling Price *" colors={colors} />
            <StyledInput value={fd.sellingPrice} onChangeText={(t) => setFd({ ...fd, sellingPrice: t })} placeholder="0.00" keyboardType="numeric" styles={styles} colors={colors} />

            <FieldLabel label="Supplier" colors={colors} />
            <StyledInput value={fd.supplier} onChangeText={(t) => setFd({ ...fd, supplier: t })} placeholder="Supplier name" styles={styles} colors={colors} />

            <FieldLabel label="Reorder Point" colors={colors} />
            <StyledInput value={fd.reorderPoint} onChangeText={(t) => setFd({ ...fd, reorderPoint: t })} placeholder="0" keyboardType="numeric" styles={styles} colors={colors} />

            <FieldLabel label="Status" colors={colors} />
            <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker("status", target, "Status", sellableStatusOptions)}>
              <Text style={styles.pickerBtnText}>{sellableStatusOptions.find((o) => o.value === fd.status)?.label ?? fd.status}</Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        <FieldLabel label="Photo" colors={colors} />
        <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage(target)}>
          {fd.photoDataUrl ? (
            <Image source={{ uri: fd.photoDataUrl }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <FileText size={20} color={colors.textMuted} />
              <Text style={styles.photoPlaceholderText}>{fd.photoFileName || "Tap to select photo"}</Text>
            </View>
          )}
        </TouchableOpacity>
        {fd.photoDataUrl ? (
          <TouchableOpacity
            style={styles.removePhotoBtn}
            onPress={() => setFd({ ...fd, photoFileName: "", photoDataUrl: "" })}
          >
            <Text style={styles.removePhotoBtnText}>Remove Photo</Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
  };

  const renderViewContent = (a: Appliance) => (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.viewName}>{a.name}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16, marginTop: 4 }}>
        {a.brand ? <View style={styles.metaChip}><Text style={styles.metaChipText}>Brand: {a.brand}</Text></View> : null}
        {a.model ? <View style={styles.metaChip}><Text style={styles.metaChipText}>Model: {a.model}</Text></View> : null}
        {a.serialNumber ? <View style={styles.metaChip}><Text style={styles.metaChipText}>SN: {a.serialNumber}</Text></View> : null}
      </View>
      <View style={styles.divider} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <View>
          <Text style={styles.detailLabel}>Inventory Type</Text>
          <TypeBadge type={a.inventoryType} />
        </View>
        <View>
          <Text style={styles.detailLabel}>Status</Text>
          <StatusBadge status={a.status} colors={colors} />
        </View>
      </View>

      <DetailRow label="Location" value={getLocationLabel(a.location)} colors={colors} />
      {a.assignedTo ? (
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.detailLabel}>Assigned To</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <User size={14} color={colors.textMuted} />
            <Text style={{ fontSize: 14, color: colors.textSecondary }}>{a.assignedTo}</Text>
          </View>
        </View>
      ) : null}

      {a.inventoryType === "asset" && (
        <>
          <DetailRow label="Property Type"   value={a.propertyType || "—"}     colors={colors} />
          <DetailRow label="Purchase Date"   value={a.purchaseDate || "—"}     colors={colors} />
          <DetailRow label="Warranty Until"  value={a.warrantyUntil || "—"}    colors={colors} />
          <DetailRow label="Condition Status" value={a.conditionStatus || "—"} colors={colors} />
        </>
      )}
      {a.inventoryType === "consumable" && (
        <>
          <DetailRow label="Quantity"        value={typeof a.quantity === "number" ? String(a.quantity) : "—"} colors={colors} />
          <DetailRow label="Unit Type"       value={a.unitType || "—"}         colors={colors} />
          <DetailRow label="Supplier"        value={a.supplier || "—"}         colors={colors} />
          <DetailRow label="Reorder Point"   value={typeof a.reorderPoint === "number" ? String(a.reorderPoint) : "—"} colors={colors} />
          <DetailRow label="Daily Usage Rate" value={typeof a.dailyUsageRate === "number" ? String(a.dailyUsageRate) : "—"} colors={colors} />
        </>
      )}
      {a.inventoryType === "sellable" && (
        <>
          <DetailRow label="SKU"           value={a.sku || "—"}             colors={colors} />
          <DetailRow label="Quantity"      value={typeof a.quantity === "number" ? String(a.quantity) : "—"} colors={colors} />
          <DetailRow label="Cost Price"    value={typeof a.costPrice === "number" ? String(a.costPrice) : "—"} colors={colors} />
          <DetailRow label="Selling Price" value={typeof a.sellingPrice === "number" ? String(a.sellingPrice) : "—"} colors={colors} />
          <DetailRow label="Supplier"      value={a.supplier || "—"}        colors={colors} />
          <DetailRow label="Reorder Point" value={typeof a.reorderPoint === "number" ? String(a.reorderPoint) : "—"} colors={colors} />
        </>
      )}

      <Text style={styles.detailLabel}>Tag Photo</Text>
      {getPhotoSrc(a) ? (
        <Image source={{ uri: getPhotoSrc(a)! }} style={styles.viewPhoto} resizeMode="contain" />
      ) : (
        <Text style={{ fontSize: 14, color: colors.textSecondary }}>—</Text>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerArea}>
        <View style={styles.headerTextBlock}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Wrench size={22} color={colors.primary} />
            <Text style={styles.headerTitle}>Appliances Management</Text>
          </View>
          <Text style={styles.headerSubtitle}>Track appliances, warranties, and assignments by location.</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddOpen(true)}>
          <Plus size={16} color={colors.primaryText} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {apiError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{apiError}</Text>
        </View>
      ) : null}

      <View style={styles.summaryGrid}>
        {[
          { label: "Total Appliances", value: appliancesList.length,                                           color: colors.primary,   icon: <Wrench    size={16} color={colors.primary}  /> },
          { label: "Assets",           value: appliancesList.filter((a) => a.inventoryType === "asset").length, color: "#3b82f6",         icon: <Wrench    size={16} color="#3b82f6"         /> },
          { label: "Consumables",      value: appliancesList.filter((a) => a.inventoryType === "consumable").length, color: "#22c55e",    icon: <Home      size={16} color="#22c55e"         /> },
          { label: "Active",           value: appliancesList.filter((a) => a.status === "active").length,       color: "#10b981",         icon: <Power     size={16} color="#10b981"         /> },
        ].map((card) => (
          <View key={card.label} style={styles.summaryCard}>
            <View style={[styles.summaryIconWrap, { backgroundColor: card.color + "20" }]}>{card.icon}</View>
            <View>
              <Text style={styles.summaryCardLabel}>{card.label}</Text>
              <Text style={styles.summaryCardValue}>{card.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Search size={15} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, location, or assignee..."
            placeholderTextColor={colors.placeholderText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {tabOptions.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabChip, activeTab === tab.key && styles.tabChipActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabChipText, activeTab === tab.key && styles.tabChipTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {appliancesQuery.isLoading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.centerBoxText}>Loading appliances...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Wrench size={36} color={colors.textSubtle} />
              <Text style={styles.emptyTitle}>No appliances found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your search or add a new appliance.</Text>
            </View>
          }
          renderItem={({ item: a }) => {
            const photoSrc = getPhotoSrc(a);
            return (
              <View style={styles.listCard}>
                <View style={styles.listCardRow}>
                  <View style={styles.listCardIcon}>
                    {photoSrc ? (
                      <Image source={{ uri: photoSrc }} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="cover" />
                    ) : (
                      <Wrench size={18} color={colors.primary} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.listCardName} numberOfLines={1}>{a.name}</Text>
                    {(a.brand || a.model) ? (
                      <Text style={styles.listCardMeta} numberOfLines={1}>{[a.brand, a.model].filter(Boolean).join(" • ")}</Text>
                    ) : null}
                    {a.frontendId ? <Text style={styles.listCardId}>ID: {a.frontendId}</Text> : null}
                  </View>
                  <TouchableOpacity style={styles.menuBtn} onPress={() => openActionMenu(a)}>
                    <MoreHorizontal size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.listCardBody}>
                  <View style={styles.listCardBadgeRow}>
                    <TypeBadge type={a.inventoryType} />
                    <StatusBadge status={a.status} colors={colors} />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                    <Building2 size={12} color={colors.textMuted} />
                    <Text style={styles.listCardLocation} numberOfLines={1}>{getLocationLabel(a.location)}</Text>
                  </View>
                  {a.assignedTo ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <User size={12} color={colors.textMuted} />
                      <Text style={styles.listCardAssigned}>{a.assignedTo}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}

      <Modal transparent visible={actionMenuOpen} animationType="slide" onRequestClose={() => setActionMenuOpen(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setActionMenuOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.actionSheetTitle}>{selected?.name}</Text>
            {[
              { label: "View Details",   icon: <Eye    size={18} color={colors.textMuted} />, action: () => { setActionMenuOpen(false); setViewOpen(true); } },
              { label: "Edit",           icon: <Edit   size={18} color={colors.textMuted} />, action: () => {
                setActionMenuOpen(false);
                if (selected) {
                  setEditFormData({
                    inventoryType:  selected.inventoryType,
                    name:           selected.name,
                    brand:          selected.brand          || "",
                    model:          selected.model          || "",
                    serialNumber:   selected.serialNumber   || "",
                    location:       selected.location,
                    photoFileName:  selected.photoFileName  || selected.tagPhotoFileName  || "",
                    photoDataUrl:   selected.photoDataUrl   || selected.tagPhotoDataUrl   || "",
                    assignedTo:     selected.assignedTo     || "",
                    supplier:       selected.supplier       || "",
                    propertyType:   selected.propertyType   || "commercial",
                    purchaseDate:   selected.purchaseDate   || "",
                    warrantyUntil:  selected.warrantyUntil  || "",
                    conditionStatus: selected.conditionStatus || "good",
                    quantity:       String(selected.quantity    ?? ""),
                    unitType:       selected.unitType       || "pieces",
                    reorderPoint:   String(selected.reorderPoint ?? ""),
                    dailyUsageRate: String(selected.dailyUsageRate ?? ""),
                    sku:            selected.sku            || "",
                    costPrice:      String(selected.costPrice   ?? ""),
                    sellingPrice:   String(selected.sellingPrice ?? ""),
                    status:         selected.status,
                  });
                  setEditOpen(true);
                }
              }},
              { label: selected?.status === "inactive" ? "Activate" : "Deactivate", icon: <Power  size={18} color={colors.textMuted} />, action: () => { setActionMenuOpen(false); setDeactivateOpen(true); } },
              { label: "Delete",         icon: <Trash2 size={18} color={colors.danger}    />, action: () => { setActionMenuOpen(false); setDeleteOpen(true);     }, danger: true },
            ].map((row) => (
              <TouchableOpacity key={row.label} style={styles.actionSheetRow} onPress={row.action}>
                {row.icon}
                <Text style={[styles.actionSheetRowText, row.danger && { color: colors.danger }]}>{row.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal transparent visible={viewOpen} animationType="slide" onRequestClose={() => setViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Appliance Details</Text>
              <TouchableOpacity onPress={() => setViewOpen(false)}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {selected ? renderViewContent(selected) : null}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setViewOpen(false)}>
                <Text style={styles.btnPrimaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={addOpen} animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Add Inventory Item</Text>
                <TouchableOpacity onPress={() => setAddOpen(false)}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Create a new inventory record</Text>
              <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                {renderFormFields(formData, setFormData, "add")}
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.btnOutline} onPress={() => setAddOpen(false)}>
                  <Text style={styles.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleAdd} disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <Text style={styles.btnPrimaryText}>Add Item</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalHeaderTitle}>Edit Appliance</Text>
                <TouchableOpacity onPress={() => setEditOpen(false)}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>Update appliance information and save changes</Text>
              <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
                {renderFormFields(editFormData, setEditFormData, "edit")}
              </ScrollView>
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.btnOutline} onPress={() => setEditOpen(false)}>
                  <Text style={styles.btnOutlineText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveEdit} disabled={updateMutation.isPending}>
                  {updateMutation.isPending
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <Text style={styles.btnPrimaryText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal transparent visible={deactivateOpen} animationType="fade" onRequestClose={() => setDeactivateOpen(false)}>
        <View style={styles.centeredOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={[styles.confirmTitle, { color: selected?.status === "inactive" ? colors.primary : colors.danger }]}>
              {selected?.status === "inactive" ? "Activate Appliance" : "Deactivate Appliance"}
            </Text>
            <Text style={styles.confirmDescription}>
              {selected?.status === "inactive"
                ? "This appliance will be marked as active again."
                : "This appliance will be marked as inactive."}
            </Text>
            {selected ? (
              <View style={styles.confirmItemBox}>
                <Text style={styles.confirmItemName}>{selected.name}</Text>
                <Text style={styles.confirmItemId}>{selected.id}</Text>
              </View>
            ) : null}
            <View style={styles.confirmFooter}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setDeactivateOpen(false)}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, selected?.status !== "inactive" && { backgroundColor: colors.danger }]}
                onPress={handleToggleStatus}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.btnPrimaryText}>{selected?.status === "inactive" ? "Activate" : "Deactivate"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={deleteOpen} animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.centeredOverlay}>
          <View style={styles.confirmDialog}>
            <Text style={[styles.confirmTitle, { color: colors.danger }]}>Delete Appliance</Text>
            <Text style={styles.confirmDescription}>
              This action cannot be undone. The appliance will be permanently removed.
            </Text>
            {selected ? (
              <View style={[styles.confirmItemBox, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }]}>
                <Text style={styles.confirmItemName}>{selected.name}</Text>
                <Text style={styles.confirmItemId}>{selected.id}</Text>
              </View>
            ) : null}
            <View style={styles.confirmFooter}>
              <TouchableOpacity style={styles.btnOutline} onPress={() => setDeleteOpen(false)}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.danger }]}
                onPress={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <Text style={styles.btnPrimaryText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {activePicker ? (
        <PickerModal
          visible={Boolean(activePicker)}
          title={activePicker.title}
          options={activePicker.options}
          selected={activePicker.target === "add" ? String(formData[activePicker.field] ?? "") : String(editFormData[activePicker.field] ?? "")}
          onSelect={(v) => {
            if (activePicker.target === "add")  setFormData((p) => ({ ...p, [activePicker.field]: v }));
            else setEditFormData((p) => ({ ...p, [activePicker.field]: v }));
          }}
          onClose={() => setActivePicker(null)}
          colors={colors}
          styles={styles}
        />
      ) : null}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === "ios" ? 52 : 24,
    },
    headerArea: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    headerTextBlock: { flex: 1, gap: 4 },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
      marginTop: 2,
    },
    addBtn: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 8,
    },
    addBtnText: { color: colors.primaryText, fontSize: 13, fontWeight: "700" },
    errorBanner: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    errorBannerText: { color: colors.dangerText, fontSize: 13 },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 12,
      gap: 8,
      marginBottom: 14,
    },
    summaryCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: (SCREEN_WIDTH - 40) / 2,
    },
    summaryIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    summaryCardLabel: { fontSize: 11, color: colors.textMuted },
    summaryCardValue: { fontSize: 18, fontWeight: "800", color: colors.text, marginTop: 1 },
    searchRow: { paddingHorizontal: 16, marginBottom: 10 },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.searchBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 40,
    },
    searchInput: { flex: 1, fontSize: 13, color: colors.inputText },
    tabRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
    tabChip: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,height:20,marginBottom: 15
    },
    tabChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabChipText: { fontSize: 12, fontWeight: "600", color: colors.textMuted, height: 40,marginTop: -7},
    tabChipTextActive: { color: colors.white,fontSize: 12, fontWeight: "600",  height: 40},
    centerBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 10 },
    centerBoxText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    emptyBox: { alignItems: "center", paddingTop: 72, gap: 8 },
    emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 4 },
    emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
    listCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginHorizontal: 16,
      marginBottom: 10,
      overflow: "hidden",
    },
    listCardRow: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      gap: 12,
    },
    listCardIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.primaryMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    listCardName: { fontSize: 14, fontWeight: "700", color: colors.text },
    listCardMeta: { fontSize: 12, color: colors.textMuted },
    listCardId: { fontSize: 10, color: colors.textSubtle, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
    menuBtn: { padding: 4 },
    listCardBody: {
      paddingHorizontal: 14,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      paddingTop: 10,
    },
    listCardBadgeRow: { flexDirection: "row", gap: 8 },
    listCardLocation: { fontSize: 12, color: colors.textSecondary, flex: 1 },
    listCardAssigned: { fontSize: 12, color: colors.textSecondary },
    pickerOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    pickerSheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingBottom: 32,
      maxHeight: "70%",
    },
    pickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pickerTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    pickerRow: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    pickerRowSelected: { backgroundColor: colors.primaryMuted },
    pickerRowText: { fontSize: 14, color: colors.textSecondary },
    actionSheetTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    actionSheetRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    actionSheetRowText: { fontSize: 15, color: colors.textSecondary },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "92%",
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalHeaderTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
    modalSubtitle: { fontSize: 12, color: colors.textMuted, paddingHorizontal: 16, paddingTop: 8 },
    modalFooter: {
      flexDirection: "row",
      gap: 10,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      justifyContent: "flex-end",
    },
    input: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      height: 42,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.inputText,
    },
    inputMultiline: {
      height: 80,
      paddingTop: 10,
    },
    pickerBtn: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      height: 42,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    pickerBtnText: { fontSize: 14, color: colors.inputText, flex: 1 },
    photoPicker: {
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      overflow: "hidden",
      minHeight: 80,
    },
    photoPlaceholder: { alignItems: "center", justifyContent: "center", padding: 20, gap: 6 },
    photoPlaceholderText: { fontSize: 12, color: colors.textMuted },
    photoPreview: { width: "100%", height: 160, resizeMode: "cover" },
    removePhotoBtn: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      borderRadius: 6,
      paddingVertical: 7,
      alignItems: "center",
    },
    removePhotoBtnText: { fontSize: 12, color: colors.dangerText, fontWeight: "600" },
    btnPrimary: {
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 100,
    },
    btnPrimaryText: { color: colors.white, fontSize: 14, fontWeight: "700" },
    btnOutline: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    btnOutlineText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
    centeredOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    confirmDialog: {
      backgroundColor: colors.sheetBg,
      borderRadius: 14,
      width: "100%",
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
    confirmDescription: { fontSize: 13, color: colors.textMuted, lineHeight: 18, marginBottom: 14 },
    confirmItemBox: {
      backgroundColor: colors.searchBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    confirmItemName: { fontSize: 14, fontWeight: "600", color: colors.text },
    confirmItemId: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    confirmFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
    viewName: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 4 },
    metaChip: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    metaChipText: { fontSize: 12, color: colors.textSecondary },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
    detailLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted, marginBottom: 4 },
    viewPhoto: { width: "100%", height: 180, borderRadius: 10, backgroundColor: colors.searchBg, marginTop: 6 },
  });
}
