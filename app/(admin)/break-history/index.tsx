import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Modal,
  Alert,
  SafeAreaView,
} from "react-native";
import { 
  Coffee, 
  Clock, 
  Search, 
  ShieldAlert, 
  FileText, 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  Utensils,
  RefreshCw,
  X,
  ChevronDown
} from "lucide-react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { apiFetch } from "@/lib/admin/apiClient";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";

const fileSystemReference = FileSystem as any;
const documentDirectoryPath = fileSystemReference.documentDirectory || "";
const utf8EncodingType = fileSystemReference.EncodingType?.UTF8 || "utf8";

interface BreakSession {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "LUNCH" | "BREAK";
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  isLate: boolean;
  exceededMinutes: number;
}

interface WeeklyStat {
  employeeId: string;
  employeeName: string;
  totalLunchMinutes: number;
  totalBreakMinutes: number;
  lunchSessionsCount: number;
  breakSessionsCount: number;
  lateReturnsCount: number;
  totalExceededMinutes: number;
}

interface LiveStatus {
  _id: string;
  name: string;
  current_status: "AVAILABLE" | "LUNCH" | "BREAK" | "OFFLINE";
  lunch_start_time: string | null;
  lunch_expected_end: string | null;
  break_start_time: string | null;
}

const { width } = Dimensions.get("window");

export default function BreakTracking() {
  const { uiTheme } = useTheme();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [isBackgroundRefetching, setIsBackgroundRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "LUNCH" | "BREAK" | "LATE">("ALL");
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [sessions, setSessions] = useState<BreakSession[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStat[]>([]);
  const [liveStatuses, setLiveStatuses] = useState<LiveStatus[]>([]);
  
  const [, setTick] = useState(0);

  // Dynamic Theme Styling Matrix Builder
  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsBackgroundRefetching(true);
      }
      setError(null);

      const historyUrl = `/api/user/status-history?startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z`;
      const historyRes = await apiFetch<any>(historyUrl);
      const liveRes = await apiFetch<any>("/api/team/statuses");

      setSessions(historyRes?.sessions || []);
      setWeeklyStats(historyRes?.weeklyStats || []);
      setLiveStatuses(liveRes?.items || []);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load tracking data");
    } finally {
      setLoading(false);
      setIsBackgroundRefetching(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [startDate, endDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data: any) => {
      const statusLabel = data.current_status === "LUNCH" ? "Lunch" 
                        : data.current_status === "BREAK" ? "Break" 
                        : "Available";

      if (data.current_status === "LUNCH" || data.current_status === "BREAK") {
        Alert.alert(
          "Status Update",
          `${data.name} went on ${statusLabel} at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        );
      } else if (data.current_status === "AVAILABLE") {
        Alert.alert("Status Update", `${data.name} returned and is now Available`);
      }

      setLiveStatuses((prev) => {
        const index = prev.findIndex((item) => item._id === data.userId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            current_status: data.current_status,
            lunch_start_time: data.lunch_start_time,
            lunch_expected_end: data.lunch_expected_end,
            break_start_time: data.break_start_time
          };
          return updated;
        } else {
          return [...prev, {
            _id: data.userId,
            name: data.name,
            current_status: data.current_status,
            lunch_start_time: data.lunch_start_time,
            lunch_expected_end: data.lunch_expected_end,
            break_start_time: data.break_start_time
          }];
        }
      });

      fetchData(false);
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket]);

  const formatDuration = (totalMinutes: number) => {
    const m = Math.max(0, Math.floor(totalMinutes));
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0) return `${h}h ${min}m`;
    return `${min}m`;
  };

  const getInitials = (name: string) => {
    return String(name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  };

  const getLiveDurationSeconds = (startTimeStr: string | null) => {
    if (!startTimeStr) return 0;
    const start = new Date(startTimeStr).getTime();
    const diff = Date.now() - start;
    return Math.max(0, Math.floor(diff / 1000));
  };

  const formatStopwatch = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const padding = (num: number) => String(num).padStart(2, "0");
    if (h > 0) return `${h}:${padding(m)}:${padding(s)}`;
    return `${m}:${padding(s)}`;
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter((sSession) => {
      const matchQuery = sSession.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchQuery) return false;

      if (typeFilter === "LUNCH") return sSession.type === "LUNCH";
      if (typeFilter === "BREAK") return sSession.type === "BREAK";
      if (typeFilter === "LATE") return sSession.isLate;
      return true;
    });
  }, [sessions, searchQuery, typeFilter]);

  const filteredStats = useMemo(() => {
    return weeklyStats.filter((sSession) => 
      sSession.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [weeklyStats, searchQuery]);

  const activeLunches = useMemo(() => liveStatuses.filter((emp) => emp.current_status === "LUNCH"), [liveStatuses]);
  const activeBreaks = useMemo(() => liveStatuses.filter((emp) => emp.current_status === "BREAK"), [liveStatuses]);

  const todayCompletedCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions.filter((sSession) => sSession.endTime && sSession.endTime.startsWith(today)).length;
  }, [sessions]);

  const todayLateCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions.filter((sSession) => sSession.isLate && sSession.startTime.startsWith(today)).length;
  }, [sessions]);

  const exportToCSV = async () => {
    try {
      let csvContent = "EMPLOYEE BREAK & LUNCH WEEKLY REPORT\n";
      csvContent += `Period: ${startDate} to ${endDate}\n\n`;
      csvContent += "Employee Name,Total Lunch Time (mins),Total Break Time (mins),Lunch Sessions,Break Sessions,Late Returns,Total Overtime Minutes\n";
      
      weeklyStats.forEach((stat) => {
        csvContent += `"${stat.employeeName}",${stat.totalLunchMinutes},${stat.totalBreakMinutes},${stat.lunchSessionsCount},${stat.breakSessionsCount},${stat.lateReturnsCount},${stat.totalExceededMinutes}\n`;
      });
      
      csvContent += "\n\nDETAILED BREAK LOGS HISTORY\n";
      csvContent += "Employee Name,Type,Start Time,End Time,Duration (mins),Status,Overstay Time (mins)\n";
      
      sessions.forEach((sSession) => {
        const start = new Date(sSession.startTime).toLocaleString();
        const end = sSession.endTime ? new Date(sSession.endTime).toLocaleString() : "Active";
        const status = sSession.isLate ? "LATE" : "ON-TIME";
        csvContent += `"${sSession.employeeName}",${sSession.type},"${start}","${end}",${sSession.durationMinutes},${status},${sSession.exceededMinutes}\n`;
      });

      if (!documentDirectoryPath) {
        Alert.alert("Error", "Storage runtime configuration path unresolved.");
        return;
      }

      const path = `${documentDirectoryPath}Employee_Break_History_${startDate}_to_${endDate}.csv`;
      await FileSystem.writeAsStringAsync(path, csvContent, { encoding: utf8EncodingType });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path);
      } else {
        Alert.alert("Error", "Sharing options are not available on this device configuration.");
      }
    } catch (e) {
      Alert.alert("Export Error", "Failed to generate compliance CSV layout file.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centerDeck}>
        <ActivityIndicator size="large" color={uiTheme.customColors.primary} />
        <Text style={styles.networkFallbackText}>Loading analytical break layouts...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.rootContainer}>
      
      <View style={styles.headerDeck}>
        <Text style={styles.screenHeading}>Lunch & Break History</Text>
        <Text style={styles.screenCaption}>Track daily and weekly accumulated break periods, monitor late returns, and export compliance reports.</Text>
        
        <View style={styles.filterInlineRow}>
          <View style={styles.dateControlChip}>
            <Text style={styles.chipMetaText}>From:</Text>
            <TextInput 
              style={styles.dateInput} 
              value={startDate} 
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(148,163,184,0.4)"
            />
            <Text style={styles.chipMetaText}>To:</Text>
            <TextInput 
              style={styles.dateInput} 
              value={endDate} 
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="rgba(148,163,184,0.4)"
            />
          </View>

          <TouchableOpacity style={styles.circleBtn} onPress={() => fetchData(true)}>
            <RefreshCw size={14} color={uiTheme.panelColors.dashboardTextColor} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportGradientBtn} onPress={exportToCSV}>
            <Download size={14} color={uiTheme.theme.includes("crystal") ? "#ffffff" : "#09090b"} style={{ marginRight: 4 }} />
            <Text style={styles.exportText}>Export Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.alertPanelError}>
          <ShieldAlert size={18} color="#ef4444" style={{ marginRight: 8 }} />
          <Text style={styles.errorTextLabel}>{error}</Text>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollWrapper}
        refreshControl={
          <RefreshControl refreshing={isBackgroundRefetching} onRefresh={() => fetchData(false)} tintColor={uiTheme.customColors.primary} />
        }
      >
        <View style={styles.kpiGridContainer}>
          <View style={styles.kpiSquare}>
            <View style={[styles.kpiIconBox, { backgroundColor: "rgba(249,115,22,0.1)" }]}>
              <Utensils size={18} color="#fb923c" />
            </View>
            <Text style={styles.kpiTitle}>On Lunch Now</Text>
            <View style={styles.kpiBadgeAlignment}>
              <Text style={styles.kpiMetric}>{activeLunches.length}</Text>
              {activeLunches.length > 0 && <View style={[styles.pingCircle, { backgroundColor: "#f97316" }]} />}
            </View>
          </View>

          <View style={styles.kpiSquare}>
            <View style={[styles.kpiIconBox, { backgroundColor: "rgba(168,85,247,0.1)" }]}>
              <Coffee size={18} color="#c084fc" />
            </View>
            <Text style={styles.kpiTitle}>On Break Now</Text>
            <View style={styles.kpiBadgeAlignment}>
              <Text style={styles.kpiMetric}>{activeBreaks.length}</Text>
              {activeBreaks.length > 0 && <View style={[styles.pingCircle, { backgroundColor: "#a855f7" }]} />}
            </View>
          </View>

          <View style={styles.kpiSquare}>
            <View style={[styles.kpiIconBox, { backgroundColor: "rgba(34,197,94,0.1)" }]}>
              <CheckCircle size={18} color="#4ade80" />
            </View>
            <Text style={styles.kpiTitle}>Completed Today</Text>
            <Text style={styles.kpiMetric}>{todayCompletedCount}</Text>
          </View>

          <View style={styles.kpiSquare}>
            <View style={[styles.kpiIconBox, todayLateCount > 0 ? { backgroundColor: "rgba(239,68,68,0.2)" } : { backgroundColor: "rgba(148,163,184,0.06)" }]}>
              <AlertTriangle size={18} color={todayLateCount > 0 ? "#f87171" : "rgba(148,163,184,0.5)"} />
            </View>
            <Text style={styles.kpiTitle}>Late Returns Today</Text>
            <Text style={[styles.kpiMetric, todayLateCount > 0 && { color: "#f87171" }]}>{todayLateCount}</Text>
          </View>
        </View>

        {(activeLunches.length > 0 || activeBreaks.length > 0) && (
          <View style={styles.blockCardSurface}>
            <View style={styles.blockCardHeaderRow}>
              <View style={styles.pingCircleStatic} />
              <Text style={styles.blockTitleText}>Live Active Break Stopwatches</Text>
            </View>
            <View style={styles.paddedInnerArea}>
              <View style={styles.flexGridList}>
                {[...activeLunches, ...activeBreaks].map((emp) => {
                  const isLunch = emp.current_status === "LUNCH";
                  const startTime = isLunch ? emp.lunch_start_time : emp.break_start_time;
                  const elapsedSeconds = getLiveDurationSeconds(startTime);

                  return (
                    <View key={emp._id} style={styles.stopwatchRowPlate}>
                      <View style={styles.leftMetaInline}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarInitials}>{getInitials(emp.name)}</Text>
                        </View>
                        <View style={{ marginLeft: 10, maxWidth: width * 0.4 }}>
                          <Text style={styles.empPlateName} numberOfLines={1}>{emp.name}</Text>
                          <View style={[styles.badgeBase, isLunch ? styles.badgeLunch : styles.badgeBreak]}>
                            <Text style={[styles.badgeText, isLunch ? { color: "#fb923c" } : { color: "#c084fc" }]}>
                              {isLunch ? "Lunch" : "Break"}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.stopwatchBoxContainer}>
                        <Clock size={12} color={isLunch ? "#fb923c" : "#c084fc"} style={{ marginRight: 4 }} />
                        <Text style={styles.stopwatchTickerFont}>{formatStopwatch(elapsedSeconds)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <View style={styles.blockCardSurface}>
          <View style={styles.blockHeaderAdjustColumn}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FileText size={16} color={uiTheme.customColors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.blockTitleText}>Break Logs History ({filteredSessions.length})</Text>
            </View>
            
            <View style={styles.searchFilterControlDeck}>
              <View style={styles.searchFieldInputFrame}>
                <Search size={14} color="rgba(148,163,184,0.5)" style={styles.searchIconAbsolute} />
                <TextInput 
                  style={styles.searchTextInputElement}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search employee..."
                  placeholderTextColor="rgba(148,163,184,0.4)"
                />
              </View>

              <TouchableOpacity style={styles.pickerSelectorAnchor} onPress={() => setShowTypePicker(true)}>
                <Text style={styles.pickerSelectorValueText}>{typeFilter}</Text>
                <ChevronDown size={14} color={uiTheme.panelColors.dashboardTextColor} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tableMatrixFrame}>
              <View style={styles.tableHeadRow}>
                <Text style={[styles.thText, { width: 140 }]}>Employee</Text>
                <Text style={[styles.thText, { width: 90 }]}>Session Type</Text>
                <Text style={[styles.thText, { width: 80 }]}>Start Time</Text>
                <Text style={[styles.thText, { width: 80 }]}>End Time</Text>
                <Text style={[styles.thText, { width: 80 }]}>Duration</Text>
                <Text style={[styles.thText, { width: 130, textAlign: "right" }]}>Compliance</Text>
              </View>

              {filteredSessions.length === 0 ? (
                <Text style={styles.emptyResultsWarningText}>No break sessions recorded for the selected filters.</Text>
              ) : (
                filteredSessions.map((sSession) => {
                  const start = new Date(sSession.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  const dateStr = new Date(sSession.startTime).toLocaleDateString([], { month: "short", day: "numeric" });
                  const end = sSession.endTime ? new Date(sSession.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

                  return (
                    <View key={sSession.id} style={styles.tableBodyDataRow}>
                      <View style={[styles.tableCellAlign, { width: 140 }]}>
                        <View style={styles.avatarMiniCircle}>
                          <Text style={styles.avatarMiniText}>{getInitials(sSession.employeeName)}</Text>
                        </View>
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <Text style={styles.cellEmpPrimaryText} numberOfLines={1}>{sSession.employeeName}</Text>
                          <Text style={styles.cellEmpSubText}>{dateStr}</Text>
                        </View>
                      </View>

                      <View style={[styles.tableCellAlign, { width: 90 }]}>
                        <View style={[styles.badgeBase, sSession.type === "LUNCH" ? styles.badgeLunch : styles.badgeBreak]}>
                          <Text style={[styles.badgeText, sSession.type === "LUNCH" ? { color: "#fb923c" } : { color: "#c084fc" }]}>{sSession.type}</Text>
                        </View>
                      </View>

                      <Text style={[styles.tdStandardText, { width: 80 }]}>{start}</Text>
                      
                      <View style={[styles.tableCellAlign, { width: 80 }]}>
                        {end ? <Text style={styles.tdStandardText}>{end}</Text> : (
                          <View style={styles.activePulseStatusBadge}>
                            <View style={styles.pulseDotElement} />
                            <Text style={styles.pulseActiveText}>Active</Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.tdWeightText, { width: 80 }]}>{sSession.endTime ? formatDuration(sSession.durationMinutes) : "—"}</Text>
                      
                      <View style={[styles.tableCellAlign, { width: 130, justifyContent: "flex-end" }]}>
                        {sSession.isLate ? (
                          <View style={styles.complianceLateBox}>
                            <Text style={styles.lateComplianceText}>Late ({sSession.exceededMinutes}m)</Text>
                          </View>
                        ) : sSession.endTime ? (
                          <View style={styles.complianceOntimeBox}>
                            <Text style={styles.ontimeComplianceText}>On time</Text>
                          </View>
                        ) : (
                          <Text style={styles.inProgressSubLabel}>In progress</Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        <View style={styles.blockCardSurface}>
          <View style={styles.blockCardHeaderRow}>
            <Clock size={16} color={uiTheme.customColors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.blockTitleText}>Weekly Accumulated Stats</Text>
          </View>
          
          {filteredStats.length === 0 ? (
            <Text style={styles.emptyResultsWarningText}>No aggregated compliance records found.</Text>
          ) : (
            <View style={styles.statListDividerContainer}>
              {filteredStats.map((stat) => (
                <View key={stat.employeeId} style={styles.statRowBlockLayout}>
                  <View style={styles.statBlockTopMetaRow}>
                    <View style={styles.leftMetaInline}>
                      <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitials}>{getInitials(stat.employeeName)}</Text>
                      </View>
                      <Text style={styles.statBlockEmpName}>{stat.employeeName}</Text>
                    </View>

                    {stat.lateReturnsCount > 0 && (
                      <View style={styles.lateIndicatorBadgeRow}>
                        <Text style={styles.lateIndicatorBadgeText}>{stat.lateReturnsCount} Late Returns</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.dualStatsGridDisplayBox}>
                    <View style={styles.statGridSplitItem}>
                      <Text style={styles.statGridMetaLabel}>TOTAL LUNCH TIME</Text>
                      <Text style={styles.statGridPrimaryValue}>
                        {formatDuration(stat.totalLunchMinutes)}
                        <Text style={styles.statGridCounterSubText}> ({stat.lunchSessionsCount} shifts)</Text>
                      </Text>
                    </View>

                    <View style={[styles.statGridSplitItem, { borderLeftWidth: 1, borderColor: "rgba(148,163,184,0.1)" }]}>
                      <Text style={styles.statGridMetaLabel}>TOTAL BREAK TIME</Text>
                      <Text style={styles.statGridPrimaryValue}>
                        {formatDuration(stat.totalBreakMinutes)}
                        <Text style={styles.statGridCounterSubText}> ({stat.breakSessionsCount} shifts)</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={styles.modalBackdropOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.modalContentSurface}>
            <View style={styles.modalHeaderTitleRow}>
              <Text style={styles.modalTitleText}>Select Filter Route</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <X size={18} color={uiTheme.panelColors.dashboardTextColor} />
              </TouchableOpacity>
            </View>
            {(["ALL", "LUNCH", "BREAK", "LATE"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.modalSelectionOptionRow, typeFilter === opt && styles.activeModalSelectionOptionRow]}
                onPress={() => {
                  setTypeFilter(opt);
                  setShowTypePicker(false);
                }}
              >
                <Text style={[styles.modalOptionText, typeFilter === opt ? { color: uiTheme.customColors.primary, fontWeight: "700" } : { color: uiTheme.panelColors.dashboardTextColor }]}>
                  {opt === "ALL" ? "All History" : opt === "LUNCH" ? "Lunches Only" : opt === "BREAK" ? "Breaks Only" : "Late Returns"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

// Dynamic Pure Theme Engine Sheet Mapping Definitions
const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme.includes("crystal") || uiTheme.panelColors.dashboardTextColor === "#000000";
  const borderOpacityColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";

  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    centerDeck: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: uiTheme.panelColors.dashboardBackground,
    },
    networkFallbackText: {
      marginTop: 12,
      fontSize: 13,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
    },
    headerDeck: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderColor: borderOpacityColor,
    },
    screenHeading: {
      fontSize: 22,
      fontWeight: "800",
      letterSpacing: -0.5,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    screenCaption: {
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.6,
      marginTop: 4,
      lineHeight: 16,
    },
    filterInlineRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14,
      gap: 8,
    },
    dateControlChip: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 8,
      paddingHorizontal: 8,
      height: 36,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    chipMetaText: {
      fontSize: 10,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      fontWeight: "600",
    },
    dateInput: {
      flex: 1,
      fontSize: 11,
      fontWeight: "700",
      paddingHorizontal: 4,
      textAlign: "center",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    circleBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: borderOpacityColor,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    exportGradientBtn: {
      height: 36,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      backgroundColor: uiTheme.customColors.primary,
    },
    exportText: {
      fontSize: 12,
      fontWeight: "700",
      color: isLightTheme ? "#ffffff" : "#09090b",
    },
    alertPanelError: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(239,68,68,0.1)",
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.2)",
      margin: 16,
      padding: 12,
      borderRadius: 10,
    },
    errorTextLabel: {
      color: "#f87171",
      fontSize: 12,
      flex: 1,
    },
    scrollWrapper: {
      padding: 16,
      paddingBottom: 40,
    },
    kpiGridContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 16,
    },
    kpiSquare: {
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 12,
      padding: 12,
      width: (width - 42) / 2,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    kpiIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    kpiTitle: {
      fontSize: 11,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
      fontWeight: "500",
    },
    kpiBadgeAlignment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    kpiMetric: {
      fontSize: 20,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
      marginTop: 2,
    },
    pingCircle: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginTop: 4,
    },
    blockCardSurface: {
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 12,
      marginBottom: 16,
      overflow: "hidden",
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    blockCardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: surfaceAlphaColor,
      borderBottomWidth: 1,
      borderColor: borderOpacityColor,
    },
    pingCircleStatic: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: "#10b981",
      marginRight: 8,
    },
    blockTitleText: {
      fontSize: 13,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    paddedInnerArea: {
      padding: 12,
    },
    flexGridList: {
      gap: 10,
    },
    stopwatchRowPlate: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 10,
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 10,
    },
    leftMetaInline: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "#1e293b",
      borderWidth: 1,
      borderColor: borderOpacityColor,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarInitials: {
      color: uiTheme.panelColors.dashboardTextColor,
      fontSize: 10,
      fontWeight: "700",
    },
    empPlateName: {
      fontSize: 13,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    badgeBase: {
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
      alignSelf: "flex-start",
      marginTop: 3,
      borderWidth: 1,
    },
    badgeLunch: {
      backgroundColor: "rgba(249,115,22,0.1)",
      borderColor: "rgba(249,115,22,0.2)",
    },
    badgeBreak: {
      backgroundColor: "rgba(168,85,247,0.1)",
      borderColor: "rgba(168,85,247,0.2)",
    },
    badgeText: {
      fontSize: 9,
      fontWeight: "700",
      textTransform: "capitalize",
    },
    stopwatchBoxContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: surfaceAlphaColor,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: borderOpacityColor,
    },
    stopwatchTickerFont: {
      fontFamily: "System", 
      fontSize: 12,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    blockHeaderAdjustColumn: {
      padding: 14,
      backgroundColor: surfaceAlphaColor,
      borderBottomWidth: 1,
      borderColor: borderOpacityColor,
      gap: 12,
    },
    searchFilterControlDeck: {
      flexDirection: "row",
      gap: 8,
    },
    searchFieldInputFrame: {
      flex: 1,
      height: 34,
      position: "relative",
    },
    searchIconAbsolute: {
      position: "absolute",
      left: 10,
      top: 10,
      zIndex: 2,
    },
    searchTextInputElement: {
      height: "100%",
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 8,
      paddingLeft: 30,
      paddingRight: 10,
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    pickerSelectorAnchor: {
      height: 34,
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      gap: 6,
    },
    pickerSelectorValueText: {
      fontSize: 11,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    tableMatrixFrame: {
      paddingBottom: 6,
    },
    tableHeadRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderColor: borderOpacityColor,
      backgroundColor: surfaceAlphaColor,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    thText: {
      fontSize: 10,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    tableBodyDataRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderColor: borderOpacityColor,
    },
    tableCellAlign: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarMiniCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "#1e293b",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarMiniText: {
      color: uiTheme.panelColors.dashboardTextColor,
      fontSize: 9,
      fontWeight: "700",
    },
    cellEmpPrimaryText: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    cellEmpSubText: {
      fontSize: 9,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      marginTop: 1,
    },
    tdStandardText: {
      fontSize: 12,
      fontWeight: "500",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    activePulseStatusBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(16,185,129,0.1)",
      borderWidth: 1,
      borderColor: "rgba(16,185,129,0.2)",
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    pulseDotElement: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: "#34d399",
      marginRight: 4,
    },
    pulseActiveText: {
      fontSize: 9,
      fontWeight: "700",
      color: "#34d399",
    },
    tdWeightText: {
      fontSize: 12,
      fontWeight: "600",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    complianceLateBox: {
      backgroundColor: "rgba(239,68,68,0.1)",
      borderColor: "rgba(239,68,68,0.2)",
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    lateComplianceText: {
      color: "#f87171",
      fontSize: 10,
      fontWeight: "600",
    },
    complianceOntimeBox: {
      backgroundColor: "rgba(34,197,94,0.1)",
      borderColor: "rgba(34,197,94,0.15)",
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    ontimeComplianceText: {
      color: "#4ade80",
      fontSize: 10,
      fontWeight: "600",
    },
    inProgressSubLabel: {
      fontSize: 10,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.3,
    },
    emptyResultsWarningText: {
      padding: 24,
      textAlign: "center",
      fontSize: 12,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
    },
    statListDividerContainer: {
      padding: 14,
      gap: 14,
    },
    statRowBlockLayout: {
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 10,
      padding: 10,
    },
    statBlockTopMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    statBlockEmpName: {
      fontSize: 12,
      fontWeight: "700",
      marginLeft: 8,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    lateIndicatorBadgeRow: {
      backgroundColor: "rgba(239,68,68,0.1)",
      borderWidth: 1,
      borderColor: "rgba(239,68,68,0.15)",
      paddingHorizontal: 6,
      paddingVertical: 1.5,
      borderRadius: 4,
    },
    lateIndicatorBadgeText: {
      color: "#f87171",
      fontSize: 9,
      fontWeight: "700",
    },
    dualStatsGridDisplayBox: {
      flexDirection: "row",
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 8,
    },
    statGridSplitItem: {
      flex: 1,
      padding: 8,
    },
    statGridMetaLabel: {
      fontSize: 8,
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.4,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    statGridPrimaryValue: {
      fontSize: 12,
      fontWeight: "700",
      marginTop: 2,
      color: uiTheme.panelColors.dashboardTextColor,
    },
    statGridCounterSubText: {
      fontSize: 10,
      fontWeight: "400",
      color: uiTheme.panelColors.dashboardTextColor,
      opacity: 0.5,
    },
    modalBackdropOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContentSurface: {
      width: "100%",
      maxWidth: 300,
      borderWidth: 1,
      borderColor: borderOpacityColor,
      borderRadius: 14,
      padding: 16,
      backgroundColor: uiTheme.panelColors.dashboardCardBackground,
    },
    modalHeaderTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderColor: borderOpacityColor,
    },
    modalTitleText: {
      fontSize: 14,
      fontWeight: "700",
      color: uiTheme.panelColors.dashboardTextColor,
    },
    modalSelectionOptionRow: {
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 6,
    },
    activeModalSelectionOptionRow: {
      backgroundColor: "rgba(0,198,255,0.05)",
    },
    modalOptionText: {
      fontSize: 13,
    },
  });
};