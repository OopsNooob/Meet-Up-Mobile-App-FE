import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Camera, FileText, Image as ImageIcon, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSinglePress } from '@/hooks/useSinglePress';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPickLibrary: () => void;
  onTakePhoto: () => void;
  onPickDocument: () => void;
};

export function ChatAttachmentSheet({
  visible,
  onClose,
  onPickLibrary,
  onTakePhoto,
  onPickDocument,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handleClose = useSinglePress(onClose, 300);
  const handleLibrary = useSinglePress(() => {
    onClose();
    onPickLibrary();
  }, 450);
  const handleCamera = useSinglePress(() => {
    onClose();
    onTakePhoto();
  }, 450);
  const handleDocument = useSinglePress(() => {
    onClose();
    onPickDocument();
  }, 450);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('fe2.chat.sheet_title')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.optionRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={handleLibrary}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
              <ImageIcon size={20} color={colors.primary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {t('fe2.chat.sheet_pick_library')}
              </Text>
              <Text style={[styles.optionSub, { color: colors.subtext }]}>
                {t('fe2.chat.sheet_pick_library_sub')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={handleCamera}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.successLight }]}>
              <Camera size={20} color={colors.success} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {t('fe2.chat.sheet_take_photo')}
              </Text>
              <Text style={[styles.optionSub, { color: colors.subtext }]}>
                {t('fe2.chat.sheet_take_photo_sub')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            onPress={handleDocument}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.warningLight }]}>
              <FileText size={20} color={colors.warning} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                {t('fe2.chat.sheet_pick_document')}
              </Text>
              <Text style={[styles.optionSub, { color: colors.subtext }]}>
                {t('fe2.chat.sheet_pick_document_sub')}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={handleClose}
          >
            <Text style={[styles.cancelText, { color: colors.subtext }]}>
              {t('fe2.nearby.cancel')}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'flex-end',
    },
    sheet: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderTopWidth: 1,
      padding: 18,
      paddingBottom: 28,
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
    },
    closeBtn: {
      padding: 4,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      borderWidth: 1,
    },
    iconBox: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTextWrap: {
      flex: 1,
      gap: 2,
    },
    optionTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    optionSub: {
      fontSize: 12,
      lineHeight: 16,
    },
    cancelBtn: {
      marginTop: 4,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });

