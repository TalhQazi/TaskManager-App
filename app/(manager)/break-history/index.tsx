import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { apiFetch } from "@/lib/admin/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/contexts/ThemeContext";
import { s, wp, hp, fs } from "@/util/styles";
import { toProxiedUrl, initToken } from "@/util/toProxiedUrl";
import { isDarkTheme } from "@/constants/design/presets";

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
  avatar?: string;
}

interface WeeklyStat {
  employeeId: string;
  employeeName: string;
  avatar?: string;
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
  avatar?: string;
  current_status: "AVAILABLE" | "LUNCH" | "BREAK" | "OFFLINE";
  lunch_start_time: string | null;
  lunch_expected_end: string | null;
  break_start_time: string | null;
}

function getInitials(name: string) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "?" : "";
  return (first + last).toUpperCase();
}

function UserAvatar({
  url,
  name,
  size,
  style,
  textStyle,
  jwtToken,
}: {
  url?: string | null;
  name: string;
  size: number;
  style?: any;
  textStyle?: any;
  jwtToken?: string | null;
}) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [url, jwtToken]);

  const imageSource = useMemo(() => {
    if (!url || typeof url !== "string" || !url.trim()) return null;

    let finalUrl = url.trim();

    if (
      finalUrl.startsWith("data:") ||
      finalUrl.startsWith("file://") ||
      finalUrl.startsWith("content://")
    ) {
      return { uri: finalUrl };
    }

    if (finalUrl.startsWith("/uploads/")) {
      finalUrl = finalUrl.replace("/uploads/", "/api/s3-proxy/");
    } else if (finalUrl.startsWith("uploads/")) {
      finalUrl = finalUrl.replace("uploads/", "/api/s3-proxy/");
    } else if (!finalUrl.startsWith("/api/s3-proxy/") && !finalUrl.startsWith("http")) {
      finalUrl = `/api/s3-proxy/${finalUrl.replace(/^\//, "")}`;
    }

    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = `https://task.se7eninc.com${finalUrl.startsWith("/") ? finalUrl : `/${finalUrl}`}`;
    }

    try {
      const proxied = toProxiedUrl(finalUrl);
      if (proxied && proxied.includes("token=")) {
        finalUrl = proxied;
      }
    } catch (e) {
      // Fallback
    }

    if (jwtToken && !finalUrl.includes("token=")) {
      const separator = finalUrl.includes("?") ? "&" : "?";
      finalUrl = `${finalUrl}${separator}token=${jwtToken}`;
    }

    return {
      uri: finalUrl,
      headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : undefined,
    };
  }, [url, jwtToken]);

  if (imageSource && !imageError) {
    return (
      <Image
        source={imageSource}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        resizeMode="cover"
        onError={() => setImageError(true)}
      />
    );
  }

  return <Text style={textStyle}>{getInitials(name)}</Text>;
}

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:         uiTheme.panelColors?.dashboardBackground     || (isDark ? "#09090b" : "#F8FAFC"),
    cardBg:             uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#18181b" : "#FFFFFF"),
    text:               uiTheme.panelColors?.dashboardTextColor      || (isDark ? "#F4F4F5" : "#0F172A"),
    textSecondary:      isDark ? "#A1A1AA" : "#475569",
    textMuted:          isDark ? "#71717A" : "#64748B",
    border:             isDark ? "#27272A" : "#E2E8F0",
    borderLight:        isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    inputBg:            isDark ? "#09090b" : "#FFFFFF",
    inputBorder:        isDark ? "#27272A" : "#CBD5E1",
    primary:            uiTheme.customColors?.primary || (isDark ? "#3b82f6" : "#133767"),
    primaryText:        "#FFFFFF",
    golden:             uiTheme.customColors?.golden || "#B45309",
    lunch:              "#FB923C",
    lunchBg:            "rgba(249,115,22,0.15)",
    lunchBorder:        "rgba(249,115,22,0.3)",
    break:              "#C084FC",
    breakBg:            "rgba(168,85,247,0.15)",
    breakBorder:        "rgba(168,85,247,0.3)",
    success:            isDark ? "#34D399" : "#2E7D32",
    successBg:          isDark ? "rgba(46, 125, 50, 0.15)" : "#E8F5E9",
    successBorder:      isDark ? "rgba(46, 125, 50, 0.3)" : "#FEE2E2",
    danger:             isDark ? "#F87171" : "#C62828",
    dangerBg:           isDark ? "rgba(198, 40, 40, 0.15)" : "#FEF2F2",
    dangerBorder:       isDark ? "rgba(198, 40, 40, 0.3)" : "#FEF2F2",
    avatarBg:           isDark ? "#27272A" : "#E2E8F0",
    overlayBg:          "rgba(15, 23, 42, 0.6)",
    modalPanelBg:       isDark ? "#18181b" : "#FFFFFF",
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    rootContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centerDeck: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    networkFallbackText: {
      marginTop: hp(1.5),
      fontSize: fs(3.2),
      color: colors.textSecondary,
    },
    headerDeck: {
      paddingHorizontal: wp(4),
      paddingTop: Platform.OS === 'android' ? hp(2) : hp(6.5),
      paddingBottom: hp(2),
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    screenHeading: {
      fontSize: fs(5.5),
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    screenCaption: {
      fontSize: fs(3),
      color: colors.textSecondary,
      marginTop: hp(0.5),
      lineHeight: fs(4),
    },
    filterInlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: hp(1.8),
      gap: wp(2),
    },
    dateControlChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: wp(2),
      paddingHorizontal: wp(2),
      height: hp(4.5),
    },
    chipMetaText: {
      fontSize: fs(2.5),
      color: colors.textSecondary,
      fontWeight: '600',
    },
    dateInput: {
      flex: 1,
      color: colors.textMuted,
      fontSize: fs(2.8),
      fontWeight: '700',
      paddingHorizontal: wp(1),
      textAlign: 'center',
      paddingVertical: 0,
      height: '100%',
    },
    circleBtn: {
      width: wp(9),
      height: wp(9),
      borderRadius: wp(2),
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    exportGradientBtn: {
      height: hp(4.5),
      borderRadius: wp(2),
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: wp(3),
    },
    exportText: {
      color: colors.primaryText,
      fontSize: fs(3),
      fontWeight: '600',
    },
    alertPanelError: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      margin: wp(4),
      padding: wp(3),
      borderRadius: wp(2.5),
    },
    errorTextLabel: {
      color: colors.danger,
      fontSize: fs(3),
      flex: 1,
    },
    scrollWrapper: {
      padding: wp(4),
      paddingBottom: hp(5),
    },
    kpiGridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: wp(2.5),
      marginBottom: hp(2),
    },
    kpiSquare: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      padding: wp(3),
      width: (wp(100) - wp(8) - wp(2.5)) / 2.3,
    },
    kpiIconBox: {
      width: wp(8),
      height: wp(8),
      borderRadius: wp(2),
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: hp(1),
    },
    kpiTitle: {
      fontSize: fs(2.8),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    kpiBadgeAlignment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1.5),
    },
    kpiMetric: {
      fontSize: fs(5),
      fontWeight: '700',
      color: colors.text,
      marginTop: hp(0.25),
    },
    pingCircle: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      marginTop: hp(0.5),
    },
    blockCardSurface: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      marginBottom: hp(2),
      overflow: 'hidden',
    },
    blockCardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1.5),
      backgroundColor: colors.borderLight,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    pingCircleStatic: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      backgroundColor: '#10b981',
      marginRight: wp(2),
    },
    blockTitleText: {
      fontSize: fs(3.2),
      fontWeight: '700',
      color: colors.textMuted,
    },
    paddedInnerArea: {
      padding: wp(3),
    },
    flexGridList: {
      gap: hp(1.2),
    },
    stopwatchRowPlate: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: wp(2.5),
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
    },
    leftMetaInline: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarCircle: {
      width: wp(8),
      height: wp(8),
      borderRadius: wp(4),
      backgroundColor: colors.avatarBg,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarInitials: {
      color: colors.text,
      fontSize: fs(2.5),
      fontWeight: '700',
    },
    empPlateName: {
      fontSize: fs(3.2),
      fontWeight: '600',
      color: colors.text,
    },
    badgeBase: {
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
      alignSelf: 'flex-start',
      marginTop: hp(0.4),
      borderWidth: 1,
    },
    badgeLunch: {
      backgroundColor: colors.lunchBg,
      borderColor: colors.lunchBorder,
    },
    badgeBreak: {
      backgroundColor: colors.breakBg,
      borderColor: colors.breakBorder,
    },
    badgeText: {
      fontSize: fs(2.2),
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    stopwatchBoxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.6),
      borderRadius: wp(1.5),
      borderWidth: 1,
      borderColor: colors.border,
    },
    stopwatchTickerFont: {
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', 
      fontSize: fs(3),
      fontWeight: '700',
      color: colors.text,
    },
    blockHeaderAdjustColumn: {
      padding: wp(3.5),
      backgroundColor: colors.borderLight,
      borderBottomWidth: 1,
      borderColor: colors.border,
      gap: hp(1.5),
    },
    searchFilterControlDeck: {
      flexDirection: 'row',
      gap: wp(2),
    },
    searchFieldInputFrame: {
      flex: 1,
      height: hp(4.2),
      position: 'relative',
    },
    searchIconAbsolute: {
      position: 'absolute',
      left: wp(2.5),
      top: hp(1.2),
      zIndex: 2,
    },
    searchTextInputElement: {
      height: '100%',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: wp(2),
      paddingLeft: wp(7.5),
      paddingRight: wp(2.5),
      color: colors.textMuted,
      fontSize: fs(3),
      paddingVertical: 0,
    },
    pickerSelectorAnchor: {
      height: hp(4.2),
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: wp(2),
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: wp(3),
      gap: wp(1.5),
    },
    pickerSelectorValueText: {
      color: colors.textMuted,
      fontSize: fs(2.8),
      fontWeight: '700',
    },
    tableMatrixFrame: {
      paddingBottom: hp(0.75),
    },
    tableHeadRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.borderLight,
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3.5),
    },
    thText: {
      fontSize: fs(2.5),
      color: colors.textSecondary,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    tableBodyDataRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(3.5),
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
    },
    tableCellAlign: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarMiniCircle: {
      width: wp(6.5),
      height: wp(6.5),
      borderRadius: wp(3.25),
      backgroundColor: colors.avatarBg,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    avatarMiniText: {
      color: colors.textMuted,
      fontSize: fs(2.2),
      fontWeight: '700',
    },
    cellEmpPrimaryText: {
      fontSize: fs(3),
      fontWeight: '600',
      color: colors.text,
    },
    cellEmpSubText: {
      fontSize: fs(2.2),
      color: colors.textMuted,
      marginTop: hp(0.1),
    },
    tdStandardText: {
      fontSize: fs(3),
      color: colors.textSecondary,
      fontWeight: '500',
    },
    activePulseStatusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.successBg,
      borderWidth: 1,
      borderColor: colors.successBorder,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
    },
    pulseDotElement: {
      width: wp(1),
      height: wp(1),
      borderRadius: wp(0.5),
      backgroundColor: '#34d399',
      marginRight: wp(1),
    },
    pulseActiveText: {
      fontSize: fs(2.2),
      fontWeight: '700',
      color: '#34d399',
    },
    tdWeightText: {
      fontSize: fs(3),
      color: colors.text,
      fontWeight: '600',
    },
    complianceLateBox: {
      backgroundColor: colors.dangerBg,
      borderColor: colors.dangerBorder,
      borderWidth: 1,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
    },
    lateComplianceText: {
      color: colors.danger,
      fontSize: fs(2.5),
      fontWeight: '600',
    },
    complianceOntimeBox: {
      backgroundColor: colors.successBg,
      borderColor: colors.successBorder,
      borderWidth: 1,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
    },
    ontimeComplianceText: {
      color: colors.success,
      fontSize: fs(2.5),
      fontWeight: '600',
    },
    inProgressSubLabel: {
      fontSize: fs(2.5),
      color: colors.textMuted,
    },
    emptyResultsWarningText: {
      padding: wp(6),
      textAlign: 'center',
      fontSize: fs(3),
      color: colors.textMuted,
    },
    statListDividerContainer: {
      padding: wp(3.5),
      gap: hp(1.8),
    },
    statRowBlockLayout: {
      backgroundColor: colors.borderLight,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      padding: wp(2.5),
    },
    statBlockTopMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp(1.2),
    },
    statBlockEmpName: {
      fontSize: fs(3),
      fontWeight: '700',
      color: colors.textMuted,
      marginLeft: wp(2),
    },
    lateIndicatorBadgeRow: {
      backgroundColor: colors.dangerBg,
      borderWidth: 1,
      borderColor: colors.dangerBorder,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.25),
      borderRadius: wp(1),
    },
    lateIndicatorBadgeText: {
      color: colors.danger,
      fontSize: fs(2.2),
      fontWeight: '700',
    },
    dualStatsGridDisplayBox: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2),
    },
    statGridSplitItem: {
      flex: 1,
      padding: wp(2),
    },
    statGridMetaLabel: {
      fontSize: fs(2),
      color: colors.textMuted,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    statGridPrimaryValue: {
      fontSize: fs(3),
      fontWeight: '700',
      color: colors.text,
      marginTop: hp(0.25),
    },
    statGridCounterSubText: {
      fontSize: fs(2.5),
      fontWeight: '400',
      color: colors.textMuted,
    },
    modalBackdropOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'center',
      alignItems: 'center',
      padding: wp(5),
    },
    modalContentSurface: {
      width: '100%',
      maxWidth: wp(80),
      backgroundColor: colors.modalPanelBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3.5),
      padding: wp(4),
    },
    modalHeaderTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: hp(1.5),
      paddingBottom: hp(1),
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalTitleText: {
      fontSize: fs(3.5),
      fontWeight: '700',
      color: colors.text,
    },
    modalSelectionOptionRow: {
      paddingVertical: hp(1.2),
      paddingHorizontal: wp(2),
      borderRadius: wp(1.5),
    },
    activeModalSelectionOptionRow: {
      backgroundColor: colors.borderLight,
    },
    modalOptionText: {
      fontSize: fs(3.2),
      color: colors.textSecondary,
    },
  });
}

export default function BreakTrackingScreen() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { uiTheme } = useTheme();

  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const isDark = isDarkTheme(uiTheme?.theme);
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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

  // Retrieve Authentication Token
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await initToken();
        let token =
          (user as any)?.token ||
          (user as any)?.accessToken ||
          (user as any)?.jwt;

        if (!token) {
          const keys = await AsyncStorage.getAllKeys();
          const possibleTokenKeys = keys.filter((k) =>
            /token|jwt|auth|session/i.test(k)
          );
          for (const key of possibleTokenKeys) {
            const val = await AsyncStorage.getItem(key);
            if (val && typeof val === "string" && val.length > 10) {
              token = val;
              break;
            }
          }
        }

        if (isMounted && token) {
          setJwtToken(token);
        }
      } catch (err) {
        console.error("Failed to load token in BreakTrackingScreen:", err);
      }
    })();

    return () => { isMounted = false; };
  }, [user]);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setIsBackgroundRefetching(true);
      }
      setError(null);
      
      const historyUrl = `/api/user/status-history?startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z`;
      const historyRes = await apiFetch<{ sessions: BreakSession[]; weeklyStats: WeeklyStat[] }>(historyUrl);
      const liveRes = await apiFetch<{ items: LiveStatus[] }>("/api/team/statuses");
      
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
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
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
          `${data.name} went on ${statusLabel} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        );
      } else if (data.current_status === "AVAILABLE") {
        Alert.alert("Status Update", `${data.name} returned and is now Available`);
      }

      setLiveStatuses(prev => {
        const index = prev.findIndex(item => item._id === data.userId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            current_status: data.current_status,
            lunch_start_time: data.lunch_start_time,
            lunch_expected_end: data.lunch_expected_end,
            break_start_time: data.break_start_time,
            avatar: data.avatar || updated[index].avatar,
          };
          return updated;
        } else {
          return [...prev, {
            _id: data.userId,
            name: data.name,
            current_status: data.current_status,
            lunch_start_time: data.lunch_start_time,
            lunch_expected_end: data.lunch_expected_end,
            break_start_time: data.break_start_time,
            avatar: data.avatar,
          }];
        }
      });

      fetchData(false);
    };

    socket.on("status-update", handleStatusUpdate);
    return () => {
      socket.off("status-update", handleStatusUpdate);
    };
  }, [socket, fetchData]);

  const formatDuration = (totalMinutes: number) => {
    const m = Math.max(0, Math.floor(totalMinutes));
    const h = Math.floor(m / 60);
    const min = m % 60;
    if (h > 0) return `${h}h ${min}m`;
    return `${min}m`;
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
    return sessions.filter(sItem => {
      const matchQuery = sItem.employeeName.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchQuery) return false;

      if (typeFilter === "LUNCH") return sItem.type === "LUNCH";
      if (typeFilter === "BREAK") return sItem.type === "BREAK";
      if (typeFilter === "LATE") return sItem.isLate;
      return true;
    });
  }, [sessions, searchQuery, typeFilter]);

  const filteredStats = useMemo(() => {
    return weeklyStats.filter(sItem => 
      sItem.employeeName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [weeklyStats, searchQuery]);

  const activeLunches = useMemo(() => liveStatuses.filter(emp => emp.current_status === "LUNCH"), [liveStatuses]);
  const activeBreaks = useMemo(() => liveStatuses.filter(emp => emp.current_status === "BREAK"), [liveStatuses]);

  const todayCompletedCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions.filter(sItem => sItem.endTime && sItem.endTime.startsWith(today)).length;
  }, [sessions]);

  const todayLateCount = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return sessions.filter(sItem => sItem.isLate && sItem.startTime.startsWith(today)).length;
  }, [sessions]);

  const exportToCSV = async () => {
    try {
      let csvContent = "EMPLOYEE BREAK & LUNCH WEEKLY REPORT\n";
      csvContent += `Period: ${startDate} to ${endDate}\n\n`;
      csvContent += "Employee Name,Total Lunch Time (mins),Total Break Time (mins),Lunch Sessions,Break Sessions,Late Returns,Total Overtime Minutes\n";
      
      weeklyStats.forEach(stat => {
        csvContent += `"${stat.employeeName}",${stat.totalLunchMinutes},${stat.totalBreakMinutes},${stat.lunchSessionsCount},${stat.breakSessionsCount},${stat.lateReturnsCount},${stat.totalExceededMinutes}\n`;
      });
      
      csvContent += "\n\nDETAILED BREAK LOGS HISTORY\n";
      csvContent += "Employee Name,Type,Start Time,End Time,Duration (mins),Status,Overstay Time (mins)\n";
      
      sessions.forEach(sItem => {
        const start = new Date(sItem.startTime).toLocaleString();
        const end = sItem.endTime ? new Date(sItem.endTime).toLocaleString() : "Active";
        const status = sItem.isLate ? "LATE" : "ON-TIME";
        csvContent += `"${sItem.employeeName}",${sItem.type},"${start}","${end}",${sItem.durationMinutes},${status},${sItem.exceededMinutes}\n`;
      });

      const fileUri = `${FileSystem.documentDirectory}Employee_Break_History_${startDate}_to_${endDate}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: 'utf8' });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Error", "Sharing options are not available on this device configuration.");
      }
    } catch (e) {
      Alert.alert("Export Error", "Failed to generate compliance CSV layout file.");
    }
  };

  if (loading) {
    return (
      <View style={s(styles.centerDeck)}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s(styles.networkFallbackText)}>Loading analytical break layouts...</Text>
      </View>
    );
  }

  return (
    <View style={s(styles.rootContainer)}>
      <View style={s(styles.headerDeck)}>
        <Text style={s(styles.screenHeading)}>Lunch & Break History</Text>
        <Text style={s(styles.screenCaption)}>Track accumulated historical shifts and evaluate team performance constraints.</Text>
        
        <View style={s(styles.filterInlineRow)}>
          <View style={s(styles.dateControlChip)}>
            <Text style={s(styles.chipMetaText)}>From:</Text>
            <TextInput 
              style={s(styles.dateInput)} 
              value={startDate} 
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={s(styles.chipMetaText)}>To:</Text>
            <TextInput 
              style={s(styles.dateInput)} 
              value={endDate} 
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <TouchableOpacity style={s(styles.circleBtn)} onPress={() => fetchData(true)}>
            <RefreshCw size={fs(3.8)} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={s(styles.exportGradientBtn)} onPress={exportToCSV}>
            <Download size={fs(3.5)} color={colors.primaryText} style={s({ marginRight: wp(1) })} />
            <Text style={s(styles.exportText)}>Export</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={s(styles.alertPanelError)}>
          <ShieldAlert size={fs(4.5)} color={colors.danger} style={s({ marginRight: wp(2) })} />
          <Text style={s(styles.errorTextLabel)}>{error}</Text>
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s(styles.scrollWrapper)}
        refreshControl={
          <RefreshControl refreshing={isBackgroundRefetching} onRefresh={() => fetchData(false)} tintColor={colors.primary} />
        }
      >
        <View style={s(styles.kpiGridContainer)}>
          <View style={s(styles.kpiSquare)}>
            <View style={s([styles.kpiIconBox, { backgroundColor: colors.lunchBg }])}>
              <Utensils size={fs(4.5)} color={colors.lunch} />
            </View>
            <Text style={s(styles.kpiTitle)}>On Lunch Now</Text>
            <View style={s(styles.kpiBadgeAlignment)}>
              <Text style={s(styles.kpiMetric)}>{activeLunches.length}</Text>
              {activeLunches.length > 0 && <View style={s([styles.pingCircle, { backgroundColor: colors.lunch }])} />}
            </View>
          </View>

          <View style={s(styles.kpiSquare)}>
            <View style={s([styles.kpiIconBox, { backgroundColor: colors.breakBg }])}>
              <Coffee size={fs(4.5)} color={colors.break} />
            </View>
            <Text style={s(styles.kpiTitle)}>On Break Now</Text>
            <View style={s(styles.kpiBadgeAlignment)}>
              <Text style={s(styles.kpiMetric)}>{activeBreaks.length}</Text>
              {activeBreaks.length > 0 && <View style={s([styles.pingCircle, { backgroundColor: colors.break }])} />}
            </View>
          </View>

          <View style={s(styles.kpiSquare)}>
            <View style={s([styles.kpiIconBox, { backgroundColor: colors.successBg }])}>
              <CheckCircle size={fs(4.5)} color={colors.success} />
            </View>
            <Text style={s(styles.kpiTitle)}>Completed Today</Text>
            <Text style={s(styles.kpiMetric)}>{todayCompletedCount}</Text>
          </View>

          <View style={s(styles.kpiSquare)}>
            <View style={s([styles.kpiIconBox, todayLateCount > 0 ? { backgroundColor: colors.dangerBg } : { backgroundColor: colors.borderLight }])}>
              <AlertTriangle size={fs(4.5)} color={todayLateCount > 0 ? colors.danger : colors.textMuted} />
            </View>
            <Text style={s(styles.kpiTitle)}>Late Returns Today</Text>
            <Text style={s([styles.kpiMetric, todayLateCount > 0 && { color: colors.danger }])}>{todayLateCount}</Text>
          </View>
        </View>

        {(activeLunches.length > 0 || activeBreaks.length > 0) && (
          <View style={s(styles.blockCardSurface)}>
            <View style={s(styles.blockCardHeaderRow)}>
              <View style={s(styles.pingCircleStatic)} />
              <Text style={s(styles.blockTitleText)}>Live Active Break Stopwatches</Text>
            </View>
            <View style={s(styles.paddedInnerArea)}>
              <View style={s(styles.flexGridList)}>
                {[...activeLunches, ...activeBreaks].map((emp, index) => {
                  const isLunch = emp.current_status === "LUNCH";
                  const startTime = isLunch ? emp.lunch_start_time : emp.break_start_time;
                  const elapsedSeconds = getLiveDurationSeconds(startTime);

                  return (
                    <View key={emp._id || String(index)} style={s(styles.stopwatchRowPlate)}>
                      <View style={s(styles.leftMetaInline)}>
                        <View style={s(styles.avatarCircle)}>
                          <UserAvatar
                            url={emp.avatar}
                            name={emp.name}
                            size={wp(8)}
                            style={{ borderRadius: wp(4) }}
                            textStyle={s(styles.avatarInitials)}
                            jwtToken={jwtToken}
                          />
                        </View>
                        <View style={s({ marginLeft: wp(2.5), maxWidth: wp(40) })}>
                          <Text style={s(styles.empPlateName)} numberOfLines={1}>{emp.name}</Text>
                          <View style={s([styles.badgeBase, isLunch ? styles.badgeLunch : styles.badgeBreak])}>
                            <Text style={s([styles.badgeText, isLunch ? { color: colors.lunch } : { color: colors.break }])}>
                              {isLunch ? 'Lunch' : 'Break'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={s(styles.stopwatchBoxContainer)}>
                        <Clock size={fs(3)} color={isLunch ? colors.lunch : colors.break} style={s({ marginRight: wp(1) })} />
                        <Text style={s(styles.stopwatchTickerFont)}>{formatStopwatch(elapsedSeconds)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        <View style={s(styles.blockCardSurface)}>
          <View style={s(styles.blockHeaderAdjustColumn)}>
            <View style={s({ flexDirection: 'row', alignItems: 'center' })}>
              <FileText size={fs(4)} color={colors.primary} style={s({ marginRight: wp(1.5) })} />
              <Text style={s(styles.blockTitleText)}>Break Logs History ({filteredSessions.length})</Text>
            </View>
            
            <View style={s(styles.searchFilterControlDeck)}>
              <View style={s(styles.searchFieldInputFrame)}>
                <Search size={fs(3.5)} color={colors.textMuted} style={s(styles.searchIconAbsolute)} />
                <TextInput 
                  style={s(styles.searchTextInputElement)}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search employee..."
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity style={s(styles.pickerSelectorAnchor)} onPress={() => setShowTypePicker(true)}>
                <Text style={s(styles.pickerSelectorValueText)}>{typeFilter}</Text>
                <ChevronDown size={fs(3.5)} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} >
            <View style={s(styles.tableMatrixFrame)}>
              <View style={s(styles.tableHeadRow)}>
                <Text style={s([styles.thText, { width: wp(35) }])}>Employee</Text>
                <Text style={s([styles.thText, { width: wp(22) }])}>Session Type</Text>
                <Text style={s([styles.thText, { width: wp(20) }])}>Start Time</Text>
                <Text style={s([styles.thText, { width: wp(20) }])}>End Time</Text>
                <Text style={s([styles.thText, { width: wp(20) }])}>Duration</Text>
                <Text style={s([styles.thText, { width: wp(32), textAlign: 'right' }])}>Compliance</Text>
              </View>

              {filteredSessions.length === 0 ? (
                <Text style={s(styles.emptyResultsWarningText)}>No break sessions recorded for the selected filters.</Text>
              ) : (
                filteredSessions.map((sItem, idx) => {
                  const start = new Date(sItem.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateStr = new Date(sItem.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const end = sItem.endTime ? new Date(sItem.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null;

                  return (
                    <View key={sItem.id || String(idx)} style={s(styles.tableBodyDataRow)}>
                      <View style={s([styles.tableCellAlign, { width: wp(35) }])}>
                        <View style={s(styles.avatarMiniCircle)}>
                          <UserAvatar
                            url={sItem.avatar}
                            name={sItem.employeeName}
                            size={wp(6.5)}
                            style={{ borderRadius: wp(3.25) }}
                            textStyle={s(styles.avatarMiniText)}
                            jwtToken={jwtToken}
                          />
                        </View>
                        <View style={s({ marginLeft: wp(2), flex: 1 })}>
                          <Text style={s(styles.cellEmpPrimaryText)} numberOfLines={1}>
                            {sItem.employeeName}
                          </Text>
                          <Text style={s(styles.cellEmpSubText)}>{dateStr}</Text>
                        </View>
                      </View>

                      <View style={s([styles.tableCellAlign, { width: wp(22) }])}>
                        <View style={s([styles.badgeBase, sItem.type === "LUNCH" ? styles.badgeLunch : styles.badgeBreak])}>
                          <Text style={s([styles.badgeText, sItem.type === "LUNCH" ? { color: colors.lunch } : { color: colors.break }])}>{sItem.type}</Text>
                        </View>
                      </View>

                      <Text style={s([styles.tdStandardText, { width: wp(20) }])}>{start}</Text>
                      
                      <View style={s([styles.tableCellAlign, { width: wp(20) }])}>
                        {end ? <Text style={s(styles.tdStandardText)}>{end}</Text> : (
                          <View style={s(styles.activePulseStatusBadge)}>
                            <View style={s(styles.pulseDotElement)} />
                            <Text style={s(styles.pulseActiveText)}>Active</Text>
                          </View>
                        )}
                      </View>

                      <Text style={s([styles.tdWeightText, { width: wp(20) }])}>{sItem.endTime ? formatDuration(sItem.durationMinutes) : "—"}</Text>
                      
                      <View style={s([styles.tableCellAlign, { width: wp(32), justifyContent: 'flex-end' }])}>
                        {sItem.isLate ? (
                          <View style={s(styles.complianceLateBox)}>
                            <Text style={s(styles.lateComplianceText)}>Late ({sItem.exceededMinutes}m)</Text>
                          </View>
                        ) : sItem.endTime ? (
                          <View style={s(styles.complianceOntimeBox)}>
                            <Text style={s(styles.ontimeComplianceText)}>On time</Text>
                          </View>
                        ) : (
                          <Text style={s(styles.inProgressSubLabel)}>In progress</Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        <View style={s(styles.blockCardSurface)}>
          <View style={s(styles.blockCardHeaderRow)}>
            <Clock size={fs(4)} color={colors.primary} style={s({ marginRight: wp(1.5) })} />
            <Text style={s(styles.blockTitleText)}>Weekly Accumulated Stats</Text>
          </View>
          
          {filteredStats.length === 0 ? (
            <Text style={s(styles.emptyResultsWarningText)}>No aggregated compliance records found.</Text>
          ) : (
            <View style={s(styles.statListDividerContainer)}>
              {filteredStats.map((stat, idx) => (
                <View key={stat.employeeId || String(idx)} style={s(styles.statRowBlockLayout)}>
                  <View style={s(styles.statBlockTopMetaRow)}>
                    <View style={s(styles.leftMetaInline)}>
                      <View style={s(styles.avatarCircle)}>
                        <UserAvatar
                          url={stat.avatar}
                          name={stat.employeeName}
                          size={wp(8)}
                          style={{ borderRadius: wp(4) }}
                          textStyle={s(styles.avatarInitials)}
                          jwtToken={jwtToken}
                        />
                      </View>
                      <Text style={s(styles.statBlockEmpName)}>{stat.employeeName}</Text>
                    </View>

                    {stat.lateReturnsCount > 0 && (
                      <View style={s(styles.lateIndicatorBadgeRow)}>
                        <Text style={s(styles.lateIndicatorBadgeText)}>{stat.lateReturnsCount} Late Returns</Text>
                      </View>
                    )}
                  </View>

                  <View style={s(styles.dualStatsGridDisplayBox)}>
                    <View style={s(styles.statGridSplitItem)}>
                      <Text style={s(styles.statGridMetaLabel)}>TOTAL LUNCH TIME</Text>
                      <Text style={s(styles.statGridPrimaryValue)}>
                        {formatDuration(stat.totalLunchMinutes)}
                        <Text style={s(styles.statGridCounterSubText)}> ({stat.lunchSessionsCount} shifts)</Text>
                      </Text>
                    </View>

                    <View style={s([styles.statGridSplitItem, { borderLeftWidth: 1, borderColor: colors.border }])}>
                      <Text style={s(styles.statGridMetaLabel)}>TOTAL BREAK TIME</Text>
                      <Text style={s(styles.statGridPrimaryValue)}>
                        {formatDuration(stat.totalBreakMinutes)}
                        <Text style={s(styles.statGridCounterSubText)}> ({stat.breakSessionsCount} shifts)</Text>
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
        <TouchableOpacity style={s(styles.modalBackdropOverlay)} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={s(styles.modalContentSurface)}>
            <View style={s(styles.modalHeaderTitleRow)}>
              <Text style={s(styles.modalTitleText)}>Select Filter Route</Text>
              <TouchableOpacity onPress={() => setShowTypePicker(false)}>
                <X size={fs(4.5)} color={colors.text} />
              </TouchableOpacity>
            </View>
            {(["ALL", "LUNCH", "BREAK", "LATE"] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={s([styles.modalSelectionOptionRow, typeFilter === opt && styles.activeModalSelectionOptionRow])}
                onPress={() => {
                  setTypeFilter(opt);
                  setShowTypePicker(false);
                }}
              >
                <Text style={s([styles.modalOptionText, typeFilter === opt && { color: colors.primary, fontWeight: '700' }])}>
                  {opt === "ALL" ? "All History" : opt === "LUNCH" ? "Lunches Only" : opt === "BREAK" ? "Breaks Only" : "Late Returns"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}