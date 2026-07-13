import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Linking,
  Platform
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/services/api";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Rocket, 
  ExternalLink, 
  X, 
  CheckCircle, 
  FolderSync 
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { s } from "@/util/styles";

interface FutureWebsite {
  _id: string;
  siteName: string;
  url: string;
  developmentStage: "Concept" | "Planning" | "Design" | "Development" | "Testing" | "Ready for Launch";
  priority: "Low" | "Medium" | "High" | "Critical";
  concept: string;
  notes: string;
  createdAt: string;
}

interface MinimalProject {
  _id?: string;
  id?: string;
  name: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: {
    items?: T[];
  };
  items?: T[];
}

const STAGES: FutureWebsite["developmentStage"][] = [
  "Concept", 
  "Planning", 
  "Design", 
  "Development", 
  "Testing", 
  "Ready for Launch"
];

const PRIORITIES: FutureWebsite["priority"][] = [
  "Low", 
  "Medium", 
  "High", 
  "Critical"
];

const initialFormState = {
  siteName: "",
  url: "",
  developmentStage: "Concept" as FutureWebsite["developmentStage"],
  priority: "Medium" as FutureWebsite["priority"],
  concept: "",
  notes: "",
};

export function FutureWebsites() {
  const themeContext = useTheme();
  
const activeColors = useMemo(() => {
    const uiTheme = themeContext?.uiTheme;
    
    // Type assertion to string bypasses the strict overlap check if "dark" 
    // isn't explicitly in the ThemePresetId union or if it's a strict Enum
    const currentTheme = uiTheme?.theme as unknown as string;
    const isDark = currentTheme === "dark" || currentTheme === "metallic-elite";

    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#090a0f" : "#f8fafc"),
      surface: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      borderLight: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(255,255,255,0.04)" : "#f1f5f9"),
      surfaceVariant: isDark ? "rgba(255,255,255,0.05)" : "#f1f5f9",
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textMuted: isDark ? "#94a3b8" : "#64748b",
      textLight: isDark ? "#64748b" : "#94a3b8",
      primary: uiTheme?.customColors?.primary || "#0072FF",
      primaryLight: isDark ? "rgba(0, 114, 255, 0.15)" : "#eff6ff",
      danger: "#ef4444",
      dangerBg: isDark ? "rgba(239, 68, 68, 0.15)" : "#fee2e2",
      dangerBorder: isDark ? "rgba(239, 68, 68, 0.3)" : "#fca5a5",
      success: isDark ? "#4ade80" : "#166534",
      successBg: isDark ? "rgba(34, 197, 94, 0.15)" : "#dcfce7",
      successBorder: isDark ? "rgba(34, 197, 94, 0.3)" : "#bbf7d0",
      warning: isDark ? "#facc15" : "#854d0e",
      warningBg: isDark ? "rgba(234, 179, 8, 0.15)" : "#fef9c3",
      warningBorder: isDark ? "rgba(234, 179, 8, 0.3)" : "#fef08a",
      info: isDark ? "#60a5fa" : "#1e40af",
      infoBg: isDark ? "rgba(59, 130, 246, 0.15)" : "#dbeafe",
      infoBorder: isDark ? "rgba(59, 130, 246, 0.3)" : "#bfdbfe",
      purple: isDark ? "#a855f7" : "#6b21a8",
      purpleLight: isDark ? "rgba(168, 85, 247, 0.15)" : "#f5f3ff",
      overlay: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(15, 23, 42, 0.4)",
    };
  }, [themeContext]);

 
  const stageThemes = useMemo(() => {
    return {
      "Concept": { container: activeColors.surfaceVariant, text: activeColors.textMuted, border: activeColors.border },
      "Planning": { container: activeColors.infoBg, text: activeColors.info, border: activeColors.infoBorder },
      "Design": { container: activeColors.purpleLight, text: activeColors.purple, border: activeColors.purpleLight },
      "Development": { container: activeColors.warningBg, text: activeColors.warning, border: activeColors.warningBorder },
      "Testing": { container: activeColors.primaryLight, text: activeColors.primary, border: activeColors.primaryLight },
      "Ready for Launch": { container: activeColors.successBg, text: activeColors.success, border: activeColors.successBorder },
    };
  }, [activeColors]);


  const priorityThemes = useMemo(() => {
    return {
      "Low": { container: activeColors.surfaceVariant, text: activeColors.textLight, border: activeColors.borderLight },
      "Medium": { container: activeColors.primaryLight, text: activeColors.primary, border: activeColors.primaryLight },
      "High": { container: activeColors.warningBg, text: activeColors.warning, border: activeColors.warningBorder },
      "Critical": { container: activeColors.dangerBg, text: activeColors.danger, border: activeColors.dangerBorder },
    };
  }, [activeColors]);

  const styles = useMemo(() => getStyles(activeColors), [activeColors]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [stagePickerOpen, setStagePickerOpen] = useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  const [selectedWebsite, setSelectedWebsite] = useState<FutureWebsite | null>(null);
  const [websiteToConvert, setWebsiteToConvert] = useState<FutureWebsite | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const [formData, setFormData] = useState(initialFormState);

  const projectsQuery = useQuery<MinimalProject[]>({
    queryKey: ["all-projects-minimal"],
    queryFn: async () => {
      const res = (await apiRequest<any>("/projects?limit=100")) as ApiResponse<MinimalProject>;
      if (res && res.success && res.data) return res.data.items || [];
      return res?.items || [];
    },
  });

  const websitesQuery = useQuery<FutureWebsite[]>({
    queryKey: ["future-websites"],
    queryFn: async () => {
      const res = (await apiRequest<any>("/websites/future")) as ApiResponse<FutureWebsite>;
      if (res && res.success && res.data) return res.data.items || [];
      return res?.items || [];
    },
  });

  const websites = useMemo(() => 
    (websitesQuery.data || []).slice().sort((a, b) => (a.siteName || "").localeCompare(b.siteName || "")),
    [websitesQuery.data]
  );

  const resetForm = () => {
    setFormData(initialFormState);
    setSelectedWebsite(null);
  };

  const handleSave = async () => {
    if (!formData.siteName || !formData.url) {
      Alert.alert("Validation Error", "Project Name and Domain are mandatory parameters.");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = { ...formData, websiteType: "future" };

      if (selectedWebsite) {
        await apiRequest(`/websites/${selectedWebsite._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/websites", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await websitesQuery.refetch();
      setIsFormOpen(false);
      resetForm();
    } catch (err) {
      Alert.alert("Persistence Error", err instanceof Error ? err.message : "Failed to record target digital project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchAsTask = async () => {
    if (!websiteToConvert) return;
    if (!selectedProjectId) {
      Alert.alert("Linkage Missing", "Please pick an active project envelope reference mapping target.");
      return;
    }

    try {
      setIsConverting(true);
      await apiRequest(`/websites/${websiteToConvert._id}/convert-to-task`, {
        method: "POST",
        body: JSON.stringify({ projectId: selectedProjectId }),
      });

      await websitesQuery.refetch();
      setIsConvertOpen(false);
      setWebsiteToConvert(null);
      setSelectedProjectId("");
      Alert.alert("Success", "Asset converted into an actionable project ticket reference task.");
    } catch (err) {
      Alert.alert("Task Refraction Error", err instanceof Error ? err.message : "Pipeline failure mapping item to ticket");
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = (website: FutureWebsite) => {
    Alert.alert(
      "Confirm Deletion",
      `Are you sure you want to permanently delete the planning node for "${website.siteName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/websites/${website._id}`, { method: "DELETE" });
              await websitesQuery.refetch();
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to eliminate item record.");
            }
          }
        }
      ]
    );
  };

  const handleUrlRedirect = async (urlStr: string) => {
    const format = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
    const OK = await Linking.canOpenURL(format);
    if (OK) await Linking.openURL(format);
  };

  const getSelectedProjectName = () => {
    const found = (projectsQuery.data || []).find((p) => (p.id || p._id) === selectedProjectId);
    return found ? found.name : "-- Choose a Project --";
  };

  return (
    <SafeAreaView style={styles.baseLayoutContainer}>
      <ScrollView contentContainerStyle={styles.scrollBlockLayout} showsVerticalScrollIndicator={false}>
        
        <TouchableOpacity 
          style={styles.addAssetPrimaryBtn}
          activeOpacity={0.85}
          onPress={() => { resetForm(); setIsFormOpen(true); }}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addAssetPrimaryBtnText}>Add Project</Text>
        </TouchableOpacity>

        {websitesQuery.isLoading ? (
          <ActivityIndicator size="small" color={activeColors.primary} style={styles.loaderSpacing} />
        ) : websites.length === 0 ? (
          <View style={styles.emptyCardState}>
            <Rocket size={36} color={activeColors.textMuted} />
            <Text style={styles.emptyCardText}>No pipeline developments mapped yet. Create an layout entry item to start.</Text>
          </View>
        ) : (
          <View style={styles.entriesDirectoryStack}>
            {websites.map((website, index) => {
              const stage = stageThemes[website.developmentStage] || stageThemes["Concept"];
              const priority = priorityThemes[website.priority] || priorityThemes["Medium"];
              
              return (
                <View key={website._id} style={styles.websiteItemRowCard}>
                  <View style={styles.cardHeaderTopLine}>
                    <View style={styles.titleContainerFlex}>
                      <Text style={styles.cardMainTitle} numberOfLines={1}>{website.siteName}</Text>
                      <TouchableOpacity style={styles.inlineUrlLinkRow} onPress={() => handleUrlRedirect(website.url)}>
                        <Text style={styles.inlineUrlLinkText} numberOfLines={1}>{website.url}</Text>
                        <ExternalLink size={11} color={activeColors.primary} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.badgeMatrixLayoutStack}>
                      <View style={[styles.statusBadge, { backgroundColor: stage.container, borderColor: stage.border }]}>
                        <Text style={[styles.statusBadgeText, { color: stage.text }]}>{website.developmentStage}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: priority.container, borderColor: priority.border }]}>
                        <Text style={[styles.statusBadgeText, { color: priority.text }]}>{website.priority}</Text>
                      </View>
                    </View>
                  </View>

                  {website.concept ? (
                    <View style={styles.conceptSegmentPreviewBlock}>
                      <Text style={styles.conceptMiniLabel}>Concept / Target Goal Matrix:</Text>
                      <Text style={styles.conceptTextContentDisplay} numberOfLines={2}>{website.concept}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooterActionsFlex}>
                    <Text style={styles.indexCounterText}>#{(index + 1).toString().padStart(2, "0")}</Text>
                    <View style={styles.actionButtonGroup}>
                      <TouchableOpacity 
                        style={[styles.rowIconActionButton, { backgroundColor: activeColors.purpleLight, borderColor: activeColors.purpleLight }]} 
                        onPress={() => { setWebsiteToConvert(website); setSelectedProjectId(""); setIsConvertOpen(true); }}
                      >
                        <Rocket size={13} color={activeColors.purple} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rowIconActionButton} onPress={() => { setSelectedWebsite(website); setFormData({ siteName: website.siteName, url: website.url, developmentStage: website.developmentStage, priority: website.priority, concept: website.concept || "", notes: website.notes || "" }); setIsFormOpen(true); }}>
                        <Edit2 size={13} color={activeColors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rowIconActionButton} onPress={() => handleDelete(website)}>
                        <Trash2 size={13} color={activeColors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={isFormOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalScrollFormContainer}>
          <View style={styles.modalSheetFormHeader}>
            <Text style={styles.modalSheetFormTitle}>{selectedWebsite ? "Modify Project Mapping" : "Initialize New Pipeline Project"}</Text>
            <TouchableOpacity onPress={() => setIsFormOpen(false)} style={styles.closeSheetCircleButton}>
              <X size={16} color={activeColors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.innerFormKeyboardPadding} keyboardShouldPersistTaps="handled">
            <View style={styles.formInputSectionSpace}>
              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Project Designation Name *</Text>
                <TextInput
                  style={styles.formInputBlock}
                  placeholder="e.g., Enterprise B2B SaaS Gateway"
                  placeholderTextColor={activeColors.textLight}
                  value={formData.siteName}
                  onChangeText={(val) => setFormData({ ...formData, siteName: val })}
                />
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Target / Reserved Domain URL *</Text>
                <TextInput
                  style={styles.formInputBlock}
                  placeholder="e.g., beta.portalname.io"
                  placeholderTextColor={activeColors.textLight}
                  autoCapitalize="none"
                  keyboardType="url"
                  value={formData.url}
                  onChangeText={(val) => setFormData({ ...formData, url: val })}
                />
              </View>

              <View style={styles.twoColumnInlineInputRow}>
                <View style={styles.flexOne}>
                  <Text style={styles.formInputLabel}>Lifecycle Phase</Text>
                  <TouchableOpacity style={styles.formCustomSelectPickerTrigger} onPress={() => setStagePickerOpen(true)}>
                    <Text style={styles.formCustomSelectPickerValueText} numberOfLines={1}>{formData.developmentStage}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.flexOne}>
                  <Text style={styles.formInputLabel}>Priority Status</Text>
                  <TouchableOpacity style={styles.formCustomSelectPickerTrigger} onPress={() => setPriorityPickerOpen(true)}>
                    <Text style={styles.formCustomSelectPickerValueText} numberOfLines={1}>{formData.priority}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Project Architecture Concept</Text>
                <TextInput
                  style={[styles.formInputBlock, styles.formInputTextAreaBlock]}
                  placeholder="Summarize target architecture core logic milestones..."
                  placeholderTextColor={activeColors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={formData.concept}
                  onChangeText={(val) => setFormData({ ...formData, concept: val })}
                />
              </View>

              <View style={styles.inputContainerUnit}>
                <Text style={styles.formInputLabel}>Internal Strategic Notes</Text>
                <TextInput
                  style={[styles.formInputBlock, styles.formInputTextAreaBlock]}
                  placeholder="Additional logistical considerations..."
                  placeholderTextColor={activeColors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  value={formData.notes}
                  onChangeText={(val) => setFormData({ ...formData, notes: val })}
                />
              </View>
            </View>

            <View style={styles.formActionSubmissionSectionRow}>
              <TouchableOpacity style={styles.formCancelDismissBtn} onPress={() => setIsFormOpen(false)}>
                <Text style={styles.formCancelDismissBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formSubmitActionBtn} onPress={handleSave} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.formSubmitActionBtnText}>Save Parameters</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={stagePickerOpen} transparent={true} animationType="fade">
        <View style={styles.centeredModalDimOverlay}>
          <View style={styles.pickerOptionsPanelBox}>
            <View style={styles.pickerHeaderSection}>
              <Text style={styles.pickerHeaderTitleText}>Lifecycle Phase</Text>
              <TouchableOpacity onPress={() => setStagePickerOpen(false)}><X size={16} color={activeColors.textLight} /></TouchableOpacity>
            </View>
            {STAGES.map((stg) => (
              <TouchableOpacity
                key={stg}
                style={[styles.pickerRowOptionItem, formData.developmentStage === stg && styles.activePickerRowOptionItem]}
                onPress={() => { setFormData({ ...formData, developmentStage: stg }); setStagePickerOpen(false); }}
              >
                <Text style={[styles.pickerRowOptionItemText, formData.developmentStage === stg && styles.activePickerRowOptionItemText]}>{stg}</Text>
                {formData.developmentStage === stg && <CheckCircle size={14} color={activeColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={priorityPickerOpen} transparent={true} animationType="fade">
        <View style={styles.centeredModalDimOverlay}>
          <View style={styles.pickerOptionsPanelBox}>
            <View style={styles.pickerHeaderSection}>
              <Text style={styles.pickerHeaderTitleText}>Select Priority Matrix</Text>
              <TouchableOpacity onPress={() => setPriorityPickerOpen(false)}><X size={16} color={activeColors.textLight} /></TouchableOpacity>
            </View>
            {PRIORITIES.map((prt) => (
              <TouchableOpacity
                key={prt}
                style={[styles.pickerRowOptionItem, formData.priority === prt && styles.activePickerRowOptionItem]}
                onPress={() => { setFormData({ ...formData, priority: prt }); setPriorityPickerOpen(false); }}
              >
                <Text style={[styles.pickerRowOptionItemText, formData.priority === prt && styles.activePickerRowOptionItemText]}>{prt}</Text>
                {formData.priority === prt && <CheckCircle size={14} color={activeColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={isConvertOpen} transparent={true} animationType="fade">
        <View style={styles.centeredModalDimOverlay}>
          <View style={styles.detailsViewOverlayDialogBox}>
            <View style={styles.detailsDialogHeaderBlock}>
              <View style={styles.headerTitleRow}>
                <Rocket size={16} color={activeColors.primary} />
                <Text style={styles.detailsDialogMainTitleText}>Launch Platform As Task</Text>
              </View>
              <TouchableOpacity onPress={() => { setIsConvertOpen(false); setWebsiteToConvert(null); }}>
                <X size={16} color={activeColors.textLight} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalBodyExplainerParaText}>
              This workflow injects a design planning milestone node directly as a core active operational ticket layout under a designated parent project.
            </Text>

            <View style={styles.linkWorkspaceContainer}>
              <Text style={styles.formInputLabel}>Link to Workspace Project Pipeline *</Text>
              <TouchableOpacity style={styles.formCustomSelectPickerTrigger} onPress={() => setProjectPickerOpen(true)}>
                <Text style={styles.formCustomSelectPickerValueText} numberOfLines={1}>{getSelectedProjectName()}</Text>
                <FolderSync size={14} color={activeColors.textLight} />
              </TouchableOpacity>
            </View>

            {websiteToConvert && (
              <View style={styles.metaDataInspectionTargetSummaryCard}>
                <Text style={styles.inspectorDataLabel}>Target Source Metadata Matrix:</Text>
                <Text style={styles.metaSummaryRowText}><Text style={styles.fontWeightSixHundred}>Scope:</Text> {websiteToConvert.siteName}</Text>
                <Text style={styles.metaSummaryRowText}><Text style={styles.fontWeightSixHundred}>Domain:</Text> {websiteToConvert.url}</Text>
              </View>
            )}

            <View style={styles.inspectorDetailsModalActionRowFooter}>
              <TouchableOpacity style={styles.inspectorModalCancelDismissBtn} onPress={() => { setIsConvertOpen(false); setWebsiteToConvert(null); }} disabled={isConverting}>
                <Text style={styles.inspectorModalCancelDismissBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.inspectorModalLaunchSubmitBtn, !selectedProjectId && { backgroundColor: activeColors.textLight }]} 
                onPress={handleLaunchAsTask} 
                disabled={isConverting || !selectedProjectId}
              >
                {isConverting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Text style={styles.inspectorModalLaunchSubmitBtnText}>Deploy Ticket</Text>
                    <Rocket size={12} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={projectPickerOpen} transparent={true} animationType="fade">
        <View style={styles.centeredModalDimOverlay}>
          <View style={styles.pickerOptionsPanelBox}>
            <View style={styles.pickerHeaderSection}>
              <Text style={styles.pickerHeaderTitleText}>Select Workspace Parent Target</Text>
              <TouchableOpacity onPress={() => setProjectPickerOpen(false)}><X size={16} color={activeColors.textLight} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.maxHeightPickerScroll} showsVerticalScrollIndicator={false}>
              {projectsQuery.isLoading ? (
                <ActivityIndicator size="small" color={activeColors.primary} style={styles.paddingTwelve} />
              ) : (projectsQuery.data || []).length === 0 ? (
                <Text style={styles.miniPickerEmptyStateTextText}>No workspace engines configured.</Text>
              ) : (
                (projectsQuery.data || []).map((project) => {
                  const pid = project.id || project._id || "";
                  const isCurrent = selectedProjectId === pid;
                  return (
                    <TouchableOpacity
                      key={pid}
                      style={[styles.pickerRowOptionItem, isCurrent && styles.activePickerRowOptionItem]}
                      onPress={() => { setSelectedProjectId(pid); setProjectPickerOpen(false); }}
                    >
                      <Text style={[styles.pickerRowOptionItemText, isCurrent && styles.activePickerRowOptionItemText]} numberOfLines={1}>{project.name}</Text>
                      {isCurrent && <CheckCircle size={14} color={activeColors.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const getStyles = (activeColors: any) => StyleSheet.create({
  baseLayoutContainer: { flex: 1, backgroundColor: activeColors.background },
  scrollBlockLayout: { padding: s(16) },
  loaderSpacing: { marginTop: s(24) },
  flexOne: { flex: 1 },
  titleContainerFlex: { flex: 1, paddingRight: s(8) },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: s(6) },
  linkWorkspaceContainer: { marginVertical: s(12) },
  fontWeightSixHundred: { fontWeight: "600" },
  maxHeightPickerScroll: { maxHeight: s(220) },
  paddingTwelve: { padding: s(12) },
  
  addAssetPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: s(8),
    backgroundColor: activeColors.primary,
    paddingVertical: s(12),
    paddingHorizontal: s(16),
    borderRadius: s(8),
    marginBottom: s(16)
  },
  addAssetPrimaryBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },

  emptyCardState: { alignItems: "center", justifyContent: "center", padding: s(32), backgroundColor: activeColors.surface, borderRadius: s(12), borderWidth: 1, borderColor: activeColors.border, borderStyle: "dashed", gap: s(10) },
  emptyCardText: { color: activeColors.textLight, fontSize: 13, textAlign: "center", lineHeight: 18 },

  entriesDirectoryStack: { gap: s(12) },
  websiteItemRowCard: {
    backgroundColor: activeColors.surface,
    borderRadius: s(12),
    padding: s(16),
    borderWidth: 1,
    borderColor: activeColors.border,
    ...Platform.select({
      ios: { shadowColor: activeColors.text, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3 },
      android: { elevation: 1 }
    })
  },
  cardHeaderTopLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: activeColors.borderLight, paddingBottom: s(10) },
  cardMainTitle: { fontSize: 15, fontWeight: "600", color: activeColors.text },
  inlineUrlLinkRow: { flexDirection: "row", alignItems: "center", gap: s(4), marginTop: s(3) },
  inlineUrlLinkText: { fontSize: 12, color: activeColors.primary, marginRight: s(2), fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  
  badgeMatrixLayoutStack: { alignItems: "flex-end", gap: s(4) },
  statusBadge: { paddingHorizontal: s(6), paddingVertical: s(2), borderRadius: s(4), borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.2 },

  conceptSegmentPreviewBlock: { marginTop: s(12), backgroundColor: activeColors.background, padding: s(10), borderRadius: s(8), borderWidth: 1, borderColor: activeColors.borderLight },
  conceptMiniLabel: { fontSize: 10, fontWeight: "600", color: activeColors.textLight },
  conceptTextContentDisplay: { fontSize: 12, color: activeColors.textMuted, marginTop: s(2), lineHeight: 16 },

  cardFooterActionsFlex: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: activeColors.borderLight, paddingTop: s(10), marginTop: s(12) },
  indexCounterText: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", color: activeColors.textLight },
  actionButtonGroup: { flexDirection: "row", alignItems: "center", gap: s(6) },
  rowIconActionButton: { padding: s(6), borderRadius: s(6), backgroundColor: activeColors.background, borderWidth: 1, borderColor: activeColors.borderLight },

  modalScrollFormContainer: { flex: 1, backgroundColor: activeColors.surface },
  modalSheetFormHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: s(16), borderBottomWidth: 1, borderBottomColor: activeColors.borderLight },
  modalSheetFormTitle: { fontSize: 15, fontWeight: "700", color: activeColors.text },
  closeSheetCircleButton: { padding: s(6), backgroundColor: activeColors.borderLight, borderRadius: s(16) },

  innerFormKeyboardPadding: { padding: s(16), paddingBottom: s(40) },
  formInputSectionSpace: { gap: s(14) },
  inputContainerUnit: { flexDirection: "column" },
  formInputLabel: { fontSize: 13, fontWeight: "500", color: activeColors.textMuted, marginBottom: s(5) },
  formInputBlock: { borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(8), fontSize: 14, color: activeColors.text, backgroundColor: activeColors.surface },
  twoColumnInlineInputRow: { flexDirection: "row", gap: s(12) },
  formCustomSelectPickerTrigger: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), paddingHorizontal: s(12), paddingVertical: s(9), backgroundColor: activeColors.surface, minHeight: s(40) },
  formCustomSelectPickerValueText: { fontSize: 13, fontWeight: "500", color: activeColors.text },
  formInputTextAreaBlock: { minHeight: s(70), paddingVertical: s(8) },

  formActionSubmissionSectionRow: { flexDirection: "row", gap: s(12), marginTop: s(24), paddingTop: s(16), borderTopWidth: 1, borderTopColor: activeColors.borderLight },
  formCancelDismissBtn: { flex: 1, paddingVertical: s(12), borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), alignItems: "center", backgroundColor: activeColors.surface },
  formCancelDismissBtnText: { fontSize: 14, fontWeight: "600", color: activeColors.textMuted },
  formSubmitActionBtn: { flex: 2, paddingVertical: s(12), backgroundColor: activeColors.primary, borderRadius: s(8), alignItems: "center", justifyContent: "center" },
  formSubmitActionBtnText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },

  centeredModalDimOverlay: { flex: 1, backgroundColor: activeColors.overlay, justifyContent: "center", alignItems: "center", padding: s(20) },
  pickerOptionsPanelBox: { backgroundColor: activeColors.surface, width: "100%", maxWidth: s(300), borderRadius: s(12), padding: s(16), borderWidth: 1, borderColor: activeColors.border },
  pickerHeaderSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: s(10), borderBottomWidth: 1, borderBottomColor: activeColors.borderLight, marginBottom: s(8) },
  pickerHeaderTitleText: { fontSize: 14, fontWeight: "600", color: activeColors.text },
  pickerRowOptionItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: s(10), paddingHorizontal: s(8), borderRadius: s(6) },
  activePickerRowOptionItem: { backgroundColor: activeColors.primaryLight },
  pickerRowOptionItemText: { fontSize: 14, color: activeColors.textMuted },
  activePickerRowOptionItemText: { color: activeColors.primary, fontWeight: "600" },
  miniPickerEmptyStateTextText: { fontSize: 12, color: activeColors.textLight, textAlign: "center", paddingVertical: s(12) },

  detailsViewOverlayDialogBox: { backgroundColor: activeColors.surface, width: "100%", maxWidth: s(350), borderRadius: s(16), padding: s(16), borderWidth: 1, borderColor: activeColors.border },
  detailsDialogHeaderBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: activeColors.borderLight, paddingBottom: s(12), marginBottom: s(12) },
  detailsDialogMainTitleText: { fontSize: 15, fontWeight: "700", color: activeColors.text },
  modalBodyExplainerParaText: { fontSize: 12, color: activeColors.textMuted, lineHeight: 18 },
  
  metaDataInspectionTargetSummaryCard: { backgroundColor: activeColors.background, padding: s(12), borderRadius: s(8), borderWidth: 1, borderColor: activeColors.border, gap: s(3), marginTop: s(4) },
  inspectorDataLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, color: activeColors.textLight, marginBottom: s(2) },
  metaSummaryRowText: { fontSize: 12, color: activeColors.textMuted },

  inspectorDetailsModalActionRowFooter: { flexDirection: "row", gap: s(10), marginTop: s(20), paddingTop: s(12), borderTopWidth: 1, borderTopColor: activeColors.borderLight },
  inspectorModalCancelDismissBtn: { flex: 1, paddingVertical: s(10), borderWidth: 1, borderColor: activeColors.border, borderRadius: s(8), alignItems: "center" },
  inspectorModalCancelDismissBtnText: { fontSize: 13, fontWeight: "600", color: activeColors.textMuted },
  inspectorModalLaunchSubmitBtn: { flex: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: s(6), paddingVertical: s(10), backgroundColor: activeColors.primary, borderRadius: s(8) },
  inspectorModalLaunchSubmitBtnText: { fontSize: 13, fontWeight: "600", color: "#ffffff" }
});