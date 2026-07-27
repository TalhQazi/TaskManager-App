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
import { s, wp, hp, fs } from "@/util/styles";

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
    <SafeAreaView style={s(styles.safeContainer)}>
      {/* Top Header Panel Section */}
      <View style={s(styles.headerLayoutBlock)}>
        <View style={s(styles.brandingRow)}>
          <Image source={{ uri: "https://via.placeholder.com/44" }} style={s(styles.brandingLogo)} />
          <View>
            <Text style={s(styles.headerMainTitle)}>Atlas Property Holding</Text>
            <Text style={s(styles.headerSubtitleText)}>Maintenance Requests</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={s(styles.actionRefreshButton)} 
          onPress={() => { fetchList(); if (selectedRequestId) fetchDetail(selectedRequestId); }}
        >
          <RefreshCw size={fs(3.5)} color="#18181b" style={s(styles.inlineIconSpacing)} />
          <Text style={s(styles.refreshBtnLabel)}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s(styles.scrollContent)} showsVerticalScrollIndicator={false}>
        
        {/* API Infrastructure Configuration Warning Banner */}
        {!hasApiKey && (
          <View style={s(styles.warningBannerContainer)}>
            <ShieldAlert size={fs(4.5)} color="#9a3412" style={s(styles.inlineIconSpacing)} />
            <Text style={s(styles.warningBannerText)}>Missing API Authentication Security Keys</Text>
          </View>
        )}

        {/* Filter & Searching Management Dashboard Card */}
        <View style={s(styles.dashboardCardBlock)}>
          <Text style={s(styles.cardSectionTitle)}>Maintenance Filtering Queue</Text>
          
          <View style={s(styles.formInputGroupField)}>
            <Text style={s(styles.fieldInputLabelText)}>Status Selection Filter</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s(styles.horizontalSelectChipRow)}>
              {STATUS_FILTERS.map((status) => (
                <TouchableOpacity
                  key={status}
                  onPress={() => { setStatusFilter(status); setPage(1); }}
                  style={s([styles.selectorChipBtn, statusFilter === status && styles.selectorChipBtnActive])}
                >
                  <Text style={s([styles.selectorChipText, statusFilter === status && styles.selectorChipTextActive])}>
                    {status === "all" ? "ALL STATUSES" : status.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={s(styles.formInputGroupField)}>
            <Text style={s(styles.fieldInputLabelText)}>Search Tenant Name</Text>
            <View style={s(styles.searchBarInlineFrame)}>
              <TextInput
                style={s(styles.searchNativeInputComponent)}
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Search by tenant parameter name..."
                placeholderTextColor="#a1a1aa"
              />
              <TouchableOpacity style={s(styles.searchActionSubmitBtn)} onPress={onSearchSubmit}>
                <Search size={fs(3.8)} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Master Registry List Database Output Card */}
        <View style={s(styles.dashboardCardBlock)}>
          <Text style={s(styles.cardSectionTitle)}>Active Requests Overview Matrix</Text>
          <Text style={s(styles.cardSectionSubtitle)}>Page {pagination.page} of {Math.max(pagination.totalPages, 1)} • {pagination.total} records</Text>

          {loadingList ? (
            <View style={s(styles.loaderCenterBlock)}>
              <ActivityIndicator size="small" color="#0284c7" />
            </View>
          ) : listError ? (
            <Text style={s(styles.errorMessageLayoutText)}>{listError}</Text>
          ) : requests.length === 0 ? (
            <Text style={s(styles.emptyMessageLayoutText)}>No active maintenance requests discovered in registry.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={s(styles.tableHorizontalWrapper)}>
              <View style={s(styles.tableMatrixGrid)}>
                <View style={s(styles.tableHeaderRow)}>
                  <Text style={s([styles.thText, { width: wp(26) }])}>Tenant Name</Text>
                  <Text style={s([styles.thText, { width: wp(26) }])}>Issue Type</Text>
                  <Text style={s([styles.thText, { width: wp(22) }])}>Status</Text>
                  <Text style={s([styles.thText, { width: wp(26) }])}>Created Date</Text>
                </View>

                {requests.map((item) => {
                  const requestId = getRequestId(item);
                  const isActive = selectedRequestId === requestId;
                  const badgeStyle = getStatusBadgeStyle(String(item.status || "new"));

                  return (
                    <TouchableOpacity
                      key={requestId || `${item.name}-${item.createdAt}`}
                      onPress={() => setSelectedRequestId(requestId)}
                      style={s([styles.trRow, isActive && styles.trRowSelectedActive])}
                    >
                      <Text numberOfLines={1} style={s([styles.bodyCellBoldText, { width: wp(26) }, isActive && styles.activeRowText])}>{textOrDash(item.name)}</Text>
                      <Text numberOfLines={1} style={s([styles.bodyCellNormalText, { width: wp(26) }])}>{textOrDash(item.issueType)}</Text>
                      <View style={s({ width: wp(22) })}>
                        <View style={s([styles.statusBadgeFrame, badgeStyle.container])}>
                          <Text style={s([styles.badgeLabelText, badgeStyle.text])}>{item.status || "new"}</Text>
                        </View>
                      </View>
                      <Text style={s([styles.bodyCellMutedText, { width: wp(26) }])}>{formatDate(item.createdAt)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Table Directory Native Pagination Controllers */}
          <View style={s(styles.tableNavPaginationRow)}>
            <TouchableOpacity 
              style={s([styles.pageNavBtn, page <= 1 && styles.pageNavBtnDisabled])}
              disabled={loadingList || page <= 1}
              onPress={() => setPage((v) => Math.max(1, v - 1))}
            >
              <Text style={s(styles.pageNavBtnText)}>Previous</Text>
            </TouchableOpacity>
            <Text style={s(styles.pageTrackerDisplayIndicator)}>Page {pagination.page}</Text>
            <TouchableOpacity 
              style={s([styles.pageNavBtn, page >= Math.max(pagination.totalPages, 1) && styles.pageNavBtnDisabled])}
              disabled={loadingList || page >= Math.max(pagination.totalPages, 1)}
              onPress={() => setPage((v) => Math.min(Math.max(pagination.totalPages, 1), v + 1))}
            >
              <Text style={s(styles.pageNavBtnText)}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Detail Inspection and Form Submission Action Hub Panel */}
        <View style={s(styles.dashboardCardBlock)}>
          <Text style={s(styles.cardSectionTitle)}>Ticket Diagnostics & Modification Hub</Text>
          
          {loadingDetail ? (
            <View style={s(styles.loaderCenterBlock)}>
              <ActivityIndicator size="small" color="#0284c7" />
            </View>
          ) : !selectedRequest ? (
            <Text style={s(styles.emptyMessageLayoutText)}>Select an inventory request profile row above to perform processing actions.</Text>
          ) : (
            <View style={s(styles.detailsContentContainerBlock)}>
              
              {/* Structured Metadata Diagnostics Readout Block */}
              <View style={s(styles.metaDiagnosticsGridPlate)}>
                <View style={s(styles.metaLabelValueTupleRow)}><Text style={s(styles.metaLabelText)}>Ticket ID</Text><Text selectable style={s(styles.metaValueText)}>{textOrDash(getRequestId(selectedRequest))}</Text></View>
                <View style={s(styles.metaLabelValueTupleRow)}><Text style={s(styles.metaLabelText)}>Tenant Contact</Text><Text style={s(styles.metaValueText)}>{textOrDash(selectedRequest.name)}</Text></View>
                <View style={s(styles.metaLabelValueTupleRow)}><Text style={s(styles.metaLabelText)}>Phone Base</Text><Text style={s(styles.metaValueText)}>{textOrDash(selectedRequest.phone)}</Text></View>
                <View style={s(styles.metaLabelValueTupleRow)}><Text style={s(styles.metaLabelText)}>Email Address</Text><Text style={s(styles.metaValueText)}>{textOrDash(selectedRequest.email)}</Text></View>
                <View style={s([styles.metaLabelValueTupleRow, { borderBottomWidth: 0 }])}><Text style={s(styles.metaLabelText)}>Address Destination</Text><Text style={s(styles.metaValueText)}>{textOrDash(selectedRequest.address)}</Text></View>
              </View>

              <View style={s(styles.metaDiagnosticsGridPlate)}>
                <View style={s(styles.metaLabelValueTupleRow)}><Text style={s(styles.metaLabelText)}>Issue Allocation</Text><Text style={s(styles.metaValueText)}>{textOrDash(selectedRequest.issueType)}</Text></View>
                <View style={s(styles.metaLabelValueTupleRow)}><Text style={s(styles.metaLabelText)}>Entry Permission</Text><Text style={s(styles.metaValueText)}>{textOrDash(selectedRequest.entryPermission)}</Text></View>
                <View style={s(styles.metaLabelValueTupleRow)}><Text style={s(styles.metaLabelText)}>Logs Created</Text><Text style={s(styles.metaValueText)}>{formatDate(selectedRequest.createdAt)}</Text></View>
                <View style={s([styles.metaLabelValueTupleRow, { borderBottomWidth: 0 }])}><Text style={s(styles.metaLabelText)}>Logs Mutated</Text><Text style={s(styles.metaValueText)}>{formatDate(selectedRequest.updatedAt)}</Text></View>
              </View>

              {/* Descriptions Core Textareas Display Panels */}
              <View style={s(styles.textOutputDisplayBoxFrame)}>
                <Text style={s(styles.textOutputDisplayBoxTitle)}>Incident Manifest Description</Text>
                <Text style={s(styles.textOutputDisplayBoxBodyText)}>{textOrDash(selectedRequest.description)}</Text>
              </View>

              <View style={s(styles.textOutputDisplayBoxFrame)}>
                <Text style={s(styles.textOutputDisplayBoxTitle)}>Existing Internal Admin Commentary</Text>
                <Text style={s(styles.textOutputDisplayBoxBodyText)}>{textOrDash(selectedRequest.adminComment)}</Text>
              </View>

              {/* Secure Media Attachment External Linking System */}
              {hasTenantAttachment && (
                <View style={s(styles.attachmentAccessFrameBox)}>
                  <Text style={s(styles.textOutputDisplayBoxTitle)}>Tenant Diagnostic Media Documentation Attachment</Text>
                  {selectedRequest?.attachmentKey && <Text style={s(styles.attachmentKeyDetailsLabel)}>Key Hash Identification: {String(selectedRequest.attachmentKey)}</Text>}
                  {tenantAttachmentUrl && (
                    <TouchableOpacity style={s(styles.attachmentActivationBtnLink)} onPress={() => handleOpenLink(tenantAttachmentUrl)}>
                      <ExternalLink size={fs(3.5)} color="#0284c7" style={s(styles.inlineIconSpacing)} />
                      <Text style={s(styles.attachmentActivationBtnLinkLabelText)}>Launch Document Stream</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* State Processing Form Input Controls Layout */}
              <View style={s(styles.actionFormMutationWrapperContainer)}>
                <View style={s(styles.formInputGroupField)}>
                  <Text style={s(styles.fieldInputLabelText)}>State Transition Pipeline Pipeline *</Text>
                  <View style={s(styles.inlineChoiceSelectorGridRow)}>
                    {UPDATE_STATUSES.map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setNextStatus(status)}
                        style={s([styles.choiceGridSelectorBtn, nextStatus === status && styles.choiceGridSelectorBtnActive])}
                      >
                        <Text style={s([styles.choiceGridSelectorText, nextStatus === status && styles.choiceGridSelectorTextActive])}>{status.toUpperCase()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={s(styles.formInputGroupField)}>
                  <Text style={s(styles.fieldInputLabelText)}>Append Internal Execution Notes</Text>
                  <TextInput
                    style={s(styles.formNativeTextAreaComponent)}
                    value={adminComment}
                    onChangeText={setAdminComment}
                    placeholder="Provide execution details regarding state modifications..."
                    placeholderTextColor="#a1a1aa"
                    multiline={true}
                    numberOfLines={4}
                  />
                </View>

                <View style={s(styles.formInputGroupField)}>
                  <Text style={s(styles.fieldInputLabelText)}>Upload Incident Media Documentation</Text>
                  <TouchableOpacity style={s(styles.nativeMockFileButtonPicker)} onPress={() => setLocalAttachmentName("IMG_CAMERA_MANIFEST_CAP.JPG")}>
                    <Text style={s(styles.nativeMockFileButtonPickerLabelText)}>
                      {localAttachmentName ? `Attached Document: ${localAttachmentName}` : "Select Device Diagnostic Asset File"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={s(styles.mainActionFormSubmitTriggerBtn)} disabled={updating} onPress={onUpdateRequest}>
                  {updating ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={s(styles.mainActionFormSubmitTriggerBtnText)}>Commit Ticket State Modificaton</Text>}
                </TouchableOpacity>

                {detailError && <Text style={s(styles.errorMessageLayoutText)}>{detailError}</Text>}
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
  headerLayoutBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: Colors.background, paddingHorizontal: wp(4), paddingVertical: hp(1.5), borderBottomWidth: 1, borderColor: "#e4e4e7" },
  brandingRow: { flexDirection: "row", alignItems: "center", gap: wp(2.5) },
  brandingLogo: { height: wp(9), width: wp(9), borderRadius: wp(2.2), backgroundColor: "#e4e4e7" },
  headerMainTitle: { fontSize: fs(4), fontWeight: "900", color: Colors.surface, letterSpacing: -0.3 },
  headerSubtitleText: { fontSize: fs(2.5), color: "#71717a", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  actionRefreshButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#f4f4f5", borderStyle: "solid", borderWidth: 1, borderColor: "#e4e4e7", paddingHorizontal: wp(3), paddingVertical: hp(0.75), borderRadius: wp(2) },
  inlineIconSpacing: { marginRight: wp(1.5) },
  refreshBtnLabel: { fontSize: fs(2.8), fontWeight: "700", color: "#18181b", textTransform: "uppercase" },
  scrollContent: { padding: wp(3.5), paddingBottom: hp(5) },
  warningBannerContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#ffedd5", padding: wp(3), borderRadius: wp(2.5), marginBottom: hp(1.8) },
  warningBannerText: { fontSize: fs(3), fontWeight: "700", color: "#9a3412" },
  dashboardCardBlock: { backgroundColor: Colors.cardColor, borderWidth: 1, borderColor: "#e4e4e7", borderRadius: wp(3), padding: wp(3.5), marginBottom: hp(2) },
  cardSectionTitle: { fontSize: fs(3.2), fontWeight: "800", color: Colors.surface, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: hp(0.25) },
  cardSectionSubtitle: { fontSize: fs(2.8), color: "#71717a", fontWeight: "500", marginBottom: hp(1.5) },
  formInputGroupField: { marginBottom: hp(1.8) },
  fieldInputLabelText: { fontSize: fs(2.5), fontWeight: "700", color: "#71717a", textTransform: "uppercase", marginBottom: hp(0.75), letterSpacing: 0.3 },
  horizontalSelectChipRow: { flexDirection: "row", paddingVertical: hp(0.25) },
  selectorChipBtn: { backgroundColor: "#f4f4f5", borderWidth: 1, borderColor: "#e4e4e7", paddingHorizontal: wp(3), paddingVertical: hp(1), borderRadius: wp(2), marginRight: wp(2) },
  selectorChipBtnActive: { borderColor: "#0284c7", backgroundColor: "rgba(2,132,199,0.04)" },
  selectorChipText: { fontSize: fs(2.5), fontWeight: "700", color: "#71717a" },
  selectorChipTextActive: { color: "#0284c7", fontWeight: "800" },
  searchBarInlineFrame: { flexDirection: "row" },
  searchNativeInputComponent: { flex: 1, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", borderTopLeftRadius: wp(2), borderBottomLeftRadius: wp(2), paddingHorizontal: wp(3), paddingVertical: hp(1), color: Colors.surface, fontSize: fs(3.2) },
  searchActionSubmitBtn: { backgroundColor: Colors.surface, width: wp(11), justifyContent: "center", alignItems: "center", borderTopRightRadius: wp(2), borderBottomRightRadius: wp(2) },
  loaderCenterBlock: { paddingVertical: hp(4), alignItems: "center", justifyContent: "center" },
  errorMessageLayoutText: { color: "#b91c1c", fontSize: fs(3), fontWeight: "600", padding: wp(2), backgroundColor: "#fef2f2", borderRadius: wp(1.5), marginTop: hp(1) },
  emptyMessageLayoutText: { color: "#71717a", fontSize: fs(3), textAlign: "center", paddingVertical: hp(3), paddingHorizontal: wp(4) },
  tableHorizontalWrapper: { flexDirection: "row" },
  tableMatrixGrid: { flexDirection: "column" },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f4f4f5", paddingHorizontal: wp(3), paddingVertical: hp(1), borderBottomWidth: 1, borderColor: "#e4e4e7", borderRadius: wp(1.5) },
  thText: { fontSize: fs(2.5), fontWeight: "700", color: "#71717a", textTransform: "uppercase" },
  trRow: { flexDirection: "row", paddingHorizontal: wp(3), paddingVertical: hp(1.2), borderBottomWidth: 1, borderColor: "#f4f4f5", alignItems: "center" },
  trRowSelectedActive: { backgroundColor: "#f0f9ff", borderBottomColor: "#e0f2fe" },
  activeRowText: { color: "#0369a1" },
  bodyCellBoldText: { fontSize: fs(3.2), fontWeight: "700", color: "#18181b" },
  bodyCellNormalText: { fontSize: fs(3.2), color: "#3f3f46" },
  bodyCellMutedText: { fontSize: fs(3), color: "#71717a" },
  statusBadgeFrame: { paddingHorizontal: wp(2), paddingVertical: hp(0.25), borderRadius: wp(2.5), alignSelf: "flex-start" },
  bgEmeraldMuted: { backgroundColor: "#ecfdf5" },
  bgSlateMuted: { backgroundColor: "#f1f5f9" },
  bgAmberMuted: { backgroundColor: "#fffbec" },
  bgSkyMuted: { backgroundColor: "#f0f9ff" },
  emeraldText: { color: "#047857", fontSize: fs(2.5), fontWeight: "800", textTransform: "uppercase" },
  slateText: { color: "#475569", fontSize: fs(2.5), fontWeight: "800", textTransform: "uppercase" },
  amberText: { color: "#b45309", fontSize: fs(2.5), fontWeight: "800", textTransform: "uppercase" },
  skyText: { color: "#0369a1", fontSize: fs(2.5), fontWeight: "800", textTransform: "uppercase" },
  badgeLabelText: { fontSize: fs(2.5), fontWeight: "800", textTransform: "uppercase" },
  tableNavPaginationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(1.5), paddingTop: hp(1), borderTopWidth: 1, borderColor: "#f4f4f5" },
  pageNavBtn: { paddingHorizontal: wp(3), paddingVertical: hp(0.75), borderWidth: 1, borderColor: "#e4e4e7", borderRadius: wp(1.5), backgroundColor: "#ffffff" },
  pageNavBtnDisabled: { opacity: 0.4 },
  pageNavBtnText: { fontSize: fs(3), color: Colors.surface, fontWeight: "600" },
  pageTrackerDisplayIndicator: { fontSize: fs(3), color: "#71717a", fontWeight: "500" },
  detailsContentContainerBlock: { flexDirection: "column" },
  metaDiagnosticsGridPlate: { backgroundColor: "#fbfbfb", borderWidth: 1, borderColor: "#f4f4f5", borderRadius: wp(2.5), padding: wp(2.5), marginBottom: hp(1.2) },
  metaLabelValueTupleRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: hp(0.75), borderBottomWidth: 1, borderBottomColor: "#f4f4f5" },
  metaLabelText: { fontSize: fs(3), color: "#71717a", fontWeight: "500" },
  metaValueText: { fontSize: fs(3), color: "#18181b", fontWeight: "700" },
  textOutputDisplayBoxFrame: { backgroundColor: "#f4f4f5", padding: wp(2.5), borderRadius: wp(2), marginBottom: hp(1.5) },
  textOutputDisplayBoxTitle: { fontSize: fs(2.5), fontWeight: "700", color: "#71717a", textTransform: "uppercase", marginBottom: hp(0.5) },
  textOutputDisplayBoxBodyText: { fontSize: fs(3.2), color: "#27272a", lineHeight: fs(4.2) },
  attachmentAccessFrameBox: { padding: wp(2.5), borderWidth: 1, borderColor: "#e0f2fe", backgroundColor: "#f0f9ff", borderRadius: wp(2), marginBottom: hp(1.8) },
  attachmentKeyDetailsLabel: { fontSize: fs(2.8), color: "#0369a1", marginBottom: hp(0.75) },
  attachmentActivationBtnLink: { flexDirection: "row", alignItems: "center" },
  attachmentActivationBtnLinkLabelText: { fontSize: fs(3), color: "#0284c7", fontWeight: "700" },
  actionFormMutationWrapperContainer: { marginTop: hp(0.75), paddingTop: hp(1.5), borderTopWidth: 1, borderColor: "#f4f4f5" },
  inlineChoiceSelectorGridRow: { flexDirection: "row", gap: wp(1.5) },
  choiceGridSelectorBtn: { flex: 1, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", paddingVertical: hp(1), borderRadius: wp(2), alignItems: "center" },
  choiceGridSelectorBtnActive: { borderColor: Colors.surface, backgroundColor: Colors.surface },
  choiceGridSelectorText: { fontSize: fs(2.8), fontWeight: "700", color: "#52525b" },
  choiceGridSelectorTextActive: { color: "#ffffff" },
  formNativeTextAreaComponent: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", borderRadius: wp(2), paddingHorizontal: wp(3), paddingVertical: hp(1.2), color: Colors.surface, fontSize: fs(3.2), textAlignVertical: "top", minHeight: hp(9) },
  nativeMockFileButtonPicker: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e4e4e7", borderStyle: "dashed", paddingVertical: hp(1.5), borderRadius: wp(2), alignItems: "center" },
  nativeMockFileButtonPickerLabelText: { fontSize: fs(3), color: "#71717a", fontWeight: "600" },
  mainActionFormSubmitTriggerBtn: { backgroundColor: Colors.surface, paddingVertical: hp(1.5), borderRadius: wp(2), alignItems: "center", marginTop: hp(1.2) },
  mainActionFormSubmitTriggerBtnText: { color: "#ffffff", fontSize: fs(3.2), fontWeight: "800" }
});

export default UphMaintenance;