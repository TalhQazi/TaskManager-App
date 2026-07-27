import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
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

import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

const { width } = Dimensions.get("window");

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
  preAdverseAction?: boolean;
  finalAdverseAction?: boolean;
  patentExpiration?: boolean;
  lunchBreakAlert?: boolean;
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
    preAdverseAction?: Template;
    finalAdverseAction?: Template;
    patentExpiration?: Template;
    lunchBreakAlert?: Template;
  };
};

type EmployeeEmailSettings = {
  preferences: EmailPreferences;
  webPreferences?: Record<string, boolean>;
};

export default function EmployeeEmailSettings() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();
  
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#133767", [uiTheme]);
  const border = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const handleTestEmail = async () => {
    try {
      setTestLoading(true);
      setTestResult(null);
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/email/test", {
        method: "POST",
      });
      setTestResult({ ok: true, message: res.message || "Test email sent successfully!" });
    } catch (err: any) {
      const msg = err?.message || "Failed to send test email.";
      setTestResult({ ok: false, message: msg });
    } finally {
      setTestLoading(false);
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ["employee-email-settings"] });
    },
    onError: () => {
      setIsSaving(false);
    },
  });

  const autoSave = (data: EmployeeEmailSettings) => {
    setIsSaving(true);
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      mutation.mutate(data);
    }, 1000);
  };

  const onPreferenceChange = (type: "email" | "web", key: string, value: boolean) => {
    setFormData((prev) => {
      if (!prev) return null;
      const prefKey = type === "email" ? "preferences" : "webPreferences";
      const updated = {
        ...prev,
        [prefKey]: {
          ...(prev[prefKey] || {}),
          [key]: value,
        },
      };
      autoSave(updated);
      return updated;
    });
  };

  const handleManualSubmit = () => {
    if (formData) {
      setIsSaving(true);
      mutation.mutate(formData);
    }
  };

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

  if (employeeLoading || systemLoading) {
    return (
      <View style={s([styles.centerContainer, { backgroundColor: bg }])}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  if (employeeError || systemError || !formData || !systemData) {
    return (
      <View style={s([styles.centerContainer, { backgroundColor: bg, padding: wp(6) }])}>
        <AlertCircle size={fs(12)} color="rgb(239, 68, 68)" style={s({ marginBottom: hp(2) })} />
        <Text style={s([styles.errorTitle, { color: tintColor }])}>Error loading settings</Text>
        <Text style={s([styles.errorSubtitle, { color: mutedText }])}>
          {(employeeError as any)?.message || (systemError as any)?.message || "Something went wrong"}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={s([styles.mainWrapper, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      
      <ScrollView contentContainerStyle={s(styles.scrollWrapper)} showsVerticalScrollIndicator={false}>
        <View style={s(styles.headerBlock)}>
          <View style={s(styles.headerTitleRow)}>
            <Text style={s([styles.mainHeadingText, { color: tintColor }])}>Email Notification Settings</Text>
            <View style={s([styles.pillBadge, { backgroundColor: isLightTheme ? "rgba(59, 130, 246, 0.15)" : "rgba(30, 41, 59, 0.8)" }])}>
              <Text style={s([styles.pillBadgeText, { color: isLightTheme ? "rgb(29, 78, 216)" : "#60A5FA" }])}>Personal Preferences</Text>
            </View>
          </View>
          <Text style={s([styles.headingDescriptionText, { color: mutedText }])}>
            Manage which email notifications you want to receive from the system. Email templates and SMTP configuration are managed by your administrator.
          </Text>
        </View>

        <View style={s([styles.cardContainer, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s([styles.cardHeader, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", borderBottomColor: border }])}>
            <View style={s(styles.cardHeaderLeft)}>
              <View style={s([styles.headerIconWrapper, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }])}>
                <Bell size={fs(4.5)} color={primaryColor} />
              </View>
              <View>
                <Text style={s([styles.cardTitleText, { color: tintColor }])}>Notification Preferences</Text>
                <Text style={s([styles.cardDescriptionText, { color: mutedText }])}>Choose which email and in-app alerts you want to receive</Text>
              </View>
            </View>
          </View>

          <View style={s(styles.cardContent)}>
            {(Object.keys(templateDescriptions) as Array<keyof EmailPreferences>).map((key) => {
              const pref = templateDescriptions[key];
              const emailVal = !!formData.preferences?.[key];
              const webVal = !!formData.webPreferences?.[key];

              return (
                <View key={key} style={s([styles.preferenceItemRow, { borderBottomColor: border }])}>
                  <View style={s(styles.preferenceInfoCol)}>
                    <Text style={s([styles.preferenceTitleText, { color: tintColor }])}>{pref.title}</Text>
                    <Text style={s([styles.preferenceDescriptionText, { color: mutedText }])}>{pref.description}</Text>
                  </View>
                  <View style={s(styles.preferenceToggleCol)}>
                    <View style={s(styles.toggleUnit)}>
                      <Text style={s([styles.toggleUnitLabel, { color: mutedText }])}>Email</Text>
                      <Switch
                        value={emailVal}
                        onValueChange={(val) => onPreferenceChange("email", key, val)}
                        trackColor={{ false: border, true: primaryColor }}
                        thumbColor="#ffffff"
                      />
                    </View>
                    <View style={s(styles.toggleUnit)}>
                      <Text style={s([styles.toggleUnitLabel, { color: mutedText }])}>In-App</Text>
                      <Switch
                        value={webVal}
                        onValueChange={(val) => onPreferenceChange("web", key, val)}
                        trackColor={{ false: border, true: primaryColor }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s([styles.cardContainer, { backgroundColor: cardBg, borderColor: border }])}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={s([styles.cardHeader, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", borderBottomColor: border }])}
            onPress={() => setShowDetails(!showDetails)}
          >
            <View style={s(styles.cardHeaderLeft)}>
              <View style={s([styles.headerIconWrapper, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }])}>
                <Mail size={fs(4.5)} color={primaryColor} />
              </View>
              <View style={s({ flex: 1, paddingRight: wp(2) })}>
                <View style={s(styles.templateHeaderRow)}>
                  <Text style={s([styles.cardTitleText, { color: tintColor }])}>Email Templates Preview</Text>
                  <View style={s([styles.pillBadge, { backgroundColor: "rgba(245, 158, 11, 0.15)" }])}>
                    <Text style={s([styles.pillBadgeText, { color: "rgb(180, 83, 9)" }])}>READ-ONLY</Text>
                  </View>
                </View>
                <Text style={s([styles.cardDescriptionText, { color: mutedText }])} numberOfLines={1}>
                  View the email templates configured in the system
                </Text>
              </View>
            </View>
            {showDetails ? <ChevronUp size={fs(4)} color={mutedText} /> : <ChevronDown size={fs(4)} color={mutedText} />}
          </TouchableOpacity>

          {showDetails ? (
            <View style={s([styles.cardContent, { gap: hp(2) }])}>
              {Object.entries(systemData.templates)
                .filter(([key]) => key in templateDescriptions)
                .map(([key, template]) => {
                  const desc = templateDescriptions[key as keyof EmailPreferences];
                  return (
                    <View key={key} style={s([styles.templatePreviewBox, { backgroundColor: bg, borderColor: border }])}>
                      <View style={s(styles.templateMetaRow)}>
                        <View style={s({ flex: 1, paddingRight: wp(2) })}>
                          <Text style={s([styles.templateBoxTitle, { color: tintColor }])}>{desc.title}</Text>
                          <Text style={s([styles.templateBoxDescription, { color: mutedText }])}>{desc.description}</Text>
                        </View>
                        <View style={s([styles.statusIndicatorTag, { backgroundColor: template.enabled ? "rgba(34, 197, 94, 0.12)" : "rgba(107, 114, 128, 0.12)" }])}>
                          <Text style={s([styles.statusIndicatorText, { color: template.enabled ? "rgb(21, 128, 61)" : mutedText }])}>
                            {template.enabled ? "ENABLED" : "DISABLED"}
                          </Text>
                        </View>
                      </View>

                      {template.enabled ? (
                        <View style={s(styles.templatePayloadBlock)}>
                          <View style={s(styles.payloadFieldUnit)}>
                            <Text style={s([styles.payloadFieldLabel, { color: mutedText }])}>Subject:</Text>
                            <View style={s([styles.payloadFieldContainer, { backgroundColor: cardBg, borderColor: border }])}>
                              <Text style={s([styles.payloadCodeText, { color: tintColor }])}>{template.subject}</Text>
                            </View>
                          </View>
                          <View style={s(styles.payloadFieldUnit)}>
                            <Text style={s([styles.payloadFieldLabel, { color: mutedText }])}>Body Preview:</Text>
                            <View style={s([styles.payloadFieldContainer, { backgroundColor: cardBg, borderColor: border }])}>
                              <Text style={s([styles.payloadCodeText, { color: tintColor }])} numberOfLines={3}>
                                {template.body}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
            </View>
          ) : null}
        </View>

        <View style={s([styles.cardContainer, { backgroundColor: cardBg, borderColor: border }])}>
          <View style={s([styles.cardHeader, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", borderBottomColor: border }])}>
            <View style={s(styles.cardHeaderLeft)}>
              <View style={s([styles.headerIconWrapper, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }])}>
                <FlaskConical size={fs(4.5)} color={primaryColor} />
              </View>
              <View style={s({ flex: 1 })}>
                <Text style={s([styles.cardTitleText, { color: tintColor }])}>Test Email</Text>
                <Text style={s([styles.cardDescriptionText, { color: mutedText }])}>
                  Send a test notification email to verify your email is configured correctly. Test will be sent to your registered email address.
                </Text>
              </View>
            </View>
          </View>

          <View style={s(styles.cardContent)}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={s([styles.sendTestButton, { backgroundColor: primaryColor }])}
              disabled={testLoading}
              onPress={handleTestEmail}
            >
              {testLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Send size={fs(3.5)} color="#ffffff" />
                  <Text style={s(styles.sendTestButtonText)}>Send Test Email</Text>
                </>
              )}
            </TouchableOpacity>

            {testResult ? (
              <View
                style={s([
                  styles.testResultBanner,
                  {
                    backgroundColor: testResult.ok ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    borderColor: testResult.ok ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                  },
                ])}
              >
                <View style={s(styles.bannerHeader)}>
                  {testResult.ok ? (
                    <CheckCircle size={fs(4)} color="rgb(34, 197, 94)" />
                  ) : (
                    <AlertCircle size={fs(4)} color="rgb(239, 68, 68)" />
                  )}
                  <Text style={s([styles.bannerTitleText, { color: testResult.ok ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)" }])}>
                    {testResult.ok ? "Success" : "Failed"}
                  </Text>
                </View>
                <Text style={s([styles.bannerMessageBody, { color: testResult.ok ? "rgb(21, 128, 61)" : "rgb(185, 28, 28)" }])}>
                  {testResult.message}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s(styles.formFooterRow)}>
          {isSaving ? (
            <View style={s(styles.autoSaveFeedback)}>
              <ActivityIndicator size="small" color={mutedText} />
              <Text style={s([styles.autoSaveText, { color: mutedText }])}>Auto-saving...</Text>
            </View>
          ) : <View />}

          <TouchableOpacity
            activeOpacity={0.8}
            style={s([styles.manualSaveButton, { backgroundColor: primaryColor }])}
            disabled={mutation.isPending || isSaving}
            onPress={handleManualSubmit}
          >
            {mutation.isPending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={fs(4)} color="#ffffff" />
                <Text style={s(styles.manualSaveButtonText)}>Save All</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorTitle: { fontSize: fs(4), fontWeight: "700", marginBottom: hp(0.5) },
  errorSubtitle: { fontSize: fs(3.2), textAlign: "center" },
  scrollWrapper: { padding: wp(4), gap: hp(2.5), paddingBottom: hp(6) },
  headerBlock: { gap: hp(0.8) },
  headerTitleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: wp(2) },
  mainHeadingText: { fontSize: fs(5.5), fontWeight: "800", letterSpacing: -0.5 },
  pillBadge: { paddingHorizontal: wp(2), paddingVertical: hp(0.25), borderRadius: wp(1.5) },
  pillBadgeText: { fontSize: fs(2.5), fontWeight: "700" },
  headingDescriptionText: { fontSize: fs(3.2), lineHeight: fs(4.5) },
  cardContainer: { borderRadius: wp(3), borderWidth: 1, overflow: "hidden" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: wp(3.5), borderBottomWidth: 1 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "flex-start", gap: wp(2.5), flex: 1 },
  headerIconWrapper: { width: wp(8.5), height: wp(8.5), borderRadius: wp(2), justifyContent: "center", alignItems: "center" },
  cardTitleText: { fontSize: fs(3.5), fontWeight: "700" },
  cardDescriptionText: { fontSize: fs(3), marginTop: hp(0.25), lineHeight: fs(4) },
  cardContent: { padding: wp(3.5) },
  preferenceItemRow: { flexDirection: "column", paddingVertical: hp(1.5), borderBottomWidth: 1, gap: hp(1.2) },
  preferenceInfoCol: { gap: hp(0.25) },
  preferenceTitleText: { fontSize: fs(3.5), fontWeight: "700" },
  preferenceDescriptionText: { fontSize: fs(3), lineHeight: fs(4) },
  preferenceToggleCol: { flexDirection: "row", alignItems: "center", gap: wp(6), marginTop: hp(0.25) },
  toggleUnit: { flexDirection: "row", alignItems: "center", gap: wp(2) },
  toggleUnitLabel: { fontSize: fs(3), fontWeight: "600" },
  templateHeaderRow: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
  templatePreviewBox: { borderRadius: wp(2), borderWidth: 1, padding: wp(3), gap: hp(1.5) },
  templateMetaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  templateBoxTitle: { fontSize: fs(3.2), fontWeight: "700" },
  templateBoxDescription: { fontSize: fs(2.8), marginTop: hp(0.1) },
  statusIndicatorTag: { paddingHorizontal: wp(1.5), paddingVertical: hp(0.25), borderRadius: wp(1) },
  statusIndicatorText: { fontSize: fs(2.2), fontWeight: "700" },
  templatePayloadBlock: { gap: hp(1.2) },
  payloadFieldUnit: { gap: hp(0.5) },
  payloadFieldLabel: { fontSize: fs(2.8), fontWeight: "600" },
  payloadFieldContainer: { borderWidth: 1, borderRadius: wp(1.5), padding: wp(2) },
  payloadCodeText: { fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", fontSize: fs(2.8), lineHeight: fs(4) },
  sendTestButton: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: wp(1.5), paddingHorizontal: wp(3.5), paddingVertical: hp(1), borderRadius: wp(2) },
  sendTestButtonText: { color: "#ffffff", fontSize: fs(3.2), fontWeight: "600" },
  testResultBanner: { borderRadius: wp(2), borderWidth: 1, padding: wp(3), marginTop: hp(1.5), gap: hp(0.5) },
  bannerHeader: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
  bannerTitleText: { fontSize: fs(3.2), fontWeight: "700" },
  bannerMessageBody: { fontSize: fs(2.8), fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", lineHeight: fs(4), marginTop: hp(0.25) },
  formFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: hp(1) },
  autoSaveFeedback: { flexDirection: "row", alignItems: "center", gap: wp(1.5) },
  autoSaveText: { fontSize: fs(3.2) },
  manualSaveButton: { flexDirection: "row", alignItems: "center", gap: wp(1.5), paddingHorizontal: wp(5), paddingVertical: hp(1.2), borderRadius: wp(2) },
  manualSaveButtonText: { color: "#ffffff", fontSize: fs(3.5), fontWeight: "700" },
});