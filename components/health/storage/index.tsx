import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { formatDistanceToNow } from "date-fns";
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ServerCrash,
  RefreshCw,
  Clock,
  Layers,
  HardDrive,
  Thermometer,
  Gauge,
  X,
  Activity,
  BatteryCharging,
  CpuIcon,
  Info,
  Terminal,
  HardDriveDownload,
  Cpu,
  AlertCircle,
} from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

// ==========================================
// TYPES & DATA INTERFACES
// ==========================================

export type DriveStatus =
  | "healthy"
  | "active"
  | "rebuilding"
  | "warning"
  | "failed"
  | "empty";

export type SummaryStatus = "healthy" | "warning" | "failed" | "rebuilding" | "unavailable";

export interface Drive {
  bay: number;
  installed: boolean;
  status: DriveStatus;
  model: string | null;
  serial: string | null;
  capacityGB: number | null;
  rpm?: number | null;
  transport?: string | null;
  temperatureC: number | null;
  powerOnHours: number | null;
  smartStatus: "PASSED" | "FAILED" | "FAILING" | "UNKNOWN" | null;
  raidState: "ONLINE" | "OFFLINE" | "REBUILDING" | "FAILED" | null;
  readMBps: number | null;
  writeMBps: number | null;
  utilizationPercent: number | null;
  healthScore: number | null;
  healthReasons: string[];
  rebuildPercent: number | null;
  pendingSectors?: number;
  reallocatedSectors?: number;
}

export interface RaidControllerInfo {
  name: string;
  tool?: string;
  status: string;
  level: string;
  bbuStatus?: string;
  cacheStatus?: string;
  firmwareVersion?: string | null;
  hardwareDetected?: boolean;
  hardwareNotice?: string | null;
}

export interface StorageSummary {
  status: SummaryStatus;
  totalBays: number;
  installedDrives: number;
  healthyDrives: number;
  trueHealthyDrives: number;
  warnings: number;
  failed: number;
  rebuilding: number;
  raidStatus: string;
  raidLevel: string;
  diskUsagePercent: number;
  source: "live" | "unavailable";
  mode?: "physical" | "filesystem";
  message?: string;
  raidController?: RaidControllerInfo | null;
}

export interface StorageDiagnostics {
  platform?: string;
  hostname?: string;
  lsblk?: string;
  smartctl?: string;
  iostat?: string;
  storcli?: string;
  ranAsRoot?: boolean;
  notes?: string[];
}

export interface StorageHealthPayload {
  serverId: string;
  model: string;
  timestamp: string;
  summary: StorageSummary;
  diagnostics?: StorageDiagnostics;
  drives: Drive[];
}

export interface StatusTokens {
  label: string;
  dot: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const DRIVE_STATUS_TOKENS: Record<DriveStatus, StatusTokens> = {
  healthy: {
    label: "Healthy",
    dot: "#34d399",
    textColor: "#6ee7b7",
    bgColor: "rgba(52, 211, 153, 0.12)",
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  active: {
    label: "Active I/O",
    dot: "#60a5fa",
    textColor: "#93c5fd",
    bgColor: "rgba(96, 165, 250, 0.12)",
    borderColor: "rgba(96, 165, 250, 0.3)",
  },
  rebuilding: {
    label: "Rebuilding",
    dot: "#facc15",
    textColor: "#fde047",
    bgColor: "rgba(250, 204, 21, 0.12)",
    borderColor: "rgba(250, 204, 21, 0.3)",
  },
  warning: {
    label: "Warning",
    dot: "#fb923c",
    textColor: "#fdba74",
    bgColor: "rgba(251, 146, 60, 0.12)",
    borderColor: "rgba(251, 146, 60, 0.3)",
  },
  failed: {
    label: "Failed",
    dot: "#f87171",
    textColor: "#fca5a5",
    bgColor: "rgba(248, 113, 113, 0.12)",
    borderColor: "rgba(248, 113, 113, 0.3)",
  },
  empty: {
    label: "Empty",
    dot: "#64748b",
    textColor: "#94a3b8",
    bgColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
};

export const SUMMARY_STATUS_TOKENS: Record<SummaryStatus, StatusTokens> = {
  healthy: DRIVE_STATUS_TOKENS.healthy,
  warning: DRIVE_STATUS_TOKENS.warning,
  failed: DRIVE_STATUS_TOKENS.failed,
  rebuilding: DRIVE_STATUS_TOKENS.rebuilding,
  unavailable: {
    label: "Unavailable",
    dot: "#64748b",
    textColor: "#cbd5e1",
    bgColor: "rgba(100, 116, 139, 0.12)",
    borderColor: "rgba(100, 116, 139, 0.3)",
  },
};

// ==========================================
// CUSTOM HOOK FOR TELEMETRY POLLING
// ==========================================

export function useStorageHealth(serverId: string = "host") {
  const [data, setData] = useState<StorageHealthPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const payload = await apiFetch<StorageHealthPayload>(
        `/api/health/servers/${encodeURIComponent(serverId)}/storage-health`
      );
      if (!mountedRef.current) return;
      setData(payload);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load storage health");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 12000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refresh: fetchData };
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function DriveActivityBars({
  readMBps,
  writeMBps,
  ceiling = 300,
}: {
  readMBps: number;
  writeMBps: number;
  ceiling?: number;
}) {
  const readPct = Math.max(8, Math.min(100, (readMBps / ceiling) * 100));
  const writePct = Math.max(8, Math.min(100, (writeMBps / ceiling) * 100));

  return (
    <View style={activityStyles.container}>
      <View style={[activityStyles.bar, { height: `${readPct}%`, backgroundColor: "rgba(96, 165, 250, 0.8)" }]} />
      <View style={[activityStyles.bar, { height: `${writePct}%`, backgroundColor: "rgba(251, 191, 36, 0.8)" }]} />
    </View>
  );
}

const activityStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
    height: 16,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});

function StatRow({
  icon,
  label,
  value,
  valueColor,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueColor?: string;
  colors: any;
}) {
  return (
    <View style={[drawerStyles.statRow, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
      <View style={drawerStyles.statLabelGroup}>
        {icon}
        <Text style={[drawerStyles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[drawerStyles.statValue, { color: valueColor || colors.text }]}>{value}</Text>
    </View>
  );
}

function DriveDetailDrawer({
  drive,
  onClose,
  colors,
}: {
  drive: Drive | null;
  onClose: () => void;
  colors: any;
}) {
  if (!drive) return null;

  const tokens = DRIVE_STATUS_TOKENS[drive.status];
  const score = drive.healthScore ?? 0;
  const scoreColor = score >= 85 ? "#6ee7b7" : score >= 60 ? "#fde047" : "#fca5a5";

  const formatPoh = (hours: number | null): string => {
    if (hours == null) return "—";
    const days = Math.floor(hours / 24);
    const years = (hours / 8760).toFixed(1);
    return `${hours.toLocaleString()} h · ${days}d (${years}y)`;
  };

  return (
    <Modal visible={!!drive} transparent animationType="slide">
      <TouchableOpacity style={drawerStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[drawerStyles.panel, { backgroundColor: colors.drawerBg, borderColor: colors.border }]} activeOpacity={1}>
          <View style={[drawerStyles.header, { borderBottomColor: colors.border }]}>
            <View style={drawerStyles.headerLeft}>
              <View style={[drawerStyles.headerIconBox, { backgroundColor: tokens.bgColor, borderColor: tokens.borderColor }]}>
                <HardDrive size={20} color={tokens.dot} />
              </View>
              <View>
                <Text style={[drawerStyles.bayTitle, { color: colors.text }]}>
                  Bay {String(drive.bay).padStart(2, "0")}
                </Text>
                <Text style={[drawerStyles.modelSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {drive.model || "Standard Drive"}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={drawerStyles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={drawerStyles.scrollBody} showsVerticalScrollIndicator={false}>
            <View style={[drawerStyles.cardBox, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
              <View>
                <Text style={[drawerStyles.sectionTag, { color: colors.textMuted }]}>STATUS</Text>
                <View style={drawerStyles.statusGroup}>
                  <View style={[drawerStyles.pulseDot, { backgroundColor: tokens.dot }]} />
                  <Text style={[drawerStyles.statusLabel, { color: tokens.textColor }]}>{tokens.label}</Text>
                </View>
              </View>
              <View style={drawerStyles.alignRight}>
                <Text style={[drawerStyles.sectionTag, { color: colors.textMuted }]}>HEALTH SCORE</Text>
                <Text style={[drawerStyles.scoreValue, { color: scoreColor }]}>{score}</Text>
              </View>
            </View>

            {drive.status === "rebuilding" && drive.rebuildPercent != null && (
              <View style={[drawerStyles.cardBox, drawerStyles.rebuildBox]}>
                <View style={drawerStyles.rebuildHeader}>
                  <View style={drawerStyles.rowGap}>
                    <Gauge size={16} color="#fde047" />
                    <Text style={drawerStyles.rebuildTitle}>Rebuild in progress</Text>
                  </View>
                  <Text style={drawerStyles.rebuildPercent}>{drive.rebuildPercent}%</Text>
                </View>
                <View style={drawerStyles.rebuildTrack}>
                  <View style={[drawerStyles.rebuildFill, { width: `${drive.rebuildPercent}%` }]} />
                </View>
              </View>
            )}

            {drive.healthReasons && drive.healthReasons.length > 0 && (
              <View style={[drawerStyles.cardBox, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
                <View style={drawerStyles.diagHeader}>
                  <AlertTriangle size={14} color={colors.textMuted} />
                  <Text style={[drawerStyles.diagTitle, { color: colors.textMuted }]}>DIAGNOSTICS</Text>
                </View>
                {drive.healthReasons.map((r, i) => (
                  <View key={i} style={drawerStyles.reasonRow}>
                    <View style={[drawerStyles.bulletDot, { backgroundColor: colors.textMuted }]} />
                    <Text style={[drawerStyles.reasonText, { color: colors.text }]}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={drawerStyles.sectionGroup}>
              <Text style={[drawerStyles.groupHeading, { color: colors.textMuted }]}>DEVICE</Text>
              <StatRow icon={<Layers size={16} color={colors.textMuted} />} label="Serial" value={drive.serial ?? "—"} colors={colors} />
              <StatRow icon={<HardDrive size={16} color={colors.textMuted} />} label="Capacity" value={drive.capacityGB ? `${drive.capacityGB} GB` : "—"} colors={colors} />
              <StatRow
                icon={<Thermometer size={16} color={colors.textMuted} />}
                label="Temperature"
                value={drive.temperatureC != null ? `${drive.temperatureC}°C` : "—"}
                valueColor={drive.temperatureC != null && drive.temperatureC >= 55 ? "#fca5a5" : undefined}
                colors={colors}
              />
              <StatRow icon={<Clock size={16} color={colors.textMuted} />} label="Power-On Hours" value={formatPoh(drive.powerOnHours)} colors={colors} />
            </View>

            <View style={drawerStyles.sectionGroup}>
              <Text style={[drawerStyles.groupHeading, { color: colors.textMuted }]}>HEALTH & RAID</Text>
              <StatRow
                icon={<ShieldCheck size={16} color={colors.textMuted} />}
                label="SMART Status"
                value={drive.smartStatus ?? "—"}
                valueColor={drive.smartStatus === "PASSED" ? "#6ee7b7" : drive.smartStatus === "FAILED" ? "#fca5a5" : undefined}
                colors={colors}
              />
              <StatRow
                icon={<Layers size={16} color={colors.textMuted} />}
                label="RAID Member"
                value={drive.raidState ?? "—"}
                valueColor={drive.raidState === "ONLINE" ? "#6ee7b7" : drive.raidState ? "#fca5a5" : undefined}
                colors={colors}
              />
              <StatRow icon={<Gauge size={16} color={colors.textMuted} />} label="Utilization" value={drive.utilizationPercent != null ? `${drive.utilizationPercent}%` : "—"} colors={colors} />
            </View>

            <View style={drawerStyles.sectionGroup}>
              <Text style={[drawerStyles.groupHeading, { color: colors.textMuted }]}>THROUGHPUT</Text>
              <StatRow icon={<Activity size={16} color="#60a5fa" />} label="Read Speed" value={drive.readMBps != null ? `${drive.readMBps} MB/s` : "—"} valueColor="#93c5fd" colors={colors} />
              <StatRow icon={<Activity size={16} color="#fbbf24" />} label="Write Speed" value={drive.writeMBps != null ? `${drive.writeMBps} MB/s` : "—"} valueColor="#fde047" colors={colors} />
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const drawerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  panel: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: "85%",
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bayTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modelSubtitle: {
    fontSize: 12,
    maxWidth: 200,
  },
  closeBtn: {
    padding: 6,
  },
  scrollBody: {
    padding: 16,
    gap: 16,
  },
  cardBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTag: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  alignRight: {
    alignItems: "flex-end",
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  rebuildBox: {
    backgroundColor: "rgba(250, 204, 21, 0.08)",
    borderColor: "rgba(250, 204, 21, 0.25)",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 8,
  },
  rebuildHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowGap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rebuildTitle: {
    color: "#fde047",
    fontSize: 13,
    fontWeight: "600",
  },
  rebuildPercent: {
    color: "#fde047",
    fontSize: 13,
    fontWeight: "700",
  },
  rebuildTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  rebuildFill: {
    height: "100%",
    backgroundColor: "#facc15",
    borderRadius: 3,
  },
  diagHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  diagTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  reasonText: {
    fontSize: 12,
  },
  sectionGroup: {
    gap: 6,
  },
  groupHeading: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
    paddingLeft: 2,
  },
  statRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
  },
});

function DriveBayGrid({
  drives,
  onSelect,
  selectedBay,
  colors,
}: {
  drives: Drive[];
  onSelect: (drive: Drive) => void;
  selectedBay?: number | null;
  colors: any;
}) {
  const { width } = useWindowDimensions();
  const columns = width >= 768 ? 8 : 4;

  return (
    <View style={[gridStyles.container, { backgroundColor: colors.gridBg, borderColor: colors.border }]}>
      <View style={gridStyles.chassisHeader}>
        <Text style={[gridStyles.chassisTitle, { color: colors.textMuted }]}>
          Front Backplane · 16 Bays
        </Text>
        <Text style={[gridStyles.chassisSubtitle, { color: colors.textMuted }]}>2.5" SAS / SATA</Text>
      </View>

      <View style={gridStyles.gridRow}>
        {drives.map((drive) => {
          const tokens = DRIVE_STATUS_TOKENS[drive.status];
          const empty = !drive.installed;
          const isSelected = selectedBay === drive.bay;

          return (
            <TouchableOpacity
              key={drive.bay}
              disabled={empty}
              onPress={() => !empty && onSelect(drive)}
              activeOpacity={0.7}
              style={[
                gridStyles.bayTile,
                { width: `${100 / columns - 1.5}%` as any },
                empty
                  ? [gridStyles.emptyBay, { borderColor: colors.border }]
                  : [
                      gridStyles.filledBay,
                      { backgroundColor: colors.statBg, borderColor: isSelected ? "#f59e0b" : colors.border },
                    ],
              ]}
            >
              <View style={gridStyles.tileTop}>
                <Text style={[gridStyles.bayNum, { color: empty ? colors.textMuted : colors.text }]}>
                  {String(drive.bay).padStart(2, "0")}
                </Text>
                <View style={[gridStyles.ledDot, { backgroundColor: tokens.dot }]} />
              </View>

              {empty ? (
                <Text style={[gridStyles.emptyText, { color: colors.textMuted }]}>Empty</Text>
              ) : (
                <View style={gridStyles.tileBottom}>
                  <View style={gridStyles.metaColumn}>
                    {drive.temperatureC != null ? (
                      <View style={gridStyles.iconTextRow}>
                        <Thermometer size={10} color={colors.textMuted} />
                        <Text style={[gridStyles.metaText, { color: colors.textMuted }]}>{drive.temperatureC}°C</Text>
                      </View>
                    ) : drive.utilizationPercent != null ? (
                      <View style={gridStyles.iconTextRow}>
                        <Gauge size={10} color={colors.textMuted} />
                        <Text style={[gridStyles.metaText, { color: colors.textMuted }]}>{drive.utilizationPercent}%</Text>
                      </View>
                    ) : null}

                    {drive.status === "rebuilding" && drive.rebuildPercent != null ? (
                      <Text style={gridStyles.rebuildBadge}>{drive.rebuildPercent}%</Text>
                    ) : (
                      <Text style={[gridStyles.capacityText, { color: colors.textMuted }]}>
                        {drive.capacityGB} GB
                      </Text>
                    )}
                  </View>

                  <DriveActivityBars readMBps={drive.readMBps ?? 0} writeMBps={drive.writeMBps ?? 0} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const gridStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  chassisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  chassisTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  chassisSubtitle: {
    fontSize: 10,
  },
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  bayTile: {
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    padding: 6,
    justifyContent: "space-between",
  },
  emptyBay: {
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.01)",
  },
  filledBay: {},
  tileTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bayNum: {
    fontSize: 10,
    fontWeight: "700",
  },
  ledDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyText: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tileBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  metaColumn: {
    gap: 2,
  },
  iconTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  metaText: {
    fontSize: 9,
  },
  capacityText: {
    fontSize: 9,
    fontWeight: "600",
  },
  rebuildBadge: {
    fontSize: 9,
    fontWeight: "700",
    color: "#fde047",
  },
});

function RaidControllerCard({
  controller,
  raidLevel,
  raidStatus,
  colors,
}: {
  controller?: RaidControllerInfo | null;
  raidLevel?: string;
  raidStatus?: string;
  colors: any;
}) {
  if (!controller && (!raidLevel || raidLevel === "No RAID controller")) {
    return (
      <View style={[raidStyles.simpleCard, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
        <View style={raidStyles.rowGap}>
          <Cpu size={16} color={colors.textMuted} />
          <Text style={[raidStyles.simpleText, { color: colors.textMuted }]}>
            RAID Controller: <Text style={{ color: colors.text, fontWeight: "700" }}>None Detected / Standalone Disks</Text>
          </Text>
        </View>
      </View>
    );
  }

  const name = controller?.name || "Hardware RAID Controller";
  const bbu = controller?.bbuStatus || "Optimal";
  const cache = controller?.cacheStatus || "Optimal";
  const fw = controller?.firmwareVersion;
  const isHealthy = (raidStatus || controller?.status) === "Healthy";
  const notice = controller?.hardwareNotice;

  return (
    <View style={[raidStyles.card, { backgroundColor: colors.raidCardBg, borderColor: colors.raidCardBorder }]}>
      <View style={[raidStyles.header, { borderBottomColor: colors.border }]}>
        <View style={raidStyles.headerLeft}>
          <View style={raidStyles.iconBox}>
            <Cpu size={18} color="#f59e0b" />
          </View>
          <View>
            <View style={raidStyles.rowGap}>
              <Text style={[raidStyles.title, { color: colors.text }]}>{name}</Text>
              {fw && <Text style={[raidStyles.fwText, { color: colors.textMuted }]}>FW: {fw}</Text>}
            </View>
            <View style={raidStyles.subtitleRow}>
              <HardDrive size={12} color="#f59e0b" />
              <Text style={[raidStyles.subtitleText, { color: colors.textMuted }]}>
                Configured Level: <Text style={raidStyles.levelText}>{raidLevel || controller?.level || "RAID"}</Text>
              </Text>
            </View>
          </View>
        </View>

        <View style={[raidStyles.statusBadge, { backgroundColor: isHealthy ? "rgba(52, 211, 153, 0.12)" : "rgba(251, 146, 60, 0.12)" }]}>
          <ShieldCheck size={14} color={isHealthy ? "#34d399" : "#fb923c"} />
          <Text style={[raidStyles.statusText, { color: isHealthy ? "#34d399" : "#fb923c" }]}>
            {raidStatus || controller?.status || "Active"}
          </Text>
        </View>
      </View>

      <View style={raidStyles.metricsGrid}>
        <View style={[raidStyles.metricTile, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
          <BatteryCharging size={16} color="#34d399" />
          <View>
            <Text style={[raidStyles.metricLabel, { color: colors.textMuted }]}>BBU Status</Text>
            <Text style={[raidStyles.metricValue, { color: colors.text }]}>{bbu}</Text>
          </View>
        </View>

        <View style={[raidStyles.metricTile, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
          <CpuIcon size={16} color="#60a5fa" />
          <View>
            <Text style={[raidStyles.metricLabel, { color: colors.textMuted }]}>Controller Cache</Text>
            <Text style={[raidStyles.metricValue, { color: colors.text }]}>{cache}</Text>
          </View>
        </View>

        <View style={[raidStyles.metricTile, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
          <Info size={16} color="#c084fc" />
          <View>
            <Text style={[raidStyles.metricLabel, { color: colors.textMuted }]}>Management Tool</Text>
            <Text style={[raidStyles.metricValue, { color: colors.text }]} numberOfLines={1}>
              {controller?.tool || "Native Driver"}
            </Text>
          </View>
        </View>
      </View>

      {notice && (
        <View style={raidStyles.noticeBox}>
          <AlertCircle size={16} color="#fbbf24" style={{ marginTop: 2 }} />
          <Text style={raidStyles.noticeText}>
            <Text style={{ fontWeight: "700" }}>Hardware Alert:</Text> {notice}
          </Text>
        </View>
      )}
    </View>
  );
}

const raidStyles = StyleSheet.create({
  simpleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  simpleText: {
    fontSize: 12,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  rowGap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  fwText: {
    fontSize: 10,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 11,
  },
  levelText: {
    color: "#f59e0b",
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metricTile: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 1,
  },
  noticeBox: {
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    padding: 10,
    flexDirection: "row",
    gap: 8,
  },
  noticeText: {
    color: "#fef3c7",
    fontSize: 11,
    flex: 1,
  },
});

function SummaryPill({
  icon,
  value,
  label,
  tone = "default",
  colors,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone?: "default" | "good" | "warn" | "bad";
  colors: any;
}) {
  const valueColor =
    tone === "good"
      ? "#6ee7b7"
      : tone === "warn"
      ? "#fdba74"
      : tone === "bad"
      ? "#fca5a5"
      : colors.text;

  return (
    <View style={[pillStyles.pill, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
      {icon}
      <View style={pillStyles.meta}>
        <Text style={[pillStyles.value, { color: valueColor }]}>{value}</Text>
        <Text style={[pillStyles.label, { color: colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    flex: 1,
    minWidth: "48%",
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  meta: {
    flex: 1,
  },
  value: {
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    fontSize: 10,
    marginTop: 1,
  },
});

function LiveTimestamp({ date, colors }: { date: Date | null; colors: any }) {
  const [, force] = useState(0);

  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (!date) return <Text style={{ color: colors.textMuted }}>—</Text>;
  return (
    <Text style={{ color: colors.textMuted }}>
      {formatDistanceToNow(date, { addSuffix: true })}
    </Text>
  );
}

function UnavailableState({
  message,
  diagnostics,
  onRetry,
  colors,
}: {
  message?: string;
  diagnostics?: StorageDiagnostics;
  onRetry: () => void;
  colors: any;
}) {
  const checks: Array<{ label: string; value?: string; ok: boolean }> = [
    { label: "OS", value: diagnostics?.platform, ok: diagnostics?.platform === "linux" },
    { label: "lsblk", value: diagnostics?.lsblk, ok: diagnostics?.lsblk === "found" },
    { label: "smartctl", value: diagnostics?.smartctl, ok: diagnostics?.smartctl === "found" },
    { label: "iostat", value: diagnostics?.iostat, ok: diagnostics?.iostat === "found" },
    { label: "storcli / perccli", value: diagnostics?.storcli, ok: (diagnostics?.storcli || "").startsWith("found") },
    { label: "running as root", value: diagnostics?.ranAsRoot ? "yes" : "no", ok: !!diagnostics?.ranAsRoot },
  ];

  return (
    <View style={[unavailStyles.container, { backgroundColor: colors.statBg, borderColor: colors.border }]}>
      <View style={unavailStyles.iconBox}>
        <HardDriveDownload size={28} color={colors.textMuted} />
      </View>
      <Text style={[unavailStyles.title, { color: colors.text }]}>No physical drive telemetry</Text>
      <Text style={[unavailStyles.subtitle, { color: colors.textMuted }]}>
        {message || "Real drive & RAID data could not be collected on this host."}
      </Text>

      <View style={unavailStyles.checksList}>
        {checks.map((c) => (
          <View key={c.label} style={[unavailStyles.checkRow, { borderColor: colors.border }]}>
            <Text style={[unavailStyles.checkLabel, { color: colors.textMuted }]}>{c.label}</Text>
            <View style={unavailStyles.checkValueGroup}>
              <View style={[unavailStyles.dot, { backgroundColor: c.ok ? "#34d399" : "#fb923c" }]} />
              <Text style={{ color: c.ok ? "#6ee7b7" : "#fdba74", fontSize: 11, fontWeight: "600" }}>
                {c.value || "—"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {diagnostics?.notes && diagnostics.notes.length > 0 && (
        <View style={unavailStyles.diagBox}>
          <View style={unavailStyles.diagHeader}>
            <Terminal size={12} color={colors.textMuted} />
            <Text style={[unavailStyles.diagTitle, { color: colors.textMuted }]}>Diagnostics</Text>
          </View>
          {diagnostics.notes.map((n, i) => (
            <View key={i} style={unavailStyles.noteRow}>
              <View style={[unavailStyles.dot, { backgroundColor: colors.textMuted }]} />
              <Text style={[unavailStyles.noteText, { color: colors.text }]}>{n}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={unavailStyles.retryBtn} onPress={onRetry}>
        <Text style={unavailStyles.retryBtnText}>Re-check</Text>
      </TouchableOpacity>
    </View>
  );
}

const unavailStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 300,
  },
  checksList: {
    width: "100%",
    maxWidth: 320,
    marginTop: 16,
    gap: 6,
  },
  checkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  checkLabel: {
    fontSize: 11,
  },
  checkValueGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  diagBox: {
    width: "100%",
    maxWidth: 320,
    marginTop: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 10,
    gap: 4,
  },
  diagHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  diagTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  noteText: {
    fontSize: 11,
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
});

// ==========================================
// MAIN COMPONENT: StorageHealthCard
// ==========================================

export function StorageHealthCard({ serverId = "host" }: { serverId?: string }) {
  const { uiTheme } = useTheme();
  const isDark = uiTheme?.theme !== "crystal-white";

  const colors = useMemo(() => {
    return {
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#121A2F" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "rgba(255, 255, 255, 0.45)" : "#64748b",
      gridBg: isDark ? "rgba(0,0,0,0.2)" : "#f8fafc",
      statBg: isDark ? "rgba(255, 255, 255, 0.02)" : "#f1f5f9",
      drawerBg: isDark ? "#0B1120" : "#ffffff",
      raidCardBg: isDark ? "rgba(245, 158, 11, 0.04)" : "#fffbe1",
      raidCardBorder: isDark ? "rgba(245, 158, 11, 0.2)" : "#fef08a",
    };
  }, [uiTheme, isDark]);

  const { data, loading, error, lastUpdated, refresh } = useStorageHealth(serverId);
  const [selected, setSelected] = useState<Drive | null>(null);

  useEffect(() => {
    if (!selected || !data) return;
    const fresh = data.drives.find((d) => d.bay === selected.bay);
    if (fresh) setSelected(fresh);
  }, [data, selected]);

  const summary = data?.summary;
  const statusTokens = summary ? SUMMARY_STATUS_TOKENS[summary.status] : null;

  return (
    <View style={[mainStyles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      {/* Top Accent Line */}
      <View style={mainStyles.topAccentLine} />

      {/* Header */}
      <View style={[mainStyles.header, { borderBottomColor: colors.border }]}>
        <View style={mainStyles.headerLeft}>
          <View style={mainStyles.iconBadge}>
            <Database size={20} color="#f59e0b" />
          </View>
          <View>
            <Text style={[mainStyles.title, { color: colors.text }]}>Storage Health</Text>
            <View style={mainStyles.subtitleRow}>
              <Text style={[mainStyles.subtitle, { color: colors.textMuted }]}>
                {data?.model || "Physical drive & RAID monitoring"}
              </Text>
              {summary?.source === "live" && (
                <View style={mainStyles.liveBadge}>
                  <View style={mainStyles.liveDot} />
                  <Text style={mainStyles.liveText}>live</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={mainStyles.headerRight}>
          {statusTokens && (
            <View style={[mainStyles.statusBadge, { backgroundColor: statusTokens.bgColor, borderColor: statusTokens.borderColor }]}>
              <View style={[mainStyles.statusDot, { backgroundColor: statusTokens.dot }]} />
              <Text style={[mainStyles.statusBadgeText, { color: statusTokens.textColor }]}>
                {statusTokens.label}
              </Text>
            </View>
          )}

          <TouchableOpacity style={[mainStyles.refreshBtn, { borderColor: colors.border }]} onPress={refresh}>
            <RefreshCw size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Content */}
      <View style={mainStyles.body}>
        {error && !data ? (
          <View style={mainStyles.errorBox}>
            <ServerCrash size={32} color="#f87171" />
            <Text style={[mainStyles.errorTitle, { color: colors.text }]}>Storage telemetry unavailable</Text>
            <Text style={[mainStyles.errorMessage, { color: colors.textMuted }]}>{error}</Text>
            <TouchableOpacity style={mainStyles.retryBtn} onPress={refresh}>
              <Text style={mainStyles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : loading && !data ? (
          <View style={mainStyles.loadingBox}>
            <ActivityIndicator size="small" color="#f59e0b" />
            <Text style={[mainStyles.loadingText, { color: colors.textMuted }]}>
              Loading drive telemetry...
            </Text>
          </View>
        ) : summary?.source === "unavailable" ? (
          <UnavailableState
            message={summary.message}
            diagnostics={data?.diagnostics}
            onRetry={refresh}
            colors={colors}
          />
        ) : summary && data ? (
          (() => {
            const fsMode = summary.mode === "filesystem";
            const noun = fsMode ? "Volumes" : "Drives";

            return (
              <View style={mainStyles.dataContainer}>
                {/* Summary Pills Grid */}
                <View style={mainStyles.pillsGrid}>
                  <SummaryPill
                    icon={<HardDrive size={18} color={colors.textMuted} />}
                    value={`${summary.trueHealthyDrives} / ${summary.installedDrives}`}
                    label={`${noun} Healthy`}
                    tone={summary.failed > 0 ? "bad" : summary.warnings > 0 ? "warn" : "good"}
                    colors={colors}
                  />
                  <SummaryPill
                    icon={<ShieldCheck size={18} color={colors.textMuted} />}
                    value={summary.raidStatus}
                    label={summary.raidLevel}
                    tone={summary.raidStatus === "Healthy" ? "good" : summary.raidStatus === "No RAID" ? "default" : "warn"}
                    colors={colors}
                  />
                  <SummaryPill
                    icon={<AlertTriangle size={18} color={colors.textMuted} />}
                    value={String(summary.warnings)}
                    label={summary.warnings === 1 ? "Warning" : "Warnings"}
                    tone={summary.warnings > 0 ? "warn" : "default"}
                    colors={colors}
                  />
                  <SummaryPill
                    icon={<Layers size={18} color={colors.textMuted} />}
                    value={fsMode ? String(summary.installedDrives) : `${summary.installedDrives} / ${summary.totalBays}`}
                    label={fsMode ? "Volumes" : "Bays Populated"}
                    colors={colors}
                  />
                </View>

                {/* Filesystem Mode Notice */}
                {fsMode && (
                  <View style={mainStyles.fsNoticeBox}>
                    <Info size={14} color="#f59e0b" style={{ marginTop: 2 }} />
                    <Text style={mainStyles.fsNoticeText}>
                      Showing real filesystem volumes for this host. Install smartmontools / perccli for per-drive SMART.
                    </Text>
                  </View>
                )}

                {/* RAID Controller Status */}
                <RaidControllerCard
                  controller={summary.raidController}
                  raidLevel={summary.raidLevel}
                  raidStatus={summary.raidStatus}
                  colors={colors}
                />

                {/* Drive Bay Grid */}
                <DriveBayGrid
                  drives={data.drives}
                  onSelect={setSelected}
                  selectedBay={selected?.bay}
                  colors={colors}
                />

                {/* Footer */}
                <View style={[mainStyles.footer, { borderTopColor: colors.border }]}>
                  <View style={mainStyles.footerMetaGroup}>
                    <View style={mainStyles.rowGap}>
                      <ShieldCheck size={14} color="#34d399" />
                      <Text style={[mainStyles.footerMetaText, { color: colors.textMuted }]}>
                        RAID: <Text style={{ color: colors.text, fontWeight: "600" }}>{summary.raidStatus}</Text>
                      </Text>
                    </View>
                    <View style={mainStyles.rowGap}>
                      <Database size={14} color="#60a5fa" />
                      <Text style={[mainStyles.footerMetaText, { color: colors.textMuted }]}>
                        Disk Usage: <Text style={{ color: colors.text, fontWeight: "600" }}>{summary.diskUsagePercent}%</Text>
                      </Text>
                    </View>
                  </View>

                  <View style={mainStyles.rowGap}>
                    <Clock size={14} color={colors.textMuted} />
                    <Text style={[mainStyles.footerMetaText, { color: colors.textMuted }]}>Updated </Text>
                    <LiveTimestamp date={lastUpdated} colors={colors} />
                  </View>
                </View>
              </View>
            );
          })()
        ) : null}
      </View>

      {/* Drive Details Drawer */}
      <DriveDetailDrawer drive={selected} onClose={() => setSelected(null)} colors={colors} />
    </View>
  );
}

const mainStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  topAccentLine: {
    height: 1,
    backgroundColor: "rgba(245, 158, 11, 0.4)",
    width: "100%",
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#34d399",
  },
  liveText: {
    color: "#6ee7b7",
    fontSize: 10,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  body: {
    padding: 16,
  },
  errorBox: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  errorMessage: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  dataContainer: {
    gap: 16,
  },
  pillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fsNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    padding: 10,
    borderRadius: 8,
  },
  fsNoticeText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  footerMetaGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rowGap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerMetaText: {
    fontSize: 11,
  },
});