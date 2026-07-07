import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Dimensions,
  Platform,
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard,
  Plus,
  Search,
  RefreshCw,
  Home,
  User,
  ChevronDown,
  X,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface UnitItem {
  _id: string;
  unitNumber: string;
  property?: {
    name: string;
  };
  assignedCustomer?: string;
  locationName?: string;
  type: string;
  status: string;
  rentalPrice: number | string;
  occupantName?: string;
}

interface PropertyItem {
  _id: string;
  name: string;
}

interface TenantItem {
  _id: string;
  name: string;
}

interface LocationItem {
  id: string | number;
  name: string;
}

interface ApiResponse<T> {
  success: boolean;
  items?: T[];
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:         uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:             uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:               uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:      isDark ? "#A1A1AA" : "#475569",
    textMuted:          isDark ? "#71717A" : "#64748B",
    border:             isDark ? "#27272A" : "#E2E8F0",
    borderLight:        isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:            isDark ? "#09090b" : "#F8FAFC",
    inputText:          isDark ? "#F4F4F5" : "#0F172A",
    placeholderText:    isDark ? "#52525B" : "#94A3B8",
    primary:            uiTheme.customColors?.primary || "#3b82f6",
    primaryText:        isDark ? "#09090b" : "#FFFFFF",
    badgeBg:            isDark ? "#27272A" : "#F1F5F9",
    badgeOccupiedBg:    isDark ? "rgba(59,130,246,0.15)" : "#E0F2FE",
    badgeOccupiedText:  isDark ? "#60A5FA" : "#0369A1",
    badgeVacantBg:      isDark ? "rgba(113,113,122,0.2)" : "#F4F4F5",
    badgeVacantText:    isDark ? "#A1A1AA" : "#475569",
    customerTeal:       isDark ? "#2DD4BF" : "#0D9488",
    rentGreen:          isDark ? "#34D399" : "#16A34A",
    overlayBg:          "rgba(0,0,0,0.5)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { paddingHorizontal: 16, paddingBottom: 32 },
    headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: colors.background },
    headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    titleContainer: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
    headerIcon: { marginRight: 8 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    rotatingIcon: { opacity: 0.5 },
    primaryActionButton: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", gap: 6 },
    primaryActionText: { color: colors.primaryText, fontSize: 13, fontWeight: "600" },
    searchCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginHorizontal: 16, marginBottom: 16 },
    searchBarInputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, height: 40 },
    searchBarIcon: { marginRight: 8 },
    searchBarTextInput: { flex: 1, fontSize: 13, color: colors.inputText },
    ledgerDataCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 4, overflow: "hidden" },
    tableMatrixMinWidthContainer: { minWidth: 1060 },
    simulatedTableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderCell: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 },
    tableDataBodyRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.cardBg },
    centerStatePadding: { width: "100%", paddingVertical: 40, justifyContent: "center", alignItems: "center" },
    emptyStateFallbackText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    colUnit: { width: 110, paddingRight: 12 },
    colProperty: { width: 160, paddingRight: 12 },
    colCustomer: { width: 140, paddingRight: 12 },
    colLocation: { width: 130, paddingRight: 12 },
    colType: { width: 110, paddingRight: 12 },
    colStatus: { width: 110, paddingRight: 12 },
    colRent: { width: 130, paddingRight: 12 },
    colOccupant: { width: 140, paddingRight: 12 },
    unitIdentityBlock: { flexDirection: "row", alignItems: "center", gap: 6 },
    unitNumberText: { fontSize: 13, fontWeight: "700", color: colors.text },
    propertyCellText: { fontSize: 13, color: colors.textSecondary },
    customerCellText: { fontSize: 13, fontWeight: "600", color: colors.customerTeal },
    locationCellText: { fontSize: 13, color: colors.textSecondary },
    typeBadgeFrame: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.borderLight, alignSelf: "flex-start" },
    typeBadgeText: { fontSize: 11, color: colors.textSecondary },
    statusBadgeFrame: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.badgeBg, alignSelf: "flex-start" },
    statusBadgeOccupiedFrame: { backgroundColor: colors.badgeOccupiedBg },
    statusBadgeVacantFrame: { backgroundColor: colors.badgeVacantBg },
    statusBadgeText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    statusBadgeOccupiedText: { color: colors.badgeOccupiedText },
    statusBadgeVacantText: { color: colors.badgeVacantText },
    rentPriceText: { fontSize: 13, fontWeight: "600", color: colors.rentGreen },
    occupantRowLayout: { flexDirection: "row", alignItems: "center", gap: 4 },
    occupantNameText: { fontSize: 12, color: colors.textSecondary },
    modalBlurOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    modalContentCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxHeight: height * 0.85, padding: 20, position: "relative" },
    modalCardHeaderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12, marginBottom: 16 },
    modalCardTitleHeading: { fontSize: 18, fontWeight: "800", color: colors.text },
    closeModalCrossButton: { padding: 4 },
    modalFormScrollContainer: { flexGrow: 0, marginBottom: 8 },
    formInputGroupSpacer: { marginBottom: 14, width: "100%" },
    formElementFieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
    formInputFieldText: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 40, paddingHorizontal: 12, fontSize: 13, color: colors.text, backgroundColor: colors.background },
    formSplitColumnsContainer: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 14 },
    formSplitFieldColumn: { flex: 1 },
    customSelectInputAnchor: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 40, paddingHorizontal: 12, backgroundColor: colors.background },
    customSelectAnchorText: { fontSize: 13, color: colors.text },
    modalCardActionsFooterRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 14 },
    modalCancelButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    modalCancelButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    modalSubmitButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colors.primary },
    modalSubmitButtonText: { fontSize: 12, fontWeight: "600", color: colors.primaryText },
    inlineDropdownOverlayContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayBg, justifyContent: "center", alignItems: "center", padding: 16, zIndex: 9999 },
    inlineDropdownCardWindow: { backgroundColor: colors.cardBg, width: "100%", maxWidth: 340, maxHeight: "65%", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
    inlineDropdownHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 8 },
    inlineDropdownHeaderTitleText: { fontSize: 14, fontWeight: "700", color: colors.text },
    pickerRowSelectionButtonAnchor: { paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pickerRowCategoryValueText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
    activeSelectionText: { color: colors.primary, fontWeight: "700" },
  });
}

export default function UnitManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<UnitItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const [activePickerField, setActivePickerField] = useState<"property" | "tenant" | "location" | "type" | null>(null);

  const [form, setForm] = useState({
    property: "",
    unitNumber: "",
    type: "Residential",
    status: "Vacant",
    rentalPrice: "",
    assignedCustomer: "",
    locationName: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [unitsRes, propsRes, tenantsRes, locationsRes] = await Promise.all([
        apiFetch<ApiResponse<UnitItem>>("/api/atlasbook/units"),
        apiFetch<ApiResponse<PropertyItem>>("/api/atlasbook/properties"),
        apiFetch<ApiResponse<TenantItem>>("/api/atlasbook/tenants").catch(() => null),
        apiFetch<any>("/api/locations").catch(() => null),
      ]);

      if (unitsRes?.success) setItems(unitsRes.items || []);
      if (propsRes?.success) setProperties(propsRes.items || []);
      if (tenantsRes?.success) setTenants(tenantsRes.items || []);
      if (locationsRes?.items) setLocations(locationsRes.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    try {
      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/units", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          property: "",
          unitNumber: "",
          type: "Residential",
          status: "Vacant",
          rentalPrice: "",
          assignedCustomer: "",
          locationName: "",
        });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = useMemo(() => {
    return items.filter(
      (i) =>
        i.unitNumber?.toLowerCase().includes(q.toLowerCase()) ||
        i.property?.name?.toLowerCase().includes(q.toLowerCase()) ||
        i.assignedCustomer?.toLowerCase().includes(q.toLowerCase()) ||
        i.locationName?.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, q]);

  const pickerOptions = useMemo(() => {
    if (activePickerField === "property") {
      return properties.map((p) => ({ id: p._id, name: p.name }));
    }
    if (activePickerField === "tenant") {
      return tenants.map((t) => ({ id: t.name, name: t.name }));
    }
    if (activePickerField === "location") {
      return locations.map((l) => ({ id: l.name, name: l.name }));
    }
    if (activePickerField === "type") {
      return ["Residential", "Commercial", "Industrial"].map((t) => ({ id: t, name: t }));
    }
    return [];
  }, [activePickerField, properties, tenants, locations]);

  const handleSelectOption = (value: string) => {
    if (activePickerField === "property") setForm((f) => ({ ...f, property: value }));
    if (activePickerField === "tenant") setForm((f) => ({ ...f, assignedCustomer: value }));
    if (activePickerField === "location") setForm((f) => ({ ...f, locationName: value }));
    if (activePickerField === "type") setForm((f) => ({ ...f, type: value }));
    setActivePickerField(null);
  };

  const currentActiveValue = useMemo(() => {
    if (activePickerField === "property") return form.property;
    if (activePickerField === "tenant") return form.assignedCustomer;
    if (activePickerField === "location") return form.locationName;
    if (activePickerField === "type") return form.type;
    return "";
  }, [activePickerField, form]);

  const selectedPropertyName = useMemo(() => {
    const found = properties.find((p) => p._id === form.property);
    return found ? found.name : "Select Property...";
  }, [properties, form.property]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <LayoutDashboard size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Unit Management</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading} activeOpacity={0.7}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.rotatingIcon : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)} activeOpacity={0.8}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>Add Unit</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Manage individual units, occupancy, and rental information.</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchBarInputContainer}>
          <Search size={16} color={colors.textMuted} style={styles.searchBarIcon} />
          <TextInput
            style={styles.searchBarTextInput}
            placeholder="Search units, properties, customers, or locations..."
            placeholderTextColor={colors.placeholderText}
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.ledgerDataCard}>
          <ScrollView horizontal showsHorizontalScrollIndicator >
            <View style={styles.tableMatrixMinWidthContainer}>
              <View style={styles.simulatedTableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit #</Text>
                <Text style={[styles.tableHeaderCell, styles.colProperty]}>Property</Text>
                <Text style={[styles.tableHeaderCell, styles.colCustomer]}>Customer</Text>
                <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
                <Text style={[styles.tableHeaderCell, styles.colType]}>Type</Text>
                <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
                <Text style={[styles.tableHeaderCell, styles.colRent]}>Monthly Rent</Text>
                <Text style={[styles.tableHeaderCell, styles.colOccupant]}>Occupant</Text>
              </View>

              {loading ? (
                <View style={styles.centerStatePadding}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : filtered.length === 0 ? (
                <View style={styles.centerStatePadding}>
                  <Text style={styles.emptyStateFallbackText}>No units found.</Text>
                </View>
              ) : (
                filtered.map((item, index) => {
                  const isOccupied = item.status === "Occupied";
                  const isVacant = item.status === "Vacant";
                  const rent = Number(item.rentalPrice) || 0;

                  return (
                    <View key={item._id || String(index)} style={styles.tableDataBodyRow}>
                      <View style={[styles.colUnit, styles.unitIdentityBlock]}>
                        <Home size={14} color={colors.primary} />
                        <Text style={styles.unitNumberText} numberOfLines={1}>{item.unitNumber}</Text>
                      </View>

                      <View style={styles.colProperty}>
                        <Text style={styles.propertyCellText} numberOfLines={1}>
                          {item.property?.name || "N/A"}
                        </Text>
                      </View>

                      <View style={styles.colCustomer}>
                        <Text style={styles.customerCellText} numberOfLines={1}>
                          {item.assignedCustomer || "None"}
                        </Text>
                      </View>

                      <View style={styles.colLocation}>
                        <Text style={styles.locationCellText} numberOfLines={1}>
                          {item.locationName || "None"}
                        </Text>
                      </View>

                      <View style={styles.colType}>
                        <View style={styles.typeBadgeFrame}>
                          <Text style={styles.typeBadgeText} numberOfLines={1}>{item.type}</Text>
                        </View>
                      </View>

                      <View style={styles.colStatus}>
                        <View
                          style={[
                            styles.statusBadgeFrame,
                            isOccupied ? styles.statusBadgeOccupiedFrame : null,
                            isVacant ? styles.statusBadgeVacantFrame : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isOccupied ? styles.statusBadgeOccupiedText : null,
                              isVacant ? styles.statusBadgeVacantText : null,
                            ]}
                            numberOfLines={1}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.colRent}>
                        <Text style={styles.rentPriceText} numberOfLines={1}>
                          ${rent.toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.colOccupant}>
                        <View style={styles.occupantRowLayout}>
                          <User size={12} color={colors.textMuted} />
                          <Text style={styles.occupantNameText} numberOfLines={1}>
                            {item.occupantName || "None"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      <Modal animationType="slide" transparent visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalCardHeaderTopRow}>
              <Text style={styles.modalCardTitleHeading}>Add New Unit</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton} activeOpacity={0.7}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.formInputGroupSpacer}>
                <Text style={styles.formElementFieldLabel}>Assign to Property</Text>
                <TouchableOpacity
                  style={styles.customSelectInputAnchor}
                  onPress={() => setActivePickerField("property")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.customSelectAnchorText} numberOfLines={1}>{selectedPropertyName}</Text>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formInputGroupSpacer}>
                <Text style={styles.formElementFieldLabel}>Unit Number / ID</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="e.g., Suite 101"
                  placeholderTextColor={colors.placeholderText}
                  value={form.unitNumber}
                  onChangeText={(text) => setForm({ ...form, unitNumber: text })}
                />
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Customer / Tenant</Text>
                  <TouchableOpacity
                    style={styles.customSelectInputAnchor}
                    onPress={() => setActivePickerField("tenant")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customSelectAnchorText} numberOfLines={1}>
                      {form.assignedCustomer || "None"}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Location</Text>
                  <TouchableOpacity
                    style={styles.customSelectInputAnchor}
                    onPress={() => setActivePickerField("location")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customSelectAnchorText} numberOfLines={1}>
                      {form.locationName || "None"}
                    </Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Monthly Rent</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.rentalPrice}
                    onChangeText={(text) => setForm({ ...form, rentalPrice: text })}
                  />
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Type</Text>
                  <TouchableOpacity
                    style={styles.customSelectInputAnchor}
                    onPress={() => setActivePickerField("type")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customSelectAnchorText}>{form.type}</Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitButtonAction} onPress={handleCreate} activeOpacity={0.8}>
                <Text style={styles.modalSubmitButtonText}>Save Unit</Text>
              </TouchableOpacity>
            </View>

            {activePickerField !== null && (
              <View style={styles.inlineDropdownOverlayContainer}>
                <View style={styles.inlineDropdownCardWindow}>
                  <View style={styles.inlineDropdownHeaderRow}>
                    <Text style={styles.inlineDropdownHeaderTitleText}>
                      {activePickerField === "property" && "Assign to Property"}
                      {activePickerField === "tenant" && "Customer / Tenant"}
                      {activePickerField === "location" && "Location"}
                      {activePickerField === "type" && "Type"}
                    </Text>
                    <TouchableOpacity onPress={() => setActivePickerField(null)}>
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {activePickerField !== "type" && (
                      <TouchableOpacity
                        style={styles.pickerRowSelectionButtonAnchor}
                        onPress={() => handleSelectOption("")}
                      >
                        <Text style={[styles.pickerRowCategoryValueText, !currentActiveValue ? styles.activeSelectionText : null]}>
                          {activePickerField === "property" ? "Select Property..." : "None"}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {pickerOptions.map((opt, idx) => {
                      const isSelected = currentActiveValue === opt.id;
                      return (
                        <TouchableOpacity
                          key={`${String(opt.id)}-${idx}`}
                          style={styles.pickerRowSelectionButtonAnchor}
                          onPress={() => handleSelectOption(String(opt.id))}
                        >
                          <Text style={[styles.pickerRowCategoryValueText, isSelected ? styles.activeSelectionText : null]}>
                            {opt.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  ); 
}