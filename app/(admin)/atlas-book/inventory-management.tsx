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
  Dimensions,Platform
} from "react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Box,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Package,
  Warehouse,
  ChevronDown,
  X,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface InventoryItem {
  _id: string;
  name: string;
  sku: string;
  category: string;
  quantity: string | number;
  unitCost: string | number;
  warehouse?: string;
  reorderLevel?: string | number;
  unitOfMeasure?: string;
}

interface ApiResponse {
  success: boolean;
  items?: InventoryItem[];
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
    primary:          uiTheme.customColors?.primary || "#B45309",
    primaryText:      "#FFFFFF",
    primaryTranslucent: isDark ? "rgba(180, 83, 9, 0.25)" : "rgba(180, 83, 9, 0.1)",
    warningBg:        isDark ? "rgba(217, 119, 6, 0.2)" : "rgba(217, 119, 6, 0.1)",
    warningText:      isDark ? "#FBBF24" : "#D97706",
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
    iconActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    disabledOpacity: { opacity: 0.4 },
    primaryActionButton: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", gap: 6 },
    primaryActionText: { color: colors.primaryText, fontSize: 13, fontWeight: "600" },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    kpiCardsRowContainer: { flexDirection: "row", gap: 12, paddingHorizontal: 16, marginBottom: 16 },
    kpiCardFrame: { flex: 1, flexDirection: "row", backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, alignItems: "center", gap: 12 },
    kpiIconWrapperContainer: { width: 40, height: 40, backgroundColor: colors.primaryTranslucent, borderRadius: 10, justifyContent: "center", alignItems: "center" },
    kpiIconWarningBackground: { backgroundColor: colors.warningBg },
    kpiCardMetaLabel: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.3 },
    kpiCardNumericHeading: { fontSize: 20, fontWeight: "800", color: colors.text, marginTop: 1 },
    searchBarWrapperCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginHorizontal: 16, marginBottom: 16, height: 44, position: "relative", justifyContent: "center" },
    searchIconAbsoluteFrame: { position: "absolute", left: 12 },
    searchInputTextField: { paddingLeft: 38, paddingRight: 16, fontSize: 13, color: colors.inputText, width: "100%" },
    centerLoadingState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
    emptyStateContainer: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, padding: 32, alignItems: "center" },
    emptyStateText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    tableCanvasCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
    tableHeaderRowFrame: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderLabelText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 },
    colItemDetails: { flex: 2.4 },
    colStockStatus: { flex: 1.4, paddingHorizontal: 4 },
    colValuationDetails: { flex: 1.6 },
    textAlignRight: { textAlign: "right", alignItems: "flex-end" },
    tableBodyRowFrame: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    itemNameMainText: { fontSize: 14, fontWeight: "700", color: colors.text },
    itemSkuMonoTagText: { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", color: colors.textMuted, textTransform: "uppercase", marginTop: 1 },
    categoryAndWarehouseBadgeFlexRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 6 },
    categoryBadgeOutlineFrame: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, backgroundColor: colors.borderLight },
    categoryBadgeInnerText: { fontSize: 9, fontWeight: "600", color: colors.textSecondary },
    warehouseLocationInlineRow: { flexDirection: "row", alignItems: "center", maxWidth: 90 },
    iconInlineMarginRight: { marginRight: 2 },
    iconInlineMarginLeft: { marginLeft: 3 },
    warehouseInlineLabelText: { fontSize: 11, color: colors.textMuted },
    stockStatusContainerAlignRow: { flexDirection: "row", alignItems: "center" },
    quantityMetricBoldText: { fontSize: 13, fontWeight: "700", color: colors.text },
    warningTextHighlightColor: { color: colors.warningText },
    unitCostSubtextValue: { fontSize: 10, color: colors.textMuted, marginTop: 1 },
    totalValuationBoldValueText: { fontSize: 14, fontWeight: "900", color: colors.text },
    modalBlurOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end", position: "relative" },
    modalContentCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxHeight: height * 0.85, padding: 20 },
    modalCardHeaderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12 },
    modalCardTitleHeading: { fontSize: 18, fontWeight: "800", color: colors.text },
    closeModalCrossButton: { padding: 4 },
    modalFormScrollContainer: { flexGrow: 0, marginBottom: 8 },
    formElementWrapperFieldBlock: { marginBottom: 14 },
    formSplitColumnsContainer: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 14 },
    formSplitFieldColumn: { flex: 1 },
    formElementFieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
    formInputFieldText: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 13, color: colors.text, backgroundColor: colors.background },
    formSelectInputAnchor: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, backgroundColor: colors.background, justifyContent: "center" },
    selectDropdownFlexRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    customSelectAnchorText: { fontSize: 13, color: colors.text, fontWeight: "500" },
    modalCardActionsFooterRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 14 },
    modalCancelButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
    modalCancelButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    modalSubmitButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colors.primary },
    modalSubmitButtonText: { fontSize: 12, fontWeight: "600", color: colors.primaryText },
    inlineDropdownOverlayContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlayBg, justifyContent: "center", alignItems: "center", padding: 20, zIndex: 999 },
    inlineDropdownCardWindow: { backgroundColor: colors.cardBg, width: "100%", maxWidth: 320, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16 },
    inlineDropdownHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12, marginBottom: 8 },
    inlineDropdownHeaderTitleText: { fontSize: 14, fontWeight: "700", color: colors.text },
    closePickerTouchTarget: { padding: 4 },
    inlineDropdownScrollCanvas: { flexGrow: 0 },
    pickerRowSelectionButtonAnchor: { paddingVertical: 14, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pickerRowCategoryValueText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
  });
}

export default function InventoryManagement() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    category: "Finished Good",
    quantity: "",
    unitCost: "",
    warehouse: "",
  });

  const categories = ["Finished Good", "Raw Material", "Office Supply"];

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<ApiResponse>("/api/atlasbook/inventory");
      if (res?.success) setItems(res.items || []);
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
      const cleanPayload = {
        ...form,
        quantity: parseInt(form.quantity.replace(/\s+/g, ""), 10) || 0,
        unitCost: parseFloat(form.unitCost.replace(/\s+/g, "").replace(",", ".")) || 0,
      };

      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/inventory", {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });

      if (res?.success) {
        setOpen(false);
        setForm({ name: "", sku: "", category: "Finished Good", quantity: "", unitCost: "", warehouse: "" });
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
        i.sku?.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, q]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Box size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle}>Inventory Management</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.disabledOpacity : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>Track stock levels, warehouse locations, and inventory valuation.</Text>
      </View>

      <View style={styles.kpiCardsRowContainer}>
        <View style={styles.kpiCardFrame}>
          <View style={styles.kpiIconWrapperContainer}>
            <Package size={22} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.kpiCardMetaLabel}>Total SKUs</Text>
            <Text style={styles.kpiCardNumericHeading}>{items.length}</Text>
          </View>
        </View>

        <View style={styles.kpiCardFrame}>
          <View style={[styles.kpiIconWrapperContainer, styles.kpiIconWarningBackground]}>
            <AlertTriangle size={22} color={colors.warningText} />
          </View>
          <View>
            <Text style={[styles.kpiCardMetaLabel, { color: colors.warningText }]}>Low Stock</Text>
            <Text style={styles.kpiCardNumericHeading}>
              {items.filter((i) => Number(i.quantity) <= Number(i.reorderLevel ?? 5)).length}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchBarWrapperCard}>
        <View style={styles.searchIconAbsoluteFrame}>
          <Search size={16} color={colors.textSecondary} />
        </View>
        <TextInput
          style={styles.searchInputTextField}
          placeholder="Search inventory by name or SKU..."
          placeholderTextColor={colors.placeholderText}
          value={q}
          onChangeText={setQ}
        />
      </View>

      {loading ? (
        <View style={styles.centerLoadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No inventory found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.tableCanvasCard}>
            <View style={styles.tableHeaderRowFrame}>
              <Text style={[styles.tableHeaderLabelText, styles.colItemDetails]}>Item Name / SKU</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colStockStatus]}>In Stock</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colValuationDetails, styles.textAlignRight]}>Total Value</Text>
            </View>

            {filtered.map((item) => {
              const isLowStock = Number(item.quantity) <= Number(item.reorderLevel ?? 5);
              const unitCostVal = Number(item.unitCost || 0);
              const quantityVal = Number(item.quantity || 0);
              const totalValuation = quantityVal * unitCostVal;

              return (
                <View key={item._id || Math.random().toString()} style={styles.tableBodyRowFrame}>
                  <View style={styles.colItemDetails}>
                    <Text style={styles.itemNameMainText} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemSkuMonoTagText}>{item.sku}</Text>

                    <View style={styles.categoryAndWarehouseBadgeFlexRow}>
                      <View style={styles.categoryBadgeOutlineFrame}>
                        <Text style={styles.categoryBadgeInnerText}>{item.category}</Text>
                      </View>
                      <View style={styles.warehouseLocationInlineRow}>
                        <Warehouse size={10} color={colors.textSecondary} style={styles.iconInlineMarginRight} />
                        <Text style={styles.warehouseInlineLabelText} numberOfLines={1}>
                          {item.warehouse || "Default"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.colStockStatus}>
                    <View style={styles.stockStatusContainerAlignRow}>
                      <Text style={[styles.quantityMetricBoldText, isLowStock ? styles.warningTextHighlightColor : null]}>
                        {item.quantity} {item.unitOfMeasure || "pcs"}
                      </Text>
                      {isLowStock && <AlertTriangle size={12} color={colors.warningText} style={styles.iconInlineMarginLeft} />}
                    </View>
                    <Text style={styles.unitCostSubtextValue}>
                      ${unitCostVal.toLocaleString()}/unit
                    </Text>
                  </View>

                  <View style={[styles.colValuationDetails, styles.textAlignRight]}>
                    <Text style={styles.totalValuationBoldValueText}>
                      ${totalValuation.toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalCardHeaderTopRow}>
              <Text style={styles.modalCardTitleHeading}>Add Inventory Item</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Item Name</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="e.g., Office Desk"
                  placeholderTextColor={colors.placeholderText}
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                />
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>SKU / Code</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="DESK-101"
                    placeholderTextColor={colors.placeholderText}
                    value={form.sku}
                    onChangeText={(text) => setForm({ ...form, sku: text })}
                  />
                </View>

                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Category</Text>
                  <TouchableOpacity
                    style={styles.formSelectInputAnchor}
                    activeOpacity={0.7}
                    onPress={() => setShowCategorySelector(true)}
                  >
                    <View style={styles.selectDropdownFlexRow}>
                      <Text style={styles.customSelectAnchorText}>{form.category}</Text>
                      <ChevronDown size={14} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formSplitColumnsContainer}>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Quantity</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.quantity}
                    onChangeText={(text) => setForm({ ...form, quantity: text })}
                  />
                </View>
                <View style={styles.formSplitFieldColumn}>
                  <Text style={styles.formElementFieldLabel}>Unit Cost</Text>
                  <TextInput
                    style={styles.formInputFieldText}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholderText}
                    keyboardType="numeric"
                    value={form.unitCost}
                    onChangeText={(text) => setForm({ ...form, unitCost: text })}
                  />
                </View>
              </View>

              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Warehouse / Location</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="e.g., Main Warehouse A"
                  placeholderTextColor={colors.placeholderText}
                  value={form.warehouse}
                  onChangeText={(text) => setForm({ ...form, warehouse: text })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitButtonAction} onPress={handleCreate}>
                <Text style={styles.modalSubmitButtonText}>Save Item</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showCategorySelector && (
            <View style={styles.inlineDropdownOverlayContainer}>
              <View style={styles.inlineDropdownCardWindow}>
                <View style={styles.inlineDropdownHeaderRow}>
                  <Text style={styles.inlineDropdownHeaderTitleText}>Select Category</Text>
                  <TouchableOpacity onPress={() => setShowCategorySelector(false)} style={styles.closePickerTouchTarget}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.inlineDropdownScrollCanvas} keyboardShouldPersistTaps="handled">
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={styles.pickerRowSelectionButtonAnchor}
                      onPress={() => {
                        setForm({ ...form, category: cat });
                        setShowCategorySelector(false);
                      }}
                    >
                      <Text style={styles.pickerRowCategoryValueText}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}