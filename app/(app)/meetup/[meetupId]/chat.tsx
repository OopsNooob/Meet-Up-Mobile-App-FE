import { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { ChatBubble, ChatMessage, MessageStatus } from '@/components/meetup/ChatBubble';
import { useSocket } from '@/hooks/useSocket';
import { useSinglePress } from '@/hooks/useSinglePress';

const CURRENT_USER_ID = 'u1';
const CURRENT_USER_NAME = 'Bạn';

const INITIAL_MESSAGES: ChatMessage[] = [
  { id: 'm1', userId: 'u2', userName: 'Việt', text: 'Tụi mình gặp ở quán nào vậy?', timestamp: new Date(Date.now() - 5 * 60 * 1000), status: 'sent', isOwn: false },
  { id: 'm2', userId: 'u1', userName: CURRENT_USER_NAME, text: 'Tao thấy The Coffee House ổn nè 👍', timestamp: new Date(Date.now() - 4 * 60 * 1000), status: 'sent', isOwn: true },
  { id: 'm3', userId: 'u3', userName: 'Minh', text: 'Ok mình ở gần đó, ETA tao chỉ 8 phút thôi', timestamp: new Date(Date.now() - 3 * 60 * 1000), status: 'sent', isOwn: false },
  { id: 'm4', userId: 'u1', userName: CURRENT_USER_NAME, text: 'Đang gửi...', timestamp: new Date(Date.now() - 60 * 1000), status: 'pending', isOwn: true },
  { id: 'm5', userId: 'u1', userName: CURRENT_USER_NAME, text: 'Tin nhắn lỗi này (thử lại)', timestamp: new Date(Date.now() - 30 * 1000), status: 'error', isOwn: true },
];

export default function ChatScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isConnected] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const { emit } = useSocket();

  const handleSend = useSinglePress(() => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg: ChatMessage = { id: `m_${Date.now()}`, userId: CURRENT_USER_ID, userName: CURRENT_USER_NAME, text, timestamp: new Date(), status: 'pending', isOwn: true };
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? { ...m, status: 'sent' as MessageStatus } : m)));
    }, 800);
    emit('chat:send', { meetupId: 'meetup-1', text });
  }, 600);

  const handleRetry = useSinglePress((messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'pending' as MessageStatus } : m)));
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, status: 'sent' as MessageStatus } : m)));
    }, 800);
  }, 600);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
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
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.divider },
    input: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, maxHeight: 100, color: c.text },
    sendBtn: { backgroundColor: c.primary, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    sendIcon: { color: '#fff', fontSize: 16 },
  });
