import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Server, Activity, Cpu, HardDrive, ChevronDown } from "lucide-react-native";
import { format } from "date-fns";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { isDarkTheme } from "@/constants/design/presets";

interface ServerItem {
  _id: string;
  name?: string;
}

interface ServerMetric {
  recordedAt: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  diskUsagePercent: number;
}

interface MetricGraphPoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}

function MiniLineGraph({
  data,
  dataKey,
  strokeColor,
  height = 70,
}: {
  data: MetricGraphPoint[];
  dataKey: "cpu" | "memory" | "disk";
  strokeColor: string;
  height?: number;
}) {
  const [containerWidth, setContainerWidth] = useState(280);

  const pathD = useMemo(() => {
    if (!data || data.length === 0) return "";
    const padding = 4;
    const availableWidth = Math.max(10, containerWidth - padding * 2);
    const availableHeight = Math.max(10, height - padding * 2);

    const points = data.map((d, index) => {
      const val = Math.min(100, Math.max(0, d[dataKey] || 0));
      const x = padding + (index / Math.max(1, data.length - 1)) * availableWidth;
      const y = padding + availableHeight - (val / 100) * availableHeight;
      return { x, y };
    });

    return points.reduce((acc, point, idx) => {
      return idx === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
    }, "");
  }, [data, dataKey, containerWidth, height]);

  const lastValue = data.length > 0 ? data[data.length - 1][dataKey] : 0;

  return (
    <View
      style={[styles.graphWrapper, { height }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <View style={styles.graphTopLegend}>
        <Text style={[styles.graphLegendText, { color: strokeColor }]}>{lastValue}% current</Text>
      </View>
      <Svg width={containerWidth} height={height}>
        <Path d={pathD} stroke={strokeColor} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

export function ServerGraphs() {
  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);
  const { width } = useWindowDimensions();

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#121A2F" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "#64748b",
      selectorBg: isDark ? "rgba(255, 255, 255, 0.05)" : "#f1f5f9",
      modalBg: isDark ? "#1e293b" : "#ffffff",
    };
  }, [uiTheme, isDark]);

  const [servers, setServers] = useState<ServerItem[]>([]);
  const [metrics, setMetrics] = useState<MetricGraphPoint[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pickerOpen, setPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const data = await apiFetch<{ servers?: ServerItem[] }>("/api/health/servers");
        if (data.servers && data.servers.length > 0) {
          setServers(data.servers);
          setSelectedServer(data.servers[0]._id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch servers", err);
        setLoading(false);
      }
    };
    fetchServers();
  }, []);

  const fetchMetrics = useCallback(async () => {
    if (!selectedServer) return;
    try {
      const data = await apiFetch<{ metrics?: ServerMetric[] }>(
        `/api/health/servers/${selectedServer}/metrics?hours=12`
      );
      const formatted = (data.metrics || []).map((m) => ({
        time: format(new Date(m.recordedAt), "HH:mm"),
        cpu: m.cpuUsagePercent,
        memory: m.memoryUsagePercent,
        disk: m.diskUsagePercent,
      }));
      setMetrics(formatted);
    } catch (err) {
      console.error("Failed to fetch server metrics", err);
    } finally {
      setLoading(false);
    }
  }, [selectedServer]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const activeServerName = useMemo(() => {
    const s = servers.find((item) => item._id === selectedServer);
    return s?.name || selectedServer || "Select Server";
  }, [servers, selectedServer]);

  if (loading) {
    return (
      <View style={[styles.card, styles.centerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color="#60a5fa" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading server metrics...</Text>
      </View>
    );
  }

  if (servers.length === 0) {
    return (
      <View style={[styles.card, styles.centerCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Server size={32} color={colors.textMuted} style={{ marginBottom: 10 }} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Servers Monitored</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Deploy the server health agent script to your machines to start collecting metrics.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Server size={18} color="#60a5fa" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Server Resources</Text>
        </View>

        <TouchableOpacity
          style={[styles.pickerTrigger, { backgroundColor: colors.selectorBg, borderColor: colors.border }]}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.pickerTriggerText, { color: colors.text }]} numberOfLines={1}>
            {activeServerName}
          </Text>
          <ChevronDown size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {metrics.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Waiting for first metric payload...
            </Text>
          </View>
        ) : (
          <View style={styles.chartsContainer}>
            <View style={styles.chartBlock}>
              <View style={styles.chartHeader}>
                <Cpu size={14} color="#60a5fa" />
                <Text style={[styles.chartTitle, { color: "#60a5fa" }]}>CPU Usage (%)</Text>
              </View>
              <MiniLineGraph data={metrics} dataKey="cpu" strokeColor="#60a5fa" />
            </View>

            <View style={styles.chartBlock}>
              <View style={styles.chartHeader}>
                <Activity size={14} color="#fbbf24" />
                <Text style={[styles.chartTitle, { color: "#fbbf24" }]}>Memory Usage (%)</Text>
              </View>
              <MiniLineGraph data={metrics} dataKey="memory" strokeColor="#fbbf24" />
            </View>

            <View style={styles.chartBlock}>
              <View style={styles.chartHeader}>
                <HardDrive size={14} color="#fb7185" />
                <Text style={[styles.chartTitle, { color: "#fb7185" }]}>Disk Usage (%)</Text>
              </View>
              <MiniLineGraph data={metrics} dataKey="disk" strokeColor="#fb7185" />
            </View>
          </View>
        )}
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={[styles.modalCard, { backgroundColor: colors.modalBg, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Server</Text>
            <FlatList
              data={servers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    setSelectedServer(item._id);
                    setPickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      { color: item._id === selectedServer ? "#60a5fa" : colors.text },
                    ]}
                  >
                    {item.name || item._id}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  centerCard: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  pickerTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 160,
  },
  pickerTriggerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  body: {
    flex: 1,
    padding: 16,
  },
  centerBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chartsContainer: {
    flex: 1,
    gap: 16,
  },
  chartBlock: {
    flex: 1,
    justifyContent: "center",
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  graphWrapper: {
    width: "100%",
    position: "relative",
  },
  graphTopLegend: {
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  graphLegendText: {
    fontSize: 10,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    maxHeight: 300,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: "600",
  },
});