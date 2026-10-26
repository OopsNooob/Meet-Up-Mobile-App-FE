import { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { ChatBubble, ChatMessage, MessageStatus } from '@/components/meetup/ChatBubble';
import { useSocket } from '@/hooks/useSocket';
import { useSinglePress } from '@/hooks/useSinglePress';
import { MapPin, Sparkles } from 'lucide-react-native';
import { routes } from '@/constants/routes';

const CURRENT_USER_ID = 'u1';

function getInitialMessages(t: (key: string) => string): ChatMessage[] {
  const currentUserName = t('fe2.common.you');
  return [
    { id: 'm1', userId: 'u2', userName: 'Việt', text: t('fe2.chat.mock_msg_1'), timestamp: new Date(Date.now() - 5 * 60 * 1000), status: 'sent', isOwn: false },
    { id: 'm2', userId: 'u1', userName: currentUserName, text: t('fe2.chat.mock_msg_2'), timestamp: new Date(Date.now() - 4 * 60 * 1000), status: 'sent', isOwn: true },
    { id: 'm3', userId: 'u3', userName: 'Minh', text: t('fe2.chat.mock_msg_3'), timestamp: new Date(Date.now() - 3 * 60 * 1000), status: 'sent', isOwn: false },
    { id: 'm4', userId: 'u1', userName: currentUserName, text: t('fe2.chat.mock_msg_pending'), timestamp: new Date(Date.now() - 60 * 1000), status: 'pending', isOwn: true },
    { id: 'm5', userId: 'u1', userName: currentUserName, text: t('fe2.chat.mock_msg_error'), timestamp: new Date(Date.now() - 30 * 1000), status: 'error', isOwn: true },
  ];
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { meetupId = 'meetup-1' } = useLocalSearchParams<{ meetupId: string }>();

  const currentUserName = t('fe2.common.you');
  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages(t));
  const [inputText, setInputText] = useState('');
  const [isConnected] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { emit } = useSocket();

  const handleSend = useSinglePress(() => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: ChatMessage = { id: `m_${Date.now()}`, userId: CURRENT_USER_ID, userName: currentUserName, text, timestamp: new Date(), status: 'pending', isOwn: true };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as MessageStatus } : m)));
    }, 800);
    emit('chat:send', { meetupId, text });
  }, 600);

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
  }, 800);

  const handleRetry = useSinglePress((messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'pending' as MessageStatus } : m)));
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'sent' as MessageStatus } : m)));
    }, 800);
  }, 600);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
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
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t('fe2.chat.offline_banner')}</Text>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} onRetry={handleRetry} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={[styles.locationBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
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
    offlineBanner: { backgroundColor: c.dangerLight, paddingHorizontal: 16, paddingVertical: 8 },
    offlineText: { fontSize: 12, color: c.danger, textAlign: 'center' },
    list: { padding: 16, gap: 2 },
    inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.divider },
    locationBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    input: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, maxHeight: 100, color: c.text },
    sendBtn: { backgroundColor: c.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    sendIcon: { color: '#fff', fontSize: 16 },
  });
