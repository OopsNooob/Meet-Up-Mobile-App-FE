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
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPin, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { ChatBubble, ChatMessage, MessageStatus } from '@/components/meetup/ChatBubble';
import { ChatSkeleton } from '@/components/common/Skeleton';
import { useSocket } from '@/hooks/useSocket';
import { useSinglePress } from '@/hooks/useSinglePress';
import { routes } from '@/constants/routes';
import {
  selectComputedRecommendations,
  useRecommendationStore,
} from '@/store/useRecommendationStore';

const CURRENT_USER_ID = 'u1';

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
  const flatListRef = useRef<FlatList>(null);
  const { emit } = useSocket();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 550);
    return () => clearTimeout(timer);
  }, []);

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

  // Pull-to-Refresh at top of chat list loads older messages
  const handleRefresh = useSinglePress(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      prependOlderMessages();
      setIsRefreshing(false);
    }, 650);
  }, 700);

  const handleSend = useSinglePress(() => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      userId: CURRENT_USER_ID,
      userName: currentUserName,
      text,
      timestamp: new Date(),
      status: 'pending',
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as MessageStatus } : m))
      );
    }, 650);
    emit('chat:send', { meetupId, text });
  }, 500);

  const handleShareLocation = useSinglePress(() => {
    const locText = t('fe2.chat.location_shared_msg');
    const newMsg: ChatMessage = {
      id: `m_${Date.now()}`,
      userId: CURRENT_USER_ID,
      userName: currentUserName,
      text: locText,
      timestamp: new Date(),
      status: 'pending',
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as MessageStatus } : m))
      );
    }, 600);
    emit('chat:send', { meetupId, text: locText });
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
              onPress={() => router.push(routes.meetupRecommendations(meetupId))}
              style={{ padding: 6, marginRight: 4 }}
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
            onPress={() => router.push(routes.meetupRecommendations(meetupId))}
          >
            <Text style={[styles.pinnedBtnText, { color: colors.primary }]}>
              {t('fe2.chat.view_places_btn')}
            </Text>
          </TouchableOpacity>
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

      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[
            styles.locationBtn,
            { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
          ]}
          onPress={handleShareLocation}
          accessibilityLabel={t('fe2.chat.share_location_btn')}
        >
          <MapPin size={18} color={colors.primary} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={t('fe2.chat.input_placeholder')}
          placeholderTextColor={colors.placeholder}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && { backgroundColor: colors.border }]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
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
    loadOlderBtn: {
      alignSelf: 'center',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
      marginBottom: 10,
    },
    loadOlderText: { fontSize: 12, fontWeight: '600' },
    list: { padding: 16, gap: 2 },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 12,
      backgroundColor: c.surface,
      borderTopWidth: 1,
      borderTopColor: c.divider,
    },
    locationBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    input: {
      flex: 1,
      backgroundColor: c.surfaceAlt,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      fontSize: 14,
      maxHeight: 100,
      color: c.text,
    },
    sendBtn: {
      backgroundColor: c.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendIcon: { color: '#fff', fontSize: 16 },
  });
