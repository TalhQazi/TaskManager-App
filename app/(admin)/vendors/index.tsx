import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Dimensions,
  Platform,
} from "react-native";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  Globe,
  ChevronDown,
  X,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface Vendor {
  _id: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  website: string;
  serviceType: string;
  location: string;
  status: "approved" | "not-approved";
  notes: string;
  createdAt: string;
}

interface Location {
  _id: string;
  name: string;
}

interface VendorCategory {
  _id: string;
  name: string;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F8FAFC" : "#0F172A"),
    textSecondary:    isDark ? "#CBD5E1" : "#334155",
    textMuted:        isDark ? "#94A3B8" : "#64748B",
    textSubtle:       isDark ? "#64748B" : "#94A3B8",
    border:           isDark ? "#334155" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#0F172A" : "#F8FAFC",
    inputBorder:      isDark ? "#334155" : "#E2E8F0",
    inputText:        isDark ? "#F8FAFC" : "#0F172A",
    placeholderText:  isDark ? "#475569" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || (isDark ? "#6366F1" : "#0F172A"),
    primaryText:      "#FFFFFF",
    successBg:        isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5",
    successBorder:    isDark ? "rgba(16,185,129,0.3)"  : "#A7F3D0",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
    dangerBorder:     isDark ? "rgba(239,68,68,0.3)"  : "#FECACA",
    dangerText:       isDark ? "#FCA5A5" : "#EF4444",
    warning:          uiTheme.customColors?.warning || "#F59E0B",
    overlayBg:        "rgba(0,0,0,0.4)",
    linkText:         isDark ? "#60A5FA" : "#2563EB",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: Platform.OS === "ios" ? 60 : 24,
      paddingHorizontal: 16,
      paddingBottom: 16,
      backgroundColor: colors.cardBg,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    headerButtonsRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
    },
    scrollContainer: {
      padding: 16,
      paddingBottom: 40,
    },
    statsRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.textMuted,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    filterCard: {
      backgroundColor: colors.cardBg,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 10,
      marginBottom: 16,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 10,
      height: 38,
      backgroundColor: colors.inputBg,
    },
    searchIcon: {
      marginRight: 6,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.inputText,
    },
    dropdownsGrid: {
      flexDirection: "row",
      gap: 6,
    },
    pickerTrigger: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      height: 36,
      paddingHorizontal: 8,
      backgroundColor: colors.inputBg,
    },
    pickerTriggerText: {
      fontSize: 11,
      color: colors.textSubtle,
      maxWidth: "80%",
    },
    listHeading: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    emptyContainer: {
      padding: 32,
      alignItems: "center",
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    vendorCard: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 12,
    },
    vendorCardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      paddingBottom: 10,
    },
    vendorName: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    categoryBadge: {
      backgroundColor: colors.borderLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
    },
    categoryBadgeText: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    bgSuccess: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    bgDestructive: { backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder },
    statusBadgeText: { fontSize: 11, fontWeight: "500" },
    textSuccess: { color: colors.successText },
    textDestructive: { color: colors.dangerText },
    cardDetailsGrid: {
      paddingVertical: 10,
      gap: 6,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    detailText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    linkText: {
      color: colors.linkText,
      textDecorationLine: "underline",
    },
    cardActionsRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderColor: colors.borderLight,
      paddingTop: 10,
      justifyContent: "space-around",
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      padding: 4,
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textMuted,
    },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    btnPrimary: { backgroundColor: colors.primary },
    btnPrimaryText: { color: colors.primaryText, fontSize: 13, fontWeight: "500" },
    btnOutline: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    btnOutlineText: { color: colors.text, fontSize: 13, fontWeight: "500" },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: "center",
      padding: 16,
    },
    pickerContentContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      padding: 16,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerModalTitle: { fontSize: 15, fontWeight: "600", marginBottom: 12, color: colors.text },
    pickerOptionItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.borderLight },
    pickerOptionText: { fontSize: 14, color: colors.placeholderText },
    modalFormContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalScrollFormContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: 8,
      padding: 16,
      paddingBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: 10,
      marginBottom: 8,
    },
    modalTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    fieldLabel: { fontSize: 13, fontWeight: "500", color: colors.textSecondary, marginBottom: 4 },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      fontSize: 14,
      color: colors.inputText,
      backgroundColor: colors.inputBg,
    },
    formPickerTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 6,
      height: 38,
      paddingHorizontal: 10,
      backgroundColor: colors.inputBg,
    },
    formPickerTriggerText: {
      fontSize: 14,
      color: colors.inputText,
    },
    formAddressGroup: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.inputBg,
      padding: 10,
      borderRadius: 8,
      marginTop: 4,
    },
    addressGroupTitle: { fontSize: 12, color: colors.textMuted, fontWeight: "600", marginBottom: 6 },
    textAreaInput: { height: 70, paddingTop: 8, textAlignVertical: "top" },
    modalFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 14 },
    viewVendorName: { fontSize: 18, fontWeight: "700", color: colors.text, flex: 1, marginRight: 8 },
    viewDetailGridBlock: { borderBottomWidth: 1, borderColor: colors.borderLight, paddingBottom: 8 },
    viewBlockLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
    viewBlockValue: { fontSize: 14, fontWeight: "500", color: colors.text },
    viewNotesBox: { backgroundColor: colors.inputBg, padding: 8, borderRadius: 4, marginTop: 4, fontSize: 13, color: colors.textSecondary },
  });
}

export default function VendorsScreen() {
  const viewId = "";
  const { uiTheme } = useTheme();

  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [activePicker, setActivePicker] = useState<{ type: "category" | "location" | "status" | "form-location" | "form-status"; options: { label: string; value: string }[] } | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewCategoryOpen, setIsNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    website: "",
    serviceType: "",
    location: "",
    status: "approved" as "approved" | "not-approved",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [vendorsRes, locationsRes, categoriesRes] = await Promise.all([
        apiFetch<{ items: Vendor[] }>("/api/vendors"),
        apiFetch<{ items: Location[] }>("/api/locations"),
        apiFetch<{ items: VendorCategory[] }>("/api/vendor-categories"),
      ]);
      setVendors(vendorsRes?.items || []);
      setLocations(locationsRes?.items || []);
      setCategories(categoriesRes?.items || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      Alert.alert("Error", "Failed to get list data from the backend server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.serviceType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation =
        locationFilter === "all" || vendor.location === locationFilter;
      const matchesStatus =
        statusFilter === "all" || vendor.status === statusFilter;
      const matchesCategory =
        categoryFilter === "all" || vendor.serviceType === categoryFilter;
      return matchesSearch && matchesLocation && matchesStatus && matchesCategory;
    });
  }, [vendors, searchQuery, locationFilter, statusFilter, categoryFilter]);

  const approvedCount = useMemo(() => vendors.filter((v) => v.status === "approved").length, [vendors]);
  const notApprovedCount = useMemo(() => vendors.filter((v) => v.status === "not-approved").length, [vendors]);

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert("Validation Error", "Name is required");
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert("Validation Error", "Phone is required");
      return false;
    }
    if (!formData.serviceType.trim()) {
      Alert.alert("Validation Error", "Service category selection is required");
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      const payload = {
        ...formData,
        location: formData.location === "none-selected" ? "" : formData.location,
      };
      const res = await apiFetch<{ item: Vendor }>("/api/vendors", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setVendors([res.item, ...vendors]);
      setIsCreateOpen(false);
      resetForm();
      Alert.alert("Success", "Vendor added successfully");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const handleUpdate = async () => {
    if (!selectedVendor) return;
    if (!validateForm()) return;
    try {
      const payload = {
        ...formData,
        location: formData.location === "none-selected" ? "" : formData.location,
      };
      const res = await apiFetch<{ item: Vendor }>(`/api/vendors/${selectedVendor._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setVendors(vendors.map((v) => (v._id === res.item._id ? res.item : v)));
      setIsEditOpen(false);
      setSelectedVendor(null);
      resetForm();
      Alert.alert("Success", "Vendor updated successfully");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const openDeleteConfirmation = (vendor: Vendor) => {
    Alert.alert(
      "Delete Vendor",
      `Are you sure you want to delete ${vendor.name}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => handleDelete(vendor._id) },
      ]
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/vendors/${id}`, { method: "DELETE" });
      setVendors(vendors.filter((v) => v._id !== id));
      Alert.alert("Success", "Vendor deleted successfully");
    } catch (error) {
      Alert.alert("Deletion Failed", "Failed to delete item from server backend.");
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    try {
      const res = await apiFetch<{ item: VendorCategory }>("/api/vendor-categories", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      setCategories([...categories, res.item].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, serviceType: res.item.name });
      setIsNewCategoryOpen(false);
      setNewCategoryName("");
      Alert.alert("Success", "Category added successfully");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Something went wrong");
    }
  };

  const openView = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewOpen(true);
  };

  useEffect(() => {
    if (!viewId || !viewId.trim()) return;
    const match = vendors.find((v) => String(v._id) === viewId.trim());
    if (match) openView(match);
  }, [vendors, viewId]);

  const openEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone,
      email: vendor.email,
      street: vendor.street || "",
      city: vendor.city || "",
      state: vendor.state || "",
      zip: vendor.zip || "",
      website: vendor.website || "",
      serviceType: vendor.serviceType,
      location: vendor.location || "none-selected",
      status: vendor.status,
      notes: vendor.notes,
    });
    setIsEditOpen(true);
  };

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      street: "",
      city: "",
      state: "",
      zip: "",
      website: "",
      serviceType: categories[0]?.name || "",
      location: "none-selected",
      status: "approved",
      notes: "",
    });
  }, [categories]);

  const openCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const formatWebsite = (url: string) => {
    if (!url) return "";
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return `https://${url}`;
    }
    return url;
  };

  const handleOpenURL = async (url: string) => {
    const formatted = formatWebsite(url);
    const supported = await Linking.canOpenURL(formatted);
    if (supported) {
      await Linking.openURL(formatted);
    } else {
      Alert.alert("Error", "Can't open this website link on your device");
    }
  };

  const openPickerModal = (type: "category" | "location" | "status" | "form-location" | "form-status") => {
    let options: { label: string; value: string }[] = [];
    if (type === "category") {
      options = [{ label: "All Categories", value: "all" }, ...categories.map((c) => ({ label: c.name, value: c.name }))];
    } else if (type === "location") {
      options = [{ label: "All Locations", value: "all" }, ...locations.map((l) => ({ label: l.name, value: l.name }))];
    } else if (type === "status") {
      options = [{ label: "All Status", value: "all" }, { label: "Approved", value: "approved" }, { label: "Not Approved", value: "not-approved" }];
    } else if (type === "form-location") {
      options = [{ label: "None", value: "none-selected" }, ...locations.map((l) => ({ label: l.name, value: l.name }))];
    } else if (type === "form-status") {
      options = [{ label: "Approved", value: "approved" }, { label: "Not Approved", value: "not-approved" }];
    }
    setActivePicker({ type, options });
  };

  const handlePickerSelect = (value: string) => {
    if (!activePicker) return;
    const { type } = activePicker;
    if (type === "category") setCategoryFilter(value);
    else if (type === "location") setLocationFilter(value);
    else if (type === "status") setStatusFilter(value);
    else if (type === "form-location") setFormData({ ...formData, location: value });
    else if (type === "form-status") setFormData({ ...formData, status: value as any });
    setActivePicker(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vendor Rolodex</Text>
          <Text style={styles.headerSubtitle}>Manage vendors by location and category</Text>
        </View>
        <View style={styles.headerButtonsRow}>
          <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setIsNewCategoryOpen(true)}>
            <Plus size={14} color={colors.text} />
            <Text style={styles.btnOutlineText}>Category</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={openCreate}>
            <Plus size={14} color={colors.primaryText} />
            <Text style={styles.btnPrimaryText}>Vendor</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Vendors</Text>
            <Text style={styles.statValue}>{vendors.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={[styles.statValue, { color: colors.successText }]}>{approvedCount}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Not Approved</Text>
            <Text style={[styles.statValue, { color: colors.dangerText }]}>{notApprovedCount}</Text>
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vendors..."
              placeholderTextColor={colors.placeholderText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.dropdownsGrid}>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("category")}>
              <Text numberOfLines={1} style={styles.pickerTriggerText}>
                {categoryFilter === "all" ? "All Categories" : categoryFilter}
              </Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("location")}>
              <Text numberOfLines={1} style={styles.pickerTriggerText}>
                {locationFilter === "all" ? "All Locations" : locationFilter}
              </Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.pickerTrigger} onPress={() => openPickerModal("status")}>
              <Text numberOfLines={1} style={styles.pickerTriggerText}>
                {statusFilter === "all" ? "All Status" : statusFilter === "approved" ? "Approved" : "Not Approved"}
              </Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.listHeading}>Vendor Rolodex List</Text>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 24 }} />
        ) : filteredVendors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No vendors found</Text>
          </View>
        ) : (
          filteredVendors.map((vendor) => (
            <View key={vendor._id} style={styles.vendorCard}>
              <View style={styles.vendorCardHeader}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{vendor.serviceType}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, vendor.status === "approved" ? styles.bgSuccess : styles.bgDestructive]}>
                  {vendor.status === "approved" ? <CheckCircle size={12} color={colors.successText} /> : <XCircle size={12} color={colors.dangerText} />}
                  <Text style={[styles.statusBadgeText, vendor.status === "approved" ? styles.textSuccess : styles.textDestructive]}>
                    {vendor.status === "approved" ? "Approved" : "Not Approved"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetailsGrid}>
                {vendor.email ? (
                  <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`mailto:${vendor.email}`)}>
                    <Mail size={14} color={colors.textMuted} />
                    <Text style={[styles.detailText, styles.linkText]}>{vendor.email}</Text>
                  </TouchableOpacity>
                ) : null}

                {vendor.website ? (
                  <TouchableOpacity style={styles.detailRow} onPress={() => handleOpenURL(vendor.website)}>
                    <Globe size={14} color={colors.textMuted} />
                    <Text style={[styles.detailText, styles.linkText]}>{vendor.website}</Text>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.detailRow}>
                  <MapPin size={14} color={colors.textMuted} />
                  <Text style={styles.detailText}>{vendor.location || "No Location Specified"}</Text>
                </View>

                <TouchableOpacity style={styles.detailRow} onPress={() => Linking.openURL(`tel:${vendor.phone}`)}>
                  <Phone size={14} color={colors.textMuted} />
                  <Text style={styles.detailText}>{vendor.phone}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardActionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openView(vendor)}>
                  <Eye size={16} color={colors.textMuted} />
                  <Text style={styles.actionBtnText}>View</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(vendor)}>
                  <Edit size={16} color={colors.textMuted} />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openDeleteConfirmation(vendor)}>
                  <Trash2 size={16} color={colors.dangerText} />
                  <Text style={[styles.actionBtnText, { color: colors.dangerText }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={activePicker !== null} transparent animationType="fade" onRequestClose={() => setActivePicker(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActivePicker(null)}>
          <View style={styles.pickerContentContainer}>
            <Text style={styles.pickerModalTitle}>Select Option</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {activePicker?.options.map((opt, index) => (
                <TouchableOpacity key={index} style={styles.pickerOptionItem} onPress={() => handlePickerSelect(opt.value)}>
                  <Text style={styles.pickerOptionText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isNewCategoryOpen} transparent animationType="slide" onRequestClose={() => setIsNewCategoryOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalFormContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TouchableOpacity onPress={() => setIsNewCategoryOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.fieldLabel}>Category Name</Text>
            <TextInput
              style={styles.modalInput}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g., Electrical"
              placeholderTextColor={colors.placeholderText}
            />
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => setIsNewCategoryOpen(false)}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleAddCategory}>
                <Text style={styles.btnPrimaryText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isViewOpen} transparent animationType="slide" onRequestClose={() => setIsViewOpen(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Vendor Details</Text>
              <TouchableOpacity onPress={() => setIsViewOpen(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedVendor && (
              <View style={{ gap: 16, marginVertical: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={styles.viewVendorName}>{selectedVendor.name}</Text>
                  <View style={[styles.statusBadge, selectedVendor.status === "approved" ? styles.bgSuccess : styles.bgDestructive]}>
                    <Text style={selectedVendor.status === "approved" ? styles.textSuccess : styles.textDestructive}>
                      {selectedVendor.status === "approved" ? "Approved" : "Not Approved"}
                    </Text>
                  </View>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Service Category</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.serviceType}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Location</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.location || "—"}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Phone</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.phone}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Email</Text>
                  <Text style={styles.viewBlockValue}>{selectedVendor.email || "—"}</Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Website</Text>
                  <Text style={[styles.viewBlockValue, selectedVendor.website ? styles.linkText : null]}>
                    {selectedVendor.website || "—"}
                  </Text>
                </View>

                <View style={styles.viewDetailGridBlock}>
                  <Text style={styles.viewBlockLabel}>Address</Text>
                  <Text style={styles.viewBlockValue}>
                    {selectedVendor.street ? `${selectedVendor.street}\n` : ""}
                    {[selectedVendor.city, selectedVendor.state, selectedVendor.zip].filter(Boolean).join(", ") || "—"}
                  </Text>
                </View>

                {selectedVendor.notes ? (
                  <View style={styles.viewDetailGridBlock}>
                    <Text style={styles.viewBlockLabel}>Notes</Text>
                    <Text style={styles.viewNotesBox}>{selectedVendor.notes}</Text>
                  </View>
                ) : null}
              </View>
            )}

            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { marginTop: 12 }]} onPress={() => setIsViewOpen(false)}>
              <Text style={styles.btnPrimaryText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={isCreateOpen || isEditOpen} transparent animationType="slide" onRequestClose={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollFormContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{isCreateOpen ? "Add Vendor" : "Edit Vendor"}</Text>
              <TouchableOpacity onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12, marginVertical: 8 }}>
              <View>
                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput style={styles.modalInput} value={formData.name} onChangeText={(text) => setFormData({ ...formData, name: text })} placeholder="Vendor name" placeholderTextColor={colors.placeholderText} />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Phone *</Text>
                <TextInput style={styles.modalInput} keyboardType="phone-pad" value={formData.phone} onChangeText={(text) => setFormData({ ...formData, phone: text })} placeholder="Phone number" placeholderTextColor={colors.placeholderText} />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput style={styles.modalInput} keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={(text) => setFormData({ ...formData, email: text })} placeholder="Email address" placeholderTextColor={colors.placeholderText} />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Website</Text>
                <TextInput style={styles.modalInput} autoCapitalize="none" value={formData.website} onChangeText={(text) => setFormData({ ...formData, website: text })} placeholder="e.g., www.domain.com" placeholderTextColor={colors.placeholderText} />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Service Category *</Text>
                <TextInput style={styles.modalInput} value={formData.serviceType} onChangeText={(text) => setFormData({ ...formData, serviceType: text })} placeholder="e.g., Electrical, Plumbing" placeholderTextColor={colors.placeholderText} />
              </View>

              <View>
                <Text style={styles.fieldLabel}>Location</Text>
                <TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("form-location")}>
                  <Text style={styles.formPickerTriggerText}>{formData.location === "none-selected" ? "None" : formData.location}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View>
                <Text style={styles.fieldLabel}>Status *</Text>
                <TouchableOpacity style={styles.formPickerTrigger} onPress={() => openPickerModal("form-status")}>
                  <Text style={[styles.formPickerTriggerText, { textTransform: "capitalize" }]}>{formData.status === "not-approved" ? "Not Approved" : "Approved"}</Text>
                  <ChevronDown size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.formAddressGroup}>
                <Text style={styles.addressGroupTitle}>Address Data</Text>
                <View style={{ gap: 8 }}>
                  <TextInput style={styles.modalInput} value={formData.street} onChangeText={(text) => setFormData({ ...formData, street: text })} placeholder="Street Address" placeholderTextColor={colors.placeholderText} />
                  <TextInput style={styles.modalInput} value={formData.city} onChangeText={(text) => setFormData({ ...formData, city: text })} placeholder="City" placeholderTextColor={colors.placeholderText} />
                  <TextInput style={styles.modalInput} value={formData.state} onChangeText={(text) => setFormData({ ...formData, state: text })} placeholder="State" placeholderTextColor={colors.placeholderText} />
                  <TextInput style={styles.modalInput} keyboardType="numeric" value={formData.zip} onChangeText={(text) => setFormData({ ...formData, zip: text })} placeholder="Zip Code" placeholderTextColor={colors.placeholderText} />
                </View>
              </View>

              <View>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  style={[styles.modalInput, styles.textAreaInput]}
                  multiline
                  numberOfLines={3}
                  value={formData.notes}
                  onChangeText={(text) => setFormData({ ...formData, notes: text })}
                  placeholder="Additional notes..."
                  placeholderTextColor={colors.placeholderText}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => { setIsCreateOpen(false); setIsEditOpen(false); }}>
                <Text style={styles.btnOutlineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={isCreateOpen ? handleCreate : handleUpdate}>
                <Text style={styles.btnPrimaryText}>{isCreateOpen ? "Add Vendor" : "Save Changes"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}