/**
 * ChatBubble — Bong bóng tin nhắn trong Group Chat & Direct Chat
 * Hỗ trợ hiển thị ảnh thật, xem ảnh phóng to, tải ảnh & tệp thật về máy và thẻ vị trí GPS mở bản đồ
 */
import { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Image as ImageIcon,
  Download,
  MapPin,
  ExternalLink,
  X,
  Check,
} from 'lucide-react-native';
import { useTheme } from '../../hooks/useTheme';
import { useSinglePress } from '../../hooks/useSinglePress';
import { downloadChatAttachmentToDevice } from '@/services/chatMediaService';

export type MessageStatus = 'sent' | 'pending' | 'error';

export type ChatAttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  bytes: number;
  kind: 'image' | 'file';
  uri?: string;
  width?: number;
  height?: number;
  expiresInMinutes?: number;
};

export type ChatLocationData = {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  status: MessageStatus;
  isOwn: boolean;
  attachments?: ChatAttachmentItem[];
  location?: ChatLocationData;
};

type Props = {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ChatBubble({ message, onRetry }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [previewImage, setPreviewImage] = useState<ChatAttachmentItem | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  const handleRetry = useSinglePress(() => onRetry?.(message.id), 400);

  const handleOpenImagePreview = useSinglePress((att: ChatAttachmentItem) => {
    setPreviewImage(att);
  }, 350);

  const handleDownloadAttachment = useSinglePress(async (att: ChatAttachmentItem) => {
    if (downloadingId) return;
    setDownloadingId(att.id);
    setInlineNotice(null);
    try {
      const res = await downloadChatAttachmentToDevice(att);
      if (res.status === 'saved') {
        setSavedIds((prev) => ({ ...prev, [att.id]: true }));
        setInlineNotice(t('fe2.chat.download_success', { name: att.fileName }));
      } else if (res.status === 'error') {
        setInlineNotice(t('fe2.chat.download_error'));
      }
    } finally {
      setDownloadingId(null);
    }
  }, 500);

  const handleOpenLocationMap = useSinglePress((loc: ChatLocationData) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
    Linking.openURL(url).catch(() => {
      setInlineNotice(t('fe2.common.maps_open_error'));
    });
  }, 500);

  const hasText = message.text.trim().length > 0;
  const attachments = message.attachments ?? [];

  return (
    <View style={[styles.wrapper, message.isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      {!message.isOwn && (
        <Text style={styles.senderName}>{message.userName}</Text>
      )}
      <View
        style={[
          styles.bubble,
          message.isOwn
            ? { backgroundColor: colors.ownBubble, borderBottomRightRadius: 4 }
            : { backgroundColor: colors.otherBubble, borderBottomLeftRadius: 4 },
        ]}
      >
        {attachments.length > 0 && (
          <View style={styles.attachmentList}>
            {attachments.map((att) => {
              const isImg = att.kind === 'image' || att.mimeType.startsWith('image/');
              const isBusy = downloadingId === att.id;
              const isSaved = Boolean(savedIds[att.id]);

              if (isImg && att.uri) {
                return (
                  <View
                    key={att.id}
                    style={[
                      styles.imageAttachmentWrap,
                      {
                        borderColor: message.isOwn
                          ? 'rgba(255,255,255,0.28)'
                          : colors.border,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleOpenImagePreview(att)}
                      activeOpacity={0.88}
                    >
                      <Image
                        source={{ uri: att.uri }}
                        style={styles.attachmentImagePreview}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                    <View
                      style={[
                        styles.imageMetaBar,
                        {
                          backgroundColor: message.isOwn
                            ? 'rgba(0,0,0,0.35)'
                            : colors.surface,
                        },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.attachmentName,
                            { color: message.isOwn ? '#fff' : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {att.fileName}
                        </Text>
                        <Text
                          style={[
                            styles.attachmentSub,
                            { color: message.isOwn ? 'rgba(255,255,255,0.85)' : colors.subtext },
                          ]}
                        >
                          {formatFileSize(att.bytes)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.imageDownloadBtn,
                          {
                            backgroundColor: message.isOwn
                              ? 'rgba(255,255,255,0.2)'
                              : colors.primaryLight,
                          },
                        ]}
                        onPress={() => handleDownloadAttachment(att)}
                        disabled={isBusy}
                        accessibilityLabel={t('fe2.chat.download_btn')}
                      >
                        {isBusy ? (
                          <ActivityIndicator
                            size="small"
                            color={message.isOwn ? '#fff' : colors.primary}
                          />
                        ) : isSaved ? (
                          <Check size={14} color={message.isOwn ? '#bbf7d0' : colors.success} />
                        ) : (
                          <Download size={14} color={message.isOwn ? '#fff' : colors.primary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={att.id}
                  style={[
                    styles.attachmentCard,
                    {
                      backgroundColor: message.isOwn
                        ? 'rgba(255,255,255,0.16)'
                        : colors.surface,
                      borderColor: message.isOwn
                        ? 'rgba(255,255,255,0.28)'
                        : colors.border,
                    },
                  ]}
                  onPress={() => handleDownloadAttachment(att)}
                  disabled={isBusy}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.attachmentIconBox,
                      {
                        backgroundColor: message.isOwn
                          ? 'rgba(255,255,255,0.22)'
                          : colors.primaryLight,
                      },
                    ]}
                  >
                    {isImg ? (
                      <ImageIcon
                        size={16}
                        color={message.isOwn ? colors.ownBubbleText : colors.primary}
                      />
                    ) : (
                      <FileText
                        size={16}
                        color={message.isOwn ? colors.ownBubbleText : colors.primary}
                      />
                    )}
                  </View>
                  <View style={styles.attachmentMetaWrap}>
                    <Text
                      style={[
                        styles.attachmentName,
                        { color: message.isOwn ? colors.ownBubbleText : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {att.fileName}
                    </Text>
                    <Text
                      style={[
                        styles.attachmentSub,
                        {
                          color: message.isOwn
                            ? 'rgba(255,255,255,0.82)'
                            : colors.subtext,
                        },
                      ]}
                    >
                      {isBusy
                        ? t('fe2.chat.downloading_file')
                        : `${formatFileSize(att.bytes)} • ${
                            isSaved
                              ? t('fe2.chat.downloaded_badge')
                              : t('fe2.chat.download_btn')
                          }`}
                    </Text>
                  </View>
                  {isBusy ? (
                    <ActivityIndicator
                      size="small"
                      color={message.isOwn ? colors.ownBubbleText : colors.primary}
                    />
                  ) : isSaved ? (
                    <Check size={15} color={message.isOwn ? '#bbf7d0' : colors.success} />
                  ) : (
                    <Download
                      size={15}
                      color={message.isOwn ? colors.ownBubbleText : colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {message.location && (
          <TouchableOpacity
            style={[
              styles.locationCard,
              {
                backgroundColor: message.isOwn
                  ? 'rgba(255,255,255,0.16)'
                  : colors.surface,
                borderColor: message.isOwn
                  ? 'rgba(255,255,255,0.28)'
                  : colors.border,
              },
            ]}
            onPress={() => message.location && handleOpenLocationMap(message.location)}
            activeOpacity={0.85}
          >
            <View style={styles.locationHeader}>
              <View
                style={[
                  styles.locationIconWrap,
                  {
                    backgroundColor: message.isOwn
                      ? 'rgba(255,255,255,0.24)'
                      : colors.primaryLight,
                  },
                ]}
              >
                <MapPin
                  size={16}
                  color={message.isOwn ? colors.ownBubbleText : colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.locationTitle,
                  { color: message.isOwn ? colors.ownBubbleText : colors.text },
                ]}
              >
                {t('fe2.chat.location_card_title')}
              </Text>
              <ExternalLink
                size={13}
                color={message.isOwn ? colors.ownBubbleText : colors.primary}
              />
            </View>

            {message.location.address ? (
              <Text
                style={[
                  styles.locationAddress,
                  { color: message.isOwn ? colors.ownBubbleText : colors.text },
                ]}
                numberOfLines={2}
              >
                {message.location.address}
              </Text>
            ) : null}

            <Text
              style={[
                styles.locationCoords,
                {
                  color: message.isOwn
                    ? 'rgba(255,255,255,0.82)'
                    : colors.subtext,
                },
              ]}
            >
              {t('fe2.chat.coordinates_label', {
                lat: message.location.latitude.toFixed(5),
                lng: message.location.longitude.toFixed(5),
              })}
            </Text>

            <View
              style={[
                styles.openMapPill,
                {
                  backgroundColor: message.isOwn
                    ? 'rgba(255,255,255,0.22)'
                    : colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.openMapPillText,
                  { color: message.isOwn ? colors.ownBubbleText : colors.primary },
                ]}
              >
                {t('fe2.chat.open_in_maps_btn')}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {hasText && (
          <Text
            style={[
              styles.text,
              { color: message.isOwn ? colors.ownBubbleText : colors.otherBubbleText },
            ]}
          >
            {message.text}
          </Text>
        )}

        {inlineNotice ? (
          <Text
            style={[
              styles.inlineNotice,
              { color: message.isOwn ? '#fde68a' : colors.primary },
            ]}
          >
            {inlineNotice}
          </Text>
        ) : null}
      </View>

      <View style={[styles.footer, message.isOwn && styles.footerOwn]}>
        <Text style={[styles.time, { color: colors.placeholder }]}>
          {formatTime(message.timestamp)}
        </Text>
        {message.isOwn && message.status === 'pending' && (
          <Text style={[styles.statusText, { color: colors.placeholder }]}>
            {t('fe2.chat.status_pending')}
          </Text>
        )}
        {message.isOwn && message.status === 'error' && (
          <TouchableOpacity onPress={handleRetry}>
            <Text style={[styles.statusText, { color: colors.danger }]}>
              {t('fe2.chat.status_error')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Full-screen Image Viewer Modal with Download Action */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View style={styles.imageModalBackdrop}>
          <View style={styles.imageModalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.imageModalTitle} numberOfLines={1}>
                {previewImage?.fileName}
              </Text>
              {previewImage ? (
                <Text style={styles.imageModalSub}>{formatFileSize(previewImage.bytes)}</Text>
              ) : null}
            </View>
            {previewImage ? (
              <TouchableOpacity
                onPress={() => handleDownloadAttachment(previewImage)}
                style={styles.imageModalDownloadBtn}
                disabled={downloadingId === previewImage.id}
              >
                {downloadingId === previewImage.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : savedIds[previewImage.id] ? (
                  <Check size={16} color="#4ade80" />
                ) : (
                  <Download size={16} color="#fff" />
                )}
                <Text style={styles.imageModalDownloadText}>
                  {savedIds[previewImage.id]
                    ? t('fe2.chat.downloaded_badge')
                    : t('fe2.chat.download_btn')}
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => setPreviewImage(null)}
              style={styles.imageModalClose}
              accessibilityLabel={t('fe2.common.understood')}
            >
              <X size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {inlineNotice ? (
            <View style={styles.imageModalToast}>
              <Text style={styles.imageModalToastText}>{inlineNotice}</Text>
            </View>
          ) : null}

          {previewImage?.uri ? (
            <Image
              source={{ uri: previewImage.uri }}
              style={styles.imageModalFull}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    wrapper: { marginVertical: 4, maxWidth: '82%', gap: 2 },
    wrapperOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    wrapperOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    senderName: { fontSize: 11, color: c.placeholder, marginBottom: 2, marginLeft: 4 },
    bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
    attachmentList: { gap: 6, minWidth: 210 },
    imageAttachmentWrap: {
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
    },
    attachmentImagePreview: {
      width: 220,
      height: 155,
      backgroundColor: '#111827',
    },
    imageMetaBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    imageDownloadBtn: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachmentCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 10,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    attachmentIconBox: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    attachmentMetaWrap: {
      flex: 1,
      gap: 1,
    },
    attachmentName: {
      fontSize: 12,
      fontWeight: '700',
    },
    attachmentSub: {
      fontSize: 10,
    },
    locationCard: {
      minWidth: 220,
      borderRadius: 12,
      borderWidth: 1,
      padding: 10,
      gap: 6,
    },
    locationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    locationIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    locationTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
    },
    locationAddress: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '500',
    },
    locationCoords: {
      fontSize: 11,
      fontWeight: '500',
    },
    openMapPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      marginTop: 2,
    },
    openMapPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    text: { fontSize: 14, lineHeight: 20 },
    inlineNotice: { fontSize: 11, fontWeight: '600' },
    footer: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 4 },
    footerOwn: { justifyContent: 'flex-end' },
    time: { fontSize: 10 },
    statusText: { fontSize: 10, fontWeight: '600' },
    imageModalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'center',
    },
    imageModalHeader: {
      position: 'absolute',
      top: 46,
      left: 16,
      right: 16,
      zIndex: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    imageModalTitle: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    imageModalSub: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
    },
    imageModalDownloadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
      backgroundColor: 'rgba(37, 99, 235, 0.9)',
    },
    imageModalDownloadText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    imageModalClose: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageModalToast: {
      position: 'absolute',
      bottom: 42,
      alignSelf: 'center',
      zIndex: 10,
      backgroundColor: 'rgba(17, 24, 39, 0.9)',
      borderColor: 'rgba(255,255,255,0.2)',
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 14,
    },
    imageModalToastText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    imageModalFull: {
      width: '100%',
      height: '76%',
    },
  });
