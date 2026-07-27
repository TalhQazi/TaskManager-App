import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, AlertTriangle, CheckCircle2, Eye, EyeOff, X, AlertCircle } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { getAnnouncementWebSocket } from "@/lib/announcementWebSocket";
import { employeeApiFetch } from "@/lib/Employee/api";
import { s, wp, hp, fs } from "@/util/styles";

interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
  authorName: string;
  createdAt: string;
  expiresAt?: string;
  emergency: boolean;
  requiresAcknowledgement: boolean;
  isRead: boolean;
  isAcknowledged: boolean;
}

interface EmployeeAnnouncementsProps {
  fetchJson?: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
  cacheScope?: string;
}

export default function EmployeeAnnouncements({
  fetchJson = employeeApiFetch,
  cacheScope = "employee",
}: EmployeeAnnouncementsProps) {
  const { uiTheme } = useTheme();
  const queryClient = useQueryClient();

  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showAcknowledgementModal, setShowAcknowledgementModal] = useState(false);
  const [tab, setTab] = useState("unread");
  const [acknowledgedCheckbox, setAcknowledgedCheckbox] = useState(false);

  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);
  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const textColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");
  }, [uiTheme, isLightTheme]);

  useEffect(() => {
    const ws = getAnnouncementWebSocket();
    ws.connect({
      onNewAnnouncement: () => {
        queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcements`] });
        queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcement-unread`] });
        queryClient.invalidateQueries({ queryKey: ["employee-announcement-unread"] });
        Alert.alert("New Announcement", "A new announcement has been published");
      },
      onAnnouncementPublished: () => {
        queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcements`] });
        queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcement-unread`] });
        queryClient.invalidateQueries({ queryKey: ["employee-announcement-unread"] });
      },
      onAnnouncementUpdated: () => {
        queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcements`] });
        queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcement-unread`] });
        queryClient.invalidateQueries({ queryKey: ["employee-announcement-unread"] });
      },
    });
    return () => {};
  }, [queryClient, cacheScope]);

  const { data: announcementsData, isLoading } = useQuery({
    queryKey: [`${cacheScope}-announcements`, tab],
    queryFn: async () => {
      return fetchJson<any>(`/api/announcements?filter=${encodeURIComponent(tab)}`);
    },
  });

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchJson<any>(`/api/announcements/${id}/read`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcements`] });
      queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcement-unread`] });
      queryClient.invalidateQueries({ queryKey: ["employee-announcement-unread"] });
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (id: string) => {
      return fetchJson<any>(`/api/announcements/${id}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ acknowledged: true }),
      });
    },
    onSuccess: () => {
      Alert.alert("Success", "Announcement acknowledged");
      queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcements`] });
      queryClient.invalidateQueries({ queryKey: [`${cacheScope}-announcement-unread`] });
      queryClient.invalidateQueries({ queryKey: ["employee-announcement-unread"] });
      setAcknowledgedCheckbox(false);
      setShowAcknowledgementModal(false);
      setSelectedAnnouncement(null);
    },
    onError: () => {
      Alert.alert("Error", "Failed to acknowledge announcement");
    },
  });

  const announcements: Announcement[] = announcementsData?.items || [];

  const priorityColors = {
    low: { bg: "rgba(59, 130, 246, 0.1)", text: "#60a5fa", border: "rgba(59, 130, 246, 0.2)" },
    medium: { bg: "rgba(234, 179, 8, 0.1)", text: "#fde047", border: "rgba(234, 179, 8, 0.2)" },
    high: { bg: "rgba(249, 115, 22, 0.1)", text: "#fb923c", border: "rgba(249, 115, 22, 0.2)" },
    critical: { bg: "rgba(239, 68, 68, 0.1)", text: "#f87171", border: "rgba(239, 68, 68, 0.2)" },
  };

  const activeModalColor = selectedAnnouncement 
    ? (selectedAnnouncement.emergency || selectedAnnouncement.priority === "critical" ? "#ef4444" : "#ffffff")
    : "#ffffff";

  return (
    <SafeAreaView style={s(styles.container)}>
      <StatusBar 
        barStyle={isLightTheme ? "dark-content" : "light-content"} 
        backgroundColor={uiTheme.panelColors?.dashboardBackground || "#09090b"} 
      />
      
      <View style={s(styles.header)}>
        <View style={s(styles.iconContainer)}>
          <Bell size={fs(5.5)} color="#00C6FF" />
        </View>
        <View>
          <Text style={s(styles.title)}>Announcements</Text>
          <Text style={s(styles.subtitle)}>Stay updated with company announcements</Text>
        </View>
      </View>

      <View style={s(styles.tabsContainer)}>
        {["unread", "all", "important", "emergency"].map((t) => (
          <TouchableOpacity
            key={t}
            style={s([styles.tabButton, tab === t && styles.tabButtonActive])}
            onPress={() => setTab(t)}
          >
            <Text style={s([styles.tabButtonText, tab === t && styles.tabButtonTextActive])}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={s(styles.centerContainer)}>
          <ActivityIndicator size="large" color="#00C6FF" />
        </View>
      ) : announcements.length === 0 ? (
        <View style={s(styles.emptyContainer)}>
          <Bell size={fs(12)} color={textColor} style={s({ opacity: 0.4, marginBottom: hp(2) })} />
          <Text style={s(styles.emptyTitle)}>No announcements</Text>
          <Text style={s(styles.emptySubtitle)}>You're all caught up!</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s(styles.scrollContent)} showsVerticalScrollIndicator={false}>
          {announcements.map((announcement) => {
            const colors = priorityColors[announcement.priority] || priorityColors.low;
            return (
              <View
                key={announcement.id}
                style={s([
                  styles.card,
                  announcement.emergency
                    ? styles.emergencyCard
                    : !announcement.isRead
                    ? styles.unreadCard
                    : styles.normalCard
                ])}
              >
                {announcement.emergency && (
                  <View style={s(styles.emergencyBadgeRow)}>
                    <View style={s(styles.emergencyBadge)}>
                      <AlertTriangle size={fs(3)} color="#f87171" style={s({ marginRight: wp(1) })} />
                      <Text style={s(styles.emergencyBadgeText)}>EMERGENCY</Text>
                    </View>
                  </View>
                )}

                {!announcement.isRead && !announcement.emergency && (
                  <View style={s(styles.unreadIndicator)} />
                )}

                <View style={s(announcement.emergency ? { marginTop: hp(1) } : null)}>
                  <Text style={s(styles.cardTitle)}>{announcement.title}</Text>

                  <View style={s(styles.badgeRow)}>
                    <View style={s([styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }])}>
                      <Text style={s([styles.badgeText, { color: colors.text }])}>
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                      </Text>
                    </View>

                    {announcement.requiresAcknowledgement && !announcement.isAcknowledged && (
                      <View style={s([styles.badge, styles.reqAckBadge])}>
                        <Text style={s(styles.reqAckBadgeText)}>Requires Acknowledgement</Text>
                      </View>
                    )}

                    {announcement.isAcknowledged && (
                      <View style={s([styles.badge, styles.ackBadge])}>
                        <CheckCircle2 size={fs(3)} color="#4ade80" style={s({ marginRight: wp(1) })} />
                        <Text style={s(styles.ackBadgeText)}>Acknowledged</Text>
                      </View>
                    )}
                  </View>

                  <Text style={s(styles.metadataText)}>
                    From {announcement.authorName} • {new Date(announcement.createdAt).toLocaleDateString()}
                    {announcement.expiresAt && ` • Expires ${new Date(announcement.expiresAt).toLocaleDateString()}`}
                  </Text>

                  <Text style={s(styles.bodyPreview)} numberOfLines={2}>
                    {announcement.body}
                  </Text>

                  <View style={s(styles.actionRow)}>
                    <TouchableOpacity
                      style={s([styles.btn, styles.btnOutline])}
                      disabled={readMutation.isPending}
                      onPress={() => {
                        setSelectedAnnouncement(announcement);
                        if (!announcement.isRead) {
                          readMutation.mutate(announcement.id);
                        }
                        if (announcement.requiresAcknowledgement && !announcement.isAcknowledged) {
                          setShowAcknowledgementModal(true);
                        }
                      }}
                    >
                      {announcement.isRead ? (
                        <>
                          <Eye size={fs(4)} color={textColor} style={s({ marginRight: wp(1.5) })} />
                          <Text style={s([styles.btnText, { color: textColor }])}>Read</Text>
                        </>
                      ) : (
                        <>
                          <EyeOff size={fs(4)} color={textColor} style={s({ marginRight: wp(1.5) })} />
                          <Text style={s([styles.btnText, { color: textColor }])}>Mark as Read</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {announcement.requiresAcknowledgement && !announcement.isAcknowledged && (
                      <TouchableOpacity
                        style={s([styles.btn, styles.btnAcknowledge])}
                        onPress={() => {
                          setSelectedAnnouncement(announcement);
                          setShowAcknowledgementModal(true);
                        }}
                      >
                        <CheckCircle2 size={fs(4)} color="#ffffff" style={s({ marginRight: wp(1.5) })} />
                        <Text style={s([styles.btnText, { color: "#ffffff" }])}>Acknowledge</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={showAcknowledgementModal && !!selectedAnnouncement}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (selectedAnnouncement && !(selectedAnnouncement.emergency || selectedAnnouncement.priority === "critical")) {
            setShowAcknowledgementModal(false);
          }
        }}
      >
        <View style={s(styles.modalOverlay)}>
          <View style={s([styles.modalContent, { borderColor: activeModalColor + "33" }])}>
            
            {(selectedAnnouncement?.emergency || selectedAnnouncement?.priority === "critical") ? (
              <View style={s(styles.modalEmergencyHeader)}>
                <AlertTriangle size={fs(5)} color="#ffffff" style={s({ marginRight: wp(2) })} />
                <View>
                  <Text style={s(styles.modalEmergencyTitle)}>EMERGENCY ANNOUNCEMENT</Text>
                  <Text style={s(styles.modalEmergencySubtitle)}>Requires immediate acknowledgement</Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity 
                style={s(styles.modalCloseButton)} 
                onPress={() => {
                  setAcknowledgedCheckbox(false);
                  setShowAcknowledgementModal(false);
                }}
              >
                <X size={fs(5)} color={textColor} style={s({ opacity: 0.6 })} />
              </TouchableOpacity>
            )}

            <ScrollView contentContainerStyle={s(styles.modalBody)}>
              {!(selectedAnnouncement?.emergency || selectedAnnouncement?.priority === "critical") && (
                <View style={s({ marginBottom: hp(1.5) })}>
                  <Text style={s(styles.modalMainTitle)}>{selectedAnnouncement?.title}</Text>
                  <Text style={s(styles.modalMeta)}>
                    From {selectedAnnouncement?.authorName} • {selectedAnnouncement && new Date(selectedAnnouncement.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}

              {(selectedAnnouncement?.emergency || selectedAnnouncement?.priority === "critical") && (
                <View style={s({ marginBottom: hp(1.5) })}>
                  <Text style={s(styles.modalMainTitle)}>{selectedAnnouncement?.title}</Text>
                  <Text style={s(styles.modalMeta)}>
                    From {selectedAnnouncement?.authorName} • {selectedAnnouncement && new Date(selectedAnnouncement.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              )}

              <View style={s([styles.modalMessageBox, { borderColor: (selectedAnnouncement?.emergency || selectedAnnouncement?.priority === "critical") ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)" }])}>
                <Text style={s(styles.modalMessageText)}>{selectedAnnouncement?.body}</Text>
              </View>

              <View style={s(styles.checkboxContainer)}>
                <TouchableOpacity 
                  style={s([styles.checkboxSquare, acknowledgedCheckbox && styles.checkboxSquareChecked])}
                  onPress={() => setAcknowledgedCheckbox(!acknowledgedCheckbox)}
                >
                  {acknowledgedCheckbox && <CheckCircle2 size={fs(3.5)} color="#ffffff" />}
                </TouchableOpacity>
                <Text style={s(styles.checkboxLabel)} onPress={() => setAcknowledgedCheckbox(!acknowledgedCheckbox)}>
                  I have read and understand this announcement and acknowledge receipt.
                </Text>
              </View>

              <View style={s(styles.infoBox)}>
                <AlertCircle size={fs(4.5)} color="#60a5fa" style={s({ marginRight: wp(2), marginTop: 2 })} />
                <Text style={s(styles.infoBoxText)}>
                  {(selectedAnnouncement?.emergency || selectedAnnouncement?.priority === "critical")
                    ? "This is an emergency announcement. Your acknowledgement will be recorded."
                    : "This announcement requires your acknowledgement. Please confirm that you have read this message."}
                </Text>
              </View>
            </ScrollView>

            <View style={s(styles.modalFooter)}>
              <View style={s(styles.footerLogNote)}>
                <CheckCircle2 size={fs(3.5)} color={textColor} style={s({ opacity: 0.6, marginRight: wp(1.5) })} />
                <Text style={s(styles.footerLogNoteText)}>Acknowledgement will be recorded</Text>
              </View>
              
              <View style={s(styles.footerActions)}>
                {!(selectedAnnouncement?.emergency || selectedAnnouncement?.priority === "critical") && (
                  <TouchableOpacity
                    style={s([styles.footerBtn, styles.footerBtnCancel])}
                    onPress={() => {
                      setAcknowledgedCheckbox(false);
                      setShowAcknowledgementModal(false);
                    }}
                  >
                    <Text style={s([styles.footerBtnText, { color: textColor }])}>Cancel</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={s([styles.footerBtn, styles.footerBtnConfirm, !acknowledgedCheckbox && styles.footerBtnDisabled])}
                  disabled={!acknowledgedCheckbox || acknowledgeMutation.isPending}
                  onPress={() => {
                    if (selectedAnnouncement) {
                      acknowledgeMutation.mutate(selectedAnnouncement.id);
                    }
                  }}
                >
                  {acknowledgeMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <CheckCircle2 size={fs(3.5)} color="#ffffff" style={s({ marginRight: wp(1.5) })} />
                      <Text style={s([styles.footerBtnText, { color: "#ffffff" }])}>I Acknowledge</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";
  
  const bg = uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b");
  const cardBg = uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#141417");
  const textColor = uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#f4f4f5");

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(4),
      paddingVertical: hp(2),
      borderBottomWidth: 1,
      borderColor: structuralBorderColor,
    },
    iconContainer: {
      padding: wp(2.5),
      borderRadius: wp(10),
      backgroundColor: isLightTheme ? "rgba(0,0,0,0.04)" : "rgba(255, 255, 255, 0.06)",
      marginRight: wp(3),
    },
    title: {
      fontSize: fs(5.5),
      fontWeight: "800",
      color: textColor,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: fs(3.2),
      color: textColor,
      opacity: 0.6,
      marginTop: 2,
    },
    tabsContainer: {
      flexDirection: "row",
      paddingHorizontal: wp(4),
      marginTop: hp(1.8),
      gap: wp(1.5),
    },
    tabButton: {
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1),
      borderRadius: wp(2),
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    tabButtonActive: {
      backgroundColor: uiTheme.customColors?.primary || "#00C6FF",
      borderColor: uiTheme.customColors?.primary || "#00C6FF",
    },
    tabButtonText: {
      fontSize: fs(3.2),
      fontWeight: "500",
      color: textColor,
      opacity: 0.8,
    },
    tabButtonTextActive: {
      color: isLightTheme ? "#ffffff" : "#09090b",
      fontWeight: "700",
      opacity: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: wp(8),
    },
    emptyTitle: {
      fontSize: fs(4.5),
      fontWeight: "700",
      color: textColor,
      opacity: 0.7,
    },
    emptySubtitle: {
      fontSize: fs(3.5),
      color: textColor,
      opacity: 0.4,
      marginTop: 4,
    },
    scrollContent: {
      padding: wp(4),
      paddingBottom: hp(5),
      gap: hp(1.5),
    },
    card: {
      borderRadius: wp(3),
      borderWidth: 1,
      padding: wp(4),
      position: "relative",
    },
    normalCard: {
      backgroundColor: cardBg,
      borderColor: structuralBorderColor,
    },
    unreadCard: {
      backgroundColor: isLightTheme ? "rgba(0, 198, 255, 0.04)" : "rgba(0, 198, 255, 0.02)",
      borderColor: "rgba(0, 198, 255, 0.25)",
    },
    emergencyCard: {
      backgroundColor: isLightTheme ? "rgba(239, 68, 68, 0.05)" : "rgba(239, 68, 68, 0.02)",
      borderColor: "rgba(239, 68, 68, 0.4)",
    },
    unreadIndicator: {
      position: "absolute",
      top: hp(2),
      right: wp(4),
      width: wp(2),
      height: wp(2),
      borderRadius: wp(1),
      backgroundColor: "#00C6FF",
    },
    emergencyBadgeRow: {
      flexDirection: "row",
      marginBottom: hp(1),
    },
    emergencyBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      borderRadius: wp(10),
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(239, 68, 68, 0.25)",
    },
    emergencyBadgeText: {
      fontSize: fs(2.5),
      fontWeight: "700",
      color: "#f87171",
      letterSpacing: 0.5,
    },
    cardTitle: {
      fontSize: fs(4.5),
      fontWeight: "700",
      color: textColor,
      marginBottom: hp(1),
    },
    badgeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: wp(1.5),
      marginBottom: hp(1.2),
    },
    badge: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1.5),
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    badgeText: {
      fontSize: fs(2.8),
      fontWeight: "600",
    },
    reqAckBadge: {
      backgroundColor: "rgba(249, 115, 22, 0.1)",
      borderColor: "rgba(249, 115, 22, 0.2)",
    },
    reqAckBadgeText: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: "#fb923c",
    },
    ackBadge: {
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      borderColor: "rgba(34, 197, 94, 0.2)",
    },
    ackBadgeText: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: "#4ade80",
    },
    metadataText: {
      fontSize: fs(3),
      color: textColor,
      opacity: 0.5,
      marginBottom: hp(1),
    },
    bodyPreview: {
      fontSize: fs(3.5),
      color: textColor,
      opacity: 0.85,
      lineHeight: fs(5),
      marginBottom: hp(1.8),
    },
    actionRow: {
      flexDirection: "row",
      gap: wp(2),
    },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(1),
      paddingHorizontal: wp(3),
      borderRadius: wp(2),
      borderWidth: 1,
    },
    btnOutline: {
      backgroundColor: "transparent",
      borderColor: structuralBorderColor,
    },
    btnAcknowledge: {
      flex: 1,
      backgroundColor: "#16a34a",
      borderColor: "#16a34a",
    },
    btnText: {
      fontSize: fs(3.2),
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      justifyContent: "center",
      alignItems: "center",
      padding: wp(4),
    },
    modalContent: {
      width: "100%",
      maxWidth: 600,
      backgroundColor: cardBg,
      borderRadius: wp(3),
      borderWidth: 2,
      overflow: "hidden",
    },
    modalCloseButton: {
      position: "absolute",
      top: hp(1.8),
      right: wp(3.5),
      padding: wp(1.5),
      borderRadius: wp(1.5),
      backgroundColor: surfaceAlphaColor,
      zIndex: 10,
    },
    modalEmergencyHeader: {
      backgroundColor: "#dc2626",
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.8),
      flexDirection: "row",
      alignItems: "center",
    },
    modalEmergencyTitle: {
      fontSize: fs(3.8),
      fontWeight: "800",
      color: "#ffffff",
      letterSpacing: 0.5,
    },
    modalEmergencySubtitle: {
      fontSize: fs(3),
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: 1,
    },
    modalBody: {
      padding: wp(5),
      gap: hp(2),
    },
    modalMainTitle: {
      fontSize: fs(5),
      fontWeight: "800",
      color: textColor,
      marginBottom: 4,
    },
    modalMeta: {
      fontSize: fs(3.2),
      color: textColor,
      opacity: 0.5,
    },
    modalMessageBox: {
      padding: wp(4),
      borderRadius: wp(2),
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
    },
    modalMessageText: {
      fontSize: fs(3.5),
      color: textColor,
      opacity: 0.9,
      lineHeight: fs(5.5),
    },
    checkboxContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: wp(2.5),
      paddingTop: hp(1),
    },
    checkboxSquare: {
      width: wp(4.5),
      height: wp(4.5),
      borderRadius: wp(1),
      borderWidth: 2,
      borderColor: structuralBorderColor,
      marginTop: 2,
      justifyContent: "center",
      alignItems: "center",
    },
    checkboxSquareChecked: {
      backgroundColor: "#16a34a",
      borderColor: "#16a34a",
    },
    checkboxLabel: {
      flex: 1,
      fontSize: fs(3.5),
      color: textColor,
      opacity: 0.8,
      lineHeight: fs(5),
    },
    infoBox: {
      flexDirection: "row",
      padding: wp(3),
      borderRadius: wp(2),
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(59, 130, 246, 0.2)",
    },
    infoBoxText: {
      flex: 1,
      fontSize: fs(3.2),
      color: "#93c5fd",
      lineHeight: fs(4.5),
    },
    modalFooter: {
      backgroundColor: surfaceAlphaColor,
      borderTopWidth: 1,
      borderColor: structuralBorderColor,
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.8),
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: wp(3),
    },
    footerLogNote: {
      flexDirection: "row",
      alignItems: "center",
    },
    footerLogNoteText: {
      fontSize: fs(3),
      color: textColor,
      opacity: 0.5,
    },
    footerActions: {
      flexDirection: "row",
      gap: wp(2),
    },
    footerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: hp(1),
      paddingHorizontal: wp(3.5),
      borderRadius: wp(1.5),
      borderWidth: 1,
    },
    footerBtnCancel: {
      backgroundColor: "transparent",
      borderColor: structuralBorderColor,
    },
    footerBtnConfirm: {
      backgroundColor: "#16a34a",
      borderColor: "#16a34a",
    },
    footerBtnDisabled: {
      opacity: 0.4,
    },
    footerBtnText: {
      fontSize: fs(3.2),
      fontWeight: "700",
    },
  });
};