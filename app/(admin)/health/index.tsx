import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Activity } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

import { ServerGraphs } from "@/components/health/ServerGraphs";
import { SystemResourcePies } from "@/components/health/SystemResourcePies";
import { WebsiteStatusTable } from "@/components/health/WebsiteStatusTable";
import { IncidentHistory } from "@/components/health/IncidentHistory";
import { StorageHealthCard } from "@/components/health/storage";

interface HealthOverview {
  servers?: {
    live: number;
    total: number;
  };
  websites?: {
    live: number;
    total: number;
  };
  openIncidents?: number;
}

function buildColors(uiTheme: any) {
  const isDark = uiTheme?.theme !== "crystal-white";
  return {
    background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#09090b" : "#f8fafc"),
    cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#141517" : "#ffffff"),
    text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#f8fafc" : "#0f172a"),
    textSecondary: isDark ? "#a1a1aa" : "#64748b",
    border: isDark ? "#27272a" : "#e2e8f0",
    primary: uiTheme?.customColors?.primary || "#3b82f6",
    iconBg: isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)",
    iconBorder: isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(59, 130, 246, 0.2)",
    incidentAlert: "#f87171",
    incidentNormal: "#34d399",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>, isTablet: boolean, isDesktop: boolean) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: isDesktop ? 32 : isTablet ? 24 : 16,
      paddingTop: 16,
      paddingBottom: 40,
      maxWidth: 1280,
      width: "100%",
      alignSelf: "center",
      gap: 24,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.iconBg,
      borderWidth: 1,
      borderColor: colors.iconBorder,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: isDesktop ? 26 : 22,
      fontWeight: "700",
      color: colors.text,
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statsGrid: {
      flexDirection: isTablet ? "row" : "column",
      gap: 16,
      width: "100%",
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 20,
    },
    statLabel: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: 8,
    },
    statValueRow: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 6,
    },
    statPrimaryText: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },
    statSecondaryText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    mainLayoutGrid: {
      flexDirection: isDesktop ? "row" : "column",
      gap: 24,
      width: "100%",
    },
    leftColumn: {
      flex: 1,
      gap: 24,
    },
    rightColumn: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
  });
}

export default function SystemHealth() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;

  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors, isTablet, isDesktop), [colors, isTablet, isDesktop]);

  const [overview, setOverview] = useState<HealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await apiFetch<HealthOverview>("/api/health/overview");
      setOverview(data);
    } catch (err) {
      console.error("Failed to fetch health overview", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 60000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOverview();
  }, [fetchOverview]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const openIncidentsCount = overview?.openIncidents || 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.iconBadge}>
            <Activity size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>System Health Center</Text>
            <Text style={styles.headerSubtitle}>Monitor servers, websites, and incidents in real-time</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Servers</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statPrimaryText}>{overview?.servers?.live || 0}</Text>
              <Text style={styles.statSecondaryText}>/ {overview?.servers?.total || 0} Live</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Websites</Text>
            <View style={styles.statValueRow}>
              <Text style={styles.statPrimaryText}>{overview?.websites?.live || 0}</Text>
              <Text style={styles.statSecondaryText}>/ {overview?.websites?.total || 0} Live</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Open Incidents</Text>
            <View style={styles.statValueRow}>
              <Text
                style={[
                  styles.statPrimaryText,
                  { color: openIncidentsCount > 0 ? colors.incidentAlert : colors.incidentNormal },
                ]}
              >
                {openIncidentsCount}
              </Text>
            </View>
          </View>
        </View>

        <SystemResourcePies />

        <StorageHealthCard />

        <View style={styles.mainLayoutGrid}>
          <View style={styles.leftColumn}>
            <ServerGraphs />
            <IncidentHistory />
          </View>
          <View style={styles.rightColumn}>
            <WebsiteStatusTable />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}