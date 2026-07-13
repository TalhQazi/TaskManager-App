import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import {
  Plus,
  Search,
  MapPin,
  Building2,
  Phone,
  Home,
  X,
  ImageIcon,
  Check,
  AlertCircle,
  Archive,
  MoreHorizontal,
  ChevronDown,
  Info,
  Edit,
  Eye,
  Warehouse
} from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { createResource, listResource, updateResource, apiFetch } from "@/lib/admin/apiClient";
import { getApiBaseUrl } from "@/services/api";
import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";

const LOCATION_TYPES = [
  "Property",
  "Building",
  "Unit",
  "Office",
  "Room",
  "Warehouse",
  "Yard",
] as const;

type LocationType = (typeof LOCATION_TYPES)[number];

function normalizeLocationType(value: unknown): LocationType {
  const v = String(value || "").trim().toLowerCase();
  
  // Map your actual API backend lowercase types to your UI view types
  if (v === "office") return "Office";
  if (v === "facility" || v === "industrial") return "Warehouse";
  if (v === "building") return "Building";
  if (v === "unit") return "Unit";
  if (v === "room") return "Room";
  if (v === "yard") return "Yard";
  
  return "Property"; // Safe fallback
}

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: LocationType;
  businessUnits?: string[];
  notes?: string;
  contactName: string;
  contactPhone: string;
  status: "active" | "inactive";
  createdAt?: string;
  photoDataUrl?: string;
  photoFileName?: string;
  attachments?: { fileName: string; url: string }[];
}

const toDateOnly = (value: string) => {
  const v = String(value || "").trim();
  if (!v) return "";
  const idx = v.indexOf("T");
  return idx >= 0 ? v.slice(0, idx) : v;
};

type BackendLocation = Partial<Location> & {
  _id?: string;
  date?: string;
  createdAt?: string;
};

function normalizeLocation(l: BackendLocation & { manager?: string; phone?: string; employeeCount?: number }): Location {
  const createdAt = String(l.createdAt || l.date || "").trim() || undefined;

  return {
    id: String(l.id || l._id || "").trim(),
    name: String(l.name || "").trim(),
    address: String(l.address || "").trim() || "No Address Provided",
    city: String(l.city || "").trim(),
    country: String(l.country || "").trim(),
    type: normalizeLocationType(l.type),
    businessUnits: Array.isArray(l.businessUnits) ? l.businessUnits : [],
    notes: String(l.notes || "").trim() || (l.employeeCount ? `Employees: ${l.employeeCount}` : ""),
    
    // Map backend properties (manager -> contactName, phone -> contactPhone)
    contactName: String(l.contactName || l.manager || "").trim(),
    contactPhone: String(l.contactPhone || l.phone || "").trim(),
    
    status: (String(l.status || "active").toLowerCase() === "active") ? "active" : "inactive",
    createdAt: createdAt ? toDateOnly(createdAt) : undefined,
    photoDataUrl: String(l.photoDataUrl || "").trim() || undefined,
    photoFileName: String(l.photoFileName || "").trim() || undefined,
    attachments: Array.isArray(l.attachments) ? l.attachments : [],
  };
}

const typeColors: Record<LocationType, string> = {
  Property: "#3b82f6",
  Building: "#6366f1",
  Unit: "#a855f7",
  Office: "#06b6d4",
  Room: "#ec4899",
  Warehouse: "#f59e0b",
  Yard: "#10b981",
};

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
    activeBadgeBg:    isDark ? "rgba(16,185,129,0.15)"  : "#DCFCE7",
    activeBadgeText:  isDark ? "#34D399"  : "#15803D",
    inactiveBadgeBg:  isDark ? "rgba(100,116,139,0.15)" : "#F1F5F9",
    inactiveBadgeText:isDark ? "#94A3B8"  : "#475569",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)"  : "#FEE2E2",
    dangerBorder:     "rgba(239,68,68,0.25)",
    dangerText:       isDark ? "#FCA5A5" : "#DC2626",
    white:            "#FFFFFF",
    overlayBg:        "rgba(0,0,0,0.4)",
  };
}

type ThemeColors = ReturnType<typeof buildColors>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1, padding: 16 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
    subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
    addButtonText: { color: colors.primaryText, fontSize: 13, fontWeight: '600', marginLeft: 6 },
    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    metricsCard: { flex: 1, backgroundColor: colors.cardBg, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4, elevation: 1, borderWidth: 1, borderColor: colors.border },
    metricsLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
    metricsVal: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 2 },
    controlBox: { backgroundColor: colors.cardBg, padding: 12, borderRadius: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: colors.border },
    tabBar: { flexDirection: 'row', backgroundColor: colors.borderLight, borderRadius: 8, padding: 2, marginBottom: 12 },
    tabButton: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6 },
    tabButtonActive: { backgroundColor: colors.cardBg },
    tabButtonText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    tabButtonTextActive: { color: colors.primary, fontWeight: '700' },
    searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.searchBg, borderRadius: 8, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: colors.border },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 13, color: colors.inputText },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 },
    emptyText: { textAlign: 'center', color: colors.textMuted, marginVertical: 40, fontSize: 13 },
    card: { backgroundColor: colors.cardBg, padding: 14, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardMediaRow: { flexDirection: 'row', flex: 1, alignItems: 'center' },
    avatarWrapper: { width: 46, height: 46, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.borderLight },
    avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    fallbackAvatar: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cardTextGroup: { marginLeft: 12, flex: 1 },
    cardTitleText: { fontSize: 15, fontWeight: 'bold', color: colors.text },
    cardMetaText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    moreBtn: { padding: 6 },
    cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
    badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    contactFooterText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    modalSafeArea: { flex: 1, backgroundColor: colors.cardBg },
    modalHeaderAdd: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, padding: 16 },
    modalHeaderView: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.text, padding: 16 },
    modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryText },
    modalScroll: { padding: 16 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 6, marginTop: 10 },
    input: { borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12, color: colors.inputText, backgroundColor: colors.inputBg },
    dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: colors.searchBg },
    dropdownTriggerText: { fontSize: 14, color: colors.inputText },
    badgeWrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    unitBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.borderLight, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
    unitBadgeText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
    inlineAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 14 },
    inlineAddBtn: { backgroundColor: colors.text, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
    photoPickerContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 4 },
    photoSquare: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: colors.border },
    squareImage: { width: '100%', height: '100%' },
    deletePhotoBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#ef4444', borderRadius: 10, padding: 3 },
    photoAddSquare: { width: 64, height: 64, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryMuted },
    errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.dangerBg, padding: 10, borderRadius: 8, marginVertical: 10, borderWidth: 1, borderColor: colors.dangerBorder },
    errorText: { color: colors.dangerText, fontSize: 12, fontWeight: '500' },
    successContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.activeBadgeBg, padding: 10, borderRadius: 8, marginVertical: 10 },
    successText: { color: colors.activeBadgeText, fontSize: 12, fontWeight: '500' },
    primaryButton: { backgroundColor: colors.primary, padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 14, marginBottom: 30 },
    primaryButtonText: { color: colors.primaryText, fontSize: 15, fontWeight: 'bold' },
    viewBannerCard: { flexDirection: 'row', backgroundColor: colors.borderLight, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
    metaInfoGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    metaCell: { flex: 1, backgroundColor: colors.searchBg, padding: 12, borderRadius: 8 },
    metaCellLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '700' },
    metaCellVal: { fontSize: 14, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
    notesBlock: { padding: 12, backgroundColor: colors.borderLight, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: colors.primary },
    notesBlockText: { fontStyle: 'italic', color: colors.textSecondary, fontSize: 13 },
    horizontalScrollImage: { width: 140, height: 90, borderRadius: 8, marginRight: 8, resizeMode: 'cover' },
    alertOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: 'center', alignItems: 'center', padding: 20 },
    alertBox: { backgroundColor: colors.cardBg, width: '100%', borderRadius: 16, padding: 24, alignItems: 'center' },
    alertTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 12, textAlign: 'center' },
    alertSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 20 },
    alertPrimaryActionBtn: { width: '100%', padding: 12, borderRadius: 8, alignItems: 'center' },
    alertCancelActionBtn: { width: '100%', padding: 12, alignItems: 'center', marginTop: 6 },
    pickerOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: 'center', alignItems: 'center', padding: 24 },
    pickerWindow: { backgroundColor: colors.cardBg, width: '100%', maxHeight: 320, borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: colors.border },
    pickerTitle: { fontSize: 15, fontWeight: '700', color: colors.text, paddingHorizontal: 16, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
    pickerItemText: { fontSize: 14, color: colors.textSecondary },
    actionMenuOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: 'flex-end' },
    actionMenuSheet: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.border },
    actionMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    actionMenuTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    actionMenuCloseBtn: { padding: 4 },
    actionMenuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    actionMenuRowText: { fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
    actionMenuRowDestructive: { color: '#ef4444' },
  });
}

export default function Locations() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editLocationOpen, setEditLocationOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [locationsList, setLocationsList] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());
  
  // Mobile Dropdown state controls
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showEditTypeDropdown, setShowEditTypeDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showEditCountryDropdown, setShowEditCountryDropdown] = useState(false);
  const [showEditStatusDropdown, setShowEditStatusDropdown] = useState(false);
  const [unitInputText, setUnitInputText] = useState("");
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuItem, setActionMenuItem] = useState<Location | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "USA",
    type: "Property" as Location["type"],
    businessUnits: [] as string[],
    notes: "",
    contactName: "",
    contactPhone: "",
    status: "active" as Location["status"],
    photoDataUrl: "",
    photoFileName: "",
    attachments: [] as { fileName: string; url: string }[],
  });

  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    city: "",
    country: "USA",
    type: "Property" as Location["type"],
    businessUnits: [] as string[],
    notes: "",
    contactName: "",
    contactPhone: "",
    status: "active" as Location["status"],
    photoDataUrl: "",
    photoFileName: "",
    attachments: [] as { fileName: string; url: string }[],
  });

  // Fetch initial location records list
// Fetch initial location records list with deep diagnostics
useEffect(() => {
  let mounted = true;
  const load = async () => {
    try {
      setLoading(true);
      setApiError(null);
      
      const response = await listResource<any>("locations");

      if (!mounted) return;

      // Extract array safely from the 'items' key
      let finalArray: any[] = [];
      if (response && Array.isArray(response.items)) {
        finalArray = response.items; // <-- This fixes it!
      } else if (Array.isArray(response)) {
        finalArray = response;
      } else if (response && Array.isArray(response.locations)) {
        finalArray = response.locations;
      } else if (response && Array.isArray(response.data)) {
        finalArray = response.data;
      }

      const normalized = finalArray.map(normalizeLocation);
      setLocationsList(normalized);
    } catch (e) {
      if (!mounted) return;
      setApiError(e instanceof Error ? e.message : "Failed to load locations");
    } finally {
      if (!mounted) return;
      setLoading(false);
    }
  };
  void load();
  return () => { mounted = false; };
}, []);

  // Safe fallback endpoints handler for country list array
  useEffect(() => {
    const loadCountries = async () => {
      try {
        const res = await apiFetch<{ countries: string[] }>("/api/locations/countries");
        if (res && Array.isArray(res.countries)) {
          setCountries(res.countries);
        }
      } catch (err) {
        console.log("[Locations] Auto routing fallback triggered for countries endpoints...");
        try {
          const resFallback = await apiFetch<{ countries: string[] }>("/locations/countries");
          if (resFallback && Array.isArray(resFallback.countries)) {
            setCountries(resFallback.countries);
          }
        } catch {
          setCountries([]);
        }
      }
    };
    void loadCountries();
  }, []);

  const countriesWithUsa = useMemo(() => {
    if (!countries.includes("USA")) return ["USA", ...countries];
    return countries;
  }, [countries]);

 const refreshLocations = async () => {
  try {
    const response = await listResource<any>("locations");
    
    // SAFE PARSING: Extract array safely from the 'items' key returned by the backend
    let finalArray: any[] = [];
    if (response && Array.isArray(response.items)) {
      finalArray = response.items;
    } else if (Array.isArray(response)) {
      finalArray = response;
    } else if (response && Array.isArray(response.locations)) {
      finalArray = response.locations;
    } else if (response && Array.isArray(response.data)) {
      finalArray = response.data;
    }

    setLocationsList(finalArray.map(normalizeLocation));
    setRefreshTimestamp(Date.now());
  } catch (e) {
    console.error("Failed to refresh locations database:", e);
  }
};

  const handlePickPhotos = async (mode: 'add' | 'edit') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Photo access is required to add site images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      base64: true,
      quality: 0.6,
    });

    if (!result.canceled && result.assets[0].base64) {
      const newAttachment = {
        fileName: result.assets[0].fileName || `photo_${Date.now()}.jpg`,
        url: `data:image/jpeg;base64,${result.assets[0].base64}`
      };

      if (mode === 'add') {
        setFormData(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
      } else {
        setEditFormData(prev => ({ ...prev, attachments: [...prev.attachments, newAttachment] }));
      }
    }
  };

  const handleAddLocation = async () => {
    if (!formData.name || !formData.address || !formData.city || !formData.country) {
      setFormError("Please fill in all required fields: Name, Address, City, and Country");
      return;
    }
    try {
      setSubmitLoading(true);
      setFormError(null);
      
      let max = 0;
      for (const l of locationsList) {
        const m = /^LOC-(\d+)$/.exec(String(l.id || "").trim());
        if (!m) continue;
        const n = Number(m[1]);
        if (Number.isFinite(n)) max = Math.max(max, n);
      }
      const generatedId = `LOC-${String(max + 1).padStart(3, "0")}`;

      const newLocation: Location = {
        id: generatedId,
        name: formData.name,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        type: formData.type,
        businessUnits: formData.businessUnits,
        notes: formData.notes || "",
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        status: formData.status,
        createdAt: new Date().toISOString(),
        attachments: formData.attachments,
      };
      
      await createResource<Location>("locations", newLocation);
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setAddLocationOpen(false);
      }, 1500);
      await refreshLocations();
      setFormData({
        name: "",
        address: "",
        city: "",
        country: "USA",
        type: "Property",
        businessUnits: [],
        notes: "",
        contactName: "",
        contactPhone: "",
        status: "active",
        photoDataUrl: "",
        photoFileName: "",
        attachments: [],
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to add location");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetails = async (location: Location) => {
  setSelectedLocation(location);
  setViewDetailsOpen(true);
  try {
    // FIXED: Removed the incorrect context path prefix to request the correct backend route
    const res = await apiFetch<{ photoDataUrl: string; photoFileName: string; attachments: { fileName: string; url: string }[] }>(
      `/locations/${location.id}`
    );
    if (res) {
      setSelectedLocation(prev => 
        prev && prev.id === location.id 
          ? { ...prev, attachments: res.attachments || [] } 
          : prev
      );
    }
  } catch (err) {
    console.log("[Locations] Photo fetch encountered a 404 fallback or skipped safely:", err);
  }
};

  const handleEditLocation = (location: Location) => {
    setSelectedLocation(location);
    setEditFormData({
      name: location.name,
      address: location.address,
      city: location.city,
      country: location.country || "USA",
      type: normalizeLocationType(location.type),
      businessUnits: location.businessUnits || [],
      notes: location.notes || "",
      contactName: location.contactName,
      contactPhone: location.contactPhone,
      status: location.status,
      photoDataUrl: location.photoDataUrl || "",
      photoFileName: location.photoFileName || "",
      attachments: location.attachments || [],
    });
    setEditLocationOpen(true);
  };

  const saveEditLocation = async () => {
    if (!selectedLocation) return;
    if (!editFormData.name || !editFormData.address || !editFormData.city || !editFormData.country) return;
    try {
      setSubmitLoading(true);
      await updateResource<Location>("locations", selectedLocation.id, {
        ...selectedLocation,
        name: editFormData.name,
        address: editFormData.address,
        city: editFormData.city,
        country: editFormData.country,
        type: editFormData.type,
        businessUnits: editFormData.businessUnits,
        contactName: editFormData.contactName,
        contactPhone: editFormData.contactPhone,
        status: editFormData.status,
        notes: editFormData.notes || "",
        attachments: editFormData.attachments,
      });
      await refreshLocations();
      setEditLocationOpen(false);
      setSelectedLocation(null);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to update location");
    } finally {
      setSubmitLoading(false);
    }
  };

  const confirmToggleActive = async () => {
    if (!selectedLocation) return;
    try {
      await updateResource<Location>("locations", selectedLocation.id, {
        ...selectedLocation,
        status: selectedLocation.status === "inactive" ? "active" : "inactive",
      });
      await refreshLocations();
      setDeactivateConfirmOpen(false);
      setSelectedLocation(null);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to change status");
    }
  };

  const filteredLocations = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const statusFilter = activeTab === "active" ? "active" : "inactive";
    
    return locationsList.filter((l) => 
      l.status === statusFilter && (
        l.name.toLowerCase().includes(q) || 
        l.address.toLowerCase().includes(q) || 
        l.city.toLowerCase().includes(q)
      )
    );
  }, [locationsList, searchQuery, activeTab]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.container}>
          
          {/* Header row area split */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Locations</Text>
              <Text style={styles.subtitle}>Manage operational sites and metrics.</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddLocationOpen(true)}>
              <Plus size={16} color="#fff" />
              <Text style={styles.addButtonText}>Add Site</Text>
            </TouchableOpacity>
          </View>

          {/* Integrated Analytics Summary Deck Dashboard component */}
          <View style={styles.metricsRow}>
            <View style={styles.metricsCard}>
              <Text style={styles.metricsLabel}>Total Sites</Text>
              <Text style={styles.metricsVal}>{locationsList.length}</Text>
            </View>
            <View style={styles.metricsCard}>
              <Text style={styles.metricsLabel}>Active</Text>
              <Text style={[styles.metricsVal, { color: '#16a34a' }]}>{locationsList.filter(l => l.status === "active").length}</Text>
            </View>
            <View style={styles.metricsCard}>
              <Text style={styles.metricsLabel}>Offices</Text>
              <Text style={[styles.metricsVal, { color: '#4f46e5' }]}>{locationsList.filter(l => l.type === "Office").length}</Text>
            </View>
          </View>

          {/* Search bar & active filter switcher database panel */}
          <View style={styles.controlBox}>
            <View style={styles.tabBar}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === "active" && styles.tabButtonActive]} 
                onPress={() => setActiveTab("active")}
              >
                <Text style={[styles.tabButtonText, activeTab === "active" && styles.tabButtonTextActive]}>Active</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === "archived" && styles.tabButtonActive]} 
                onPress={() => setActiveTab("archived")}
              >
                <Text style={[styles.tabButtonText, activeTab === "archived" && styles.tabButtonTextActive]}>Archived</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrapper}>
              <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search database locations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          {/* Table Profile list wrapper */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 30 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No matching site profiles found.</Text>}
              renderItem={({ item, index }) => {
                const apiBase = String(getApiBaseUrl()).replace(/\/api\/?$/, "");
                const photoUri = item.attachments?.[0]?.url || `${apiBase}/api/locations/${item.id}/render-photo?v=${refreshTimestamp}`;

                return (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardMediaRow}>
                        <View style={styles.avatarWrapper}>
                          {item.attachments?.[0]?.url ? (
                            <Image source={{ uri: photoUri }} style={styles.avatarImg} />
                          ) : (
                            <View style={styles.fallbackAvatar}><MapPin size={20} color={colors.textMuted} /></View>
                          )}
                        </View>
                        <View style={styles.cardTextGroup}>
                          <Text style={styles.cardTitleText}>{item.name}</Text>
                          <Text style={styles.cardMetaText}>LOC-{String(index + 1).padStart(3, "0")} • {item.city}, {item.country}</Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.moreBtn} 
                        onPress={() => {
                          setActionMenuItem(item);
                          setActionMenuOpen(true);
                        }}
                      >
                        <MoreHorizontal size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardFooterRow}>
                      <View style={[styles.badge, { backgroundColor: `${typeColors[item.type]}15` }]}>
                        <Text style={[styles.badgeText, { color: typeColors[item.type] }]}>{item.type.toUpperCase()}</Text>
                      </View>
                      {item.contactName ? (
                        <Text style={styles.contactFooterText}>👤 {item.contactName}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              }}
            />
          )}

          {/* --- MODAL: CREATE LOCATION RECORD --- */}
          <Modal visible={addLocationOpen} animationType="slide">
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeaderAdd}>
                <Text style={styles.modalHeaderTitle}>Add New Location</Text>
                <TouchableOpacity onPress={() => setAddLocationOpen(false)}>
                  <X size={24} color={colors.primaryText} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.label}>Location Name *</Text>
                <TextInput style={styles.input} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} placeholder="HQ Office" />

                {/* --- Location Type Dropdown Trigger --- */}
                <Text style={styles.label}>Location Type</Text>
                <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowTypeDropdown(true)}>
                  <Text style={styles.dropdownTriggerText}>{formData.type}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {/* FULL SCREEN MODAL DIALOG PICKER OVERLAY FOR TYPE */}
                <Modal visible={showTypeDropdown} transparent animationType="fade">
                  <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowTypeDropdown(false)}>
                    <View style={styles.pickerWindow}>
                      <Text style={styles.pickerTitle}>Select Location Type</Text>
                      <FlatList
                        data={LOCATION_TYPES}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={styles.pickerItem} 
                            onPress={() => {
                              setFormData({ ...formData, type: item });
                              setShowTypeDropdown(false);
                            }}
                          >
                            <Text style={styles.pickerItemText}>{item}</Text>
                            {formData.type === item && <Check size={16} color={colors.primary} />}
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>

                {/* --- Country Dropdown Trigger --- */}
                <Text style={styles.label}>Country *</Text>
                <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowCountryDropdown(true)}>
                  <Text style={styles.dropdownTriggerText}>{formData.country}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                {/* FULL SCREEN MODAL DIALOG PICKER OVERLAY FOR COUNTRY */}
                <Modal visible={showCountryDropdown} transparent animationType="fade">
                  <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowCountryDropdown(false)}>
                    <View style={styles.pickerWindow}>
                      <Text style={styles.pickerTitle}>Select Country</Text>
                      <FlatList
                        data={countriesWithUsa}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={styles.pickerItem} 
                            onPress={() => {
                              setFormData({ ...formData, country: item });
                              setShowCountryDropdown(false);
                            }}
                          >
                            <Text style={styles.pickerItemText}>{item}</Text>
                            {formData.country === item && <Check size={16} color={colors.primary} />}
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>

                <Text style={styles.label}>City *</Text>
                <TextInput style={styles.input} value={formData.city} onChangeText={(t) => setFormData({ ...formData, city: t })} placeholder="New York" />

                <Text style={styles.label}>Full Address *</Text>
                <TextInput style={styles.input} value={formData.address} onChangeText={(t) => setFormData({ ...formData, address: t })} placeholder="123 Business Way" />

                <Text style={styles.label}>Contact Person</Text>
                <TextInput style={styles.input} value={formData.contactName} onChangeText={(t) => setFormData({ ...formData, contactName: t })} placeholder="John Doe" />

                <Text style={styles.label}>Contact Phone</Text>
                <TextInput style={styles.input} value={formData.contactPhone} onChangeText={(t) => setFormData({ ...formData, contactPhone: t })} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />

                <Text style={styles.label}>Business Units</Text>
                <View style={styles.badgeWrapRow}>
                  {formData.businessUnits.map((u, idx) => (
                    <View key={idx} style={styles.unitBadge}>
                      <Text style={styles.unitBadgeText}>{u}</Text>
                      <TouchableOpacity onPress={() => setFormData({ ...formData, businessUnits: formData.businessUnits.filter((_, i) => i !== idx) })}>
                        <X size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <View style={styles.inlineAddRow}>
                  <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={unitInputText} onChangeText={setUnitInputText} placeholder="Enter unit title..." />
                  <TouchableOpacity style={styles.inlineAddBtn} onPress={() => {
                    if(unitInputText.trim() && !formData.businessUnits.includes(unitInputText.trim())) {
                      setFormData({ ...formData, businessUnits: [...formData.businessUnits, unitInputText.trim()] });
                      setUnitInputText("");
                    }
                  }}>
                    <Text style={{ color: colors.primaryText, fontWeight: 'bold' }}>Add</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Multiple Photos</Text>
                <View style={styles.photoPickerContainer}>
                  {formData.attachments.map((att, index) => (
                    <View key={index} style={styles.photoSquare}>
                      <Image source={{ uri: att.url }} style={styles.squareImage} />
                      <TouchableOpacity style={styles.deletePhotoBadge} onPress={() => setFormData({ ...formData, attachments: formData.attachments.filter((_, i) => i !== index) })}>
                        <X size={10} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.photoAddSquare} onPress={() => handlePickPhotos('add')}>
                    <ImageIcon size={20} color={colors.primary} />
                    <Text style={{ fontSize: 10, color: colors.primary, marginTop: 2 }}>Add Photo</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Notes</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={formData.notes} onChangeText={(t) => setFormData({ ...formData, notes: t })} placeholder="Internal comments..." />

                {formError && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{formError}</Text>
                  </View>
                )}

                {submitSuccess && (
                  <View style={styles.successContainer}>
                    <Check size={14} color="#22c55e" />
                    <Text style={styles.successText}>Location added successfully!</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.primaryButton} onPress={handleAddLocation} disabled={submitLoading}>
                  {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Confirm & Create</Text>}
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {/* --- MODAL: VIEW DETAILS DIALOG --- */}
          <Modal visible={viewDetailsOpen} animationType="slide">
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeaderView}>
                <Text style={styles.modalHeaderTitle}>{selectedLocation?.name || "Site Info"}</Text>
                <TouchableOpacity onPress={() => setViewDetailsOpen(false)}>
                  <X size={24} color={colors.primaryText} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.viewBannerCard}>
                  <MapPin size={22} color={colors.primary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Site Address</Text>
                    <Text style={{ fontSize: 15, color: '#334155', marginTop: 2 }}>{selectedLocation?.address}, {selectedLocation?.city}, {selectedLocation?.country}</Text>
                  </View>
                </View>

                <View style={styles.metaInfoGrid}>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaCellLabel}>CONTACT PERSON</Text>
                    <Text style={styles.metaCellVal}>{selectedLocation?.contactName || "None Assigned"}</Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaCellLabel}>CONTACT PHONE</Text>
                    <Text style={styles.metaCellVal}>{selectedLocation?.contactPhone || "No Line"}</Text>
                  </View>
                </View>

                <Text style={styles.label}>Business Units</Text>
                <View style={styles.badgeWrapRow}>
                  {selectedLocation?.businessUnits?.length ? selectedLocation.businessUnits.map((bu, i) => (
                    <View key={i} style={[styles.unitBadge, { paddingRight: 10 }]}><Text style={styles.unitBadgeText}>{bu}</Text></View>
                  )) : <Text style={{ fontSize: 13, fontStyle: 'italic', color: '#94a3b8' }}>No business units defined</Text>}
                </View>

                {selectedLocation?.notes ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.label}>Internal Notes</Text>
                    <View style={styles.notesBlock}><Text style={styles.notesBlockText}>"{selectedLocation.notes}"</Text></View>
                  </View>
                ) : null}

                {selectedLocation?.attachments && selectedLocation.attachments.length > 0 && (
                  <View style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Site Photos ({selectedLocation.attachments.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginTop: 6 }}>
                      {selectedLocation.attachments.map((img, i) => (
                        <Image key={i} source={{ uri: img.url }} style={styles.horizontalScrollImage} />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.text, marginTop: 30 }]} onPress={() => setViewDetailsOpen(false)}>
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {/* --- MODAL: EDIT SPECIFIC RECORD --- */}
          <Modal visible={editLocationOpen} animationType="slide">
            <SafeAreaView style={styles.modalSafeArea}>
              <View style={styles.modalHeaderView}>
                <Text style={styles.modalHeaderTitle}>Edit Location Record</Text>
                <TouchableOpacity onPress={() => setEditLocationOpen(false)}>
                  <X size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <Text style={styles.label}>Location Name *</Text>
                <TextInput style={styles.input} value={editFormData.name} onChangeText={(t) => setEditFormData({ ...editFormData, name: t })} />

                {/* --- Edit Type Dropdown --- */}
                <Text style={styles.label}>Location Type</Text>
                <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowEditTypeDropdown(true)}>
                  <Text style={styles.dropdownTriggerText}>{editFormData.type}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <Modal visible={showEditTypeDropdown} transparent animationType="fade">
                  <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowEditTypeDropdown(false)}>
                    <View style={styles.pickerWindow}>
                      <Text style={styles.pickerTitle}>Select Location Type</Text>
                      <FlatList
                        data={LOCATION_TYPES}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                          <TouchableOpacity style={styles.pickerItem} onPress={() => { setEditFormData({ ...editFormData, type: item }); setShowEditTypeDropdown(false); }}>
                            <Text style={styles.pickerItemText}>{item}</Text>
                            {editFormData.type === item && <Check size={16} color={colors.primary} />}
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>

                {/* --- Edit Country Dropdown --- */}
                <Text style={styles.label}>Country *</Text>
                <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowEditCountryDropdown(true)}>
                  <Text style={styles.dropdownTriggerText}>{editFormData.country}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <Modal visible={showEditCountryDropdown} transparent animationType="fade">
                  <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowEditCountryDropdown(false)}>
                    <View style={styles.pickerWindow}>
                      <Text style={styles.pickerTitle}>Select Country</Text>
                      <FlatList
                        data={countriesWithUsa}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                          <TouchableOpacity style={styles.pickerItem} onPress={() => { setEditFormData({ ...editFormData, country: item }); setShowEditCountryDropdown(false); }}>
                            <Text style={styles.pickerItemText}>{item}</Text>
                            {editFormData.country === item && <Check size={16} color={colors.primary} />}
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>

                <Text style={styles.label}>City *</Text>
                <TextInput style={styles.input} value={editFormData.city} onChangeText={(t) => setEditFormData({ ...editFormData, city: t })} />

                <Text style={styles.label}>Full Address *</Text>
                <TextInput style={styles.input} value={editFormData.address} onChangeText={(t) => setEditFormData({ ...editFormData, address: t })} />

                <Text style={styles.label}>Contact Person</Text>
                <TextInput style={styles.input} value={editFormData.contactName} onChangeText={(t) => setEditFormData({ ...editFormData, contactName: t })} />

                <Text style={styles.label}>Contact Phone</Text>
                <TextInput style={styles.input} value={editFormData.contactPhone} onChangeText={(t) => setEditFormData({ ...editFormData, contactPhone: t })} keyboardType="phone-pad" />

                {/* --- Edit Status Override Dropdown --- */}
                <Text style={styles.label}>Status Override</Text>
                <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setShowEditStatusDropdown(true)}>
                  <Text style={styles.dropdownTriggerText}>{editFormData.status === 'active' ? 'Operational (Active)' : 'Shutdown (Inactive)'}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <Modal visible={showEditStatusDropdown} transparent animationType="fade">
                  <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowEditStatusDropdown(false)}>
                    <View style={styles.pickerWindow}>
                      <Text style={styles.pickerTitle}>Select Status</Text>
                      <TouchableOpacity style={styles.pickerItem} onPress={() => { setEditFormData({ ...editFormData, status: 'active' }); setShowEditStatusDropdown(false); }}>
                        <Text style={styles.pickerItemText}>Operational (Active)</Text>
                        {editFormData.status === 'active' && <Check size={16} color={colors.primary} />}
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.pickerItem} onPress={() => { setEditFormData({ ...editFormData, status: 'inactive' }); setShowEditStatusDropdown(false); }}>
                        <Text style={styles.pickerItemText}>Shutdown (Inactive)</Text>
                        {editFormData.status === 'inactive' && <Check size={16} color={colors.primary} />}
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Modal>

                <Text style={styles.label}>Site Photos</Text>
                <View style={styles.photoPickerContainer}>
                  {editFormData.attachments.map((att, index) => (
                    <View key={index} style={styles.photoSquare}>
                      <Image source={{ uri: att.url }} style={styles.squareImage} />
                      <TouchableOpacity style={styles.deletePhotoBadge} onPress={() => setEditFormData({ ...editFormData, attachments: editFormData.attachments.filter((_, i) => i !== index) })}>
                        <X size={10} color={colors.primaryText} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.photoAddSquare} onPress={() => handlePickPhotos('edit')}>
                    <ImageIcon size={20} color={colors.primary} />
                    <Text style={{ fontSize: 10, color: colors.primary, marginTop: 2 }}>Add Photo</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Internal Notes</Text>
                <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={editFormData.notes} onChangeText={(t) => setEditFormData({ ...editFormData, notes: t })} />

                <TouchableOpacity style={styles.primaryButton} onPress={saveEditLocation} disabled={submitLoading}>
                  {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Update Record</Text>}
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Modal>

          {/* --- MODAL: ACTION MENU --- */}
          <Modal visible={actionMenuOpen} transparent animationType="slide" onRequestClose={() => setActionMenuOpen(false)}>
            <TouchableOpacity style={styles.actionMenuOverlay} activeOpacity={1} onPress={() => setActionMenuOpen(false)}>
              <View style={styles.actionMenuSheet}>
                <View style={styles.actionMenuHeader}>
                  <Text style={styles.actionMenuTitle}>Manage {actionMenuItem?.name}</Text>
                  <TouchableOpacity style={styles.actionMenuCloseBtn} onPress={() => setActionMenuOpen(false)}>
                    <X size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.actionMenuRow} 
                  onPress={() => {
                    if (actionMenuItem) handleViewDetails(actionMenuItem);
                    setActionMenuOpen(false);
                  }}
                >
                  <Eye size={18} color={colors.primary} />
                  <Text style={styles.actionMenuRowText}>View Info</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionMenuRow} 
                  onPress={() => {
                    if (actionMenuItem) handleEditLocation(actionMenuItem);
                    setActionMenuOpen(false);
                  }}
                >
                  <Edit size={18} color={colors.primary} />
                  <Text style={styles.actionMenuRowText}>Edit Record</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.actionMenuRow} 
                  onPress={() => {
                    if (actionMenuItem) {
                      setSelectedLocation(actionMenuItem);
                      setDeactivateConfirmOpen(true);
                    }
                    setActionMenuOpen(false);
                  }}
                >
                  <Archive size={18} color="#ef4444" />
                  <Text style={[styles.actionMenuRowText, styles.actionMenuRowDestructive]}>
                    {actionMenuItem?.status === 'active' ? 'Archive Location' : 'Restore Location'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* --- MODAL: ARCHIVE CONFIRMATION CONTEXT --- */}
          <Modal visible={deactivateConfirmOpen} transparent animationType="fade">
            <View style={styles.alertOverlay}>
              <View style={styles.alertBox}>
                <Archive size={40} color={selectedLocation?.status === 'active' ? "#d97706" : colors.primary} />
                <Text style={styles.alertTitle}>{selectedLocation?.status === 'active' ? 'Archive Site?' : 'Restore Site?'}</Text>
                <Text style={styles.alertSubtitle}>Target: {selectedLocation?.name}</Text>
                <TouchableOpacity style={[styles.alertPrimaryActionBtn, { backgroundColor: selectedLocation?.status === 'active' ? '#d97706' : colors.primary }]} onPress={confirmToggleActive}>
                  <Text style={{ color: colors.primaryText, fontWeight: 'bold' }}>Confirm Action</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.alertCancelActionBtn} onPress={() => setDeactivateConfirmOpen(false)}>
                  <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

