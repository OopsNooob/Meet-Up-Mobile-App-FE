import { useState, useRef, useMemo, useEffect } from 'react';
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
import { MapPin, Sparkles, Paperclip, X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  ChatAttachmentItem,
  ChatBubble,
  ChatMessage,
  MessageStatus,
} from '@/components/meetup/ChatBubble';
import { ChatAttachmentSheet } from '@/components/meetup/ChatAttachmentSheet';
import { ChatSkeleton } from '@/components/common/Skeleton';
import { useSocket } from '@/hooks/useSocket';
import { useSinglePress } from '@/hooks/useSinglePress';
import { routes } from '@/constants/routes';
import {
  selectComputedRecommendations,
  useRecommendationStore,
} from '@/store/useRecommendationStore';
import {
  captureChatPhoto,
  getCurrentChatLocation,
  pickChatDocuments,
  pickChatImagesFromLibrary,
} from '@/services/chatMediaService';

const CURRENT_USER_ID = 'u1';
const MAX_ATTACHMENTS_PER_MESSAGE = 5;

function getInitialMessages(t: (key: string) => string): ChatMessage[] {
  const currentUserName = t('fe2.common.you');
  return [
    {
      id: 'm1',
      userId: 'u2',
      userName: 'Việt',
      text: t('fe2.chat.mock_msg_1'),
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'sent',
      isOwn: false,
    },
    {
      id: 'm2',
      userId: 'u1',
      userName: currentUserName,
      text: t('fe2.chat.mock_msg_2'),
      timestamp: new Date(Date.now() - 4 * 60 * 1000),
      status: 'sent',
      isOwn: true,
    },
    {
      id: 'm3',
      userId: 'u3',
      userName: 'Minh',
      text: t('fe2.chat.mock_msg_3'),
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      status: 'sent',
      isOwn: false,
      attachments: [
        {
          id: 'att_init_1',
          fileName: 'menu-the-coffee-house.png',
          mimeType: 'image/png',
          bytes: 332 * 1024,
          kind: 'image',
          uri: Image.resolveAssetSource(require('@/assets/images/logo-glow.png'))?.uri,
        },
      ],
    },
    {
      id: 'm4',
      userId: 'u1',
      userName: currentUserName,
      text: t('fe2.chat.mock_msg_pending'),
      timestamp: new Date(Date.now() - 60 * 1000),
      status: 'pending',
      isOwn: true,
    },
    {
      id: 'm5',
      userId: 'u1',
      userName: currentUserName,
      text: t('fe2.chat.mock_msg_error'),
      timestamp: new Date(Date.now() - 30 * 1000),
      status: 'error',
      isOwn: true,
    },
  ];
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { meetupId = 'meetup-1' } = useLocalSearchParams<{ meetupId: string }>();

  const storeState = useRecommendationStore();
  const { places } = useMemo(
    () => selectComputedRecommendations(storeState),
    [storeState]
  );

  const pinnedPlace = useMemo(() => {
    if (storeState.finalizedCandidateKey) {
      return (
        places.find((p) => p.canonicalCandidateKey === storeState.finalizedCandidateKey) ??
        places[0]
      );
    }
    return places[0];
  }, [places, storeState.finalizedCandidateKey]);

  const currentUserName = t('fe2.common.you');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages(t));
  const [olderLoaded, setOlderLoaded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachmentItem[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { emit } = useSocket();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 550);
    return () => {
      clearTimeout(timer);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const showFeedback = (msg: string) => {
    setFeedbackBanner(msg);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setFeedbackBanner(null), 3500);
  };

  const prependOlderMessages = () => {
    if (olderLoaded) return;
    const olderMsgs: ChatMessage[] = [
      {
        id: 'm_old_1',
        userId: 'u2',
        userName: 'Việt',
        text: t('fe2.chat.older_msg_1'),
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'sent',
        isOwn: false,
      },
      {
        id: 'm_old_2',
        userId: 'u3',
        userName: 'Minh',
        text: t('fe2.chat.older_msg_2'),
        timestamp: new Date(Date.now() - 12 * 60 * 1000),
        status: 'sent',
        isOwn: false,
      },
    ];
    setMessages((prev) => [...olderMsgs, ...prev]);
    setOlderLoaded(true);
  };

  const handleLoadOlder = useSinglePress(() => {
    prependOlderMessages();
  }, 500);

  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      prependOlderMessages();
      setIsRefreshing(false);
    }, 650);
  }, 700);

  const handleOpenRecommendations = useSinglePress(() => {
    router.push(routes.meetupRecommendations(meetupId));
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

  const handleSend = useSinglePress(() => {
    const text = inputText.trim();
    if (!text && pendingAttachments.length === 0) return;
    const attachmentsToSend =
      pendingAttachments.length > 0 ? [...pendingAttachments] : undefined;
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      userId: CURRENT_USER_ID,
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

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as MessageStatus } : m))
      );
    }, 650);
    emit('meetup:chat-message', {
      eventId: newMsg.id,
      meetupId,
      text,
      attachmentsCount: attachmentsToSend?.length ?? 0,
    });
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

      const newMsg: ChatMessage = {
        id: `m_${Date.now()}`,
        userId: CURRENT_USER_ID,
        userName: currentUserName,
        text: '',
        timestamp: new Date(),
        status: 'pending',
        isOwn: true,
        location: res.location,
      };
      setMessages((prev) => [...prev, newMsg]);
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as MessageStatus } : m))
        );
      }, 600);
      emit('meetup:chat-message', {
        eventId: newMsg.id,
        meetupId,
        text: res.location.address || `${res.location.latitude},${res.location.longitude}`,
      });
    } finally {
      setIsLocating(false);
    }
  }, 700);

  const handleRetry = useSinglePress((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, status: 'pending' as MessageStatus } : m))
    );
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, status: 'sent' as MessageStatus } : m))
      );
    }, 700);
  }, 600);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={handleOpenRecommendations}
              style={{ padding: 6, marginRight: 2 }}
              accessibilityLabel={t('fe2.recommendation.screen_title')}
            >
              <Sparkles size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Pinned Meetup Place Bar */}
      {pinnedPlace && (
        <View
          style={[
            styles.pinnedBar,
            { backgroundColor: colors.surface, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.pinnedText, { color: colors.text }]} numberOfLines={1}>
            {t('fe2.chat.pinned_place_prefix')}{' '}
            <Text style={{ fontWeight: '700' }}>{pinnedPlace.name}</Text>
          </Text>
          <TouchableOpacity
            style={[styles.pinnedBtn, { backgroundColor: colors.primaryLight }]}
            onPress={handleOpenRecommendations}
          >
            <Text style={[styles.pinnedBtnText, { color: colors.primary }]}>
              {t('fe2.chat.view_places_btn')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
      ) : (
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
      )}

      {/* Pending Attachments Strip */}
      {pendingAttachments.length > 0 && (
        <View
          style={[
            styles.pendingStrip,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.pendingHeaderRow}>
            <Text style={[styles.pendingCountText, { color: colors.subtext }]}>
              {t('fe2.chat.pending_attachments_label', {
                count: pendingAttachments.length,
                max: MAX_ATTACHMENTS_PER_MESSAGE,
              })}
            </Text>
          </View>
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
    pinnedBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderBottomWidth: 1,
      gap: 8,
    },
    pinnedText: { fontSize: 12, flex: 1 },
    pinnedBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    pinnedBtnText: { fontSize: 11, fontWeight: '700' },
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
    pendingHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
