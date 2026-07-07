import React, { useEffect, useState, useMemo } from "react";
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
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Building,
  Plus,
  Search,
  RefreshCw,
  Landmark,
  Truck,
  Monitor,
  Wrench,
  ChevronDown,
} from "lucide-react-native";

const { width, height } = Dimensions.get("window");

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
    specialCardBg:    "#0F172A",
    specialCardText:  "#F8FAFC",
    specialCardMuted: "#94A3B8",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { paddingHorizontal: 16, paddingBottom: 32 },
    headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: colors.background },
    headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    titleContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
    headerIcon: { marginRight: 8 },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    rotatingIcon: { opacity: 0.5 },
    primaryActionButton: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, alignItems: "center", gap: 6 },
    primaryActionText: { color: colors.primaryText, fontSize: 12, fontWeight: "600" },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    kpiCard: { borderRadius: 12, padding: 18, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 14 },
    cardDarkSlateBg: { backgroundColor: colors.specialCardBg, borderWidth: 1, borderColor: colors.border },
    kpiIconFrame: { padding: 12, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: 12 },
    kpiValueDetails: { flex: 1 },
    darkCardKpiLabelText: { fontSize: 11, fontWeight: "700", color: colors.specialCardMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    darkCardMetricValue: { fontSize: 26, fontWeight: "900", color: colors.specialCardText, letterSpacing: -0.5 },
    searchCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 16 },
    searchBarInputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 10, height: 40 },
    searchBarIcon: { marginRight: 8 },
    searchBarTextInput: { flex: 1, fontSize: 13, color: colors.inputText },
    ledgerDataCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
    tableMatrixMinWidthContainer: { minWidth: 760 },
    simulatedTableHeaderRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderCell: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
    tableDataBodyRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.cardBg },
    rowZebraAlternateBg: { backgroundColor: colors.borderLight },
    centerStatePadding: { width: "100%", paddingVertical: 40, justifyContent: "center", alignItems: "center" },
    emptyStateFallbackText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    colAssetIdentity: { width: 200, paddingRight: 12 },
    colCategory: { width: 120, paddingRight: 12 },
    colDate: { width: 110, paddingRight: 12 },
    colPrice: { width: 110, paddingRight: 16 },
    colStatus: { width: 100, alignItems: "center", justifyContent: "center" },
    assetCellNameText: { fontSize: 13, fontWeight: "700", color: colors.text, marginBottom: 2 },
    assetCellTagMonoText: { fontSize: 10, color: colors.textMuted },
    categoryInlineCellLayout: { flexDirection: "row", alignItems: "center", gap: 6 },
    categoryCellLabelText: { fontSize: 13, color: colors.textSecondary },
    dateCellLabelText: { fontSize: 12, color: colors.textSecondary },
    costCellLabelText: { fontSize: 13, fontWeight: "500", color: colors.textSecondary },
    bookValueCellLabelText: { fontSize: 13, fontWeight: "700", color: colors.text },
    statusBadgeFrame: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.borderLight, alignItems: "center", justifyContent: "center", alignSelf: "center" },
    statusBadgeText: { fontSize: 11, fontWeight: "600", color: colors.textSecondary },
    textAlignRight: { textAlign: "right" },
    textAlignCenter: { textAlign: "center" },
    modalBlurOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
    modalContentCard: { backgroundColor: colors.cardBg, width: width > 400 ? 380 : "100%", maxHeight: height * 0.8, borderRadius: 16, padding: 20, position: "relative" },
    modalCardTitleHeading: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 16 },
    modalFormScrollContainer: { flexGrow: 0, marginBottom: 8 },
    formInputGroupSpacer: { marginBottom: 14, width: "100%" },
    formElementFieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
    formInputFieldText: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 40, paddingHorizontal: 12, fontSize: 13, color: colors.border, backgroundColor: colors.background },
    formSplitColumnsContainer: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 14 },
    formSplitFieldColumn: { flex: 1 },
    customSelectInputAnchor: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 40, paddingHorizontal: 12, backgroundColor: colors.background },
    customSelectAnchorText: { fontSize: 13, color: colors.border },
    modalPickerSurfaceOverlay: { position: "absolute", top: 50, left: 20, right: 20, bottom: 74, backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1, borderColor: colors.border, zIndex: 9999, padding: 4 },
    modalPickerHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalPickerTitleText: { fontSize: 13, fontWeight: "700", color: colors.text },
    modalPickerCloseActionText: { fontSize: 13, fontWeight: "700", color: colors.primary },
    modalPickerScrollWindow: { flex: 1 },
    modalPickerScrollContentContainer: { paddingVertical: 6 },
    pickerRowItemButton: { paddingVertical: 14, paddingHorizontal: 14, borderRadius: 6, marginHorizontal: 6, marginBottom: 2, backgroundColor: colors.cardBg },
    pickerActiveRowSelectionBg: { backgroundColor: colors.borderLight },
    pickerRowItemLabelText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
    pickerActiveRowSelectionText: { color: colors.text, fontWeight: "700" },
    modalCardActionsFooterRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 14 },
    modalCancelButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    modalCancelButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    modalSubmitButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colors.primary },
    modalSubmitButtonText: { fontSize: 12, fontWeight: "600", color: colors.primaryText },
  });
}

export default function FixedAssetManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    category: "Equipment",
    purchaseDate: "",
    purchasePrice: "",
    assetTag: "",
    usefulLifeYears: "5"
  });

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/atlasbook/assets");
      if (res?.success) setItems(res.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await apiFetch("/api/atlasbook/assets", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res?.success) {
        setOpen(false);
        setForm({
          name: "",
          category: "Equipment",
          purchaseDate: "",
          purchasePrice: "",
          assetTag: "",
          usefulLifeYears: "5"
        });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter(i => 
    i.name?.toLowerCase().includes(q.toLowerCase()) || 
    i.assetTag?.toLowerCase().includes(q.toLowerCase())
  );

  const totalValue = items.reduce((sum, i) => sum + (Number(i.purchasePrice) || 0), 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Building size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Fixed Asset Management</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconActionButton} 
              onPress={load} 
              disabled={loading}
              activeOpacity={0.7}
            >
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.rotatingIcon : null} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.primaryActionButton} 
              onPress={() => setOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>Register Asset</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Track capital assets, calculate depreciation, and manage your asset register.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.kpiCard, styles.cardDarkSlateBg]}>
          <View style={styles.kpiIconFrame}>
            <Landmark size={24} color={colors.specialCardText} />
          </View>
          <View style={styles.kpiValueDetails}>
            <Text style={styles.darkCardKpiLabelText}>Total Asset Value</Text>
            <Text style={styles.darkCardMetricValue}>${totalValue.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchBarInputContainer}>
            <Search size={16} color={colors.textMuted} style={styles.searchBarIcon} />
            <TextInput
              style={styles.searchBarTextInput}
              placeholder="Search assets by name or tag..."
              placeholderTextColor={colors.placeholderText}
              value={q}
              onChangeText={(text) => setQ(text)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.ledgerDataCard}>
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={true} bounciness={0}>
            <View style={styles.tableMatrixMinWidthContainer}>
              
              <View style={styles.simulatedTableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.colAssetIdentity]}>Asset Name / Tag</Text>
                <Text style={[styles.tableHeaderCell, styles.colCategory]}>Category</Text>
                <Text style={[styles.tableHeaderCell, styles.colDate]}>Purchase Date</Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice, styles.textAlignRight]}>Cost</Text>
                <Text style={[styles.tableHeaderCell, styles.colPrice, styles.textAlignRight]}>Book Value</Text>
                <Text style={[styles.tableHeaderCell, styles.colStatus, styles.textAlignCenter]}>Status</Text>
              </View>

              {loading ? (
                <View style={styles.centerStatePadding}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : filtered.length === 0 ? (
                <View style={styles.centerStatePadding}>
                  <Text style={styles.emptyStateFallbackText}>No assets registered.</Text>
                </View>
              ) : (
                filtered.map((item, index) => (
                  <View 
                    key={item._id || item.assetTag || index} 
                    style={[
                      styles.tableDataBodyRow,
                      index % 2 === 1 ? styles.rowZebraAlternateBg : null
                    ]}
                  >
                    <View style={styles.colAssetIdentity}>
                      <Text style={styles.assetCellNameText} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.assetCellTagMonoText}>{item.assetTag}</Text>
                    </View>

                    <View style={[styles.colCategory, styles.categoryInlineCellLayout]}>
                      {item.category === "Vehicle" && <Truck size={13} color={colors.textMuted} />}
                      {item.category === "IT Hardware" && <Monitor size={13} color={colors.textMuted} />}
                      {item.category === "Equipment" && <Wrench size={13} color={colors.textMuted} />}
                      <Text style={styles.categoryCellLabelText} numberOfLines={1}>{item.category}</Text>
                    </View>

                    <Text style={[styles.colDate, styles.dateCellLabelText]}>
                      {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "—"}
                    </Text>

                    <Text style={[styles.colPrice, styles.costCellLabelText, styles.textAlignRight]}>
                      ${item.purchasePrice?.toLocaleString() ?? "0"}
                    </Text>

                    <Text style={[styles.colPrice, styles.bookValueCellLabelText, styles.textAlignRight]}>
                      ${(item.currentBookValue ?? item.purchasePrice)?.toLocaleString() ?? "0"}
                    </Text>

                    <View style={styles.colStatus}>
                      <View style={styles.statusBadgeFrame}>
                        <Text style={styles.statusBadgeText} numberOfLines={1}>{item.status || "Secondary"}</Text>
                      </View>
                    </View>

                  </View>
                ))
              )}

            </View>
          </ScrollView>
        </View>

      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <Text style={styles.modalCardTitleHeading}>Register Fixed Asset</Text>

            <ScrollView 
              bounces={false} 
              showsVerticalScrollIndicator={false} 
              style={styles.modalFormScrollContainer}
              keyboardShouldPersistTaps="handled"
            >
              
              <View style={styles.formInputGroupSpacer}>
                <Text style={styles.formElementFieldLabel}>Asset Name</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="e.g., Company Delivery Truck"
                  placeholderTextColor={colors.placeholderText}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                />
              </View>

              <View style={styles.formSplitColumnsContainer}>
                
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Category</Text>
                  <TouchableOpacity 
                    style={styles.customSelectInputAnchor} 
                    onPress={() => setShowCategoryDropdown(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customSelectAnchorText}>{form.category}</Text>
                    <ChevronDown size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Asset Tag / S/N</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="TAG-2024-001"
                    placeholderTextColor={colors.placeholderText}
                    value={form.assetTag}
                    onChangeText={(text) => setForm({ ...form, assetTag: text })}
                  />
                </View>

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
                  <Text style={styles.formElementFieldLabel}>Purchase Date</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.placeholderText}
                    value={form.purchaseDate}
                    onChangeText={(text) => setForm({ ...form, purchaseDate: text })}
                  />
                </View>

              </View>

              <View style={styles.formInputGroupSpacer}>
                <Text style={styles.formElementFieldLabel}>Useful Life (Years)</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  keyboardType="numeric"
                  value={form.usefulLifeYears}
                  onChangeText={(text) => setForm({ ...form, usefulLifeYears: text })}
                />
              </View>

            </ScrollView>

            {showCategoryDropdown && (
              <View style={styles.modalPickerSurfaceOverlay}>
                <View style={styles.modalPickerHeaderRow}>
                  <Text style={styles.modalPickerTitleText}>Select Asset Category</Text>
                  <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                    <Text style={styles.modalPickerCloseActionText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  style={styles.modalPickerScrollWindow}
                  contentContainerStyle={styles.modalPickerScrollContentContainer}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {["Land", "Building", "Vehicle", "Equipment", "Furniture", "IT Hardware"].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.pickerRowItemButton,
                        form.category === cat ? styles.pickerActiveRowSelectionBg : null
                      ]}
                      onPress={() => {
                        setForm({ ...form, category: cat });
                        setShowCategoryDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.pickerRowItemLabelText,
                        form.category === cat ? styles.pickerActiveRowSelectionText : null
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity 
                style={styles.modalCancelButtonAction} 
                onPress={() => setOpen(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalSubmitButtonAction} 
                onPress={handleCreate}
                activeOpacity={0.8}
              >
                <Text style={styles.modalSubmitButtonText}>Save Asset</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}