import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  Dimensions
} from "react-native";
import { apiFetch, listResource } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import Colors from "@/constants/colors";
import { 
  Search, 
  RefreshCw, 
  FileText, 
  User, 
  Clock, 
  Filter, 
  X, 
  Calendar,
  ChevronDown
} from "lucide-react-native";
import { s } from "@/util/styles";

const { height } = Dimensions.get("window");

interface ActivityLog {
  id: string;
  actorUserId: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ActivitySummary {
  totalCount: number;
  actionCounts: { action: string; count: number }[];
  resourceTypeCounts: { resourceType: string; count: number }[];
  topUsers: { username: string; role: string; count: number }[];
}

interface UserItem {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: string;
  status: string;
}

interface LogsApiResponse {
  items: ActivityLog[];
  totalPages?: number;
  total?: number;
  pagination?: { totalPages: number; totalItems: number; currentPage: number };
}

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN_SUCCESS: "Login Success",
  AUTH_LOGIN_FAILURE: "Login Failed",
  AUTH_LOGOUT: "Logout",
  USER_CREATE: "User Added",
  USER_UPDATE: "User Updated",
  USER_DELETE: "User Deleted",
  USER_ROLE_CHANGE: "Role Changed",
  TASK_CREATE: "Task Added",
  TASK_UPDATE: "Task Updated",
  TASK_DELETE: "Task Deleted",
  EMPLOYEE_CREATE: "Employee Added",
  EMPLOYEE_UPDATE: "Employee Updated",
  EMPLOYEE_DELETE: "Employee Deleted",
  TIME_ENTRY_CREATE: "Time Entry Added",
  TIME_ENTRY_UPDATE: "Time Entry Updated",
  TIME_ENTRY_DELETE: "Time Entry Deleted",
  NOTIFICATION_CREATE: "Notification Sent",
  MESSAGE_SEND: "Message Sent",
  SETTINGS_UPDATE: "Settings Updated",
  DATA_EXPORT: "Data Exported",
  APPLIANCE_CREATE: "Appliance Added",
  APPLIANCE_UPDATE: "Appliance Updated",
  APPLIANCE_DELETE: "Appliance Deleted",
  VEHICLE_CREATE: "Vehicle Added",
  VEHICLE_UPDATE: "Vehicle Updated",
  VEHICLE_DELETE: "Vehicle Deleted",
  LOCATION_CREATE: "Location Added",
  LOCATION_UPDATE: "Location Updated",
  LOCATION_DELETE: "Location Deleted",
  VENDOR_CREATE: "Vendor Added",
  VENDOR_UPDATE: "Vendor Updated",
  VENDOR_DELETE: "Vendor Deleted",
  EVENT_CREATE: "Event Added",
  EVENT_UPDATE: "Event Updated",
  EVENT_DELETE: "Event Deleted",
  ONBOARDING_CREATE: "Onboarding Added",
  ONBOARDING_UPDATE: "Onboarding Updated",
  start_lunch: "Start Lunch",
  end_lunch: "End Lunch",
  start_break: "Start Break",
  end_break: "End Break",
  late_return: "Late Status Return",
  auto_expire: "Status Auto Expired",
  OTHER: "Other Action",
};

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  AUTH_LOGIN_SUCCESS: { bg: "#dcfce7", text: "#16a34a" },
  AUTH_LOGIN_FAILURE: { bg: "#fee2e2", text: "#dc2626" },
  AUTH_LOGOUT: { bg: "#f1f5f9", text: "#475569" },
  USER_CREATE: { bg: "#dbeafe", text: "#2563eb" },
  USER_UPDATE: { bg: "#dbeafe", text: "#2563eb" },
  USER_DELETE: { bg: "#fee2e2", text: "#dc2626" },
  USER_ROLE_CHANGE: { bg: "#f3e8ff", text: "#7c3aed" },
  TASK_CREATE: { bg: "#fffbeb", text: "#d97706" },
  TASK_UPDATE: { bg: "#fffbeb", text: "#d97706" },
  TASK_DELETE: { bg: "#fee2e2", text: "#dc2626" },
  start_lunch: { bg: "#fffbeb", text: "#b45309" },
  end_lunch: { bg: "#fffbeb", text: "#b45309" },
  late_return: { bg: "#fef2f2", text: "#b91c1c" },
  auto_expire: { bg: "#fef2f2", text: "#b91c1c" },
};

const RESOURCE_ICONS: Record<string, string> = {
  user: "👤",
  task: "📋",
  employee: "👷",
  "time-entry": "⏰",
  notification: "🔔",
  message: "💬",
  settings: "⚙️",
  auth: "🔐",
  system: "🖥️",
  appliance: "🔌",
  vehicle: "🚗",
  location: "📍",
  vendor: "🏢",
  event: "📅",
  onboarding: "📝",
};

export default function ActivityLogs() {
  const themeContext = useTheme();
  
const activeColors = useMemo(() => {
    const contextAny = themeContext as any;
    let baseColors: Record<string, string> = {};

    if (contextAny?.colors) {
      baseColors = { ...contextAny.colors };
    } else {
      const uiTheme = contextAny?.uiTheme;
      if (uiTheme) {
        const isDark = uiTheme.theme === "dark" || uiTheme.theme === "metallic-elite";
        baseColors = {
          background: uiTheme.panelColors?.dashboardBackground || (isDark ? "#0f172a" : "#f8fafc"),
          surface: uiTheme.panelColors?.dashboardCardBackground || (isDark ? "#1e293b" : "#ffffff"),
          primary: uiTheme.customColors?.primary || Colors.primary || "#b45309",
          border: uiTheme.panelColors?.borderColor || (isDark ? "#334155" : "#e2e8f0"),
          text: isDark ? "#f8fafc" : "#0f172a",
          textSecondary: isDark ? "#94a3b8" : "#64748b"
        };
      } else {
        baseColors = { ...Colors };
      }
    }

  
    return {
      ...baseColors,
      text: "#ffffff"
    };
  }, [themeContext]);

  const styles = useMemo(() => createStyles(activeColors), [activeColors]);

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);

  const [activePicker, setActivePicker] = useState<"action" | "resource" | null>(null);

  const fetchLogs = async (pageTarget = currentPage) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      params.append("limit", "25");
      params.append("page", String(pageTarget));
      if (selectedUserId) params.append("userId", selectedUserId);
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (resourceTypeFilter !== "all") params.append("resourceType", resourceTypeFilter);
      if (dateFrom) params.append("from", `${dateFrom}T00:00:00.000Z`);
      if (dateTo) params.append("to", `${dateTo}T23:59:59.999Z`);
      if (searchQuery) params.append("search", searchQuery);
      
      const res = await apiFetch<any>(`/api/activity-logs?${params.toString()}`);
      if (res) {
        const typedRes = res as LogsApiResponse;
        setLogs(typedRes.items || []);
        setTotalPages(typedRes.pagination?.totalPages || typedRes.totalPages || 1);
        setTotalItems(typedRes.pagination?.totalItems || typedRes.total || 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await apiFetch<any>("/api/activity-logs/summary");
      if (res) {
        setSummary(res as ActivitySummary);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const syncLayoutDataDataStream = () => {
    setCurrentPage(1);
    void fetchLogs(1);
    void fetchSummary();
  };

  useEffect(() => {
    void fetchSummary();
  }, []);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [currentPage, actionFilter, resourceTypeFilter, dateFrom, dateTo, selectedUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchLogs(1);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const run = async () => {
      try {
        setUsersLoading(true);
        const res = await listResource<any>("users");
        if (res) {
          const rawItems = Array.isArray(res) ? res : (res.items || res.data || []);
          if (Array.isArray(rawItems)) {
            const normalized = rawItems
              .map((u: any) => ({
                ...u,
                role: String(u.role || "").trim().toLowerCase(),
              }))
              .filter((u: any) => u.role && u.role !== "super-admin");
            setUsers(normalized);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setUsersLoading(false);
      }
    };
    run();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatIpAddress = (ip: string | null | undefined) => {
    if (!ip) return "N/A";
    if (ip === "::1" || ip === "::ffff:127.0.0.1") return "127.0.0.1";
    if (ip.startsWith("::ffff:")) return ip.replace("::ffff:", "");
    return ip.includes(":") ? ip.split(":").pop() || ip : ip;
  };

  const getActionStyles = (action: string) => {
    return ACTION_COLORS[action] || { bg: activeColors?.text || "#f1f5f9", text: activeColors?.text || "#475569" };
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActionFilter("all");
    setResourceTypeFilter("all");
    setDateFrom("");
    setDateTo("");
    setSelectedUserId("");
    setCurrentPage(1);
  };

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }, []);

  const admins = useMemo(() => users.filter((u) => u.role === "admin"), [users]);
  const managers = useMemo(() => users.filter((u) => u.role === "manager"), [users]);
  const employees = useMemo(() => users.filter((u) => u.role === "employee"), [users]);

  const selectUser = (id: string) => {
    setSelectedUserId(id);
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const resourceOptions = [
    { id: "all", name: "All Resources" },
    { id: "user", name: "Users" },
    { id: "task", name: "Tasks" },
    { id: "employee", name: "Employees" },
    { id: "appliance", name: "Appliances" },
    { id: "vehicle", name: "Vehicles" },
    { id: "location", name: "Locations" },
    { id: "vendor", name: "Vendors" },
    { id: "event", name: "Events" },
    { id: "onboarding", name: "Onboarding" },
    { id: "time-entry", name: "Time Entries" },
    { id: "notification", name: "Notifications" },
    { id: "message", name: "Messages" },
    { id: "settings", name: "Settings" },
    { id: "auth", name: "Authentication" }
  ];

  const activeActionLabel = actionFilter === "all" ? "All Actions" : (ACTION_LABELS[actionFilter] || actionFilter);
  const activeResourceLabel = resourceOptions.find(r => r.id === resourceTypeFilter)?.name || "All Resources";

  return (
    <SafeAreaView style={s(styles.safeArea)}>
      <ScrollView contentContainerStyle={s(styles.viewportScrollCanvas)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerContainerBlock)}>
          <View style={s(styles.headerMainTitleRowAlignment)}>
            <View style={styles.flexFill}>
              <Text style={s(styles.headerTitleHeadingText)}>System Activity Logs</Text>
              <Text style={s(styles.headerSubtitleMetaDescription)}>
                Monitor all system actions and user activities across the platform.
              </Text>
            </View>
            <TouchableOpacity 
              style={s(styles.headerRefreshActionButton)} 
              onPress={syncLayoutDataDataStream}
              disabled={loading}
            >
              <RefreshCw size={14} color={activeColors?.primary || "#b45309"} style={loading ? s(styles.loadingIconRotationOpacity) : undefined} />
              <Text style={s(styles.headerRefreshButtonLabelText)}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {summary && (
          <View style={s(styles.statsSummaryGridDashboardStrip)}>
            <View style={s(styles.statMetricDataCard)}>
              <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                <FileText size={16} color={activeColors?.primary || "#b45309"} />
                <Text style={s(styles.statMetricLabelMetaText)}>Total Activities</Text>
              </View>
              <Text style={s(styles.statMetricNumericValueText)} numberOfLines={1}>
                {summary.totalCount.toLocaleString()}
              </Text>
            </View>

            <View style={s(styles.statMetricDataCard)}>
              <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                <User size={16} color={activeColors?.primary || "#b45309"} />
                <Text style={s(styles.statMetricLabelMetaText)}>Most Active</Text>
              </View>
              <Text style={s(styles.statMetricStringValueText)} numberOfLines={1}>
                {summary.topUsers[0]?.username || "N/A"}
              </Text>
            </View>

            <View style={s(styles.statMetricDataCard)}>
              <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                <Clock size={16} color={activeColors?.primary || "#b45309"} />
                <Text style={s(styles.statMetricLabelMetaText)}>Top Action</Text>
              </View>
              <Text style={s(styles.statMetricStringValueText)} numberOfLines={1}>
                {summary.actionCounts[0]?.action ? (ACTION_LABELS[summary.actionCounts[0].action] || summary.actionCounts[0].action) : "N/A"}
              </Text>
            </View>

            <View style={s(styles.statMetricDataCard)}>
              <View style={s(styles.statMetricCardHeaderWrapperRow)}>
                <Filter size={16} color={activeColors?.primary || "#b45309"} />
                <Text style={s(styles.statMetricLabelMetaText)}>Resource Types</Text>
              </View>
              <Text style={s(styles.statMetricNumericValueText)} numberOfLines={1}>
                {summary.resourceTypeCounts.length}
              </Text>
            </View>
          </View>
        )}

        <View style={s(styles.sectionModuleCardFrame)}>
          <Text style={s(styles.sectionModuleTitleHeading)}>Users Activity</Text>
          
          {usersLoading ? (
            <ActivityIndicator size="small" color={activeColors?.primary || "#b45309"} style={s(styles.loaderInlineSpacing)} />
          ) : (
            <View style={s(styles.userSelectorWrapperFlowContainer)}>
              {[
                { title: "Admins", data: admins },
                { title: "Managers", data: managers },
                { title: "Employees", data: employees }
              ].map((group) => {
                if (group.data.length === 0) return null;
                return (
                  <View key={group.title} style={s(styles.userCategoryBlockGroup)}>
                    <Text style={s(styles.userCategoryGroupSectionTitle)}>{group.title}</Text>
                    <View style={s(styles.userAvatarGridRowFlexLayout)}>
                      {group.data.map((u) => {
                        const isTargetSelected = selectedUserId === u.id;
                        return (
                          <TouchableOpacity
                            key={u.id}
                            style={[
                              s(styles.userSelectionButtonAnchor),
                              isTargetSelected ? s(styles.userSelectionActiveBorder) : s(styles.userSelectionInactiveBorder)
                            ]}
                            activeOpacity={0.7}
                            onPress={() => selectUser(u.id)}
                          >
                            <View style={[s(styles.userIconWrapperBoxCircle), isTargetSelected && s(styles.userIconActiveWrapperBg)]}>
                              <User size={14} color={isTargetSelected ? "#ffffff" : (activeColors?.primary || "#b45309")} />
                            </View>
                            <View style={s(styles.userMetadataTextFlexBlock)}>
                              <Text style={s(styles.userProfileFullNameDisplayLabelText)} numberOfLines={1}>{u.name || u.username}</Text>
                              <Text style={s(styles.userProfileSystemUniqueUsernameText)} numberOfLines={1}>{u.email || u.username || 'No Email'}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              <View style={s(styles.userSelectionActionStripRowButtons)}>
                <TouchableOpacity 
                  style={s(styles.pillContextActionControlWellButton)}
                  disabled={!selectedUserId}
                  onPress={() => {
                    setDateFrom(todayIso);
                    setDateTo(todayIso);
                    setCurrentPage(1);
                  }}
                >
                  <Calendar size={12} color={activeColors?.textSecondary || "#475569"} style={s(styles.marginRightIconPadding)} />
                  <Text style={s(styles.pillContextActionControlWellButtonText)}>Today</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={s(styles.pillContextActionControlWellButton)}
                  disabled={!selectedUserId}
                  onPress={() => {
                    setDateFrom("");
                    setDateTo("");
                    setCurrentPage(1);
                  }}
                >
                  <Text style={s(styles.pillContextActionControlWellButtonText)}>All Time</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[s(styles.pillContextActionControlWellButton), s(styles.pillContextDangerBorderAlertClearBg)]}
                  onPress={() => {
                    setSelectedUserId("");
                    setDateFrom("");
                    setDateTo("");
                    setCurrentPage(1);
                  }}
                >
                  <Text style={[s(styles.pillContextActionControlWellButtonText), s(styles.pillContextDangerText)]}>Clear Selection</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={s(styles.sectionModuleCardFrame)}>
          <View style={s(styles.filterSearchBoxInputComponentWrapper)}>
            <Search size={16} color={activeColors?.textSecondary || "#94a3b8"} style={s(styles.marginRightIconPadding)} />
            <TextInput
              style={s(styles.filterSearchInputTextNativeField)}
              placeholder="Search by username..."
              placeholderTextColor={activeColors?.textSecondary || "#94a3b8"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              editable={!selectedUserId}
            />
          </View>

          <View style={s(styles.filterMenuDropdownsGridArrangementRow)}>
            <TouchableOpacity 
              style={s(styles.dropdownMenuInteractiveTriggerSelectorCard)} 
              activeOpacity={0.7}
              onPress={() => setActivePicker("action")}
            >
              <Text style={s(styles.dropdownMenuSelectionDisplayValueText)} numberOfLines={1}>{activeActionLabel}</Text>
              <ChevronDown size={14} color={activeColors?.textSecondary || "#64748b"} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={s(styles.dropdownMenuInteractiveTriggerSelectorCard)} 
              activeOpacity={0.7}
              onPress={() => setActivePicker("resource")}
            >
              <Text style={s(styles.dropdownMenuSelectionDisplayValueText)} numberOfLines={1}>{activeResourceLabel}</Text>
              <ChevronDown size={14} color={activeColors?.textSecondary || "#64748b"} />
            </TouchableOpacity>
          </View>

          <View style={s(styles.dateRangePickerFlexLineRow)}>
            <View style={s(styles.dateRangeBoundInputCellBox)}>
              <Text style={s(styles.dateRangeFieldInlineDescriptorLabel)}>From:</Text>
              <TextInput
                style={s(styles.dateRangeNativeTextInputField)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={activeColors?.textSecondary || "#94a3b8"}
                value={dateFrom}
                onChangeText={setDateFrom}
              />
            </View>
            <View style={s(styles.dateRangeBoundInputCellBox)}>
              <Text style={s(styles.dateRangeFieldInlineDescriptorLabel)}>To:</Text>
              <TextInput
                style={s(styles.dateRangeNativeTextInputField)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={activeColors?.textSecondary || "#94a3b8"}
                value={dateTo}
                onChangeText={setDateTo}
              />
            </View>
          </View>

          <TouchableOpacity style={s(styles.masterFilterClearStripButtonAnchor)} onPress={clearFilters}>
            <X size={14} color="#dc2626" style={s(styles.marginRightIconPadding)} />
            <Text style={s(styles.masterFilterClearStripButtonText)}>Clear All Criteria Filters</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={s(styles.errorBannerFrameworkContainerBlock)}>
            <Text style={s(styles.errorBannerTextContentDescription)}>{error}</Text>
          </View>
        )}

        <View style={[s(styles.sectionModuleCardFrame), s(styles.noPaddingLayoutOverrider)]}>
          <View style={s(styles.registrySectionHeadingStripBlockHeader)}>
            <Text style={s(styles.registrySectionHeadingTextTitle)}>Activity Log ({totalItems.toLocaleString()} total)</Text>
          </View>

          {loading && logs.length === 0 ? (
            <ActivityIndicator size="large" color={activeColors?.primary || "#b45309"} style={s(styles.loaderCentralSpacingCanvas)} />
          ) : logs.length === 0 ? (
            <View style={s(styles.emptyRegistryFallbackGraphicLayoutCenter)}>
              <FileText size={40} color={activeColors?.textSecondary || "#cbd5e1"} style={s(styles.emptyRegistryCentralIconSpacing)} />
              <Text style={s(styles.emptyRegistryPrimaryMessageHeadingText)}>No activity logs found</Text>
              <Text style={s(styles.emptyRegistrySecondaryMessageParagraphText)}>
                Try adjusting your filters or wait for new architectural events.
              </Text>
            </View>
          ) : (
            <View style={s(styles.registryRowItemsVerticalStackDivider)}>
              {logs.map((log) => {
                const badgeStyle = getActionStyles(log.action);
                return (
                  <View key={log.id} style={s(styles.registryItemRowCellContainerTile)}>
                    <View style={s(styles.registryRowCellTopMetaBarFlexLine)}>
                      <View style={s(styles.registryActorIdentityFlexWrapperRow)}>
                        <User size={14} color={activeColors?.textSecondary || "#64748b"} style={s(styles.marginRightIconPadding)} />
                        <View style={styles.flexFill}>
                          <Text style={s(styles.registryActorUsernameBoldHeaderText)}>{log.actorUsername || 'Unknown'}</Text>
                          <Text style={s(styles.registryActorRoleSubtitleText)}>{log.actorRole}</Text>
                        </View>
                      </View>
                      <View style={[s(styles.actionPillBadgeFrameBlock), { backgroundColor: badgeStyle.bg }]}>
                        <Text style={[s(styles.actionPillBadgeInnerText), { color: badgeStyle.text }]}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Text>
                      </View>
                    </View>

                    <View style={s(styles.registryRowCellMiddlePayloadDisplayBlock)}>
                      <Text style={s(styles.resourceIconEmojiIndicatorGraphic)}>
                        {RESOURCE_ICONS[log.resourceType] || "📄"}
                      </Text>
                      <View style={s(styles.resourceMetadataLabelsTextColumn)}>
                        <Text style={s(styles.resourceTypeReadableLabelText)}>
                          {log.resourceType.replace(/-/g, " ")}
                        </Text>
                        {log.resourceName ? (
                          <Text style={s(styles.resourceUniqueIdentitySystemNameText)} numberOfLines={1}>
                            {log.resourceName}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {log.description ? (
                      <Text style={s(styles.resourceDescriptionParagraphBlockText)} numberOfLines={3}>
                        {log.description}
                      </Text>
                    ) : null}

                    <View style={s(styles.registryRowCellFooterChronologyBarLine)}>
                      <Text style={s(styles.chronologyTimestampLabelText)}>{formatDate(log.createdAt)}</Text>
                      <View style={s(styles.ipNetworkAddressCodePillBadge)}>
                        <Text style={s(styles.ipNetworkAddressInnerTextString)}>{formatIpAddress(log.ipAddress)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {totalPages > 1 && (
            <View style={s(styles.paginationControlsFooterBarLayoutBlock)}>
              <TouchableOpacity 
                style={[s(styles.paginationArrowStepBoundaryButton), currentPage === 1 && s(styles.paginationArrowDisabledOpacity)]}
                disabled={currentPage === 1 || loading}
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                <Text style={s(styles.paginationArrowStepLabelText)}>Previous</Text>
              </TouchableOpacity>
              <Text style={s(styles.paginationIndexDisplayIndicatorLabelText)}>
                Page {currentPage} of {totalPages}
              </Text>
              <TouchableOpacity 
                style={[s(styles.paginationArrowStepBoundaryButton), currentPage === totalPages && s(styles.paginationArrowDisabledOpacity)]}
                disabled={currentPage === totalPages || loading}
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                <Text style={s(styles.paginationArrowStepLabelText)}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>

      <Modal animationType="slide" transparent={true} visible={activePicker !== null} onRequestClose={() => setActivePicker(null)}>
        <View style={s(styles.pickerOverlayModalSheetBlurWindow)}>
          <View style={s(styles.pickerContentWindowCardSurface)}>
            <View style={s(styles.pickerContentHeaderBarTopRow)}>
              <Text style={s(styles.pickerContentHeaderTitleHeadingText)}>
                {activePicker === "action" ? "Select Action Type" : "Select Resource Module"}
              </Text>
              <TouchableOpacity onPress={() => setActivePicker(null)} style={s(styles.pickerCloseCrossTouchTargetBoundary)}>
                <X size={16} color={activeColors?.textSecondary || "#475569"} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={s(styles.pickerSelectionItemsScrollCanvasList)} keyboardShouldPersistTaps="handled">
              {activePicker === "action" ? (
                <>
                  <TouchableOpacity
                    style={s(styles.pickerSelectionOptionRowAnchorTile)}
                    onPress={() => {
                      setActionFilter("all");
                      setActivePicker(null);
                    }}
                  >
                    <Text style={[s(styles.pickerSelectionOptionValueLabelString), actionFilter === "all" && s(styles.pickerSelectionActiveGoldText)]}>All Actions</Text>
                  </TouchableOpacity>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <TouchableOpacity
                      key={key}
                      style={s(styles.pickerSelectionOptionRowAnchorTile)}
                      onPress={() => {
                        setActionFilter(key);
                        setActivePicker(null);
                      }}
                    >
                      <Text style={[s(styles.pickerSelectionOptionValueLabelString), actionFilter === key && s(styles.pickerSelectionActiveGoldText)]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                resourceOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={s(styles.pickerSelectionOptionRowAnchorTile)}
                    onPress={() => {
                      setResourceTypeFilter(option.id);
                      setActivePicker(null);
                    }}
                  >
                    <Text style={[s(styles.pickerSelectionOptionValueLabelString), resourceTypeFilter === option.id && s(styles.pickerSelectionActiveGoldText)]}>{option.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors?.background || "#f8fafc",
  },
  flexFill: {
    flex: 1,
  },
  viewportScrollCanvas: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerContainerBlock: {
    paddingVertical: 16,
  },
  headerMainTitleRowAlignment: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerTitleHeadingText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors?.text || "#0f172a",
    letterSpacing: -0.5,
  },
  headerSubtitleMetaDescription: {
    fontSize: 12,
    color: colors?.textSecondary || "#64748b",
    lineHeight: 16,
    marginTop: 2,
    maxWidth: "90%",
  },
  headerRefreshActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors?.surface === "#ffffff" ? "#fffbeb" : colors?.surface,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  loadingIconRotationOpacity: {
    opacity: 0.5,
  },
  headerRefreshButtonLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors?.primary || "#b45309",
  },
  statsSummaryGridDashboardStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  statMetricDataCard: {
    backgroundColor: colors?.surface || "#ffffff",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    width: "48.5%",
    minHeight: 74,
    justifyContent: "space-between",
  },
  statMetricCardHeaderWrapperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statMetricLabelMetaText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors?.textSecondary || "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  statMetricNumericValueText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors?.text || "#0f172a",
    marginTop: 4,
  },
  statMetricStringValueText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors?.text || "#1e293b",
    marginTop: 4,
  },
  sectionModuleCardFrame: {
    backgroundColor: colors?.surface || "#ffffff",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  noPaddingLayoutOverrider: {
    padding: 0,
    overflow: "hidden",
  },
  sectionModuleTitleHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: colors?.text || "#0f172a",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  loaderInlineSpacing: {
    paddingVertical: 12,
  },
  loaderCentralSpacingCanvas: {
    paddingVertical: 40,
  },
  userSelectorWrapperFlowContainer: {
    width: "100%",
  },
  userCategoryBlockGroup: {
    marginBottom: 12,
  },
  userCategoryGroupSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors?.textSecondary || "#64748b",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  userAvatarGridRowFlexLayout: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  userSelectionButtonAnchor: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors?.background || "#f8fafc",
  },
  userSelectionInactiveBorder: {
    borderColor: colors?.border || "#e2e8f0",
  },
  userSelectionActiveBorder: {
    borderColor: colors?.primary || "#b45309",
    backgroundColor: colors?.surface === "#ffffff" ? "#fffbeb" : colors?.surface,
  },
  userIconWrapperBoxCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors?.background || "#fffbeb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  userIconActiveWrapperBg: {
    backgroundColor: colors?.primary || "#b45309",
  },
  userMetadataTextFlexBlock: {
    flex: 1,
  },
  userProfileFullNameDisplayLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors?.text || "#1e293b",
  },
  userProfileSystemUniqueUsernameText: {
    fontSize: 10,
    color: colors?.textSecondary || "#64748b",
    marginTop: 1,
  },
  userSelectionActionStripRowButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    marginTop: 14,
  },
  pillContextActionControlWellButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    backgroundColor: colors?.background || "#f8fafc",
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pillContextActionControlWellButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors?.text || "#475569",
  },
  pillContextDangerBorderAlertClearBg: {
    borderColor: "#fee2e2",
    backgroundColor: "#fff5f5",
  },
  pillContextDangerText: {
    color: "#dc2626",
  },
  marginRightIconPadding: {
    marginRight: 6,
  },
  filterSearchBoxInputComponentWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors?.background || "#f8fafc",
    marginBottom: 10,
  },
  filterSearchInputTextNativeField: {
    flex: 1,
    fontSize: 13,
    color: colors?.text || "#0f172a",
    padding: 0,
  },
  filterMenuDropdownsGridArrangementRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  dropdownMenuInteractiveTriggerSelectorCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors?.background || "#f8fafc",
  },
  dropdownMenuSelectionDisplayValueText: {
    fontSize: 13,
    color: colors?.text || "#1e293b",
    fontWeight: "500",
  },
  dateRangePickerFlexLineRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  dateRangeBoundInputCellBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors?.background || "#f8fafc",
  },
  dateRangeFieldInlineDescriptorLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors?.textSecondary || "#64748b",
    marginRight: 6,
  },
  dateRangeNativeTextInputField: {
    flex: 1,
    fontSize: 13,
    color: colors?.text || "#0f172a",
    padding: 0,
  },
  masterFilterClearStripButtonAnchor: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  masterFilterClearStripButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#dc2626",
  },
  errorBannerFrameworkContainerBlock: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  errorBannerTextContentDescription: {
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "500",
  },
  registrySectionHeadingStripBlockHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    backgroundColor: colors?.background || "#f8fafc",
  },
  registrySectionHeadingTextTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors?.text || "#0f172a",
  },
  emptyRegistryFallbackGraphicLayoutCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyRegistryCentralIconSpacing: {
    marginBottom: 12,
  },
  emptyRegistryPrimaryMessageHeadingText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors?.text || "#1e293b",
    marginBottom: 4,
  },
  emptyRegistrySecondaryMessageParagraphText: {
    fontSize: 12,
    color: colors?.textSecondary || "#64748b",
    textAlign: "center",
    lineHeight: 16,
  },
  registryRowItemsVerticalStackDivider: {
    width: "100%",
  },
  registryItemRowCellContainerTile: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  registryRowCellTopMetaBarFlexLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  registryActorIdentityFlexWrapperRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  registryActorUsernameBoldHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors?.text || "#0f172a",
  },
  registryActorRoleSubtitleText: {
    fontSize: 11,
    color: colors?.textSecondary || "#64748b",
    marginTop: 1,
    textTransform: "capitalize",
  },
  actionPillBadgeFrameBlock: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  actionPillBadgeInnerText: {
    fontSize: 10,
    fontWeight: "700",
  },
  registryRowCellMiddlePayloadDisplayBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors?.background || "#f8fafc",
    padding: 10,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  resourceIconEmojiIndicatorGraphic: {
    fontSize: 16,
    marginRight: 10,
  },
  resourceMetadataLabelsTextColumn: {
    flex: 1,
  },
  resourceTypeReadableLabelText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors?.textSecondary || "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  resourceUniqueIdentitySystemNameText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors?.text || "#334155",
    marginTop: 1,
  },
  resourceDescriptionParagraphBlockText: {
    fontSize: 13,
    color: colors?.text || "#334155",
    lineHeight: 18,
    marginTop: 10,
  },
  registryRowCellFooterChronologyBarLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  chronologyTimestampLabelText: {
    fontSize: 11,
    color: colors?.textSecondary || "#94a3b8",
  },
  ipNetworkAddressCodePillBadge: {
    backgroundColor: colors?.background || "#f1f5f9",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  ipNetworkAddressInnerTextString: {
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: colors?.textSecondary || "#64748b",
  },
  paginationControlsFooterBarLayoutBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: colors?.background || "#f8fafc",
  },
  paginationArrowStepBoundaryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
    borderRadius: 6,
    backgroundColor: colors?.surface || "#ffffff",
  },
  paginationArrowDisabledOpacity: {
    opacity: 0.5,
  },
  paginationArrowStepLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors?.text || "#475569",
  },
  paginationIndexDisplayIndicatorLabelText: {
    fontSize: 12,
    color: colors?.textSecondary || "#64748b",
    fontWeight: "500",
  },
  pickerOverlayModalSheetBlurWindow: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  pickerContentWindowCardSurface: {
    backgroundColor: colors?.surface || "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.7,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
  },
  pickerContentHeaderBarTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors?.border || "#e2e8f0",
  },
  pickerContentHeaderTitleHeadingText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors?.text || "#0f172a",
  },
  pickerCloseCrossTouchTargetBoundary: {
    padding: 4,
  },
  pickerSelectionItemsScrollCanvasList: {
    paddingHorizontal: 16,
  },
  pickerSelectionOptionRowAnchorTile: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: colors?.border || "#f1f5f9",
  },
  pickerSelectionOptionValueLabelString: {
    fontSize: 14,
    color: colors?.text || "#334155",
    fontWeight: "500",
  },
  pickerSelectionActiveGoldText: {
    color: colors?.primary || "#b45309",
    fontWeight: "700",
  },
});