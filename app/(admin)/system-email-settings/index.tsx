import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Send,
  FlaskConical,
  Sparkles,
  ChevronDown,
} from "lucide-react-native";

import { apiFetch } from "@/lib/admin/apiClient";
import { useTheme } from "@/contexts/ThemeContext";

type EmailConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromAddress: string;
  senderName: string;
};

type Template = {
  enabled: boolean;
  subject: string;
  body: string;
};

type SystemSettings = {
  emailConfig: EmailConfig;
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
  taskRewardSystemEnabled?: boolean;
  scheConfig?: {
    enableReligiousHolidays: boolean;
    switchNeutralSeasonal: boolean;
    forceCompanyUnifiedTheme: string;
  };
};

const THEME_OPTIONS = [
  { label: "-- No Global Override (Use Location Hierarchy) --", value: "" },
  { label: "Lunar New Year (Asia)", value: "lunar-new-year" },
  { label: "Diwali (India)", value: "diwali" },
  { label: "Eid al-Fitr", value: "eid-al-fitr" },
  { label: "Eid al-Adha", value: "eid-al-adha" },
  { label: "Hanukkah", value: "hanukkah" },
  { label: "Ramadan", value: "ramadan" },
  { label: "Chinese Mid-Autumn Festival", value: "mid-autumn-festival" },
  { label: "Golden Week (Japan)", value: "golden-week" },
  { label: "Bastille Day (France)", value: "bastille-day" },
  { label: "Oktoberfest (Germany)", value: "oktoberfest" },
  { label: "Canada Day", value: "canada-day" },
  { label: "Australia Day", value: "australia-day" },
];

export default function SystemEmailSettings() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();
  const [showPass, setShowPass] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<SystemSettings | null>(null);

  const isDark = useMemo(
    () => ["dark-minimal", "neon-tech", "metallic-elite", "executive-black", "high-contrast", "energy-mode"].includes(uiTheme?.theme || ""),
    [uiTheme?.theme]
  );

  const themeColors = useMemo(() => {
    const goldPrimary = "#D4AF37";
    const goldAccent = "#AA7C11";

    if (isDark) {
      return {
        background: "#0D1117",
        cardBg: "#161B22",
        text: "#FFFFFF",
        muted: "#8B949E",
        border: "#30363D",
        primary: goldPrimary,
        accent: goldAccent,
        surface: "#21262D",
        success: "#2EA44F",
        warning: "#F59E0B",
        danger: "#F85149",
        inputBg: "#0D1117",
        white: "#FFFFFF",
      };
    }
    return {
      background: "#F8FAFC",
      cardBg: "#FFFFFF",
      text: "#0F172A",
      muted: "#64748B",
      border: "#E2E8F0",
      primary: goldAccent,
      accent: goldPrimary,
      surface: "#F1F5F9",
      success: "#166534",
      warning: "#D97706",
      danger: "#DC2626",
      inputBg: "#F8FAFC",
      white: "#FFFFFF",
    };
  }, [isDark]);

  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const res = await apiFetch<{ item: SystemSettings }>("/api/system-settings");
      return res.item;
    },
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (updatedSettings: SystemSettings) => {
      return apiFetch("/api/system-settings", {
        method: "PUT",
        body: JSON.stringify(updatedSettings),
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "System settings updated successfully.");
      void queryClient.invalidateQueries({ queryKey: ["system-settings"] });
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to update settings");
    },
  });

  const handleTestEmail = async () => {
    if (!testTo.trim()) {
      Alert.alert("Validation Error", "Enter a recipient email address.");
      return;
    }
    try {
      setTestLoading(true);
      setTestResult(null);
      const res = await apiFetch<{ ok: boolean; message: string }>("/api/system-settings/test-email", {
        method: "POST",
        body: JSON.stringify({ to: testTo.trim() }),
      });
      setTestResult({ ok: true, message: res.message || "Test email sent successfully!" });
      Alert.alert("Success", "Test email sent!");
    } catch (err: any) {
      let msg = err?.message || "Failed to send test email.";
      if (msg.toLowerCase().includes("app password") || msg.includes("535")) {
        msg += "\n\n→ Your provider requires an App Password. Use the provider-specific link in the Password field above to create one.";
      } else if (msg.toLowerCase().includes("self signed") || msg.toLowerCase().includes("certificate")) {
        msg += "\n\n→ Certificate error — this is usually safe to ignore for internal SMTP servers.";
      } else if (msg.toLowerCase().includes("econnrefused") || msg.toLowerCase().includes("timeout")) {
        msg += `\n\n→ Could not connect. Check that the SMTP Host and Port are correct, and that port ${formData?.emailConfig?.port || 587} is unblocked.`;
      }
      setTestResult({ ok: false, message: msg });
      Alert.alert("Test Failed", "See configuration diagnosis guidelines block below.");
    } finally {
      setTestLoading(false);
    }
  };

  const handleConfigChange = (field: keyof EmailConfig, value: any) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        emailConfig: { ...prev.emailConfig, [field]: value },
      };
    });
  };

  const handleTemplateChange = (key: keyof SystemSettings["templates"], field: keyof Template, value: any) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        templates: {
          ...prev.templates,
          [key]: { ...prev.templates[key], [field]: value },
        },
      };
    });
  };

  const triggerThemePickerSheet = () => {
    Alert.alert(
      "Force Company Unified Theme",
      "Select an over-riding operational template matrix layer:",
      [
        ...THEME_OPTIONS.map((opt) => ({
          text: opt.label,
          onPress: () => {
            setFormData((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                scheConfig: {
                  ...prev.scheConfig || { enableReligiousHolidays: true, switchNeutralSeasonal: false, forceCompanyUnifiedTheme: "" },
                  forceCompanyUnifiedTheme: opt.value,
                },
              };
            });
          },
        })),
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleSubmit = () => {
    if (formData) {
      mutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerLoadingBox, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (error || !formData) {
    return (
      <View style={[styles.centerErrorBox, { backgroundColor: themeColors.background }]}>
        <AlertCircle size={44} color={themeColors.danger} style={{ marginBottom: 12 }} />
        <Text style={[styles.errorHeadingText, { color: themeColors.text }]}>Error loading settings</Text>
        <Text style={[styles.errorSubtext, { color: themeColors.muted }]}>{(error as any)?.message || "Something went wrong"}</Text>
      </View>
    );
  }

  const selectedThemeLabel = THEME_OPTIONS.find(
    (o) => o.value === (formData.scheConfig?.forceCompanyUnifiedTheme ?? "")
  )?.label;

  return (
    <SafeAreaView style={[styles.rootContainer, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollPadding} keyboardShouldPersistTaps="handled">
          
          <View style={styles.headingBlock}>
            <Text style={[styles.titleText, { color: themeColors.text }]}>System Email Settings</Text>
            <Text style={[styles.subtitleText, { color: themeColors.muted }]}>
              Configure SMTP and automated email templates for the entire system ecosystem sheets.
            </Text>
          </View>

          <View style={[styles.cardFrame, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <View style={[styles.cardHeaderRibbon, { borderBottomColor: themeColors.border }]}>
              <View style={styles.ribbonIconWrapper}>
                <Shield size={18} color={themeColors.primary} />
              </View>
              <View>
                <Text style={[styles.cardTitleText, { color: themeColors.text }]}>SMTP Configuration</Text>
                <Text style={[styles.cardDescText, { color: themeColors.muted }]}>Configure your outgoing network email server specs</Text>
              </View>
            </View>

            <View style={styles.cardBodyPadding}>
              <View style={styles.formRowInputSpace}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>SMTP Host</Text>
                <TextInput
                  style={[styles.textInputStyle, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="smtp.example.com"
                  placeholderTextColor={themeColors.muted}
                  value={formData.emailConfig.host}
                  onChangeText={(text) => handleConfigChange("host", text)}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formRowInputSpace}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>Port</Text>
                <TextInput
                  style={[styles.textInputStyle, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="587"
                  placeholderTextColor={themeColors.muted}
                  keyboardType="numeric"
                  value={formData.emailConfig.port.toString()}
                  onChangeText={(text) => handleConfigChange("port", parseInt(text) || 0)}
                />
              </View>

              <View style={styles.formRowInputSpace}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>Username / Email</Text>
                <TextInput
                  style={[styles.textInputStyle, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="noreply@example.com"
                  placeholderTextColor={themeColors.muted}
                  value={formData.emailConfig.user}
                  onChangeText={(text) => handleConfigChange("user", text)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.formRowInputSpace}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>Password</Text>
                <View style={[styles.passwordInputContainer, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}>
                  <TextInput
                    style={[styles.textInputStyle, { flex: 1, borderWidth: 0, backgroundColor: "transparent", color: themeColors.text }]}
                    placeholder="••••••••"
                    placeholderTextColor={themeColors.muted}
                    secureTextEntry={!showPass}
                    value={formData.emailConfig.pass}
                    onChangeText={(text) => handleConfigChange("pass", text)}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.eyeToggleTouch} onPress={() => setShowPass(!showPass)}>
                    {showPass ? <EyeOff size={16} color={themeColors.muted} /> : <Eye size={16} color={themeColors.muted} />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formRowInputSpace}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>Sender Name</Text>
                <TextInput
                  style={[styles.textInputStyle, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="Task Manager"
                  placeholderTextColor={themeColors.muted}
                  value={formData.emailConfig.senderName ?? ""}
                  onChangeText={(text) => handleConfigChange("senderName", text)}
                />
                <Text style={[styles.inlineHelpText, { color: themeColors.muted }]}>The name recipients see in their email client inbox frame.</Text>
              </View>

              <View style={styles.formRowInputSpace}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>From Address</Text>
                <TextInput
                  style={[styles.textInputStyle, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  placeholder="noreply@example.com"
                  placeholderTextColor={themeColors.muted}
                  value={formData.emailConfig.fromAddress}
                  onChangeText={(text) => handleConfigChange("fromAddress", text)}
                  autoCapitalize="none"
                />
                <Text style={[styles.inlineHelpText, { color: themeColors.muted }]}>Leave blank to fall back directly onto the standard Username.</Text>
              </View>

              <View style={styles.switchInlineFlexAlignment}>
                <Switch
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor={themeColors.white}
                  value={formData.emailConfig.secure}
                  onValueChange={(val) => handleConfigChange("secure", val)}
                />
                <Text style={[styles.switchLabelLabelText, { color: themeColors.muted }]}>Use SSL/TLS (Secure Hook)</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeaderDivider}>
            <Mail size={18} color={themeColors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.sectionTitleText, { color: themeColors.text }]}>Email Templates</Text>
          </View>

          <View style={{ gap: 12 }}>
            <TemplateCard
              title="User Registration"
              description="Sent when a new employee or user logs into registry registers"
              template={formData.templates.userRegistration}
              onFieldChange={(f, v) => handleTemplateChange("userRegistration", f, v)}
              placeholders={["{name}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="Manager Registration"
              description="Sent when a privileged manager structural account configuration deploys"
              template={formData.templates.managerRegistration}
              onFieldChange={(f, v) => handleTemplateChange("managerRegistration", f, v)}
              placeholders={["{name}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="Forgot Password"
              description="Dispatched validation layer during token reset routes"
              template={formData.templates.forgotPassword}
              onFieldChange={(f, v) => handleTemplateChange("forgotPassword", f, v)}
              placeholders={["{name}", "{code}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="Task Assignment"
              description="Sent automatically to target resource vectors during task assignment shifts"
              template={formData.templates.taskAssignment}
              onFieldChange={(f, v) => handleTemplateChange("taskAssignment", f, v)}
              placeholders={["{name}", "{taskTitle}", "{projectName}", "{priority}", "{dueDate}", "{description}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="File Attachment"
              description="Sent when a media node or sheet attaches onto an engine node assignment"
              template={formData.templates.fileAttachment}
              onFieldChange={(f, v) => handleTemplateChange("fileAttachment", f, v)}
              placeholders={["{name}", "{taskTitle}", "{fileName}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="Task Comment"
              description="Dispatched instantly when notes are attached to a task thread tracking line"
              template={formData.templates.commentAdded}
              onFieldChange={(f, v) => handleTemplateChange("commentAdded", f, v)}
              placeholders={["{name}", "{taskTitle}", "{authorName}", "{commentText}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="Comment Reply / Mention"
              description="Sent when an internal tracking ping targets individual worker IDs"
              template={formData.templates.replyAdded}
              onFieldChange={(f, v) => handleTemplateChange("replyAdded", f, v)}
              placeholders={["{name}", "{taskTitle}", "{authorName}", "{replyText}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="Project Assignment"
              description="Dispatched on initial project roadmap assembly configuration setup links"
              template={formData.templates.projectAssignment}
              onFieldChange={(f, v) => handleTemplateChange("projectAssignment", f, v)}
              placeholders={["{name}", "{projectName}", "{description}"]}
              colors={themeColors}
              styles={styles}
            />
            <TemplateCard
              title="Project Reassignment"
              description="Sent on route adjustments within project roadmap allocation structures"
              template={formData.templates.projectReassignment}
              onFieldChange={(f, v) => handleTemplateChange("projectReassignment", f, v)}
              placeholders={["{name}", "{projectName}"]}
              colors={themeColors}
              styles={styles}
            />
          </View>

          <View style={[styles.cardFrame, { marginTop: 24, backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <View style={[styles.cardHeaderRibbon, { borderBottomColor: themeColors.border }]}>
              <View style={styles.ribbonIconWrapper}>
                <CheckCircle size={18} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitleText, { color: themeColors.text }]}>Task Completion Reward System</Text>
                <Text style={[styles.cardDescText, { color: themeColors.muted }]}>Configure micro-animations feedback matrix engine parameters</Text>
              </View>
            </View>
            <View style={styles.cardBodyPadding}>
              <View style={styles.switchRowContainerFlex}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.switchMainLabelTextInline, { color: themeColors.text }]}>Enable Reward System</Text>
                  <Text style={[styles.switchHelpTextInline, { color: themeColors.muted }]}>Globally configure visual audio response tracking triggers on completion metrics.</Text>
                </View>
                <Switch
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor={themeColors.white}
                  value={formData.taskRewardSystemEnabled}
                  onValueChange={(val) => setFormData(p => p ? { ...p, taskRewardSystemEnabled: val } : null)}
                />
              </View>
            </View>
          </View>

          <View style={[styles.cardFrame, { marginTop: 20, backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <View style={[styles.cardHeaderRibbon, { borderBottomColor: themeColors.border }]}>
              <View style={styles.ribbonIconWrapper}>
                <Sparkles size={18} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitleText, { color: themeColors.text }]}>Seasonal Cinematic Header Engine (SCHE)</Text>
                <Text style={[styles.cardDescText, { color: themeColors.muted }]}>Global cultural synchronization matrix overlay layout rules</Text>
              </View>
            </View>
            <View style={styles.cardBodyPadding}>
              <View style={styles.switchRowContainerFlex}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.switchMainLabelTextInline, { color: themeColors.text }]}>Enable Religious Holiday Themes</Text>
                  <Text style={[styles.switchHelpTextInline, { color: themeColors.muted }]}>Allow localized display rendering layers for global holiday cycles.</Text>
                </View>
                <Switch
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor={themeColors.white}
                  value={formData.scheConfig?.enableReligiousHolidays ?? true}
                  onValueChange={(val) => setFormData(p => p ? {
                    ...p,
                    scheConfig: { ...p.scheConfig || { enableReligiousHolidays: true, switchNeutralSeasonal: false, forceCompanyUnifiedTheme: "" }, enableReligiousHolidays: val }
                  } : null)}
                />
              </View>

              <View style={[styles.horizontalCardLineDivider, { backgroundColor: themeColors.border }]} />

              <View style={styles.switchRowContainerFlex}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.switchMainLabelTextInline, { color: themeColors.text }]}>Switch to Neutral Seasonal Themes</Text>
                  <Text style={[styles.switchHelpTextInline, { color: themeColors.muted }]}>Force traditional non-religious calendar cycles (Spring, Summer, etc.).</Text>
                </View>
                <Switch
                  trackColor={{ false: themeColors.border, true: themeColors.primary }}
                  thumbColor={themeColors.white}
                  value={formData.scheConfig?.switchNeutralSeasonal ?? false}
                  onValueChange={(val) => setFormData(p => p ? {
                    ...p,
                    scheConfig: { ...p.scheConfig || { enableReligiousHolidays: true, switchNeutralSeasonal: false, forceCompanyUnifiedTheme: "" }, switchNeutralSeasonal: val }
                  } : null)}
                />
              </View>

              <View style={[styles.horizontalCardLineDivider, { backgroundColor: themeColors.border }]} />

              <View style={{ marginTop: 8 }}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>Force Company-Wide Unified Theme</Text>
                <TouchableOpacity style={[styles.customPickerSelectTrigger, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]} onPress={triggerThemePickerSheet}>
                  <Text style={[styles.customPickerSelectTriggerText, { color: themeColors.text }]} numberOfLines={1}>
                    {selectedThemeLabel || "-- No Global Override (Using Location Settings) --"}
                  </Text>
                  <ChevronDown size={16} color={themeColors.muted} />
                </TouchableOpacity>
                <Text style={[styles.inlineHelpText, { color: themeColors.muted }]}>Overrides tracking localization and locks custom theme globally.</Text>
              </View>
            </View>
          </View>

          <View style={[styles.cardFrame, { marginTop: 20, backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
            <View style={[styles.cardHeaderRibbon, { borderBottomColor: themeColors.border }]}>
              <View style={styles.ribbonIconWrapper}>
                <FlaskConical size={18} color={themeColors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitleText, { color: themeColors.text }]}>Test Email Configuration</Text>
                <Text style={[styles.cardDescText, { color: themeColors.muted }]}>Verify your SMTP parameters by running explicit diagnostics.</Text>
              </View>
            </View>
            <View style={styles.cardBodyPadding}>
              <View style={styles.formRowInputSpace}>
                <Text style={[styles.fieldLabelText, { color: themeColors.muted }]}>Recipient Email</Text>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <TextInput
                    style={[styles.textInputStyle, { flex: 1, backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                    placeholder="you@example.com"
                    placeholderTextColor={themeColors.muted}
                    value={testTo}
                    onChangeText={(text) => { setTestTo(text); setTestResult(null); }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  <TouchableOpacity
                    style={[styles.miniDiagnosticActionBtn, { backgroundColor: themeColors.primary }, !testTo.trim() && { opacity: 0.5 }]}
                    disabled={testLoading || !testTo.trim()}
                    onPress={() => { void handleTestEmail(); }}
                  >
                    {testLoading ? <ActivityIndicator size="small" color={themeColors.white} /> : <Send size={14} color={themeColors.white} />}
                  </TouchableOpacity>
                </View>
              </View>

              {testResult && (
                <View style={[
                  styles.diagnosticResponseBox,
                  testResult.ok ? { backgroundColor: `${themeColors.success}10`, borderColor: themeColors.success } : { backgroundColor: `${themeColors.danger}10`, borderColor: themeColors.danger }
                ]}>
                  {testResult.ok ? <CheckCircle size={16} color={themeColors.success} style={{ marginTop: 2 }} /> : <AlertCircle size={16} color={themeColors.danger} style={{ marginTop: 2 }} />}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.diagnosticStatusLabel, { color: testResult.ok ? themeColors.success : themeColors.danger }]}>
                      {testResult.ok ? "Verification Success" : "Pipeline Fault Triggered"}
                    </Text>
                    <Text style={[styles.diagnosticLogFontText, { color: themeColors.muted }]}>{testResult.message}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.mainFormSubmitActionBtn, { backgroundColor: themeColors.primary }, mutation.isPending && { opacity: 0.6 }]}
            disabled={mutation.isPending}
            onPress={handleSubmit}
          >
            {mutation.isPending ? <ActivityIndicator size="small" color={themeColors.white} /> : <Save size={18} color={themeColors.white} />}
            <Text style={styles.mainFormSubmitActionBtnText}>Save All Settings</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TemplateCard({
  title,
  description,
  template,
  onFieldChange,
  placeholders,
  colors,
  styles,
}: {
  title: string;
  description: string;
  template: Template;
  onFieldChange: (field: keyof Template, value: any) => void;
  placeholders: string[];
  colors: any;
  styles: any;
}) {
  return (
    <View style={[
      styles.templateRowCard,
      { backgroundColor: colors.cardBg },
      template.enabled ? { borderColor: colors.primary } : { borderColor: colors.border, opacity: 0.6 }
    ]}>
      <View style={styles.templateRowHeaderFlex}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.templateTitleLabelText, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.templateDescLabelText, { color: colors.muted }]}>{description}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={[styles.templateToggleStateIndicatorText, { color: template.enabled ? colors.primary : colors.muted }]}>
            {template.enabled ? "ENABLED" : "DISABLED"}
          </Text>
          <Switch
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            value={template.enabled}
            onValueChange={(val) => onFieldChange("enabled", val)}
          />
        </View>
      </View>

      {template.enabled && (
        <View style={[styles.templateExpandedBodyLayout, { borderTopColor: colors.border }]}>
          <View style={styles.formRowInputSpace}>
            <Text style={[styles.fieldLabelText, { color: colors.muted }]}>Subject</Text>
            <TextInput
              style={[styles.textInputStyle, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Email subject line..."
              placeholderTextColor={colors.muted}
              value={template.subject}
              onChangeText={(text) => onFieldChange("subject", text)}
            />
          </View>

          <View style={styles.formRowInputSpace}>
            <Text style={[styles.fieldLabelText, { color: colors.muted }]}>Body Markdown Template</Text>
            <TextInput
              style={[styles.textInputStyle, styles.textareaMultiLineInputStyle, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Email workspace block messaging sequence..."
              placeholderTextColor={colors.muted}
              multiline={true}
              numberOfLines={5}
              textAlignVertical="top"
              value={template.body}
              onChangeText={(text) => onFieldChange("body", text)}
            />
          </View>

          <View style={styles.placeholderRowPillsTrackContainer}>
            <Text style={[styles.placeholderInstructionsLabelText, { color: colors.muted }]}>Placeholders:</Text>
            <View style={styles.placeholderChipsFlexWrap}>
              {placeholders.map((ph) => (
                <View key={ph} style={[styles.placeholderBadgeChipFrame, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[styles.placeholderBadgeChipText, { color: colors.primary }]}>{ph}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    rootContainer: { flex: 1 },
    scrollPadding: { padding: 16, paddingBottom: 50 },
    centerLoadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
    centerErrorBox: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
    errorHeadingText: { fontSize: 18, fontWeight: "700" },
    errorSubtext: { fontSize: 13, marginTop: 4, textAlign: "center" },
    headingBlock: { marginBottom: 24 },
    titleText: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },
    subtitleText: { fontSize: 13, marginTop: 6, lineHeight: 18 },
    cardFrame: { borderRadius: 12, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
    cardHeaderRibbon: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "rgba(255,255,255,0.02)", borderBottomWidth: 1 },
    ribbonIconWrapper: { width: 34, height: 34, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", justifyContent: "center" },
    cardTitleText: { fontSize: 15, fontWeight: "600" },
    cardDescText: { fontSize: 11, marginTop: 2 },
    cardBodyPadding: { padding: 16 },
    formRowInputSpace: { marginBottom: 16, flexDirection: "column", gap: 6 },
    fieldLabelText: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    textInputStyle: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
    textareaMultiLineInputStyle: { height: 110, paddingTop: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
    inlineHelpText: { fontSize: 11, marginTop: 2 },
    passwordInputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 8, borderWidth: 1, paddingRight: 4 },
    eyeToggleTouch: { width: 36, height: 40, alignItems: "center", justifyContent: "center" },
    customPickerSelectTrigger: { height: 42, borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    customPickerSelectTriggerText: { fontSize: 13, flex: 1, paddingRight: 8 },
    switchInlineFlexAlignment: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    switchLabelLabelText: { fontSize: 13, fontWeight: "500" },
    switchRowContainerFlex: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    switchMainLabelTextInline: { fontSize: 14, fontWeight: "600" },
    switchHelpTextInline: { fontSize: 12, marginTop: 2, lineHeight: 16 },
    horizontalCardLineDivider: { height: 1, marginVertical: 14 },
    sectionHeaderDivider: { flexDirection: "row", alignItems: "center", marginTop: 20, marginBottom: 14 },
    sectionTitleText: { fontSize: 18, fontWeight: "700" },
    templateRowCard: { borderRadius: 10, borderWidth: 1, padding: 14, marginBottom: 12 },
    templateRowHeaderFlex: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    templateTitleLabelText: { fontSize: 15, fontWeight: "600" },
    templateDescLabelText: { fontSize: 12, marginTop: 3, lineHeight: 16 },
    templateToggleStateIndicatorText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
    templateExpandedBodyLayout: { marginTop: 16, borderTopWidth: 1, paddingTop: 16 },
    placeholderRowPillsTrackContainer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 4 },
    placeholderInstructionsLabelText: { fontSize: 11, fontWeight: "500" },
    placeholderChipsFlexWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 },
    placeholderBadgeChipFrame: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
    placeholderBadgeChipText: { fontSize: 10, fontFamily: "monospace", fontWeight: "700" },
    miniDiagnosticActionBtn: { height: 42, width: 46, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    diagnosticResponseBox: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 12 },
    diagnosticStatusLabel: { fontSize: 12, fontWeight: "700" },
    diagnosticLogFontText: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", marginTop: 4, lineHeight: 15 },
    mainFormSubmitActionBtn: { height: 48, borderRadius: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24, elevation: 3 },
    mainFormSubmitActionBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  });
}