import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import {
  Plus,
  Send,
  Settings2,
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
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Mail,
  User,
  Clock,
  Link2,
} from "lucide-react-native";
import Colors from "@/constants/colors";

// API Configuration
const SIGNACORE_API = "http://localhost:3001"; 
const SIGNACORE_APP_URL = SIGNACORE_API;
const SCREEN_WIDTH = Dimensions.get("window").width;

// TypeScript Specifications
type DocumentFieldType = "text" | "signature" | "date" | "number" | "checkbox";
type FieldReviewState = "confirmed" | "suggested";

interface DocumentField {
  id: string;
  label: string;
  type: DocumentFieldType;
  required: boolean;
  pageIndex: number;
  x: number; // Percentages (0 - 100)
  y: number; // Percentages (0 - 100)
  width: number;
  height: number;
  reviewState: FieldReviewState;
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
  documentTitle: string;
}

const FIELD_DEFAULTS: Record<DocumentFieldType, { width: number; height: number; label: string }> = {
  signature: { width: 35, height: 8, label: "Signature" },
  text: { width: 30, height: 6, label: "Text Input" },
  date: { width: 25, height: 6, label: "Date" },
  number: { width: 20, height: 6, label: "Number" },
  checkbox: { width: 8, height: 5, label: "Checkbox" },
};

export default function SignaCoreNative() {
  const [activeTab, setActiveTab] = useState<"blueprints" | "history">("blueprints");
  const [templates, setTemplates] = useState<SignaTemplate[]>([]);
  const [requests, setRequests] = useState<SigningRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Editor states
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SignaTemplate | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [currentEditPage, setCurrentEditPage] = useState(0);

  // Deploy states
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployTarget, setDeployTarget] = useState<SignaTemplate | null>(null);
  const [recipientsText, setRecipientsText] = useState("");

  const canvasRef = useRef<View>(null);
  const [canvasLayout, setCanvasLayout] = useState({ width: SCREEN_WIDTH - 32, height: 450 });

  // Core API Service Integrations
  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SIGNACORE_API}/api/templates`);
      const json = await res.json();
      setTemplates(json.items || []);
    } catch (err) {
      console.log("Could not load templates", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSigningRequests = useCallback(async () => {
    try {
      const res = await fetch(`${SIGNACORE_API}/api/signing-requests`);
      const json = await res.json();
      setRequests(json.items || []);
    } catch (err) {
      console.log("Could not load tracking requests", err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchSigningRequests();
  }, [fetchTemplates, fetchSigningRequests]);

  // Utility logic
  const confirmedFieldsCount = (fields: DocumentField[]) => 
    fields.filter(f => f.reviewState === "confirmed").length;

  const suggestedFieldsCount = (fields: DocumentField[]) => 
    fields.filter(f => f.reviewState === "suggested").length;

  // Template Lifecycle & Field Orchestration Hooks
  const openTemplateEditor = (template?: SignaTemplate) => {
    const freshTemplate: SignaTemplate = template ? JSON.parse(JSON.stringify(template)) : {
      name: "Standard Digital Work Contract",
      category: "Operations",
      description: "Define mobile-first parameters for dynamic signers.",
      documentTitle: "Employment Terms",
      documentContent: "<p>Standard Falling Fallback Contract View</p>",
      isDefault: false,
      fields: []
    };
    setEditingTemplate(freshTemplate);
    setActiveFieldId(freshTemplate.fields[0]?.id || null);
    setEditorOpen(true);
  };

  const addFieldToCanvas = (type: DocumentFieldType) => {
    if (!editingTemplate) return;
    const defaults = FIELD_DEFAULTS[type];
    const newField: DocumentField = {
      id: `field_${Math.random().toString(36).slice(2, 11)}`,
      label: defaults.label,
      type,
      required: true,
      pageIndex: currentEditPage,
      x: 30, // Start centered coordinates
      y: 40,
      width: defaults.width,
      height: defaults.height,
      reviewState: "confirmed",
    };

    setEditingTemplate({
      ...editingTemplate,
      fields: [...editingTemplate.fields, newField],
    });
    setActiveFieldId(newField.id);
  };

  const deleteField = (id: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.filter(f => f.id !== id),
    });
    setActiveFieldId(null);
  };

  // Drag Interaction via Mobile Native Layout Absolute Calculations
  const handleCanvasTouch = (event: any) => {
    if (!editingTemplate || !activeFieldId) return;
    const { locationX, locationY } = event.nativeEvent;
    
    // Convert canvas layout coordinates directly back into structural percentages
    const pctX = Math.min(Math.max((locationX / canvasLayout.width) * 100, 0), 85);
    const pctY = Math.min(Math.max((locationY / canvasLayout.height) * 100, 0), 90);

    setEditingTemplate({
      ...editingTemplate,
      fields: editingTemplate.fields.map(field => 
        field.id === activeFieldId ? { ...field, x: pctX, y: pctY } : field
      )
    });
  };

  // Device File Access Layer
  const pickDocumentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf" });
      if (!result.canceled && editingTemplate) {
        setEditingTemplate({
          ...editingTemplate,
          documentTitle: result.assets[0].name,
          documentUrl: result.assets[0].uri
        });
        Alert.alert("Success", "PDF link mapped onto mobile workflow sandbox engine.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not capture device files.");
    }
  };

  // Submission Pipeline
  const deploySigningRequest = async () => {
    if (!deployTarget) return;
    const emails = recipientsText.split(",").map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      Alert.alert("Error", "Please input target confirmation routing parameters.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${SIGNACORE_API}/api/signing-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: emails.map(email => ({ email, name: "" })),
          documentTitle: deployTarget.documentTitle,
          documentContent: deployTarget.documentContent,
          fields: deployTarget.fields.filter(f => f.reviewState === "confirmed"),
        })
      });
      const json = await res.json();
      if (json.signingLink) {
        await Clipboard.setStringAsync(json.signingLink);
        Alert.alert("Dispatched", "Secure audit-link generated and copied to clipboard.");
      }
      setDeployOpen(false);
      fetchSigningRequests();
    } catch (err) {
      Alert.alert("Error", "Failed to deploy signing request.");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      setLoading(true);
      const url = editingTemplate._id 
        ? `${SIGNACORE_API}/api/templates/${editingTemplate._id}` 
        : `${SIGNACORE_API}/api/templates`;
      
      await fetch(url, {
        method: editingTemplate._id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingTemplate),
      });

      setEditorOpen(false);
      fetchTemplates();
      Alert.alert("Success", "SignaCore secure layout updated successfully.");
    } catch (err) {
      Alert.alert("Error", "Failed to upload operational node schemas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>Signa<Text style={{ color: "#f97316" }}>Core</Text></Text>
          <Text style={styles.brandSubtitle}>MOBILE NODE DEPLOYMENT ENGINE</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => openTemplateEditor()}>
          <Plus color="#fff" size={16} />
          <Text style={styles.newBtnText}>TEMPLATE</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === "blueprints" && styles.activeTabItem]}
          onPress={() => setActiveTab("blueprints")}
        >
          <Text style={[styles.tabLabel, activeTab === "blueprints" && styles.activeTabLabel]}>BLUEPRINTS</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabItem, activeTab === "history" && styles.activeTabItem]}
          onPress={() => setActiveTab("history")}
        >
          <Text style={[styles.tabLabel, activeTab === "history" && styles.activeTabLabel]}>AUDIT LEDGER</Text>
        </TouchableOpacity>
      </View>

      {/* Main Dashboard Scroller */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading && <ActivityIndicator size="large" color="#0284c7" style={{ marginVertical: 20 }} />}
        
        {activeTab === "blueprints" ? (
          templates.map((template) => (
            <View key={template._id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.categoryTag}>{template.category || "GENERAL"}</Text>
                <Text style={styles.liveNodesCount}>
                  <Target size={11} color="#0284c7" /> {confirmedFieldsCount(template.fields)} Nodes
                </Text>
              </View>
              <Text style={styles.cardTitle}>{template.name}</Text>
              <Text style={styles.cardDesc}>{template.description}</Text>
              
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openTemplateEditor(template)}>
                  <Settings2 color="#1e293b" size={14} />
                  <Text style={styles.editBtnText}>Edit Layout</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendBtn} onPress={() => { setDeployTarget(template); setDeployOpen(true); }}>
                  <Send color="#fff" size={14} />
                  <Text style={styles.sendBtnText}>Deploy</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          requests.map((req) => (
            <View key={req._id} style={styles.auditItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.auditTitle} numberOfLines={1}>{req.documentTitle}</Text>
                <Text style={styles.auditEmail}>{req.recipientEmail}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: req.status === "signed" ? "#dcfce7" : "#fef3c7" }]}>
                <Text style={[styles.statusText, { color: req.status === "signed" ? "#15803d" : "#b45309" }]}>
                  {req.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Interactive Builder Canvas Modal Architecture */}
      <Modal visible={editorOpen} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>Architect: {editingTemplate?.name}</Text>
            <TouchableOpacity onPress={() => setEditorOpen(false)}>
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Meta Control Configuration Fields */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Template Blueprint Identity Label</Text>
              <TextInput 
                style={styles.textInput} 
                value={editingTemplate?.name}
                onChangeText={(text) => editingTemplate && setEditingTemplate({ ...editingTemplate, name: text })}
              />
            </View>

            {/* Document Local PDF Attacher Trigger Component */}
            <TouchableOpacity style={styles.uploadTrigger} onPress={pickDocumentFile}>
              <Upload color="#0284c7" size={18} />
              <Text style={styles.uploadTriggerText}>
                {editingTemplate?.documentUrl ? `Attached: ${editingTemplate.documentTitle}` : "Map Native PDF Stream Layer"}
              </Text>
            </TouchableOpacity>

            {/* Anchor Insertion Toolbox Bar */}
            <Text style={styles.toolboxLabel}>INSERTABLE VALIDATION NODES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbox}>
              <TouchableOpacity style={styles.toolItem} onPress={() => addFieldToCanvas("signature")}>
                <FileSignature color="#0284c7" size={14} />
                <Text style={styles.toolItemText}>Signature</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolItem} onPress={() => addFieldToCanvas("text")}>
                <Type color="#0284c7" size={14} />
                <Text style={styles.toolItemText}>Text</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolItem} onPress={() => addFieldToCanvas("date")}>
                <Calendar color="#0284c7" size={14} />
                <Text style={styles.toolItemText}>Date</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolItem} onPress={() => addFieldToCanvas("number")}>
                <Hash color="#0284c7" size={14} />
                <Text style={styles.toolItemText}>Number</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Touch Signature Viewport Placement Grid Layer */}
            <Text style={styles.toolboxLabel}>WORKSPACE PAGE ENGINE VIEWPORT (TAP MAPPED NODES TO RETARGET)</Text>
            <View 
              ref={canvasRef}
              style={styles.interactiveCanvas} 
              onLayout={(e) => setCanvasLayout({ width: e.nativeEvent.layout.width, height: 400 })}
              onTouchStart={handleCanvasTouch}
              onTouchMove={handleCanvasTouch}
            >
              <View style={styles.canvasDocumentPlaceholder}>
                <FileText color="#e2e8f0" size={80} />
                <Text style={styles.canvasPlaceholderText}>{editingTemplate?.documentTitle || "Fallback HTML Core Base View"}</Text>
              </View>

              {/* Loop and absolutely render node positions relative to parent bounds */}
              {editingTemplate?.fields.map((field) => {
                const isSelected = activeFieldId === field.id;
                return (
                  <TouchableOpacity
                    key={field.id}
                    activeOpacity={0.9}
                    onPress={() => setActiveFieldId(field.id)}
                    style={[
                      styles.absoluteFieldNode,
                      {
                        left: `${field.x}%`,
                        top: `${field.y}%`,
                        width: `${field.width}%`,
                        height: `${field.height}%`,
                        borderColor: isSelected ? "#0284c7" : "#94a3b8",
                        backgroundColor: isSelected ? "rgba(2, 132, 199, 0.15)" : "rgba(255,255,255,0.9)",
                      }
                    ]}
                  >
                    <Text style={styles.nodeLabelText} numberOfLines={1}>{field.label}</Text>
                    {isSelected && (
                      <TouchableOpacity style={styles.removeNodeBadge} onPress={() => deleteField(field.id)}>
                        <Trash2 color="#fff" size={10} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Persistent Action Bar */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.saveActionBtn} onPress={saveTemplate}>
              <Text style={styles.saveActionText}>SAVE NODE SCHEMAS</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Recipient Deployment Prompt Overlay Modal */}
      <Modal visible={deployOpen} transparent animationType="fade">
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContent}>
            <Text style={styles.dialogTitle}>Deploy SignaCore Ledger Request</Text>
            <Text style={styles.dialogDescription}>Input comma-separated targets for validation routing maps.</Text>
            <TextInput 
              placeholder="signer@domain.com, audit@firm.co"
              placeholderTextColor="#94a3b8"
              style={styles.dialogInput}
              value={recipientsText}
              onChangeText={setRecipientsText}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogCancel} onPress={() => setDeployOpen(false)}>
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dialogConfirm} onPress={deploySigningRequest}>
                <Text style={styles.dialogConfirmText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brandTitle: { fontSize: 20, fontWeight: "900", tracking: -0.5 },
  brandSubtitle: { fontSize: 8, fontWeight: "700", color: "#94a3b8", marginTop: 2 },
  newBtn: { backgroundColor: "#0284c7", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: "row", alignItems: "center" },
  newBtnText: { color: "#fff", fontSize: 10, fontWeight: "800", marginLeft: 4 },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", paddingHorizontal: 16, borderBottomWidth: 1, borderColor: "#e2e8f0" },
  tabItem: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2, borderColor: "transparent" },
  activeTabItem: { borderColor: "#0284c7" },
  tabLabel: { fontSize: 11, fontWeight: "800", color: "#64748b" },
  activeTabLabel: { color: "#0284c7" },
  scrollContainer: { padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  categoryTag: { backgroundColor: "#f0fdf4", color: "#16a34a", fontSize: 9, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveNodesCount: { fontSize: 10, fontWeight: "700", color: "#0284c7" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#64748b", lineHeight: 18, marginBottom: 16 },
  cardActions: { flexDirection: "row", gap: 8 },
  editBtn: { flex: 1, backgroundColor: "#f1f5f9", height: 36, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  editBtnText: { color: "#1e293b", fontSize: 11, fontWeight: "700" },
  sendBtn: { flex: 1, backgroundColor: "#0ea5e9", height: 36, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  sendBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  auditItem: { backgroundColor: "#fff", padding: 14, borderRadius: 12, marginBottom: 8, borderHorizontalWidth: 1, borderWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center" },
  auditTitle: { fontSize: 13, fontWeight: "700", color: "#1e293b" },
  auditEmail: { fontSize: 11, color: "#64748b", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 9, fontWeight: "800" },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { height: 56, borderBottomWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  modalHeaderTitle: { fontSize: 14, fontWeight: "800", maxWidth: "70%",color:Colors.surface },
  closeModalText: { fontSize: 13, color: "#ef4444", fontWeight: "700" },
  inputGroup: { paddingHorizontal: 16, marginTop: 16 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: "#475569", marginBottom: 6 },
  textInput: { height: 44, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, fontSize: 13, color: "#0f172a" },
  uploadTrigger: { marginHorizontal: 16, marginTop: 12, height: 44, borderWidth: 1, borderStyle: "dashed", borderColor: "#0284c7", borderRadius: 8, backgroundColor: "#f0f9ff", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  uploadTriggerText: { color: "#0284c7", fontSize: 12, fontWeight: "700" },
  toolboxLabel: { fontSize: 10, fontWeight: "800", color: "#94a3b8", marginHorizontal: 16, marginTop: 20, marginBottom: 8, tracking: 0.5 },
  toolbox: { paddingHorizontal: 16, gap: 8, height: 38 },
  toolItem: { backgroundColor: "#f0f9ff", borderWidth: 1, borderColor: "#bae6fd", paddingHorizontal: 12, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 4, marginRight: 8 },
  toolItemText: { fontSize: 11, fontWeight: "700", color: "#0369a1" },
  interactiveCanvas: { marginHorizontal: 16, height: 400, backgroundColor: "#f8fafc", borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1", overflow: "hidden", position: "relative" },
  canvasDocumentPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", padding: 20 },
  canvasPlaceholderText: { fontSize: 12, color: "#94a3b8", fontWeight: "600", marginTop: 8, textAlign: "center" },
  absoluteFieldNode: { position: "absolute", borderWidth: 1.5, borderRadius: 6, alignItems: "center", justifyContent: "center", minWidth: 40, minHeight: 20 },
  nodeLabelText: { fontSize: 8, fontWeight: "900", color: "#0f172a", textTransform: "uppercase", paddingHorizontal: 2 },

  removeNodeBadge: { 
  position: "absolute", 
  top: -6, 
  right: -6, 
  backgroundColor: "#ef4444", 
  width: 14, 
  height: 14, 
  borderRadius: 7, 
  alignItems: "center", 
  justifyContent: "center" 
},
  modalFooter: { borderTopWidth: 1, borderColor: "#e2e8f0", padding: 16, backgroundColor: "#fff" },
  saveActionBtn: { backgroundColor: Colors.golden, height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  saveActionText: { color: Colors.background, fontSize: 13, fontWeight: "800", tracking: 0.5 },
  dialogOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", padding: 24 },
  dialogContent: { backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOpacity: 0.1 },
  dialogTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a", marginBottom: 6 },
  dialogDescription: { fontSize: 12, color: "#64748b", lineHeight: 18, marginBottom: 14 },
  dialogInput: { height: 44, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, fontSize: 13, marginBottom: 16 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  dialogCancel: { height: 36, paddingHorizontal: 14, justifyContent: "center" },
  dialogCancelText: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  dialogConfirm: { backgroundColor: "#0284c7", height: 36, paddingHorizontal: 14, borderRadius: 8, justifyContent: "center" },
  dialogConfirmText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});