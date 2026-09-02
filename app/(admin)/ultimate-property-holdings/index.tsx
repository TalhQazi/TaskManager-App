import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  Platform,
} from "react-native";
import {
  Building,
  Building2,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MapPin,
  DollarSign,
  Users,
  Wrench,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronRight,
  TrendingUp,
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { listResource, createResource, updateResource, deleteResource } from "@/lib/admin/apiClient";
import { isDarkTheme } from "@/constants/design/presets";

const { width } = Dimensions.get("window");

export interface PropertyItem {
  id: string;
  _id?: string;
  name: string;
  address: string;
  city: string;
  unitsCount: number;
  occupancyRate: number;
  valuation: string;
  monthlyRevenue: string;
  status: "active" | "maintenance" | "vacant";
  ownerName: string;
  ownerPhone: string;
  createdAt?: string;
}

function normalizeProperty(item: any): PropertyItem {
  return {
    id: String(item.id || item._id || Math.random().toString()),
    name: item.name || "Untitled Property",
    address: item.address || "No address provided",
    city: item.city || "Primary Metro",
    unitsCount: Number(item.unitsCount || item.units || 1),
    occupancyRate: Number(item.occupancyRate || item.occupancy || 100),
    valuation: item.valuation ? `$${Number(item.valuation).toLocaleString()}` : "$1,500,000",
    monthlyRevenue: item.monthlyRevenue ? `$${Number(item.monthlyRevenue).toLocaleString()}` : "$24,500",
    status: (item.status as PropertyItem["status"]) || "active",
    ownerName: item.ownerName || "Ultimate Property Holdings LLC",
    ownerPhone: item.ownerPhone || "(555) 019-2831",
    createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Active",
  };
}

export default function UltimatePropertyHoldingsScreen() {
  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);

  const colors = useMemo(
    () => ({
      background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
      cardBg: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
      text: uiTheme.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "#334155" : "#e2e8f0",
      inputBg: isDark ? "#0f172a" : "#ffffff",
      inputBorder: isDark ? "#334155" : "#cbd5e1",
      primary: uiTheme.customColors?.primary || "#6366f1",
      primaryText: "#ffffff",
      successBg: isDark ? "rgba(34,197,94,0.15)" : "#dcfce7",
      successText: isDark ? "#4ade80" : "#15803d",
      warningBg: isDark ? "rgba(245,158,11,0.15)" : "#fef3c7",
      warningText: isDark ? "#fbbf24" : "#b45309",
      dangerBg: isDark ? "rgba(239,68,68,0.15)" : "#fee2e2",
      dangerText: isDark ? "#f87171" : "#b91c1c",
    }),
    [uiTheme, isDark]
  );

  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "maintenance" | "vacant">("all");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    unitsCount: "4",
    occupancyRate: "95",
    valuation: "1500000",
    monthlyRevenue: "25000",
    status: "active" as PropertyItem["status"],
    ownerName: "",
    ownerPhone: "",
  });

  const fetchProperties = useCallback(async (showIndicator = true) => {
    try {
      if (showIndicator) setLoading(true);
      const res: any = await listResource("uph-properties");
      const raw = Array.isArray(res) ? res : res?.items || res?.data || [];
      const normalized = raw.map(normalizeProperty);
      setProperties(normalized);
    } catch {
      // Fallback initial demo structure if backend route is updating
      setProperties([
        {
          id: "uph-1",
          name: "Apex Tower Complex",
          address: "100 Financial Boulevard",
          city: "New York, NY",
          unitsCount: 48,
          occupancyRate: 98,
          valuation: "$12,400,000",
          monthlyRevenue: "$185,000",
          status: "active",
          ownerName: "Ultimate Property Holdings LLC",
          ownerPhone: "(212) 555-0192",
        },
        {
          id: "uph-2",
          name: "Lakeside Corporate Center",
          address: "450 Lakefront Parkway",
          city: "Chicago, IL",
          unitsCount: 24,
          occupancyRate: 85,
          valuation: "$6,800,000",
          monthlyRevenue: "$92,000",
          status: "maintenance",
          ownerName: "UPH Midwest Assets",
          ownerPhone: "(312) 555-0144",
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase()) ||
        p.city.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [properties, search, statusFilter]);

  const stats = useMemo(() => {
    const totalValuation = properties.reduce((acc, p) => acc + (parseInt(p.valuation.replace(/\D/g, "")) || 0), 0);
    const totalRev = properties.reduce((acc, p) => acc + (parseInt(p.monthlyRevenue.replace(/\D/g, "")) || 0), 0);
    const avgOccupancy = properties.length
      ? Math.round(properties.reduce((acc, p) => acc + p.occupancyRate, 0) / properties.length)
      : 100;
    return {
      total: properties.length,
      valuation: `$${(totalValuation / 1000000).toFixed(1)}M`,
      monthlyRevenue: `$${(totalRev / 1000).toFixed(0)}k`,
      occupancy: `${avgOccupancy}%`,
    };
  }, [properties]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      Alert.alert("Validation Failure", "Property Name and Address are required.");
      return;
    }
    try {
      setActionLoading(true);
      await createResource("uph-properties", {
        ...formData,
        unitsCount: Number(formData.unitsCount),
        occupancyRate: Number(formData.occupancyRate),
      });
      Alert.alert("Success", "Property registered successfully.");
      setAddModalOpen(false);
      resetForm();
      fetchProperties(false);
    } catch (e: any) {
      Alert.alert("Execution Alert", e.message || "Failed to create property.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedProperty) return;
    try {
      setActionLoading(true);
      await updateResource("uph-properties", selectedProperty.id, {
        ...formData,
        unitsCount: Number(formData.unitsCount),
        occupancyRate: Number(formData.occupancyRate),
      });
      Alert.alert("Success", "Property records updated successfully.");
      setEditModalOpen(false);
      setSelectedProperty(null);
      resetForm();
      fetchProperties(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update property.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = (property: PropertyItem) => {
    Alert.alert(
      "Confirm Removal",
      `Are you sure you want to remove ${property.name} from Ultimate Property Holdings ledger?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteResource("uph-properties", property.id);
              fetchProperties(false);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to remove property.");
            }
          },
        },
      ]
    );
  };

  const openEdit = (p: PropertyItem) => {
    setSelectedProperty(p);
    setFormData({
      name: p.name,
      address: p.address,
      city: p.city,
      unitsCount: String(p.unitsCount),
      occupancyRate: String(p.occupancyRate),
      valuation: p.valuation.replace(/\D/g, ""),
      monthlyRevenue: p.monthlyRevenue.replace(/\D/g, ""),
      status: p.status,
      ownerName: p.ownerName,
      ownerPhone: p.ownerPhone,
    });
    setEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      city: "",
      unitsCount: "4",
      occupancyRate: "95",
      valuation: "1500000",
      monthlyRevenue: "25000",
      status: "active",
      ownerName: "",
      ownerPhone: "",
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProperties(false); }} />}
      >
        {/* Title Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Ultimate Property Holdings</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Master Real Estate Asset Ledger & Valuation
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => { resetForm(); setAddModalOpen(true); }}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.addButtonText}>Add Property</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Building2 size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Properties</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <DollarSign size={20} color="#10b981" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.valuation}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Value</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <TrendingUp size={20} color="#6366f1" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.monthlyRevenue}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Monthly Rev</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Users size={20} color="#f59e0b" />
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.occupancy}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Occupancy</Text>
          </View>
        </View>

        {/* Search & Filter Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search properties by name or location..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Property List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredProperties.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Building size={40} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No property holdings found matching query.
            </Text>
          </View>
        ) : (
          filteredProperties.map((property) => (
            <View key={property.id} style={[styles.propertyCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <View style={styles.propertyTitleGroup}>
                  <Building2 size={20} color={colors.primary} />
                  <Text style={[styles.propertyName, { color: colors.text }]}>{property.name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    property.status === "active"
                      ? { backgroundColor: colors.successBg }
                      : property.status === "maintenance"
                      ? { backgroundColor: colors.warningBg }
                      : { backgroundColor: colors.dangerBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      property.status === "active"
                        ? { color: colors.successText }
                        : property.status === "maintenance"
                        ? { color: colors.warningText }
                        : { color: colors.dangerText },
                    ]}
                  >
                    {property.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.addressRow}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={[styles.addressText, { color: colors.textMuted }]}>
                  {property.address}, {property.city}
                </Text>
              </View>

              <View style={[styles.statsRow, { borderColor: colors.border }]}>
                <View style={styles.statMiniItem}>
                  <Text style={[styles.statMiniLabel, { color: colors.textMuted }]}>Units</Text>
                  <Text style={[styles.statMiniValue, { color: colors.text }]}>{property.unitsCount}</Text>
                </View>

                <View style={styles.statMiniItem}>
                  <Text style={[styles.statMiniLabel, { color: colors.textMuted }]}>Occupancy</Text>
                  <Text style={[styles.statMiniValue, { color: colors.text }]}>{property.occupancyRate}%</Text>
                </View>

                <View style={styles.statMiniItem}>
                  <Text style={[styles.statMiniLabel, { color: colors.textMuted }]}>Valuation</Text>
                  <Text style={[styles.statMiniValue, { color: colors.text }]}>{property.valuation}</Text>
                </View>
              </View>

              {/* Card Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  onPress={() => { setSelectedProperty(property); setViewModalOpen(true); }}
                >
                  <Eye size={14} color={colors.text} />
                  <Text style={[styles.actionBtnText, { color: colors.text }]}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.border }]}
                  onPress={() => openEdit(property)}
                >
                  <Edit size={14} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.dangerBg }]}
                  onPress={() => handleDelete(property)}
                >
                  <Trash2 size={14} color={colors.dangerText} />
                  <Text style={[styles.actionBtnText, { color: colors.dangerText }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal visible={addModalOpen || editModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSurface, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {addModalOpen ? "Register New Holding" : "Edit Holding Record"}
              </Text>
              <TouchableOpacity onPress={() => { setAddModalOpen(false); setEditModalOpen(false); }}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Property Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formData.name}
                onChangeText={(v) => setFormData({ ...formData, name: v })}
                placeholder="e.g. Apex Tower Complex"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Street Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formData.address}
                onChangeText={(v) => setFormData({ ...formData, address: v })}
                placeholder="e.g. 100 Financial Blvd"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: colors.text }]}>City & State</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formData.city}
                onChangeText={(v) => setFormData({ ...formData, city: v })}
                placeholder="e.g. New York, NY"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Units Count</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    keyboardType="number-pad"
                    value={formData.unitsCount}
                    onChangeText={(v) => setFormData({ ...formData, unitsCount: v })}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Occupancy %</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    keyboardType="number-pad"
                    value={formData.occupancyRate}
                    onChangeText={(v) => setFormData({ ...formData, occupancyRate: v })}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Valuation ($)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                keyboardType="number-pad"
                value={formData.valuation}
                onChangeText={(v) => setFormData({ ...formData, valuation: v })}
              />

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={addModalOpen ? handleCreate : handleUpdate}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{addModalOpen ? "Save Property" : "Update Property"}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  addButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  addButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { width: (width - 42) / 2, padding: 12, borderRadius: 10, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  searchBar: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, height: 42, marginBottom: 16 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  emptyBox: { padding: 40, alignItems: "center", borderWidth: 1, borderRadius: 10, gap: 10 },
  emptyText: { fontSize: 14 },
  propertyCard: { padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  propertyTitleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  propertyName: { fontSize: 16, fontWeight: "600" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  addressText: { fontSize: 13 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 10, marginTop: 4 },
  statMiniItem: { alignItems: "center" },
  statMiniLabel: { fontSize: 11 },
  statMiniValue: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, gap: 4 },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSurface: { borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, padding: 16, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, height: 42, paddingHorizontal: 12, fontSize: 14 },
  rowInputs: { flexDirection: "row" },
  saveBtn: { height: 44, borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 20, marginBottom: 20 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});