import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useQuery } from "@tanstack/react-query";
import {
  PURCHASE_STATUS_META,
  WARNING_LABELS,
  formatMoney,
  getTaskCostItems,
} from "@/services/costManager";
import { AlertTriangle, DollarSign, MapPin } from "lucide-react-native";

const FALLBACK_META = { label: "Unknown", className: "", color: "#9ca3af", bg: "rgba(156, 163, 175, 0.15)" };

interface TaskExpensesPanelProps {
  taskId: string;
}

export default function TaskExpensesPanel({ taskId }: TaskExpensesPanelProps) {
  const itemsQuery = useQuery({
    queryKey: ["task-cost-items", taskId],
    queryFn: () => getTaskCostItems(taskId),
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });

  const items = Array.isArray(itemsQuery.data?.items) ? itemsQuery.data.items : [];

  // Guard: bail out early on missing taskId, loading states, errors, or empty arrays
  if (!taskId || itemsQuery.isLoading || itemsQuery.isError || items.length === 0) {
    return null;
  }

  const estimated = items.reduce((s, i) => s + (Number(i.estimatedTotalCents) || 0), 0);
  const paid = items.reduce((s, i) => s + (Number(i.paidCents) || 0), 0);
  const warningCount = items.reduce((s, i) => s + (i.warnings?.length || 0), 0);

  // Mobile Alternative for HTML Tooltip alerts
  const showWarningsAlert = (itemWarnings: string[]) => {
    const messages = itemWarnings
      .map((w) => WARNING_LABELS[w as keyof typeof WARNING_LABELS] || w)
      .join("\n");
    Alert.alert("Attention Required", messages);
  };

  const showLocationAlert = (locationString: string) => {
    Alert.alert("Storage Infrastructure Position", locationString);
  };

  return (
    <View style={styles.panelContainer}>
      {/* Header Info Block */}
      <View style={styles.headerRow}>
        <View style={styles.headerLabelLeft}>
          <DollarSign size={14} color="#1f6feb" />
          <Text style={styles.headerTitleText}>Expenses ({items.length})</Text>
          {warningCount > 0 && (
            <View style={styles.warningIndicatorCountBadge}>
              <AlertTriangle size={11} color="#fbbf24" />
              <Text style={styles.warningIndicatorCountText}>{warningCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerRollupMetaText}>
          Paid <Text style={styles.paidHighlightAmountText}>{formatMoney(paid)}</Text>
          {" / "}
          <Text style={styles.estimatedTotalAmountText}>{formatMoney(estimated)}</Text>
        </Text>
      </View>

      {/* Expenses Linear Map Rows List */}
      <View style={styles.itemsListContainerStack}>
        {items.map((item) => {
          // Fallback map check to retrieve dynamic custom palette matrices safely
          const metaConfig = PURCHASE_STATUS_META[item.purchaseStatus] || FALLBACK_META;
          
          const location = [item.storage?.locationName, item.storage?.shelf, item.storage?.bin]
            .filter(Boolean)
            .join(" / ");

          return (
            <View key={item.id} style={styles.itemCardListItemRow}>
              <View style={styles.itemDetailsLeftFlexBlock}>
                <Text style={styles.itemNameTextString} numberOfLines={1}>
                  {String(item.itemName || "")}
                </Text>
                
                {/* Warning Interactivity Node */}
                {Array.isArray(item.warnings) && item.warnings.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => showWarningsAlert(item.warnings)} 
                    style={styles.inlineIconTouchNode}
                  >
                    <AlertTriangle size={12} color="#fbbf24" />
                  </TouchableOpacity>
                )}

                {/* Storage Position Node */}
                {!!location && (
                  <TouchableOpacity 
                    onPress={() => showLocationAlert(location)}
                    style={styles.inlineIconTouchNode}
                  >
                    <MapPin size={12} color="#4ade80" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Status Badge Custom UI Pill Wrapper and Currency Amount metrics */}
              <View style={styles.itemMetaRightFlexBlock}>
                <View style={[
                  styles.statusBadgePillFrame, 
                  { backgroundColor: metaConfig.bg || "rgba(255, 255, 255, 0.05)" }
                ]}>
                  <Text style={[
                    styles.statusBadgePillTextString, 
                    { color: metaConfig.color || "#c9d1d9" }
                  ]}>
                    {metaConfig.label}
                  </Text>
                </View>
                <Text style={styles.itemEstimatedTotalCentsString}>
                  {formatMoney(Number(item.estimatedTotalCents) || 0)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Ledger Rolling Context Subtitle Info Frame */}
      <Text style={styles.footerCaptionNoticeText}>
        Managed in the project&apos;s Cost Manager — these expenses roll into project totals automatically.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panelContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "rgba(22, 27, 34, 0.4)",
    padding: 12,
    gap: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLabelLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitleText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
  },
  warningIndicatorCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 2,
  },
  warningIndicatorCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fbbf24",
  },
  headerRollupMetaText: {
    fontSize: 11,
    color: "#8b949e",
  },
  paidHighlightAmountText: {
    fontWeight: "bold",
    color: "#238636",
  },
  estimatedTotalAmountText: {
    fontWeight: "bold",
    color: "#c9d1d9",
  },
  itemsListContainerStack: {
    gap: 6,
  },
  itemCardListItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemDetailsLeftFlexBlock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  itemNameTextString: {
    fontSize: 12,
    fontWeight: "500",
    color: "#c9d1d9",
    flexShrink: 1,
  },
  inlineIconTouchNode: {
    paddingHorizontal: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  itemMetaRightFlexBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  statusBadgePillFrame: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statusBadgePillTextString: {
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  itemEstimatedTotalCentsString: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "right",
  },
  footerCaptionNoticeText: {
    fontSize: 10,
    color: "#8b949e",
    lineHeight: 14,
    marginTop: 2,
  },
});