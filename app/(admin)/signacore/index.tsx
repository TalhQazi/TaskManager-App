import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  Alert,
  Switch,
  Dimensions,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
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
  Info,
  Maximize2,
  Target,
  Calendar,
  Hash,
  CheckSquare,
  ChevronLeft,
  Sparkles,
  Mail,
  User,
  Clock3,
  Link2,
  MoreHorizontal,
  X,
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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

const FIELD_DEFAULTS: Record<
  DocumentFieldType,
  { width: number; height: number; label: string }
> = {
  signature: { width: 24, height: 8, label: "Signature" },
  text: { width: 22, height: 4, label: "Text Input" },
  date: { width: 18, height: 4, label: "Date" },
  number: { width: 18, height: 4, label: "Number" },
  select: { width: 22, height: 4, label: "Select" },
  checkbox: { width: 6, height: 6, label: "Checkbox" },
};

export default function SignaCore() {
  const auth = useAuth();
  const { uiTheme } = useTheme();

  const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme?.theme || ""),
    [uiTheme?.theme]
  );

  const themeColors = useMemo(() => {
    const goldPrimary = "#D4AF37";
    const goldAccent = "#AA7C11";
    if (isDark) {
      return {
        background: "#121212",
        cardBg: "#1E1E1E",
        text: "#FFFFFF",
        muted: "#AAAAAA",
        border: "#2C2C2C",
        primary: goldPrimary,
        accent: goldAccent,
        surface: "#252525",
        success: "#4CAF50",
        warning: "#FFC107",
        danger: "#F44336",
        white: "#FFFFFF",
      };
    }
    return {
      background: "#FAFAFA",
      cardBg: "#FFFFFF",
      text: "#1A1A1A",
      muted: "#666666",
      border: "#E5E5E5",
      primary: goldAccent,
      accent: goldPrimary,
      surface: "#F0F0F0",
      success: "#4CAF50",
      warning: "#FFC107",
      danger: "#F44336",
      white: "#FFFFFF",
    };
  }, [isDark]);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [activeTab, setActiveTab] = useState("blueprints");
  const [templates, setTemplates] = useState<SignaTemplate[]>([]);
  const [requests, setRequests] = useState<SigningRequestRecord[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SignaTemplate | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [currentEditPage, setCurrentEditPage] = useState(0);

  const [deployOpen, setDeployOpen] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployTarget, setDeployTarget] = useState<SignaTemplate | null>(null);
  const [recipientsText, setRecipientsText] = useState("");

  const [actionMenuRequest, setActionMenuRequest] = useState<SigningRequestRecord | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const activeField = useMemo(
    () => editingTemplate?.fields.find((f) => f.id === activeFieldId) ?? null,
    [activeFieldId, editingTemplate]
  );

  const editingFieldSummary = useMemo(() => {
    const fields = editingTemplate?.fields ?? [];
    return {
      total: fields.length,
      confirmed: fields.filter((f) => f.reviewState !== "suggested").length,
      suggested: fields.filter((f) => f.reviewState === "suggested").length,
    };
  }, [editingTemplate?.fields]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const res = await fetch(`http://localhost:3001/api/templates`);
      const json = await res.json();
      setTemplates(json.items || []);
    } catch {
      setTemplates([
        {
          _id: "mock_1",
          name: "Standard Employment Agreement",
          category: "HR",
          description: "Define terms of engagement for new structural hires.",
          documentTitle: "Employment Contract.pdf",
          documentContent: "Fallback system content standard structure agreement definitions.",
          isDefault: true,
          fields: [
            { id: "f1", label: "Executive Signature", type: "signature", required: true, pageIndex: 0, x: 10, y: 75, width: 24, height: 8, confidence: 1, reviewState: "confirmed" },
            { id: "f2", label: "Effective Date", type: "date", required: true, pageIndex: 0, x: 50, y: 20, width: 18, height: 4, confidence: 0.8, reviewState: "suggested" }
          ]
        }
      ]);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchSigningRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await fetch(`http://localhost:3001/api/signing-requests`);
      const json = await res.json();
      setRequests(json.items || []);
    } catch {
      setRequests([
        {
          _id: "req_1",
          token: "token_mock_abc",
          recipientEmail: "signer@domain.com",
          recipientName: "John Doe",
          status: "pending",
          createdAt: new Date().toISOString(),
          expiresAt: new Date().toISOString(),
          documentTitle: "Employment Agreement",
          auditTrail: [{ action: "Created", timestamp: new Date().toISOString(), details: "System verification signature loop loaded" }]
        }
      ]);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
    void fetchSigningRequests();
  }, [fetchSigningRequests, fetchTemplates]);

  const openTemplateEditor = (template?: SignaTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setActiveFieldId(template.fields[0]?.id ?? null);
    } else {
      setEditingTemplate({
        name: "Standard Employment Agreement",
        category: "HR",
        description: "Define the terms of engagement for new hires.",
        documentTitle: "Employment Agreement",
        documentContent: "Fallback structural platform framework metrics agreement.",
        isDefault: false,
        fields: [],
      });
      setActiveFieldId(null);
    }
    setCurrentEditPage(0);
    setEditorOpen(true);
  };

  const addFieldAtCenter = (type: DocumentFieldType, label: string) => {
    if (!editingTemplate) return;
    const defaults = FIELD_DEFAULTS[type];
    const newField: DocumentField = {
      id: `field_${Math.random().toString(36).slice(2, 11)}`,
      label,
      type,
      required: true,
      pageIndex: currentEditPage,
      x: 50 - defaults.width / 2,
      y: 40 - defaults.height / 2,
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
      Alert.alert("Required Field", "Please add a template name.");
      return;
    }

    try {
      const method = editingTemplate._id ? "PUT" : "POST";
      const url = editingTemplate._id
        ? `http://localhost:3001/api/templates/${editingTemplate._id}`
        : `http://localhost:3001/api/templates`;

      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      });

      setEditorOpen(false);
      setEditingTemplate(null);
      void fetchTemplates();
      Alert.alert("Success", "Template structural layout processed successfully.");
    } catch {
      setEditorOpen(false);
      void fetchTemplates();
    }
  };

  const openDeployDialog = (template: SignaTemplate) => {
    const confirmedFields = template.fields.filter((f) => f.reviewState !== "suggested");
    if (confirmedFields.length === 0) {
      Alert.alert("Action Prevented", "Approve at least one extracted node before distribution execution mapping.");
      return;
    }
    setDeployTarget(template);
    setRecipientsText("");
    setDeployOpen(true);
  };

  const submitSigningRequest = async () => {
    if (!deployTarget) return;
    const cleanEmails = recipientsText.split("\n").map((s) => s.trim()).filter((s) => /\S+@\S+\.\S+/.test(s));

    if (cleanEmails.length === 0) {
      Alert.alert("Validation Failure", "Provide at least one valid email architecture entry destination.");
      return;
    }

    try {
      setDeploying(true);
      const res = await fetch(`http://localhost:3001/api/signing-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: cleanEmails.map((e) => ({ name: "", email: e })),
          documentTitle: deployTarget.documentTitle,
          documentContent: deployTarget.documentContent,
          documentUrl: deployTarget.documentUrl || "",
          fields: deployTarget.fields.filter((f) => f.reviewState !== "suggested"),
        }),
      });

      const json = await res.json();
      if (json.signingLink) {
        Clipboard.setString(json.signingLink);
      }

      setDeployOpen(false);
      setDeployTarget(null);
      void fetchSigningRequests();
      Alert.alert("Success", "Secure signature tracking requests successfully broadcast.");
    } catch {
      setDeployOpen(false);
      setDeploying(false);
    } finally {
      setDeploying(false);
    }
  };

  const executeActionRowClick = (req: SigningRequestRecord) => {
    setActionMenuRequest(req);
    setActionMenuOpen(true);
  };

  const copyMenuLink = () => {
    if (actionMenuRequest) {
      Clipboard.setString(`http://localhost:3001/sign/${actionMenuRequest.token}`);
      setActionMenuOpen(false);
      Alert.alert("Copied", "Secure pathway ledger coordinate copied.");
    }
  };

  const triggerResendRequest = async () => {
    if (!actionMenuRequest) return;
    setActionMenuOpen(false);
    try {
      await fetch(`http://localhost:3001/api/signing-requests/${actionMenuRequest._id}/resend`, { method: "POST" });
      Alert.alert("Dispatched", "Ledger notification framework re-broadcast.");
      void fetchSigningRequests();
    } catch {
      Alert.alert("Execution Alert", "Framework delivery parameters refreshed manually.");
    }
  };

  const changeActiveFieldProp = (updater: (f: DocumentField) => DocumentField) => {
    if (!editingTemplate || !activeFieldId) return;
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.map((f) => (f.id === activeFieldId ? updater(f) : f)),
    });
  };

  const deleteActiveField = () => {
    if (!editingTemplate || !activeFieldId) return;
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.filter((f) => f.id !== activeFieldId),
    });
    setActiveFieldId(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.appHeader}>
        <View>
          <Text style={[styles.brandTitle, { color: themeColors.text }]}>
            Signa<Text style={{ color: themeColors.primary }}>Core</Text>
          </Text>
          <Text style={[styles.brandSubtitle, { color: themeColors.muted }]}>CONTRACT INTEGRITY ENGINEERED</Text>
        </View>
        <TouchableOpacity style={styles.topRefreshBtn} onPress={() => { void fetchTemplates(); void fetchSigningRequests(); }}>
          <RefreshCw size={14} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBarStrip}>
        <TouchableOpacity style={[styles.tabItem, activeTab === "blueprints" && styles.tabItemActive]} onPress={() => setActiveTab("blueprints")}>
          <Text style={[styles.tabItemText, { color: activeTab === "blueprints" ? themeColors.primary : themeColors.muted }]}>Blueprints</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, activeTab === "history" && styles.tabItemActive]} onPress={() => setActiveTab("history")}>
          <Text style={[styles.tabItemText, { color: activeTab === "history" ? themeColors.primary : themeColors.muted }]}>Dispatched Ledger</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "blueprints" ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loadingTemplates ? (
            <ActivityIndicator size="small" color={themeColors.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={styles.gridContainer}>
              {templates.map((tpl) => (
                <View key={tpl._id || tpl.name} style={[styles.blueprintCard, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{tpl.category}</Text>
                    </View>
                    {tpl.isDefault && <CheckCircle2 size={16} color={themeColors.primary} />}
                  </View>
                  <Text style={[styles.blueprintName, { color: themeColors.text }]} numberOfLines={1}>{tpl.name}</Text>
                  <Text style={[styles.blueprintDesc, { color: themeColors.muted }]} numberOfLines={2}>{tpl.description}</Text>
                  <View style={styles.nodesMetaContainer}>
                    <FileText size={12} color={themeColors.muted} />
                    <Text style={[styles.nodesMetaText, { color: themeColors.muted }]}>
                      {tpl.fields.filter((f) => f.reviewState !== "suggested").length} Nodes Configured
                    </Text>
                  </View>
                  <View style={styles.cardActionsRow}>
                    <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: themeColors.surface }]} onPress={() => openTemplateEditor(tpl)}>
                      <Settings2 size={12} color={themeColors.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.cardActionText, { color: themeColors.text }]}>Modify</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: themeColors.primary }]} onPress={() => openDeployDialog(tpl)}>
                      <Send size={12} color={themeColors.white} style={{ marginRight: 4 }} />
                      <Text style={[styles.cardActionText, { color: themeColors.white }]}>Deploy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={[styles.createBlueprintBtn, { borderColor: themeColors.primary }]} onPress={() => openTemplateEditor()}>
                <Plus size={24} color={themeColors.primary} />
                <Text style={[styles.createBlueprintBtnText, { color: themeColors.primary }]}>NEW TEMPLATE CORE</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>
          {loadingRequests ? (
            <ActivityIndicator size="small" color={themeColors.primary} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => (
                <View style={[styles.requestListItem, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  <View style={styles.requestMainBlock}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.requestDocTitle, { color: themeColors.text }]} numberOfLines={1}>{item.documentTitle}</Text>
                      <Text style={[styles.requestMetaText, { color: themeColors.muted }]} numberOfLines={1}>Recipient: {item.recipientEmail}</Text>
                      <Text style={[styles.requestMetaText, { color: themeColors.muted }]}>
                        Registered: {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={[styles.statusIndicatorBadge, { backgroundColor: item.status === "signed" ? `${themeColors.success}15` : `${themeColors.warning}15` }]}>
                      <Text style={[styles.statusIndicatorBadgeText, { color: item.status === "signed" ? themeColors.success : themeColors.warning }]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.rowMenuTrigger} onPress={() => executeActionRowClick(item)}>
                      <MoreHorizontal size={18} color={themeColors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      <Modal visible={editorOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.editorRootContainer, { backgroundColor: themeColors.background }]}>
          <View style={[styles.editorHeaderStrip, { backgroundColor: themeColors.cardBg, borderBottomColor: themeColors.border }]}>
            <TouchableOpacity style={styles.editorBackBtn} onPress={() => setEditorOpen(false)}>
              <ChevronLeft size={20} color={themeColors.text} />
              <Text style={[styles.editorBackBtnText, { color: themeColors.text }]}>Exit Builder</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editorSaveBtn, { backgroundColor: themeColors.primary }]} onPress={() => { void saveTemplate(); }}>
              <Text style={styles.editorSaveBtnText}>Commit Template</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.formSectionContainer}>
                <Text style={[styles.sectionHeadingTitle, { color: themeColors.muted }]}>METADATA PARAMETERS</Text>
                
                <View style={styles.formInputContainer}>
                  <Text style={[styles.formFieldLabelText, { color: themeColors.muted }]}>Blueprint Identifier Title</Text>
                  <TextInput
                    style={[styles.formTextfieldInput, { backgroundColor: themeColors.cardBg, color: themeColors.text, borderColor: themeColors.border }]}
                    value={editingTemplate?.name}
                    onChangeText={(t) => setEditingTemplate((prev) => prev ? { ...prev, name: t } : null)}
                  />
                </View>

                <View style={styles.formInputContainer}>
                  <Text style={[styles.formFieldLabelText, { color: themeColors.muted }]}>Classification Hierarchy</Text>
                  <TextInput
                    style={[styles.formTextfieldInput, { backgroundColor: themeColors.cardBg, color: themeColors.text, borderColor: themeColors.border }]}
                    value={editingTemplate?.category}
                    onChangeText={(t) => setEditingTemplate((prev) => prev ? { ...prev, category: t } : null)}
                  />
                </View>

                <View style={styles.formInputContainer}>
                  <Text style={[styles.formFieldLabelText, { color: themeColors.muted }]}>Operational Summary</Text>
                  <TextInput
                    style={[styles.formTextfieldInput, { backgroundColor: themeColors.cardBg, color: themeColors.text, borderColor: themeColors.border, height: 60 }]}
                    multiline
                    value={editingTemplate?.description}
                    onChangeText={(t) => setEditingTemplate((prev) => prev ? { ...prev, description: t } : null)}
                  />
                </View>
              </View>

              <View style={styles.interactiveNodesWorkspaceContainer}>
                <Text style={[styles.sectionHeadingTitle, { color: themeColors.muted }]}>INTERACTIVE NODE PALETTE</Text>
                <Text style={[styles.canvasContextInfoText, { color: themeColors.muted }]}>Tap structural field metrics to append to active workspace viewport layer.</Text>
                
                <View style={styles.paletteNodesRowGrid}>
                  <TouchableOpacity style={[styles.paletteNodeItemBlock, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]} onPress={() => addFieldAtCenter("signature", "Signature")}>
                    <FileSignature size={16} color={themeColors.primary} />
                    <Text style={[styles.paletteNodeLabelText, { color: themeColors.text }]}>Signature</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.paletteNodeItemBlock, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]} onPress={() => addFieldAtCenter("text", "Text Input")}>
                    <Type size={16} color={themeColors.primary} />
                    <Text style={[styles.paletteNodeLabelText, { color: themeColors.text }]}>Text Box</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.paletteNodeItemBlock, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]} onPress={() => addFieldAtCenter("date", "Date")}>
                    <Calendar size={16} color={themeColors.primary} />
                    <Text style={[styles.paletteNodeLabelText, { color: themeColors.text }]}>Date Node</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.paletteNodeItemBlock, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]} onPress={() => addFieldAtCenter("number", "Number")}>
                    <Hash size={16} color={themeColors.primary} />
                    <Text style={[styles.paletteNodeLabelText, { color: themeColors.text }]}>Numeric</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.activeLayoutNodesTrackerSection}>
                <Text style={[styles.sectionHeadingTitle, { color: themeColors.muted }]}>PLACED NODES VIEWPORT MANAGER ({editingTemplate?.fields.length})</Text>
                
                {editingTemplate && editingTemplate.fields.length > 0 ? (
                  editingTemplate.fields.map((f) => {
                    const isSelected = activeFieldId === f.id;
                    return (
                      <TouchableOpacity
                        key={f.id}
                        style={[styles.placedNodeManagementCard, { backgroundColor: themeColors.cardBg, borderColor: isSelected ? themeColors.primary : themeColors.border }]}
                        onPress={() => setActiveFieldId(f.id)}
                      >
                        <View style={styles.placedNodeCardHeaderRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Target size={14} color={themeColors.primary} />
                            <Text style={[styles.placedNodeMetaLabelText, { color: themeColors.text }]}>{f.label || "Untitled Coordinate"}</Text>
                          </View>
                          {f.reviewState === "suggested" && (
                            <View style={styles.suggestionAlertBadge}>
                              <Text style={styles.suggestionAlertBadgeText}>REVIEW REQUIRED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.placedNodeMetricsSubtext, { color: themeColors.muted }]}>
                          Type: {f.type.toUpperCase()} • Axis-X: {f.x}% • Axis-Y: {f.y}%
                        </Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={[styles.emptyPlacedNodesFallbackBox, { borderColor: themeColors.border }]}>
                    <Info size={16} color={themeColors.muted} />
                    <Text style={[styles.emptyPlacedNodesFallbackText, { color: themeColors.muted }]}>No nodes appended to active runtime mapping.</Text>
                  </View>
                )}
              </View>

              {activeField && (
                <View style={[styles.nodeInspectingInspectorPanel, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  <Text style={[styles.sectionHeadingTitle, { color: themeColors.muted, marginBottom: 12 }]}>INSPECTING NODE COORDINATE</Text>
                  
                  <View style={styles.formInputContainer}>
                    <Text style={[styles.formFieldLabelText, { color: themeColors.muted }]}>Label Binding</Text>
                    <TextInput
                      style={[styles.formTextfieldInput, { backgroundColor: themeColors.background, color: themeColors.text, borderColor: themeColors.border }]}
                      value={activeField.label}
                      onChangeText={(val) => changeActiveFieldProp((f) => ({ ...f, label: val }))}
                    />
                  </View>

                  <View style={styles.structuralSwitchSettingsBlock}>
                    <Text style={[styles.switchSettingLabelText, { color: themeColors.text }]}>Signer Enforcement Node Required</Text>
                    <Switch
                      value={activeField.required}
                      onValueChange={(val) => changeActiveFieldProp((f) => ({ ...f, required: val }))}
                      trackColor={{ true: themeColors.primary }}
                    />
                  </View>

                  {activeField.reviewState === "suggested" && (
                    <TouchableOpacity
                      style={[styles.nodeApprovalProcessBtn, { backgroundColor: themeColors.success }]}
                      onPress={() => changeActiveFieldProp((f) => ({ ...f, reviewState: "confirmed" }))}
                    >
                      <Check size={14} color={themeColors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.nodeApprovalProcessBtnText}>APPROVE INFERRED COORDINATE</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.nodeRemovalDangerBtn} onPress={deleteActiveField}>
                    <Trash2 size={14} color={themeColors.danger} style={{ marginRight: 6 }} />
                    <Text style={styles.nodeRemovalDangerBtnText}>PURGE NODE COORDINATE</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal visible={deployOpen} transparent animationType="fade">
        <View style={styles.modalBackdropBlurLayer}>
          <View style={[styles.dialogSheetModalContentCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
            <View style={styles.dialogCardHeaderTitleStrip}>
              <Text style={[styles.dialogHeaderTitleText, { color: themeColors.text }]}>Send Blueprint Document</Text>
              <TouchableOpacity onPress={() => setDeployOpen(false)}>
                <X size={20} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.dialogContextInstructionalText, { color: themeColors.muted }]}>
              Broadcast dynamic validation signing instances for: {deployTarget?.name}
            </Text>

            <View style={[styles.formInputContainer, { marginTop: 12 }]}>
              <Text style={[styles.formFieldLabelText, { color: themeColors.muted }]}>Recipient Routing Registry Matrix (One email per line)</Text>
              <TextInput
                style={[styles.formTextfieldInput, { backgroundColor: themeColors.cardBg, color: themeColors.text, borderColor: themeColors.border, height: 100, paddingTop: 8 }]}
                multiline
                placeholder="client@domain.com"
                placeholderTextColor={themeColors.muted}
                value={recipientsText}
                onChangeText={setRecipientsText}
              />
            </View>

            <View style={styles.dialogCardActionsRowStrip}>
              <TouchableOpacity style={[styles.dialogSecondaryActionBtn, { borderColor: themeColors.border }]} onPress={() => setDeployOpen(false)}>
                <Text style={[styles.dialogSecondaryActionBtnText, { color: themeColors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.dialogPrimaryActionBtn, { backgroundColor: themeColors.primary }]} onPress={() => { void submitSigningRequest(); }} disabled={deploying}>
                {deploying ? <ActivityIndicator size="small" color={themeColors.white} /> : <Text style={styles.dialogPrimaryActionBtnText}>Execute Launch</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={actionMenuOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdropBlurLayer} activeOpacity={1} onPress={() => setActionMenuOpen(false)}>
          <View style={[styles.contextMenuActionPanelSheet, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <Text style={[styles.contextMenuHeaderLabelTitle, { color: themeColors.muted }]}>LEDGER CORE DATA ACTIONS</Text>
            
            <TouchableOpacity style={styles.contextMenuItemActionRow} onPress={copyMenuLink}>
              <Copy size={16} color={themeColors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.contextMenuItemActionRowLabelText, { color: themeColors.text }]}>Copy Verification Token Link</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contextMenuItemActionRow} onPress={() => { void triggerResendRequest(); }}>
              <RefreshCw size={16} color={themeColors.text} style={{ marginRight: 12 }} />
              <Text style={[styles.contextMenuItemActionRowLabelText, { color: themeColors.text }]}>Re-Broadcast Ledger Prompt</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.contextMenuItemActionRow, { borderTopWidth: 1, borderTopColor: themeColors.border }]} onPress={() => setActionMenuOpen(false)}>
              <X size={16} color={themeColors.danger} style={{ marginRight: 12 }} />
              <Text style={[styles.contextMenuItemActionRowLabelText, { color: themeColors.danger }]}>Close Operations Drawer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    appHeader: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
    brandTitle: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
    brandSubtitle: { fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginTop: 2 },
    topRefreshBtn: { padding: 8, borderRadius: 8 },
    tabBarStrip: { flexDirection: "row", paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabItem: { paddingVertical: 12, marginRight: 20, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabItemActive: { borderBottomColor: colors.primary },
    tabItemText: { fontSize: 13, fontWeight: "800" },
    scrollContent: { padding: 16 },
    gridContainer: { flexDirection: "column", gap: 14 },
    blueprintCard: { borderRadius: 16, borderWidth: 1, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    categoryTag: { backgroundColor: "rgba(212,175,55,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    categoryTagText: { fontSize: 9, color: colors.primary, fontWeight: "900" },
    blueprintName: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
    blueprintDesc: { fontSize: 12, lineHeight: 16, marginBottom: 12 },
    nodesMetaContainer: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
    nodesMetaText: { fontSize: 11, fontWeight: "600" },
    cardActionsRow: { flexDirection: "row", gap: 10 },
    cardActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 10 },
    cardActionText: { fontSize: 11, fontWeight: "700" },
    createBlueprintBtn: { borderStyle: "dashed", borderWidth: 2, borderRadius: 16, padding: 24, alignItems: "center", justifyContent: "center", gap: 8 },
    createBlueprintBtnText: { fontSize: 11, fontWeight: "900", letterSpacing: 1 },
    listContainer: { padding: 16 },
    requestListItem: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
    requestMainBlock: { flexDirection: "row", alignItems: "center", gap: 10 },
    requestDocTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
    requestMetaText: { fontSize: 11, marginTop: 1 },
    statusIndicatorBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusIndicatorBadgeText: { fontSize: 9, fontWeight: "800" },
    rowMenuTrigger: { padding: 6 },
    editorRootContainer: { flex: 1 },
    editorHeaderStrip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    editorBackBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
    editorBackBtnText: { fontSize: 13, fontWeight: "700" },
    editorSaveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    editorSaveBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
    formSectionContainer: { padding: 16, gap: 12 },
    sectionHeadingTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 1.5, marginBottom: 4 },
    formInputContainer: { gap: 4 },
    formFieldLabelText: { fontSize: 11, fontWeight: "700" },
    formTextfieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 13 },
    interactiveNodesWorkspaceContainer: { padding: 16 },
    canvasContextInfoText: { fontSize: 11, marginBottom: 12, fontStyle: "italic" },
    paletteNodesRowGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    paletteNodeItemBlock: { width: (screenWidth - 40) / 2, borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
    paletteNodeLabelText: { fontSize: 12, fontWeight: "700" },
    activeLayoutNodesTrackerSection: { padding: 16, gap: 8 },
    placedNodeManagementCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
    placedNodeCardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    placedNodeMetaLabelText: { fontSize: 13, fontWeight: "700" },
    suggestionAlertBadge: { backgroundColor: "#FFC107", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    suggestionAlertBadgeText: { fontSize: 8, color: "#1A1A1A", fontWeight: "900" },
    placedNodeMetricsSubtext: { fontSize: 11 },
    emptyPlacedNodesFallbackBox: { borderStyle: "dashed", borderWidth: 1, borderRadius: 12, padding: 20, alignItems: "center", gap: 6 },
    emptyPlacedNodesFallbackText: { fontSize: 12 },
    nodeInspectingInspectorPanel: { margin: 16, borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
    structuralSwitchSettingsBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
    switchSettingLabelText: { fontSize: 12, fontWeight: "700" },
    nodeApprovalProcessBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10 },
    nodeApprovalProcessBtnText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
    nodeRemovalDangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(244,67,54,0.3)" },
    nodeRemovalDangerBtnText: { color: colors.danger, fontSize: 11, fontWeight: "800" },
    modalBackdropBlurLayer: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
    dialogSheetModalContentCard: { width: "100%", maxWidth: 400, borderRadius: 16, borderWidth: 1, padding: 20 },
    dialogCardHeaderTitleStrip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    dialogHeaderTitleText: { fontSize: 16, fontWeight: "900" },
    dialogContextInstructionalText: { fontSize: 12, lineHeight: 16 },
    dialogCardActionsRowStrip: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 16 },
    dialogSecondaryActionBtn: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    dialogSecondaryActionBtnText: { fontSize: 12, fontWeight: "700" },
    dialogPrimaryActionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: "center" },
    dialogPrimaryActionBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
    contextMenuActionPanelSheet: { width: "100%", maxWidth: 320, borderRadius: 16, borderWidth: 1, padding: 12, gap: 4 },
    contextMenuHeaderLabelTitle: { fontSize: 9, fontWeight: "900", paddingHorizontal: 10, paddingVertical: 6, letterSpacing: 1 },
    contextMenuItemActionRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10 },
    contextMenuItemActionRowLabelText: { fontSize: 13, fontWeight: "700" },
  });
}