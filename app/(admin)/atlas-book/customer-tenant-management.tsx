import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from "react-native";
import {
  Users,
  Plus,
  RefreshCw,
  Search,
  Mail,
  Phone,
  X,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

const { width } = Dimensions.get("window");

interface TenantItem {
  _id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  assignedProperty?: string;
  assignedUnit?: string;
  locationName?: string;
  status: string;
}

interface PropertyItem {
  _id: string;
  name: string;
}

interface UnitItem {
  _id: string;
  unitNumber: string;
}

interface LocationItem {
  id: string;
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
    primary:          uiTheme.customColors?.primary || "#FFD27A",
    primaryText:      "#09090b",
    successBg:        isDark ? "rgba(52,211,153,0.12)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    overlayBg:        "rgba(0,0,0,0.85)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.background },
    scrollContainerPadding: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
    headerLayoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
    inlineHeaderTitleGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
    mainTitleText: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: colors.text },
    subtitleText: { fontSize: 13, marginTop: 4, fontWeight: "400", color: colors.textSecondary },
    topActionsGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
    circularActionBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.cardBg, borderColor: colors.border },
    primaryActionPill: { height: 34, paddingHorizontal: 12, borderRadius: 10, flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, gap: 4 },
    primaryActionPillText: { fontSize: 13, fontWeight: "700", color: colors.primaryText },
    searchInterfaceWrapperBar: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 16, backgroundColor: colors.cardBg, borderColor: colors.border },
    searchInputField: { flex: 1, color: colors.inputText, fontSize: 13, height: "100%", paddingVertical: 0 },
    inlineLoaderZoneWrapper: { marginVertical: 8, alignItems: "center" },
    tableContainer: { borderWidth: 1, borderRadius: 12, overflow: "hidden", backgroundColor: colors.cardBg, borderColor: colors.border },
    tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.borderLight, borderColor: colors.border },
    tableHeaderCell: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, color: colors.textSecondary },
    tableDataRow: { flexDirection: "row", borderBottomWidth: 1, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center", borderColor: colors.borderLight },
    tableDataCell: { fontSize: 13, color: colors.text },
    contactInfoBlock: { gap: 2 },
    contactItemLine: { flexDirection: "row", alignItems: "center", gap: 4 },
    contactLineText: { fontSize: 11, color: colors.textSecondary },
    statusCapsuleWrapperBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, alignSelf: "flex-start" },
    statusCapsuleLabelText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
    emptyLedgerFallbackCard: { alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 16 },
    emptyLedgerHeadingText: { fontSize: 15, fontWeight: "700", marginBottom: 4, color: colors.text },
    emptyLedgerSubParagraphText: { fontSize: 13, textAlign: "center", color: colors.textSecondary },
    modalOverlayDarkenedContainer: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    formContainerCardWindowLayout: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", backgroundColor: colors.cardBg },
    formModalStickyTopHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderColor: colors.border },
    formModalHeaderTitleText: { fontSize: 16, fontWeight: "800", color: colors.text },
    modalCloseActionBtnCircle: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
    formScrollableBodyPaddingLayout: { padding: 16, paddingBottom: 40 },
    formGroupInputFieldWrapperBlock: { marginBottom: 16 },
    inputFieldTopLabelText: { fontSize: 12, fontWeight: "600", marginBottom: 6, color: colors.textSecondary },
    customDropdownSelectionInputTrigger: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderColor: colors.border },
    formInputsHorizontalMatrixRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
    formMatrixInputColumnHalf: { flex: 1 },
    standardNativeFormInputBox: { height: 42, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 13, fontWeight: "500", backgroundColor: colors.background, borderColor: colors.border, color: colors.inputText },
    formSubmissionActionBtnBar: { height: 46, borderRadius: 10, justifyContent: "center", alignItems: "center", marginTop: 8, backgroundColor: colors.primary },
    formSubmissionActionBtnLabelText: { fontSize: 14, fontWeight: "800", color: colors.primaryText },
    bottomSheetModalWindowLayout: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 16, backgroundColor: colors.cardBg },
    bottomSheetHeaderBlockBarRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, marginBottom: 6, borderColor: colors.border },
    bottomSheetHeaderLabelTitleText: { fontSize: 14, fontWeight: "700", color: colors.text },
    bottomSheetSelectionRowItemBtn: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    bottomSheetSelectionRowLabelText: { fontSize: 14, fontWeight: "600" },
  });
}

const colWidths = {
  name: 130,
  type: 85,
  contact: 160,
  property: 110,
  unit: 70,
  location: 110,
  status: 85,
  history: 100,
};

export default function TenantManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<TenantItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    type: "type" | "status" | "property" | "location" | "unit";
    options: { label: string; value: string }[];
  }>({
    visible: false,
    title: "",
    type: "type",
    options: [],
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    type: "Individual",
    status: "Active",
    assignedProperty: "",
    assignedUnit: "",
    locationName: "",
  });

  const load = useCallback(async () => {
    try {
      const [tenantsRes, propsRes, unitsRes, locationsRes] = await Promise.all([
        apiFetch<ApiResponse<TenantItem>>("/api/atlasbook/tenants"),
        apiFetch<ApiResponse<PropertyItem>>("/api/atlasbook/properties").catch(() => null),
        apiFetch<ApiResponse<UnitItem>>("/api/atlasbook/units").catch(() => null),
        apiFetch<{ items?: LocationItem[] }>("/api/locations").catch(() => null),
      ]);
      if (tenantsRes?.success) setItems(tenantsRes.items || []);
      if (propsRes?.success) setProperties(propsRes.items || []);
      if (unitsRes?.success) setUnits(unitsRes.items || []);
      if (locationsRes?.items) setLocations(locationsRes.items || []);
    } catch {
      Alert.alert("Sync Error", "Failed to retrieve dataset metrics records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!form.name.trim()) {
      Alert.alert("Missing Parameters", "Tenant profile name metrics must be defined.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/tenants", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          name: "",
          email: "",
          phone: "",
          type: "Individual",
          status: "Active",
          assignedProperty: "",
          assignedUnit: "",
          locationName: "",
        });
        load();
      }
    } catch {
      Alert.alert("Execution Refused", "Could not commit structural context modifications safely.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return items.filter((i) =>
      i.name?.toLowerCase().includes(q.toLowerCase()) ||
      i.email?.toLowerCase().includes(q.toLowerCase()) ||
      i.assignedProperty?.toLowerCase().includes(q.toLowerCase()) ||
      i.assignedUnit?.toLowerCase().includes(q.toLowerCase()) ||
      i.locationName?.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, q]);

  const openPicker = (type: "type" | "status" | "property" | "location" | "unit") => {
    let title = "";
    let options: { label: string; value: string }[] = [];

    if (type === "type") {
      title = "Select Classification Type";
      options = [
        { label: "Individual", value: "Individual" },
        { label: "Company", value: "Company" },
      ];
    } else if (type === "status") {
      title = "Select Pipeline Status";
      options = [
        { label: "Active", value: "Active" },
        { label: "Prospect", value: "Prospect" },
        { label: "Former", value: "Former" },
      ];
    } else if (type === "property") {
      title = "Link Assigned Property";
      options = [{ label: "None", value: "" }, ...properties.map((p) => ({ label: p.name, value: p.name }))];
    } else if (type === "location") {
      title = "Link Geographical Zone";
      options = [{ label: "None", value: "" }, ...locations.map((l) => ({ label: l.name, value: l.name }))];
    } else if (type === "unit") {
      title = "Link Assigned Unit Suite";
      options = [{ label: "None", value: "" }, ...units.map((u) => ({ label: u.unitNumber, value: u.unitNumber }))];
    }

    setPickerConfig({ visible: true, title, type, options });
  };

  const handlePickerSelect = (value: string) => {
    setForm((prev) => ({ ...prev, [pickerConfig.type === "type" ? "type" : pickerConfig.type === "status" ? "status" : pickerConfig.type === "property" ? "assignedProperty" : pickerConfig.type === "unit" ? "assignedUnit" : "locationName"]: value }));
    setPickerConfig((prev) => ({ ...prev, visible: false }));
  };

  const tableTotalWidth = useMemo(() => {
    return Object.values(colWidths).reduce((a, b) => a + b, 0);
  }, []);

  return (
    <SafeAreaView style={styles.mainContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContainerPadding}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.headerLayoutRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.inlineHeaderTitleGroup}>
              <Users size={22} color={colors.primary} />
              <Text style={styles.mainTitleText}>Tenant Management</Text>
            </View>
            <Text style={styles.subtitleText}>Manage tenant profiles, contact coordinates and lease logs</Text>
          </View>
          <View style={styles.topActionsGroup}>
            <TouchableOpacity activeOpacity={0.7} style={styles.circularActionBtn} onPress={() => { setLoading(true); load(); }}>
              <RefreshCw size={14} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.primaryActionPill} onPress={() => setOpen(true)}>
              <Plus size={14} color={colors.primaryText} strokeWidth={2.5} />
              <Text style={styles.primaryActionPillText}>Tenant</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchInterfaceWrapperBar}>
          <Search size={16} color={colors.textSecondary} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInputField}
            placeholder="Search profiles by name, email, assignment, zone..."
            placeholderTextColor={colors.placeholderText}
            value={q}
            onChangeText={setQ}
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ("")}>
              <X size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading && (
          <View style={styles.inlineLoaderZoneWrapper}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, { width: colWidths.name }]}>Tenant Name</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.type }]}>Type</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.contact }]}>Contact Details</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.property }]}>Property</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.unit }]}>Unit</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.location }]}>Location</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.status }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { width: colWidths.history }]}>Lease History</Text>
            </View>

            {filtered.length === 0 && !loading ? (
              <View style={[styles.emptyLedgerFallbackCard, { width: tableTotalWidth }]}>
                <Users size={28} color={colors.border} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyLedgerHeadingText}>No profiles located</Text>
                <Text style={styles.emptyLedgerSubParagraphText}>Everything resolves nicely against current system search parameters.</Text>
              </View>
            ) : (
              filtered.map((item) => (
                <View key={item._id || Math.random().toString()} style={styles.tableDataRow}>
                  <Text style={[styles.tableDataCell, { width: colWidths.name, fontWeight: "700" }]} numberOfLines={1}>{item.name}</Text>
                  <View style={{ width: colWidths.type }}>
                    <View style={[styles.statusCapsuleWrapperBadge, { borderColor: colors.border }]}>
                      <Text style={[styles.statusCapsuleLabelText, { color: colors.textSecondary }]}>{item.type}</Text>
                    </View>
                  </View>
                  <View style={[styles.contactInfoBlock, { width: colWidths.contact }]}>
                    <View style={styles.contactItemLine}>
                      <Mail size={10} color={colors.textMuted} />
                      <Text style={styles.contactLineText} numberOfLines={1}>{item.email || "—"}</Text>
                    </View>
                    <View style={styles.contactItemLine}>
                      <Phone size={10} color={colors.textMuted} />
                      <Text style={styles.contactLineText} numberOfLines={1}>{item.phone || "—"}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableDataCell, { width: colWidths.property }]} numberOfLines={1}>{item.assignedProperty || "None"}</Text>
                  <Text style={[styles.tableDataCell, { width: colWidths.unit }]} numberOfLines={1}>{item.assignedUnit || "None"}</Text>
                  <Text style={[styles.tableDataCell, { width: colWidths.location }]} numberOfLines={1}>{item.locationName || "None"}</Text>
                  <View style={{ width: colWidths.status }}>
                    <View style={[styles.statusCapsuleWrapperBadge, { 
                      backgroundColor: item.status === "Active" ? "rgba(52,211,153,0.1)" : colors.background,
                      borderColor: item.status === "Active" ? "rgba(52,211,153,0.2)" : colors.border
                    }]}>
                      <Text style={[styles.statusCapsuleLabelText, { color: item.status === "Active" ? colors.successText : colors.textSecondary }]}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableDataCell, { width: colWidths.history, fontStyle: "italic", color: colors.textMuted }]}>No log profile</Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainerCardWindowLayout}>
            <View style={styles.formModalStickyTopHeaderRow}>
              <Text style={styles.formModalHeaderTitleText}>Add New Tenant</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.modalCloseActionBtnCircle} onPress={() => setOpen(false)}>
                <X size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScrollableBodyPaddingLayout} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Full Name / Corporate Entity Name</Text>
                <TextInput
                  style={styles.standardNativeFormInputBox}
                  placeholder="e.g., Jane Smith"
                  placeholderTextColor={colors.placeholderText}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                />
              </View>

              <View style={styles.formInputsHorizontalMatrixRow}>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Classification Type</Text>
                  <TouchableOpacity activeOpacity={0.8} style={styles.customDropdownSelectionInputTrigger} onPress={() => openPicker("type")}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{form.type}</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Pipeline Status Framework</Text>
                  <TouchableOpacity activeOpacity={0.8} style={styles.customDropdownSelectionInputTrigger} onPress={() => openPicker("status")}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{form.status}</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formInputsHorizontalMatrixRow}>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Link Property Asset</Text>
                  <TouchableOpacity activeOpacity={0.8} style={styles.customDropdownSelectionInputTrigger} onPress={() => openPicker("property")}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
                      {form.assignedProperty || "None"}
                    </Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.formMatrixInputColumnHalf}>
                  <Text style={styles.inputFieldTopLabelText}>Link Location Mapping</Text>
                  <TouchableOpacity activeOpacity={0.8} style={styles.customDropdownSelectionInputTrigger} onPress={() => openPicker("location")}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }} numberOfLines={1}>
                      {form.locationName || "None"}
                    </Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Link Room Suite / Unit Number</Text>
                <TouchableOpacity activeOpacity={0.8} style={styles.customDropdownSelectionInputTrigger} onPress={() => openPicker("unit")}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>
                    {form.assignedUnit || "None"}
                  </Text>
                  <ChevronDown size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Electronic Mail Coordinate</Text>
                <TextInput
                  style={styles.standardNativeFormInputBox}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.email}
                  onChangeText={(text) => setForm({ ...form, email: text })}
                />
              </View>

              <View style={styles.formGroupInputFieldWrapperBlock}>
                <Text style={styles.inputFieldTopLabelText}>Telephone Contact Link String</Text>
                <TextInput
                  style={styles.standardNativeFormInputBox}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="phone-pad"
                  value={form.phone}
                  onChangeText={(text) => setForm({ ...form, phone: text })}
                />
              </View>

              <TouchableOpacity activeOpacity={0.8} style={styles.formSubmissionActionBtnBar} disabled={isSubmitting} onPress={handleCreate}>
                {isSubmitting ? <ActivityIndicator size="small" color={colors.primaryText} /> : <Text style={styles.formSubmissionActionBtnLabelText}>Save Tenant Profile</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={pickerConfig.visible} transparent animationType="slide" onRequestClose={() => setPickerConfig((prev) => ({ ...prev, visible: false }))}>
        <View style={styles.modalOverlayDarkenedContainer}>
          <TouchableOpacity activeOpacity={1} style={{ flex: 1 }} onPress={() => setPickerConfig((prev) => ({ ...prev, visible: false }))} />
          <View style={styles.bottomSheetModalWindowLayout}>
            <View style={styles.bottomSheetHeaderBlockBarRow}>
              <Text style={styles.bottomSheetHeaderLabelTitleText}>{pickerConfig.title}</Text>
              <TouchableOpacity onPress={() => setPickerConfig((prev) => ({ ...prev, visible: false }))}>
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerConfig.options}
              keyExtractor={(item, idx) => item.value + idx}
              contentContainerStyle={{ paddingBottom: 32 }}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => {
                const isSelected = form[pickerConfig.type === "type" ? "type" : pickerConfig.type === "status" ? "status" : pickerConfig.type === "property" ? "assignedProperty" : pickerConfig.type === "unit" ? "assignedUnit" : "locationName"] === item.value;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.bottomSheetSelectionRowItemBtn, isSelected && { backgroundColor: colors.borderLight }]}
                    onPress={() => handlePickerSelect(item.value)}
                  >
                    <Text style={[styles.bottomSheetSelectionRowLabelText, { color: isSelected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {isSelected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}