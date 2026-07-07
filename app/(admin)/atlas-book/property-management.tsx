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
  Landmark,
  Plus,
  Search,
  RefreshCw,
  MapPin,
  ChevronDown,
  X,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface PropertyItem {
  _id: string;
  name: string;
  address: string;
  parcelInformation?: string;
  purchasePrice: number | string;
  status: string;
  assignedCustomer?: string;
  assignedUnit?: string;
  locationName?: string;
}

interface TenantItem {
  _id: string;
  name: string;
}

interface UnitItem {
  _id: string;
  unitNumber: string;
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
    background:       uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:           uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:             uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:    isDark ? "#A1A1AA" : "#475569",
    textMuted:        isDark ? "#71717A" : "#64748B",
    border:           isDark ? "#27272A" : "#E2E8F0",
    borderLight:      isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:          isDark ? "#09090b" : "#F8FAFC",
    inputText:        isDark ? "#F4F4F5" : "#0F172A",
    placeholderText:  isDark ? "#52525B" : "#94A3B8",
    primary:          uiTheme.customColors?.primary || "#3b82f6",
    primaryText:      isDark ? "#09090b" : "#FFFFFF",
    badgeActiveBg:    isDark ? "rgba(59,130,246,0.15)" : "#E0F2FE",
    badgeActiveText:  isDark ? "#60A5FA" : "#0369A1",
    customerText:     isDark ? "#2DD4BF" : "#0D9488",
    overlayBg:        "rgba(0,0,0,0.5)",
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
    searchCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginHorizontal: 16, marginBottom: 16 },
    searchBarInputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12, height: 44 },
    searchBarIcon: { marginRight: 8 },
    searchBarTextInput: { flex: 1, fontSize: 13, color: colors.inputText },
    ledgerDataCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, overflow: "hidden" },
    tableMatrixMinWidthContainer: { minWidth: 960 },
    simulatedTableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderCell: { fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
    tableDataBodyRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.cardBg },
    rowZebraAlternateBg: { backgroundColor: colors.borderLight },
    centerStatePadding: { width: "100%", paddingVertical: 40, justifyContent: "center", alignItems: "center" },
    emptyStateFallbackText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    colName: { width: 180, paddingRight: 12 },
    colAddress: { width: 200, paddingRight: 12 },
    colPrice: { width: 120, paddingRight: 12 },
    colCustomer: { width: 130, paddingRight: 12 },
    colLocation: { width: 120, paddingRight: 12 },
    colUnit: { width: 90, paddingRight: 12 },
    colStatus: { width: 110, paddingRight: 12 },
    colActions: { width: 110, alignItems: "flex-end" },
    propertyNameText: { fontSize: 14, fontWeight: "700", color: colors.text },
    addressInlineLayout: { flexDirection: "row", alignItems: "center", gap: 4 },
    addressCellText: { fontSize: 13, color: colors.textSecondary },
    priceCellText: { fontSize: 13, fontWeight: "600", color: colors.text },
    customerCellText: { fontSize: 13, fontWeight: "600", color: colors.customerText },
    metaCellText: { fontSize: 13, color: colors.textSecondary },
    statusBadgeFrame: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.borderLight, alignSelf: "flex-start" },
    statusBadgeActiveFrame: { backgroundColor: colors.badgeActiveBg },
    statusBadgeText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    statusBadgeActiveText: { color: colors.badgeActiveText },
    rowActionButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
    rowActionButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    textAlignRight: { textAlign: "right" },
    modalBlurOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    modalContentCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxHeight: height * 0.85, padding: 20, position: "relative" },
    modalCardHeaderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12, marginBottom: 16 },
    modalHeaderTitleContainer: { flex: 1, paddingRight: 8 },
    modalCardTitleHeading: { fontSize: 18, fontWeight: "800", color: colors.text },
    modalCardSubtitleDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
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

export default function PropertyManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<PropertyItem[]>([]);
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const [activePickerField, setActivePickerField] = useState<"status" | "tenant" | "location" | "unit" | null>(null);

  const [form, setForm] = useState({
    name: "",
    address: "",
    parcelInformation: "",
    purchasePrice: "",
    status: "Active",
    assignedCustomer: "",
    assignedUnit: "",
    locationName: "",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [res, tenantsRes, unitsRes, locationsRes] = await Promise.all([
        apiFetch<ApiResponse<PropertyItem>>("/api/atlasbook/properties"),
        apiFetch<ApiResponse<TenantItem>>("/api/atlasbook/tenants").catch(() => null),
        apiFetch<ApiResponse<UnitItem>>("/api/atlasbook/units").catch(() => null),
        apiFetch<any>("/api/locations").catch(() => null),
      ]);

      if (res?.success) setItems(res.items || []);
      if (tenantsRes?.success) setTenants(tenantsRes.items || []);
      if (unitsRes?.success) setUnits(unitsRes.items || []);
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
      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/properties", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          name: "",
          address: "",
          parcelInformation: "",
          purchasePrice: "",
          status: "Active",
          assignedCustomer: "",
          assignedUnit: "",
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
        i.name?.toLowerCase().includes(q.toLowerCase()) ||
        i.address?.toLowerCase().includes(q.toLowerCase()) ||
        i.assignedCustomer?.toLowerCase().includes(q.toLowerCase()) ||
        i.locationName?.toLowerCase().includes(q.toLowerCase()) ||
        i.assignedUnit?.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, q]);

  const pickerOptions = useMemo(() => {
    if (activePickerField === "status") {
      return ["Active", "Maintenance", "Sold"].map((s) => ({ id: s, name: s }));
    }
    if (activePickerField === "tenant") {
      return tenants.map((t) => ({ id: t.name, name: t.name }));
    }
    if (activePickerField === "location") {
      return locations.map((l) => ({ id: l.name, name: l.name }));
    }
    if (activePickerField === "unit") {
      return units.map((u) => ({ id: u.unitNumber, name: u.unitNumber }));
    }
    return [];
  }, [activePickerField, tenants, locations, units]);

  const handleSelectOption = (value: string) => {
    if (activePickerField === "status") setForm((f) => ({ ...f, status: value }));
    if (activePickerField === "tenant") setForm((f) => ({ ...f, assignedCustomer: value }));
    if (activePickerField === "location") setForm((f) => ({ ...f, locationName: value }));
    if (activePickerField === "unit") setForm((f) => ({ ...f, assignedUnit: value }));
    setActivePickerField(null);
  };

  const currentActiveValue = useMemo(() => {
    if (activePickerField === "status") return form.status;
    if (activePickerField === "tenant") return form.assignedCustomer;
    if (activePickerField === "location") return form.locationName;
    if (activePickerField === "unit") return form.assignedUnit;
    return "";
  }, [activePickerField, form]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Landmark size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Property Management</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading} activeOpacity={0.7}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.rotatingIcon : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)} activeOpacity={0.8}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>Add Property</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Register and track all company-owned properties and parcels.</Text>
      </View>

      <View style={styles.searchCard}>
        <View style={styles.searchBarInputContainer}>
          <Search size={16} color={colors.textMuted} style={styles.searchBarIcon} />
          <TextInput
            style={styles.searchBarTextInput}
            placeholder="Search by name, address, customer, unit, or location..."
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
          <ScrollView horizontal showsHorizontalScrollIndicator bounciness={0}>
  <View style={styles.tableMatrixMinWidthContainer}>
    <View style={styles.simulatedTableHeaderRow}>
      <Text style={[styles.tableHeaderCell, styles.colName]}>Property Name</Text>
      <Text style={[styles.tableHeaderCell, styles.colAddress]}>Address</Text>
      <Text style={[styles.tableHeaderCell, styles.colPrice]}>Purchase Price</Text>
      <Text style={[styles.tableHeaderCell, styles.colCustomer]}>Customer</Text>
      <Text style={[styles.tableHeaderCell, styles.colLocation]}>Location</Text>
      <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
      <Text style={[styles.tableHeaderCell, styles.colStatus]}>Status</Text>
      <Text style={[styles.tableHeaderCell, styles.colActions, styles.textAlignRight]}>Actions</Text>
    </View>

    {loading ? (
      <View style={styles.centerStatePadding}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    ) : filtered.length === 0 ? (
      <View style={styles.centerStatePadding}>
        <Text style={styles.emptyStateFallbackText}>No properties found.</Text>
      </View>
    ) : (
      filtered.map((item, index) => {
        const isActive = item.status === "Active";
        const price = Number(item.purchasePrice) || 0;

        return (
          <View
            key={item._id || String(index)}
            style={styles.tableDataBodyRow}
          >
            <View style={styles.colName}>
              <Text style={styles.propertyNameText} numberOfLines={1}>{item.name}</Text>
            </View>

            <View style={[styles.colAddress, styles.addressInlineLayout]}>
              <MapPin size={12} color={colors.textMuted} />
              <Text style={styles.addressCellText} numberOfLines={1}>{item.address}</Text>
            </View>

            <View style={styles.colPrice}>
              <Text style={styles.priceCellText} numberOfLines={1}>
                ${price.toLocaleString()}
              </Text>
            </View>

            <View style={styles.colCustomer}>
              <Text style={styles.customerCellText} numberOfLines={1}>
                {item.assignedCustomer || "None"}
              </Text>
            </View>

            <View style={styles.colLocation}>
              <Text style={styles.metaCellText} numberOfLines={1}>
                {item.locationName || "None"}
              </Text>
            </View>

            <View style={styles.colUnit}>
              <Text style={styles.metaCellText} numberOfLines={1}>
                {item.assignedUnit || "None"}
              </Text>
            </View>

            <View style={styles.colStatus}>
              <View style={[styles.statusBadgeFrame, isActive ? styles.statusBadgeActiveFrame : null]}>
                <Text style={[styles.statusBadgeText, isActive ? styles.statusBadgeActiveText : null]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <View style={styles.colActions}>
              <TouchableOpacity style={styles.rowActionButton} activeOpacity={0.7}>
                <Text style={styles.rowActionButtonText}>Manage Units</Text>
              </TouchableOpacity>
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
              <View style={styles.modalHeaderTitleContainer}>
                <Text style={styles.modalCardTitleHeading}>Add New Property</Text>
                <Text style={styles.modalCardSubtitleDesc}>Enter the legal and financial details of the property.</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton} activeOpacity={0.7}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.formInputGroupSpacer}>
                <Text style={styles.formElementFieldLabel}>Property Name</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="e.g., Downtown Plaza"
                  placeholderTextColor={colors.placeholderText}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                />
              </View>

              <View style={styles.formInputGroupSpacer}>
                <Text style={styles.formElementFieldLabel}>Address</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="Full physical address"
                  placeholderTextColor={colors.placeholderText}
                  value={form.address}
                  onChangeText={(text) => setForm({ ...form, address: text })}
                />
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Purchase Price</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.purchasePrice}
                    onChangeText={(text) => setForm({ ...form, purchasePrice: text })}
                  />
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Status</Text>
                  <TouchableOpacity
                    style={styles.customSelectInputAnchor}
                    onPress={() => setActivePickerField("status")}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customSelectAnchorText}>{form.status}</Text>
                    <ChevronDown size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
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

              <View style={styles.formInputGroupSpacer}>
                <Text style={styles.formElementFieldLabel}>Assigned Unit</Text>
                <TouchableOpacity
                  style={styles.customSelectInputAnchor}
                  onPress={() => setActivePickerField("unit")}
                  activeOpacity={0.7}
                >
                  <Text style={styles.customSelectAnchorText} numberOfLines={1}>
                    {form.assignedUnit || "None"}
                  </Text>
                  <ChevronDown size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitButtonAction} onPress={handleCreate} activeOpacity={0.8}>
                <Text style={styles.modalSubmitButtonText}>Save Property</Text>
              </TouchableOpacity>
            </View>

            {activePickerField !== null && (
              <View style={styles.inlineDropdownOverlayContainer}>
                <View style={styles.inlineDropdownCardWindow}>
                  <View style={styles.inlineDropdownHeaderRow}>
                    <Text style={styles.inlineDropdownHeaderTitleText}>
                      Select {activePickerField.charAt(0).toUpperCase() + activePickerField.slice(1)}
                    </Text>
                    <TouchableOpacity onPress={() => setActivePickerField(null)}>
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={styles.inlineDropdownScrollCanvas} keyboardShouldPersistTaps="handled">
                    {(activePickerField === "tenant" || activePickerField === "location" || activePickerField === "unit") && (
                      <TouchableOpacity
                        style={styles.pickerRowSelectionButtonAnchor}
                        onPress={() => handleSelectOption("")}
                      >
                        <Text style={[styles.pickerRowCategoryValueText, !currentActiveValue ? styles.activeSelectionText : null]}>
                          None
                        </Text>
                      </TouchableOpacity>
                    )}
                    {pickerOptions.map((opt, index) => {
                      const isSelected = currentActiveValue === opt.id;
                      return (
                        <TouchableOpacity
                          key={`${String(opt.id)}-${index}`}
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