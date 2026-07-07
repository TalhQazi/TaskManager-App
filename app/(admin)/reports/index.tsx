import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { PieChart, BarChart, LineChart } from "react-native-gifted-charts";
import { listResource } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

type Employee = {
  id: string;
  status: "active" | "inactive" | "on-leave";
};

type Vehicle = {
  id: string;
  status: "active" | "maintenance" | "inactive";
};

type Location = {
  id: string;
  type: "commercial" | "residential" | "industrial";
  status: "active" | "inactive";
  tasksCount: number;
};

type OnboardingEmployee = {
  id: string;
  status: "pending" | "in-progress" | "completed" | "needs-review";
  startDate: string;
};

type NotificationItem = {
  id: string;
  createdAt: string;
};

const pieColors = ["#22c55e", "#f59e0b", "#94a3b8", "#ef4444", "#3b82f6"];

function lastNDaysLabels(n: number) {
  const labels: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(d.toISOString().split("T")[0]);
  }
  return labels;
}

const safeExtractArray = <T,>(response: any): T[] => {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.items)) return response.items;
  if (response && Array.isArray(response.data)) return response.data;
  return [];
};

export default function Reports() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const { uiTheme } = useTheme();
const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme.theme),
    [uiTheme.theme]
  );
  const colors = useMemo(() => ({
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#0F172A" : "#F8FAFC"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#1E293B" : "#FFFFFF"),
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#FFFFFF" : "#0F172A"),
    muted: isDark ? "#94A3B8" : "#64748B",
    border: isDark ? "#334155" : "#E2E8F0",
    primary: uiTheme?.customColors?.primary || "#3B82F6",
    surface: isDark ? "#334155" : "#475569",
    white: "#FFFFFF",
  }), [uiTheme, isDark]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [onboarding, setOnboarding] = useState<OnboardingEmployee[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setApiError(null);
        const [emps, vehs, locs, onb, notifs] = await Promise.all([
          listResource<any>("employees"),
          listResource<any>("vehicles"),
          listResource<any>("locations"),
          listResource<any>("onboarding"),
          listResource<any>("notifications"),
        ]);
        
        if (!mounted) return;

        setEmployees(safeExtractArray<Employee>(emps));
        setVehicles(safeExtractArray<Vehicle>(vehs));
        setLocations(safeExtractArray<Location>(locs));
        setOnboarding(safeExtractArray<OnboardingEmployee>(onb));
        setNotifications(safeExtractArray<NotificationItem>(notifs));
      } catch (e) {
        if (!mounted) return;
        setApiError(e instanceof Error ? e.message : "Failed to load reports");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const safeEmps = Array.isArray(employees) ? employees : [];
    const safeVehs = Array.isArray(vehicles) ? vehicles : [];
    const safeLocs = Array.isArray(locations) ? locations : [];
    const safeOnb = Array.isArray(onboarding) ? onboarding : [];

    const totalEmployees = safeEmps.length;
    const activeEmployees = safeEmps.filter((e) => e.status === "active").length;
    const inactiveEmployees = safeEmps.filter((e) => e.status === "inactive").length;

    const totalVehicles = safeVehs.length;
    const activeVehicles = safeVehs.filter((v) => v.status === "active").length;
    const maintenanceVehicles = safeVehs.filter((v) => v.status === "maintenance").length;

    const totalLocations = safeLocs.length;
    const activeLocations = safeLocs.filter((l) => l.status === "active").length;
    const totalActiveTasksFromLocations = safeLocs.reduce((sum, l) => sum + (l.tasksCount || 0), 0);

    const onboardingInProgress = safeOnb.filter((o) => o.status === "in-progress").length;
    const onboardingNeedsReview = safeOnb.filter((o) => o.status === "needs-review").length;

    return {
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      totalLocations,
      activeLocations,
      totalActiveTasksFromLocations,
      onboardingInProgress,
      onboardingNeedsReview,
    };
  }, [employees, vehicles, locations, onboarding]);

  const vehiclesStatusData = useMemo(() => {
    const safeVehs = Array.isArray(vehicles) ? vehicles : [];
    const map: Record<string, number> = { active: 0, maintenance: 0, inactive: 0 };
    for (const v of safeVehs) {
      if (v.status in map) {
        map[v.status] = (map[v.status] ?? 0) + 1;
      }
    }
    return Object.entries(map).map(([name, value], index) => ({
      value,
      text: `${value}`,
      color: pieColors[index % pieColors.length],
      label: name.charAt(0).toUpperCase() + name.slice(1),
    }));
  }, [vehicles]);

  const locationsTypeData = useMemo(() => {
    const safeLocs = Array.isArray(locations) ? locations : [];
    const map: Record<string, number> = { commercial: 0, residential: 0, industrial: 0 };
    for (const l of safeLocs) {
      if (l.type in map) {
        map[l.type] = (map[l.type] ?? 0) + 1;
      }
    }
    return Object.entries(map).map(([type, count]) => ({
      value: count,
      label: type.slice(0, 4) + ".",
      frontColor: colors.primary,
    }));
  }, [locations, colors.primary]);

  const onboardingStatusData = useMemo(() => {
    const safeOnb = Array.isArray(onboarding) ? onboarding : [];
    const map: Record<string, number> = {
      pending: 0,
      "in-progress": 0,
      "needs-review": 0,
      completed: 0,
    };
    for (const o of safeOnb) {
      if (o.status in map) {
        map[o.status] = (map[o.status] ?? 0) + 1;
      }
    }
    return Object.entries(map).map(([status, count]) => ({
      value: count,
      label: status === "in-progress" ? "In Prog" : status === "needs-review" ? "Review" : status,
      frontColor: "#22c55e",
    }));
  }, [onboarding]);

  const notificationsTrend = useMemo(() => {
    const safeNotifs = Array.isArray(notifications) ? notifications : [];
    const labels = lastNDaysLabels(7);
    const map: Map<string, number> = new Map(labels.map((d): [string, number] => [d, 0]));
    for (const n of safeNotifs) {
      if (map.has(n.createdAt)) {
        map.set(n.createdAt, (map.get(n.createdAt) ?? 0) + 1);
      }
    }
    return labels.map((d) => ({
      value: map.get(d) ?? 0,
      label: d.slice(5),
    }));
  }, [notifications]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Reports</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              Analytics summary based on your data.
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>Backend</Text>
          </View>
        </View>

        {apiError && (
          <View style={styles.errorAlert}>
            <Text style={styles.errorText}>{apiError}</Text>
          </View>
        )}

        <View style={[styles.cardGrid, isLargeScreen && styles.cardGridRow]}>
          
          <View style={[styles.statCard, isLargeScreen && styles.statCardLarge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.muted }]}>Employees</Text>
            <View style={styles.statContainer}>
              <View>
                <Text style={[styles.statMainNumber, { color: colors.text }]}>{metrics.totalEmployees}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Total</Text>
              </View>
              <View style={styles.statRightAlignBlock}>
                <Text style={[styles.statRightMeta, { color: colors.text }]}>Active: {metrics.activeEmployees}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Inactive: {metrics.inactiveEmployees}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statCard, isLargeScreen && styles.statCardLarge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.muted }]}>Locations</Text>
            <View style={styles.statContainer}>
              <View>
                <Text style={[styles.statMainNumber, { color: colors.text }]}>{metrics.totalLocations}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Total</Text>
              </View>
              <View style={styles.statRightAlignBlock}>
                <Text style={[styles.statRightMeta, { color: colors.text }]}>Active: {metrics.activeLocations}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Tasks: {metrics.totalActiveTasksFromLocations}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statCard, isLargeScreen && styles.statCardLarge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.muted }]}>Vehicles</Text>
            <View style={styles.statContainer}>
              <View>
                <Text style={[styles.statMainNumber, { color: colors.text }]}>{metrics.totalVehicles}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Total</Text>
              </View>
              <View style={styles.statRightAlignBlock}>
                <Text style={[styles.statRightMeta, { color: colors.text }]}>Active: {metrics.activeVehicles}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Maint: {metrics.maintenanceVehicles}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statCard, isLargeScreen && styles.statCardLarge, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.cardHeaderTitle, { color: colors.muted }]}>Onboarding</Text>
            <View style={styles.statContainer}>
              <View>
                <Text style={[styles.statMainNumber, { color: colors.text }]}>{Array.isArray(onboarding) ? onboarding.length : 0}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Total records</Text>
              </View>
              <View style={styles.statRightAlignBlock}>
                <Text style={[styles.statRightMeta, { color: colors.text }]}>In Prog: {metrics.onboardingInProgress}</Text>
                <Text style={[styles.statMetaLabel, { color: colors.muted }]}>Review: {metrics.onboardingNeedsReview}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.chartsColumnLayout}>
          
          <View style={[styles.chartWrapperCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.chartBlockTitle, { color: colors.text }]}>Vehicles by Status</Text>
            <View style={styles.pieCenterContainer}>
              <PieChart
                data={vehiclesStatusData}
                donut
                radius={50}
                innerRadius={30}
                showText
                textColor={colors.white}
                textSize={10}
              />
              <View style={styles.pieCustomLegendRow}>
                {vehiclesStatusData.map((item, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.legendText, { color: colors.text }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.chartWrapperCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.chartBlockTitle, { color: colors.text }]}>Locations by Type</Text>
            <View style={styles.chartCanvasAdjustment}>
              <BarChart
                data={locationsTypeData}
                barWidth={width < 360 ? 16 : 24}
                noOfSections={4}
                barBorderRadius={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={colors.border}
                yAxisLabelWidth={25}
                labelSize={10}
                xAxisLabelTextStyle={{ color: colors.muted }}
                yAxisTextStyle={{ color: colors.muted }}
              />
            </View>
          </View>

          <View style={[styles.chartWrapperCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.chartBlockTitle, { color: colors.text }]}>Onboarding Status</Text>
            <View style={styles.chartCanvasAdjustment}>
              <BarChart
                data={onboardingStatusData}
                barWidth={width < 360 ? 12 : 18}
                noOfSections={4}
                barBorderRadius={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={colors.border}
                yAxisLabelWidth={25}
                labelSize={9}
                xAxisLabelTextStyle={{ color: colors.muted }}
                yAxisTextStyle={{ color: colors.muted }}
              />
            </View>
          </View>

          <View style={[styles.chartWrapperCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.chartBlockTitle, { color: colors.text }]}>Notifications (Last 7 Days)</Text>
            <View style={styles.chartCanvasAdjustment}>
              <LineChart
                data={notificationsTrend}
                color="#f59e0b"
                thickness={2.5}
                dataPointsColor="#f59e0b"
                dataPointsRadius={3}
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={colors.border}
                yAxisLabelWidth={25}
                labelSize={9}
                xAxisLabelTextStyle={{ color: colors.muted }}
                yAxisTextStyle={{ color: colors.muted }}
              />
            </View>
          </View>
        </View>

        <View style={[styles.footerNoteCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.footerCardHeading, { color: colors.text }]}>Notes</Text>
          <Text style={[styles.footerDescriptionText, { color: colors.muted }]}>
            These charts are generated from your module data. As you add/edit employees, vehicles, locations,
            onboarding and notifications, the reports will reflect those changes.
          </Text>
          {loading && (
            <View style={styles.loadingSpinnerInlineRow}>
              <ActivityIndicator size="small" color={colors.muted} />
              <Text style={[styles.loadingPulseText, { color: colors.muted }]}>Loading latest data...</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: 16, paddingVertical: 20, gap: 16 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
    headerTitle: { fontSize: 24, fontWeight: "700" },
    headerSubtitle: { fontSize: 13, marginTop: 2 },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: "600" },
    errorAlert: { backgroundColor: "#fef2f2", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#fee2e2" },
    errorText: { fontSize: 13, color: "#ef4444" },
    cardGrid: { flexDirection: "column", gap: 12 },
    cardGridRow: { flexDirection: "row", flexWrap: "wrap" },
    statCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
    statCardLarge: { width: "48.5%" },
    cardHeaderTitle: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
    statContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
    statMainNumber: { fontSize: 26, fontWeight: "700" },
    statMetaLabel: { fontSize: 12 },
    statRightAlignBlock: { alignItems: "flex-end" },
    statRightMeta: { fontSize: 13, fontWeight: "500", marginBottom: 2 },
    chartsColumnLayout: { flexDirection: "column", gap: 16 },
    chartWrapperCard: { borderRadius: 12, borderWidth: 1, padding: 16 },
    chartBlockTitle: { fontSize: 15, fontWeight: "600", marginBottom: 16 },
    chartCanvasAdjustment: { marginLeft: -10, marginTop: 8 },
    pieCenterContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 8 },
    pieCustomLegendRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginTop: 16 },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12 },
    footerNoteCard: { borderRadius: 12, borderWidth: 1, padding: 16, gap: 8 },
    footerCardHeading: { fontSize: 16, fontWeight: "600" },
    footerDescriptionText: { fontSize: 13, lineHeight: 18 },
    loadingSpinnerInlineRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    loadingPulseText: { fontSize: 12 },
  });
}