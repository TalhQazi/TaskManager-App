import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Pin, PinOff, Archive, Trash2, Edit, X } from 'lucide-react-native';

export default function ManagementActionsModal({ visible, onClose, item, onEdit, onPin, onArchive, onDelete }) {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.menu}>
          <View style={styles.menuHeader}>
            <Text style={styles.headerTitle} numberOfLines={1}>{item.title}</Text>
            <TouchableOpacity onPress={onClose}><X size={18} color="#94a3b8" /></TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.menuItem} onPress={() => { onEdit(); onClose(); }}>
            <Edit size={18} color="#fff" />
            <Text style={styles.menuText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { onPin(); onClose(); }}>
            {item.pinned ? <PinOff size={18} color="#fff" /> : <Pin size={18} color="#fff" />}
            <Text style={styles.menuText}>{item.pinned ? "Unpin" : "Pin"}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => { onArchive(); onClose(); }}>
            <Archive size={18} color="#fff" />
            <Text style={styles.menuText}>Archive</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.menuItem, styles.deleteItem]} onPress={() => { onDelete(); onClose(); }}>
            <Trash2 size={18} color="#ef4444" />
            <Text style={[styles.menuText, {color: '#ef4444'}]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  menu: { backgroundColor: '#1e293b', borderRadius: 12, width: '100%', padding: 8, borderWidth: 1, borderColor: '#334155' },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#334155', marginBottom: 4 },
  headerTitle: { color: '#fff', fontWeight: 'bold', fontSize: 14, maxWidth: '80%' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuText: { color: '#fff', fontSize: 15 },
  deleteItem: { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 4 }
});