import React, { useEffect, useState, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { X, Send, ZoomIn } from "lucide-react-native";
import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";
import { wp, hp, fs } from "@/util/styles";

const API_BASE_HOST = "https://task.se7eninc.com";

function resolveUrl(url?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const cleanPath = url.startsWith("/") ? url : `/${url}`;
  return `${API_BASE_HOST}${cleanPath}`;
}

type BugItem = {
  id: string;
  title: string;
  description: string;
  status: string;
  severity?: string;
  priority?: string;
  module?: string;
  company?: string;
  taskTitle?: string;
  assignedDeveloperName?: string;
  createdByUsername?: string;
  createdByRole?: string;
  createdAt?: string;
  attachments?: { fileName?: string; url?: string }[];
  resolution?: {
    summary?: string;
    verificationPerformed?: string;
    disposition?: string;
    submittedBy?: string;
  };
};

type CommentItem = {
  id: string;
  username: string;
  userRole?: string;
  content: string;
  createdAt: string;
};

type EventItem = {
  id: string;
  actorName: string;
  actorRole?: string;
  details: string;
  createdAt: string;
};

type Props = {
  bugId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBugUpdated?: () => void;
};

const DISPOSITION_OPTIONS = [
  { label: "Fixed", value: "FIXED" },
  { label: "Cannot Reproduce", value: "CANNOT_REPRODUCE" },
  { label: "Won't Fix", value: "WONT_FIX" },
  { label: "By Design", value: "BY_DESIGN" },
];

export default function BugCollaborationModal({ bugId, open, onOpenChange, onBugUpdated }: Props) {
  const { uiTheme } = useTheme();

  const colors = useMemo(() => {
    return {
      modalBg: "#09090b",
      cardBg: "#18181b",
      text: "#F4F4F5",
      textSecondary: "#D4D4D8",
      textMuted: "#A1A1AA",
      border: "#27272A",
      inputBg: "#18181b",
      inputBorder: "#3f3f46",
      primary: uiTheme.customColors?.primary || "#3b82f6",
      danger: "#F87171",
      success: "#34D399",
      warning: "#F59E0B",
      indigo: "#818cf8",
      indigoBg: "rgba(99, 102, 241, 0.15)",
      overlay: "rgba(0,0,0,0.75)",
    };
  }, [uiTheme]);

  const [bug, setBug] = useState<BugItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"report" | "conversation" | "activity" | "resolve">("report");

  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Resolution Form
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [verificationPerformed, setVerificationPerformed] = useState("");
  const [disposition, setDisposition] = useState("FIXED");
  const [resolving, setResolving] = useState(false);

  const loadData = async () => {
    if (!bugId) return;
    try {
      setLoading(true);
      const [bugRes, commentsRes, eventsRes] = await Promise.all([
        apiFetch<{ item: BugItem }>(`/bugs/${encodeURIComponent(bugId)}`),
        apiFetch<{ items: CommentItem[] }>(`/bugs/${encodeURIComponent(bugId)}/comments`),
        apiFetch<{ items: EventItem[] }>(`/bugs/${encodeURIComponent(bugId)}/events`),
      ]);

      if (bugRes?.item) setBug(bugRes.item);
      setComments(Array.isArray(commentsRes?.items) ? commentsRes.items : []);
      setEvents(Array.isArray(eventsRes?.items) ? eventsRes.items : []);
    } catch {
      /* Graceful boundary */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && bugId) void loadData();
  }, [open, bugId]);

  const handleUpdateStatus = async (nextStatus: string, resolutionPayload?: any) => {
    if (!bug) return;
    try {
      setLoading(true);
      const res = await apiFetch<{ item: BugItem }>(`/bugs/${encodeURIComponent(bug.id)}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus, ...(resolutionPayload ? { resolution: resolutionPayload } : {}) }),
      });
      if (res?.item) setBug(res.item);
      if (onBugUpdated) onBugUpdated();
      setActiveTab("report");
    } catch {
      /* Graceful boundary */
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!bug || !newComment.trim()) return;
    try {
      setSubmittingComment(true);
      await apiFetch(`/bugs/${encodeURIComponent(bug.id)}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: newComment.trim() }),
      });
      setNewComment("");
      await loadData();
    } catch {
      /* Graceful boundary */
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleSubmitResolution = async () => {
    if (!resolutionSummary.trim()) return;
    setResolving(true);
    await handleUpdateStatus("AWAITING_REPORTER_CONFIRMATION", {
      summary: resolutionSummary.trim(),
      verificationPerformed: verificationPerformed.trim(),
      disposition,
    });
    setResolving(false);
  };

  const currentStatus = bug?.status?.toUpperCase() || "OPEN";

  return (
    <Modal visible={open} animationType="slide" transparent={true} onRequestClose={() => onOpenChange(false)}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.container, { backgroundColor: colors.modalBg }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bugTitle, { color: colors.text }]} numberOfLines={1}>
                {bug?.title || "Bug Details"}
              </Text>
              <Text style={[styles.bugSub, { color: colors.textMuted }]}>
                Status: {currentStatus} {bug?.severity ? `• ${bug.severity.toUpperCase()}` : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onOpenChange(false)}>
              <X size={fs(4)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
                {[
                  { key: "report", label: "DETAILS" },
                  { key: "conversation", label: "COMMENTS" },
                  { key: "activity", label: "LOGS" },
                  { key: "resolve", label: "RESOLVE" },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key as any)}
                    style={[styles.tabItem, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                  >
                    <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.textSecondary }]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {activeTab === "report" && (
                  <View style={styles.tabContent}>
                    <View style={[styles.metaGrid, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Module</Text>
                        <Text style={[styles.metaVal, { color: colors.text }]}>{bug?.module || "-"}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Company</Text>
                        <Text style={[styles.metaVal, { color: colors.text }]}>{bug?.company || "-"}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Task</Text>
                        <Text style={[styles.metaVal, { color: colors.text }]} numberOfLines={1}>
                          {bug?.taskTitle || "None"}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Reported By</Text>
                        <Text style={[styles.metaVal, { color: colors.text }]}>
                          {bug?.createdByUsername || "User"}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Description</Text>
                    <Text style={[styles.descText, { color: colors.text, backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                      {bug?.description}
                    </Text>

                    {bug?.resolution?.summary ? (
                      <View style={[styles.resolutionBox, { borderColor: colors.indigo, backgroundColor: colors.indigoBg }]}>
                        <Text style={[styles.resolutionTitle, { color: colors.indigo }]}>Resolution Details</Text>
                        <Text style={[styles.resolutionText, { color: colors.text }]}>Summary: {bug.resolution.summary}</Text>
                        {bug.resolution.verificationPerformed ? (
                          <Text style={[styles.resolutionSub, { color: colors.textSecondary }]}>
                            Verification: {bug.resolution.verificationPerformed}
                          </Text>
                        ) : null}
                        {bug.resolution.disposition ? (
                          <Text style={[styles.resolutionSub, { color: colors.textSecondary }]}>
                            Disposition: {bug.resolution.disposition}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}

                    {bug?.attachments && bug.attachments.length > 0 && (
                      <View style={{ marginTop: hp(1) }}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Attachments</Text>
                        <View style={styles.imageGrid}>
                          {bug.attachments.map((att, i) => {
                            const resolvedImgUrl = resolveUrl(att.url);
                            return (
                              <TouchableOpacity
                                key={i}
                                style={[styles.imageWrapper, { borderColor: colors.border }]}
                                onPress={() => setLightboxUrl(resolvedImgUrl)}
                              >
                                <Image source={{ uri: resolvedImgUrl }} style={styles.gridImage} resizeMode="cover" />
                                <View style={styles.zoomOverlay}>
                                  <ZoomIn size={fs(3.5)} color="#ffffff" />
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {activeTab === "conversation" && (
                  <View style={styles.tabContent}>
                    {comments.map((c) => (
                      <View key={c.id} style={[styles.commentCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                        <View style={styles.commentHeader}>
                          <Text style={[styles.commentUser, { color: colors.text }]}>{c.username}</Text>
                          <Text style={[styles.commentDate, { color: colors.textMuted }]}>
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </View>
                        <Text style={[styles.commentBody, { color: colors.text }]}>{c.content}</Text>
                      </View>
                    ))}

                    <View style={styles.inputRow}>
                      <TextInput
                        placeholder="Write a reply..."
                        placeholderTextColor={colors.textMuted}
                        style={[styles.commentInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                        value={newComment}
                        onChangeText={setNewComment}
                      />
                      <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={() => void handleAddComment()} disabled={submittingComment}>
                        <Send size={fs(3.5)} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {activeTab === "activity" && (
                  <View style={styles.tabContent}>
                    {events.map((e) => (
                      <View key={e.id} style={[styles.eventRow, { borderLeftColor: colors.primary }]}>
                        <Text style={[styles.eventDetails, { color: colors.text }]}>{e.details}</Text>
                        <Text style={[styles.eventMeta, { color: colors.textMuted }]}>
                          By {e.actorName} • {new Date(e.createdAt).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {activeTab === "resolve" && (
                  <View style={styles.tabContent}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Resolution Summary *</Text>
                    <TextInput
                      placeholder="Explain how the issue was resolved..."
                      placeholderTextColor={colors.textMuted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      value={resolutionSummary}
                      onChangeText={setResolutionSummary}
                    />

                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Verification Steps</Text>
                    <TextInput
                      placeholder="What tests were performed to verify?"
                      placeholderTextColor={colors.textMuted}
                      style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                      value={verificationPerformed}
                      onChangeText={setVerificationPerformed}
                    />

                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Disposition</Text>
                    <View style={styles.pillRow}>
                      {DISPOSITION_OPTIONS.map((d) => (
                        <TouchableOpacity
                          key={d.value}
                          onPress={() => setDisposition(d.value)}
                          style={[
                            styles.pill,
                            {
                              backgroundColor: disposition === d.value ? colors.primary : colors.inputBg,
                              borderColor: disposition === d.value ? colors.primary : colors.inputBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.pillText, { color: disposition === d.value ? "#ffffff" : colors.textSecondary }]}>
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: colors.success, marginTop: hp(2) }]}
                      onPress={() => void handleSubmitResolution()}
                      disabled={resolving}
                    >
                      {resolving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.actionBtnText}>Submit Resolution</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>

              {/* Status Action Workflow Footer */}
              <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.modalBg }]}>
                {currentStatus === "OPEN" && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={() => void handleUpdateStatus("IN_PROGRESS")}>
                    <Text style={styles.actionBtnText}>Mark In Progress</Text>
                  </TouchableOpacity>
                )}
                {currentStatus === "IN_PROGRESS" && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.indigo }]} onPress={() => setActiveTab("resolve")}>
                    <Text style={styles.actionBtnText}>Resolve Bug</Text>
                  </TouchableOpacity>
                )}
                {currentStatus === "AWAITING_REPORTER_CONFIRMATION" && (
                  <View style={{ flexDirection: "row", gap: wp(2) }}>
                    <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: colors.warning }]} onPress={() => void handleUpdateStatus("OPEN")}>
                      <Text style={styles.actionBtnText}>Reopen Bug</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { flex: 1, backgroundColor: colors.success }]} onPress={() => void handleUpdateStatus("CLOSED")}>
                      <Text style={styles.actionBtnText}>Verify & Close</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {currentStatus === "CLOSED" && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.warning }]} onPress={() => void handleUpdateStatus("OPEN")}>
                    <Text style={styles.actionBtnText}>Reopen Bug</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </View>

      {lightboxUrl && (
        <Modal visible={true} transparent={true} animationType="fade">
          <TouchableOpacity style={styles.lightbox} onPress={() => setLightboxUrl(null)}>
            <Image source={{ uri: lightboxUrl }} style={styles.lightboxImg} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  container: { borderTopLeftRadius: wp(4), borderTopRightRadius: wp(4), height: "85%" },
  header: { padding: wp(4), borderBottomWidth: 1, flexDirection: "row", alignItems: "center" },
  bugTitle: { fontSize: fs(4), fontWeight: "700" },
  bugSub: { fontSize: fs(2.8), marginTop: hp(0.2) },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabItem: { flex: 1, paddingVertical: hp(1.2), alignItems: "center" },
  tabText: { fontSize: fs(2.5), fontWeight: "700" },
  body: { flex: 1, padding: wp(4) },
  tabContent: { gap: hp(1.2) },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", padding: wp(3), borderRadius: wp(2), borderWidth: 1, marginBottom: hp(1) },
  metaItem: { width: "50%", marginBottom: hp(0.8) },
  metaLabel: { fontSize: fs(2.3), fontWeight: "700", textTransform: "uppercase" },
  metaVal: { fontSize: fs(3), fontWeight: "600" },
  sectionTitle: { fontSize: fs(2.8), fontWeight: "700", textTransform: "uppercase", marginTop: hp(0.5) },
  descText: { padding: wp(3), borderRadius: wp(2), borderWidth: 1, fontSize: fs(3.2), lineHeight: fs(4.5) },
  resolutionBox: { padding: wp(3), borderRadius: wp(2), borderWidth: 1, marginTop: hp(1) },
  resolutionTitle: { fontSize: fs(3), fontWeight: "700", marginBottom: hp(0.5) },
  resolutionText: { fontSize: fs(3.2) },
  resolutionSub: { fontSize: fs(2.8), marginTop: hp(0.2) },
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: wp(2) },
  imageWrapper: { width: wp(26), height: wp(26), borderRadius: wp(2), borderWidth: 1, overflow: "hidden", position: "relative" },
  gridImage: { width: "100%", height: "100%" },
  zoomOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  commentCard: { padding: wp(3), borderRadius: wp(2), borderWidth: 1 },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: hp(0.5) },
  commentUser: { fontSize: fs(3), fontWeight: "700" },
  commentDate: { fontSize: fs(2.5) },
  commentBody: { fontSize: fs(3.2) },
  inputRow: { flexDirection: "row", gap: wp(2), marginTop: hp(1) },
  commentInput: { flex: 1, minHeight: hp(5.2), borderWidth: 1, borderRadius: wp(2), paddingHorizontal: wp(3), fontSize: fs(3.2) },
  input: { minHeight: hp(5.2), borderWidth: 1, borderRadius: wp(1.8), paddingHorizontal: wp(3), paddingVertical: hp(0.8), fontSize: fs(3.5) },
  textArea: { minHeight: hp(10), paddingTop: hp(1.2), paddingBottom: hp(1.2), textAlignVertical: "top" },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: wp(1.5) },
  pill: { paddingHorizontal: wp(3), paddingVertical: hp(0.8), borderRadius: wp(1.5), borderWidth: 1 },
  pillText: { fontSize: fs(2.8), fontWeight: "600" },
  sendBtn: { width: hp(5.2), height: hp(5.2), borderRadius: wp(2), alignItems: "center", justifyContent: "center" },
  eventRow: { borderLeftWidth: 2, paddingLeft: wp(2.5), paddingVertical: hp(0.5) },
  eventDetails: { fontSize: fs(3.2), fontWeight: "600" },
  eventMeta: { fontSize: fs(2.5), marginTop: hp(0.2) },
  footer: { padding: wp(4), borderTopWidth: 1 },
  actionBtn: { paddingVertical: hp(1.2), borderRadius: wp(2), alignItems: "center" },
  actionBtnText: { color: "#ffffff", fontSize: fs(3.5), fontWeight: "700" },
  lightbox: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  lightboxImg: { width: wp(90), height: hp(70) },
});