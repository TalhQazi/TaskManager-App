import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Dimensions,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Mail,
  Bell,
  Save,
  CheckCircle,
  AlertCircle,
  Send,
  FlaskConical,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

// --- API Implementation Imports ---
// (Adjust paths as needed to match your project architecture)
import { apiFetch } from "@/lib/admin/apiClient";

const { width } = Dimensions.get("window");

// --- TypeScript Definitions ---
type EmailPreferences = {
  userRegistration: boolean;
  managerRegistration: boolean;
  forgotPassword: boolean;
  taskAssignment: boolean;
  fileAttachment: boolean;
  commentAdded: boolean;
  replyAdded: boolean;
  projectAssignment: boolean;
  projectReassignment: boolean;
};

type Template = {
  enabled: boolean;
  subject: string;
  body: string;
};

type SystemEmailSettings = {
  templates: {
    userRegistration: Template;
    managerRegistration: Template;
    forgotPassword: Template;
    taskAssignment: Template;
    fileAttachment: Template;
    commentAdded: Template;
    replyAdded: Template;
    projectAssignment: Template;
    projectReassignment: Template;
  };
};

type EmployeeEmailSettings = {
  preferences: EmailPreferences;
};

// --- Shared Internal UI Layout Subcomponents ---
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CardHeader({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

function CardContent({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

export default function EmployeeEmailSettingsScreen() {
  const queryClient = useQueryClient();
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Native custom fallback for web toasts
  const [nativeToast, setNativeToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setNativeToast({ type, text });
    setTimeout(() => setNativeToast(null), 3500);
  };

  // Test Email States
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTestEmail = async () => {
    try {
      setTestLoading(true);
      setTestResult(null);
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/email/test", {
        method: "POST",
      });
      setTestResult({ ok: true, message: res.message || "Test email sent successfully!" });
      showToast("success", "Test email sent!");
    } catch (err: any) {
      let msg = err?.message || "Failed to send test email.";
      setTestResult({ ok: false, message: msg });
      showToast("error", "Test failed — see details below");
    } finally {
      setTestLoading(false);
    }
  };

  // React Query Fetchers
  const { data: employeeData, isLoading: employeeLoading, error: employeeError } = useQuery({
    queryKey: ["employee-email-settings"],
    queryFn: async () => {
      const res = await apiFetch<{ item: EmployeeEmailSettings }>("/api/email/settings");
      return res.item;
    },
  });

  const { data: systemData, isLoading: systemLoading, error: systemError } = useQuery({
    queryKey: ["system-email-templates"],
    queryFn: async () => {
      const res = await apiFetch<{ item: SystemEmailSettings }>("/api/email/system-templates");
      return res.item;
    },
  });

  const [formData, setFormData] = useState<EmployeeEmailSettings | null>(null);

  useEffect(() => {
    if (employeeData) {
      setFormData(employeeData);
    }
  }, [employeeData]);

  const mutation = useMutation({
    mutationFn: async (updatedSettings: EmployeeEmailSettings) => {
      return apiFetch("/api/email/settings", {
        method: "PUT",
        body: JSON.stringify(updatedSettings),
      });
    },
    onSuccess: () => {
      setIsSaving(false);
      showToast("success", "Email preferences updated");
      queryClient.invalidateQueries({ queryKey: ["employee-email-settings"] });
    },
    onError: (err: any) => {
      setIsSaving(false);
      showToast("error", err.message || "Failed to update preferences");
    },
  });

  // Debounced Auto-Saver implementation
  const autoSave = (data: EmployeeEmailSettings) => {
    setIsSaving(true);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      mutation.mutate(data);
    }, 1000);
  };

  const handlePreferenceChange = (template: keyof EmailPreferences, value: boolean) => {
    setFormData((prev) => {
      if (!prev) return null;
      const updated = {
        ...prev,
        preferences: {
          ...prev.preferences,
          [template]: value,
        },
      };
      autoSave(updated);
      return updated;
    });
  };

  const handleManualSaveSubmit = () => {
    if (formData) {
      setIsSaving(true);
      mutation.mutate(formData);
    }
  };

  if (employeeLoading || systemLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.mutedText}>Loading configuration settings...</Text>
      </View>
    );
  }

  if (employeeError || systemError || !formData || !systemData) {
    return (
      <View style={[styles.container, styles.center, { padding: 24 }]}>
        <AlertCircle color="#ef4444" size={48} />
        <Text style={styles.errorHeading}>Error loading settings</Text>
        <Text style={styles.errorSubheading}>
          {String((employeeError as any)?.message || (systemError as any)?.message || "Something went wrong")}
        </Text>
      </View>
    );
  }

  const templateDescriptions: Record<keyof EmailPreferences, { title: string; description: string }> = {
    userRegistration: { title: "User Registration", description: "Sent when a new employee or user is registered" },
    managerRegistration: { title: "Manager Registration", description: "Sent when a new manager account is created" },
    forgotPassword: { title: "Forgot Password", description: "Sent when a user requests a password reset" },
    taskAssignment: { title: "Task Assignment", description: "Sent when you are assigned a new task" },
    fileAttachment: { title: "File Attachment", description: "Sent when a file is attached to a task" },
    commentAdded: { title: "Task Comment", description: "Sent when a comment is added to a task" },
    replyAdded: { title: "Comment Reply / Mention", description: "Sent when you are mentioned or replied to in a comment" },
    projectAssignment: { title: "Project Assignment", description: "Sent when you are assigned to a new project" },
    projectReassignment: { title: "Project Reassignment", description: "Sent when a project is reassigned to you" },
  };

  return (
    <View style={styles.container}>
      {/* Toast Alert View Layer */}
      {nativeToast && (
        <View style={[styles.toastContainer, nativeToast.type === "success" ? styles.toastSuccess : styles.toastError]}>
          <Text style={styles.toastText}>{nativeToast.text}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Block Section */}
        <View style={styles.headerBlock}>
          <View style={styles.rowWrap}>
            <Text style={styles.mainTitle}>Email Notification Settings</Text>
            <View style={styles.badgeLabel}>
              <Text style={styles.badgeText}>Personal Preferences</Text>
            </View>
          </View>
          <Text style={styles.mainDesc}>
            Manage which email notifications you want to receive from the system. Email templates and SMTP configuration are managed by your administrator.
          </Text>
        </View>

        {/* 1. Email Preferences Notification Card */}
        <Card>
          <CardHeader>
            <View style={styles.iconContainer}>
              <Bell color="#3b82f6" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Notification Preferences</Text>
              <Text style={styles.cardDesc}>Choose which email notifications you want to receive</Text>
            </View>
          </CardHeader>
          <CardContent>
            <View style={styles.preferencesList}>
              {Object.entries(formData.preferences).map(([key, enabled]) => (
                <View key={key} style={styles.preferenceRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.prefTitle}>
                      {templateDescriptions[key as keyof EmailPreferences].title}
                    </Text>
                    <Text style={styles.prefDesc}>
                      {templateDescriptions[key as keyof EmailPreferences].description}
                    </Text>
                  </View>
                  <View style={styles.switchWrapper}>
                    <Text style={[styles.switchStatusLabel, enabled ? styles.statusOn : styles.statusOff]}>
                      {enabled ? "ON" : "OFF"}
                    </Text>
                    <Switch
                      value={enabled}
                      onValueChange={(val) => handlePreferenceChange(key as keyof EmailPreferences, val)}
                      trackColor={{ false: "#27272a", true: "#1e3a8a" }}
                      thumbColor={enabled ? "#3b82f6" : "#71717a"}
                    />
                  </View>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        {/* 2. Read-Only Email Templates Preview Accordion Card */}
        <Card>
          <TouchableOpacity 
            activeOpacity={0.8} 
            onPress={() => setShowDetails(!showDetails)}
            style={styles.accordionHeader}
          >
            <View style={styles.iconContainer}>
              <Mail color="#3b82f6" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>Email Templates Preview</Text>
                <View style={styles.readOnlyBadge}>
                  <Text style={styles.readOnlyBadgeText}>READ-ONLY</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>View the templates configured in the system</Text>
            </View>
            {showDetails ? <ChevronUp color="#a1a1aa" size={18} /> : <ChevronDown color="#a1a1aa" size={18} />}
          </TouchableOpacity>

          {showDetails && (
            <CardContent style={styles.accordionContent}>
              {Object.entries(systemData.templates).map(([key, template]) => (
                <View key={key} style={styles.templateBox}>
                  <View style={[styles.row, { justifyContent: "space-between", marginBottom: 8 }]}>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.templateBoxTitle}>
                        {templateDescriptions[key as keyof EmailPreferences].title}
                      </Text>
                      <Text style={styles.templateBoxDesc}>
                        {templateDescriptions[key as keyof EmailPreferences].description}
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, template.enabled ? styles.bgActive : styles.bgMuted]}>
                      <Text style={[styles.statusBadgeText, template.enabled ? styles.textActive : styles.textMuted]}>
                        {template.enabled ? "ENABLED" : "DISABLED"}
                      </Text>
                    </View>
                  </View>

                  {template.enabled && (
                    <View style={styles.monoPreviewBlock}>
                      <Text style={styles.monoLabel}>Subject:</Text>
                      <Text style={styles.monoText}>{template.subject}</Text>
                      
                      <Text style={[styles.monoLabel, { marginTop: 6 }]}>Body Preview:</Text>
                      <Text style={styles.monoText} numberOfLines={3} ellipsizeMode="tail">
                        {template.body}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </CardContent>
          )}
        </Card>

        {/* 3. Send Test Email Sandbox Panel */}
        <Card>
          <CardHeader>
            <View style={styles.iconContainer}>
              <FlaskConical color="#3b82f6" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Test Email Verification</Text>
              <Text style={styles.cardDesc}>
                Send a test notification email to verify your configuration settings. Test will be delivered directly to your registered user address.
              </Text>
            </View>
          </CardHeader>
          <CardContent>
            <TouchableOpacity 
              activeOpacity={0.7} 
              style={[styles.testButton, testLoading && styles.disabledBtn]} 
              onPress={handleTestEmail}
              disabled={testLoading}
            >
              {testLoading ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
              ) : (
                <Send color="#ffffff" size={16} style={{ marginRight: 8 }} />
              )}
              <Text style={styles.testButtonText}>{testLoading ? "Sending Test..." : "Send Test Email"}</Text>
            </TouchableOpacity>

            {testResult && (
              <View style={[styles.resultAlertBox, testResult.ok ? styles.alertSuccess : styles.alertError]}>
                {testResult.ok ? (
                  <CheckCircle color="#22c55e" size={18} style={styles.alertIcon} />
                ) : (
                  <AlertCircle color="#ef4444" size={18} style={styles.alertIcon} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.alertTitle, testResult.ok ? styles.textGreen : styles.textRed]}>
                    {testResult.ok ? "Transmission Success" : "Transmission Failed"}
                  </Text>
                  <Text style={styles.alertBody}>{testResult.message}</Text>
                </View>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Action Action Bottom Layout Controls */}
        <View style={styles.bottomControlContainer}>
          {isSaving && (
            <View style={styles.autoSavingStatusRow}>
              <ActivityIndicator size="small" color="#a1a1aa" style={{ marginRight: 6 }} />
              <Text style={styles.autoSavingText}>Auto-saving changes...</Text>
            </View>
          )}

          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleManualSaveSubmit}
            disabled={mutation.isPending || isSaving}
            style={[styles.saveAllBtn, (mutation.isPending || isSaving) && styles.disabledBtn]}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
            ) : (
              <Save color="#ffffff" size={18} style={{ marginRight: 8 }} />
            )}
            <Text style={styles.saveAllBtnText}>{mutation.isPending ? "Saving Settings..." : "Save All"}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// --- Stylings Definition Sheet ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#09090b" },
  center: { justifyContent: "center", alignItems: "center" },
  scrollContainer: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60 },
  row: { flexDirection: "row", alignItems: "center" },
  rowWrap: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  mutedText: { color: "#a1a1aa", fontSize: 14, marginTop: 12 },

  // Error boundary page styling
  errorHeading: { color: "#ffffff", fontSize: 18, fontWeight: "bold", marginTop: 16 },
  errorSubheading: { color: "#71717a", fontSize: 13, textAlign: "center", marginTop: 6 },

  // Toast Layer Components
  toastContainer: { position: "absolute", top: 16, left: 16, right: 16, padding: 12, borderRadius: 8, zIndex: 9999, elevation: 5 },
  toastSuccess: { backgroundColor: "#14532d" },
  toastError: { backgroundColor: "#7f1d1d" },
  toastText: { color: "#ffffff", fontSize: 13, fontWeight: "600", textAlign: "center" },

  // Header Styles
  headerBlock: { marginBottom: 24, gap: 6 },
  mainTitle: { color: "#ffffff", fontSize: 24, fontWeight: "bold", tracking: -0.5 },
  badgeLabel: { backgroundColor: "#1e3a8a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: "#bfdbfe", fontSize: 11, fontWeight: "700" },
  mainDesc: { color: "#a1a1aa", fontSize: 13, lineHeight: 18 },

  // Shared Atomic Cards Layout
  card: { backgroundColor: "#18181b", borderColor: "#27272a", borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: "hidden" },
  cardHeader: { padding: 16, backgroundColor: "#1c1c1f", borderBottomWidth: 1, borderBottomColor: "#27272a", flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconContainer: { padding: 8, backgroundColor: "#27272a", borderRadius: 8 },
  cardTitle: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  cardDesc: { color: "#71717a", fontSize: 12, marginTop: 2 },
  cardContent: { padding: 16 },

  // Notification Preferences Items Row
  preferencesList: { gap: 12 },
  preferenceRow: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#222226", borderColor: "#27272a", borderWidth: 1, borderRadius: 8, justifyContent: "space-between" },
  prefTitle: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  prefDesc: { color: "#a1a1aa", fontSize: 12, marginTop: 2, lineHeight: 16 },
  switchWrapper: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: 8 },
  switchStatusLabel: { fontSize: 11, fontWeight: "700", minWidth: 26, textAlign: "right" },
  statusOn: { color: "#3b82f6" },
  statusOff: { color: "#71717a" },

  // Accordion Component 
  accordionHeader: { padding: 16, backgroundColor: "#1c1c1f", flexDirection: "row", gap: 12, alignItems: "center" },
  accordionContent: { padding: 16, backgroundColor: "#141416", borderTopWidth: 1, borderTopColor: "#27272a", gap: 12 },
  readOnlyBadge: { backgroundColor: "#78350f", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 6 },
  readOnlyBadgeText: { color: "#fef3c7", fontSize: 9, fontWeight: "800" },

  // Template Inside Preview Boxes
  templateBox: { padding: 12, borderColor: "#27272a", borderWidth: 1, borderRadius: 8, backgroundColor: "#1c1c1f" },
  templateBoxTitle: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  templateBoxDesc: { color: "#71717a", fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  bgActive: { backgroundColor: "#064e3b" },
  bgMuted: { backgroundColor: "#27272a" },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  textActive: { color: "#a7f3d0" },
  textMuted: { color: "#a1a1aa" },
  monoPreviewBlock: { marginTop: 10, padding: 8, backgroundColor: "#09090b", borderColor: "#27272a", borderWidth: 1, borderRadius: 6 },
  monoLabel: { fontSize: 10, color: "#71717a", fontWeight: "600", textTransform: "uppercase" },
  monoText: { fontFamily: "monospace", fontSize: 11, color: "#e4e4e7", marginTop: 2 },

  // Testing Sandbox Styling elements
  testButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#27272a", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: "flex-start" },
  testButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  resultAlertBox: { flexDirection: "row", marginTop: 12, padding: 12, borderWidth: 1, borderRadius: 8 },
  alertSuccess: { backgroundColor: "#052e16", borderColor: "#15803d" },
  alertError: { backgroundColor: "#450a0a", borderColor: "#991b1b" },
  alertIcon: { marginRight: 10, marginTop: 2 },
  alertTitle: { fontSize: 13, fontWeight: "600" },
  alertBody: { color: "#d4d4d8", fontSize: 11, fontFamily: "monospace", marginTop: 4, lineHeight: 15 },
  textGreen: { color: "#4ade80" },
  textRed: { color: "#f87171" },

  // Bottom Floating Operations Row
  bottomControlContainer: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 12, gap: 12, flexWrap: "wrap" },
  autoSavingStatusRow: { flexDirection: "row", alignItems: "center" },
  autoSavingText: { color: "#71717a", fontSize: 12 },
  saveAllBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#3b82f6", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, elevation: 2 },
  saveAllBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  disabledBtn: { opacity: 0.5 }
});