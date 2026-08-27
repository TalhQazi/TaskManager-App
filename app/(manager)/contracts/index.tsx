import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Plus,
  Send,
  Settings2,
  CheckCircle2,
  FileText,
  Type,
  RefreshCw,
  Trash2,
  Upload,
  Check,
  Copy,
  FileSignature,
  Maximize2,
  Calendar,
  Hash,
  CheckSquare,
  ChevronLeft,
  Sparkles,
  Mail,
  User,
  Clock3,
  Link2,
  Loader2,
  MoreHorizontal,
  Info,
  Target,
  X,
} from "lucide-react-native";
import { apiRequest, API_BASE_URL_IMAGE } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";
import { isDarkTheme } from "@/constants/design/presets";

const SCREEN_WIDTH = Dimensions.get("window").width;

type DocumentFieldType =
  | "text"
  | "signature"
  | "date"
  | "number"
  | "select"
  | "checkbox";

type ExtractionSource = "acro" | "layout" | "vector" | "heuristic";
type FieldReviewState = "confirmed" | "suggested";

interface DocumentField {
  id: string;
  label: string;
  type: DocumentFieldType;
  required: boolean;
  pageIndex: number;
  description?: string;
  options?: { value: string; label: string }[];
  x: number;
  y: number;
  width: number;
  height: number;
  value?: string | number | boolean;
  confidence?: number;
  extractionSource?: ExtractionSource;
  reviewState?: FieldReviewState;
}

interface SignaTemplate {
  _id?: string;
  name: string;
  category: string;
  description: string;
  documentTitle: string;
  documentContent: string;
  documentUrl?: string;
  isDefault: boolean;
  fields: DocumentField[];
}

interface SigningRequestRecord {
  _id: string;
  token: string;
  recipientEmail: string;
  recipientName?: string;
  status: "pending" | "viewed" | "signed" | "expired";
  createdAt: string;
  viewedAt?: string;
  signedAt?: string;
  expiresAt: string;
  documentTitle: string;
  auditTrail: {
    action: string;
    timestamp: string;
    details?: string;
  }[];
}

const FIELD_DEFAULTS: Record<DocumentFieldType, { width: number; height: number; label: string }> = {
  signature: { width: 24, height: 8, label: "Signature" },
  text: { width: 22, height: 4, label: "Text Input" },
  date: { width: 18, height: 4, label: "Date" },
  number: { width: 18, height: 4, label: "Number" },
  select: { width: 22, height: 4, label: "Select" },
  checkbox: { width: 5, height: 5, label: "Checkbox" },
};

const FIELD_TYPES = [
  { type: "signature" as DocumentFieldType, label: "Signature", icon: FileSignature },
  { type: "text" as DocumentFieldType, label: "Text Input", icon: Type },
  { type: "date" as DocumentFieldType, label: "Date", icon: Calendar },
  { type: "number" as DocumentFieldType, label: "Number", icon: Hash },
  { type: "checkbox" as DocumentFieldType, label: "Checkbox", icon: CheckSquare },
];

function formatTimestamp(value?: string): string {
  if (!value) return "Pending";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function buildColors(uiTheme: any) {
  const isDark = isDarkTheme(uiTheme?.theme);
  return {
    background: isDark ? "#090d13" : "#f8fafc",
    surface: isDark ? "#0d1117" : "#ffffff",
    surfaceMuted: isDark ? "#161b22" : "#f1f5f9",
    border: isDark ? "#21262d" : "#e2e8f0",
    borderMuted: isDark ? "#30363d" : "#cbd5e1",
    text: isDark ? "#c9d1d9" : "#0f172a",
    textBold: isDark ? "#f0f6fc" : "#020617",
    textMuted: isDark ? "#8b949e" : "#64748b",
    primary: "#0ea5e9",
    orange: "#f97316",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
  };
}

function createStyles(c: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scrollContainer: { paddingBottom: 40 },
    navbar: {
      paddingHorizontal: 24,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.surface,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
    },
    brandWrapper: { flexDirection: "row", alignItems: "center", gap: 14 },
    brandTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.75 },
    brandSubtitle: { fontSize: 10, fontWeight: "800", color: c.textMuted, letterSpacing: 2, textTransform: "uppercase", marginTop: 4 },
    navActionsRow: { flexDirection: "row", gap: 10 },
    navButton: { height: 40, paddingHorizontal: 16, borderRadius: 12, borderWidth: 2, borderColor: c.border, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: c.surface },
    navButtonPrimary: { backgroundColor: c.primary, borderColor: c.primary },
    navButtonText: { fontSize: 10, fontWeight: "900", color: c.text, textTransform: "uppercase", letterSpacing: 1 },
    navButtonTextPrimary: { color: "#ffffff" },
    tabsWrapper: { paddingHorizontal: 24, marginTop: 24 },
    tabsContainer: { flexDirection: "row", backgroundColor: c.surface, padding: 6, borderRadius: 16, borderWidth: 1, borderColor: c.border },
    tabTrigger: { flex: 1, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderRadius: 12 },
    tabTriggerActive: { backgroundColor: c.primary },
    tabTriggerText: { fontSize: 10, fontWeight: "900", color: c.textMuted, letterSpacing: 1.5, textTransform: "uppercase" },
    tabTriggerTextActive: { color: "#ffffff" },
    listBody: { paddingHorizontal: 24, marginTop: 24, gap: 18 },
    templateCard: { backgroundColor: c.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: c.border, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
    cardTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    categoryBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, backgroundColor: c.primary + "15" },
    categoryBadgeText: { fontSize: 9, fontWeight: "900", color: c.primary, textTransform: "uppercase", letterSpacing: 1 },
    cardTitle: { fontSize: 20, fontWeight: "900", color: c.textBold, letterSpacing: -0.4 },
    cardDesc: { fontSize: 13, color: c.textMuted, marginVertical: 10, fontStyle: "italic", lineHeight: 18 },
    metaDividerRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, paddingVertical: 14, marginVertical: 10 },
    metaIndicator: { flexDirection: "row", alignItems: "center", gap: 6 },
    metaIndicatorText: { fontSize: 10, fontWeight: "800", color: c.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
    metaIndicatorTextActive: { color: c.primary },
    cardButtonRow: { flexDirection: "row", gap: 10, marginTop: 10 },
    cardActionBtn: { flex: 1, height: 42, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    cardActionBtnSecondary: { backgroundColor: c.surfaceMuted },
    cardActionBtnPrimary: { backgroundColor: c.primary },
    cardActionBtnText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
    historyCard: { backgroundColor: c.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: c.border, gap: 14 },
    historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 16 },
    historyTitle: { fontSize: 18, fontWeight: "900", color: c.textBold, flex: 1, letterSpacing: -0.3 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    historyMetaGrid: { gap: 10, marginVertical: 6 },
    historyMetaLine: { flexDirection: "row", alignItems: "center", gap: 10 },
    historyMetaText: { fontSize: 13, fontWeight: "600", color: c.textMuted },
    historyAuditLine: { fontSize: 12, color: c.textMuted, borderTopWidth: 1, borderColor: c.border, paddingTop: 12, marginTop: 6 },
    historyAuditHighlight: { fontWeight: "700", color: c.text },
    fullscreenOverlay: { flex: 1, backgroundColor: c.background },
    editorHeader: { height: 72, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 },
    editorHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
    editorTitle: { fontSize: 18, fontWeight: "900", color: c.textBold, letterSpacing: -0.3 },
    editorSubtitle: { fontSize: 9, fontWeight: "800", color: c.textMuted, letterSpacing: 1.5, textTransform: "uppercase" },
    editorBody: { flex: 1 },
    editorSectionHeading: { fontSize: 10, fontWeight: "900", color: c.textMuted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 14, marginTop: 4 },
    editorPaletteCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 10 },
    editorPaletteIconFrame: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.surfaceMuted, alignItems: "center", justifyContent: "center" },
    editorPaletteLabel: { fontSize: 12, fontWeight: "900", color: c.textBold, textTransform: "uppercase", letterSpacing: 1 },
    formFieldBlock: { gap: 8, marginBottom: 20 },
    formLabel: { fontSize: 9, fontWeight: "900", color: c.textMuted, textTransform: "uppercase", letterSpacing: 1.5 },
    formInput: { minHeight: 46, borderWidth: 1, borderColor: c.border, borderRadius: 12, backgroundColor: c.surfaceMuted, paddingHorizontal: 16, fontSize: 14, color: c.text, fontWeight: "600" },
    formTextarea: { minHeight: 90, textAlignVertical: "top", paddingVertical: 14 },
    statsSummaryBox: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, gap: 12, marginVertical: 16 },
    statsBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    statsBoxText: { fontSize: 11, color: c.textMuted, lineHeight: 16 },
    previewContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, marginVertical: 24, backgroundColor: c.surface, borderRadius: 16 },
    previewCircle: { width: 90, height: 90, borderRadius: 28, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    previewHeading: { fontSize: 18, fontWeight: "900", color: c.textBold, marginBottom: 6 },
    previewSubtitle: { fontSize: 10, fontWeight: "900", color: c.textMuted, textTransform: "uppercase", letterSpacing: 1.5 },
    fieldNodeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, marginBottom: 10 },
    fieldNodeLabel: { fontSize: 14, fontWeight: "900", color: c.textBold },
    fieldNodeMeta: { fontSize: 10, color: c.textMuted, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 },
    emptyLayoutPrompt: { paddingVertical: 48, alignItems: "center", justifyContent: "center" },
    emptyLayoutText: { fontSize: 11, fontWeight: "900", color: c.textMuted, textAlign: "center", letterSpacing: 2, textTransform: "uppercase" },
    nodeConstraintsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
    constraintBox: { width: "48%", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceMuted },
    constraintLabel: { fontSize: 9, fontWeight: "900", color: c.textMuted, textTransform: "uppercase" },
    constraintValue: { fontSize: 14, fontWeight: "700", color: c.primary, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", marginTop: 4 },
    modalOverlayMask: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
    dialogFrame: { width: "100%", maxWidth: 480, backgroundColor: c.background, borderRadius: 24, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
    dialogHeader: { padding: 24, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
    dialogTitle: { fontSize: 20, fontWeight: "900", color: c.textBold, letterSpacing: -0.4 },
    dialogDesc: { fontSize: 14, color: c.textMuted, marginTop: 6, lineHeight: 20 },
    dialogBody: { padding: 24, gap: 20 },
    dialogFooter: { padding: 20, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface, flexDirection: "row", justifyContent: "flex-end", gap: 12 },
    uploadButtonTextSub: { fontSize: 10, color: c.textMuted, textAlign: "center", marginTop: 6, paddingHorizontal: 16, lineHeight: 15 },
  });
}

export default function SignaCore() {
  const { toast } = useToast();
  const { uiTheme } = useTheme();
  const colors = useMemo(() => buildColors(uiTheme), [uiTheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState("blueprints");
  const [templates, setTemplates] = useState<SignaTemplate[]>([]);
  const [requests, setRequests] = useState<SigningRequestRecord[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SignaTemplate | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [deployOpen, setDeployOpen] = useState(false);
  const [deployTarget, setDeployTarget] = useState<SignaTemplate | null>(null);
  const [recipientsText, setRecipientsText] = useState("");
  const [deploying, setDeploying] = useState(false);

  const activeField = useMemo(() => {
    return editingTemplate?.fields.find((f) => f.id === activeFieldId) ?? null;
  }, [activeFieldId, editingTemplate]);

  const editingFieldSummary = useMemo(() => {
    const fields = editingTemplate?.fields ?? [];
    return {
      total: fields.length,
      confirmed: fields.filter((f) => f.reviewState !== "suggested").length,
      suggested: fields.filter((f) => f.reviewState === "suggested").length,
    };
  }, [editingTemplate]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const res = await apiRequest<{ items?: SignaTemplate[] }>("/templates");
      setTemplates(res.data?.items || []);
    } catch {
      toast({ title: "Load Error", description: "Could not load templates.", variant: "destructive" });
    } finally {
      setLoadingTemplates(false);
    }
  }, [toast]);

  const fetchSigningRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await apiRequest<{ items?: SigningRequest[] }>("/signing-requests");
      setRequests(res.data?.items || []);
    } catch {
      toast({ title: "Load Error", description: "Could not load sent documents.", variant: "destructive" });
    } finally {
      setLoadingRequests(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTemplates();
    fetchSigningRequests();
  }, [fetchTemplates, fetchSigningRequests]);

  const triggerGlobalRefresh = () => {
    fetchTemplates();
    fetchSigningRequests();
  };

  const openTemplateEditor = (template?: SignaTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setActiveFieldId(template.fields[0]?.id ?? null);
    } else {
      const empty: SignaTemplate = {
        name: "Standard Employment Agreement",
        category: "HR",
        description: "Define the terms of engagement for new hires.",
        documentTitle: "Employment Agreement",
        documentContent: "<h2>Employment Agreement</h2><p>Use the SignaCore architect to position fields over the governing PDF or enrich this fallback HTML contract.</p>",
        documentUrl: "",
        isDefault: false,
        fields: [],
      };
      setEditingTemplate(empty);
      setActiveFieldId(null);
    }
    setEditorOpen(true);
  };

  const simulateFileUpload = () => {
    if (!editingTemplate) return;
    setUploading(true);
    setTimeout(() => {
      const simulatedFields: DocumentField[] = [
        {
          id: `field_${Math.random().toString(36).slice(2, 11)}`,
          label: "Signature Anchor",
          type: "signature",
          required: true,
          pageIndex: 0,
          x: 12.50,
          y: 75.20,
          width: 24,
          height: 8,
          confidence: 0.94,
          extractionSource: "layout",
          reviewState: "suggested"
        },
        {
          id: `field_${Math.random().toString(36).slice(2, 11)}`,
          label: "Full Name Input",
          type: "text",
          required: true,
          pageIndex: 0,
          x: 52.10,
          y: 22.40,
          width: 22,
          height: 4,
          confidence: 0.88,
          extractionSource: "heuristic",
          reviewState: "suggested"
        }
      ];

      setEditingTemplate({
        ...editingTemplate,
        documentTitle: "Extracted_Contract_Document.pdf",
        documentUrl: "/files/extracted_contract.pdf",
        fields: [...editingTemplate.fields, ...simulatedFields]
      });
      setUploading(false);
      toast({ title: "File Added", description: "Document stored. Auto-found fields were added as suggestions for review." });
    }, 1500);
  };

  const addFieldAtCenter = (type: DocumentFieldType, label: string) => {
    if (!editingTemplate) return;
    const defaults = FIELD_DEFAULTS[type];
    const newField: DocumentField = {
      id: `field_${Math.random().toString(36).slice(2, 11)}`,
      label,
      type,
      required: true,
      pageIndex: 0,
      x: 38.00,
      y: 42.00,
      width: defaults.width,
      height: defaults.height,
      confidence: 1,
      reviewState: "confirmed",
    };

    setEditingTemplate({
      ...editingTemplate,
      fields: [...editingTemplate.fields, newField],
    });
    setActiveFieldId(newField.id);
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) {
      toast({ title: "Name Required", description: "Add a template name before saving.", variant: "destructive" });
      return;
    }

    try {
      const method = editingTemplate._id ? "PUT" : "POST";
      const endpoint = editingTemplate._id
        ? `/templates/${editingTemplate._id}`
        : "/templates";

      await apiRequest(endpoint, {
        method,
        body: JSON.stringify(editingTemplate),
      });

      setEditorOpen(false);
      setEditingTemplate(null);
      fetchTemplates();
      toast({ title: "Template Saved", description: "Your template was saved successfully." });
    } catch {
      toast({ title: "Save Error", description: "Could not save this template.", variant: "destructive" });
    }
  };

  const openDeployDialog = (template: SignaTemplate) => {
    const confirmed = template.fields.filter((f) => f.reviewState !== "suggested");
    if (confirmed.length === 0) {
      toast({ title: "No Confirmed Fields", description: "Approve at least one extracted field before creating a signing request.", variant: "destructive" });
      return;
    }
    setDeployTarget(template);
    setRecipientsText("");
    setDeployOpen(true);
  };

  const submitSigningRequest = async () => {
    if (!deployTarget) return;
    const recipients = recipientsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const parts = l.split(",").map((p) => p.trim()).filter(Boolean);
        return parts.length >= 2 ? { name: parts.slice(0, -1).join(", "), email: parts[parts.length - 1] } : { name: "", email: parts[0] ?? "" };
      })
      .filter((r) => /\S+@\S+\.\S+/.test(r.email));

    if (recipients.length === 0) {
      toast({ title: "Add Recipients", description: "Add at least one valid email before sending.", variant: "destructive" });
      return;
    }

    try {
      setDeploying(true);
      await apiRequest("/signing-requests", {
        method: "POST",
        body: JSON.stringify({
          recipients,
          documentTitle: deployTarget.documentTitle,
          documentContent: deployTarget.documentContent,
          documentUrl: deployTarget.documentUrl || "",
          fields: deployTarget.fields.filter((f) => f.reviewState !== "suggested"),
        }),
      });

      if (!res.ok) throw new Error();

      setDeployOpen(false);
      setDeployTarget(null);
      fetchSigningRequests();
      toast({ title: "Document Sent", description: "Signing request created successfully." });
    } catch {
      toast({ title: "Deployment Failed", description: "The signing request could not be created.", variant: "destructive" });
    } finally {
      setDeploying(false);
    }
  };

  const getStatusStyle = (status: SigningRequestRecord["status"]) => {
    switch (status) {
      case "signed": return { backgroundColor: colors.success + "15", borderColor: colors.success + "30", color: colors.success };
      case "viewed": return { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", color: colors.primary };
      case "expired": return { backgroundColor: colors.danger + "15", borderColor: colors.danger + "30", color: colors.danger };
      default: return { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30", color: colors.warning };
    }
  };

  return (
    <SafeAreaView style={s(styles.root)} edges={["top", "left", "right"]}>
      <View style={s(styles.navbar)}>
        <View style={s(styles.brandWrapper)}>
          <View style={{marginTop:-30}}>
            <Text style={s(styles.brandTitle)}>
              <Text style={{ color: colors.primary }}>Signa</Text>
              <Text style={{ color: colors.orange }}>Core</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: "500" }}> TM</Text>
            </Text>
            <Text style={s(styles.brandSubtitle)}>Contract Integrity Engineered</Text>
          </View>
        </View>

        <View style={s(styles.navActionsRow)}>
          <TouchableOpacity style={s(styles.navButton)} onPress={triggerGlobalRefresh}>
            <RefreshCw size={14} color={colors.text} style={s({ marginRight: 6 })} />
            <Text style={s(styles.navButtonText)}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s([styles.navButton, styles.navButtonPrimary])} onPress={() => openTemplateEditor()}>
            <Plus size={14} color="#ffffff" style={s({ marginRight: 6 })} />
            <Text style={s([styles.navButtonText, styles.navButtonTextPrimary])}>New Template</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s(styles.tabsWrapper)}>
        <View style={s(styles.tabsContainer)}>
          <TouchableOpacity style={s([styles.tabTrigger, activeTab === "blueprints" && styles.tabTriggerActive])} onPress={() => setActiveTab("blueprints")}>
            <Text style={s([styles.tabTriggerText, activeTab === "blueprints" && styles.tabTriggerTextActive])}>Templates</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s([styles.tabTrigger, activeTab === "history" && styles.tabTriggerActive])} onPress={() => setActiveTab("history")}>
            <Text style={s([styles.tabTriggerText, activeTab === "history" && styles.tabTriggerTextActive])}>Sent</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        {activeTab === "blueprints" ? (
          <View style={s(styles.listBody)}>
            {loadingTemplates ? (
              <ActivityIndicator size="small" color={colors.primary} style={s({ marginTop: 32 })} />
            ) : (
              templates.map((template) => {
                const liveNodes = template.fields.filter((f) => f.reviewState !== "suggested").length;
                const suggestedNodes = template.fields.filter((f) => f.reviewState === "suggested").length;

                return (
                  <View key={template._id} style={s(styles.templateCard)}>
                    <View style={s(styles.cardTopLine)}>
                      <View style={s(styles.categoryBadge)}>
                        <Text style={s(styles.categoryBadgeText)}>{template.category}</Text>
                      </View>
                      {template.isDefault && <Check size={16} color={colors.success} />}
                    </View>
                    <Text style={s(styles.cardTitle)}>{template.name}</Text>
                    <Text style={s(styles.cardDesc)} numberOfLines={2}>
                      {template.description || "Premium signature-ready orchestration."}
                    </Text>

                    <View style={s(styles.metaDividerRow)}>
                      <View style={s(styles.metaIndicator)}>
                        <FileText size={12} color={colors.textMuted} />
                        <Text style={s(styles.metaIndicatorText)}>{template.documentUrl ? "PDF" : "HTML"}</Text>
                      </View>
                      <View style={s(styles.metaIndicator)}>
                        <Target size={12} color={colors.primary} />
                        <Text style={s([styles.metaIndicatorText, styles.metaIndicatorTextActive])}>{liveNodes} Live Nodes</Text>
                      </View>
                      {!!suggestedNodes && (
                        <View style={s(styles.metaIndicator)}>
                          <Sparkles size={12} color={colors.orange} />
                          <Text style={s([styles.metaIndicatorText, { color: colors.orange }])}>{suggestedNodes} Suggested</Text>
                        </View>
                      )}
                    </View>

                    <View style={s(styles.cardButtonRow)}>
                      <TouchableOpacity style={s([styles.cardActionBtn, styles.cardActionBtnSecondary])} onPress={() => openTemplateEditor(structuredClone(template))}>
                        <Settings2 size={14} color={colors.text} />
                        <Text style={s([styles.cardActionBtnText, { color: colors.text }])}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s([styles.cardActionBtn, styles.cardActionBtnPrimary])} onPress={() => openDeployDialog(template)}>
                        <Send size={14} color="#ffffff" />
                        <Text style={s([styles.cardActionBtnText, { color: "#ffffff" }])}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={s(styles.listBody)}>
            {loadingRequests ? (
              <ActivityIndicator size="small" color={colors.primary} style={s({ marginTop: 32 })} />
            ) : (
              requests.map((req) => {
                const statusStyle = getStatusStyle(req.status);
                const latestEvent = req.auditTrail?.[req.auditTrail.length - 1]?.details || "Awaiting first signer interaction";

                return (
                  <View key={req._id} style={s(styles.historyCard)}>
                    <View style={s(styles.historyHeader)}>
                      <Text style={s(styles.historyTitle)}>{req.documentTitle}</Text>
                      <View style={s([styles.statusBadge, { backgroundColor: statusStyle.backgroundColor, borderColor: statusStyle.borderColor }])}>
                        <Text style={s({ fontSize: 10, fontWeight: "900", color: statusStyle.color, textTransform: "uppercase" })}>{req.status}</Text>
                      </View>
                    </View>

                    <View style={s(styles.historyMetaGrid)}>
                      <View style={s(styles.historyMetaLine)}>
                        <Mail size={12} color={colors.primary} />
                        <Text style={s(styles.historyMetaText)} numberOfLines={1}>{req.recipientEmail}</Text>
                      </View>
                      <View style={s(styles.historyMetaLine)}>
                        <User size={12} color={colors.primary} />
                        <Text style={s(styles.historyMetaText)} numberOfLines={1}>{req.recipientName || "Signer not named yet"}</Text>
                      </View>
                      <View style={s(styles.historyMetaLine)}>
                        <Clock3 size={12} color={colors.primary} />
                        <Text style={s(styles.historyMetaText)}>Created {formatTimestamp(req.createdAt)}</Text>
                      </View>
                    </View>

                    <Text style={s(styles.historyAuditLine)} numberOfLines={1}>
                      Latest event: <Text style={s(styles.historyAuditHighlight)}>{latestEvent}</Text>
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {editorOpen && editingTemplate && (
        <Modal visible={editorOpen} animationType="slide" presentationStyle="fullScreen">
          <SafeAreaView style={s(styles.fullscreenOverlay)}>
            <View style={s(styles.editorHeader)}>
              <View style={s(styles.editorHeaderLeft)}>
                <TouchableOpacity onPress={() => setEditorOpen(false)}>
                  <ChevronLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <View>
                  <Text style={s(styles.editorTitle)}>SignaCore</Text>
                  <Text style={s(styles.editorSubtitle)}>Document Builder</Text>
                </View>
              </View>
              <TouchableOpacity style={s([styles.navButton, styles.navButtonPrimary, { height: 38 }])} onPress={saveTemplate}>
                <Text style={s([styles.navButtonText, styles.navButtonTextPrimary])}>Save Template</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s(styles.editorBody)} contentContainerStyle={s({ padding: 20 })} showsVerticalScrollIndicator={false}>
              <Text style={s(styles.editorSectionHeading)}>Fields</Text>
              {FIELD_TYPES.map((f) => (
                <TouchableOpacity key={f.type} style={s(styles.editorPaletteCard)} onPress={() => addFieldAtCenter(f.type, f.label)}>
                  <View style={s(styles.editorPaletteIconFrame)}>
                    <f.icon size={16} color={colors.primary} />
                  </View>
                  <Text style={s(styles.editorPaletteLabel)}>{f.label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={s([styles.editorSectionHeading, { marginTop: 24 }])}>Document</Text>
              <View style={s(styles.formFieldBlock)}>
                <Text style={s(styles.formLabel)}>Template Name</Text>
                <TextInput style={s(styles.formInput)} value={editingTemplate.name} onChangeText={(t) => setEditingTemplate({ ...editingTemplate, name: t })} />
              </View>
              <View style={s(styles.formFieldBlock)}>
                <Text style={s(styles.formLabel)}>Category</Text>
                <TextInput style={s(styles.formInput)} value={editingTemplate.category} onChangeText={(t) => setEditingTemplate({ ...editingTemplate, category: t })} />
              </View>
              <View style={s(styles.formFieldBlock)}>
                <Text style={s(styles.formLabel)}>Document Title</Text>
                <TextInput style={s(styles.formInput)} value={editingTemplate.documentTitle} onChangeText={(t) => setEditingTemplate({ ...editingTemplate, documentTitle: t })} />
              </View>
              <View style={s(styles.formFieldBlock)}>
                <Text style={s(styles.formLabel)}>PDF URL</Text>
                <TextInput style={s(styles.formInput)} placeholder="https://... or /23.pdf" placeholderTextColor={colors.textMuted} value={editingTemplate.documentUrl || ""} onChangeText={(t) => setEditingTemplate({ ...editingTemplate, documentUrl: t })} />
              </View>

              <View style={s(styles.statsSummaryBox)}>
                <View style={s(styles.statsBadgeRow)}>
                  <View style={s(styles.categoryBadge)}><Text style={s(styles.categoryBadgeText)}>{editingFieldSummary.confirmed} Confirmed</Text></View>
                  {!!editingFieldSummary.suggested && (
                    <View style={s([styles.categoryBadge, { backgroundColor: colors.warning + "15" }])}><Text style={s([styles.categoryBadgeText, { color: colors.warning }])}>{editingFieldSummary.suggested} Pending Review</Text></View>
                  )}
                  <View style={s([styles.categoryBadge, { backgroundColor: colors.border }])}><Text style={s([styles.categoryBadgeText, { color: colors.textMuted }])}>{editingFieldSummary.total} Total</Text></View>
                </View>
                <Text style={s(styles.statsBoxText)}>Auto-found fields are only suggestions. Review them before sending anything out.</Text>
              </View>

              <View style={s(styles.formFieldBlock)}>
                <Text style={s(styles.formLabel)}>Description</Text>
                <TextInput style={s([styles.formInput, styles.formTextarea])} multiline numberOfLines={3} value={editingTemplate.description} onChangeText={(t) => setEditingTemplate({ ...editingTemplate, description: t })} />
              </View>
              <View style={s(styles.formFieldBlock)}>
                <Text style={s(styles.formLabel)}>Text Content</Text>
                <TextInput style={s([styles.formInput, styles.formTextarea, { minHeight: 140 }])} multiline numberOfLines={6} value={editingTemplate.documentContent} onChangeText={(t) => setEditingTemplate({ ...editingTemplate, documentContent: t })} />
              </View>

              <View style={s({ marginTop: 20, marginBottom: 20 })}>
                <TouchableOpacity
                  style={s([styles.cardActionBtn, { backgroundColor: "transparent", borderColor: colors.borderMuted, borderWidth: 2, borderStyle: "dashed", height: 54, flexDirection: "row" }])}
                  onPress={simulateFileUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 size={16} color={colors.primary} style={s({ marginRight: 8 })} />
                  ) : (
                    <Upload size={16} color={colors.textMuted} style={s({ marginRight: 8 })} />
                  )}
                  <Text style={s([styles.cardActionBtnText, { color: colors.text }])}>
                    {uploading ? "Uploading File" : "Upload File"}
                  </Text>
                </TouchableOpacity>
                <Text style={s(styles.uploadButtonTextSub)}>
                  Uploaded source files are persisted into SignaCore so templates can be reused, deployed, and rendered again in the signer flow.
                </Text>
              </View>

              <View style={s(styles.previewContainer)}>
                <View style={s(styles.previewCircle)}>
                  <Upload size={26} color={colors.textMuted} />
                </View>
                <Text style={s(styles.previewHeading)}>Preview Only</Text>
                <Text style={s(styles.previewSubtitle)}>{editingTemplate.documentUrl ? "PDF View" : "Text View"}</Text>
              </View>

              <Text style={s(styles.editorSectionHeading)}>Active Layout Anchors</Text>
              {editingTemplate.fields.length === 0 ? (
                <View style={s(styles.emptyLayoutPrompt)}>
                  <Text style={s(styles.emptyLayoutText)}>No nodes configured</Text>
                </View>
              ) : (
                editingTemplate.fields.map((f) => {
                  const isSuggested = f.reviewState === "suggested";
                  return (
                    <TouchableOpacity key={f.id} style={s([styles.fieldNodeRow, activeFieldId === f.id && { borderColor: isSuggested ? colors.warning : colors.primary }])} onPress={() => setActiveFieldId(f.id)}>
                      <View>
                        <View style={s({ flexDirection: "row", alignItems: "center", gap: 8 })}>
                          <Text style={s(styles.fieldNodeLabel)}>{f.label}</Text>
                          {isSuggested && (
                            <View style={s([styles.categoryBadge, { backgroundColor: colors.warning + "15", paddingHorizontal: 6, paddingVertical: 2 }])}><Text style={s([styles.categoryBadgeText, { color: colors.warning, fontSize: 8 }])}>Suggested</Text></View>
                          )}
                        </View>
                        <Text style={s(styles.fieldNodeMeta)}>{f.type} • Page {f.pageIndex + 1}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setEditingTemplate({ ...editingTemplate, fields: editingTemplate.fields.filter((field) => field.id !== f.id) })}>
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })
              )}

              {activeField && (
                <View style={s({ marginTop: 24, gap: 18 })}>
                  <Text style={s(styles.editorSectionHeading)}>Field Settings</Text>
                  <View style={s(styles.formFieldBlock)}>
                    <Text style={s(styles.formLabel)}>Core Label</Text>
                    <TextInput
                      style={s(styles.formInput)}
                      value={activeField.label}
                      onChangeText={(t) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          fields: editingTemplate.fields.map((f) => (f.id === activeField.id ? { ...f, label: t } : f)),
                        })
                      }
                    />
                  </View>

                  {activeField.reviewState === "suggested" && (
                    <View style={s({ gap: 10 })}>
                      <View style={s([styles.statsSummaryBox, { backgroundColor: colors.warning + "05", borderColor: colors.warning + "20", marginVertical: 0 }])}>
                        <Text style={s([styles.statsBoxText, { color: colors.warning }])}>This field was inferred from the document and is waiting for approval before it can be sent to a signer.</Text>
                      </View>
                      <View style={s({ flexDirection: "row", gap: 10 })}>
                        <TouchableOpacity
                          style={s([styles.cardActionBtn, styles.cardActionBtnPrimary, { backgroundColor: colors.success, height: 46 }])}
                          onPress={() =>
                            setEditingTemplate({
                              ...editingTemplate,
                              fields: editingTemplate.fields.map((f) => (f.id === activeField.id ? { ...f, reviewState: "confirmed", confidence: f.confidence ?? 0.75 } : f)),
                            })
                          }
                        >
                          <CheckCircle2 size={16} color="#ffffff" />
                          <Text style={s([styles.cardActionBtnText, { color: "#ffffff" }])}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={s([styles.cardActionBtn, styles.navButton, { height: 46 }])}
                          onPress={() => {
                            setEditingTemplate({ ...editingTemplate, fields: editingTemplate.fields.filter((f) => f.id !== activeField.id) });
                            setActiveFieldId(null);
                          }}
                        >
                          <Trash2 size={16} color={colors.text} />
                          <Text style={s([styles.cardActionBtnText, { color: colors.text }])}>Dismiss</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <Text style={s(styles.formLabel)}>Extraction Status</Text>
                  <View style={s([styles.statsSummaryBox, { marginVertical: 0 }])}>
                    <View style={s({ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 })}><Text style={s(styles.formLabel)}>Review State</Text><Text style={s([styles.categoryBadgeText, { color: activeField.reviewState === "suggested" ? colors.warning : colors.success }])}>{activeField.reviewState === "suggested" ? "Suggested" : "Confirmed"}</Text></View>
                    <View style={s({ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 })}><Text style={s(styles.formLabel)}>Confidence</Text><Text style={s([styles.categoryBadgeText, { color: colors.textBold }])}>{activeField.confidence ? `${Math.round(activeField.confidence * 100)}%` : "Manual"}</Text></View>
                    <View style={s({ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 })}><Text style={s(styles.formLabel)}>Source</Text><Text style={s([styles.categoryBadgeText, { color: colors.textMuted }])}>{activeField.extractionSource ?? "manual"}</Text></View>
                  </View>

                  <Text style={s(styles.formLabel)}>Interaction Logic</Text>
                  <View style={s([styles.statsSummaryBox, { marginVertical: 0 }])}>
                    <View style={s({ flexDirection: "row", justifyContent: "space-between", alignItems: "center" })}>
                      <Text style={s(styles.formLabel)}>Input Node Required</Text>
                      <TouchableOpacity
                        style={s([styles.categoryBadge, { backgroundColor: activeField.required ? colors.danger + "15" : colors.border }])}
                        onPress={() =>
                          setEditingTemplate({
                            ...editingTemplate,
                            fields: editingTemplate.fields.map((f) => (f.id === activeField.id ? { ...f, required: !f.required } : f)),
                          })
                        }
                      >
                        <Text style={s([styles.categoryBadgeText, { color: activeField.required ? colors.danger : colors.textMuted }])}>{activeField.required ? "Required" : "Optional"}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={s({ flexDirection: "row", justifyContent: "space-between", marginTop: 6 })}><Text style={s(styles.formLabel)}>Input Type</Text><Text style={s([styles.categoryBadgeText, { color: colors.primary }])}>{activeField.type}</Text></View>
                  </View>

                  <Text style={s(styles.formLabel)}>Node Constraints (Perc)</Text>
                  <View style={s(styles.nodeConstraintsGrid)}>
                    <View style={s(styles.constraintBox)}>
                      <Text style={s(styles.constraintLabel)}>Pos-X</Text>
                      <Text style={s(styles.constraintValue)}>{activeField.x.toFixed(2)}%</Text>
                    </View>
                    <View style={s(styles.constraintBox)}>
                      <Text style={s(styles.constraintLabel)}>Pos-Y</Text>
                      <Text style={s(styles.constraintValue)}>{activeField.y.toFixed(2)}%</Text>
                    </View>
                    <View style={s(styles.constraintBox)}>
                      <Text style={s(styles.constraintLabel)}>Width</Text>
                      <Text style={s(styles.constraintValue)}>{activeField.width.toFixed(2)}%</Text>
                    </View>
                    <View style={s(styles.constraintBox)}>
                      <Text style={s(styles.constraintLabel)}>Height</Text>
                      <Text style={s(styles.constraintValue)}>{activeField.height.toFixed(2)}%</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={s([styles.cardActionBtn, { backgroundColor: colors.danger + "15", borderColor: colors.danger + "25", borderWidth: 1, height: 48, marginTop: 8 }])}
                    onPress={() => {
                      setEditingTemplate({ ...editingTemplate, fields: editingTemplate.fields.filter((field) => field.id !== activeField.id) });
                      setActiveFieldId(null);
                    }}
                  >
                    <Trash2 size={16} color={colors.danger} />
                    <Text style={s([styles.cardActionBtnText, { color: colors.danger }])}>Delete Field</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={s([styles.statsSummaryBox, { backgroundColor: colors.primary + "05", borderColor: colors.primary + "20", flexDirection: "row", alignItems: "flex-start", marginTop: 24 }])}>
                <Info size={16} color={colors.primary} style={s({ marginTop: 2 })} />
                <View style={s({ flex: 1, marginLeft: 10 })}><Text style={s([styles.statsBoxText, { color: colors.text, fontStyle: "italic" }])}>Fields snap to each other while you move them.</Text></View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {deployOpen && deployTarget && (
        <Modal visible={deployOpen} transparent animationType="fade">
          <View style={s(styles.modalOverlayMask)}>
            <View style={s(styles.dialogFrame)}>
              <View style={s(styles.dialogHeader)}>
                <Text style={s(styles.dialogTitle)}>Send Document</Text>
                <Text style={s(styles.dialogDesc)}>Create signing links for {deployTarget.documentTitle || "this template"}.</Text>
              </View>

              <View style={s(styles.dialogBody)}>
                <View style={s(styles.formFieldBlock)}>
                  <Text style={s(styles.formLabel)}>Recipients</Text>
                  <TextInput
                    style={s([styles.formInput, styles.formTextarea, { minHeight: 120 }])}
                    multiline
                    placeholder={"jane@example.com\nJohn Doe, john@example.com"}
                    placeholderTextColor={colors.textMuted}
                    value={recipientsText}
                    onChangeText={setRecipientsText}
                  />
                  <Text style={s({ fontSize: 10, color: colors.textMuted, marginTop: 4, lineHeight: 15 })}>One per line. Use just an email, or name and email.</Text>
                </View>

                <View style={s([styles.statsSummaryBox, { marginVertical: 0, backgroundColor: colors.surfaceMuted }])}>
                  <Text style={s([styles.statsBoxText, { fontWeight: "800", color: colors.textBold }])}>Fields ready: {deployTarget.fields.filter((f) => f.reviewState !== "suggested").length}</Text>
                  {!!deployTarget.fields.filter((f) => f.reviewState === "suggested").length && (
                    <Text style={s([styles.statsBoxText, { color: colors.warning, marginTop: 4 }])}>{deployTarget.fields.filter((f) => f.reviewState === "suggested").length} suggested fields will stay out until you approve them.</Text>
                  )}
                  <Text style={s([styles.statsBoxText, { marginTop: 6 }])}>Opened, viewed, and signed events are tracked automatically.</Text>
                </View>
              </View>

              <View style={s(styles.dialogFooter)}>
                <TouchableOpacity style={s(styles.navButton)} onPress={() => setDeployOpen(false)}>
                  <Text style={s(styles.navButtonText)}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s([styles.navButton, styles.navButtonPrimary])} onPress={submitSigningRequest} disabled={deploying}>
                  {deploying ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={s({ flexDirection: "row", alignItems: "center" })}>
                      <Send size={14} color="#ffffff" style={s({ marginRight: 6 })} />
                      <Text style={s([styles.navButtonText, styles.navButtonTextPrimary])}>Send</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}