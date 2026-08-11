import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Share,
  useWindowDimensions,
} from "react-native";
import {
  Sliders,
  MapPin,
  FileText,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  X,
  Search,
  Share2,
  CheckCircle2,
  ShoppingBag,
  Building2,
  Printer,
  Download,
} from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "@/services/api";
import {
  getProjectCostSheet,
  createCostSection,
  PURCHASE_STATUS_META,
  CERT_STATUS_META,
  formatMoney,
  dollarsToCents,
  PurchaseStatus,
} from "@/services/costManager";

// --- Dynamic Color System ---
const buildColors = () => ({
  bgPrimary: "#0d1117",
  bgSecondary: "#161b22",
  bgTertiary: "#21262d",
  border: "#30363d",
  textPrimary: "#ffffff",
  textSecondary: "#8b949e",
  textMuted: "#4b5563",
  textLight: "#c9d1d9",
  accentBlue: "#1f6feb",
  accentBlueLight: "#58a6ff",
  accentGreen: "#238636",
  accentGreenLight: "#56d364",
  accentYellow: "#fbbf24",
  accentOrange: "#f97316",
  accentRed: "#ff7b72",
  accentRedDark: "#f85149",
  accentPurple: "#8b5cf6",
});

// ==========================================
// WEB-STYLE MODAL: WHAT CAN I BUY NOW?
// ==========================================
interface WhatCanIBuyModalProps {
  visible: boolean;
  onClose: () => void;
  availableBudgetCents: number;
  sections: any[];
}

function WhatCanIBuyModal({ visible, onClose, availableBudgetCents, sections }: WhatCanIBuyModalProps) {
  const { width, height } = useWindowDimensions();
  const wp = (p: number) => (width * p) / 100;
  const hp = (p: number) => (height * p) / 100;
  const isTablet = width >= 768;

  const [searchQuery, setSearchQuery] = useState("");

  const unpurchasedItems = useMemo(() => {
    const list: any[] = [];
    sections.forEach((sec) => {
      (sec.items || []).forEach((item: any) => {
        if (item.purchaseStatus === "not_purchased") {
          list.push({ ...item, sectionName: sec.name });
        }
      });
    });
    return list;
  }, [sections]);

  const filteredItems = useMemo(() => {
    return unpurchasedItems.filter((item) => {
      const matchSearch =
        item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.vendor?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [unpurchasedItems, searchQuery]);

  const affordableItems = useMemo(() => {
    return filteredItems.filter((item) => item.estimatedTotalCents <= availableBudgetCents);
  }, [filteredItems, availableBudgetCents]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={modalStyles.overlay}>
        <View style={[modalStyles.webCard, { maxWidth: isTablet ? 620 : "100%", maxHeight: "88%" }]}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: wp(2) }}>
              <View style={modalStyles.iconBadge}>
                <ShoppingBag size={18} color="#58a6ff" />
              </View>
              <View>
                <Text style={modalStyles.title}>What Can I Buy Now?</Text>
                <Text style={modalStyles.subtitle}>Budget-matched component procurement matrix</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <X size={16} color="#8b949e" />
            </TouchableOpacity>
          </View>

          {/* Budget Banner */}
          <View style={modalStyles.budgetBanner}>
            <Text style={{ color: "#8b949e", fontSize: 11, fontWeight: "bold" }}>AVAILABLE BUDGET BALANCE</Text>
            <Text style={{ color: "#56d364", fontSize: 22, fontWeight: "900", marginTop: 2 }}>
              {formatMoney(availableBudgetCents)}
            </Text>
            <Text style={{ color: "#c9d1d9", fontSize: 11, marginTop: 4 }}>
              {affordableItems.length} of {unpurchasedItems.length} unpurchased items fit within current liquidity
            </Text>
          </View>

          {/* Search Filter Bar */}
          <View style={modalStyles.searchBar}>
            <Search size={14} color="#8b949e" />
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search components or vendors..."
              placeholderTextColor="#4b5563"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Items Stream */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: hp(1), paddingVertical: hp(1) }}>
            {affordableItems.length === 0 ? (
              <View style={{ paddingVertical: hp(4), alignItems: "center" }}>
                <AlertTriangle size={24} color="#fbbf24" />
                <Text style={{ color: "#8b949e", fontSize: 12, marginTop: hp(1), fontStyle: "italic" }}>
                  No unpurchased items match available liquidity or query criteria.
                </Text>
              </View>
            ) : (
              affordableItems.map((item) => (
                <View key={item.id} style={modalStyles.itemRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>{item.itemName}</Text>
                    <Text style={{ color: "#8b949e", fontSize: 11, marginTop: 2 }}>
                      Section: {item.sectionName} • Qty: {item.qty} • Vendor: {item.vendor?.name || "Unassigned"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: "#58a6ff", fontSize: 14, fontWeight: "bold" }}>
                      {formatMoney(item.estimatedTotalCents)}
                    </Text>
                    <View style={modalStyles.affordableBadge}>
                      <CheckCircle2 size={10} color="#56d364" />
                      <Text style={{ color: "#56d364", fontSize: 9, fontWeight: "bold" }}>In Budget</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer controls */}
          <View style={modalStyles.footerRow}>
            <TouchableOpacity style={modalStyles.primaryBtn} onPress={onClose}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Close Matrix</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==========================================
// WEB-STYLE MODAL: LOCATION FINDER
// ==========================================
interface LocationFinderModalProps {
  visible: boolean;
  onClose: () => void;
  sections: any[];
}

function LocationFinderModal({ visible, onClose, sections }: LocationFinderModalProps) {
  const { width, height } = useWindowDimensions();
  const wp = (p: number) => (width * p) / 100;
  const hp = (p: number) => (height * p) / 100;
  const isTablet = width >= 768;

  const [searchQuery, setSearchQuery] = useState("");

  const storageItems = useMemo(() => {
    const list: any[] = [];
    sections.forEach((sec) => {
      (sec.items || []).forEach((item: any) => {
        const loc = item.storage?.locationName;
        const shelf = item.storage?.shelf;
        list.push({
          ...item,
          sectionName: sec.name,
          locationDisplay: [loc, shelf].filter(Boolean).join(" / ") || "Unassigned Location",
          hasStorage: Boolean(loc || shelf),
        });
      });
    });
    return list;
  }, [sections]);

  const filteredStorage = useMemo(() => {
    return storageItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        item.itemName.toLowerCase().includes(q) ||
        item.locationDisplay.toLowerCase().includes(q) ||
        item.sectionName.toLowerCase().includes(q)
      );
    });
  }, [storageItems, searchQuery]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={modalStyles.overlay}>
        <View style={[modalStyles.webCard, { maxWidth: isTablet ? 620 : "100%", maxHeight: "88%" }]}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: wp(2) }}>
              <View style={modalStyles.iconBadge}>
                <Building2 size={18} color="#8b5cf6" />
              </View>
              <View>
                <Text style={modalStyles.title}>Location Finder Index</Text>
                <Text style={modalStyles.subtitle}>Physical inventory placement & storage bin coordinates</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <X size={16} color="#8b949e" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={modalStyles.searchBar}>
            <Search size={14} color="#8b949e" />
            <TextInput
              style={modalStyles.searchInput}
              placeholder="Search by component, rack, shelf or hub..."
              placeholderTextColor="#4b5563"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Storage Grid Stream */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: hp(1), paddingVertical: hp(1) }}>
            {filteredStorage.length === 0 ? (
              <View style={{ paddingVertical: hp(4), alignItems: "center" }}>
                <MapPin size={24} color="#8b949e" />
                <Text style={{ color: "#8b949e", fontSize: 12, marginTop: hp(1), fontStyle: "italic" }}>
                  No components match the specified physical location filter.
                </Text>
              </View>
            ) : (
              filteredStorage.map((item) => (
                <View key={item.id} style={modalStyles.itemRowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>{item.itemName}</Text>
                    <Text style={{ color: "#8b949e", fontSize: 11, marginTop: 2 }}>
                      Section: {item.sectionName} • Status: {item.purchaseStatus}
                    </Text>
                  </View>
                  <View style={modalStyles.locationTagPill}>
                    <MapPin size={11} color="#8b5cf6" />
                    <Text style={{ color: "#8b5cf6", fontSize: 11, fontWeight: "bold" }}>
                      {item.locationDisplay}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <View style={modalStyles.footerRow}>
            <TouchableOpacity style={modalStyles.primaryBtn} onPress={onClose}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Close Index</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ==========================================
// WEB-STYLE MODAL: EXPORT COST SHEET
// ==========================================
interface ExportCostSheetModalProps {
  visible: boolean;
  onClose: () => void;
  projectName: string;
  summary: any;
  sections: any[];
}

function ExportCostSheetModal({ visible, onClose, projectName, summary, sections }: ExportCostSheetModalProps) {
  const { width, height } = useWindowDimensions();
  const wp = (p: number) => (width * p) / 100;
  const hp = (p: number) => (height * p) / 100;
  const isTablet = width >= 768;

  const [exporting, setExporting] = useState(false);

  const handleShareSummary = async () => {
    setExporting(true);
    try {
      let content = `PROJECT FINANCIAL COST SHEET SUMMARY: ${projectName}\n`;
      content += `Projected Cost: ${formatMoney(summary?.projectedCents || 0)}\n`;
      content += `Spent So Far: ${formatMoney(summary?.spentCents || 0)}\n`;
      content += `Remaining: ${formatMoney(summary?.remainingCents || 0)}\n`;
      content += `Available Budget: ${formatMoney(summary?.availableBudgetCents || 0)}\n\n`;
      content += `SECTIONS (${sections.length}):\n`;

      sections.forEach((sec) => {
        content += `- ${sec.name}: Spent ${formatMoney(sec.subtotalPaidCents)} / Est. ${formatMoney(sec.subtotalEstimatedCents)} (${(sec.items || []).length} items)\n`;
      });

      await Share.share({
        title: `${projectName} - Cost Sheet Summary`,
        message: content,
      });
    } catch (err) {
      // Handled silently
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={modalStyles.overlay}>
        <View style={[modalStyles.webCard, { maxWidth: isTablet ? 540 : "100%" }]}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: wp(2) }}>
              <View style={modalStyles.iconBadge}>
                <FileText size={18} color="#238636" />
              </View>
              <View>
                <Text style={modalStyles.title}>Export Financial Ledger</Text>
                <Text style={modalStyles.subtitle}>Generate financial statements and ledger reports</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <X size={16} color="#8b949e" />
            </TouchableOpacity>
          </View>

          {/* Web Actions List */}
          <View style={{ gap: hp(1.2), marginVertical: hp(2) }}>
            <TouchableOpacity style={modalStyles.exportOptionBtn} onPress={handleShareSummary} disabled={exporting}>
              <Share2 size={16} color="#58a6ff" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>Share Summary Report</Text>
                <Text style={{ color: "#8b949e", fontSize: 11 }}>Broadcast structured text summary to team devices</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.exportOptionBtn}
              onPress={() => {
                onClose();
                handleShareSummary();
              }}
            >
              <Download size={16} color="#56d364" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>Download CSV Data Matrix</Text>
                <Text style={{ color: "#8b949e", fontSize: 11 }}>Export raw line-item ledger into spreadsheet CSV</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={modalStyles.exportOptionBtn}
              onPress={() => {
                onClose();
                handleShareSummary();
              }}
            >
              <Printer size={16} color="#fbbf24" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>Print PDF Cost Sheet</Text>
                <Text style={{ color: "#8b949e", fontSize: 11 }}>Formatted printable PDF audit document</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={modalStyles.footerRow}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
              <Text style={{ color: "#c9d1d9", fontSize: 12 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Modal Shared Stylesheet
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(13, 17, 23, 0.8)",
    justifyContent: "center",
    padding: 16,
  },
  webCard: {
    backgroundColor: "#161b22",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 16,
    width: "100%",
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#30363d",
    paddingBottom: 12,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "bold", color: "#ffffff" },
  subtitle: { fontSize: 11, color: "#8b949e", marginTop: 2 },
  closeBtn: { padding: 4 },
  budgetBanner: {
    backgroundColor: "#21262d",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    padding: 12,
    marginVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d1117",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 12 },
  itemRowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 8,
    padding: 10,
  },
  affordableBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(86,211,100,0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  locationTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(139,92,246,0.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exportOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#21262d",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 8,
    padding: 12,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#30363d",
    paddingTop: 12,
    marginTop: 8,
  },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  primaryBtn: {
    backgroundColor: "#1f6feb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
});

// ==========================================
// ITEM INPUT MODAL
// ==========================================
interface ItemInputDialogModalProps {
  sectionId: string;
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ItemInputDialogModal({ sectionId, projectId, onClose, onSuccess }: ItemInputDialogModalProps) {
  const { width, height } = useWindowDimensions();
  const wp = (percentage: number) => (width * percentage) / 100;
  const hp = (percentage: number) => (height * percentage) / 100;
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;
  const colors = useMemo(() => buildColors(), []);

  const dialogStyles = useMemo(
    () => createDialogStyles(colors, wp, hp, isTablet, isSmallScreen),
    [width, height, isTablet, isSmallScreen]
  );

  const [itemName, setItemName] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [locationName, setLocationName] = useState("");
  const [shelf, setShelf] = useState("");
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("not_purchased");
  const [saving, setSaving] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      return;
    }
    setSaving(true);
    try {
      const calculatedTotalCents = dollarsToCents(unitCost) * (Number(qty) || 1);
      const payload = {
        itemName: itemName.trim(),
        qty: Number(qty) || 1,
        unitCostCents: dollarsToCents(unitCost),
        estimatedTotalCents: calculatedTotalCents,
        purchaseStatus,
        vendor: vendorName.trim() ? { name: vendorName.trim() } : null,
        storage: {
          locationName: locationName.trim() || undefined,
          shelf: shelf.trim() || undefined,
        },
        paidCents: purchaseStatus === "purchased" || purchaseStatus === "stored" ? calculatedTotalCents : 0,
      };

      await apiRequest(`/cost-manager/sections/${sectionId}/items`, {
        method: "POST",
        data: payload,
      });
      onSuccess();
    } catch (err) {
      // Handled silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={dialogStyles.modalBlurOverlay}>
        <ScrollView style={dialogStyles.modalDialogContentBox} contentContainerStyle={{ paddingBottom: hp(2.5) }}>
          <View style={dialogStyles.modalHeaderContainerRow}>
            <Text style={dialogStyles.modalHeaderHeading}>Add Section Line Item</Text>
            <TouchableOpacity onPress={onClose}><X size={16} color="#8b949e" /></TouchableOpacity>
          </View>

          <View style={dialogStyles.modalFormBody}>
            <View>
              <Text style={dialogStyles.fieldInputLabel}>Item Identifier Name *</Text>
              <TextInput style={dialogStyles.modalTextInput} value={itemName} onChangeText={setItemName} placeholder="e.g. Aluminum prototypes brackets" placeholderTextColor="#4b5563" />
            </View>

            <View>
              <Text style={dialogStyles.fieldInputLabel}>Supplier Vendor Contact</Text>
              <TextInput style={dialogStyles.modalTextInput} value={vendorName} onChangeText={setVendorName} placeholder="e.g. McMaster-Carr Logistics" placeholderTextColor="#4b5563" />
            </View>

            <View style={{ flexDirection: "row", gap: wp(2) }}>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Quantity Vol</Text>
                <TextInput style={dialogStyles.modalTextInput} keyboardType="number-pad" value={qty} onChangeText={setQty} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Unit Cost ($)</Text>
                <TextInput style={dialogStyles.modalTextInput} keyboardType="decimal-pad" value={unitCost} onChangeText={setUnitCost} placeholder="0.00" placeholderTextColor="#4b5563" />
              </View>
            </View>

            <View style={{ position: "relative", zIndex: 100 }}>
              <Text style={dialogStyles.fieldInputLabel}>Procurement Purchase Status</Text>
              <TouchableOpacity style={dialogStyles.dropdownTriggerPill} onPress={() => setShowStatusDropdown(!showStatusDropdown)}>
                <Text style={{ color: "#fff", fontSize: 13 }}>{PURCHASE_STATUS_META[purchaseStatus]?.label || purchaseStatus}</Text>
                <ChevronDown size={14} color="#8b949e" />
              </TouchableOpacity>

              {showStatusDropdown && (
                <View style={dialogStyles.dropdownMenuOptionsWrapperFrame}>
                  {(Object.keys(PURCHASE_STATUS_META) as PurchaseStatus[]).map((statusKey) => (
                    <TouchableOpacity
                      key={statusKey}
                      style={dialogStyles.dropdownMenuOptionsItemRow}
                      onPress={() => { setPurchaseStatus(statusKey); setShowStatusDropdown(false); }}
                    >
                      <Text style={{ color: PURCHASE_STATUS_META[statusKey].color, fontSize: 12, fontWeight: "600" }}>
                        {PURCHASE_STATUS_META[statusKey].label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: wp(2), marginTop: hp(0.5) }}>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Storage Facility Hub</Text>
                <TextInput style={dialogStyles.modalTextInput} value={locationName} onChangeText={setLocationName} placeholder="e.g. Grid Position Alpha" placeholderTextColor="#4b5563" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={dialogStyles.fieldInputLabel}>Shelf/Bin Index</Text>
                <TextInput style={dialogStyles.modalTextInput} value={shelf} onChangeText={setShelf} placeholder="e.g. A4-B2" placeholderTextColor="#4b5563" />
              </View>
            </View>
          </View>

          <View style={dialogStyles.modalActionRowFooter}>
            <TouchableOpacity style={dialogStyles.modalCancelTouchNode} onPress={onClose}>
              <Text style={{ color: "#c9d1d9", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dialogStyles.modalSubmitTouchNode} onPress={handleSaveItem} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13 }}>Commit Parameters</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Manager Styles Generator
function createManagerStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) {
  return StyleSheet.create({
    managerContainerBlock: { gap: hp(1.5), marginTop: hp(0.5) },
    actionGridRowToolbar: { flexDirection: "row", gap: wp(1.5), flexWrap: "wrap" },
    toolbarActionBtn: {
      flex: 1,
      minWidth: wp(25),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: wp(1),
      backgroundColor: colors.bgTertiary,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: hp(1),
      paddingHorizontal: wp(1.5),
      borderRadius: wp(1.5),
    },
    toolbarActionBtnText: { color: colors.textLight, fontSize: 11, fontWeight: "600" },
    financialMetricsGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: wp(1.5) },
    metricSummaryCardNode: {
      flex: 1,
      minWidth: isTablet ? "22%" : "47%",
      backgroundColor: colors.bgPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(2.5),
      borderRadius: wp(2),
      gap: hp(0.3),
    },
    metricSummaryCardNodeLabel: { fontSize: 10, fontWeight: "bold", color: colors.textSecondary, textTransform: "uppercase" },
    managerStatValText: { fontSize: 14, fontWeight: "900", color: colors.textPrimary },
    progressMetricsRowTrack: { flexDirection: "row", gap: wp(2), backgroundColor: colors.bgSecondary, padding: wp(2.5), borderRadius: wp(2), borderWidth: 1, borderColor: colors.border },
    progressDataBlock: { flex: 1, gap: hp(0.3) },
    progressDataBlockTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: "600" },
    progressDataBlockValue: { color: colors.textPrimary, fontSize: 15, fontWeight: "900" },
    blockerAlertsBannerFrame: { padding: wp(2), borderRadius: wp(1.5), backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
    costSectionWrapperContainerCard: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(2), padding: wp(2.5), gap: hp(1) },
    costSectionWrapperContainerCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: hp(0.8) },
    costSectionWrapperContainerCardHeaderTitle: { fontSize: 13, fontWeight: "bold", color: colors.textPrimary },
    costSectionWrapperContainerCardHeaderSubtotal: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
    emulatedTableHeaderRowBlock: { flexDirection: "row", width: 770, paddingVertical: hp(0.6), backgroundColor: colors.bgPrimary, borderRadius: wp(1), paddingHorizontal: wp(1.5) },
    thCell: { fontSize: 10, fontWeight: "bold", color: colors.textSecondary },
    emptyTableInlineLabelNoticeString: { color: colors.textSecondary, fontSize: 12, fontStyle: "italic" },
    emulatedTableDataRowBlock: { flexDirection: "row", width: 770, paddingVertical: hp(1), borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingHorizontal: wp(1.5), alignItems: "center" },
    tdCell: { fontSize: 12, color: colors.textLight },
    statusWrapperBadgeCell: { borderWidth: 1, paddingHorizontal: wp(1), paddingVertical: hp(0.2), borderRadius: wp(1), alignItems: "center", justifyContent: "center" },
    addInlineRowActionBtn: { flexDirection: "row", alignItems: "center", gap: wp(1), paddingTop: hp(0.5) },
    addInlineRowActionBtnText: { color: colors.accentBlueLight, fontSize: 11, fontWeight: "bold" },
    certificationDataNodeLineRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: hp(0.8), borderBottomWidth: 0.5, borderBottomColor: colors.border },
    sectionCreationInputWrapperRowFrame: { flexDirection: "row", gap: wp(1.5), marginTop: hp(0.5), alignItems: "center" },
    sectionCreationInputFieldElement: { flex: 1, backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), color: colors.textPrimary, paddingHorizontal: wp(2.5), paddingVertical: hp(0.8), fontSize: 12, minHeight: hp(4.8) },
    sectionCreationSubmitTouchNodeBtn: { backgroundColor: colors.accentBlue, paddingHorizontal: wp(3), paddingVertical: hp(1), borderRadius: wp(1.5), justifyContent: "center", minHeight: hp(4.8) },
  });
}

function createDialogStyles(
  colors: ReturnType<typeof buildColors>,
  wp: (percentage: number) => number,
  hp: (percentage: number) => number,
  isTablet: boolean,
  isSmallScreen: boolean
) {
  return StyleSheet.create({
    modalBlurOverlay: { flex: 1, backgroundColor: "rgba(13, 17, 23, 0.75)", justifyContent: "center", padding: isSmallScreen ? wp(3) : wp(4) },
    modalDialogContentBox: { backgroundColor: colors.bgSecondary, borderRadius: wp(3), borderWidth: 1, borderColor: colors.border, padding: wp(4), maxHeight: "90%", width: "100%", maxWidth: isTablet ? 560 : undefined, alignSelf: "center" },
    modalHeaderContainerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: hp(1.8), borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: hp(1) },
    modalHeaderHeading: { fontSize: 16, fontWeight: "bold", color: colors.textPrimary },
    modalFormBody: { flexDirection: "column", gap: hp(1.5) },
    fieldInputLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: hp(0.5), fontWeight: "bold" },
    modalTextInput: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), color: colors.textPrimary, paddingHorizontal: wp(2.5), fontSize: 13, height: hp(4.8) },
    dropdownTriggerPill: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), paddingHorizontal: wp(2.5), height: hp(4.8) },
    dropdownMenuOptionsWrapperFrame: { backgroundColor: colors.bgPrimary, borderWidth: 1, borderColor: colors.border, borderRadius: wp(1.5), marginTop: hp(0.5), overflow: "hidden" },
    dropdownMenuOptionsItemRow: { padding: wp(2.5), borderBottomWidth: 0.5, borderBottomColor: colors.border },
    modalActionRowFooter: { flexDirection: "row", justifyContent: "flex-end", gap: wp(2.5), marginTop: hp(2.5) },
    modalCancelTouchNode: { paddingHorizontal: wp(3.5), paddingVertical: hp(1), justifyContent: "center" },
    modalSubmitTouchNode: { backgroundColor: colors.accentBlue, paddingHorizontal: wp(4), paddingVertical: hp(1), borderRadius: wp(1.5), minWidth: wp(20), alignItems: "center", justifyContent: "center" },
  });
}

// ==========================================
// CORE MOBILE COST MANAGER COMPONENT
// ==========================================
export interface MobileCostManagerProps {
  projectId: string;
  projectName?: string;
  tasks?: Array<{ id: string; title: string }>;
}

export function MobileCostManager({ projectId, projectName = "Project", tasks = [] }: MobileCostManagerProps) {
  const { width, height } = useWindowDimensions();
  const wp = (percentage: number) => (width * percentage) / 100;
  const hp = (percentage: number) => (height * percentage) / 100;
  const isTablet = width >= 768;
  const isSmallScreen = width < 375;
  const colors = useMemo(() => buildColors(), []);

  const managerStyles = useMemo(
    () => createManagerStyles(colors, wp, hp, isTablet, isSmallScreen),
    [width, height, isTablet, isSmallScreen]
  );

  const queryClient = useQueryClient();
  const [activeSectionInput, setActiveSectionInput] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [activeDialogTargetId, setActiveDialogTargetId] = useState<string | null>(null);

  // Web Modals State
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const { data: costData, isLoading } = useQuery({
    queryKey: ["project-cost-sheet", projectId],
    queryFn: () => getProjectCostSheet(projectId).then((res) => res.data),
    enabled: !!projectId,
  });

  const addSectionMutation = useMutation({
    mutationFn: (name: string) => createCostSection(costData?.sheet?.id || "", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-cost-sheet", projectId] });
      setActiveSectionInput("");
    },
  });

  if (isLoading || !costData) {
    return <ActivityIndicator color="#58a6ff" style={{ marginVertical: hp(2.5) }} />;
  }

  const { summary, sections = [], certifications = [] } = costData;

  return (
    <View style={managerStyles.managerContainerBlock}>
      {/* Action Toolbar buttons */}
      <View style={managerStyles.actionGridRowToolbar}>
        <TouchableOpacity style={managerStyles.toolbarActionBtn} onPress={() => setIsBuyModalOpen(true)}>
          <Sliders size={12} color="#c9d1d9" style={[{ transform: [{ rotate: "90deg" }] }]} />
          <Text style={managerStyles.toolbarActionBtnText} numberOfLines={1}>What Can I Buy Now?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={managerStyles.toolbarActionBtn} onPress={() => setIsLocationModalOpen(true)}>
          <MapPin size={12} color="#c9d1d9" />
          <Text style={managerStyles.toolbarActionBtnText} numberOfLines={1}>Location Finder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={managerStyles.toolbarActionBtn} onPress={() => setIsExportModalOpen(true)}>
          <FileText size={12} color="#c9d1d9" />
          <Text style={managerStyles.toolbarActionBtnText} numberOfLines={1}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Financial Metrics Cards */}
      <View style={managerStyles.financialMetricsGridContainer}>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Projected Prototype Cost</Text>
          <Text style={managerStyles.managerStatValText}>{formatMoney(summary?.projectedCents || 0)}</Text>
        </View>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Amount Spent So Far</Text>
          <Text style={[managerStyles.managerStatValText, { color: "#56d364" }]}>{formatMoney(summary?.spentCents || 0)}</Text>
        </View>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Remaining to Prototype</Text>
          <Text style={managerStyles.managerStatValText}>{formatMoney(summary?.remainingCents || 0)}</Text>
        </View>
        <View style={managerStyles.metricSummaryCardNode}>
          <Text style={managerStyles.metricSummaryCardNodeLabel}>Available Budget</Text>
          <Text style={[managerStyles.managerStatValText, { color: "#58a6ff" }]}>{formatMoney(summary?.availableBudgetCents || 0)}</Text>
        </View>
      </View>

      {/* Progress Metrics Track */}
      <View style={managerStyles.progressMetricsRowTrack}>
        <View style={managerStyles.progressDataBlock}>
          <Text style={managerStyles.progressDataBlockTitle}>Purchased ({summary?.purchasedCount || 0} of {summary?.totalCount || 0} items)</Text>
          <Text style={managerStyles.progressDataBlockValue}>{summary?.purchasedPct || 0}%</Text>
        </View>
        <View style={managerStyles.progressDataBlock}>
          <Text style={managerStyles.progressDataBlockTitle}>Build Readiness</Text>
          <Text style={[managerStyles.progressDataBlockValue, { color: "#56d364" }]}>{summary?.buildReadinessPct || 0}%</Text>
        </View>
      </View>

      {/* Blocker Alert Banner */}
      <View style={managerStyles.blockerAlertsBannerFrame}>
        {summary?.nextBlocker ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
            <AlertTriangle size={14} color="#ff7b72" />
            <Text style={{ color: "#ff7b72", fontSize: 12, fontWeight: "bold", flex: 1 }}>Blocker: {summary.nextBlocker.itemName} requires urgent component fulfillment</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5) }}>
            <Check size={14} color="#56d364" />
            <Text style={{ color: "#56d364", fontSize: 12, fontWeight: "bold" }}>No open blockers</Text>
          </View>
        )}
      </View>

      {/* Sections List */}
      <View style={{ gap: hp(1.5), marginTop: hp(1) }}>
        {sections.map((sect: any) => {
          const isCollapsed = !!collapsedSections[sect.id];
          return (
            <View key={sect.id} style={managerStyles.costSectionWrapperContainerCard}>
              <TouchableOpacity
                style={managerStyles.costSectionWrapperContainerCardHeader}
                onPress={() => setCollapsedSections({ ...collapsedSections, [sect.id]: !isCollapsed })}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: wp(1.5), flex: 1 }}>
                  {isCollapsed ? <ChevronRight size={14} color="#8b949e" /> : <ChevronDown size={14} color="#8b949e" />}
                  <Text style={managerStyles.costSectionWrapperContainerCardHeaderTitle} numberOfLines={1}>✓ {sect.name}</Text>
                  <Text style={{ fontSize: 11, color: "#8b949e" }}>({sect.items?.length || 0})</Text>
                </View>
                <Text style={managerStyles.costSectionWrapperContainerCardHeaderSubtotal}>
                  {formatMoney(sect.subtotalPaidCents)} / {formatMoney(sect.subtotalEstimatedCents)}
                </Text>
              </TouchableOpacity>

              {!isCollapsed && (
                <View style={{ marginTop: hp(0.8) }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ flexDirection: "column" }}>
                    <View style={managerStyles.emulatedTableHeaderRowBlock}>
                      <Text style={[managerStyles.thCell, { width: 110 }]}>Item</Text>
                      <Text style={[managerStyles.thCell, { width: 95 }]}>Vendor</Text>
                      <Text style={[managerStyles.thCell, { width: 40 }]}>Qty</Text>
                      <Text style={[managerStyles.thCell, { width: 80 }]}>Unit Cost</Text>
                      <Text style={[managerStyles.thCell, { width: 85 }]}>Est. Total</Text>
                      <Text style={[managerStyles.thCell, { width: 75 }]}>Paid</Text>
                      <Text style={[managerStyles.thCell, { width: 80 }]}>Remaining</Text>
                      <Text style={[managerStyles.thCell, { width: 95 }]}>Status</Text>
                      <Text style={[managerStyles.thCell, { width: 110 }]}>Location</Text>
                    </View>

                    {!sect.items || sect.items.length === 0 ? (
                      <View style={{ width: 770, paddingVertical: hp(2), alignItems: "center" }}>
                        <Text style={managerStyles.emptyTableInlineLabelNoticeString}>No line items registered.</Text>
                      </View>
                    ) : (
                      sect.items.map((item: any) => {
                        const sMeta = PURCHASE_STATUS_META[item.purchaseStatus as PurchaseStatus] || { label: "Unknown", color: "#c9d1d9" };
                        const locationStr = [item.storage?.locationName, item.storage?.shelf].filter(Boolean).join(" / ") || "—";
                        return (
                          <View key={item.id} style={managerStyles.emulatedTableDataRowBlock}>
                            <Text style={[managerStyles.tdCell, { width: 110, color: "#fff", fontWeight: "bold" }]} numberOfLines={1}>{item.itemName}</Text>
                            <Text style={[managerStyles.tdCell, { width: 95 }]} numberOfLines={1}>{item.vendor?.name || "—"}</Text>
                            <Text style={[managerStyles.tdCell, { width: 40 }]}>{item.qty}</Text>
                            <Text style={[managerStyles.tdCell, { width: 80 }]}>{formatMoney(item.unitCostCents)}</Text>
                            <Text style={[managerStyles.tdCell, { width: 85, fontWeight: "bold", color: "#fff" }]}>{formatMoney(item.estimatedTotalCents)}</Text>
                            <Text style={[managerStyles.tdCell, { width: 75, color: "#56d364" }]}>{formatMoney(item.paidCents)}</Text>
                            <Text style={[managerStyles.tdCell, { width: 80 }]}>{formatMoney(item.remainingCents)}</Text>
                            <View style={[managerStyles.statusWrapperBadgeCell, { width: 95, borderColor: sMeta.color }]}>
                              <Text style={{ color: sMeta.color, fontSize: 9, fontWeight: "bold" }}>{sMeta.label}</Text>
                            </View>
                            <Text style={[managerStyles.tdCell, { width: 110 }]} numberOfLines={1}>{locationStr}</Text>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>

                  <TouchableOpacity style={managerStyles.addInlineRowActionBtn} onPress={() => setActiveDialogTargetId(sect.id)}>
                    <Plus size={12} color="#58a6ff" />
                    <Text style={managerStyles.addInlineRowActionBtnText}>Add Line Item</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Certifications Card */}
      <View style={[managerStyles.costSectionWrapperContainerCard, { marginTop: hp(1.5) }]}>
        <Text style={[managerStyles.costSectionWrapperContainerCardHeaderTitle, { marginBottom: hp(0.8) }]}>Testing & Certification System Requirements</Text>
        {certifications.length === 0 ? (
          <Text style={[managerStyles.emptyTableInlineLabelNoticeString, { textAlign: "left", paddingVertical: hp(0.5) }]}>
            No testing, UL listing, permit, or certification requirements yet.
          </Text>
        ) : (
          certifications.map((cert: any) => {
            const cMeta = CERT_STATUS_META[cert.status as keyof typeof CERT_STATUS_META] || { label: "Unknown", color: "#c9d1d9" };
            return (
              <View key={cert.id} style={managerStyles.certificationDataNodeLineRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>{cert.name}</Text>
                  <Text style={{ color: "#8b949e", fontSize: 11 }}>Lab: {cert.authorityOrLab || "—"} • Standard: {cert.standard || "—"}</Text>
                </View>
                <View style={[managerStyles.statusWrapperBadgeCell, { borderColor: cMeta.color }]}>
                  <Text style={{ color: cMeta.color, fontSize: 9, fontWeight: "900" }}>{cMeta.label}</Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* New Section Input */}
      <View style={managerStyles.sectionCreationInputWrapperRowFrame}>
        <TextInput
          style={managerStyles.sectionCreationInputFieldElement}
          placeholder="New Cost Section label heading..."
          placeholderTextColor="#4b5563"
          value={activeSectionInput}
          onChangeText={setActiveSectionInput}
        />
        <TouchableOpacity
          style={managerStyles.sectionCreationSubmitTouchNodeBtn}
          onPress={() => {
            if (activeSectionInput.trim()) addSectionMutation.mutate(activeSectionInput.trim());
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Add Cost Section</Text>
        </TouchableOpacity>
      </View>

      {/* Add Line Item Dialog */}
      {activeDialogTargetId !== null && (
        <ItemInputDialogModal
          sectionId={activeDialogTargetId}
          projectId={projectId}
          onClose={() => setActiveDialogTargetId(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["project-cost-sheet", projectId] });
            setActiveDialogTargetId(null);
          }}
        />
      )}

      {/* Web-Style Interactive Modals */}
      <WhatCanIBuyModal
        visible={isBuyModalOpen}
        onClose={() => setIsBuyModalOpen(false)}
        availableBudgetCents={summary?.availableBudgetCents || 0}
        sections={sections}
      />

      <LocationFinderModal
        visible={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        sections={sections}
      />

      <ExportCostSheetModal
        visible={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        summary={summary}
        sections={sections}
      />
    </View>
  );
}

export default MobileCostManager;