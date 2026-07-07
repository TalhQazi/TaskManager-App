import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Image
} from "react-native";
import { ExternalLink, Loader2, RefreshCw, Search, ShieldAlert } from "lucide-react-native";
import Colors from "@/constants/colors";

const DEFAULT_PAGE_SIZE = 10;
const BASE_PATH = "/api/external/maintenance";

// Expo Cross-Platform Environment Variable Handlers
const UPH_BASE_URL = String(
  process.env.EXPO_PUBLIC_UPH_MAINTENANCE_API_URL ||
  process.env.EXPO_PUBLIC_MAINTENANCE_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  ""
).trim();

const UPH_API_KEY = String(
  process.env.EXPO_PUBLIC_UPH_MAINTENANCE_API_KEY ||
  process.env.EXPO_PUBLIC_MAINTENANCE_API_KEY ||
  ""
).trim();

type RequestStatus = "new" | "in-progress" | "completed" | "closed" | string;

interface MaintenanceRequest {
  id?: string;
  _id?: string;
  createdAt?: string;
  updatedAt?: string;
  statusUpdatedAt?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  issueType?: string;
  entryPermission?: string;
  description?: string;
  status?: RequestStatus;
  adminComment?: string;
  comment?: string;
  attachmentUrl?: string;
  attachmentKey?: string;
  commentAttachmentUrl?: string;
  commentAttachmentKey?: string;
  mediaUrl?: string;
  media?: string | { url?: string };
  [key: string]: unknown;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ListResponse {
  requests?: MaintenanceRequest[];
  pagination?: Partial<PaginationState>;
}

const STATUS_FILTERS = ["all", "new", "in-progress", "completed", "closed"];
const UPDATE_STATUSES = ["in-progress", "completed", "closed", "new"];

function getRequestId(item: MaintenanceRequest) {
  return String(item._id || item.id || "").trim();
}

function textOrDash(value?: string) {
  const normalized = String(value || "").trim();
  return normalized || "—";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function getStatusBadgeStyle(status?: string) {
  switch (status) {
    case "completed":
      return { container: styles.bgEmeraldMuted, text: styles.emeraldText };
    case "closed":
      return { container: styles.bgSlateMuted, text: styles.slateText };
    case "in-progress":
      return { container: styles.bgAmberMuted, text: styles.amberText };
    default:
      return { container: styles.bgSkyMuted, text: styles.skyText };
  }
}

function readJsonSafe<T>(text: string): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function buildUrl(path = "", params?: URLSearchParams) {
  const base = UPH_BASE_URL.replace(/\/$/, "");
  const suffix = path ? `/${encodeURIComponent(path)}` : "";
  const query = params?.toString();
  return `${base}${BASE_PATH}${suffix}${query ? `?${query}` : ""}`;
}

function buildHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  if (UPH_API_KEY) {
    headers.set("Authorization", `Bearer ${UPH_API_KEY}`);
    headers.set("x-api-key", UPH_API_KEY);
  }
  return headers;
}

function extractTenantAttachmentUrl(item: MaintenanceRequest | null) {
  if (!item) return "";
  if (typeof item.attachmentUrl === "string") return item.attachmentUrl;
  if (typeof item.mediaUrl === "string") return item.mediaUrl;
  if (typeof item.media === "string") return item.media;
  if (item.media && typeof item.media === "object" && typeof item.media.url === "string") {
    return item.media.url;
  }
  return "";
}

const UphMaintenance: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  const [nextStatus, setNextStatus] = useState("in-progress");
  const [adminComment, setAdminComment] = useState("");
  const [localAttachmentName, setLocalAttachmentName] = useState<string | null>(null);

  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const hasConfig = Boolean(UPH_BASE_URL);
  const hasApiKey = Boolean(UPH_API_KEY);

  const fetchList = useCallback(async () => {
    if (!hasConfig) {
      setListError("Missing UPH API base URL configuration.");
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
    setListError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (appliedSearch) params.set("search", appliedSearch);

      const response = await fetch(buildUrl("", params), {
        method: "GET",
        headers: buildHeaders(),
      });

      const text = await response.text();
      const payload = readJsonSafe<ListResponse>(text);

      if (!response.ok) {
        throw new Error("Failed to fetch operational queue data.");
      }

      const nextItems = Array.isArray(payload?.requests) ? payload?.requests : [];
      const nextPagination = payload?.pagination || {};

      setRequests(nextItems);
      setPagination({
        page: Number(nextPagination.page || page),
        pageSize: Number(nextPagination.pageSize || DEFAULT_PAGE_SIZE),
        total: Number(nextPagination.total || nextItems.length),
        totalPages: Number(nextPagination.totalPages || 1),
      });

      setSelectedRequestId((currentId) => {
        const selectedStillExists = nextItems.some((item) => getRequestId(item) === currentId);
        if (!currentId || !selectedStillExists) {
          return getRequestId(nextItems[0] || {});
        }
        return currentId;
      });
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Failed to fetch requests.");
      setRequests([]);
    } finally {
      setLoadingList(false);
    }
  }, [appliedSearch, hasConfig, page, statusFilter]);

  const fetchDetail = useCallback(async (requestId: string) => {
    if (!requestId || !hasConfig) {
      setSelectedRequest(null);
      return;
    }

    setLoadingDetail(true);
    setDetailError(null);

    try {
      const response = await fetch(buildUrl(requestId), {
        method: "GET",
        headers: buildHeaders(),
      });

      const text = await response.text();
      const payload = readJsonSafe<MaintenanceRequest>(text);

      if (!response.ok || !payload) {
        throw new Error("Failed to pull detailed item data payload.");
      }

      setSelectedRequest(payload);
      setNextStatus(String(payload.status || "in-progress"));
      setAdminComment(String(payload.adminComment || payload.comment || ""));
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to fetch request details.");
      setSelectedRequest(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [hasConfig]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!selectedRequestId) {
      setSelectedRequest(null);
      return;
    }
    fetchDetail(selectedRequestId);
  }, [fetchDetail, selectedRequestId]);

  const onSearchSubmit = () => {
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const onUpdateRequest = async () => {
    if (!selectedRequestId || !hasConfig) return;

    setUpdating(true);
    setDetailError(null);

    try {
      const response = await fetch(buildUrl(selectedRequestId), {
        method: "PATCH",
        headers: buildHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          status: nextStatus,
          comment: adminComment.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to update maintenance request.");

      Alert.alert("Success", "Maintenance request updated successfully.");
      setLocalAttachmentName(null);
      await fetchList();
      await fetchDetail(selectedRequestId);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : "Failed to update request.");
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenLink = async (url: string) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Cannot open attachment destination URL.");
    }
  };

  const tenantAttachmentUrl = useMemo(() => extractTenantAttachmentUrl(selectedRequest), [selectedRequest]);
  const hasTenantAttachment = Boolean(tenantAttachmentUrl || selectedRequest?.attachmentKey);

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Top Header Panel Section */}
      <View style={styles.headerLayoutBlock}>
        <View style={styles.brandingRow}>
          <Image source={{ uri: "https://via.placeholder.com/44" }} style={styles.brandingLogo} />
          <View>
            <Text style={styles.headerMainTitle}>Atlas Property Holding</Text>
            <Text style={styles.headerSubtitleText}>Maintenance Requests</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.actionRefreshButton} 
          onPress={() => { fetchList(); if (selectedRequestId) fetchDetail(selectedRequestId); }}
        >
          <RefreshCw size={12} color="#18181b" style={styles.inlineIconSpacing} />
          <Text style={styles.refreshBtnLabel}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* API Infrastructure Configuration Warning Banner */}
        {!hasApiKey && (
          <View style={styles.warningBannerContainer}>
            <ShieldAlert size={16} color="#9a3412" style={styles.inlineIconSpacing} />
            <Text style={styles.warningBannerText}>Missing API Authentication Security Keys</Text>
          </View>
        )}

        {/* Filter & Searching Management Dashboard Card */}
        <View style={styles.dashboardCardBlock}>
          <Text style={styles.cardSectionTitle}>Maintenance Filtering Queue</Text>
          
          <View style={styles.formInputGroupField}>
            <Text style={styles.fieldInputLabelText}>Status Selection Filter</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectChipRow}>
              {STATUS_FILTERS.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => { setStatusFilter(status); setPage(1); }}
                  style={[styles.selectorChipBtn, statusFilter === status && styles.selectorChipBtnActive]}
                >
                  <Text style={[styles.selectorChipText, statusFilter === status && styles.selectorChipTextActive]}>
                    {status === "all" ? "ALL STATUSES" : status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formInputGroupField}>
            <Text style={styles.fieldInputLabelText}>Search Tenant Name</Text>
            <View style={styles.searchBarInlineFrame}>
              <TextInput
                style={styles.searchNativeInputComponent}
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search by tenant parameter name..."
                placeholderTextColor="#a1a1aa"
              />
              <TouchableOpacity style={styles.searchActionSubmitBtn} onPress={onSearchSubmit}>
                <Search size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Master Registry List Database Output Card */}
        <View style={styles.dashboardCardBlock}>
          <Text style={styles.cardSectionTitle}>Active Requests Overview Matrix</Text>
          <Text style={styles.cardSectionSubtitle}>Page {pagination.page} of {Math.max(pagination.totalPages, 1)} • {pagination.total} records</Text>

          {loadingList ? (
            <View style={styles.loaderCenterBlock}>
              <ActivityIndicator size="small" color="#0284c7" />
            </View>
          ) : listError ? (
            <Text style={styles.errorMessageLayoutText}>{listError}</Text>
          ) : requests.length === 0 ? (
            <Text style={styles.emptyMessageLayoutText}>No active maintenance requests discovered in registry.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableHorizontalWrapper}>
              <View style={styles.tableMatrixGrid}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.thText, { width: 110 }]}>Tenant Name</Text>
                  <Text style={[styles.thText, { width: 110 }]}>Issue Type</Text>
                  <Text style={[styles.thText, { width: 95 }]}>Status</Text>
                  <Text style={[styles.thText, { width: 110 }]}>Created Date</Text>
                </View>

                {requests.map((item) => {
                  const requestId = getRequestId(item);
                  const isActive = selectedRequestId === requestId;
                  const badgeStyle = getStatusBadgeStyle(String(item.status || "new"));

                  return (
                    <TouchableOpacity
                      key={requestId || `${item.name}-${item.createdAt}`}
                      onPress={() => setSelectedRequestId(requestId)}
                      style={[styles.trRow, isActive && styles.trRowSelectedActive]}
                    >
                      <Text numberOfLines={1} style={[styles.bodyCellBoldText, { width: 110 }, isActive && styles.activeRowText]}>{textOrDash(item.name)}</Text>
                      <Text numberOfLines={1} style={[styles.bodyCellNormalText, { width: 110 }]}>{textOrDash(item.issueType)}</Text>
                      <View style={{ width: 95 }}>
                        <View style={[styles.statusBadgeFrame, badgeStyle.container]}>
                          <Text style={[styles.badgeLabelText, badgeStyle.text]}>{item.status || "new"}</Text>
                        </View>
                      </View>
                      <Text style={[styles.bodyCellMutedText, { width: 110 }]}>{formatDate(item.createdAt)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Table Directory Native Pagination Controllers */}
          <View style={styles.tableNavPaginationRow}>
            <TouchableOpacity 
              style={[styles.pageNavBtn, page <= 1 && styles.pageNavBtnDisabled]}
              disabled={loadingList || page <= 1}
              onPress={() => setPage((v) => Math.max(1, v - 1))}
            >
              <Text style={styles.pageNavBtnText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pageTrackerDisplayIndicator}>Page {pagination.page}</Text>
            <TouchableOpacity 
              style={[styles.pageNavBtn, page >= Math.max(pagination.totalPages, 1) && styles.pageNavBtnDisabled]}
              disabled={loadingList || page >= Math.max(pagination.totalPages, 1)}
              onPress={() => setPage((v) => Math.min(Math.max(pagination.totalPages, 1), v + 1))}
            >
              <Text style={styles.pageNavBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Detail Inspection and Form Submission Action Hub Panel */}
        <View style={styles.dashboardCardBlock}>
          <Text style={styles.cardSectionTitle}>Ticket Diagnostics & Modification Hub</Text>
          
          {loadingDetail ? (
            <View style={styles.loaderCenterBlock}>
              <ActivityIndicator size="small" color="#0284c7" />
            </View>
          ) : !selectedRequest ? (
            <Text style={styles.emptyMessageLayoutText}>Select an inventory request profile row above to perform processing actions.</Text>
          ) : (
            <View style={styles.detailsContentContainerBlock}>
              
              {/* Structured Metadata Diagnostics Readout Block */}
              <View style={styles.metaDiagnosticsGridPlate}>
                <View style={styles.metaLabelValueTupleRow}><Text style={styles.metaLabelText}>Ticket ID</Text><Text selectable style={styles.metaValueText}>{textOrDash(getRequestId(selectedRequest))}</Text></View>
                <View style={styles.metaLabelValueTupleRow}><Text style={styles.metaLabelText}>Tenant Contact</Text><Text style={styles.metaValueText}>{textOrDash(selectedRequest.name)}</Text></View>
                <View style={styles.metaLabelValueTupleRow}><Text style={styles.metaLabelText}>Phone Base</Text><Text style={styles.metaValueText}>{textOrDash(selectedRequest.phone)}</Text></View>
                <View style={styles.metaLabelValueTupleRow}><Text style={styles.metaLabelText}>Email Address</Text><Text style={styles.metaValueText}>{textOrDash(selectedRequest.email)}</Text></View>
                <View style={[styles.metaLabelValueTupleRow, { borderBottomWidth: 0 }]}><Text style={styles.metaLabelText}>Address Destination</Text><Text style={styles.metaValueText}>{textOrDash(selectedRequest.address)}</Text></View>
              </View>

              <View style={styles.metaDiagnosticsGridPlate}>
                <View style={styles.metaLabelValueTupleRow}><Text style={styles.metaLabelText}>Issue Allocation</Text><Text style={styles.metaValueText}>{textOrDash(selectedRequest.issueType)}</Text></View>
                <View style={styles.metaLabelValueTupleRow}><Text style={styles.metaLabelText}>Entry Permission</Text><Text style={styles.metaValueText}>{textOrDash(selectedRequest.entryPermission)}</Text></View>
                <View style={styles.metaLabelValueTupleRow}><Text style={styles.metaLabelText}>Logs Created</Text><Text style={styles.metaValueText}>{formatDate(selectedRequest.createdAt)}</Text></View>
                <View style={[styles.metaLabelValueTupleRow, { borderBottomWidth: 0 }]}><Text style={styles.metaLabelText}>Logs Mutated</Text><Text style={styles.metaValueText}>{formatDate(selectedRequest.updatedAt)}</Text></View>
              </View>

              {/* Descriptions Core Textareas Display Panels */}
              <View style={styles.textOutputDisplayBoxFrame}>
                <Text style={styles.textOutputDisplayBoxTitle}>Incident Manifest Description</Text>
                <Text style={styles.textOutputDisplayBoxBodyText}>{textOrDash(selectedRequest.description)}</Text>
              </View>

              <View style={styles.textOutputDisplayBoxFrame}>
                <Text style={styles.textOutputDisplayBoxTitle}>Existing Internal Admin Commentary</Text>
                <Text style={styles.textOutputDisplayBoxBodyText}>{textOrDash(selectedRequest.adminComment)}</Text>
              </View>

              {/* Secure Media Attachment External Linking System */}
              {hasTenantAttachment && (
                <View style={styles.attachmentAccessFrameBox}>
                  <Text style={styles.textOutputDisplayBoxTitle}>Tenant Diagnostic Media Documentation Attachment</Text>
                  {selectedRequest?.attachmentKey && <Text style={styles.attachmentKeyDetailsLabel}>Key Hash Identification: {String(selectedRequest.attachmentKey)}</Text>}
                  {tenantAttachmentUrl && (
                    <TouchableOpacity style={styles.attachmentActivationBtnLink} onPress={() => handleOpenLink(tenantAttachmentUrl)}>
                      <ExternalLink size={12} color="#0284c7" style={styles.inlineIconSpacing} />
                      <Text style={styles.attachmentActivationBtnLinkLabelText}>Launch Document Stream</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* State Processing Form Input Controls Layout */}
              <View style={styles.actionFormMutationWrapperContainer}>
                <View style={styles.formInputGroupField}>
                  <Text style={styles.fieldInputLabelText}>State Transition Pipeline Pipeline *</Text>
                  <View style={styles.inlineChoiceSelectorGridRow}>
                    {UPDATE_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setNextStatus(status)}
                        style={[styles.choiceGridSelectorBtn, nextStatus === status && styles.choiceGridSelectorBtnActive]}
                      >
                        <Text style={[styles.choiceGridSelectorText, nextStatus === status && styles.choiceGridSelectorTextActive]}>{status.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.formInputGroupField}>
                  <Text style={styles.fieldInputLabelText}>Append Internal Execution Notes</Text>
                  <TextInput
                    style={styles.formNativeTextAreaComponent}
                    value={adminComment}
                    onChangeText={setAdminComment}
                    placeholder="Provide execution details regarding state modifications..."
                    placeholderTextColor="#a1a1aa"
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.formInputGroupField}>
                  <Text style={styles.fieldInputLabelText}>Upload Incident Media Documentation</Text>
                  <TouchableOpacity style={styles.nativeMockFileButtonPicker} onPress={() => setLocalAttachmentName("IMG_CAMERA_MANIFEST_CAP.JPG")}>
                    <Text style={styles.nativeMockFileButtonPickerLabelText}>
                      {localAttachmentName ? `Attached Document: ${localAttachmentName}` : "Select Device Diagnostic Asset File"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.mainActionFormSubmitTriggerBtn} disabled={updating} onPress={onUpdateRequest}>
                  {updating ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.mainActionFormSubmitTriggerBtnText}>Commit Ticket State Modificaton</Text>}
                </TouchableOpacity>

                {detailError && <Text style={styles.errorMessageLayoutText}>{detailError}</Text>}
              </View>

            </View>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: Colors.background },
  headerLayoutBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#e4e4e7" },
  brandingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandingLogo: { h: 36, w: 36, borderRadius: 10, backgroundColor: "#e4e4e7" },
  headerMainTitle: { fontSize: 15, fontWeight: "900", color: "#09090b", letterSpacing: -0.3 },
  headerSubtitleText: { fontSize: 9, color: "#71717a", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  actionRefreshButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#f4f4f5", borderStyle: "solid", borderWidth: 1, borderColor: "#e4e4e7", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  inlineIconSpacing: { marginRight: 6 },
  refreshBtnLabel: { fontSize: 10, fontWeight: "700", color: "#18181b", textTransform: "uppercase" },
  scrollContent: { padding: 14, paddingBottom: 40 },
  warningBannerContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#ffedd5", padding: 12, borderRadius: 10, marginBottom: 14 },
  warningBannerText: { fontSize: 11, fontWeight: "700", color: "#9a3412" },
  dashboardCardBlock: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 12, padding: 14, marginBottom: 16 },
  cardSectionTitle: { fontSize: 12, fontWeight: "800", color: "#09090b", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 },
  cardSectionSubtitle: { fontSize: 10, color: "#71717a", fontWeight: "500", marginBottom: 12 },
  formInputGroupField: { marginBottom: 14 },
  fieldInputLabelText: { fontSize: 9, fontWeight: "700", color: "#71717a", textTransform: "uppercase", marginBottom: 6, letterSpacing: 0.3 },
  horizontalSelectChipRow: { flexDirection: "row", paddingVertical: 2 },
  selectorChipBtn: { backgroundColor: "#f4f4f5", borderWidth: 1, borderColor: "#e4e4e7", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  selectorChipBtnActive: { borderColor: "#0284c7", backgroundColor: "rgba(2,132,199,0.04)" },
  selectorChipText: { fontSize: 9, fontWeight: "700", color: "#71717a" },
  selectorChipTextActive: { color: "#0284c7", fontWeight: "800" },
  searchBarInlineFrame: { flexDirection: "row" },
  searchNativeInputComponent: { flex: 1, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", borderTopLeftRadius: 8, borderBottomLeftRadius: 8, paddingHorizontal: 12, paddingVertical: 8, color: "#09090b", fontSize: 12 },
  searchActionSubmitBtn: { backgroundColor: "#09090b", width: 44, justifyContent: "center", alignItems: "center", borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  loaderCenterBlock: { paddingVertical: 32, alignItems: "center", justifyContent: "center" },
  errorMessageLayoutText: { color: "#b91c1c", fontSize: 11, fontWeight: "600", padding: 8, backgroundColor: "#fef2f2", borderRadius: 6, marginTop: 8 },
  emptyMessageLayoutText: { color: "#71717a", fontSize: 11, textAlign: "center", paddingVertical: 24, paddingHorizontal: 16 },
  tableHorizontalWrapper: { flexDirection: "row" },
  tableMatrixGrid: { flexDirection: "column" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f4f4f5", paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: "#e4e4e7", borderRadius: 6 },
  thText: { fontSize: 9, fontWeight: "700", color: "#71717a", textTransform: "uppercase" },
  trRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: "#f4f4f5", alignItems: "center" },
  trRowSelectedActive: { backgroundColor: "#f0f9ff", borderBottomColor: "#e0f2fe" },
  activeRowText: { color: "#0369a1" },
  bodyCellBoldText: { fontSize: 12, fontWeight: "700", color: "#18181b" },
  bodyCellNormalText: { fontSize: 12, color: "#3f3f46" },
  bodyCellMutedText: { fontSize: 11, color: "#71717a" },
  statusBadgeFrame: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: "flex-start" },
  bgEmeraldMuted: { backgroundColor: "#ecfdf5" },
  bgSlateMuted: { backgroundColor: "#f1f5f9" },
  bgAmberMuted: { backgroundColor: "#fffbec" },
  bgSkyMuted: { backgroundColor: "#f0f9ff" },
  emeraldText: { color: "#047857", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  slateText: { color: "#475569", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  amberText: { color: "#b45309", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  skyText: { color: "#0369a1", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  badgeLabelText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  tableNavPaginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, pt: 8, borderTopWidth: 1, borderColor: "#f4f4f5" },
  pageNavBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 6, backgroundColor: "#ffffff" },
  pageNavBtnDisabled: { opacity: 0.4 },
  pageNavBtnText: { fontSize: 11, color: "#27272a", fontWeight: "600" },
  pageTrackerDisplayIndicator: { fontSize: 11, color: "#71717a", fontWeight: "500" },
  detailsContentContainerBlock: { flexDirection: "column" },
  metaDiagnosticsGridPlate: { backgroundColor: "#fbfbfb", borderWidth: 1, borderColor: "#f4f4f5", borderRadius: 10, padding: 10, marginBottom: 10 },
  metaLabelValueTupleRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  metaLabelText: { fontSize: 11, color: "#71717a", fontWeight: "500" },
  metaValueText: { fontSize: 11, color: "#18181b", fontWeight: "700" },
  textOutputDisplayBoxFrame: { backgroundColor: "#f4f4f5", padding: 10, borderRadius: 8, marginBottom: 12 },
  textOutputDisplayBoxTitle: { fontSize: 9, fontWeight: "700", color: "#71717a", textTransform: "uppercase", marginBottom: 4 },
  textOutputDisplayBoxBodyText: { fontSize: 12, color: "#27272a", lineHeight: 16 },
  attachmentAccessFrameBox: { padding: 10, borderWidth: 1, borderColor: "#e0f2fe", backgroundColor: "#f0f9ff", borderRadius: 8, marginBottom: 14 },
  attachmentKeyDetailsLabel: { fontSize: 10, color: "#0369a1", marginBottom: 6 },
  attachmentActivationBtnLink: { flexDirection: "row", alignItems: "center" },
  attachmentActivationBtnLinkLabelText: { fontSize: 11, color: "#0284c7", fontWeight: "750" },
  actionFormMutationWrapperContainer: { marginTop: 6, pt: 12, borderTopWidth: 1, borderColor: "#f4f4f5" },
  inlineChoiceSelectorGridRow: { flexDirection: "row", gap: 6 },
  choiceGridSelectorBtn: { flex: 1, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  choiceGridSelectorBtnActive: { borderColor: "#09090b", backgroundColor: "#09090b" },
  choiceGridSelectorText: { fontSize: 10, fontWeight: "700", color: "#52525b" },
  choiceGridSelectorTextActive: { color: "#ffffff" },
  formNativeTextAreaComponent: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: "#09090b", fontSize: 12, textAlignVertical: "top", minHeight: 70 },
  nativeMockFileButtonPicker: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", borderStyle: "dashed", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  nativeMockFileButtonPickerLabelText: { fontSize: 11, color: "#71717a", fontWeight: "600" },
  mainActionFormSubmitTriggerBtn: { backgroundColor: "#09090b", paddingVertical: 12, borderRadius: 8, alignItems: "center", marginTop: 10 },
  mainActionFormSubmitTriggerBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" }
});

export default UphMaintenance;