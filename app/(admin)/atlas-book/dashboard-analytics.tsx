import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Platform,
} from "react-native";
import { useAtlasBooks } from "./context/AtlasBooksContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Landmark,
  ChevronDown,
  CheckSquare,
  Square,
  AlertCircle,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

interface TransactionRow {
  label: string;
  value: string;
}

interface VendorRow {
  name: string;
  amount: string;
}

interface TaskItem {
  id: string;
  label: string;
  checked: boolean;
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
    primary:          uiTheme.customColors?.primary || "#FFD27A",
    successBg:        isDark ? "rgba(16,185,129,0.12)" : "#ECFDF5",
    successText:      isDark ? "#34D399" : "#10B981",
    dangerBg:         isDark ? "rgba(239,68,68,0.12)" : "#FEF2F2",
    dangerText:       isDark ? "#F87171" : "#EF4444",
    warningBg:        isDark ? "rgba(245,158,11,0.12)" : "#FFFBEB",
    warningText:      isDark ? "#FBBF24" : "#D97706",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      padding: 16,
      paddingBottom: 32,
    },
    kpiGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    kpiCard: {
      backgroundColor: colors.cardBg,
      width: (width - 44) / 2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    },
    kpiHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    kpiTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    kpiValue: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.text,
      marginVertical: 4,
    },
    kpiSubtitle: {
      fontSize: 10,
      color: colors.textMuted,
    },
    trendBadge: {
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: 4,
    },
    trendPos: {
      backgroundColor: colors.successBg,
    },
    trendNeg: {
      backgroundColor: colors.dangerBg,
    },
    trendText: {
      fontSize: 9,
      fontWeight: "700",
    },
    trendTextPos: {
      color: colors.successText,
    },
    trendTextNeg: {
      color: colors.dangerText,
    },
    boxCard: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    boxHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      paddingBottom: 10,
      marginBottom: 12,
    },
    boxHeaderTitle: {
      fontSize: 13,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: 0.5,
    },
    listHeaderTitle: {
      fontSize: 11,
      fontWeight: "900",
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    timeframeBadge: {
      backgroundColor: colors.borderLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    timeframeText: {
      fontSize: 9,
      fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
      color: colors.textSecondary,
      textTransform: "uppercase",
    },
    chartContainer: {
      height: 160,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
      paddingTop: 10,
      paddingHorizontal: 4,
    },
    chartColumn: {
      alignItems: "center",
      flex: 1,
    },
    barTrack: {
      height: "100%",
      width: "100%",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "flex-end",
      position: "relative",
    },
    chartBar: {
      width: 6,
      marginHorizontal: 1,
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
    },
    lineDot: {
      position: "absolute",
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      zIndex: 2,
    },
    chartXLabel: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 6,
    },
    chartLegend: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: 14,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 10,
    },
    legendIndicator: {
      width: 10,
      height: 10,
      borderRadius: 2,
      marginRight: 4,
    },
    legendText: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    leasedBadge: {
      backgroundColor: colors.successBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    leasedBadgeText: {
      fontSize: 10,
      color: colors.successText,
      fontWeight: "700",
    },
    heatmapContainer: {
      marginVertical: 4,
    },
    heatmapRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    heatmapRowName: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      width: 90,
    },
    heatmapCellsGrid: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    heatmapCell: {
      height: 28,
      flex: 1,
      marginHorizontal: 3,
      borderRadius: 6,
    },
    heatmapLegend: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    listContainer: {
      marginTop: 2,
    },
    listItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    lastItem: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    listLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      paddingRight: 8,
    },
    listValue: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },
    alertStack: {
      gap: 8,
    },
    alertItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    alertText: {
      fontSize: 12,
      color: colors.dangerText,
      fontWeight: "500",
    },
    taskItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    taskLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      flex: 1,
      paddingRight: 8,
    },
  });
}

const NativeKpiCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  trend?: { value: string; isPositive: boolean };
  styles: any;
}> = ({ title, value, subtitle, trend, styles }) => (
  <View style={styles.kpiCard}>
    <View style={styles.kpiHeaderRow}>
      <Text style={styles.kpiTitle}>{title}</Text>
      {trend && (
        <View style={[styles.trendBadge, trend.isPositive ? styles.trendPos : styles.trendNeg]}>
          <Text style={[styles.trendText, trend.isPositive ? styles.trendTextPos : styles.trendTextNeg]}>
            {trend.value}
          </Text>
        </View>
      )}
    </View>
    <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.kpiSubtitle} numberOfLines={1}>
      {subtitle}
    </Text>
  </View>
);

const CommandCenter: React.FC = () => {
  const { timeframe, activeEntity } = useAtlasBooks();
  const { uiTheme } = useTheme();
  const isDark = (uiTheme.theme as string) === "dark" || (uiTheme.theme as string) === "metallic-elite";
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [kpiData, setKpiData] = useState({ balance: 0, income: 0, expenses: 0, occupancy: 0 });
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);

  const toggleTask = (id: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, checked: !t.checked } : t))
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plRes, bsRes, unitRes, txRes, billsRes] = await Promise.all([
          apiFetch<any>("/api/atlasbook/reports/pl"),
          apiFetch<any>("/api/atlasbook/reports/balance-sheet"),
          apiFetch<any>("/api/atlasbook/units"),
          apiFetch<any>("/api/atlasbook/transactions"),
          apiFetch<any>("/api/atlasbook/bills")
        ]);

        const balance = bsRes.totalAssets || 0;
        const income = plRes.revenue || 0;
        const expenses = plRes.expenses || 0;

        const units = unitRes.items || [];
        const occupied = units.filter((u: any) => u.status === 'Occupied').length;
        const occupancy = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0;

        setKpiData({ balance, income, expenses, occupancy });

        const txs = (txRes.items || []).slice(0, 5).map((t: any) => ({
          label: t.description || t.type || 'Transaction',
          value: `$${t.amount.toLocaleString()}`
        }));
        setTransactions(txs);

        const billItems = billsRes.items || [];
        const vMap = new Map();
        billItems.forEach((b: any) => {
           const name = b.vendor?.name || 'Unknown';
           vMap.set(name, (vMap.get(name) || 0) + b.amount);
        });
        const topVendors = Array.from(vMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, amount]) => ({
             name, amount: `$${amount.toLocaleString()}`
          }));
        setVendors(topVendors);

        const recentTxs = txRes.items || [];
        const cfData = recentTxs.slice(0, 7).map((t: any) => ({
          name: new Date(t.date || t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          Income: t.type === 'Income' ? t.amount : 0,
          Expenses: t.type === 'Expense' ? t.amount : 0,
          NetCashFlow: (t.type === 'Income' ? t.amount : -t.amount)
        }));
        setCashFlowData(cfData.reverse());
      } catch(e) {
        console.error("Failed to fetch command center data", e);
      }
    };
    fetchData();
  }, []);

  const heatmapRows = [
    { name: "Main HQ", cells: [colors.successText, colors.successText, colors.successText, colors.warningText, colors.successText, colors.successText] },
    { name: "Downtown Annex", cells: [colors.dangerText, colors.warningText, colors.successText, colors.successText, colors.successText, colors.successText] }
  ];

  const maxChartVal = Math.max(...cashFlowData.map(d => Math.max(d.Income, d.Expenses, Math.abs(d.NetCashFlow))), 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        <View style={styles.kpiGrid}>
          <NativeKpiCard
            title="Company Balance"
            value={`$${kpiData.balance.toLocaleString()}`}
            subtitle={`Scope: ${activeEntity.name}`}
            styles={styles}
          />
          <NativeKpiCard
            title="Monthly Income"
            value={`$${kpiData.income.toLocaleString()}`}
            subtitle="Cleared revenue deposits"
            styles={styles}
          />
          <NativeKpiCard
            title="Monthly Expenses"
            value={`$${kpiData.expenses.toLocaleString()}`}
            subtitle="Operating overhead burns"
            styles={styles}
          />
          <NativeKpiCard
            title="Occupancy Rate"
            value={`${kpiData.occupancy}%`}
            trend={{ value: "+2.4%", isPositive: true }}
            subtitle="Lease rollover check"
            styles={styles}
          />
        </View>

        <View style={styles.boxCard}>
          <View style={styles.boxHeader}>
            <Text style={styles.boxHeaderTitle}>Cash Flow Overview</Text>
            <View style={styles.timeframeBadge}>
              <Text style={styles.timeframeText}>{timeframe}</Text>
            </View>
          </View>

          <View style={styles.chartContainer}>
            {cashFlowData.map((data, idx) => (
              <View key={idx} style={styles.chartColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.chartBar, { height: `${(data.Income / maxChartVal) * 80}%`, backgroundColor: colors.successText }]} />
                  <View style={[styles.chartBar, { height: `${(data.Expenses / maxChartVal) * 80}%`, backgroundColor: colors.dangerText }]} />
                  <View style={[styles.lineDot, { bottom: `${((data.NetCashFlow + maxChartVal) / (maxChartVal * 2)) * 80}%` }]} />
                </View>
                <Text style={styles.chartXLabel}>{data.name}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, { backgroundColor: colors.successText }]} /><Text style={styles.legendText}>Income</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, { backgroundColor: colors.dangerText }]} /><Text style={styles.legendText}>Expenses</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, { backgroundColor: colors.primary, borderRadius: 6 }]} /><Text style={styles.legendText}>Net Cash</Text></View>
          </View>
        </View>

        <View style={styles.boxCard}>
          <View style={styles.boxHeader}>
            <Text style={styles.boxHeaderTitle}>Property Performance</Text>
            <View style={styles.leasedBadge}>
              <Text style={styles.leasedBadgeText}>Leased</Text>
            </View>
          </View>

          <View style={styles.heatmapContainer}>
            {heatmapRows.map((row, idx) => (
              <View key={idx} style={styles.heatmapRow}>
                <Text style={styles.heatmapRowName} numberOfLines={1}>{row.name}</Text>
                <View style={styles.heatmapCellsGrid}>
                  {row.cells.map((cellColor, cIdx) => (
                    <View key={cIdx} style={[styles.heatmapCell, { backgroundColor: cellColor }]} />
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.heatmapLegend}>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, { backgroundColor: colors.successText }]} /><Text style={styles.legendText}>90%+</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, { backgroundColor: colors.warningText }]} /><Text style={styles.legendText}>80%+</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendIndicator, { backgroundColor: colors.dangerText }]} /><Text style={styles.legendText}>&lt;75%</Text></View>
          </View>
        </View>

        <View style={styles.boxCard}>
          <View style={styles.boxHeader}>
            <Text style={styles.listHeaderTitle}>Recent Transactions</Text>
            <CheckSquare size={14} color={colors.textSecondary} />
          </View>
          <View style={styles.listContainer}>
            {transactions.map((tx, idx) => (
              <View key={idx} style={[styles.listItem, idx === transactions.length - 1 && styles.lastItem]}>
                <Text style={styles.listLabel}>{tx.label}</Text>
                <Text style={styles.listValue}>{tx.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.boxCard}>
          <View style={styles.boxHeader}>
            <Text style={styles.listHeaderTitle}>Top Vendors</Text>
            <Landmark size={14} color={colors.textSecondary} />
          </View>
          <View style={styles.listContainer}>
            {vendors.map((vendor, idx) => (
              <View key={idx} style={[styles.listItem, idx === vendors.length - 1 && styles.lastItem]}>
                <Text style={styles.listLabel}>{vendor.name}</Text>
                <Text style={styles.listValue}>{vendor.amount}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.boxCard}>
          <View style={styles.boxHeader}>
            <Text style={styles.listHeaderTitle}>Financial Alerts</Text>
            <AlertCircle size={14} color={colors.dangerText} />
          </View>
          <View style={styles.alertStack}>
            <TouchableOpacity style={styles.alertItem} activeOpacity={0.7}>
              <Text style={styles.alertText}>Over Budget Alert</Text>
              <ChevronDown size={14} color={colors.dangerText} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.alertItem} activeOpacity={0.7}>
              <Text style={styles.alertText}>Late Payment Warning</Text>
              <ChevronDown size={14} color={colors.dangerText} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.boxCard}>
          <View style={styles.boxHeader}>
            <Text style={styles.listHeaderTitle}>Task Manager</Text>
            <ChevronDown size={14} color={colors.textMuted} />
          </View>
          <View style={styles.listContainer}>
            {tasks.map((task, idx) => (
              <TouchableOpacity
                key={task.id}
                onPress={() => toggleTask(task.id)}
                style={[styles.taskItem, idx === tasks.length - 1 && styles.lastItem]}
                activeOpacity={0.7}
              >
                <Text style={styles.taskLabel}>{task.label}</Text>
                {task.checked ? (
                  <CheckSquare size={16} color={colors.primary} />
                ) : (
                  <Square size={16} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default CommandCenter;