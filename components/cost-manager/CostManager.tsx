import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingCart,
  MapPin,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Sliders,
  FileText,
  Check,
} from "lucide-react-native";
import { apiRequest } from "@/services/api";

// High-precision financial format normalizers matching service layer layers
const formatMoney = (cents: number, cur = "USD") => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format((cents || 0) / 100);
};
const dollarsToCents = (val: string) => Math.round(parseFloat(val.replace(/[$,\s]/g, "") || "0") * 100);
const centsToDollarInput = (cents: number) => String(((cents || 0) / 100).toFixed(2));

// Web-synchronized enum classifications
export type PurchaseStatus =
  | "not_purchased"
  | "ready_to_buy"
  | "partially_paid"
  | "purchased"
  | "shipped"
  | "received"
  | "stored"
  | "delayed"
  | "canceled";

interface CostLineItem {
  id: string;
  itemName: string;
  description?: string;
  qty: number;
  unit?: string;
  unitCostCents: number;
  shippingCostCents?: number;
  taxCostCents?: number;
  otherFeesCents?: number;
  estimatedTotalCents: number;
  paidCents: number;
  remainingCents: number;
  purchaseStatus: PurchaseStatus;
  priority: "low" | "medium" | "high" | "critical";
  requiredForPrototype: boolean;
  taskId?: string;
  vendorId?: string;
  vendor?: { name: string; phone?: string; email?: string };
  storage?: { locationName?: string; shelf?: string; bin?: string };
  notes?: string;
}

interface CostSection {
  id: string;
  name: string;
  items: CostLineItem[];
  subtotalEstimatedCents: number;
  subtotalPaidCents: number;
}

interface CostSheetPayload {
  sheet: { id: string; currency: string };
  sections: CostSection[];
  summary: {
    projectedCents: number;
    spentCents: number;
    remainingCents: number;
    availableBudgetCents: number;
    purchasedCount: number;
    totalCount: number;
    purchasedPct: number;
    buildReadinessPct: number;
    nextBlocker?: { itemName: string; remainingCents: number };
  };
}

// Status style configuration metrics mappings
const PURCHASE_STATUS_META: Record<PurchaseStatus, { label: string; color: string }> = {
  not_purchased: { label: "Not Purchased", color: "#8b949e" },
  ready_to_buy: { label: "Ready to Buy", color: "#58a6ff" },
  partially_paid: { label: "Partially Paid", color: "#d29922" },
  purchased: { label: "Purchased", color: "#56d364" },
  shipped: { label: "Shipped", color: "#38bdf8" },
  received: { label: "Received", color: "#34d399" },
  stored: { label: "Stored", color: "#2ea043" },
  delayed: { label: "Delayed", color: "#f0883e" },
  canceled: { label: "Canceled", color: "#f85149" },
};

export default function CostManager({ projectId, readOnly = false }: { projectId: string; readOnly?: boolean }) {
  const queryClient = useQueryClient();
  const queryKey = ["cost-sheet", projectId];

  // Core API Fetch Pipeline
  const sheetQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest<CostSheetPayload>(`/cost-sheet/${projectId}`);
      return res.data;
    },
    enabled: !!projectId,
  });

  const itemMutation = useMutation({
    mutationFn: async ({ itemId, payload }: { itemId: string; payload: any }) => {
      const res = await apiRequest(`/cost-manager/items/${itemId}`, { method: "PATCH", data: payload });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const sectionMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest(`/cost-manager/${projectId}/sections`, { method: "POST", data: { name } });
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      await apiRequest(`/cost-manager/sections/${sectionId}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Structural Expandable Accordion Layout Trackers
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [buyMode, setBuyMode] = useState(false);
  const [itemModal, setItemModal] = useState<{ sectionId: string; item: CostLineItem | null } | null>(null);

  // Dynamic Multi-Parameter Client-Side Insights Filters Engine
  const buySuggestions = useMemo(() => {
    if (!buyMode || !sheetQuery.data?.sections) return new Set<string>();
    const candidates = sheetQuery.data.sections
      .flatMap((s) => s.items)
      .filter((i) => i.purchaseStatus !== "purchased" && i.purchaseStatus !== "stored" && i.purchaseStatus !== "canceled" && i.remainingCents > 0);
    
    let budget = sheetQuery.data.summary.availableBudgetCents;
    const picked = new Set<string>();
    for (const item of candidates) {
      if (item.remainingCents <= budget) {
        picked.add(item.id);
        budget -= item.remainingCents;
      }
    }
    return picked;
  }, [buyMode, sheetQuery.data]);

  if (sheetQuery.isLoading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color="#58a6ff" />
      </View>
    );
  }

  if (!sheetQuery.data) return null;

  const { sections, summary } = sheetQuery.data;

  const handleToggleStatus = (item: CostLineItem) => {
    const nextStatus: PurchaseStatus = item.purchaseStatus === "purchased" ? "not_purchased" : "purchased";
    itemMutation.mutate({
      itemId: item.id,
      payload: { purchaseStatus: nextStatus, paidCents: nextStatus === "purchased" ? item.estimatedTotalCents : 0 },
    });
  };

  const handleDeleteSection = (sectionId: string, sectionName: string) => {
    Alert.alert("Delete Section", `Are you sure you want to permanently delete "${sectionName}" and all its contents?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Section", style: "destructive", onPress: () => deleteSectionMutation.mutate(sectionId) },
    ]);
  };

  return (
    <ScrollView style={styles.scrollLayout} contentContainerStyle={{ paddingBottom: 40 }} nestedScrollEnabled={true}>
      
      {/* 1. Global Action Options Button Strip Row */}
      <View style={styles.actionGridRowToolbar}>
        <TouchableOpacity style={styles.toolbarActionBtn} onPress={() => setBuyMode(!buyMode)}>
          <Sliders size={12} color={buyMode ? "#58a6ff" : "#c9d1d9"} />
          <Text style={[styles.toolbarActionBtnText, buyMode && { color: "#58a6ff" }]}>What Can I Buy Now?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarActionBtn} onPress={() => Alert.alert("Location Finder", "Opening dynamic warehouse structural locator...")}>
          <MapPin size={12} color="#c9d1d9" />
          <Text style={styles.toolbarActionBtnText}>Location Finder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolbarActionBtn} onPress={() => Alert.alert("Export Engine", "Exporting complete financial matrices ledgers...")}>
          <FileText size={12} color="#c9d1d9" />
          <Text style={styles.toolbarActionBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Main Budget Rollup Financial Metrics Dashboard Cards Grid */}
      <View style={styles.financialMetricsGridContainer}>
        <View style={styles.metricSummaryCardNode}>
          <Text style={styles.metricSummaryCardNodeLabel}>Projected Prototype Cost</Text>
          <Text style={styles.metricSummaryCardNodeValue}>{formatMoney(summary.projectedCents)}</Text>
        </View>
        <View style={styles.metricSummaryCardNode}>
          <Text style={styles.metricSummaryCardNodeLabel}>Amount Spent So Far</Text>
          <Text style={[styles.metricSummaryCardNodeValue, { color: "#56d364" }]}>{formatMoney(summary.spentCents)}</Text>
        </View>
        <View style={styles.metricSummaryCardNode}>
          <Text style={styles.metricSummaryCardNodeLabel}>Remaining to Prototype</Text>
          <Text style={styles.metricSummaryCardNodeValue}>{formatMoney(summary.remainingCents)}</Text>
        </View>
        <View style={styles.metricSummaryCardNode}>
          <Text style={styles.metricSummaryCardNodeLabel}>Available Budget</Text>
          <Text style={[styles.metricSummaryCardNodeValue, { color: "#58a6ff" }]}>{formatMoney(summary.availableBudgetCents)}</Text>
        </View>
      </View>

      {/* 3. Analytics Progress & Blockers Status Alert Banner Track */}
      <View style={styles.progressMetricsRowTrack}>
        <View style={styles.progressDataBlock}>
          <Text style={styles.progressDataBlockTitle}>Purchased ({summary.purchasedCount} of {summary.totalCount} items)</Text>
          <Text style={styles.progressDataBlockValue}>{summary.purchasedPct}%</Text>
        </View>
        <View style={styles.progressDataBlock}>
          <Text style={styles.progressDataBlockTitle}>Build Readiness</Text>
          <Text style={[styles.progressDataBlockValue, { color: "#56d364" }]}>{summary.buildReadinessPct}%</Text>
        </View>
      </View>

      <View style={styles.blockerAlertsBannerFrame}>
        {summary.nextBlocker ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} color="#f85149" />
            <Text style={{ color: "#f85149", fontSize: 12, fontWeight: "bold" }}>Blocker: {summary.nextBlocker.itemName} requires urgent components acquisition</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Check size={14} color="#56d364" />
            <Text style={{ color: "#56d364", fontSize: 12, fontWeight: "bold" }}>No open blockers</Text>
          </View>
        )}
      </View>

      {/* 4. Smart Purchases Matching Banner Context */}
      {buyMode && (
        <View style={styles.buyInsightsBanner}>
          <Text style={styles.insightsHeading}> Budget Matching Suggestions Active</Text>
          <Text style={styles.insightsSubtitle}>
            Highlighting unfulfilled items that safely resolve inside your remaining {formatMoney(summary.availableBudgetCents)} available threshold budget balance.
          </Text>
        </View>
      )}

      {/* 5. Production Web-Mirrored Accordion Cost Sections Stack */}
      <View style={{ gap: 12, marginTop: 10 }}>
        {sections.map((section) => {
          const isCollapsed = !!collapsedSections[section.id];
          return (
            <View key={section.id} style={styles.costSectionWrapperContainerCard}>
              
              {/* Expandable Panel Toggle Strip Row */}
              <TouchableOpacity
                style={styles.costSectionWrapperContainerCardHeader}
                onPress={() => setCollapsedSections({ ...collapsedSections, [section.id]: !isCollapsed })}
              >
                <View style={styles.flexLeftRow}>
                  {isCollapsed ? <ChevronRight size={14} color="#8b949e" /> : <ChevronDown size={14} color="#8b949e" />}
                  <Text style={styles.costSectionWrapperContainerCardHeaderTitle}>✓ {section.name}</Text>
                  <Text style={styles.badgeCount}>({section.items.length})</Text>
                </View>

                <View style={styles.flexLeftRow}>
                  <Text style={styles.costSectionWrapperContainerCardHeaderSubtotal}>
                    {formatMoney(section.subtotalPaidCents)} / {formatMoney(section.subtotalEstimatedCents)}
                  </Text>
                  {!readOnly && (
                    <TouchableOpacity style={{ marginLeft: 10, padding: 2 }} onPress={() => handleDeleteSection(section.id, section.name)}>
                      <Trash2 size={13} color="#f85149" />
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>

              {/* Collapsible Inner Spreadsheet Component Map Layout */}
              {!isCollapsed && (
                <View style={{ marginTop: 4 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true} nestedScrollEnabled={true} contentContainerStyle={{ flexDirection: "column" }}>
                    
                    {/* Emulated Spreadsheet Headers Matrix Column Mappings */}
                    <View style={styles.emulatedTableHeaderRowBlock}>
                      <Text style={[styles.thCell, { width: 120 }]}>Item</Text>
                      <Text style={[styles.thCell, { width: 100 }]}>Vendor</Text>
                      <Text style={[styles.thCell, { width: 45 }]}>Qty</Text>
                      <Text style={[styles.thCell, { width: 85 }]}>Unit Cost</Text>
                      <Text style={[styles.thCell, { width: 90 }]}>Est. Total</Text>
                      <Text style={[styles.thCell, { width: 80 }]}>Paid</Text>
                      <Text style={[styles.thCell, { width: 90 }]}>Remaining</Text>
                      <Text style={[styles.thCell, { width: 100 }]}>Status</Text>
                      <Text style={[styles.thCell, { width: 110 }]}>Location</Text>
                    </View>

                    {/* Linear Row Data Map List */}
                    {section.items.length === 0 ? (
                      <View style={{ width: 820, paddingVertical: 20, alignItems: "center" }}>
                        <Text style={styles.emptySectionLabelText}>No line items registered in this workspace category section.</Text>
                      </View>
                    ) : (
                      section.items.map((item) => {
                        const isPurchased = item.purchaseStatus === "purchased" || item.purchaseStatus === "stored";
                        const isHighlighted = buySuggestions.has(item.id);
                        const sMeta = PURCHASE_STATUS_META[item.purchaseStatus] || { label: "Unknown", color: "#c9d1d9" };
                        const locationString = [item.storage?.locationName, item.storage?.shelf, item.storage?.bin].filter(Boolean).join(" / ") || "—";

                        return (
                          <View key={item.id} style={[styles.emulatedTableDataRowBlock, isHighlighted && styles.cardHighlight]}>
                            
                            {/* Item Identifier Column Block + Interactivity Node Checkbox */}
                            <View style={[styles.tdCellContainer, { width: 120, flexDirection: "row", alignItems: "center", gap: 6 }]}>
                              <TouchableOpacity style={styles.checkboxTouchNode} onPress={() => handleToggleStatus(item)}>
                                <View style={[styles.checkboxBoxShape, isPurchased && styles.checkboxActive]}>
                                  {isPurchased && <Check size={10} color="#fff" />}
                                </View>
                              </TouchableOpacity>
                              <Text style={[styles.tdCellText, { color: "#fff", fontWeight: "bold" }, isPurchased && styles.textLineThrough]} numberOfLines={1}>
                                {item.itemName}
                              </Text>
                            </View>

                            <Text style={[styles.tdCellText, { width: 100 }]} numberOfLines={1}>{item.vendor?.name || "—"}</Text>
                            <Text style={[styles.tdCellText, { width: 45 }]}>{item.qty}</Text>
                            <Text style={[styles.tdCellText, { width: 85 }]}>{formatMoney(item.unitCostCents)}</Text>
                            <Text style={[styles.tdCellText, { width: 90, fontWeight: "bold", color: "#fff" }]}>{formatMoney(item.estimatedTotalCents)}</Text>
                            <Text style={[styles.tdCellText, { width: 80, color: "#56d364" }]}>{formatMoney(item.paidCents)}</Text>
                            <Text style={[styles.tdCellText, { width: 90 }]}>{formatMoney(item.remainingCents)}</Text>
                            
                            {/* Status Pill Badge Wrapper Cell */}
                            <View style={{ width: 100, alignItems: "flex-start" }}>
                              <View style={[styles.statusWrapperBadgeCell, { borderColor: sMeta.color }]}>
                                <Text style={{ color: sMeta.color, fontSize: 9, fontWeight: "bold" }}>{sMeta.label}</Text>
                              </View>
                            </View>

                            <Text style={[styles.tdCellText, { width: 110 }]} numberOfLines={1}>{locationString}</Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>

                  {/* Add Row Context Actions */}
                  {!readOnly && (
                    <TouchableOpacity
                      style={styles.addLineItemActionBtn}
                      onPress={() => setItemModal({ sectionId: section.id, item: null })}
                    >
                      <Plus size={12} color="#58a6ff" />
                      <Text style={styles.addLineItemActionBtnText}>Add Line Item</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* 6. Append New Cost Section Operational Context Form Sheet Strip */}
      {!readOnly && (
        <View style={{ marginTop: 14 }}>
          {addingSection ? (
            <View style={styles.appendSectionInlineForm}>
              <TextInput
                style={styles.inlineSectionInput}
                placeholder="Section Name (e.g. Manufacturing, Permits)"
                placeholderTextColor="#4b5563"
                value={newSectionName}
                onChangeText={setNewSectionName}
              />
              <TouchableOpacity
                style={styles.inlineActionConfirmBtn}
                onPress={() => {
                  if (newSectionName.trim()) {
                    sectionMutation.mutate(newSectionName.trim());
                    setNewSectionName("");
                    setAddingSection(false);
                  }
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingHorizontal: 6 }} onPress={() => setAddingSection(false)}>
                <Text style={{ color: "#8b949e", fontSize: 12 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.appendSectionTriggerBtn} onPress={() => setAddingSection(true)}>
              <Plus size={14} color="#c9d1d9" />
              <Text style={styles.appendSectionTriggerBtnText}>Add Cost Section</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* 7. Dialog Form Sheet Popovers */}
      {itemModal && (
        <ItemDialogModal
          sectionId={itemModal.sectionId}
          item={itemModal.item}
          projectId={projectId}
          onClose={() => setItemModal(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey });
            setItemModal(null);
          }}
        />
      )}
    </ScrollView>
  );
}

// Submodal implementation processing item payload attributes updates
function ItemDialogModal({ sectionId, item, projectId, onClose, onSuccess }: any) {
  const [itemName, setItemName] = useState(item?.itemName || "");
  const [qty, setQty] = useState(item ? String(item.qty) : "1");
  const [unitCost, setUnitCost] = useState(item ? centsToDollarInput(item.unitCostCents) : "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!itemName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        itemName: itemName.trim(),
        qty: Number(qty) || 1,
        unitCostCents: dollarsToCents(unitCost),
      };
      if (item) {
        await apiRequest(`/cost-manager/items/${item.id}`, { method: "PATCH", data: payload });
      } else {
        await apiRequest(`/cost-manager/sections/${sectionId}/items`, { method: "POST", data: payload });
      }
      onSuccess();
    } catch {
      Alert.alert("Error", "Could not complete transaction operation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalBlurOverlay}>
        <View style={styles.modalDialogContentBox}>
          <Text style={styles.modalHeaderHeading}>{item ? "Modify Property Line Item" : "Add New Line Item"}</Text>
          
          <View style={styles.modalFormBody}>
            <View>
              <Text style={styles.fieldInputLabel}>Line Item Label Target *</Text>
              <TextInput style={styles.modalTextInput} value={itemName} onChangeText={setItemName} placeholder="e.g. Aluminum sheet components" placeholderTextColor="#4b5563" />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldInputLabel}>Volume Quantity</Text>
                <TextInput style={styles.modalTextInput} keyboardType="number-pad" value={qty} onChangeText={setQty} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldInputLabel}>Unit Cost ($)</Text>
                <TextInput style={styles.modalTextInput} keyboardType="decimal-pad" value={unitCost} onChangeText={setUnitCost} placeholder="0.00" placeholderTextColor="#4b5563" />
              </View>
            </View>
          </View>

          <View style={styles.modalActionRowFooter}>
            <TouchableOpacity style={styles.modalCancelTouchNode} onPress={onClose}>
              <Text style={{ color: "#c9d1d9", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitTouchNode} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Commit Parameters</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ==========================================
// COMPACT DYNAMIC LAYOUT CENTRAL STYLESHEET
// ==========================================
const styles = StyleSheet.create({
  centerBox: { flex: 1, padding: 32, alignItems: "center", justifyContent: "center", backgroundColor: "#0d1117" },
  scrollLayout: { flex: 1, backgroundColor: "#0d1117" },
  actionGridRowToolbar: { flexDirection: "row", gap: 6, marginBottom: 12 },
  toolbarActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: "#21262d", borderWidth: 1, borderColor: "#30363d", paddingVertical: 8, borderRadius: 6 },
  toolbarActionBtnText: { color: "#c9d1d9", fontSize: 11, fontWeight: "600" },
  financialMetricsGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  metricSummaryCardNode: { flex: 1, minWidth: "46%", backgroundColor: "#161b22", borderWidth: 1, borderColor: "#30363d", padding: 10, borderRadius: 8, gap: 2 },
  metricSummaryCardNodeLabel: { fontSize: 10, fontWeight: "bold", color: "#8b949e", textTransform: "uppercase" },
  metricSummaryCardNodeValue: { fontSize: 14, fontWeight: "900", color: "#fff" },
  progressMetricsRowTrack: { flexDirection: "row", gap: 8, backgroundColor: "#161b22", borderWidth: 1, borderColor: "#30363d", padding: 10, borderRadius: 8, marginBottom: 8 },
  progressDataBlock: { flex: 1, gap: 2 },
  progressDataBlockTitle: { color: "#8b949e", fontSize: 11, fontWeight: "600" },
  progressDataBlockValue: { color: "#fff", fontSize: 15, fontWeight: "900" },
  blockerAlertsBannerFrame: { padding: 8, borderRadius: 6, backgroundColor: "#161b22", borderWidth: 1, borderColor: "#30363d", justifyContent: "center", marginBottom: 4 },
  buyInsightsBanner: { backgroundColor: "rgba(99, 102, 241, 0.08)", borderWidth: 1, borderColor: "rgba(99, 102, 241, 0.2)", padding: 10, borderRadius: 8, marginBottom: 10 },
  insightsHeading: { fontSize: 12, fontWeight: "bold", color: "#818cf8" },
  insightsSubtitle: { fontSize: 11, color: "#8b949e", marginTop: 2, lineHeight: 14 },
  costSectionWrapperContainerCard: { backgroundColor: "#161b22", borderWidth: 1, borderColor: "#30363d", borderRadius: 8, padding: 10, overflow: "hidden" },
  costSectionWrapperContainerCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  flexLeftRow: { flexDirection: "row", alignItems: "center" },
  costSectionWrapperContainerCardHeaderTitle: { fontSize: 13, fontWeight: "bold", color: "#fff", marginLeft: 2 },
  badgeCount: { fontSize: 11, color: "#8b949e", marginLeft: 4 },
  costSectionWrapperContainerCardHeaderSubtotal: { fontSize: 11, color: "#8b949e", fontWeight: "600" },
  emulatedTableHeaderRowBlock: { flexDirection: "row", width: 820, paddingVertical: 6, backgroundColor: "#0d1117", borderRadius: 4, paddingHorizontal: 6, marginVertical: 4 },
  thCell: { fontSize: 10, fontWeight: "bold", color: "#8b949e" },
  emptySectionLabelText: { color: "#8b949e", fontSize: 12, fontStyle: "italic", textAlign: "center", paddingVertical: 10 },
  emulatedTableDataRowBlock: { flexDirection: "row", width: 820, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: "#30363d", paddingHorizontal: 6, alignItems: "center" },
  tdCellContainer: { paddingRight: 4 },
  tdCellText: { fontSize: 12, color: "#c9d1d9" },
  checkboxTouchNode: { padding: 2 },
  checkboxBoxShape: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, borderColor: "#444c56", alignItems: "center", justifyContent: "center", backgroundColor: "#0d1117" },
  checkboxActive: { backgroundColor: "#238636", borderColor: "#238636" },
  textLineThrough: { textDecorationLine: "line-through", color: "#8b949e" },
  cardHighlight: { backgroundColor: "rgba(88, 166, 255, 0.06)" },
  statusWrapperBadgeCell: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.02)" },
  addLineItemActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingTop: 8, paddingLeft: 4 },
  addLineItemActionBtnText: { color: "#58a6ff", fontSize: 11, fontWeight: "bold" },
  appendSectionTriggerBtn: { borderStyle: "dashed", borderWidth: 1, borderColor: "#30363d", borderRadius: 6, padding: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  appendSectionTriggerBtnText: { color: "#c9d1d9", fontSize: 12, fontWeight: "600" },
  appendSectionInlineForm: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#161b22", padding: 8, borderRadius: 6, borderWidth: 1, borderColor: "#30363d" },
  inlineSectionInput: { flex: 1, height: 34, backgroundColor: "#0d1117", borderRadius: 6, borderWidth: 1, borderColor: "#30363d", color: "#fff", paddingHorizontal: 10, fontSize: 12 },
  inlineActionConfirmBtn: { backgroundColor: "#1f6feb", paddingHorizontal: 12, height: 34, justifyContent: "center", borderRadius: 6 },
  modalBlurOverlay: { flex: 1, backgroundColor: "rgba(13, 17, 23, 0.75)", justifyContent: "center", padding: 20 },
  modalDialogContentBox: { backgroundColor: "#161b22", borderRadius: 12, borderWidth: 1, borderColor: "#30363d", padding: 16 },
  modalHeaderHeading: { fontSize: 15, fontWeight: "bold", color: "#fff", marginBottom: 14 },
  modalFormBody: { flexDirection: "column", gap: 12 },
  fieldInputLabel: { fontSize: 11, color: "#8b949e", marginBottom: 4 },
  modalTextInput: { backgroundColor: "#0d1117", borderWidth: 1, borderColor: "#30363d", borderRadius: 6, color: "#fff", padding: 8, fontSize: 13, height: 38 },
  modalActionRowFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  modalCancelTouchNode: { paddingHorizontal: 14, paddingVertical: 8 },
  modalSubmitTouchNode: { backgroundColor: "#1f6feb", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, minWidth: 60, alignItems: "center" },
});