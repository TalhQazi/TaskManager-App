import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { AlertOctagon, CheckCircle2, Clock } from "lucide-react-native";
import { formatDistanceToNow, format } from "date-fns";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface Incident {
  _id: string;
  websiteId?: { siteName?: string };
  serverId?: { name?: string };
  type: string;
  status: "OPEN" | "RESOLVED" | string;
  errorDetails?: string;
  startedAt: string;
  resolvedAt?: string;
}

interface IncidentResponse {
  incidents?: Incident[];
}

export function IncidentHistory() {
  const { uiTheme } = useTheme();
  const isDark = uiTheme?.theme !== "crystal-white";

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#121A2F" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "rgba(255, 255, 255, 0.5)" : "#64748b",
      itemBg: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
      timelineLine: isDark ? "rgba(255, 255, 255, 0.1)" : "#cbd5e1",
      openDot: "#ef4444",
      resolvedDot: "#10b981",
      downBadgeBg: "rgba(239, 68, 68, 0.2)",
      downBadgeText: "#f87171",
      warnBadgeBg: "rgba(245, 158, 11, 0.2)",
      warnBadgeText: "#fbbf24",
    };
  }, [uiTheme, isDark]);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchIncidents = useCallback(async () => {
    try {
      const data = await apiFetch<IncidentResponse>("/api/health/incidents?limit=10");
      setIncidents(data?.incidents || []);
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 60000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <AlertOctagon size={20} color="#f87171" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Recent Incidents</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#60a5fa" />
          </View>
        ) : incidents.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No recent incidents. System is stable.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            <View style={[styles.timelineLine, { backgroundColor: colors.timelineLine }]} />

            {incidents.map((incident) => {
              const siteName =
                incident.websiteId?.siteName || incident.serverId?.name || "Unknown System";
              const isDown = incident.type === "DOWN";
              const isOpen = incident.status === "OPEN";

              return (
                <View key={incident._id} style={styles.timelineItem}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isOpen ? colors.openDot : colors.resolvedDot,
                        borderColor: colors.cardBg,
                      },
                    ]}
                  />

                  <View style={[styles.itemCard, { backgroundColor: colors.itemBg, borderColor: colors.border }]}>
                    <View style={styles.itemHeader}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.itemTitle, { color: colors.text }]}>{siteName}</Text>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: isDown ? colors.downBadgeBg : colors.warnBadgeBg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              { color: isDown ? colors.downBadgeText : colors.warnBadgeText },
                            ]}
                          >
                            {incident.type}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.timeAgoText, { color: colors.textMuted }]}>
                        {formatDistanceToNow(new Date(incident.startedAt), { addSuffix: true })}
                      </Text>
                    </View>

                    <Text style={[styles.errorText, { color: colors.textMuted }]}>
                      {incident.errorDetails || "No details provided"}
                    </Text>

                    <View style={[styles.itemFooter, { borderTopColor: colors.border }]}>
                      <View style={styles.footerInfoRow}>
                        <Clock size={14} color={colors.textMuted} />
                        <Text style={[styles.footerText, { color: colors.textMuted }]}>
                          Started: {format(new Date(incident.startedAt), "MMM d, HH:mm")}
                        </Text>
                      </View>

                      {incident.status === "RESOLVED" && incident.resolvedAt ? (
                        <View style={styles.footerInfoRow}>
                          <CheckCircle2 size={14} color="#34d399" />
                          <Text style={[styles.footerText, { color: "#34d399" }]}>
                            Resolved: {format(new Date(incident.resolvedAt), "MMM d, HH:mm")}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.footerInfoRow}>
                          <View style={styles.ongoingDot} />
                          <Text style={[styles.footerText, { color: "#fbbf24" }]}>Ongoing</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    height: 400,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  scrollBody: {
    padding: 16,
    flexGrow: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
  },
  timelineContainer: {
    position: "relative",
    paddingLeft: 12,
    gap: 16,
  },
  timelineLine: {
    position: "absolute",
    left: 17,
    top: 10,
    bottom: 10,
    width: 1,
  },
  timelineItem: {
    position: "relative",
    paddingLeft: 16,
  },
  statusDot: {
    position: "absolute",
    left: 0,
    top: 14,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    zIndex: 2,
  },
  itemCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  timeAgoText: {
    fontSize: 11,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  itemFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  footerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 11,
  },
  ongoingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fbbf24",
  },
});