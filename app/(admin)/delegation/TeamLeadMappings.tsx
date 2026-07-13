import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Switch,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Shield, UserPlus, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiRequest } from '@/services/api';

interface TeamLeadMapping {
  id: string;
  teamLead: string;
  user: string;
  allowOverrideAdminAssignments: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  status?: string;
}

export default function TeamLeadMappings() {
  const queryClient = useQueryClient();
  const { uiTheme } = useTheme();

  const isMetallic = uiTheme?.theme === "metallic-elite";

  const colors = useMemo(() => {
    const isDark = (uiTheme?.theme as string) === "dark" || isMetallic;
    return {
      background: uiTheme?.panelColors?.dashboardBackground || (isDark ? "#080a0f" : "#f8fafc"),
      cardBg: uiTheme?.panelColors?.dashboardCardBackground || (isDark ? "#0f1117" : "#ffffff"),
      text: uiTheme?.panelColors?.dashboardTextColor || (isDark ? "#ffffff" : "#0f172a"),
      textSecondary: isDark ? "#94a3b8" : "#64748b",
      border: uiTheme?.panelColors?.dashboardBackground || (isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"),
      primary: uiTheme?.customColors?.primary || "#0072FF",
      error: "#ef4444",
      success: "#10b981",
    };
  }, [uiTheme, isMetallic]);

  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [userToAdd, setUserToAdd] = useState<string>('');
  const [formData, setFormData] = useState({
    teamLead: '',
    users: [] as string[],
    allowOverrideAdminAssignments: false,
  });

  const { data: mappingsData = [], isLoading: loadingMappings } = useQuery({
    queryKey: ['team-lead-mappings'],
    queryFn: async () => {
      const res = await apiRequest('/team-lead-mappings');
      return res?.items || res?.data?.items || [];
    },
  });

  const { data: usersData = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiRequest('/users');
      return res?.items || res?.data?.items || [];
    },
  });

  const isLoading = loadingMappings || loadingUsers;
  const mappings: TeamLeadMapping[] = Array.isArray(mappingsData) ? mappingsData : [];
  const users: User[] = Array.isArray(usersData) ? usersData : [];

  const activeUsers = useMemo(() => users.filter((u) => !u.status || u.status === 'active'), [users]);

  const addMappingMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await Promise.all(
        data.users.map((user) =>
          apiRequest('/team-lead-mappings', {
            method: 'POST',
            body: JSON.stringify({
              teamLead: data.teamLead,
              user,
              allowOverrideAdminAssignments: data.allowOverrideAdminAssignments,
            }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-lead-mappings'] });
      setDialogOpen(false);
      setFormData({ teamLead: '', users: [], allowOverrideAdminAssignments: false });
      setUserToAdd('');
      Alert.alert('Success', 'Team lead mapping saved successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save team lead mapping');
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (payload: { teamLead: string; user: string }) => {
      const tl = encodeURIComponent(payload.teamLead);
      const usr = encodeURIComponent(payload.user);
      return await apiRequest(`/team-lead-mappings?teamLead=${tl}&user=${usr}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-lead-mappings'] });
      Alert.alert('Success', 'Team lead mapping deleted successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete team lead mapping');
    },
  });

  const handleAddUserToBatch = () => {
    if (!userToAdd) return;
    if (formData.users.includes(userToAdd)) {
      setUserToAdd('');
      return;
    }
    setFormData((prev) => ({ ...prev, users: [...prev.users, userToAdd] }));
    setUserToAdd('');
  };

  const handleRemoveUserFromBatch = (userToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      users: prev.users.filter((x) => x !== userToRemove),
    }));
  };

  const handleSubmit = () => {
    if (!formData.teamLead || formData.users.length === 0) {
      Alert.alert('Validation Error', 'Team Lead and at least one User are required');
      return;
    }
    addMappingMutation.mutate(formData);
  };

  const confirmDelete = (mapping: TeamLeadMapping) => {
    Alert.alert(
      'Delete Mapping',
      `Delete mapping between ${mapping.teamLead} and ${mapping.user}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMappingMutation.mutate({ teamLead: mapping.teamLead, user: mapping.user }),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Team Lead Mappings</Text>
          <Text style={styles.subtitle}>Manage core delegation profiles</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setDialogOpen(true)}>
          <Plus size={16} color={colors.background} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : mappings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Shield size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>No mappings found</Text>
        </View>
      ) : (
        <FlatList
          data={mappings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.infoGroup}>
                  <Text style={styles.leadLabel}>Team Lead</Text>
                  <Text style={styles.leadName}>{item.teamLead}</Text>
                  <Text style={styles.userLabel}>Assigned User</Text>
                  <Text style={styles.userName}>{item.user}</Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.deleteButton}>
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.cardFooter}>
                <View style={[styles.badge, { backgroundColor: item.allowOverrideAdminAssignments ? colors.success + '20' : colors.border }]}>
                  {item.allowOverrideAdminAssignments ? (
                    <ToggleRight size={14} color={colors.success} />
                  ) : (
                    <ToggleLeft size={14} color={colors.textSecondary} />
                  )}
                  <Text style={[styles.badgeText, { color: item.allowOverrideAdminAssignments ? colors.success : colors.textSecondary }]}>
                    {item.allowOverrideAdminAssignments ? ' Enabled' : ' Disabled'}
                  </Text>
                </View>
                <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={dialogOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={styles.modalTitle}>Add Team Lead Mapping</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Select Team Lead</Text>
              <View style={styles.pickerWindow}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 110 }}>
                  {activeUsers.map((tl) => (
                    <TouchableOpacity
                      key={tl.id}
                      style={[styles.pickerItem, formData.teamLead === tl.name && styles.pickerItemSelected]}
                      onPress={() => setFormData({ ...formData, teamLead: tl.name })}
                    >
                      <Text style={{ color: colors.text }}>{tl.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.label}>Select User</Text>
              <View style={styles.pickerWindow}>
                <ScrollView nestedScrollEnabled style={{ maxHeight: 110 }}>
                  {activeUsers.map((ru) => (
                    <TouchableOpacity
                      key={ru.id}
                      style={[styles.pickerItem, userToAdd === ru.name && styles.pickerItemSelected]}
                      onPress={() => setUserToAdd(ru.name)}
                    >
                      <Text style={{ color: colors.text }}>{ru.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity style={styles.stageButton} onPress={handleAddUserToBatch}>
                <UserPlus size={14} color={colors.background} />
                <Text style={styles.stageButtonText}>Add to List</Text>
              </TouchableOpacity>

              <View style={styles.badgeWrapper}>
                {formData.users.map((usr) => (
                  <View key={usr} style={styles.stagedBadge}>
                    <Text style={styles.stagedBadgeText}>{usr}</Text>
                    <TouchableOpacity onPress={() => handleRemoveUserFromBatch(usr)}>
                      <Text style={styles.removeBadgeCrossText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.label}>Allow admin override</Text>
                <Switch
                  value={formData.allowOverrideAdminAssignments}
                  onValueChange={(val) => setFormData({ ...formData, allowOverrideAdminAssignments: val })}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setDialogOpen(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTextContainer: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  addButton: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: colors.background, fontWeight: '600', marginLeft: 6 },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: { backgroundColor: colors.cardBg, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoGroup: { flex: 1 },
  leadLabel: { fontSize: 11, textTransform: 'uppercase', color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  leadName: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
  userLabel: { fontSize: 11, textTransform: 'uppercase', color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
  userName: { fontSize: 15, fontWeight: '500', color: colors.text, marginBottom: 12 },
  deleteButton: { paddingLeft: 12, paddingVertical: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  badgeText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  dateText: { fontSize: 12, color: colors.textSecondary },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  pickerWindow: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.background, marginBottom: 12, overflow: 'hidden' },
  pickerItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerItemSelected: { backgroundColor: 'rgba(0,0,0,0.05)' },
  stageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.text, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 12 },
  stageButtonText: { color: colors.background, fontSize: 12, fontWeight: '600', marginLeft: 6 },
  badgeWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16, padding: 8, backgroundColor: colors.border, borderRadius: 8 },
  stagedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingLeft: 10, paddingRight: 6, paddingVertical: 4, borderRadius: 16 },
  stagedBadgeText: { fontSize: 12, color: colors.text, fontWeight: '500', marginRight: 4 },
  removeBadgeCrossText: { fontSize: 11, color: colors.textSecondary, fontWeight: '700' },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  cancelButtonText: { color: colors.text, fontWeight: '600' },
  submitButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, minWidth: 130, alignItems: 'center' },
  submitButtonText: { color: colors.background, fontWeight: '600' }
});