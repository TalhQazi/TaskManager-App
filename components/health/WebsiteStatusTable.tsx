import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Linking,
  useWindowDimensions,
} from "react-native";
import {
  Globe,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

interface WebsiteItem {
  _id: string;
  siteName: string;
  url: string;
  healthStatus: "LIVE" | "DEGRADED" | "DOWN" | string;
  responseTimeMs?: number;
  sslStatus?: "VALID" | "UNKNOWN" | "EXPIRED" | string;
}

interface WebsitesResponse {
  websites?: WebsiteItem[];
}

export function WebsiteStatusTable() {
  const { uiTheme } = useTheme();
  const isDark = uiTheme?.theme !== "crystal-white";
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#121A2F" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "#64748b",
      itemHover: isDark ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
      linkText: "#60a5fa",
    };
  }, [uiTheme, isDark]);

  const [websites, setWebsites] = useState<WebsiteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchWebsites = useCallback(async () => {
    try {
      const data = await apiFetch<WebsitesResponse>("/api/health/websites");
      setWebsites(data?.websites || []);
    } catch (err) {
      console.error("Failed to fetch websites", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebsites();
    const interval = setInterval(fetchWebsites, 60000);
    return () => clearInterval(interval);
  }, [fetchWebsites]);

  const openUrl = (url: string) => {
    if (!url) return;
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    Linking.openURL(formattedUrl).catch(() => {});
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Globe size={18} color="#c084fc" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Website Status</Text>
        </View>

        <View style={styles.headerRight}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={[styles.updateText, { color: colors.textMuted }]}>Auto-updates 60s</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color="#c084fc" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Loading website status...
            </Text>
          </View>
        ) : websites.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No websites are currently being monitored. Enable monitoring in Digital Assets.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {websites.map((site) => {
              const isLive = site.healthStatus === "LIVE";
              const isDegraded = site.healthStatus === "DEGRADED";
              const isDown = site.healthStatus === "DOWN";
              const isSslValid = site.sslStatus === "VALID";
              const isSslUnknown = site.sslStatus === "UNKNOWN";

              return (
                <View
                  key={site._id}
                  style={[styles.itemCard, { backgroundColor: colors.itemHover, borderColor: colors.border }]}
                >
                  <View style={styles.itemMain}>
                    <View style={styles.statusIconBox}>
                      {isLive ? (
                        <CheckCircle size={20} color="#34d399" />
                      ) : isDegraded ? (
                        <AlertTriangle size={20} color="#fbbf24" />
                      ) : isDown ? (
                        <XCircle size={20} color="#f87171" />
                      ) : (
                        <ActivityIndicator size="small" color={colors.textMuted} />
                      )}
                    </View>

                    <View style={styles.siteDetails}>
                      <Text style={[styles.siteName, { color: colors.text }]}>{site.siteName}</Text>
                      <TouchableOpacity onPress={() => openUrl(site.url)}>
                        <Text style={[styles.siteUrl, { color: colors.linkText }]} numberOfLines={1}>
                          {site.url}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {!isMobile && (
                    <View style={styles.itemMetaRow}>
                      <View style={styles.metaCol}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>RESPONSE</Text>
                        <Text
                          style={[
                            styles.metaValue,
                            {
                              color:
                                (site.responseTimeMs || 0) > 3000
                                  ? "#fbbf24"
                                  : colors.text,
                            },
                          ]}
                        >
                          {site.responseTimeMs ? `${site.responseTimeMs}ms` : "---"}
                        </Text>
                      </View>

                      <View style={styles.metaCol}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>SSL STATUS</Text>
                        <View style={styles.sslGroup}>
                          <Shield
                            size={12}
                            color={isSslValid ? "#34d399" : isSslUnknown ? colors.textMuted : "#f87171"}
                          />
                          <Text
                            style={[
                              styles.sslText,
                              {
                                color: isSslValid
                                  ? "#34d399"
                                  : isSslUnknown
                                  ? colors.textMuted
                                  : "#f87171",
                              },
                            ]}
                          >
                            {isSslValid ? "Secure" : site.sslStatus || "---"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
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
    height: 520,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  updateText: {
    fontSize: 11,
  },
  scrollBody: {
    padding: 12,
    flexGrow: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  list: {
    gap: 8,
  },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  statusIconBox: {
    width: 24,
    alignItems: "center",
  },
  siteDetails: {
    flex: 1,
  },
  siteName: {
    fontSize: 14,
    fontWeight: "600",
  },
  siteUrl: {
    fontSize: 12,
    marginTop: 2,
  },
  itemMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  metaCol: {
    alignItems: "flex-end",
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  sslGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  sslText: {
    fontSize: 12,
    fontWeight: "600",
  },
});