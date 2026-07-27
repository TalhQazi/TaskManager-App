import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { apiFetch } from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

interface EmailPreferences {
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
}

interface Template {
  enabled: boolean;
  subject: string;
  body: string;
}

interface SystemEmailSettings {
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
}

interface EmployeeEmailSettings {
  preferences: EmailPreferences;
  webPreferences?: EmailPreferences;
}

export default function EmployeeEmailSettings() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const primaryColor = useMemo(() => uiTheme.customColors?.primary || "#6366f1", [uiTheme]);
  const bg = useMemo(() => uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b"), [uiTheme, isLightTheme]);
  const cardBg = useMemo(() => uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b"), [uiTheme, isLightTheme]);
  const tintColor = useMemo(() => uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff"), [uiTheme, isLightTheme]);
  const mutedText = useMemo(() => (isLightTheme ? "#64748b" : "#a1a1aa"), [isLightTheme]);
  const structuralBorderColor = useMemo(() => (isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)"), [isLightTheme]);

  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<EmployeeEmailSettings | null>(null);

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
      } as any);
    },
    onSuccess: () => {
      setIsSaving(false);
      queryClient.invalidateQueries({ queryKey: ["employee-email-settings"] });
    },
    onError: (err: any) => {
      setIsSaving(false);
      Alert.alert("Error", err.message || "Failed to update preferences");
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

  const onPreferenceChange = (type: "email" | "web", key: keyof EmailPreferences, value: boolean) => {
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

  const templateDescriptions: Record<string, { title: string; description: string }> = {
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

  const preferenceKeys = Object.keys(templateDescriptions);

  if (employeeLoading || systemLoading) {
    return (
      <SafeAreaView style={s([styles.screenRootSafeArea, { backgroundColor: bg }])}>
        <View style={s(styles.activityIndicatorCenteringFrame)}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (employeeError || systemError || !formData || !systemData) {
    return (
      <SafeAreaView style={s([styles.screenRootSafeArea, { backgroundColor: bg }])}>
        <View style={s(styles.errorFallbackStatePanel)}>
          <MaterialCommunityIcons name="alert-circle-outline" size={fs(12)} color="#ef4444" />
          <Text style={s([styles.errorFallbackStateTitle, { color: tintColor }])}>Error loading settings</Text>
          <Text style={s([styles.errorFallbackStateSub, { color: mutedText }])}>
            {((employeeError || systemError) as any)?.message || "Something went wrong"}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s([styles.screenRootSafeArea, { backgroundColor: bg }])}>
      <StatusBar barStyle={isLightTheme ? "dark-content" : "light-content"} backgroundColor={bg} />
      <ScrollView contentContainerStyle={s(styles.scrollContentLayoutContainer)} showsVerticalScrollIndicator={false}>

        <View style={s(styles.screenHeaderInformationBlock)}>
          <View style={s(styles.screenHeaderTitleFlowRow)}>
            <Text style={s([styles.screenHeaderTitleMainLabel, { color: tintColor }])}>Email Notification Settings</Text>
            <View style={s([styles.screenHeaderStatusTagBadge, { backgroundColor: isLightTheme ? "#dbeafe" : "rgba(37,99,235,0.15)" }])}>
              <Text style={s(styles.screenHeaderStatusTagBadgeText)}>Personal Preferences</Text>
            </View>
          </View>
          <Text style={s([styles.screenHeaderDescriptionSubLabel, { color: mutedText }])}>
            Manage which email notifications you want to receive from the system.
          </Text>
        </View>

        <View style={s([styles.settingsStructureCardFrame, { backgroundColor: cardBg, borderColor: structuralBorderColor }])}>
          <View style={s([styles.settingsCardHeaderStripRow, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", borderBottomColor: structuralBorderColor }])}>
            <View style={s([styles.settingsCardHeaderIconWrapper, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)" }])}>
              <Ionicons name="notifications-outline" size={fs(4.5)} color={primaryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s([styles.settingsCardHeaderPrimaryTitle, { color: tintColor }])}>Notification Preferences</Text>
            </View>
          </View>

          <View style={s(styles.settingsCardBodyContentPaddingZone)}>
            <View style={s([styles.preferenceGridHeaderLabelsBar, { borderBottomColor: structuralBorderColor }])}>
              <Text style={s([styles.preferenceGridColumnHeadingText, { flex: 1 }])}>Notification Channel</Text>
              <Text style={s([styles.preferenceGridColumnHeadingText, styles.preferenceGridChannelLabelWidth])}>Email</Text>
              <Text style={s([styles.preferenceGridColumnHeadingText, styles.preferenceGridChannelLabelWidth])}>In-App</Text>
            </View>

            {preferenceKeys.map((key) => {
              const item = templateDescriptions[key];
              const typedKey = key as keyof EmailPreferences;
              const emailVal = !!formData.preferences?.[typedKey];
              const webVal = !!formData.webPreferences?.[typedKey];

              return (
                <View key={key} style={s([styles.preferenceRowItemDataContainer, { borderBottomColor: structuralBorderColor }])}>
                  <View style={s(styles.preferenceRowItemTextColumn)}>
                    <Text style={s([styles.preferenceRowItemTitleLabel, { color: tintColor }])}>{item.title}</Text>
                    <Text style={s([styles.preferenceRowItemDescriptionLabel, { color: mutedText }])}>{item.description}</Text>
                  </View>
                  <View style={s(styles.preferenceRowItemSwitchWrapper)}>
                    <Switch
                      value={emailVal}
                      onValueChange={(val) => onPreferenceChange("email", typedKey, val)}
                      trackColor={{ false: "#3f3f46", true: primaryColor }}
                      thumbColor="#ffffff"
                    />
                  </View>
                  <View style={s(styles.preferenceRowItemSwitchWrapper)}>
                    <Switch
                      value={webVal}
                      onValueChange={(val) => onPreferenceChange("web", typedKey, val)}
                      trackColor={{ false: "#3f3f46", true: primaryColor }}
                      thumbColor="#ffffff"
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s([styles.settingsStructureCardFrame, { backgroundColor: cardBg, borderColor: structuralBorderColor }])}>
          <TouchableOpacity
            style={s([styles.settingsCardHeaderStripRow, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", borderBottomColor: structuralBorderColor }])}
            onPress={() => setShowDetails(!showDetails)}
            activeOpacity={0.9}
          >
            <View style={s([styles.settingsCardHeaderIconWrapper, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)" }])}>
              <Ionicons name="mail-outline" size={fs(4.5)} color={primaryColor} />
            </View>
            <View style={s({ flex: 1, marginRight: wp(2) })}>
              <Text style={s([styles.settingsCardHeaderPrimaryTitle, { color: tintColor }])}>Email Templates Preview</Text>
            </View>
            <Ionicons name={showDetails ? "chevron-up" : "chevron-down"} size={fs(4.5)} color={mutedText} />
          </TouchableOpacity>

          {showDetails && (
            <View style={s(styles.settingsCardBodyContentPaddingZone)}>
              {Object.entries(systemData.templates)
                .filter(([key]) => key in templateDescriptions)
                .map(([key, template]) => {
                  const descObj = templateDescriptions[key];
                  return (
                    <View key={key} style={s([styles.templatePreviewItemNodeBox, { backgroundColor: bg, borderColor: structuralBorderColor }])}>
                      <View style={s(styles.templatePreviewItemNodeHeaderRow)}>
                        <View style={s({ flex: 1, marginRight: wp(2) })}>
                          <Text style={s([styles.templatePreviewItemNodeTitle, { color: tintColor }])}>{descObj.title}</Text>
                        </View>
                        <View style={s([styles.templatePreviewStatusPillFrame, { backgroundColor: template.enabled ? "rgba(34,197,94,0.1)" : "rgba(113,113,122,0.1)" }])}>
                          <Text style={s([styles.templatePreviewStatusPillText, { color: template.enabled ? "#22c55e" : mutedText }])}>
                            {template.enabled ? "ENABLED" : "DISABLED"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </View>

        <View style={s([styles.settingsStructureCardFrame, { backgroundColor: cardBg, borderColor: structuralBorderColor }])}>
          <View style={s([styles.settingsCardHeaderStripRow, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.02)", borderBottomColor: structuralBorderColor }])}>
            <View style={s([styles.settingsCardHeaderIconWrapper, { backgroundColor: isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)" }])}>
              <Ionicons name="flask-outline" size={fs(4.5)} color={primaryColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s([styles.settingsCardHeaderPrimaryTitle, { color: tintColor }])}>Test Email</Text>
            </View>
          </View>

          <View style={s(styles.settingsCardBodyContentPaddingZone)}>
            <TouchableOpacity
              style={s([styles.testExecutionActionButtonRowCell, { backgroundColor: primaryColor }])}
              onPress={handleTestEmail}
              disabled={testLoading}
              activeOpacity={0.8}
            >
              {testLoading ? (
                <ActivityIndicator size="small" color="#ffffff" style={s({ marginRight: wp(1.5) })} />
              ) : (
                <Ionicons name="send-outline" size={fs(3.5)} color="#ffffff" style={s({ marginRight: wp(1.5) })} />
              )}
              <Text style={s(styles.testExecutionActionButtonLabelText)}>
                {testLoading ? "Sending..." : "Send Test Email"}
              </Text>
            </TouchableOpacity>

            {testResult && (
              <View
                style={s([
                  styles.testDiagnosticStatusResponsePanel,
                  {
                    backgroundColor: testResult.ok ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
                    borderColor: testResult.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                  },
                ])}
              >
                <Text style={s({ color: testResult.ok ? "#16a34a" : "#dc2626", fontSize: fs(3) })}>{testResult.message}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenRootSafeArea: { 
    flex: 1 
  },
  scrollContentLayoutContainer: { 
    paddingHorizontal: wp(4), 
    paddingTop: hp(2), 
    paddingBottom: hp(5) 
  },
  activityIndicatorCenteringFrame: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  errorFallbackStatePanel: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: wp(6) 
  },
  errorFallbackStateTitle: { 
    fontSize: fs(4), 
    fontWeight: "700", 
    marginTop: hp(1.5) 
  },
  errorFallbackStateSub: { 
    fontSize: fs(3.2), 
    textAlign: "center", 
    marginTop: hp(0.5) 
  },
  screenHeaderInformationBlock: { 
    marginBottom: hp(2.5) 
  },
  screenHeaderTitleFlowRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    flexWrap: "wrap", 
    gap: wp(2), 
    marginBottom: hp(0.8) 
  },
  screenHeaderTitleMainLabel: { 
    fontSize: fs(5.5), 
    fontWeight: "800" 
  },
  screenHeaderStatusTagBadge: { 
    paddingHorizontal: wp(2), 
    paddingVertical: hp(0.4), 
    borderRadius: wp(1.5) 
  },
  screenHeaderStatusTagBadgeText: { 
    fontSize: fs(2.5), 
    fontWeight: "700", 
    color: "#2563eb" 
  },
  screenHeaderDescriptionSubLabel: { 
    fontSize: fs(3.2), 
    lineHeight: fs(4.5) 
  },
  settingsStructureCardFrame: { 
    borderRadius: wp(3), 
    borderWidth: 1, 
    overflow: "hidden", 
    marginBottom: hp(2) 
  },
  settingsCardHeaderStripRow: { 
    flexDirection: "row", 
    padding: wp(3.5), 
    borderBottomWidth: 1, 
    alignItems: "center" 
  },
  settingsCardHeaderIconWrapper: { 
    width: wp(8), 
    height: wp(8), 
    borderRadius: wp(2), 
    justifyContent: "center", 
    alignItems: "center", 
    marginRight: wp(3) 
  },
  settingsCardHeaderPrimaryTitle: { 
    fontSize: fs(3.5), 
    fontWeight: "700" 
  },
  settingsCardHeaderSubtitleMuted: { 
    fontSize: fs(2.8), 
    marginTop: 2 
  },
  settingsCardBodyContentPaddingZone: { 
    padding: wp(3.5) 
  },
  preferenceGridHeaderLabelsBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingBottom: hp(1), 
    borderBottomWidth: 1 
  },
  preferenceGridColumnHeadingText: { 
    fontSize: fs(2.8), 
    fontWeight: "700", 
    color: "#71717a", 
    textTransform: "uppercase" 
  },
  preferenceGridChannelLabelWidth: { 
    width: wp(13.5), 
    textAlign: "center" 
  },
  preferenceRowItemDataContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: hp(1.5), 
    borderBottomWidth: 1 
  },
  preferenceRowItemTextColumn: { 
    flex: 1, 
    paddingRight: wp(2) 
  },
  preferenceRowItemTitleLabel: { 
    fontSize: fs(3.2), 
    fontWeight: "600" 
  },
  preferenceRowItemDescriptionLabel: { 
    fontSize: fs(2.8), 
    marginTop: 2 
  },
  preferenceRowItemSwitchWrapper: { 
    width: wp(13.5), 
    justifyContent: "center", 
    alignItems: "center" 
  },
  templatePreviewItemNodeBox: { 
    borderRadius: wp(2), 
    borderWidth: 1, 
    padding: wp(3), 
    marginBottom: hp(1.2) 
  },
  templatePreviewItemNodeHeaderRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "flex-start" 
  },
  templatePreviewItemNodeTitle: { 
    fontSize: fs(3.2), 
    fontWeight: "600" 
  },
  templatePreviewStatusPillFrame: { 
    paddingHorizontal: wp(1.5), 
    paddingVertical: hp(0.2), 
    borderRadius: wp(1) 
  },
  templatePreviewStatusPillText: { 
    fontSize: fs(2.2), 
    fontWeight: "700" 
  },
  testExecutionActionButtonRowCell: { 
    height: hp(4.8), 
    borderRadius: wp(2), 
    flexDirection: "row", 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: wp(4), 
    alignSelf: "flex-start" 
  },
  testExecutionActionButtonLabelText: { 
    color: "#ffffff", 
    fontSize: fs(3), 
    fontWeight: "700" 
  },
  testDiagnosticStatusResponsePanel: { 
    borderRadius: wp(2), 
    borderWidth: 1, 
    padding: wp(3), 
    marginTop: hp(1.5) 
  },
});