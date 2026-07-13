import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  Platform,
  RefreshControl,
  KeyboardAvoidingView
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Zap,
  Radio,
  Sliders,
  Play,
  RotateCw,
  Search,
  CheckCircle,
  Plus,
  ArrowRight,
  Info,
  Lock,
  X,
  ChevronDown,
  ShieldAlert,
  TrendingUp
} from "lucide-react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { apiRequest } from "../../../services/api";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

interface Contact {
  id: string;
  name: string;
  company: string;
  email: string;
  continuityScore: number;
  revenueGravityScore: number;
  accountValue: number;
  lastInteractionDate: string;
}

interface GravityOpp {
  id: string;
  name: string;
  company: string;
  email: string;
  gravityScore: number;
  tier: string;
  accountValue: number;
}

interface AtRiskContact {
  id: string;
  name: string;
  company: string;
  email: string;
  continuityScore: number;
  tier: string;
  lastInteraction: string;
}

interface TelemetryEvent {
  id: string;
  contactId: {
    _id: string;
    name: string;
    email: string;
    company: string;
  } | null;
  eventType: "email_open" | "site_visit" | "proposal_view" | "call_duration" | "sms_reply";
  description: string;
  metadata: any;
  timestamp: string;
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  conditions: any;
  actions: Array<{
    actionType: "send_email" | "send_sms" | "create_task" | "assign_salesperson" | "escalate";
    params: any;
  }>;
  isActive: boolean;
}

interface RevenueWindow {
  month: string;
  amount: number;
  opportunities: number;
}

interface WrappedResponse {
  success: boolean;
  data?: {
    items?: any[];
    metrics?: {
      winRate: number;
      pipelineValue: number;
      revenue: number;
      atRiskAccountsCount: number;
      highGravityCount: number;
    };
    ccieDistribution?: {
      maintained: number;
      healthy: number;
      attention: number;
      atRisk: number;
      critical: number;
    };
    predictedRevenueWindows?: RevenueWindow[];
    gravityOpportunities?: GravityOpp[];
    atRiskContacts?: AtRiskContact[];
    triggeredActions?: string[];
  };
}

type ApiResponse = WrappedResponse | any;

const EVENT_TYPE_LABELS = {
  email_open: { label: "Email Open", color: "#38bdf8", bg: "rgba(56, 189, 248, 0.1)", icon: "✉️" },
  site_visit: { label: "Website Visit", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.1)", icon: "🌐" },
  proposal_view: { label: "Proposal Click", color: "#2dd4bf", bg: "rgba(45, 212, 191, 0.1)", icon: "📄" },
  call_duration: { label: "Call duration", color: "#34d399", bg: "rgba(52, 211, 153, 0.1)", icon: "📞" },
  sms_reply: { label: "SMS Reply", color: "#f472b6", bg: "rgba(244, 114, 182, 0.1)", icon: "💬" }
};

export default function CRMCommandCore() {
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { uiTheme } = useTheme();

  const userRole = auth?.user?.role || "user";
  const isAdmin = userRole === "admin" || userRole === "super-admin";
  const isManagerOrAdmin = isAdmin || userRole === "manager";
  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080b10" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f131a" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      mutedText: isDark ? "rgba(255,255,255,0.4)" : "#475569",
      border: uiTheme?.panelColors?.borderColor || (isDark ? "rgba(217,119,6,0.15)" : "#e2e8f0"),
      inputBg: isDark ? "#020617" : "#ffffff",
      inputBorder: isDark ? "rgba(255,255,255,0.1)" : "#cbd5e1",
      primary: uiTheme?.customColors?.primary || "#ffd27a",
      metallicGold: "#ffd27a"
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedContactId, setSelectedContactId] = useState("");
  const [simEventType, setSimEventType] = useState<keyof typeof EVENT_TYPE_LABELS>("email_open");
  const [simMetadata, setSimMetadata] = useState("");
  const [simulatedLogs, setSimulatedLogs] = useState<string[]>(["[Telemetry System Initialized] Listening on active streams..."]);

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleTrigger, setRuleTrigger] = useState("email_open");
  const [ruleConditionTag, setRuleConditionTag] = useState("");
  const [ruleActionType, setRuleActionType] = useState<"create_task" | "send_email" | "escalate">("create_task");
  const [ruleActionParam, setRuleActionParam] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCcieFilter, setSelectedCcieFilter] = useState<string | null>(null);

  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [triggerPickerOpen, setTriggerPickerOpen] = useState(false);
  const [ruleTriggerPickerOpen, setRuleTriggerPickerOpen] = useState(false);
  const [ruleActionPickerOpen, setRuleActionPickerOpen] = useState(false);

  const contactsQuery = useQuery<Contact[]>({
    queryKey: ["crm-contacts"],
    queryFn: async () => {
      const res = await apiRequest("/crm-contacts") as ApiResponse;
      if (res && res.success && res.data && Array.isArray(res.data.items)) {
        const items = res.data.items;
        if (items.length > 0 && !selectedContactId) {
          setSelectedContactId(items[0].id);
        }
        return items as Contact[];
      }
      return Array.isArray(res) ? res : [];
    }
  });

  const metricsQuery = useQuery({
    queryKey: ["crm-commandcore-metrics"],
    queryFn: async () => {
      const res = await apiRequest("/crm-commandcore/metrics") as ApiResponse;
      if (res && res.success && res.data) {
        return {
          metrics: res.data.metrics || { winRate: 0, pipelineValue: 0, revenue: 0, atRiskAccountsCount: 0, highGravityCount: 0 },
          ccieDistribution: res.data.ccieDistribution || { maintained: 0, healthy: 0, attention: 0, atRisk: 0, critical: 0 },
          predictedRevenueWindows: res.data.predictedRevenueWindows || [],
          gravityOpportunities: res.data.gravityOpportunities || [],
          atRiskContacts: res.data.atRiskContacts || []
        };
      }
      return {
        metrics: { winRate: 0, pipelineValue: 0, revenue: 0, atRiskAccountsCount: 0, highGravityCount: 0 },
        ccieDistribution: { maintained: 0, healthy: 0, attention: 0, atRisk: 0, critical: 0 },
        predictedRevenueWindows: [],
        gravityOpportunities: [],
        atRiskContacts: []
      };
    }
  });

  const eventsQuery = useQuery<TelemetryEvent[]>({
    queryKey: ["crm-commandcore-events"],
    queryFn: async () => {
      const res = await apiRequest("/crm-commandcore/events") as ApiResponse;
      if (res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as TelemetryEvent[];
      }
      return Array.isArray(res) ? res : [];
    }
  });

  const rulesQuery = useQuery<AutomationRule[]>({
    queryKey: ["crm-commandcore-rules"],
    enabled: isManagerOrAdmin,
    queryFn: async () => {
      const res = await apiRequest("/crm-commandcore/rules") as ApiResponse;
      if (res && res.success && res.data && Array.isArray(res.data.items)) {
        return res.data.items as AutomationRule[];
      }
      return Array.isArray(res) ? res : [];
    }
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/crm-commandcore/run-intelligence", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-commandcore-metrics"] });
      setSimulatedLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Dynamic Engine Score Recalculation complete across all relational profiles.`,
        ...prev
      ]);
      Alert.alert("Success", "Intelligence engine updated successfully.");
    },
    onError: (err: any) => {
      Alert.alert("Calculation Error", err.message || "Failed to run background intelligence scoring.");
    }
  });

  const triggerTelemetryMutation = useMutation({
    mutationFn: async (payload: { contactId: string; eventType: string; description: string; metadata: any }) => {
      return await apiRequest("/crm-commandcore/events", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: (res: any, variables) => {
      const contactName = contactsQuery.data?.find(c => c.id === variables.contactId)?.name || "Contact";
      const actionsLog = res?.data?.triggeredActions?.length > 0
        ? res.data.triggeredActions.map((act: string) => `↳ [AUTOMATION ACTION]: ${act}`)
        : ["↳ [AUTOMATION ACTION]: Stream registered. No micro-intervention condition met."];

      setSimulatedLogs(prev => [
        `[${new Date().toLocaleTimeString()}] TELEMETRY SIGNAL RECOGNIZED: [${EVENT_TYPE_LABELS[simEventType].label}] targeted for ${contactName}`,
        ...actionsLog,
        ...prev
      ]);

      queryClient.invalidateQueries({ queryKey: ["crm-commandcore-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["crm-commandcore-events"] });
      setSimMetadata("");
    },
    onError: (err: any) => {
      Alert.alert("Telemetry Pipeline Error", err.message || "Signal ingestion rejected by node endpoint.");
    }
  });

  const saveRuleMutation = useMutation({
    mutationFn: async (newRule: any) => {
      return await apiRequest("/crm-commandcore/rules", {
        method: "POST",
        body: JSON.stringify(newRule)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-commandcore-rules"] });
      setIsRuleModalOpen(false);
      setRuleName("");
      setRuleConditionTag("");
      setRuleActionParam("");
      Alert.alert("Policy Saved", "Automated macro rule added to background workflow stacks.");
    },
    onError: (err: any) => {
      Alert.alert("Workflow Schema Error", err.message || "Rules database rejected parameters.");
    }
  });

  const filteredAtRiskContacts = useMemo(() => {
    const rawList = metricsQuery.data?.atRiskContacts || [];
    return rawList.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.company.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCcieFilter = selectedCcieFilter ? c.tier.toLowerCase() === selectedCcieFilter.toLowerCase() : true;
      return matchesSearch && matchesCcieFilter;
    });
  }, [metricsQuery.data?.atRiskContacts, searchQuery, selectedCcieFilter]);

  const overallHealthScore = useMemo(() => {
    const rawList = metricsQuery.data?.atRiskContacts || [];
    if (rawList.length === 0) return 96;
    const total = rawList.reduce((sum, c) => sum + c.continuityScore, 0);
    const avg = Math.round(total / rawList.length);
    return Math.max(0, 100 - (100 - avg) * 0.4);
  }, [metricsQuery.data?.atRiskContacts]);

  const handleTriggerTelemetry = () => {
    if (!selectedContactId) return;
    triggerTelemetryMutation.mutate({
      contactId: selectedContactId,
      eventType: simEventType,
      description: `Simulated signal: ${EVENT_TYPE_LABELS[simEventType].label} recorded via Admin Mobile Client context.`,
      metadata: simMetadata ? { custom: simMetadata } : {}
    });
  };

  const handleSaveRule = () => {
    if (!isAdmin || !ruleName) return;
    saveRuleMutation.mutate({
      name: ruleName,
      trigger: ruleTrigger,
      conditions: ruleConditionTag ? { tagPresence: ruleConditionTag } : {},
      actions: [
        {
          actionType: ruleActionType,
          params: ruleActionType === "create_task"
            ? { titleTemplate: ruleActionParam || "Outreach [ContactName]", priority: "High" }
            : ruleActionType === "send_email"
            ? { subject: "Follow up message", body: ruleActionParam || "Hello [ContactName]..." }
            : {}
        }
      ]
    });
  };

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
    queryClient.invalidateQueries({ queryKey: ["crm-commandcore-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["crm-commandcore-events"] });
    if (isManagerOrAdmin) {
      queryClient.invalidateQueries({ queryKey: ["crm-commandcore-rules"] });
    }
  };

  const currentContactName = useMemo(() => {
    const found = contactsQuery.data?.find(c => c.id === selectedContactId);
    return found ? `${found.name} (${found.company})` : "Select Contact";
  }, [contactsQuery.data, selectedContactId]);

  const globalLoadingStatus = contactsQuery.isLoading || metricsQuery.isLoading || eventsQuery.isLoading;

  if (globalLoadingStatus && !recalculateMutation.isPending) {
    return (
      <View style={styles.centerDeck}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.syncLoadingText}>Synchronizing CommandCore Engines...</Text>
      </View>
    );
  }

  const metricsData = metricsQuery.data?.metrics;
  const ccieDist = metricsQuery.data?.ccieDistribution;
  const gravityOpps = metricsQuery.data?.gravityOpportunities || [];
  const revenueWindows = metricsQuery.data?.predictedRevenueWindows || [];
  const automationRules = rulesQuery.data || [];
  const telemetryEvents = eventsQuery.data || [];

  return (
    <SafeAreaView style={styles.rootContainer}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollWrapper}
        refreshControl={
          <RefreshControl
            refreshing={globalLoadingStatus}
            onRefresh={handleRefreshAll}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headerDeck}>
          <View style={styles.headerTitleRow}>
            <View style={styles.logoAndTitleContainer}>
              <View style={styles.badgeCoreLogo}>
                <Text style={styles.logoText}>C²</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.headlineRowInline}>
                  <Text style={styles.screenHeading}>CommandCore®</Text>
                  <View style={styles.roleBadgeBox}>
                    <Text style={styles.roleBadgeText}>
                      {userRole === "admin" || userRole === "super-admin" ? "Admin Access" : userRole === "manager" ? "Manager Access" : "User Access"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.screenCaption}>
                  Client Continuity Intelligence Engine (CCIE) · Revenue Gravity Engine (RGE)
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionButtonContainerBar}>
            <TouchableOpacity
              onPress={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending || !isManagerOrAdmin}
              style={[styles.engineTriggerBtn, (!isManagerOrAdmin || recalculateMutation.isPending) && styles.disabledButtonState]}
            >
              <RotateCw size={13} color={colors.text} />
              <Text style={styles.engineBtnLabelText}>
                {recalculateMutation.isPending ? "Recalculating..." : "Recalculate Scores"}
              </Text>
              {!isManagerOrAdmin && <Lock size={11} color={colors.mutedText} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRefreshAll} style={styles.syncPrimaryEngineBtn}>
              <Zap size={13} color="#080b10" />
              <Text style={styles.syncBtnLabelText}>Sync Engine</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.summaryGridSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsKpiStripScroll}>
            {[
              { label: "Pipeline Value", value: `$${(metricsData?.pipelineValue || 0).toLocaleString('En-US')}`, icon: TrendingUp, tint: colors.primary },
              { label: "Closed Revenue", value: `$${(metricsData?.revenue || 0).toLocaleString('En-US')}`, icon: CheckCircle, tint: "#34d399" },
              { label: "At-Risk Relations", value: String(metricsData?.atRiskAccountsCount || 0), icon: ShieldAlert, tint: "#ef4444" },
              { label: "High Gravity Opps", value: String(metricsData?.highGravityCount || 0), icon: Zap, tint: "#a78bfa" }
            ].map((m, idx) => (
              <View key={idx} style={styles.summaryKpiCard}>
                <View style={{ flex: 1, paddingRight: 4 }}>
                  <Text style={styles.kpiCardMetaLabel} numberOfLines={1}>{m.label}</Text>
                  <Text style={styles.kpiCardMetricValue} numberOfLines={1}>{m.value}</Text>
                </View>
                <View style={styles.kpiIconWrapperSquare}>
                  <m.icon size={16} color={m.tint} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.workspaceSectionBlock}>
          <View style={styles.continuityAnalyticsCardSurface}>
            <View style={styles.analyticsCardTitleRowInline}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Activity size={14} color={colors.primary} />
                  <Text style={styles.blockTitleText}>Client Continuity Intelligence Engine (CCIE)</Text>
                </View>
                <Text style={styles.blockSubtitleCaption}>Real-time relationship maintenance & inactivity prevention</Text>
              </View>
              <View style={styles.netHealthPillFrame}>
                <Text style={styles.netHealthPillText}>{Math.round(overallHealthScore)}% Net Health</Text>
              </View>
            </View>

            <View style={styles.donutAndDistributionContainerFlex}>
              <View style={styles.donutChartWrapperBox}>
                <View style={styles.donutCoreIndexWell}>
                  <Text style={styles.donutCoreIndexValue}>{Math.round(overallHealthScore)}</Text>
                  <Text style={styles.donutCoreIndexMetaLabel}>INDEX</Text>
                </View>
              </View>

              <View style={styles.distributionBarsVerticalList}>
                {[
                  { tier: "Fully maintained", count: ccieDist?.maintained || 0, color: colors.primary },
                  { tier: "Healthy", count: ccieDist?.healthy || 0, color: "#34d399" },
                  { tier: "Needs attention", count: ccieDist?.attention || 0, color: "#f59e0b" },
                  { tier: "At Risk", count: ccieDist?.atRisk || 0, color: "#f97316" },
                  { tier: "Critical", count: ccieDist?.critical || 0, color: "#ef4444" }
                ].map((item, index) => {
                  const total = Object.values(ccieDist || {}).reduce((s, c) => s + c, 0) || 1;
                  const percent = Math.round((item.count / total) * 100);
                  const isSelected = selectedCcieFilter?.toLowerCase() === item.tier.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedCcieFilter(isSelected ? null : item.tier)}
                      style={[styles.distributionOptionNodeRow, isSelected && styles.distributionOptionNodeRowActive]}
                    >
                      <View style={styles.distributionDataLabelFlexRow}>
                        <Text style={styles.distributionNodeLabelText}>{item.tier}</Text>
                        <Text style={styles.distributionNodeValueCount}>{item.count} ({percent}%)</Text>
                      </View>
                      <View style={styles.progressBarTrackBase}>
                        <View style={[styles.progressBarCoreFill, { width: `${percent}%`, backgroundColor: item.color }]} />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.registerDetailsCardSurface}>
            <View style={styles.registerHeaderControlsRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.registerSectionTitleHeading}>Relationship Continuity Register</Text>
                <Text style={styles.blockSubtitleCaption}>Filtered view of relationships matching maintenance limits</Text>
              </View>
              <View style={styles.searchFilterInlineInputFrame}>
                <Search size={12} color={colors.mutedText} />
                <TextInput
                  placeholder="Filter register..."
                  placeholderTextColor={colors.mutedText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={styles.searchFilterTextInputWidget}
                />
              </View>
            </View>

            <View style={styles.registerListViewNodeContainer}>
              {filteredAtRiskContacts.length === 0 ? (
                <View style={styles.emptyDatasetWarningBox}>
                  <Info size={24} color={colors.mutedText} />
                  <Text style={styles.emptyDatasetWarningText}>No relationship matches found.</Text>
                </View>
              ) : (
                filteredAtRiskContacts.map((c, idx) => {
                  const isMaintained = c.continuityScore >= 80;
                  const isAttention = c.continuityScore >= 60;
                  const scorePillStyles = isMaintained ? styles.scorePillMaintained
                    : isAttention ? styles.scorePillAttention
                    : styles.scorePillCritical;
                  const textStyles = isMaintained ? { color: colors.primary }
                    : isAttention ? { color: "#f59e0b" }
                    : { color: "#ef4444" };

                  return (
                    <View key={idx} style={styles.registerItemRowNodeFrame}>
                      <View style={styles.registerItemProfileGroup}>
                        <View style={styles.avatarFallbackCellWell}>
                          <Text style={styles.avatarFallbackText}>{c.name.slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={styles.profileTextMetaFrame}>
                          <Text style={styles.profilePrimaryTitleText} numberOfLines={1}>{c.name}</Text>
                          <Text style={styles.profileSecondarySubtitleText} numberOfLines={1}>{c.company}</Text>
                        </View>
                      </View>
                      <View style={styles.registerItemMetricScoreGroup}>
                        <View style={styles.lastInteractionDateTextMetaFrame}>
                          <Text style={styles.interactionMetaLabelText}>Last interaction</Text>
                          <Text style={styles.interactionValueDateText}>{new Date(c.lastInteraction || Date.now()).toLocaleDateString()}</Text>
                        </View>
                        <View style={[styles.scorePillBaseFrame, scorePillStyles]}>
                          <Text style={[styles.scorePillValueText, textStyles]}>{c.continuityScore} CCIE</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        <View style={styles.workspaceSectionBlock}>
          <View style={styles.simulatorControlCardSurface}>
            <View style={styles.simulatorHeadlineRowTitle}>
              <Radio size={14} color={colors.primary} />
              <Text style={styles.blockTitleText}>Live Telemetry Simulator</Text>
            </View>
            <Text style={styles.simulatorDescriptionParagraphText}>
              Trigger artificial customer behaviors to watch the continuity and gravity scores recalculate instantly and launch auto-interventions.
            </Text>

            <View style={styles.simulatorFormStackGroup}>
              <View style={styles.formInputLayoutRowStack}>
                <Text style={styles.formInputGroupFieldNameLabel}>Select Contact</Text>
                <TouchableOpacity style={styles.customSelectorTriggerAnchor} onPress={() => setContactPickerOpen(true)}>
                  <Text style={styles.customSelectorValueDisplayLabel} numberOfLines={1}>{currentContactName}</Text>
                  <ChevronDown size={14} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.formDualColumnGridInlineInputRow}>
                <View style={styles.flexElementFrame}>
                  <Text style={styles.formInputGroupFieldNameLabel}>Behavior Trigger</Text>
                  <TouchableOpacity style={styles.customSelectorTriggerAnchor} onPress={() => setTriggerPickerOpen(true)}>
                    <Text style={styles.customSelectorValueDisplayLabel}>
                      {EVENT_TYPE_LABELS[simEventType]?.label || simEventType}
                    </Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.flexElementFrame}>
                  <Text style={styles.formInputGroupFieldNameLabel}>Custom Value / metadata</Text>
                  <TextInput
                    placeholder="e.g. 5m duration, pricing"
                    placeholderTextColor={colors.mutedText}
                    value={simMetadata}
                    onChangeText={setSimMetadata}
                    style={styles.formTextInputWidgetContainer}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={handleTriggerTelemetry}
                disabled={triggerTelemetryMutation.isPending || !selectedContactId}
                style={[styles.transmitSignalSubmissionBtn, (triggerTelemetryMutation.isPending || !selectedContactId) && styles.disabledButtonState]}
              >
                <Play size={13} color="#080b10" />
                <Text style={styles.transmitBtnLabelText}>
                  {triggerTelemetryMutation.isPending ? "Transmitting..." : "Transmit Behavior Signal"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.matrixOpportunitiesCardSurface}>
            <View style={styles.simulatorHeadlineRowTitle}>
              <Zap size={14} color={colors.primary} />
              <Text style={styles.blockTitleText}>Revenue Gravity opportunities</Text>
            </View>
            <Text style={styles.simulatorDescriptionParagraphText}>
              Predictive opportunity matrix computed dynamically by behavioral telemetry signals.
            </Text>

            {/* FIXED: Added fixed height container with scrollable viewport bounds */}
            <ScrollView 
              nestedScrollEnabled={true} 
              showsVerticalScrollIndicator={true}
              style={styles.matrixOppsScrollListContainer}
              contentContainerStyle={styles.matrixOppsScrollContent}
            >
              {gravityOpps.length === 0 ? (
                <View style={styles.emptyDatasetWarningBox}>
                  <Info size={24} color={colors.mutedText} />
                  <Text style={styles.emptyDatasetWarningText}>No high gravity opportunities detected yet.</Text>
                </View>
              ) : (
                gravityOpps.map((opp, idx) => {
                  const tierStyles = opp.gravityScore >= 90 ? styles.tierBadgeRose
                    : opp.gravityScore >= 75 ? styles.tierBadgeOrange
                    : opp.gravityScore >= 50 ? styles.tierBadgeAmber
                    : styles.tierBadgeNeutral;
                  return (
                    <View key={idx} style={styles.matrixOppRowNodeFrame}>
                      <View style={styles.matrixOppHeaderFlexMetaRow}>
                        <View style={styles.flexElementFrame}>
                          <Text style={styles.oppItemPrimaryTitleText} numberOfLines={1}>{opp.name}</Text>
                          <Text style={styles.oppItemSecondarySubtitleText} numberOfLines={1}>{opp.company}</Text>
                        </View>
                        <View style={[styles.tierBadgeBaseFrame, tierStyles]}>
                          <Text style={styles.tierBadgeValueText}>{opp.tier}</Text>
                        </View>
                      </View>

                      <View style={styles.matrixOppDataRowMetaSpec}>
                        <Text style={styles.matrixOppSpecFieldLabel}>Account Value</Text>
                        <Text style={styles.matrixOppSpecFieldValueText}>${opp.accountValue.toLocaleString()}</Text>
                      </View>

                      <View style={styles.matrixOppDataRowMetaSpec}>
                        <Text style={styles.matrixOppSpecFieldLabel}>Gravity Score</Text>
                        <Text style={[styles.matrixOppSpecFieldGravityValue, { color: colors.primary }]}>{opp.gravityScore}%</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>

        {revenueWindows.length > 0 && (
          <View style={styles.workspaceSectionBlock}>
            <View style={styles.matrixOpportunitiesCardSurface}>
              <View style={styles.simulatorHeadlineRowTitle}>
                <TrendingUp size={14} color={colors.primary} />
                <Text style={styles.blockTitleText}>Predicted Revenue Windows</Text>
              </View>
              <Text style={styles.simulatorDescriptionParagraphText}>
                Dynamic rolling horizon projections modeled from relationship interactions.
              </Text>
              
              {/* FIXED: Swapped static view layer out for an isolated, scroll-safe layout block */}
              <ScrollView 
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
                style={styles.revenueWindowsScrollListContainer}
                contentContainerStyle={styles.revenueWindowsScrollContent}
              >
                {revenueWindows.map((win, idx) => (
                  <View key={idx} style={styles.matrixOppRowNodeFrame}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={[styles.oppItemPrimaryTitleText, { color: colors.primary }]}>{win.month}</Text>
                      <Text style={styles.oppItemPrimaryTitleText}>${win.amount.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.matrixOppDataRowMetaSpec, { borderTopWidth: 0, marginTop: 2, paddingTop: 0 }]}>
                      <Text style={styles.matrixOppSpecFieldLabel}>Active Opportunities</Text>
                      <Text style={[styles.matrixOppSpecFieldValueText, { fontSize: 11 }]}>{win.opportunities} mapped</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        <View style={styles.workflowAutomationCardSurface}>
          <View style={styles.workflowSectionHeaderRowFlex}>
            <View style={styles.flexElementFrame}>
              <Text style={styles.blockTitleText}>
                <Sliders size={14} color={colors.primary} /> Intelligent Automated Rules Workflow Builder
              </Text>
              {!isManagerOrAdmin && (
                <View style={styles.viewOnlyBadgeBox}>
                  <Lock size={10} color={colors.primary} />
                  <Text style={styles.viewOnlyBadgeText}>View Only</Text>
                </View>
              )}
              <Text style={styles.blockSubtitleCaption}>Define trigger conditions and micro-actions for automatic intervention</Text>
            </View>

            {isManagerOrAdmin && (
              <TouchableOpacity
                onPress={() => setIsRuleModalOpen(true)}
                disabled={!isAdmin}
                style={[styles.addAutomationWorkflowTriggerBtn, !isAdmin && styles.disabledButtonState, { backgroundColor: colors.primary }]}
              >
                <Plus size={14} color="#080b10" />
                <Text style={styles.addWorkflowBtnLabelText}>Add Automation Workflow</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isManagerOrAdmin ? (
            <View style={styles.accessRestrictedPlaceholderBox}>
              <Lock size={28} color={colors.mutedText} />
              <Text style={styles.restrictedTitleText}>Automation rules visual layout is restricted to Managers & Administrators.</Text>
              <Text style={styles.restrictedSubtitleText}>Please contact your system supervisor to review pipeline oversight.</Text>
            </View>
          ) : (
            <View style={styles.automationWorkflowsStackGrid}>
              {automationRules.length === 0 ? (
                <View style={styles.emptyDatasetWarningBox}>
                  <Sliders size={24} color={colors.mutedText} />
                  <Text style={styles.emptyDatasetWarningText}>No active automation workflows discovered.</Text>
                </View>
              ) : (
                automationRules.map((rule, idx) => (
                  <View key={idx} style={styles.workflowRuleBlockContainerNode}>
                    <View style={styles.workflowRuleHeaderInlineMetaRow}>
                      <Text style={styles.workflowRuleTitleText} numberOfLines={1}>{rule.name}</Text>
                      <View style={[styles.ruleStatusBadgeFrame, rule.isActive ? styles.ruleStatusBadgeActive : styles.ruleStatusBadgeDisabled]}>
                        <Text style={styles.ruleStatusBadgeText}>{rule.isActive ? "Active" : "Disabled"}</Text>
                      </View>
                    </View>

                    <View style={styles.diagramStructureVerticalConnectorLine}>
                      <View style={styles.diagramNodeStepItemRow}>
                        <View style={[styles.diagramIndicatorDotPoint, { backgroundColor: colors.primary }]} />
                        <View style={styles.flexElementFrame}>
                          <Text style={styles.diagramStepMetaLabelText}>Trigger Event</Text>
                          <Text style={[styles.diagramStepPrimaryValueText, { color: colors.primary }]}>
                            {EVENT_TYPE_LABELS[rule.trigger as keyof typeof EVENT_TYPE_LABELS]?.label || rule.trigger}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.diagramNodeStepItemRow}>
                        <View style={[styles.diagramIndicatorDotPoint, { backgroundColor: "#f59e0b" }]} />
                        <View style={styles.flexElementFrame}>
                          <Text style={styles.diagramStepMetaLabelText}>Condition Matrix</Text>
                          <Text style={styles.diagramStepSecondaryValueText} numberOfLines={1}>
                            {rule.conditions?.tagPresence ? `Tag presence: '${rule.conditions.tagPresence}'` : "Always execute (No Conditions)"}
                          </Text>
                        </View>
                      </View>

                      {rule.actions?.map((act, actIdx) => (
                        <View key={actIdx} style={styles.diagramNodeStepItemRow}>
                          <View style={[styles.diagramIndicatorDotPoint, { backgroundColor: "#34d399" }]} />
                          <View style={styles.flexElementFrame}>
                            <Text style={styles.diagramStepMetaLabelText}>Action Executed</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                              <Text style={[styles.diagramStepExecutedActionText, { color: "#34d399" }]}>
                                {act.actionType.replace("_", " ").toUpperCase()}
                              </Text>
                              <ArrowRight size={10} color="#34d399" />
                            </View>
                            <Text style={styles.diagramStepActionTemplateInfo} numberOfLines={1}>
                              {act.params?.titleTemplate || act.params?.subject || "VIP alert notification to manager"}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        <View style={styles.workspaceSectionBlock}>
          <View style={styles.liveTelemetryLogsConsoleSurface}>
            <View style={styles.simulatorHeadlineRowTitle}>
              <View style={styles.pingIndicatorLiveDotPoint} />
              <Text style={styles.blockTitleText}>Live Telemetry Event Logs</Text>
            </View>
            <View style={styles.cyberConsoleTerminalLogBoxWell}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator style={styles.terminalWindowScrollFrame}>
                {simulatedLogs.map((log, idx) => {
                  const isAction = log.includes("[AUTOMATION ACTION]");
                  const color = isAction ? colors.primary : log.includes("INITIALIZED") ? "#34d399" : "#e2e8f0";
                  return (
                    <Text key={idx} style={[styles.consoleTextLineNode, { color }]}>
                      {log}
                    </Text>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.recentBehavioralEventsSurfaceCard}>
            <Text style={styles.blockTitleText}>Recent Behavioral Events</Text>
            
            <ScrollView 
              nestedScrollEnabled={true} 
              showsVerticalScrollIndicator={true}
              style={styles.recentBehavioralEventsScrollListContainer}
              contentContainerStyle={styles.recentBehavioralEventsScrollContent}
            >
              {telemetryEvents.length === 0 ? (
                <View style={styles.emptyDatasetWarningBox}>
                  <Info size={24} color={colors.mutedText} />
                  <Text style={styles.emptyDatasetWarningText}>No telemetry signals logged yet.</Text>
                </View>
              ) : (
                telemetryEvents.map((evt, idx) => {
                  const cfg = EVENT_TYPE_LABELS[evt.eventType] || { label: evt.eventType, color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: "⚙️" };
                  return (
                    <View key={idx} style={styles.recentBehavioralEventItemRowFrame}>
                      <View style={styles.recentEventItemProfileGroup}>
                        <Text style={styles.recentEventEmojiTypeIconGraphicSpacer}>{cfg.icon}</Text>
                        <View style={styles.flexElementFrame}>
                          <Text style={styles.recentEventContactNameText} numberOfLines={1}>
                            {evt.contactId?.name || "System Record"}
                          </Text>
                          <Text style={styles.recentEventDescriptionText} numberOfLines={1}>
                            {evt.description}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.recentEventItemTimestampGroup}>
                        <Text style={styles.recentEventTimestampValueText}>
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                        <View style={[styles.recentEventBadgeFrame, { backgroundColor: cfg.bg, borderColor: "transparent" }]}>
                          <Text style={[styles.recentEventBadgeValueText, { color: cfg.color }]}>
                            {cfg.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </ScrollView>

      <Modal visible={isRuleModalOpen && isAdmin} transparent animationType="slide">
        <View style={styles.modalBackdropOverlayContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalBoxCenteredContentSurface}>
            <View style={styles.modalHeaderTopBarInlineRow}>
              <Text style={styles.modalMainTitleHeading}>Create Automation Workflow</Text>
              <TouchableOpacity onPress={() => setIsRuleModalOpen(false)}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScrollContentBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formInputLayoutRowStack}>
                <Text style={styles.formInputGroupFieldNameLabel}>Rule Name</Text>
                <TextInput
                  placeholder="e.g. VIP Site Activity Followup"
                  placeholderTextColor={colors.mutedText}
                  value={ruleName}
                  onChangeText={setRuleName}
                  style={styles.formTextInputWidgetContainer}
                />
              </View>

              <View style={styles.formDualColumnGridInlineInputRow}>
                <View style={styles.flexElementFrame}>
                  <Text style={styles.formInputGroupFieldNameLabel}>Trigger Event</Text>
                  <TouchableOpacity style={styles.customSelectorTriggerAnchor} onPress={() => setRuleTriggerPickerOpen(true)}>
                    <Text style={styles.customSelectorValueDisplayLabel}>
                      {EVENT_TYPE_LABELS[ruleTrigger as keyof typeof EVENT_TYPE_LABELS]?.label || ruleTrigger}
                    </Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.flexElementFrame}>
                  <Text style={styles.formInputGroupFieldNameLabel}>Condition: Tag Presence (Optional)</Text>
                  <TextInput
                    placeholder="e.g. VIP, Enterprise"
                    placeholderTextColor={colors.mutedText}
                    value={ruleConditionTag}
                    onChangeText={setRuleConditionTag}
                    style={styles.formTextInputWidgetContainer}
                  />
                </View>
              </View>

              <View style={styles.formDualColumnGridInlineInputRow}>
                <View style={styles.flexElementFrame}>
                  <Text style={styles.formInputGroupFieldNameLabel}>Execute Action</Text>
                  <TouchableOpacity style={styles.customSelectorTriggerAnchor} onPress={() => setRuleActionPickerOpen(true)}>
                    <Text style={styles.customSelectorValueDisplayLabel}>
                      {ruleActionType === "create_task" ? "Create Follow-Up Task" : ruleActionType === "send_email" ? "Send Auto Check-In Email" : "Escalate Opportunity to Manager"}
                    </Text>
                    <ChevronDown size={14} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.flexElementFrame}>
                  <Text style={styles.formInputGroupFieldNameLabel}>Action Value / Params</Text>
                  <TextInput
                    placeholder={ruleActionType === "create_task" ? "e.g. Call [ContactName]" : "e.g. Hi [ContactName]..."}
                    value={ruleActionParam}
                    onChangeText={setRuleActionParam}
                    placeholderTextColor={colors.mutedText}
                    style={styles.formTextInputWidgetContainer}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooterButtonBarActionsFrame}>
              <TouchableOpacity onPress={() => setIsRuleModalOpen(false)} style={styles.formDismissActionModalButton}>
                <Text style={styles.dismissActionBtnLabelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveRule}
                disabled={!ruleName || saveRuleMutation.isPending}
                style={[styles.formSubmitActionModalButton, (!ruleName || saveRuleMutation.isPending) && styles.disabledButtonState, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.submitActionBtnLabelText}>Save Workflow</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={contactPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalBackdropOverlay} activeOpacity={1} onPress={() => setContactPickerOpen(false)}>
          <View style={styles.dropdownModalSelectionSurfaceBox}>
            <Text style={styles.dropdownSelectionModalHeadlineTitle}>Select Contact</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {contactsQuery.data?.map(c => {
                const isActiveItem = selectedContactId === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.dropdownSelectionItemNodeRow, isActiveItem && styles.dropdownSelectionItemNodeRowActive]}
                    onPress={() => {
                      setSelectedContactId(c.id);
                      setContactPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownSelectionItemDisplayLabelText, isActiveItem && { color: colors.primary, fontWeight: "700" }]}>
                      {c.name} ({c.company})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={triggerPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalBackdropOverlay} activeOpacity={1} onPress={() => setTriggerPickerOpen(false)}>
          <View style={styles.dropdownModalSelectionSurfaceBox}>
            <Text style={styles.dropdownSelectionModalHeadlineTitle}>Select Behavior Trigger</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => {
                const isActiveItem = simEventType === k;
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.dropdownSelectionItemNodeRow, isActiveItem && styles.dropdownSelectionItemNodeRowActive]}
                    onPress={() => {
                      setSimEventType(k as any);
                      setTriggerPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownSelectionItemDisplayLabelText, isActiveItem && { color: colors.primary, fontWeight: "700" }]}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={ruleTriggerPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalBackdropOverlay} activeOpacity={1} onPress={() => setRuleTriggerPickerOpen(false)}>
          <View style={styles.dropdownModalSelectionSurfaceBox}>
            <Text style={styles.dropdownSelectionModalHeadlineTitle}>Select Trigger Event</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => {
                const isActiveItem = ruleTrigger === k;
                return (
                  <TouchableOpacity
                    key={k}
                    style={[styles.dropdownSelectionItemNodeRow, isActiveItem && styles.dropdownSelectionItemNodeRowActive]}
                    onPress={() => {
                      setRuleTrigger(k);
                      setRuleTriggerPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownSelectionItemDisplayLabelText, isActiveItem && { color: colors.primary, fontWeight: "700" }]}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={ruleActionPickerOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.dropdownModalBackdropOverlay} activeOpacity={1} onPress={() => setRuleActionPickerOpen(false)}>
          <View style={styles.dropdownModalSelectionSurfaceBox}>
            <Text style={styles.dropdownSelectionModalHeadlineTitle}>Select Execute Action</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { value: "create_task", label: "Create Follow-Up Task" },
                { value: "send_email", label: "Send Auto Check-In Email" },
                { value: "escalate", label: "Escalate Opportunity to Manager" }
              ].map(opt => {
                const isActiveItem = ruleActionType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropdownSelectionItemNodeRow, isActiveItem && styles.dropdownSelectionItemNodeRowActive]}
                    onPress={() => {
                      setRuleActionType(opt.value as any);
                      setRuleActionPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.dropdownSelectionItemDisplayLabelText, isActiveItem && { color: colors.primary, fontWeight: "700" }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: colors.background
  },
  centerDeck: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background
  },
  syncLoadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: "500"
  },
  scrollWrapper: {
    paddingBottom: 60
  },
  headerDeck: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  logoAndTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  badgeCoreLogo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  logoText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#080b10"
  },
  headlineRowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: "900",
    color: colors.text
  },
  roleBadgeBox: {
    backgroundColor: "rgba(217,119,6,0.1)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase"
  },
  screenCaption: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2
  },
  actionButtonContainerBar: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  engineTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.border
  },
  engineBtnLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text
  },
  disabledButtonState: {
    opacity: 0.4
  },
  syncPrimaryEngineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.primary
  },
  syncBtnLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#080b10"
  },
  summaryGridSection: {
    marginTop: 16
  },
  metricsKpiStripScroll: {
    paddingHorizontal: 16,
    gap: 10
  },
  summaryKpiCard: {
    width: 154,
    height: 68,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14
  },
  kpiCardMetaLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.mutedText,
    textTransform: "uppercase"
  },
  kpiCardMetricValue: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text,
    marginTop: 2
  },
  kpiIconWrapperSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: "center",
    justifyContent: "center"
  },
  workspaceSectionBlock: {
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 16
  },
  continuityAnalyticsCardSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16
  },
  analyticsCardTitleRowInline: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16
  },
  blockTitleText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  blockSubtitleCaption: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2
  },
  netHealthPillFrame: {
    backgroundColor: "rgba(217,119,6,0.1)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  netHealthPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary
  },
  donutAndDistributionContainerFlex: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  donutChartWrapperBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  donutCoreIndexWell: {
    alignItems: "center",
    justifyContent: "center"
  },
  donutCoreIndexValue: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.text,
    lineHeight: 22
  },
  donutCoreIndexMetaLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: colors.mutedText
  },
  distributionBarsVerticalList: {
    flex: 1,
    gap: 6
  },
  distributionOptionNodeRow: {
    padding: 4,
    borderRadius: 8
  },
  distributionOptionNodeRowActive: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: colors.border
  },
  distributionDataLabelFlexRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  distributionNodeLabelText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text
  },
  distributionNodeValueCount: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedText
  },
  progressBarTrackBase: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    marginTop: 4,
    overflow: "hidden"
  },
  progressBarCoreFill: {
    height: "100%",
    borderRadius: 3
  },
  registerDetailsCardSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16
  },
  registerHeaderControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14
  },
  registerSectionTitleHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  searchFilterInlineInputFrame: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 32,
    width: 140
  },
  searchFilterTextInputWidget: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    paddingLeft: 4
  },
  registerListViewNodeContainer: {
    maxHeight: 240,
    gap: 8
  },
  emptyDatasetWarningBox: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  emptyDatasetWarningText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.mutedText
  },
  registerItemRowNodeFrame: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder
  },
  registerItemProfileGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  avatarFallbackCellWell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarFallbackText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.text
  },
  profileTextMetaFrame: {
    flex: 1
  },
  profilePrimaryTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text
  },
  profileSecondarySubtitleText: {
    fontSize: 10,
    color: colors.mutedText,
    marginTop: 1
  },
  registerItemMetricScoreGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  lastInteractionDateTextMetaFrame: {
    alignItems: "flex-end"
  },
  interactionMetaLabelText: {
    fontSize: 9,
    color: colors.mutedText,
    fontWeight: "600"
  },
  interactionValueDateText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
    marginTop: 1
  },
  scorePillBaseFrame: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  scorePillMaintained: {
    backgroundColor: "rgba(251,191,38,0.08)",
    borderColor: "rgba(251,191,38,0.2)"
  },
  scorePillAttention: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderColor: "rgba(245,158,11,0.2)"
  },
  scorePillCritical: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderColor: "rgba(239,68,68,0.2)"
  },
  scorePillValueText: {
    fontSize: 10,
    fontWeight: "800"
  },
  simulatorControlCardSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16
  },
  simulatorHeadlineRowTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6
  },
  simulatorDescriptionParagraphText: {
    fontSize: 11,
    color: colors.mutedText,
    lineHeight: 15,
    marginBottom: 14
  },
  simulatorFormStackGroup: {
    gap: 12
  },
  formInputLayoutRowStack: {
    gap: 6
  },
  formInputGroupFieldNameLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.mutedText,
    textTransform: "uppercase"
  },
  customSelectorTriggerAnchor: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  customSelectorValueDisplayLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
    flex: 1
  },
  formDualColumnGridInlineInputRow: {
    flexDirection: "row",
    gap: 10
  },
  formTextInputWidgetContainer: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.2)",
    fontSize: 12,
    color: colors.text
  },
  transmitSignalSubmissionBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4
  },
  transmitBtnLabelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#080b10",
    textTransform: "uppercase"
  },
  matrixOpportunitiesCardSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16
  },
  
  /* FIXED: Added vertical frame bounding constraint to support clean track mapping */
  matrixOppsScrollListContainer: {
    height: 200,
    marginTop: 12
  },
  matrixOppsScrollContent: {
    gap: 8,
    paddingBottom: 8
  },
  matrixOppRowNodeFrame: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder
  },
  matrixOppHeaderFlexMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8
  },
  oppItemPrimaryTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text
  },
  oppItemSecondarySubtitleText: {
    fontSize: 10,
    color: colors.mutedText
  },
  tierBadgeBaseFrame: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1
  },
  tierBadgeRose: { color: "#ef4444", backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" },
  tierBadgeOrange: { color: "#f97316", backgroundColor: "rgba(249,115,22,0.08)", borderColor: "rgba(249,115,22,0.2)" },
  tierBadgeAmber: { color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" },
  tierBadgeNeutral: { color: colors.text, backgroundColor: "rgba(255,255,255,0.05)", borderColor: colors.border },
  tierBadgeValueText: {
    fontSize: 9,
    fontWeight: "800"
  },
  matrixOppDataRowMetaSpec: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.03)"
  },
  matrixOppSpecFieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.mutedText,
    textTransform: "uppercase"
  },
  matrixOppSpecFieldValueText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text
  },
  matrixOppSpecFieldGravityValue: {
    fontSize: 12,
    fontWeight: "900"
  },
  
  /* FIXED: Added structural layout definitions for scrolling horizon projection metrics */
  revenueWindowsScrollListContainer: {
    height: 180,
    marginTop: 12
  },
  revenueWindowsScrollContent: {
    gap: 8,
    paddingBottom: 8
  },
  workflowAutomationCardSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16
  },
  workflowSectionHeaderRowFlex: {
    flexDirection: "column",
    gap: 10,
    marginBottom: 16
  },
  viewOnlyBadgeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4
  },
  viewOnlyBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#f59e0b"
  },
  addAutomationWorkflowTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignSelf: "flex-start"
  },
  addWorkflowBtnLabelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#080b10"
  },
  accessRestrictedPlaceholderBox: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.01)"
  },
  restrictedTitleText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16
  },
  restrictedSubtitleText: {
    fontSize: 10,
    color: colors.mutedText,
    textAlign: "center",
    marginTop: 2
  },
  automationWorkflowsStackGrid: {
    gap: 12
  },
  workflowRuleBlockContainerNode: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder
  },
  workflowRuleHeaderInlineMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  workflowRuleTitleText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text,
    flex: 1
  },
  ruleStatusBadgeFrame: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1
  },
  ruleStatusBadgeActive: { color: "#10b981", backgroundColor: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)" },
  ruleStatusBadgeDisabled: { color: "#64748b", backgroundColor: "rgba(100,116,139,0.08)", borderColor: "rgba(100,116,139,0.2)" },
  ruleStatusBadgeText: {
    fontSize: 9,
    fontWeight: "800"
  },
  diagramStructureVerticalConnectorLine: {
    borderLeftWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    marginLeft: 4,
    paddingLeft: 12,
    gap: 10
  },
  diagramNodeStepItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    position: "relative"
  },
  diagramIndicatorDotPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    left: -16.5,
    top: 4
  },
  diagramStepMetaLabelText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.mutedText,
    textTransform: "uppercase"
  },
  diagramStepPrimaryValueText: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1
  },
  diagramStepSecondaryValueText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
    marginTop: 1
  },
  diagramStepExecutedActionText: {
    fontSize: 11,
    fontWeight: "800"
  },
  diagramStepActionTemplateInfo: {
    fontSize: 10,
    color: colors.mutedText,
    fontStyle: "italic",
    marginTop: 1
  },
  liveTelemetryLogsConsoleSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16
  },
  pingIndicatorLiveDotPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34d399"
  },
  cyberConsoleTerminalLogBoxWell: {
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 12,
    height: 200
  },
  terminalWindowScrollFrame: {
    flex: 1
  },
  consoleTextLineNode: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 10,
    lineHeight: 14,
    marginBottom: 4
  },
  recentBehavioralEventsSurfaceCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16
  },
  recentBehavioralEventsScrollListContainer: {
    height: 200,
    marginTop: 12
  },
  recentBehavioralEventsScrollContent: {
    gap: 8,
    paddingBottom: 8
  },
  recentBehavioralEventItemRowFrame: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderWidth: 1,
    borderColor: colors.inputBorder
  },
  recentEventItemProfileGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1
  },
  recentEventEmojiTypeIconGraphicSpacer: {
    fontSize: 14
  },
  recentEventContactNameText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text
  },
  recentEventDescriptionText: {
    fontSize: 10,
    color: colors.mutedText,
    marginTop: 1
  },
  recentEventItemTimestampGroup: {
    alignItems: "flex-end",
    gap: 4
  },
  recentEventTimestampValueText: {
    fontSize: 9,
    color: colors.mutedText,
    fontWeight: "600"
  },
  recentEventBadgeFrame: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  recentEventBadgeValueText: {
    fontSize: 8,
    fontWeight: "800"
  },
  modalBackdropOverlayContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16
  },
  modalBoxCenteredContentSurface: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    width: "100%",
    maxHeight: SCREEN_HEIGHT * 0.8,
    padding: 16,
    overflow: "hidden"
  },
  modalHeaderTopBarInlineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 16
  },
  modalMainTitleHeading: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.text
  },
  modalFormScrollContentBody: {
    gap: 14,
    paddingBottom: 16
  },
  flexElementFrame: {
    flex: 1,
    gap: 6
  },
  modalFooterButtonBarActionsFrame: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    marginTop: 10
  },
  formDismissActionModalButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: colors.inputBorder,
    alignItems: "center",
    justifyContent: "center"
  },
  dismissActionBtnLabelText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.text
  },
  formSubmitActionModalButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  submitActionBtnLabelText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#080b10"
  },
  dropdownModalBackdropOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center"
  },
  dropdownModalSelectionSurfaceBox: {
    width: SCREEN_WIDTH * 0.88,
    maxWidth: 340,
    maxHeight: SCREEN_HEIGHT * 0.45,
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 16
  },
  dropdownSelectionModalHeadlineTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: 0.5
  },
  dropdownSelectionItemNodeRow: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: 6
  },
  dropdownSelectionItemNodeRowActive: {
    backgroundColor: "rgba(217,119,6,0.1)",
    borderLeftWidth: 3,
    borderLeftColor: colors.primary
  },
  dropdownSelectionItemDisplayLabelText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "500"
  }
});