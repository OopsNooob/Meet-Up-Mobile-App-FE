import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Paperclip, X, CalendarPlus } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  ChatAttachmentItem,
  ChatBubble,
  ChatMessage,
  MessageStatus,
} from '@/components/meetup/ChatBubble';
import { ChatAttachmentSheet } from '@/components/meetup/ChatAttachmentSheet';
import { InlineAlert } from '@/components/common/InlineAlert';
import { ErrorState } from '@/components/common/StateViews';
import { ChatSkeleton } from '@/components/common/Skeleton';
import { useFriends } from '@/hooks/useFriends';
import { useSocket } from '@/hooks/useSocket';
import { useSinglePress } from '@/hooks/useSinglePress';
import { toApiError } from '@/services/apiClient';
import type { AppError } from '@/types/async';
import {
  chatService,
  formatChatLocationText,
  mapApiChatMessageToUi,
  mergeChronologicalMessages,
  toUploadFilesFromAttachments,
} from '@/services/chatService';
import { useAuthStore } from '@/store/useAuthStore';
import { generateUuidV4 } from '@/utils/uuid';
import { routes } from '@/constants/routes';
import {
  captureChatPhoto,
  getCurrentChatLocation,
  pickChatDocuments,
  pickChatImagesFromLibrary,
} from '@/services/chatMediaService';

const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const PAGE_LIMIT = 50;

export default function DirectChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { peerId = 'u2', peerName: paramPeerName } = useLocalSearchParams<{
    peerId: string;
    peerName?: string;
  }>();

  const currentUserId = useAuthStore((s) => s.user?.id ?? 'u1');
  const { friends } = useFriends();
  const matchedFriend = friends.find((f) => f.user.id === peerId);
  const peerName = paramPeerName || matchedFriend?.user.name || `#${peerId.slice(0, 6)}`;
  const currentUserName = t('fe2.common.you');

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [olderLoaded, setOlderLoaded] = useState(false);
  const [apiError, setApiError] = useState<AppError | null>(null);
  const loadedPeerRef = useRef<string | null>(null);
  const isLoading = !hasLoadedOnce;
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentItem[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { status: socketStatus, on, off } = useSocket();

  const resolveSenderName = useCallback(
    (senderId: string) => (senderId === currentUserId ? currentUserName : peerName),
    [currentUserId, currentUserName, peerName]
  );

  const fetchLatestMessages = useCallback(async () => {
    const isPeerChanged = loadedPeerRef.current !== peerId;
    try {
      const rows = await chatService.listDirectMessages(peerId, { limit: PAGE_LIMIT });
      const mapped = rows.map((row) =>
        mapApiChatMessageToUi(row, currentUserId, resolveSenderName)
      );
      loadedPeerRef.current = peerId;
      setMessages((prev) => mergeChronologicalMessages(isPeerChanged ? [] : prev, mapped));
      setOlderLoaded(rows.length < PAGE_LIMIT);
      setApiError(null);
    } catch (err) {
      if (isPeerChanged) {
        loadedPeerRef.current = peerId;
        setMessages([]);
      }
      setApiError(toApiError(err));
    }
  }, [peerId, currentUserId, resolveSenderName]);

  useEffect(() => {
    let active = true;
    const loadInitial = async () => {
      await fetchLatestMessages();
      if (active) setHasLoadedOnce(true);
    };
    void loadInitial();
    return () => {
      active = false;
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, [fetchLatestMessages]);

  useEffect(() => {
    const handleDirectEvent = (payload: {
      senderUserId?: string;
      recipientUserId?: string;
    }) => {
      if (
        payload?.senderUserId &&
        payload.senderUserId !== peerId &&
        payload.recipientUserId !== peerId
      ) {
        return;
      }
      void fetchLatestMessages();
    };
    on('direct:chat-message', handleDirectEvent);
    on('DirectChatMessageCreated.v1', handleDirectEvent);
    return () => {
      off('direct:chat-message');
      off('DirectChatMessageCreated.v1');
    };
  }, [on, off, socketStatus, peerId, fetchLatestMessages]);

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const loadOlderMessages = useCallback(async () => {
    if (olderLoaded) return;
    const oldest = messages.find((m) => m.status === 'sent');
    if (!oldest) {
      await fetchLatestMessages();
      return;
    }
    try {
      const rows = await chatService.listDirectMessages(peerId, {
        before: oldest.timestamp.toISOString(),
        beforeId: oldest.id,
        limit: PAGE_LIMIT,
      });
      const mapped = rows.map((row) =>
        mapApiChatMessageToUi(row, currentUserId, resolveSenderName)
      );
      setMessages((prev) => mergeChronologicalMessages(mapped, prev));
      if (rows.length < PAGE_LIMIT) {
        setOlderLoaded(true);
      }
      setApiError(null);
    } catch (err) {
      setApiError(toApiError(err));
    }
  }, [olderLoaded, messages, peerId, currentUserId, resolveSenderName, fetchLatestMessages]);

  const handleLoadOlder = useSinglePress(() => {
    void loadOlderMessages();
  }, 500);

  const handleRefresh = useSinglePress(async () => {
    setIsRefreshing(true);
    await fetchLatestMessages();
    setIsRefreshing(false);
  }, 700);

  const handleInviteMeetup = useSinglePress(() => {
    router.push(routes.meetupCreate);
  }, 600);

  const handleOpenAttachmentSheet = useSinglePress(() => {
    if (pendingAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE) {
      showFeedback(t('fe2.chat.attachment_limit_reached'));
      return;
    }
    setSheetVisible(true);
  }, 350);

  const appendPickedAttachments = (items: ChatAttachmentItem[]) => {
    setPendingAttachments((prev) => {
      const remaining = MAX_ATTACHMENTS_PER_MESSAGE - prev.length;
      if (items.length > remaining) {
        showFeedback(t('fe2.chat.attachment_limit_reached'));
      }
      return [...prev, ...items.slice(0, Math.max(0, remaining))];
    });
  };

  const handlePickLibrary = async () => {
    const remaining = MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length;
    if (remaining <= 0) {
      showFeedback(t('fe2.chat.attachment_limit_reached'));
      return;
    }
    const res = await pickChatImagesFromLibrary(remaining);
    if (res.status === 'picked') appendPickedAttachments(res.items);
    else if (res.status === 'denied') showFeedback(t('fe2.chat.permission_media_denied'));
  };

  const handleTakePhoto = async () => {
    const remaining = MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length;
    if (remaining <= 0) {
      showFeedback(t('fe2.chat.attachment_limit_reached'));
      return;
    }
    const res = await captureChatPhoto();
    if (res.status === 'picked') appendPickedAttachments(res.items);
    else if (res.status === 'denied') showFeedback(t('fe2.chat.permission_media_denied'));
  };

  const handlePickDocument = async () => {
    const remaining = MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length;
    if (remaining <= 0) {
      showFeedback(t('fe2.chat.attachment_limit_reached'));
      return;
    }
    const res = await pickChatDocuments(remaining);
    if (res.status === 'picked') appendPickedAttachments(res.items);
  };

  const handleRemovePendingAttachment = (attId: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== attId));
  };

  const canSend = inputText.trim().length > 0 || pendingAttachments.length > 0;

  const sendOptimisticMessage = async (newMsg: ChatMessage, outboundText?: string) => {
    const clientMessageId = newMsg.clientMessageId || newMsg.id;
    try {
      const serverMsg = await chatService.sendDirectMessage(peerId, {
        clientMessageId,
        text: outboundText !== undefined ? outboundText : newMsg.text || undefined,
        files: toUploadFilesFromAttachments(newMsg.attachments),
      });
      const mapped = mapApiChatMessageToUi(serverMsg, currentUserId, resolveSenderName);
      setMessages((prev) =>
        mergeChronologicalMessages(
          prev.filter((m) => m.id !== newMsg.id && m.clientMessageId !== clientMessageId),
          [mapped]
        )
      );
      setApiError(null);
    } catch (err) {
      const parsed = toApiError(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newMsg.id || m.clientMessageId === clientMessageId
            ? { ...m, status: 'error' as MessageStatus }
            : m
        )
      );
      showFeedback(t(`errors.${parsed.code}.description` as any));
    }
  };

  const handleSend = useSinglePress(async () => {
    const text = inputText.trim();
    if (!text && pendingAttachments.length === 0) return;
    const attachmentsToSend =
      pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;
    const clientMessageId = generateUuidV4();
    const newMsg: ChatMessage = {
      id: clientMessageId,
      clientMessageId,
      userId: currentUserId,
      userName: currentUserName,
      text,
      timestamp: new Date(),
      status: 'pending',
      isOwn: true,
      attachments: attachmentsToSend,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setPendingAttachments([]);
    await sendOptimisticMessage(newMsg);
  }, 450);

  const handleShareLocation = useSinglePress(async () => {
    if (isLocating) return;
    setIsLocating(true);
    try {
      const res = await getCurrentChatLocation();
      if (res.status === 'denied') {
        showFeedback(t('fe2.chat.permission_location_denied'));
        return;
      }
      if (res.status === 'error') {
        showFeedback(t('fe2.chat.location_fetch_error'));
        return;
      }

      const clientMessageId = generateUuidV4();
      const locationText = formatChatLocationText(res.location);
      const newMsg: ChatMessage = {
        id: clientMessageId,
        clientMessageId,
        userId: currentUserId,
        userName: currentUserName,
        text: '',
        timestamp: new Date(),
        status: 'pending',
        isOwn: true,
        location: res.location,
      };
      setMessages((prev) => [...prev, newMsg]);
      await sendOptimisticMessage(newMsg, locationText);
    } finally {
      setIsLocating(false);
    }
  }, 700);

  const handleRetry = useSinglePress(async (messageId: string) => {
    const failedMsg = messages.find((m) => m.id === messageId);
    if (!failedMsg) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: 'pending' as MessageStatus } : m))
    );
    const outboundText = failedMsg.location
      ? formatChatLocationText(failedMsg.location)
      : failedMsg.text || undefined;
    await sendOptimisticMessage(failedMsg, outboundText);
  }, 600);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: peerName,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleInviteMeetup}
              style={{ padding: 6 }}
              accessibilityLabel={t('fe2.map.invite_to_meetup')}
            >
              <CalendarPlus size={19} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Peer status bar */}
      <View
        style={[
          styles.peerSubBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.peerSubText, { color: colors.subtext }]} numberOfLines={1}>
          {t('fe2.direct_chat.subtitle_with_peer', { name: peerName })}
        </Text>
        <TouchableOpacity
          style={[styles.inviteBtn, { backgroundColor: colors.primaryLight }]}
          onPress={handleInviteMeetup}
        >
          <Text style={[styles.inviteBtnText, { color: colors.primary }]}>
            {t('fe2.map.invite_to_meetup')}
          </Text>
        </TouchableOpacity>
      </View>

      {feedbackBanner && (
        <View
          style={[
            styles.feedbackBanner,
            { backgroundColor: colors.warningLight, borderBottomColor: colors.warning },
          ]}
        >
          <Text style={[styles.feedbackBannerText, { color: colors.warning }]}>
            {feedbackBanner}
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1 }}>
          <ChatSkeleton />
        </View>
      ) : apiError && messages.length === 0 ? (
        <ErrorState error={apiError} onRetry={handleRefresh} />
      ) : (
        <>
          {apiError && (
            <View style={{ padding: 8 }}>
              <InlineAlert
                tone="danger"
                title={t(`errors.${apiError.code}.title` as any)}
                message={t(`errors.${apiError.code}.description` as any)}
              />
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                progressBackgroundColor={colors.surface}
              />
            }
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.loadOlderBtn, { backgroundColor: colors.surfaceAlt }]}
                onPress={handleLoadOlder}
                disabled={olderLoaded}
              >
                <Text
                  style={[
                    styles.loadOlderText,
                    { color: olderLoaded ? colors.placeholder : colors.primary },
                  ]}
                >
                  {olderLoaded ? t('fe2.chat.older_loaded') : t('fe2.chat.load_older_btn')}
                </Text>
              </TouchableOpacity>
            }
            renderItem={({ item }) => <ChatBubble message={item} onRetry={handleRetry} />}
            contentContainerStyle={styles.list}
          />
        </>
      )}

      {pendingAttachments.length > 0 && (
        <View
          style={[
            styles.pendingStrip,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <Text style={[styles.pendingCountText, { color: colors.subtext }]}>
            {t('fe2.chat.pending_attachments_label', {
              count: pendingAttachments.length,
              max: MAX_ATTACHMENTS_PER_MESSAGE,
            })}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pendingScroll}
          >
            {pendingAttachments.map((att) => (
              <View
                key={att.id}
                style={[
                  styles.pendingChip,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                {att.kind === 'image' && att.uri ? (
                  <Image source={{ uri: att.uri }} style={styles.pendingThumb} />
                ) : (
                  <Text style={{ fontSize: 13 }}>📄</Text>
                )}
                <Text
                  style={[styles.pendingChipText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {att.fileName}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemovePendingAttachment(att.id)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <X size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[
            styles.actionIconBtn,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
          onPress={handleOpenAttachmentSheet}
          accessibilityLabel={t('fe2.chat.attach_file_btn')}
        >
          <Paperclip size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionIconBtn,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
          onPress={handleShareLocation}
          disabled={isLocating}
          accessibilityLabel={t('fe2.chat.share_location_btn')}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MapPin size={18} color={colors.primary} />
          )}
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={t('fe2.chat.input_placeholder')}
          placeholderTextColor={colors.placeholder}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
        />

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && { backgroundColor: colors.border }]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>

      <ChatAttachmentSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onPickLibrary={handlePickLibrary}
        onTakePhoto={handleTakePhoto}
        onPickDocument={handlePickDocument}
      />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    peerSubBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
      gap: 8,
    },
    peerSubText: { fontSize: 12, flex: 1 },
    inviteBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    inviteBtnText: { fontSize: 11, fontWeight: '700' },
    feedbackBanner: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
    },
    feedbackBannerText: {
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 17,
    },
    loadOlderBtn: {
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      marginBottom: 10,
    },
    loadOlderText: { fontSize: 12, fontWeight: '600' },
    list: { padding: 16, gap: 2 },
    pendingStrip: {
      borderTopWidth: 1,
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
      gap: 6,
    },
    pendingCountText: {
      fontSize: 11,
      fontWeight: '600',
    },
    pendingScroll: {
      gap: 8,
      paddingVertical: 2,
    },
    pendingChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      maxWidth: 215,
    },
    pendingThumb: {
      width: 26,
      height: 26,
      borderRadius: 6,
    },
    pendingChipText: {
      fontSize: 12,
      fontWeight: '600',
      flexShrink: 1,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    actionIconBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    input: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 8,
      fontSize: 14,
      maxHeight: 100,
      color: c.text,
    },
    sendBtn: {
      backgroundColor: c.primary,
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendIcon: { color: '#fff', fontSize: 16 },
  });
