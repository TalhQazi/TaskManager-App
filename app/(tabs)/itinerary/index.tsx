import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Linking,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { useSocket } from "@/contexts/SocketContext";
import { getMyItinerary, completeItineraryStop } from "@/lib/admin/apiClient";
import { s, wp, hp, fs } from "@/util/styles";

type ItineraryStop = {
  _id: string;
  title: string;
  address?: string;
  sequenceOrder: number;
  estimatedDurationMinutes: number;
  travelTimeToNext: number;
  latitude: number;
  longitude: number;
  completed: boolean;
  completedAt?: string | null;
};

type Itinerary = {
  _id?: string;
  id?: string;
  startTime?: string;
  stops: ItineraryStop[];
};

export default function EmployeeItinerary() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { uiTheme } = useTheme();

  const styles = useMemo(() => getThemedStyles(uiTheme), [uiTheme]);

  const isLightTheme = useMemo(() => {
    return uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  }, [uiTheme]);

  const primaryColor = useMemo(() => {
    return uiTheme.customColors?.primary || "#6366f1";
  }, [uiTheme]);

  const tintColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  }, [uiTheme, isLightTheme]);

  const textColor = useMemo(() => {
    return uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#ffffff" : "#09090b");
  }, [uiTheme, isLightTheme]);

  const [dateStr] = useState(() => {
    return new Date().toLocaleDateString("en-CA");
  });

  const [loadingStopId, setLoadingStopId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["employee-itinerary", dateStr],
    queryFn: async () => {
      const res = await getMyItinerary(dateStr);
      return res.item as Itinerary;
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!socket) return;

    const handleItineraryUpdate = (payload: {
      itineraryId: string;
      userId: string;
      date: string;
      stopId: string;
      completed: boolean;
    }) => {
      if (data && (data._id === payload.itineraryId || data.id === payload.itineraryId)) {
        queryClient.invalidateQueries({ queryKey: ["employee-itinerary", dateStr] });
      }
    };

    socket.on("itinerary-update", handleItineraryUpdate);
    return () => {
      socket.off("itinerary-update", handleItineraryUpdate);
    };
  }, [socket, data, queryClient, dateStr]);

  const handleToggleComplete = async (stopId: string, currentCompletedStatus: boolean) => {
    if (!data) return;
    const targetId = data._id || data.id;
    if (!targetId) return;

    try {
      setLoadingStopId(stopId);
      await completeItineraryStop(targetId, stopId, !currentCompletedStatus);
      
      queryClient.setQueryData(["employee-itinerary", dateStr], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          stops: oldData.stops.map((s: ItineraryStop) =>
            s._id === stopId
              ? {
                  ...s,
                  completed: !currentCompletedStatus,
                  completedAt: !currentCompletedStatus ? new Date().toISOString() : null,
                }
              : s
          ),
        };
      });
    } catch (err) {
      Alert.alert("Error", "Failed to update stop status information.");
    } finally {
      setLoadingStopId(null);
    }
  };

  const stops = data?.stops || [];
  const sortedStops = useMemo(() => {
    return [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [stops]);

  const activeStop = useMemo(() => {
    return sortedStops.find((s) => !s.completed);
  }, [sortedStops]);

  const completedCount = useMemo(() => {
    return stops.filter((s) => s.completed).length;
  }, [stops]);

  const totalCount = stops.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const timelineTimes = useMemo(() => {
    let currentHour = 8;
    let currentMinute = 0;

    if (data?.startTime) {
      const parts = data.startTime.split(":");
      if (parts.length >= 2) {
        currentHour = parseInt(parts[0], 10);
        currentMinute = parseInt(parts[1], 10);
      }
    }

    const timeline: Array<{ stopId: string; eta: string; end: string }> = [];

    sortedStops.forEach((stop) => {
      const etaStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
      currentMinute += stop.estimatedDurationMinutes || 30;
      
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }

      const endStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
      timeline.push({ stopId: stop._id, eta: etaStr, end: endStr });

      currentMinute += stop.travelTimeToNext || 0;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    });

    return timeline;
  }, [data?.startTime, sortedStops]);

  const handleLaunchNavigation = async (type: "google" | "apple" | "waze", stop: ItineraryStop) => {
    let url = "";
    if (type === "google") {
      url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`;
    } else if (type === "apple") {
      url = `http://maps.apple.com/?daddr=${stop.latitude},${stop.longitude}`;
    } else {
      url = `https://waze.com/ul?ll=${stop.latitude},${stop.longitude}&navigate=yes`;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Error", "Selected map execution engine provider is unavailable on this system.");
      }
    } catch {
      Alert.alert("Navigation Error", "Failed to transfer coordinates data to target app platform.");
    }
  };

  if (isLoading) {
    return (
      <View style={s(styles.loadingViewportContainer)}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={s(styles.loadingViewportText)}>Retrieving your route plan...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s(styles.errorViewportContainer)}>
        <Ionicons name="alert-circle" size={fs(12)} color="#ef4444" style={s({ marginBottom: hp(1.5) })} />
        <Text style={s(styles.errorViewportTitle)}>Failed to load route</Text>
        <Text style={s(styles.errorViewportDescription)}>
          There was a problem retrieving today's itinerary. Please try again.
        </Text>
        <TouchableOpacity style={s([styles.errorRetryBtn, { backgroundColor: primaryColor }])} onPress={() => void refetch()}>
          <Ionicons name="refresh" size={fs(4)} color={textColor} style={s({ marginRight: wp(1.5) })} />
          <Text style={s([styles.errorRetryBtnText, { color: textColor }])}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={s(styles.safeArea)}>
      <StatusBar
        barStyle={isLightTheme ? "dark-content" : "light-content"}
        backgroundColor={uiTheme.panelColors?.dashboardBackground || "#09090b"}
      />
      <ScrollView contentContainerStyle={s(styles.scrollContainer)} showsVerticalScrollIndicator={false}>
        
        <View style={s(styles.headerLayoutEnginePanel)}>
          <View style={s(styles.headerLayoutEngineRow)}>
            <View style={s(styles.badgeIndicatorContainer)}>
              <Text style={s([styles.badgeIndicatorText, { color: primaryColor }])}>Route Engine v1.0</Text>
            </View>
            <Text style={s(styles.headerMetaDateText)}>Date: {dateStr}</Text>
          </View>
          
          <Text style={s(styles.headerTitlePrimaryText)}>My Daily Itinerary</Text>
          <Text style={s(styles.headerSubtitleMutedText)}>
            {totalCount > 0
              ? `You have ${totalCount} stops scheduled for today. Start time is ${data?.startTime || "08:00"}.`
              : "No itinerary scheduled for today."}
          </Text>

          {totalCount > 0 && (
            <View style={s(styles.metricsProgressIndicatorCard)}>
              <View style={s(styles.metricsProgressLabelRow)}>
                <Text style={s(styles.metricsProgressTitleLabel)}>Route Progress</Text>
                <Text style={s([styles.metricsProgressPercentageLabel, { color: primaryColor }])}>{progressPercent}%</Text>
              </View>
              <View style={s(styles.metricsProgressBarBackground)}>
                <View style={s([styles.metricsProgressBarFill, { width: `${progressPercent}%`, backgroundColor: primaryColor }])} />
              </View>
              <View style={s(styles.metricsProgressFooterMetaRow)}>
                <Ionicons name="checkmark-circle" size={fs(3.5)} color="#10b981" style={s({ marginRight: wp(1) })} />
                <Text style={s(styles.metricsProgressFooterMetaText)}>{completedCount} of {totalCount} stops checked in</Text>
              </View>
            </View>
          )}
        </View>

        {totalCount === 0 ? (
          <View style={s(styles.emptyRecordsPlaceholderCard)}>
            <View style={s(styles.emptyRecordsIconWrapperCircle)}>
              <Ionicons name="map-outline" size={fs(8)} color={primaryColor} />
            </View>
            <Text style={s(styles.emptyRecordsTitleText)}>No Route Scheduled</Text>
            <Text style={s(styles.emptyRecordsDescriptionText)}>
              Your manager hasn't published an itinerary for you today. If this is an error, please contact dispatch.
            </Text>
          </View>
        ) : (
          <View style={s(styles.routeSplitContentBlockContainer)}>
            
            {activeStop ? (
              <View style={s(styles.activeRouteCardFrame)}>
                <View style={s(styles.activeRouteTopLabelAbsoluteBadge)}>
                  <Text style={s(styles.activeRouteTopLabelAbsoluteBadgeText)}>UP NEXT</Text>
                </View>

                <View style={s(styles.activeRouteHeaderRow)}>
                  <View style={s(styles.activeRouteIconSquare)}>
                    <Ionicons name="location" size={fs(6)} color={primaryColor} />
                  </View>
                  <View style={s(styles.activeRouteTitleStack)}>
                    <Text style={s(styles.activeRouteTitleText)} numberOfLines={1}>{activeStop.title}</Text>
                    <View style={s(styles.activeRouteMetaInlineRow)}>
                      <Text style={s(styles.activeRouteMetaText)}>Stop #{activeStop.sequenceOrder + 1}</Text>
                      <Text style={s(styles.activeRouteMetaTextSeparator)}>•</Text>
                      <Ionicons name="time-outline" size={fs(3)} color={primaryColor} style={s({ marginRight: wp(1) })} />
                      <Text style={s(styles.activeRouteMetaText)}>{activeStop.estimatedDurationMinutes} mins duration</Text>
                    </View>
                  </View>
                </View>

                <View style={s(styles.activeRouteAddressCard)}>
                  <Text style={s(styles.activeRouteAddressLabelHeading)}>Stop Address</Text>
                  <Text style={s(styles.activeRouteAddressValueText)}>{activeStop.address || "No address provided"}</Text>
                </View>

                <View style={s(styles.navigationControlsSectionStack)}>
                  <View style={s(styles.navigationControlsSectionTitleRow)}>
                    <Ionicons name="navigate" size={fs(3)} color={tintColor} style={s({ marginRight: wp(1) })} />
                    <Text style={s(styles.navigationControlsSectionTitleText)}>Launch GPS Navigation</Text>
                  </View>
                  <View style={s(styles.navigationControlsGridRow)}>
                    <TouchableOpacity style={s(styles.navigationTriggerBtnCell)} onPress={() => void handleLaunchNavigation("google", activeStop)}>
                      <Text style={s(styles.navigationTriggerBtnLabel)}>Google Maps</Text>
                      <Ionicons name="open-outline" size={fs(3)} color={primaryColor} style={s({ marginTop: hp(0.2) })} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s(styles.navigationTriggerBtnCell)} onPress={() => void handleLaunchNavigation("apple", activeStop)}>
                      <Text style={s(styles.navigationTriggerBtnLabel)}>Apple Maps</Text>
                      <Ionicons name="open-outline" size={fs(3)} color={primaryColor} style={s({ marginTop: hp(0.2) })} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s(styles.navigationTriggerBtnCell)} onPress={() => void handleLaunchNavigation("waze", activeStop)}>
                      <Text style={s(styles.navigationTriggerBtnLabel)}>Waze GPS</Text>
                      <Ionicons name="open-outline" size={fs(3)} color={primaryColor} style={s({ marginTop: hp(0.2) })} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s(styles.activeRouteFooterActionDivider)}>
                  <TouchableOpacity
                    style={s(styles.activeRouteCompletePrimaryBtn)}
                    onPress={() => void handleToggleComplete(activeStop._id, false)}
                    disabled={loadingStopId === activeStop._id}
                  >
                    {loadingStopId === activeStop._id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="checkmark-circle" size={fs(4.5)} color="#ffffff" style={s({ marginRight: wp(1.5) })} />
                    )}
                    <Text style={s(styles.activeRouteCompletePrimaryBtnText)}>Complete & Check-In Stop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={s(styles.routeCompletedStateBannerCard)}>
                <View style={s(styles.routeCompletedStateIconBadgeCircle)}>
                  <Ionicons name="checkmark" size={fs(6.5)} color="#10b981" />
                </View>
                <Text style={s(styles.routeCompletedStateTitleText)}>All Done!</Text>
                <Text style={s(styles.routeCompletedStateDescriptionText)}>
                  You have successfully checked in and completed all stops scheduled for today. Great work!
                </Text>
              </View>
            )}

            <View style={s(styles.scheduleInstructionMutedCard)}>
              <Ionicons name="time-outline" size={fs(4)} color={tintColor} style={s({ marginRight: wp(2), marginTop: 1 })} />
              <View style={s({ flex: 1 })}>
                <Text style={s(styles.scheduleInstructionHeadingText)}>Dynamic Schedule Notes</Text>
                <Text style={s(styles.scheduleInstructionBodyText)}>
                  The schedule times and stop orders are auto-calculated for the shortest duration. Toggling a stop complete updates your dashboard and logs the check-in immediately.
                </Text>
              </View>
            </View>

            <View style={s(styles.timelineEngineWrapperSection)}>
              <Text style={s(styles.timelineEngineHeadingSectionText)}>Route Progress Timeline</Text>
              
              <View style={s(styles.timelineEngineCardSurface)}>
                <View style={s(styles.timelineEngineVerticalThreadPathLine)} />

                <View style={s(styles.timelineEngineNodesContainerStack)}>
                  {sortedStops.map((stop, index) => {
                    const isCompleted = stop.completed;
                    const isActive = activeStop && activeStop._id === stop._id;
                    const timeItem = timelineTimes.find((t) => t.stopId === stop._id);

                    return (
                      <View key={stop._id} style={s([styles.timelineNodeRowItem, isActive && styles.timelineNodeRowItemActive])}>
                        
                        <View style={s(styles.timelineNodeLeftIndicatorColumn)}>
                          {isCompleted ? (
                            <View style={s(styles.timelineNodeStateIconIndicatorCircleCompleted)}>
                              <Ionicons name="checkmark" size={fs(3)} color="#000000" />
                            </View>
                          ) : isActive ? (
                            <View style={s([styles.timelineNodeStateIconIndicatorCircleActive, { backgroundColor: primaryColor }])}>
                              <View style={s(styles.timelineNodeStateIconIndicatorCircleActiveInnerDot)} />
                            </View>
                          ) : (
                            <View style={s(styles.timelineNodeStateIconIndicatorCirclePending)} />
                          )}
                          <View style={s(styles.timelineNodeTimestampBadgeBox)}>
                            <Text style={s(styles.timelineNodeTimestampBadgeText)}>{timeItem?.eta || "08:00"}</Text>
                          </View>
                        </View>

                        <View style={s(styles.timelineNodeRightContentColumn)}>
                          <View style={s(styles.timelineNodeContentHeaderRow)}>
                            <Text style={s([styles.timelineNodeContentTitleText, isCompleted && styles.timelineNodeContentTitleTextCompleted, isActive && { color: primaryColor }])} numberOfLines={1}>
                              {stop.title}
                            </Text>
                            <View style={s(styles.timelineNodeContentDurationLabel)}>
                              <Text style={s(styles.timelineNodeContentDurationLabelText)}>{stop.estimatedDurationMinutes}m</Text>
                            </View>
                          </View>

                          <Text style={s([styles.timelineNodeContentAddressText, isCompleted && styles.timelineNodeContentAddressTextCompleted])} numberOfLines={1}>
                            {stop.address}
                          </Text>

                          {!isCompleted && (
                            <View style={s(styles.timelineNodeInlineControlsRow)}>
                              <TouchableOpacity
                                style={s([styles.timelineNodeInlineCheckinBtn, isActive && styles.timelineNodeInlineCheckinBtnActive])}
                                disabled={loadingStopId === stop._id}
                                onPress={() => void handleToggleComplete(stop._id, isCompleted)}
                              >
                                {loadingStopId === stop._id ? (
                                  <ActivityIndicator size="small" color={isActive ? "#10b981" : tintColor} />
                                ) : (
                                  <Text style={s([styles.timelineNodeInlineCheckinBtnLabel, isActive && styles.timelineNodeInlineCheckinBtnLabelActive])}>Check In</Text>
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity style={s(styles.timelineNodeInlineNavigateBtn)} onPress={() => void handleLaunchNavigation("google", stop)}>
                                <Text style={s(styles.timelineNodeInlineNavigateBtnLabel)}>Navigate</Text>
                                <Ionicons name="open-outline" size={fs(2.5)} color={tintColor} style={s({ marginLeft: wp(0.5) })} />
                              </TouchableOpacity>
                            </View>
                          )}

                          {isCompleted && (
                            <View style={s(styles.timelineNodeInlineStatusCompletedRow)}>
                              <View style={s(styles.timelineNodeInlineStatusCompletedLabelBadge)}>
                                <Ionicons name="checkmark" size={fs(2.5)} color="#10b981" style={s({ marginRight: wp(0.5) })} />
                                <Text style={s(styles.timelineNodeInlineStatusCompletedLabelBadgeText)}>Done</Text>
                              </View>
                              <TouchableOpacity style={s(styles.timelineNodeInlineUndoActionBtn)} disabled={loadingStopId === stop._id} onPress={() => void handleToggleComplete(stop._id, isCompleted)}>
                                <Text style={s(styles.timelineNodeInlineUndoActionBtnLabel)}>(Undo)</Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {index < sortedStops.length - 1 && stop.travelTimeToNext > 0 && !isCompleted && (
                            <View style={s(styles.timelineNodeInlineDriveBufferCard)}>
                              <Ionicons name="car-outline" size={fs(3)} color={primaryColor} style={s({ marginRight: wp(1) })} />
                              <Text style={s(styles.timelineNodeInlineDriveBufferCardText)}>Drive ~{stop.travelTimeToNext} mins to next stop</Text>
                            </View>
                          )}
                        </View>

                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getThemedStyles = (uiTheme: any) => {
  const isLightTheme = uiTheme.theme?.includes("crystal") || uiTheme.panelColors?.dashboardTextColor === "#000000";
  const structuralBorderColor = isLightTheme ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
  const surfaceAlphaColor = isLightTheme ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.03)";

  const bg = uiTheme.panelColors?.dashboardBackground || (isLightTheme ? "#ffffff" : "#09090b");
  const cardBg = uiTheme.panelColors?.dashboardCardBackground || (isLightTheme ? "#f8fafc" : "#18181b");
  const tintColor = uiTheme.panelColors?.dashboardTextColor || (isLightTheme ? "#0f172a" : "#ffffff");
  const mutedText = isLightTheme ? "#64748b" : "#a1a1aa";

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: bg,
    },
    scrollContainer: {
      paddingBottom: hp(5),
    },
    loadingViewportContainer: {
      flex: 1,
      backgroundColor: bg,
      justifyContent: "center",
      alignItems: "center",
      padding: wp(5),
    },
    loadingViewportText: {
      fontSize: fs(3.5),
      color: mutedText,
      fontWeight: "500",
      marginTop: hp(1.5),
    },
    errorViewportContainer: {
      flex: 1,
      backgroundColor: bg,
      justifyContent: "center",
      alignItems: "center",
      padding: wp(8),
    },
    errorViewportTitle: {
      fontSize: fs(4.5),
      fontWeight: "800",
      color: tintColor,
      marginBottom: hp(0.8),
    },
    errorViewportDescription: {
      fontSize: fs(3.2),
      color: mutedText,
      textAlign: "center",
      lineHeight: fs(4.5),
      marginBottom: hp(2),
    },
    errorRetryBtn: {
      height: hp(4.8),
      paddingHorizontal: wp(4),
      borderRadius: wp(2),
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    errorRetryBtnText: {
      fontSize: fs(3.2),
      fontWeight: "700",
    },
    headerLayoutEnginePanel: {
      paddingHorizontal: wp(4),
      paddingTop: hp(1.8),
      paddingBottom: hp(2),
      position: "relative",
      borderBottomWidth: 1,
      borderBottomColor: structuralBorderColor,
    },
    headerLayoutEngineRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(1),
    },
    badgeIndicatorContainer: {
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1),
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    badgeIndicatorText: {
      fontSize: fs(2.5),
      fontWeight: "700",
    },
    headerMetaDateText: {
      fontSize: fs(2.8),
      fontFamily: "mono",
      color: mutedText,
    },
    headerTitlePrimaryText: {
      fontSize: fs(5.8),
      fontWeight: "800",
      color: tintColor,
      letterSpacing: -0.5,
    },
    headerSubtitleMutedText: {
      fontSize: fs(3.2),
      color: mutedText,
      marginTop: hp(0.5),
      lineHeight: fs(4.5),
    },
    metricsProgressIndicatorCard: {
      backgroundColor: cardBg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: wp(3),
      padding: wp(3),
      marginTop: hp(1.8),
    },
    metricsProgressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(0.8),
    },
    metricsProgressTitleLabel: {
      fontSize: fs(3),
      color: mutedText,
      fontWeight: "500",
    },
    metricsProgressPercentageLabel: {
      fontSize: fs(3.2),
      fontWeight: "700",
    },
    metricsProgressBarBackground: {
      width: "100%",
      height: hp(0.8),
      backgroundColor: bg,
      borderRadius: wp(1),
      overflow: "hidden",
    },
    metricsProgressBarFill: {
      height: "100%",
      borderRadius: wp(1),
    },
    metricsProgressFooterMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: hp(1),
    },
    metricsProgressFooterMetaText: {
      fontSize: fs(2.8),
      color: mutedText,
    },
    emptyRecordsPlaceholderCard: {
      backgroundColor: cardBg,
      borderRadius: wp(3.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(8),
      marginHorizontal: wp(4),
      marginTop: hp(2.5),
      alignItems: "center",
      justifyContent: "center",
      borderStyle: "dashed",
    },
    emptyRecordsIconWrapperCircle: {
      width: wp(14),
      height: wp(14),
      borderRadius: wp(7),
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: hp(1.5),
    },
    emptyRecordsTitleText: {
      fontSize: fs(4),
      fontWeight: "800",
      color: tintColor,
      marginBottom: hp(0.5),
    },
    emptyRecordsDescriptionText: {
      fontSize: fs(3.2),
      color: mutedText,
      textAlign: "center",
      lineHeight: fs(4.5),
      paddingHorizontal: wp(3),
    },
    routeSplitContentBlockContainer: {
      paddingHorizontal: wp(4),
      marginTop: hp(2),
    },
    activeRouteCardFrame: {
      backgroundColor: cardBg,
      borderRadius: wp(3.5),
      borderWidth: 1.5,
      borderColor: structuralBorderColor,
      padding: wp(4),
      position: "relative",
    },
    activeRouteTopLabelAbsoluteBadge: {
      position: "absolute",
      top: hp(1.5),
      right: wp(3.5),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.4),
      borderRadius: wp(1),
      backgroundColor: "#4f46e5",
    },
    activeRouteTopLabelAbsoluteBadgeText: {
      fontSize: fs(2.2),
      fontWeight: "800",
      color: "#ffffff",
    },
    activeRouteHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: hp(0.5),
      marginBottom: hp(1.8),
    },
    activeRouteIconSquare: {
      width: wp(10.5),
      height: wp(10.5),
      borderRadius: wp(2.5),
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
      marginRight: wp(3),
    },
    activeRouteTitleStack: {
      flex: 1,
      paddingRight: wp(16),
    },
    activeRouteTitleText: {
      fontSize: fs(4),
      fontWeight: "800",
      color: tintColor,
    },
    activeRouteMetaInlineRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: hp(0.3),
    },
    activeRouteMetaText: {
      fontSize: fs(2.8),
      color: mutedText,
      fontWeight: "500",
    },
    activeRouteMetaTextSeparator: {
      fontSize: fs(2.8),
      color: "rgba(255,255,255,0.15)",
      marginHorizontal: wp(1.5),
    },
    activeRouteAddressCard: {
      backgroundColor: bg,
      borderRadius: wp(2),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(2.5),
      marginBottom: hp(1.8),
    },
    activeRouteAddressLabelHeading: {
      fontSize: fs(2.5),
      fontWeight: "700",
      color: mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    activeRouteAddressValueText: {
      fontSize: fs(3.2),
      color: tintColor,
      fontWeight: "500",
      marginTop: hp(0.3),
    },
    navigationControlsSectionStack: {
      marginBottom: hp(2),
    },
    navigationControlsSectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: hp(1),
    },
    navigationControlsSectionTitleText: {
      fontSize: fs(2.8),
      fontWeight: "700",
      color: mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    navigationControlsGridRow: {
      flexDirection: "row",
      gap: wp(1.5),
    },
    navigationTriggerBtnCell: {
      flex: 1,
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: wp(2),
      paddingVertical: hp(1),
      alignItems: "center",
      justifyContent: "center",
    },
    navigationTriggerBtnLabel: {
      fontSize: fs(2.8),
      fontWeight: "700",
      color: tintColor,
    },
    activeRouteFooterActionDivider: {
      borderTopWidth: 1,
      borderTopColor: structuralBorderColor,
      paddingTop: hp(1.8),
    },
    activeRouteCompletePrimaryBtn: {
      height: hp(5.5),
      borderRadius: wp(2.5),
      backgroundColor: "#10b981",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    activeRouteCompletePrimaryBtnText: {
      fontSize: fs(3.5),
      fontWeight: "700",
      color: "#ffffff",
    },
    routeCompletedStateBannerCard: {
      backgroundColor: cardBg,
      borderRadius: wp(3.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      padding: wp(6),
      alignItems: "center",
      justifyContent: "center",
    },
    routeCompletedStateIconBadgeCircle: {
      width: wp(12),
      height: wp(12),
      borderRadius: wp(6),
      backgroundColor: "rgba(16,185,129,0.1)",
      borderWidth: 1,
      borderColor: "rgba(16,185,129,0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: hp(1.2),
    },
    routeCompletedStateTitleText: {
      fontSize: fs(4),
      fontWeight: "800",
      color: tintColor,
      marginBottom: hp(0.5),
    },
    routeCompletedStateDescriptionText: {
      fontSize: fs(3.2),
      color: mutedText,
      textAlign: "center",
      lineHeight: fs(4.5),
      paddingHorizontal: wp(4),
    },
    scheduleInstructionMutedCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: wp(2.5),
      padding: wp(3),
      marginTop: hp(1.5),
      marginBottom: hp(2.5),
    },
    scheduleInstructionHeadingText: {
      fontSize: fs(2.8),
      fontWeight: "700",
      color: tintColor,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    scheduleInstructionBodyText: {
      fontSize: fs(2.8),
      color: mutedText,
      lineHeight: fs(3.8),
      marginTop: hp(0.3),
    },
    timelineEngineWrapperSection: {
      marginTop: hp(0.5),
    },
    timelineEngineHeadingSectionText: {
      fontSize: fs(3.2),
      fontWeight: "700",
      color: mutedText,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: hp(1.2),
      paddingHorizontal: wp(0.5),
    },
    timelineEngineCardSurface: {
      backgroundColor: cardBg,
      borderRadius: wp(3.5),
      borderWidth: 1,
      borderColor: structuralBorderColor,
      paddingVertical: hp(2),
      position: "relative",
    },
    timelineEngineVerticalThreadPathLine: {
      position: "absolute",
      left: wp(6.8),
      top: hp(3),
      bottom: hp(3),
      width: 2,
      backgroundColor: structuralBorderColor,
    },
    timelineEngineNodesContainerStack: {
      paddingHorizontal: wp(4),
    },
    timelineNodeRowItem: {
      flexDirection: "row",
      paddingVertical: hp(1),
      borderRadius: wp(2.5),
      marginVertical: hp(0.3),
      paddingHorizontal: wp(1),
    },
    timelineNodeRowItemActive: {
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    timelineNodeLeftIndicatorColumn: {
      width: wp(8),
      alignItems: "center",
      marginRight: wp(3),
    },
    timelineNodeStateIconIndicatorCircleCompleted: {
      width: wp(5),
      height: wp(5),
      borderRadius: wp(2.5),
      backgroundColor: "#10b981",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    timelineNodeStateIconIndicatorCircleActive: {
      width: wp(5),
      height: wp(5),
      borderRadius: wp(2.5),
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    timelineNodeStateIconIndicatorCircleActiveInnerDot: {
      width: wp(2),
      height: wp(2),
      borderRadius: wp(1),
      backgroundColor: "#ffffff",
    },
    timelineNodeStateIconIndicatorCirclePending: {
      width: wp(5),
      height: wp(5),
      borderRadius: wp(2.5),
      backgroundColor: bg,
      borderWidth: 2,
      borderColor: structuralBorderColor,
      zIndex: 2,
    },
    timelineNodeTimestampBadgeBox: {
      marginTop: hp(0.8),
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      paddingHorizontal: wp(1),
      paddingVertical: hp(0.2),
      borderRadius: wp(1),
    },
    timelineNodeTimestampBadgeText: {
      fontSize: fs(2.2),
      fontWeight: "700",
      color: mutedText,
      fontFamily: "mono",
    },
    timelineNodeRightContentColumn: {
      flex: 1,
      paddingTop: hp(0.1),
    },
    timelineNodeContentHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: hp(0.3),
    },
    timelineNodeContentTitleText: {
      fontSize: fs(3.5),
      fontWeight: "700",
      color: tintColor,
      flex: 1,
      marginRight: wp(2),
    },
    timelineNodeContentTitleTextCompleted: {
      color: mutedText,
      textDecorationLine: "line-through",
      fontWeight: "500",
    },
    timelineNodeContentDurationLabel: {
      backgroundColor: bg,
      paddingHorizontal: wp(1.2),
      paddingVertical: hp(0.1),
      borderRadius: wp(1),
      borderWidth: 1,
      borderColor: structuralBorderColor,
    },
    timelineNodeContentDurationLabelText: {
      fontSize: fs(2.2),
      fontWeight: "700",
      color: mutedText,
      fontFamily: "mono",
    },
    timelineNodeContentAddressText: {
      fontSize: fs(3),
      color: mutedText,
    },
    timelineNodeContentAddressTextCompleted: {
      color: "rgba(255,255,255,0.15)",
    },
    timelineNodeInlineControlsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(3),
      marginTop: hp(1),
    },
    timelineNodeInlineCheckinBtn: {
      height: hp(3.2),
      paddingHorizontal: wp(2.5),
      borderRadius: wp(1.5),
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      justifyContent: "center",
      alignItems: "center",
    },
    timelineNodeInlineCheckinBtnActive: {
      backgroundColor: "rgba(16,185,129,0.1)",
      borderColor: "rgba(16,185,129,0.2)",
    },
    timelineNodeInlineCheckinBtnLabel: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: tintColor,
    },
    timelineNodeInlineCheckinBtnLabelActive: {
      color: "#10b981",
      fontWeight: "700",
    },
    timelineNodeInlineNavigateBtn: {
      flexDirection: "row",
      alignItems: "center",
    },
    timelineNodeInlineNavigateBtnLabel: {
      fontSize: fs(2.8),
      fontWeight: "600",
      color: mutedText,
    },
    timelineNodeInlineStatusCompletedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: wp(1.5),
      marginTop: hp(0.8),
    },
    timelineNodeInlineStatusCompletedLabelBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: surfaceAlphaColor,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      paddingHorizontal: wp(1.5),
      paddingVertical: hp(0.2),
      borderRadius: wp(1),
    },
    timelineNodeInlineStatusCompletedLabelBadgeText: {
      fontSize: fs(2.2),
      fontWeight: "700",
      color: "#10b981",
    },
    timelineNodeInlineUndoActionBtn: {
      paddingVertical: hp(0.2),
    },
    timelineNodeInlineUndoActionBtnLabel: {
      fontSize: fs(2.5),
      color: mutedText,
    },
    timelineNodeInlineDriveBufferCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: bg,
      borderWidth: 1,
      borderColor: structuralBorderColor,
      borderRadius: wp(1.5),
      paddingHorizontal: wp(2),
      paddingVertical: hp(0.5),
      marginTop: hp(1),
      alignSelf: "flex-start",
    },
    timelineNodeInlineDriveBufferCardText: {
      fontSize: fs(2.5),
      color: mutedText,
      fontWeight: "500",
    },
  });
};