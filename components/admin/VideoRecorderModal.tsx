import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator,Platform } from "react-native";
import { Camera, CameraView, useCameraPermissions } from "expo-camera";
import { X, Video, Square, RotateCcw, Check, Radio } from "lucide-react-native";

interface VideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileSignature: { uri: string; name: string; type: string }) => void;
}

export function VideoRecorderModal({ isOpen, onClose, onSave }: VideoRecorderModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && !permission?.granted) {
      requestPermission();
    }
    if (!isOpen) {
      clearRecordingResources();
    }
    return () => clearInterval(timerRef.current!);
  }, [isOpen]);

  const clearRecordingResources = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    setTimer(0);
    setRecordedVideoUri(null);
  };

  const startRecording = async () => {
    if (!cameraRef.current || recording) return;

    try {
      setRecording(true);
      setTimer(0);

      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);

      // Trigger the camera's native hardware video recording pipeline
      const videoOptions = { maxDuration: 60, quality: "480p" };
      const recordPromise = cameraRef.current.recordAsync(videoOptions);
      
      if (recordPromise) {
        const videoData = await recordPromise;
        if (videoData?.uri) {
          setRecordedVideoUri(videoData.uri);
        }
      }
    } catch (err) {
      console.error("Native recording initialization failed", err);
      setRecording(false);
      clearInterval(timerRef.current!);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !recording) return;

    try {
      cameraRef.current.stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
    } catch (err) {
      console.error("Failed to stop hardware recording stream", err);
    }
  };

  const handleUseVideo = () => {
    if (!recordedVideoUri) return;
    
    // Generates a mock file layout signature compatible with FormData uploads
    const filePayload = {
      uri: recordedVideoUri,
      name: `video-message-${Date.now()}.mp4`,
      type: "video/mp4",
    };
    
    onSave(filePayload);
    clearRecordingResources();
    onClose();
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  if (!permission) {
    return null;
  }

  return (
    <Modal visible={isOpen} animationType="slide" transparent={false}>
      <View style={styles.fullscreenViewContainer}>
        {/* Header Navigation Bar */}
        <View style={styles.modalTopbar}>
          <Text style={styles.topbarHeading}>
            <Video size={16} color="#8b5cf6" /> Record Video Message
          </Text>
          <TouchableOpacity style={styles.closeTouchNode} onPress={onClose}>
            <X size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Dynamic Camera Active Canvas Surface Area */}
        <View style={styles.viewfinderWindowViewport}>
          {!permission.granted ? (
            <View style={styles.permissionFallbackBox}>
              <Text style={styles.fallbackAlertText}>Camera and microphone verification access is required to use this utility.</Text>
              <TouchableOpacity style={styles.grantAccessButton} onPress={requestPermission}>
                <Text style={styles.grantAccessButtonText}>Grant Permissions</Text>
              </TouchableOpacity>
            </View>
          ) : recordedVideoUri ? (
            <View style={styles.reviewPlaceholderCard}>
              <Check size={40} color="#34d399" />
              <Text style={styles.reviewPlaceholderCardText}>Video Captured Successfully</Text>
            </View>
          ) : (
            <CameraView
              style={styles.absoluteCameraCanvas}
              ref={cameraRef}
              mode="video"
              facing="front"
            >
              {recording && (
                <View style={styles.recordingStatusBadge}>
                  <View style={styles.redDotPulseCircle} />
                  <Text style={styles.recordingStatusBadgeText}>REC {formatTime(timer)}</Text>
                </View>
              )}
            </CameraView>
          )}
        </View>

        {/* Footer Hardware Workflow Layout Options */}
        <View style={styles.modalFooterActionsRow}>
          <View style={{ width: 100 }}>
            {recordedVideoUri && (
              <TouchableOpacity style={styles.retryControlTouchNode} onPress={() => setRecordedVideoUri(null)}>
                <RotateCcw size={14} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.retryControlTouchNodeText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.primaryActionTriggersContainer}>
            {!recordedVideoUri ? (
              recording ? (
                <TouchableOpacity style={styles.actionBtnStop} onPress={stopRecording}>
                  <Square size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Stop</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.actionBtnRecord} disabled={!permission.granted} onPress={startRecording}>
                  <Radio size={14} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Record</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity style={styles.actionBtnSave} onPress={handleUseVideo}>
                <Check size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Use Video</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreenViewContainer: {
    flex: 1,
    backgroundColor: "#0c0f17",
    justifyContent: "space-between",
  },
  modalTopbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  topbarHeading: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },
  closeTouchNode: {
    padding: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 8,
  },
  viewfinderWindowViewport: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
  },
  absoluteCameraCanvas: {
    flex: 1,
  },
  permissionFallbackBox: {
    padding: 30,
    alignItems: "center",
  },
  fallbackAlertText: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  grantAccessButton: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  grantAccessButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13,
  },
  recordingStatusBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  redDotPulseCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  recordingStatusBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  reviewPlaceholderCard: {
    alignItems: "center",
    gap: 12,
  },
  reviewPlaceholderCardText: {
    color: "#c9d1d9",
    fontSize: 14,
    fontWeight: "600",
  },
  modalFooterActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  retryControlTouchNode: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  retryControlTouchNodeText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryActionTriggersContainer: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtnRecord: {
    backgroundColor: "#8b5cf6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnStop: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnSave: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
});