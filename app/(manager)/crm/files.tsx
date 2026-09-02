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
import { apiFetch } from '@/lib/admin/apiClient';
import { useTheme } from '@/contexts/ThemeContext';
import { s, wp, hp, fs } from '@/util/styles';
import { isDarkTheme } from "@/constants/design/presets";

const TYPE_OPTIONS = ['All', 'Contract', 'Proposal', 'Invoice', 'Other'];

interface CRMFile {
  id?: string;
  _id: string;
  fileName: string;
  type: string;
  size: number;
  fileSize?: string;
  date: string;
  uploadedBy?: string;
  linkedContact?: string;
  linkedDeal?: string;
  description?: string;
  fileUrl?: string;
  url?: string;
}

const formatFileSize = (sizeInBytes: number) => {
  if (!sizeInBytes || isNaN(sizeInBytes)) return '0 MB';
  const mb = sizeInBytes / 1024 / 1024;
  return mb < 1 ? `${(sizeInBytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`;
};

const formatDate = (dateStr: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const handleDownload = async (file: CRMFile) => {
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

function buildColors(uiTheme: any, isDark: boolean) {
  return {
    background:    uiTheme.panelColors?.dashboardBackground     || (isDark ? '#090a0f' : '#f8fafc'),
    cardBg:        uiTheme.panelColors?.dashboardCardBackground || (isDark ? '#0f1117' : '#ffffff'),
    text:          uiTheme.panelColors?.dashboardTextColor      || (isDark ? '#ffffff' : '#0f172a'),
    textSecondary: isDark ? '#a3a3a3' : '#64748b',
    textMuted:     isDark ? '#525252' : '#94a3b8',
    textDark:      isDark ? '#404040' : '#475569',
    border:        isDark ? '#171717' : '#e2e8f0',
    borderLight:   isDark ? '#262626' : '#f1f5f9',
    inputBg:       isDark ? 'rgba(0, 0, 0, 0.2)' : '#f8fafc',
    primary:       uiTheme.customColors?.primary || (isDark ? '#6366f1' : '#4f46e5'),
    overlayBg:     'rgba(15, 23, 42, 0.55)',
    readOnlyBg:    isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb',
    readOnlyBorder:isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a',
    readOnlyText:  '#b45309',
    typeColors: {
      Contract: { bg: isDark ? 'rgba(225, 29, 72, 0.1)' : '#fff1f2', text: isDark ? '#fb7185' : '#be123c', border: isDark ? 'rgba(225, 29, 72, 0.25)' : '#fecdd3', dot: '#f43f5e', icon: '📄', iconBg: isDark ? 'rgba(225, 29, 72, 0.15)' : '#ffe4e6' },
      Proposal: { bg: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', text: isDark ? '#60a5fa' : '#1d4ed8', border: isDark ? 'rgba(59, 130, 246, 0.25)' : '#bfdbfe', dot: '#3b82f6', icon: '📋', iconBg: isDark ? 'rgba(59, 130, 246, 0.15)' : '#dbeafe' },
      Invoice:  { bg: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', text: isDark ? '#34d399' : '#047857', border: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0', dot: '#10b981', icon: '🧾', iconBg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5' },
      Other:    { bg: isDark ? '#27272a' : '#f8fafc', text: isDark ? '#a1a1aa' : '#475569', border: isDark ? '#3f3f46' : '#e2e8f0', dot: '#94a3b8', icon: '📁', iconBg: isDark ? '#3f3f46' : '#f1f5f9' },
    }
  };
}

function createStyles(colors: ReturnType<typeof buildColors>) {
  return StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollMainContainer: {
      flex: 1,
    },
    mainScrollContent: {
      paddingHorizontal: wp(4),
      paddingVertical: hp(3),
    },
    headerContainer: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: hp(1.5),
      marginBottom: hp(2.5),
    },
    headerContainerDesktop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: fs(5.5),
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: fs(3.5),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    readOnlyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.readOnlyBg,
      borderWidth: 1,
      borderColor: colors.readOnlyBorder,
      paddingHorizontal: wp(3),
      paddingVertical: hp(0.75),
      borderRadius: wp(10),
      alignSelf: 'flex-start',
    },
    pulseDot: {
      width: wp(2),
      height: wp(2),
      borderRadius: wp(1),
      backgroundColor: '#fbbf24',
      marginRight: wp(1.5),
    },
    readOnlyText: {
      fontSize: fs(3),
      fontWeight: '600',
      color: colors.readOnlyText,
    },
    filterCardWrapper: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(4),
      marginBottom: hp(2.5),
    },
    searchBarInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      paddingHorizontal: wp(3),
      height: hp(5.2),
    },
    searchIconLeft: {
      marginRight: wp(2),
    },
    searchTextFieldNode: {
      flex: 1,
      fontSize: fs(3.5),
      color: colors.text,
      padding: 0,
    },
    clearSearchInputBtn: {
      padding: wp(1),
    },
    chipScrollViewTrack: {
      marginTop: hp(1.8),
      flexDirection: 'row',
    },
    chipScrollContainer: {
      gap: wp(2),
      paddingBottom: hp(0.25),
    },
    chipButtonFrame: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(3.5),
      paddingVertical: hp(1),
      borderRadius: wp(10),
    },
    chipIndicatorDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      marginRight: wp(1.5),
    },
    chipLabelTextString: {
      fontSize: fs(3),
    },
    chipCountString: {
      fontSize: fs(3),
    },
    stateCenterBlockBlock: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: hp(8),
      gap: hp(1.5),
    },
    stateCenterFallbackLabel: {
      fontSize: fs(3.5),
      color: colors.textSecondary,
    },
    stateErrorLabelText: {
      fontSize: fs(3.5),
      color: '#ef4444',
      fontWeight: '500',
    },
    stateErrorRetryTriggerText: {
      fontSize: fs(3.5),
      color: colors.primary,
      textDecorationLine: 'underline',
    },
    badgeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.5),
      borderRadius: wp(10),
      alignSelf: 'flex-start',
    },
    badgeDot: {
      width: wp(1.5),
      height: wp(1.5),
      borderRadius: wp(0.75),
      marginRight: wp(1.5),
    },
    badgeText: {
      fontSize: fs(2.8),
      fontWeight: '600',
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconContainerMd: {
      width: wp(9),
      height: wp(9),
      borderRadius: wp(2),
    },
    iconContainerLg: {
      width: wp(12),
      height: wp(12),
      borderRadius: wp(3),
    },
    mobileCardFeedStack: {
      gap: hp(1.5),
    },
    mobileCardNodeElement: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
      padding: wp(4),
    },
    cardHeaderInlineStripRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: wp(3),
    },
    cardHeaderCenterTextColumn: {
      flex: 1,
    },
    cardLabelHeadingText: {
      fontSize: fs(3.5),
      fontWeight: '600',
      color: colors.text,
    },
    cardLabelSubheadingDescription: {
      fontSize: fs(3),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    cardSubPropertyHorizontalMetaLayoutWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      columnGap: wp(3),
      rowGap: hp(0.75),
      marginTop: hp(1.5),
      paddingBottom: hp(1.5),
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
    },
    cardMetadataItemElementInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(1),
      maxWidth: wp(30),
    },
    cardMetadataLabelLabelText: {
      fontSize: fs(2.8),
      color: colors.textDark,
    },
    cardBottomActionSplitBarSegmentInline: {
      flexDirection: 'row',
      gap: wp(2),
      marginTop: hp(1.5),
    },
    cardSecondarySplitActionLeftBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(99, 102, 241, 0.3)',
      borderRadius: wp(2.5),
      paddingVertical: hp(1),
    },
    cardSecondarySplitActionLeftBtnLabel: {
      fontSize: fs(3),
      fontWeight: '600',
      color: colors.primary,
    },
    cardSecondarySplitActionRightBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(2.5),
      paddingVertical: hp(1),
    },
    cardSecondarySplitActionRightBtnLabel: {
      fontSize: fs(3),
      fontWeight: '600',
      color: colors.textDark,
    },
    cardBtnIconGapSpace: {
      marginRight: wp(1),
    },
    feedResultsCounterMetaStringLabel: {
      fontSize: fs(3),
      color: colors.textSecondary,
      textAlign: 'center',
      marginVertical: hp(1),
    },
    tableBlockOuterCardWrapperContainer: {
      backgroundColor: colors.cardBg,
      borderRadius: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    tableInnerStructuredContentBlock: {
      flexDirection: 'column',
    },
    tableRowHeaderStripLayout: {
      flexDirection: 'row',
      backgroundColor: colors.inputBg,
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.8),
    },
    tableCellHeadHeader: {
      fontSize: fs(2.8),
      fontWeight: '700',
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    tableBodyDataListRowsWrapperDivider: {
      flexDirection: 'column',
    },
    tableRowDataItemInteractiveLine: {
      flexDirection: 'row',
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.8),
      borderBottomWidth: 1,
      borderColor: colors.borderLight,
      alignItems: 'center',
    },
    tableCellDataFlexRowVerticalAlign: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(3),
    },
    tableCellFilenameHeadlineStack: {
      flex: 1,
    },
    tableCellFilenameTitleText: {
      fontSize: fs(3.5),
      fontWeight: '600',
      color: colors.text,
    },
    tableCellFilenameSubtitleText: {
      fontSize: fs(2.8),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    tableCellTextStringContentLabel: {
      fontSize: fs(3.2),
      color: colors.textDark,
      paddingRight: wp(2),
    },
    tableCellTextStringContentLabelWebFix: {
      ...Platform.select({
        web: {
          display: 'block' as any,
          whiteSpace: 'nowrap' as any,
          overflow: 'hidden' as any,
          textOverflow: 'ellipsis' as any,
        }
      })
    },
    tableCellActionsRightGroupAlignInline: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: wp(2),
    },
    tableInlineActionRowViewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      borderWidth: 1,
      borderColor: 'rgba(99, 102, 241, 0.3)',
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.75),
      borderRadius: wp(2),
    },
    tableInlineActionRowViewButtonLabel: {
      fontSize: fs(2.8),
      fontWeight: '600',
      color: colors.primary,
    },
    tableInlineActionRowDownloadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: wp(2.5),
      paddingVertical: hp(0.75),
      borderRadius: wp(2),
    },
    tableInlineActionRowDownloadButtonLabel: {
      fontSize: fs(2.8),
      fontWeight: '600',
      color: colors.textDark,
    },
    tableFooterMetaCounterStripLayoutLine: {
      paddingHorizontal: wp(5),
      paddingVertical: hp(1.5),
      borderTopWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.inputBg,
    },
    tableFooterMetaCounterStripLabelString: {
      fontSize: fs(2.8),
      color: colors.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlayBg,
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: wp(6),
      borderTopRightRadius: wp(6),
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
      borderRadius: wp(4),
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalDragHandle: {
      width: wp(10),
      height: hp(0.5),
      backgroundColor: colors.border,
      borderRadius: wp(0.5),
      alignSelf: 'center',
      marginTop: hp(1.5),
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      paddingHorizontal: wp(5),
      paddingTop: hp(2),
      paddingBottom: hp(2),
      borderBottomWidth: 1,
    },
    modalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: wp(3),
      flex: 1,
    },
    modalHeaderTitleBlock: {
      flex: 1,
    },
    modalHeaderTitle: {
      fontSize: fs(4),
      fontWeight: '700',
      color: colors.text,
    },
    modalHeaderSubtitle: {
      fontSize: fs(3),
      color: colors.textSecondary,
      marginTop: hp(0.25),
    },
    modalCloseButton: {
      width: wp(7),
      height: wp(7),
      borderRadius: wp(3.5),
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalBody: {
      flexGrow: 0,
    },
    modalBodyContent: {
      paddingHorizontal: wp(5),
      paddingVertical: hp(2.5),
    },
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      rowGap: hp(2),
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
      fontSize: fs(2.5),
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: hp(0.5),
    },
    gridValue: {
      fontSize: fs(3.5),
      fontWeight: '500',
      color: colors.textDark,
    },
    gridComponentWrapper: {
      alignSelf: 'flex-start',
    },
    modalFooter: {
      flexDirection: 'row',
      paddingHorizontal: wp(5),
      paddingVertical: hp(2),
      backgroundColor: colors.inputBg,
      borderTopWidth: 1,
      borderColor: colors.borderLight,
      gap: wp(3),
      alignItems: 'center',
    },
    modalCloseTextButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: wp(3),
      height: hp(5.2),
    },
    modalCloseTextBtnLabel: {
      fontSize: fs(3.5),
      fontWeight: '500',
      color: colors.textDark,
    },
    modalDownloadButton: {
      flex: 1.5,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: wp(3),
      height: hp(5.2),
    },
    modalDownloadBtnLabel: {
      fontSize: fs(3.5),
      fontWeight: '600',
      color: '#fff',
    },
    modalBtnIcon: {
      marginRight: wp(1.5),
    },
  });
}

const TypeBadge = ({ type, colors, styles }: { type: string; colors: any; styles: any }) => {
  const cfg = colors.typeColors[type as keyof typeof colors.typeColors] || colors.typeColors['Other'];
  return (
    <View style={s([styles.badgeContainer, { backgroundColor: cfg.bg, borderColor: cfg.border }])}>
      <View style={s([styles.badgeDot, { backgroundColor: cfg.dot }])} />
      <Text style={s([styles.badgeText, { color: cfg.text }])}>{type || 'Other'}</Text>
    </View>
  );
};

const FileIcon = ({ type, size = 'md', colors, styles }: { type: string; size?: 'md' | 'lg'; colors: any; styles: any }) => {
  const cfg = colors.typeColors[type as keyof typeof colors.typeColors] || colors.typeColors['Other'];
  const isLg = size === 'lg';
  return (
    <View style={s([
      styles.iconContainer, 
      isLg ? styles.iconContainerLg : styles.iconContainerMd, 
      { backgroundColor: cfg.iconBg }
    ])}>
      <Text style={s({ fontSize: isLg ? fs(5.5) : fs(3.8) })}>{cfg.icon}</Text>
    </View>
  );
};

interface PreviewModalProps {
  file: CRMFile | null;
  visible: boolean;
  onClose: () => void;
  colors: any;
  styles: any;
}

const PreviewModal = ({ file, visible, onClose, colors, styles }: PreviewModalProps) => {
  if (!file) return null;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const cfg = colors.typeColors[file.type as keyof typeof colors.typeColors] || colors.typeColors['Other'];

  const fields = [
    { label: 'File Name', value: file.fileName || '—', fullWidth: true },
    { label: 'Type', value: <TypeBadge type={file.type} colors={colors} styles={styles} />, customComponent: true },
    { label: 'Size', value: file.fileSize || '—' },
    { label: 'Upload Date', value: formatDate(file.date) },
    { label: 'Uploaded By', value: file.uploadedBy || '—' },
    { label: 'Linked Contact', value: file.linkedContact || '—', fullWidth: true },
    { label: 'Linked Deal', value: file.linkedDeal || '—', fullWidth: true },
    ...(file.description ? [{ label: 'Description', value: file.description, fullWidth: true }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s(styles.modalOverlay)} activeOpacity={1} onPress={onClose}>
        <View 
          style={s([
            styles.modalContent, 
            isDesktop ? styles.modalContentDesktop : styles.modalContentMobile
          ])}
          onStartShouldSetResponder={() => true}
          {...(Platform.OS === 'web' ? { onClick: (e: any) => e.stopPropagation() } : {})}
        >
          {!isDesktop && <View style={s(styles.modalDragHandle)} />}

          <View style={s([styles.modalHeader, { backgroundColor: cfg.bg, borderColor: cfg.border }])}>
            <View style={s(styles.modalHeaderLeft)}>
              <FileIcon type={file.type} size="lg" colors={colors} styles={styles} />
              <View style={s(styles.modalHeaderTitleBlock)}>
                <Text style={s(styles.modalHeaderTitle)} numberOfLines={2}>{file.fileName}</Text>
                <Text style={s(styles.modalHeaderSubtitle)}>{file.description || 'CRM document'}</Text>
              </View>
            </View>
            <TouchableOpacity style={s(styles.modalCloseButton)} onPress={onClose}>
              <Feather name="x" size={fs(4)} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s(styles.modalBody)} contentContainerStyle={s(styles.modalBodyContent)}>
            <View style={s(styles.gridContainer)}>
              {fields.map((field, idx) => (
                <View 
                  key={idx} 
                  style={s([
                    styles.gridField, 
                    field.fullWidth ? styles.gridFieldFull : styles.gridFieldHalf
                  ])}
                >
                  <Text style={s(styles.gridLabel)}>{field.label}</Text>
                  {field.customComponent ? (
                    <View style={s(styles.gridComponentWrapper)}>{field.value}</View>
                  ) : (
                    <Text style={s(styles.gridValue)}>{field.value as string}</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={s(styles.modalFooter)}>
            <TouchableOpacity style={s(styles.modalCloseTextButton)} onPress={onClose}>
              <Text style={s(styles.modalCloseTextBtnLabel)}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s(styles.modalDownloadButton)} onPress={() => handleDownload(file)}>
              <Feather name="download" size={fs(4)} color="#fff" style={s(styles.modalBtnIcon)} />
              <Text style={s(styles.modalDownloadBtnLabel)}>Download File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default function CRMFiles() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const { uiTheme } = useTheme();
  const isDark = isDarkTheme(uiTheme?.theme);
  const colors = useMemo(() => buildColors(uiTheme, isDark), [uiTheme, isDark]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [files, setFiles]               = useState<CRMFile[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [selectedFile, setSelectedFile] = useState<CRMFile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiFetch('/api/crm-files') as any; 
      
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

  const openPreview = (file: CRMFile) => {
    setSelectedFile(file);
    setModalVisible(true);
  };

  return (
    <View style={s(styles.appContainer)}>
      <ScrollView style={s(styles.scrollMainContainer)} contentContainerStyle={s(styles.mainScrollContent)}>
        
        <View style={s([styles.headerContainer, isDesktop && styles.headerContainerDesktop])}>
          <View>
            <Text style={s(styles.headerTitle)}>File Manager</Text>
            <Text style={s(styles.headerSubtitle)}>Browse and download uploaded CRM documents.</Text>
          </View>
          <View style={s(styles.readOnlyBadge)}>
            <View style={s(styles.pulseDot)} />
            <Text style={s(styles.readOnlyText)}>Read-only view</Text>
          </View>
        </View>

        <View style={s(styles.filterCardWrapper)}>
          <View style={s(styles.searchBarInputContainer)}>
            <Feather name="search" size={fs(4)} color={colors.textSecondary} style={s(styles.searchIconLeft)} />
            <TextInput
              style={s(styles.searchTextFieldNode)}
              placeholder="Search files, contacts, deals…"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={s(styles.clearSearchInputBtn)}>
                <Feather name="x" size={fs(4)} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={s(styles.chipScrollViewTrack)}
            contentContainerStyle={s(styles.chipScrollContainer)}
          >
            {TYPE_OPTIONS.map((type) => {
              const active = typeFilter === type;
              const cfg = colors.typeColors[type as keyof typeof colors.typeColors] || colors.typeColors['Other'];
              
              let chipBg = colors.cardBg;
              let chipBorderColor = colors.border;
              let chipTextColor = colors.textSecondary;

              if (active) {
                if (type === 'All') {
                  chipBg = colors.primary;
                  chipBorderColor = colors.primary;
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
                  style={s([styles.chipButtonFrame, { backgroundColor: chipBg, borderColor: chipBorderColor }])}
                >
                  {type !== 'All' && active && (
                    <View style={s([styles.chipIndicatorDot, { backgroundColor: cfg.dot }])} />
                  )}
                  <Text style={s([styles.chipLabelTextString, { color: chipTextColor, fontWeight: active ? '600' : '500' }])}>
                    {type}
                  </Text>
                  <Text style={s([styles.chipCountString, { color: active ? (type === 'All' ? 'rgba(255,255,255,0.8)' : chipTextColor) : colors.textSecondary }])}>
                    {` (${typeCounts[type] || 0})`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading && (
          <View style={s(styles.stateCenterBlockBlock)}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={s(styles.stateCenterFallbackLabel)}>Loading files…</Text>
          </View>
        )}

        {!loading && error && (
          <View style={s(styles.stateCenterBlockBlock)}>
            <Text style={s(styles.stateErrorLabelText)}>{error}</Text>
            <TouchableOpacity onPress={fetchFiles}>
              <Text style={s(styles.stateErrorRetryTriggerText)}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && filteredFiles.length === 0 && (
          <View style={s(styles.stateCenterBlockBlock)}>
            <Feather name="file-text" size={fs(8)} color={colors.textMuted} />
            <Text style={s(styles.stateCenterFallbackLabel)}>No files match your search.</Text>
          </View>
        )}

        {!loading && !error && filteredFiles.length > 0 && (
          !isDesktop ? (
            <View style={s(styles.mobileCardFeedStack)}>
              {filteredFiles.map((file) => (
                <TouchableOpacity 
                  key={file.id || file._id} 
                  style={s(styles.mobileCardNodeElement)}
                  activeOpacity={0.7}
                  onPress={() => openPreview(file)}
                >
                  <View style={s(styles.cardHeaderInlineStripRow)}>
                    <FileIcon type={file.type} size="lg" colors={colors} styles={styles} />
                    <View style={s(styles.cardHeaderCenterTextColumn)}>
                      <Text style={s(styles.cardLabelHeadingText)} numberOfLines={1}>{file.fileName}</Text>
                      <Text style={s(styles.cardLabelSubheadingDescription)} numberOfLines={1}>{file.description || 'CRM document'}</Text>
                    </View>
                    <TypeBadge type={file.type} colors={colors} styles={styles} />
                  </View>

                  <View style={s(styles.cardSubPropertyHorizontalMetaLayoutWrap)}>
                    {file.linkedContact && (
                      <View style={s(styles.cardMetadataItemElementInline)}>
                        <Feather name="user" size={fs(2.8)} color={colors.textSecondary} />
                        <Text style={s(styles.cardMetadataLabelLabelText)} numberOfLines={1}>{file.linkedContact}</Text>
                      </View>
                    )}
                    {file.linkedDeal && (
                      <View style={s(styles.cardMetadataItemElementInline)}>
                        <Feather name="file-text" size={fs(2.8)} color={colors.textSecondary} />
                        <Text style={s(styles.cardMetadataLabelLabelText)} numberOfLines={1}>{file.linkedDeal}</Text>
                      </View>
                    )}
                    <View style={s(styles.cardMetadataItemElementInline)}>
                      <Feather name="calendar" size={fs(2.8)} color={colors.textSecondary} />
                      <Text style={s(styles.cardMetadataLabelLabelText)}>{formatDate(file.date)}</Text>
                    </View>
                    <View style={s(styles.cardMetadataItemElementInline)}>
                      <Feather name="layers" size={fs(2.8)} color={colors.textSecondary} />
                      <Text style={s(styles.cardMetadataLabelLabelText)}>{file.fileSize}</Text>
                    </View>
                  </View>

                  <View style={s(styles.cardBottomActionSplitBarSegmentInline)}>
                    <TouchableOpacity style={s(styles.cardSecondarySplitActionLeftBtn)} onPress={() => openPreview(file)}>
                      <Feather name="eye" size={fs(3)} color={colors.primary} style={s(styles.cardBtnIconGapSpace)} />
                      <Text style={s(styles.cardSecondarySplitActionLeftBtnLabel)}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s(styles.cardSecondarySplitActionRightBtn)} onPress={() => handleDownload(file)}>
                      <Feather name="download" size={fs(3)} color={colors.textDark} style={s(styles.cardBtnIconGapSpace)} />
                      <Text style={s(styles.cardSecondarySplitActionRightBtnLabel)}>Download</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={s(styles.feedResultsCounterMetaStringLabel)}>
                Showing {filteredFiles.length} of {files.length} files
              </Text>
            </View>
          ) : (
            <View style={s(styles.tableBlockOuterCardWrapperContainer)}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View style={s(styles.tableInnerStructuredContentBlock)}>
                  <View style={s(styles.tableRowHeaderStripLayout)}>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(22) }])}>File</Text>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(11) }])}>Type</Text>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(14) }])}>Contact</Text>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(14) }])}>Deal</Text>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(13) }])}>Uploaded By</Text>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(11) }])}>Date</Text>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(9) }])}>Size</Text>
                    <Text style={s([styles.tableCellHeadHeader, { width: wp(16), textAlign: 'right' }])}>Actions</Text>
                  </View>

                  <View style={s(styles.tableBodyDataListRowsWrapperDivider)}>
                    {filteredFiles.map((file) => (
                      <TouchableOpacity 
                        key={file.id || file._id} 
                        style={s(styles.tableRowDataItemInteractiveLine)}
                        activeOpacity={0.7}
                        onPress={() => openPreview(file)}
                      >
                        <View style={s([{ width: wp(22) }, styles.tableCellDataFlexRowVerticalAlign])}>
                          <FileIcon type={file.type} colors={colors} styles={styles} />
                          <View style={s(styles.tableCellFilenameHeadlineStack)}>
                            <Text style={s(styles.tableCellFilenameTitleText)} numberOfLines={1}>{file.fileName}</Text>
                            <Text style={s(styles.tableCellFilenameSubtitleText)} numberOfLines={1}>{file.description || 'CRM document'}</Text>
                          </View>
                        </View>
                        <View style={s({ width: wp(11), justifyContent: 'center' })}>
                          <TypeBadge type={file.type} colors={colors} styles={styles} />
                        </View>
                        <Text style={s([{ width: wp(14) }, styles.tableCellTextStringContentLabel, styles.tableCellTextStringContentLabelWebFix])} numberOfLines={1}>{file.linkedContact || '—'}</Text>
                        <Text style={s([{ width: wp(14) }, styles.tableCellTextStringContentLabel, styles.tableCellTextStringContentLabelWebFix])} numberOfLines={1}>{file.linkedDeal || '—'}</Text>
                        <Text style={s([{ width: wp(13) }, styles.tableCellTextStringContentLabel, styles.tableCellTextStringContentLabelWebFix])} numberOfLines={1}>{file.uploadedBy || '—'}</Text>
                        <Text style={s([{ width: wp(11) }, styles.tableCellTextStringContentLabel])}>{formatDate(file.date)}</Text>
                        <Text style={s([{ width: wp(9) }, styles.tableCellTextStringContentLabel])}>{file.fileSize}</Text>
                        
                        <View style={s([{ width: wp(16) }, styles.tableCellActionsRightGroupAlignInline])}>
                          <TouchableOpacity style={s(styles.tableInlineActionRowViewButton)} onPress={() => openPreview(file)}>
                            <Feather name="eye" size={fs(3)} color={colors.primary} style={s(styles.cardBtnIconGapSpace)} />
                            <Text style={s(styles.tableInlineActionRowViewButtonLabel)}>View</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s(styles.tableInlineActionRowDownloadButton)} onPress={() => handleDownload(file)}>
                            <Feather name="download" size={fs(3)} color={colors.textDark} style={s(styles.cardBtnIconGapSpace)} />
                            <Text style={s(styles.tableInlineActionRowDownloadButtonLabel)}>Download</Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>
              <View style={s(styles.tableFooterMetaCounterStripLayoutLine)}>
                <Text style={s(styles.tableFooterMetaCounterStripLabelString)}>Showing {filteredFiles.length} of {files.length} files</Text>
              </View>
            </View>
          )
        )}
      </ScrollView>

      <PreviewModal 
        file={selectedFile} 
        visible={modalVisible} 
        colors={colors}
        styles={styles}
        onClose={() => { setModalVisible(false); setSelectedFile(null); }} 
      />
    </View>
  );
}