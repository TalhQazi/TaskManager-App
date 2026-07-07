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
  Globe,
  Plus,
  RefreshCw,
  X,
} from "lucide-react-native";

const { height } = Dimensions.get("window");

interface ExchangeRateItem {
  _id: string;
  targetCurrency: string;
  rate: number | string;
  date?: string;
}

interface ApiResponse {
  success: boolean;
  items?: ExchangeRateItem[];
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
    successBg:        isDark ? "rgba(16,185,129,0.12)" : "#10b981",
    specialCardBg:    "#0F172A",
    specialCardText:  "#FFFFFF",
    specialCardMuted: "#94A3B8",
    overlayBg:        "rgba(0,0,0,0.5)",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    scrollContainer: { paddingHorizontal: 16, paddingBottom: 32 },
    headerBlock: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, backgroundColor: colors.background },
    headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    titleContainer: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
    headerIcon: { marginRight: 8 },
    headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    iconActionButton: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg, padding: 10, borderRadius: 8, justifyContent: "center", alignItems: "center" },
    disabledOpacity: { opacity: 0.4 },
    primaryActionButton: { flexDirection: "row", backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: "center", gap: 6 },
    primaryActionText: { color: colors.primaryText, fontSize: 13, fontWeight: "600" },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    kpiContainerRow: { paddingHorizontal: 16, marginBottom: 16 },
    kpiCardFrame: { backgroundColor: colors.specialCardBg, borderRadius: 12, padding: 20 },
    kpiCardMetaLabel: { fontSize: 11, fontWeight: "700", color: colors.specialCardMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
    baseCurrencyFlexRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    kpiCardNumericHeading: { fontSize: 28, fontWeight: "900", color: colors.specialCardText },
    primaryBadgeFrame: { backgroundColor: colors.successBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
    primaryBadgeText: { color: colors.primaryText, fontSize: 10, fontWeight: "700" },
    tableCardHeaderStrip: { marginHorizontal: 16, marginBottom: 8, paddingTop: 4 },
    tableHeadingText: { fontSize: 15, fontWeight: "700", color: colors.text },
    centerLoadingState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
    emptyStateContainer: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginHorizontal: 16, padding: 32, alignItems: "center" },
    emptyStateText: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    tableCanvasCard: { backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: "hidden" },
    tableHeaderRowFrame: { flexDirection: "row", alignItems: "center", backgroundColor: colors.borderLight, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    tableHeaderLabelText: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.3 },
    colPair: { flex: 1.8 },
    colRate: { flex: 1.5 },
    colStatus: { flex: 0.8 },
    textAlignRight: { textAlign: "right", alignItems: "flex-end" },
    tableBodyRowFrame: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    pairLabelText: { fontSize: 14, fontWeight: "700", color: colors.text },
    timestampSubtext: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
    rateValueMonoText: { fontSize: 14, fontWeight: "700", color: colors.primary, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
    statusBadgeOutlineFrame: { borderWidth: 1, borderColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.borderLight },
    statusBadgeInnerText: { fontSize: 10, fontWeight: "600", color: colors.textSecondary },
    modalBlurOverlay: { flex: 1, backgroundColor: colors.overlayBg, justifyContent: "flex-end" },
    modalContentCard: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, width: "100%", maxHeight: height * 0.8, padding: 20, paddingBottom: 34 },
    modalCardHeaderTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderLight, paddingBottom: 12 },
    modalCardTitleHeading: { fontSize: 18, fontWeight: "800", color: colors.text },
    closeModalCrossButton: { padding: 4 },
    modalFormBodyContainer: { marginBottom: 16 },
    formElementWrapperFieldBlock: { marginBottom: 14 },
    formElementFieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, marginBottom: 6 },
    formInputFieldText: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, height: 38, paddingHorizontal: 10, fontSize: 13, color: colors.text, backgroundColor: colors.background },
    modalCardActionsFooterRow: { flexDirection: "row", justifyContent: "flex-end", gap: 10, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 14 },
    modalCancelButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBg },
    modalCancelButtonText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    modalSubmitButtonAction: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, backgroundColor: colors.primary },
    modalSubmitButtonText: { fontSize: 12, fontWeight: "600", color: colors.primaryText },
  });
}

export default function MultiCurrency() {
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<ExchangeRateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ targetCurrency: "", rate: "" });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch<ApiResponse>("/api/atlasbook/exchange-rates");
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
        targetCurrency: form.targetCurrency.trim().toUpperCase(),
        rate: parseFloat(form.rate.replace(/\s+/g, "").replace(",", ".")) || 0,
      };

      const res = await apiFetch<{ success: boolean }>("/api/atlasbook/exchange-rates", {
        method: "POST",
        body: JSON.stringify(cleanPayload),
      });

      if (res?.success) {
        setOpen(false);
        setForm({ targetCurrency: "", rate: "" });
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBlock}>
        <View style={styles.headerTopRow}>
          <View style={styles.titleContainer}>
            <Globe size={24} color={colors.primary} style={styles.headerIcon} />
            <Text style={styles.headerTitle} numberOfLines={2}>Multi-Currency {"\n"}Module</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.iconActionButton} onPress={load} disabled={loading}>
              <RefreshCw size={16} color={colors.textSecondary} style={loading ? styles.disabledOpacity : null} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => setOpen(true)}>
              <Plus size={16} color={colors.primaryText} />
              <Text style={styles.primaryActionText}>Add Exchange Rate</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Manage foreign exchange rates, currency translations, and exchange gains/losses.
        </Text>
      </View>

      <View style={styles.kpiContainerRow}>
        <View style={styles.kpiCardFrame}>
          <Text style={styles.kpiCardMetaLabel}>Base Currency</Text>
          <View style={styles.baseCurrencyFlexRow}>
            <Text style={styles.kpiCardNumericHeading}>USD</Text>
            <View style={styles.primaryBadgeFrame}>
              <Text style={styles.primaryBadgeText}>Primary</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tableCardHeaderStrip}>
        <Text style={styles.tableHeadingText}>Live Exchange Rates</Text>
      </View>

      {loading ? (
        <View style={styles.centerLoadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>No exchange rates defined.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.tableCanvasCard}>
            <View style={styles.tableHeaderRowFrame}>
              <Text style={[styles.tableHeaderLabelText, styles.colPair]}>Pair</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colRate, styles.textAlignRight]}>Current Rate (1 USD = )</Text>
              <Text style={[styles.tableHeaderLabelText, styles.colStatus, styles.textAlignRight]}>Status</Text>
            </View>

            {items.map((item) => (
              <View key={item._id || Math.random().toString()} style={styles.tableBodyRowFrame}>
                <View style={styles.colPair}>
                  <Text style={styles.pairLabelText}>USD / {item.targetCurrency}</Text>
                  <Text style={styles.timestampSubtext}>
                    {item.date ? new Date(item.date).toLocaleString() : ""}
                  </Text>
                </View>

                <View style={[styles.colRate, styles.textAlignRight]}>
                  <Text style={styles.rateValueMonoText}>{item.rate}</Text>
                </View>

                <View style={[styles.colStatus, styles.textAlignRight]}>
                  <View style={styles.statusBadgeOutlineFrame}>
                    <Text style={styles.statusBadgeInnerText}>Active</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      <Modal animationType="slide" transparent={true} visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBlurOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalCardHeaderTopRow}>
              <Text style={styles.modalCardTitleHeading}>Update Exchange Rate</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeModalCrossButton}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFormBodyContainer}>
              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Target Currency Code (e.g. EUR, GBP)</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="EUR"
                  placeholderTextColor={colors.placeholderText}
                  autoCapitalize="characters"
                  maxLength={3}
                  value={form.targetCurrency}
                  onChangeText={(text) => setForm({ ...form, targetCurrency: text.toUpperCase() })}
                />
              </View>

              <View style={styles.formElementWrapperFieldBlock}>
                <Text style={styles.formElementFieldLabel}>Rate (Relative to 1 USD)</Text>
                <TextInput
                  style={styles.formInputFieldText}
                  placeholder="0.92"
                  placeholderTextColor={colors.placeholderText}
                  keyboardType="numeric"
                  value={form.rate}
                  onChangeText={(text) => setForm({ ...form, rate: text })}
                />
              </View>
            </View>

            <View style={styles.modalCardActionsFooterRow}>
              <TouchableOpacity style={styles.modalCancelButtonAction} onPress={() => setOpen(false)}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitButtonAction} onPress={handleCreate}>
                <Text style={styles.modalSubmitButtonText}>Update Rate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}