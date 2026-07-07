import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { apiFetch } from '@/lib/admin/apiClient'; // Reinstated real API client
import Colors from '@/constants/colors';

/* ── Constants ───────────────────────────────────────────────────── */
const TYPE_OPTIONS = ['All', 'Contract', 'Proposal', 'Invoice', 'Other'];

const TYPE_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string; icon: string; iconBg: string }> = {
  Contract: { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', dot: '#f43f5e', icon: '📄', iconBg: '#ffe4e6' },
  Proposal: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', icon: '📋', iconBg: '#dbeafe' },
  Invoice:  { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0', dot: '#10b981', icon: '🧾', iconBg: '#d1fae5' },
  Other:    { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8', icon: '📁', iconBg: '#f1f5f9' },
};

/* ── Helpers ─────────────────────────────────────────────────────── */
const getTypeConfig = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG['Other'];

const formatFileSize = (sizeInBytes: number) => {
  if (!sizeInBytes || isNaN(sizeInBytes)) return '0 MB';
  const mb = sizeInBytes / 1024 / 1024;
  return mb < 1 ? `${(sizeInBytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
};

const formatDate = (dateStr: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const handleDownload = async (file: any) => {
  const downloadUrl = file.fileUrl || file.url || `/api/crm-files/${file.id || file._id}/download`;
  
  if (downloadUrl.startsWith('http')) {
    const supported = await Linking.canOpenURL(downloadUrl);
    if (supported) {
      await Linking.openURL(downloadUrl);
    } else {
      Alert.alert('Error', 'Cannot open asset link on this device.');
    }
  } else {
    Alert.alert(
      'Download File',
      `Downloading asset: ${file.fileName || 'document'}\nPath: ${downloadUrl}`
    );
  }
};

/* ── Shared UI atoms ─────────────────────────────────────────────── */
const TypeBadge = ({ type }: { type: string }) => {
  const cfg = getTypeConfig(type);
  return (
    <View style={[styles.badgeContainer, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{type || 'Other'}</Text>
    </View>
  );
};

const FileIcon = ({ type, size = 'md' }: { type: string; size?: 'md' | 'lg' }) => {
  const cfg = getTypeConfig(type);
  const isLg = size === 'lg';
  return (
    <View style={[
      styles.iconContainer, 
      isLg ? styles.iconContainerLg : styles.iconContainerMd, 
      { backgroundColor: cfg.iconBg }
    ]}>
      <Text style={{ fontSize: isLg ? 22 : 15 }}>{cfg.icon}</Text>
    </View>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Preview / Detail Modal
──────────────────────────────────────────────────────────────────── */
const PreviewModal = ({ file, visible, onClose }: { file: any; visible: boolean; onClose: () => void }) => {
  if (!file) return null;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const cfg = getTypeConfig(file.type);

  const fields = [
    { label: 'File Name', value: file.fileName || '—', fullWidth: true },
    { label: 'Type', value: <TypeBadge type={file.type} />, customComponent: true },
    { label: 'Size', value: file.fileSize },
    { label: 'Upload Date', value: formatDate(file.date) },
    { label: 'Uploaded By', value: file.uploadedBy || '—' },
    { label: 'Linked Contact', value: file.linkedContact || '—', fullWidth: true },
    { label: 'Linked Deal', value: file.linkedDeal || '—', fullWidth: true },
    ...(file.description ? [{ label: 'Description', value: file.description, fullWidth: true }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View 
          style={[
            styles.modalContent, 
            isDesktop ? styles.modalContentDesktop : styles.modalContentMobile
          ]}
          onStartShouldSetResponder={() => true}
          onClick={(e) => Platform.OS === 'web' && e.stopPropagation()}
        >
          {!isDesktop && <View style={styles.modalDragHandle} />}

          <View style={[styles.modalHeader, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
            <View style={styles.modalHeaderLeft}>
              <FileIcon type={file.type} size="lg" />
              <View style={styles.modalHeaderTitleBlock}>
                <Text style={styles.modalHeaderTitle} numberOfLines={2}>{file.fileName}</Text>
                <Text style={styles.modalHeaderSubtitle}>{file.description || 'CRM document'}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
              <Feather name="x" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            <View style={styles.gridContainer}>
              {fields.map((field, idx) => (
                <View 
                  key={idx} 
                  style={[
                    styles.gridField, 
                    field.fullWidth ? styles.gridFieldFull : styles.gridFieldHalf
                  ]}
                >
                  <Text style={styles.gridLabel}>{field.label}</Text>
                  {field.customComponent ? (
                    <View style={styles.gridComponentWrapper}>{field.value}</View>
                  ) : (
                    <Text style={styles.gridValue}>{field.value as string}</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCloseTextButton} onPress={onClose}>
              <Text style={styles.modalCloseTextBtnLabel}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDownloadButton} onPress={() => handleDownload(file)}>
              <Feather name="download" size={16} color="#fff" style={styles.modalBtnIcon} />
              <Text style={styles.modalDownloadBtnLabel}>Download File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

/* ─────────────────────────────────────────────────────────────────
   Main Component
──────────────────────────────────────────────────────────────────── */
export default function CRMFiles() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [files, setFiles]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/api/crm-files');
      setFiles(
        (data.items || []).map((item: any) => ({
          ...item,
          fileSize: formatFileSize(item.size),
        }))
      );
    } catch (err: any) {
      setError(err?.message || 'Unable to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        file.fileName?.toLowerCase().includes(q) ||
        file.linkedContact?.toLowerCase().includes(q) ||
        file.linkedDeal?.toLowerCase().includes(q) ||
        file.uploadedBy?.toLowerCase().includes(q);
      const matchesType = typeFilter === 'All' || file.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [files, searchQuery, typeFilter]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: files.length };
    files.forEach((f) => { 
      const t = f.type || 'Other'; 
      counts[t] = (counts[t] || 0) + 1; 
    });
    return counts;
  }, [files]);

  const openPreview = (file: any) => {
    setSelectedFile(file);
    setModalVisible(true);
  };

  return (
    <View style={styles.appContainer}>
      <ScrollView style={styles.scrollMainContainer} contentContainerStyle={styles.mainScrollContent}>
        
        {/* ── Page Header ── */}
        <View style={[styles.headerContainer, isDesktop && styles.headerContainerDesktop]}>
          <View>
            <Text style={styles.headerTitle}>File Manager</Text>
            <Text style={styles.headerSubtitle}>Browse and download uploaded CRM documents.</Text>
          </View>
          <View style={styles.readOnlyBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.readOnlyText}>Read-only view</Text>
          </View>
        </View>

        {/* ── Search + Filter Bar ── */}
        <View style={styles.filterCardWrapper}>
          <View style={styles.searchBarInputContainer}>
            <Feather name="search" size={16} color="#94a3b8" style={styles.searchIconLeft} />
            <TextInput
              style={styles.searchTextFieldNode}
              placeholder="Search files, contacts, deals…"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchInputBtn}>
                <Feather name="x" size={16} color="#64748b" />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.chipScrollViewTrack}
            contentContainerStyle={styles.chipScrollContainer}
          >
            {TYPE_OPTIONS.map((type) => {
              const active = typeFilter === type;
              const cfg = getTypeConfig(type);
              
              let chipBg = '#fff';
              let chipBorderColor = '#e2e8f0';
              let chipTextColor = '#64748b';

              if (active) {
                if (type === 'All') {
                  chipBg = '#4f46e5';
                  chipBorderColor = '#4f46e5';
                  chipTextColor = '#fff';
                } else {
                  chipBg = cfg.bg;
                  chipBorderColor = cfg.border;
                  chipTextColor = cfg.text;
                }
              }

              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => setTypeFilter(type)}
                  style={[styles.chipButtonFrame, { backgroundColor: chipBg, borderColor: chipBorderColor }]}
                >
                  {type !== 'All' && active && (
                    <View style={[styles.chipIndicatorDot, { backgroundColor: cfg.dot }]} />
                  )}
                  <Text style={[styles.chipLabelTextString, { color: chipTextColor, fontWeight: active ? '600' : '500' }]}>
                    {type}
                  </Text>
                  <Text style={[styles.chipCountString, { color: active ? (type === 'All' ? 'rgba(255,255,255,0.8)' : chipTextColor) : '#94a3b8' }]}>
                    {` (${typeCounts[type] || 0})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Status State Blocks ── */}
        {loading && (
          <View style={styles.stateCenterBlockBlock}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.stateCenterFallbackLabel}>Loading files…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.stateCenterBlockBlock}>
            <Text style={styles.stateErrorLabelText}>{error}</Text>
            <TouchableOpacity onPress={fetchFiles}>
              <Text style={styles.stateErrorRetryTriggerText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && filteredFiles.length === 0 && (
          <View style={styles.stateCenterBlockBlock}>
            <Feather name="file-text" size={32} color="#cbd5e1" />
            <Text style={styles.stateCenterFallbackLabel}>No files match your search.</Text>
          </View>
        )}

        {/* ── Data Grid Feed ── */}
        {!loading && !error && filteredFiles.length > 0 && (
          !isDesktop ? (
            /* MOBILE LAYOUT */
            <View style={styles.mobileCardFeedStack}>
              {filteredFiles.map((file) => (
                <TouchableOpacity 
                  key={file.id || file._id} 
                  style={styles.mobileCardNodeElement}
                  activeOpacity={0.7}
                  onPress={() => openPreview(file)}
                >
                  <View style={styles.cardHeaderInlineStripRow}>
                    <FileIcon type={file.type} size="lg" />
                    <View style={styles.cardHeaderCenterTextColumn}>
                      <Text style={styles.cardLabelHeadingText} numberOfLines={1}>{file.fileName}</Text>
                      <Text style={styles.cardLabelSubheadingDescription} numberOfLines={1}>{file.description || 'CRM document'}</Text>
                    </View>
                    <TypeBadge type={file.type} />
                  </View>

                  <View style={styles.cardSubPropertyHorizontalMetaLayoutWrap}>
                    {file.linkedContact && (
                      <View style={styles.cardMetadataItemElementInline}>
                        <Feather name="user" size={11} color="#94a3b8" />
                        <Text style={styles.cardMetadataLabelLabelText} numberOfLines={1}>{file.linkedContact}</Text>
                      </View>
                    )}
                    {file.linkedDeal && (
                      <View style={styles.cardMetadataItemElementInline}>
                        <Feather name="file-text" size={11} color="#94a3b8" />
                        <Text style={styles.cardMetadataLabelLabelText} numberOfLines={1}>{file.linkedDeal}</Text>
                      </View>
                    )}
                    <View style={styles.cardMetadataItemElementInline}>
                      <Feather name="calendar" size={11} color="#94a3b8" />
                      <Text style={styles.cardMetadataLabelLabelText}>{formatDate(file.date)}</Text>
                    </View>
                    <View style={styles.cardMetadataItemElementInline}>
                      <Feather name="layers" size={11} color="#94a3b8" />
                      <Text style={styles.cardMetadataLabelLabelText}>{file.fileSize}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBottomActionSplitBarSegmentInline}>
                    <TouchableOpacity style={styles.cardSecondarySplitActionLeftBtn} onPress={() => openPreview(file)}>
                      <Feather name="eye" size={12} color="#4f46e5" style={styles.cardBtnIconGapSpace} />
                      <Text style={styles.cardSecondarySplitActionLeftBtnLabel}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cardSecondarySplitActionRightBtn} onPress={() => handleDownload(file)}>
                      <Feather name="download" size={12} color="#475569" style={styles.cardBtnIconGapSpace} />
                      <Text style={styles.cardSecondarySplitActionRightBtnLabel}>Download</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.feedResultsCounterMetaStringLabel}>
                Showing {filteredFiles.length} of {files.length} files
              </Text>
            </View>
          ) : (
            /* DESKTOP/TABLET LAYOUT */
            <View style={styles.tableBlockOuterCardWrapperContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={styles.tableInnerStructuredContentBlock}>
                  <View style={styles.tableRowHeaderStripLayout}>
                    <Text style={[styles.tableCellHeadHeader, { width: 220 }]}>File</Text>
                    <Text style={[styles.tableCellHeadHeader, { width: 110 }]}>Type</Text>
                    <Text style={[styles.tableCellHeadHeader, { width: 140 }]}>Contact</Text>
                    <Text style={[styles.tableCellHeadHeader, { width: 140 }]}>Deal</Text>
                    <Text style={[styles.tableCellHeadHeader, { width: 130 }]}>Uploaded By</Text>
                    <Text style={[styles.tableCellHeadHeader, { width: 110 }]}>Date</Text>
                    <Text style={[styles.tableCellHeadHeader, { width: 90 }]}>Size</Text>
                    <Text style={[styles.tableCellHeadHeader, { width: 160, textAlign: 'right' }]}>Actions</Text>
                  </View>

                  <View style={styles.tableBodyDataListRowsWrapperDivider}>
                    {filteredFiles.map((file) => (
                      <TouchableOpacity 
                        key={file.id || file._id} 
                        style={styles.tableRowDataItemInteractiveLine}
                        activeOpacity={0.7}
                        onPress={() => openPreview(file)}
                      >
                        <View style={[{ width: 220 }, styles.tableCellDataFlexRowVerticalAlign]}>
                          <FileIcon type={file.type} />
                          <View style={styles.tableCellFilenameHeadlineStack}>
                            <Text style={styles.tableCellFilenameTitleText} numberOfLines={1}>{file.fileName}</Text>
                            <Text style={styles.tableCellFilenameSubtitleText} numberOfLines={1}>{file.description || 'CRM document'}</Text>
                          </View>
                        </View>
                        <View style={{ width: 110, justifyContent: 'center' }}>
                          <TypeBadge type={file.type} />
                        </View>
                        <Text style={[{ width: 140 }, styles.tableCellTextStringContentLabel]} numberOfLines={1}>{file.linkedContact || '—'}</Text>
                        <Text style={[{ width: 140 }, styles.tableCellTextStringContentLabel]} numberOfLines={1}>{file.linkedDeal || '—'}</Text>
                        <Text style={[{ width: 130 }, styles.tableCellTextStringContentLabel]} numberOfLines={1}>{file.uploadedBy || '—'}</Text>
                        <Text style={[{ width: 110 }, styles.tableCellTextStringContentLabel]}>{formatDate(file.date)}</Text>
                        <Text style={[{ width: 90 }, styles.tableCellTextStringContentLabel]}>{file.fileSize}</Text>
                        
                        <View style={[{ width: 160 }, styles.tableCellActionsRightGroupAlignInline]}>
                          <TouchableOpacity style={styles.tableInlineActionRowViewButton} onPress={() => openPreview(file)}>
                            <Feather name="eye" size={12} color="#4f46e5" style={styles.cardBtnIconGapSpace} />
                            <Text style={styles.tableInlineActionRowViewButtonLabel}>View</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.tableInlineActionRowDownloadButton} onPress={() => handleDownload(file)}>
                            <Feather name="download" size={12} color="#475569" style={styles.cardBtnIconGapSpace} />
                            <Text style={styles.tableInlineActionRowDownloadButtonLabel}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
              <View style={styles.tableFooterMetaCounterStripLayoutLine}>
                <Text style={styles.tableFooterMetaCounterStripLabelString}>Showing {filteredFiles.length} of {files.length} files</Text>
              </View>
            </View>
          )
        )}
      </ScrollView>

      <PreviewModal 
        file={selectedFile} 
        visible={modalVisible} 
        onClose={() => { setModalVisible(false); setSelectedFile(null); }} 
      />
    </View>
  );
}

/* ── StyleSheet Configuration ── */
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollMainContainer: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  headerContainerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.surface,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
    marginRight: 6,
  },
  readOnlyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
  filterCardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 20,
  },
  searchBarInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIconLeft: {
    marginRight: 8,
  },
  searchTextFieldNode: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
    padding: 0,
  },
  clearSearchInputBtn: {
    padding: 4,
  },
  chipScrollViewTrack: {
    marginTop: 14,
    flexDirection: 'row',
  },
  chipScrollContainer: {
    gap: 8,
    paddingBottom: 2,
  },
  chipButtonFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  chipIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipLabelTextString: {
    fontSize: 12,
  },
  chipCountString: {
    fontSize: 12,
  },
  stateCenterBlockBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  stateCenterFallbackLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  stateErrorLabelText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '500',
  },
  stateErrorRetryTriggerText: {
    fontSize: 14,
    color: '#4f46e5',
    textDecorationLine: 'underline',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerMd: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  iconContainerLg: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  mobileCardFeedStack: {
    gap: 12,
  },
  mobileCardNodeElement: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderInlineStripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardHeaderCenterTextColumn: {
    flex: 1,
  },
  cardLabelHeadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  cardLabelSubheadingDescription: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  cardSubPropertyHorizontalMetaLayoutWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 6,
    marginTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardMetadataItemElementInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 120,
  },
  cardMetadataLabelLabelText: {
    fontSize: 11,
    color: '#64748b',
  },
  cardBottomActionSplitBarSegmentInline: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  cardSecondarySplitActionLeftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 10,
    paddingVertical: 8,
  },
  cardSecondarySplitActionLeftBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
  },
  cardSecondarySplitActionRightBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  cardSecondarySplitActionRightBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  cardBtnIconGapSpace: {
    marginRight: 4,
  },
  feedResultsCounterMetaStringLabel: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 8,
  },
  tableBlockOuterCardWrapperContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  tableInnerStructuredContentBlock: {
    flexDirection: 'column',
  },
  tableRowHeaderStripLayout: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  tableCellHeadHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  tableBodyDataListRowsWrapperDivider: {
    flexDirection: 'column',
  },
  tableRowDataItemInteractiveLine: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f8fafc',
    alignItems: 'center',
  },
  tableCellDataFlexRowVerticalAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tableCellFilenameHeadlineStack: {
    flex: 1,
  },
  tableCellFilenameTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  tableCellFilenameSubtitleText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  tableCellTextStringContentLabel: {
    fontSize: 13,
    color: '#475569',
    paddingRight: 8,
  },
  tableCellActionsRightGroupAlignInline: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  tableInlineActionRowViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tableInlineActionRowViewButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4f46e5',
  },
  tableInlineActionRowDownloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tableInlineActionRowDownloadButtonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  tableFooterMetaCounterStripLayoutLine: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  tableFooterMetaCounterStripLabelString: {
    fontSize: 11,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 24,
  },
  modalContentMobile: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContentDesktop: {
    alignSelf: 'center',
    justifyContent: 'center',
    bottom: '25%',
    width: 480,
    borderRadius: 16,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalHeaderTitleBlock: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flexGrow: 0,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
  },
  gridField: {
    flexDirection: 'column',
  },
  gridFieldHalf: {
    width: '50%',
  },
  gridFieldFull: {
    width: '100%',
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  gridComponentWrapper: {
    alignSelf: 'flex-start',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    gap: 12,
    alignItems: 'center',
  },
  modalCloseTextButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 42,
  },
  modalCloseTextBtnLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
  },
  modalDownloadButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    height: 42,
  },
  modalDownloadBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalBtnIcon: {
    marginRight: 6,
  },
});