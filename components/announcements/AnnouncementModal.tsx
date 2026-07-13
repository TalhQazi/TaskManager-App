import React, { useState, useEffect } from "react";
import { 
  Modal, View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ScrollView, Switch, ActivityIndicator, Alert 
} from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, ChevronDown } from "lucide-react-native";
import { apiRequest } from "@/services/api";
import Colors from "@/constants/colors";

export default function AnnouncementModal({ visible, onClose, announcement, onSuccess }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: announcement?.title || "",
    body: announcement?.body || "",
    priority: announcement?.priority || "medium",
    category: announcement?.category || "general",
    scheduledAt: announcement?.scheduledAt || "",
    expiresAt: announcement?.expiresAt || "",
    repeatFrequency: announcement?.repeatFrequency || "none",
    requiresAcknowledgement: !!announcement?.requiresAcknowledgement,
    sendPushNotification: true,
    sendEmail: false,
    sendSMS: false,
    pinned: !!announcement?.pinned,
    emergency: !!announcement?.emergency,
  });

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || "",
        body: announcement.body || "",
        priority: announcement.priority || "medium",
        category: announcement.category || "general",
        scheduledAt: announcement.scheduledAt || "",
        expiresAt: announcement.expiresAt || "",
        repeatFrequency: announcement.repeatFrequency || "none",
        requiresAcknowledgement: !!announcement.requiresAcknowledgement,
        sendPushNotification: !!announcement.sendPushNotification,
        sendEmail: !!announcement.sendEmail,
        sendSMS: !!announcement.sendSMS,
        pinned: !!announcement.pinned,
        emergency: !!announcement.emergency,
      });
    }
  }, [announcement]);

  const mutation = useMutation({
  mutationFn: (data: any) => 
    apiRequest(announcement ? `/announcements/${announcement.id}` : "/announcements", {
      method: announcement ? "PUT" : "POST",
      // Ensure your apiRequest utility is passing the data as the body
      // If your apiRequest wraps fetch, it should look like this:
      body: JSON.stringify(data), 
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    onSuccess();
    onClose();
  },
  onError: (err) => {
    console.log("Detailed Error:", err);
  }
});

  // Helper to simulate a Select dropdown using Alert
  const openSelect = (key: string, options: string[]) => {
    Alert.alert("Select " + key, "Choose an option", options.map(opt => ({
      text: opt, onPress: () => setFormData({...formData, [key]: opt})
    })));
  };

  const renderToggle = (label: string, key: string) => (
    <View style={styles.switchRow}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={formData[key]} onValueChange={(v) => setFormData({...formData, [key]: v})} trackColor={{true: Colors.primary}} />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{announcement ? "Edit" : "Create"} Announcement</Text>
            <TouchableOpacity onPress={onClose}><X color="#fff" size={24} /></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#666" value={formData.title} onChangeText={(t) => setFormData({...formData, title: t})} />
            <TextInput style={[styles.input, {height: 80}]} multiline placeholder="Content" placeholderTextColor="#666" value={formData.body} onChangeText={(t) => setFormData({...formData, body: t})} />

            <TouchableOpacity style={styles.selectBtn} onPress={() => openSelect("priority", ["low", "medium", "high", "critical"])}>
              <Text style={{color:'#fff'}}>Priority: {formData.priority}</Text>
              <ChevronDown color="#fff" size={16} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectBtn} onPress={() => openSelect("category", ["general", "policy", "training", "safety", "hr", "it", "operations"])}>
              <Text style={{color:'#fff'}}>Category: {formData.category}</Text>
              <ChevronDown color="#fff" size={16} />
            </TouchableOpacity>

            <TextInput style={styles.input} placeholder="Schedule (YYYY-MM-DD)" placeholderTextColor="#666" value={formData.scheduledAt} onChangeText={(t) => setFormData({...formData, scheduledAt: t})} />
            <TextInput style={styles.input} placeholder="Expires (YYYY-MM-DD)" placeholderTextColor="#666" value={formData.expiresAt} onChangeText={(t) => setFormData({...formData, expiresAt: t})} />

            <View style={styles.divider} />

            {renderToggle("Require Acknowledgement", "requiresAcknowledgement")}
            {renderToggle("Push Notification", "sendPushNotification")}
            {renderToggle("Send Email", "sendEmail")}
            {renderToggle("Send SMS", "sendSMS")}
            {renderToggle("Pin to Dashboard", "pinned")}
            {renderToggle("Emergency Alert", "emergency")}

            <TouchableOpacity style={styles.saveBtn} onPress={() => mutation.mutate(formData)}>
              {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{announcement ? "Update Announcement" : "Create Announcement"}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center" },
  modalContent: { backgroundColor: "#1e293b", margin: 20, padding: 20, borderRadius: 16, maxHeight: "90%" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  input: { backgroundColor: "#334155", padding: 12, borderRadius: 8, color: "#fff", marginBottom: 12 },
  selectBtn: { backgroundColor: "#334155", padding: 12, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  label: { color: "#94a3b8", fontSize: 14 },
  divider: { height: 1, backgroundColor: "#334155", marginVertical: 15 },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 8, alignItems: "center", marginTop: 20 },
  btnText: { color: "#fff", fontWeight: "bold" }
});