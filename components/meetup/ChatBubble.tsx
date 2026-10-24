/**
 * ChatBubble — Bong bóng tin nhắn trong Group Chat (FE-15)
 * Full dark mode (useTheme) + i18n (useTranslation)
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';

export type MessageStatus = 'sent' | 'pending' | 'error';

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
  status: MessageStatus;
  isOwn: boolean;
};

type Props = {
  message: ChatMessage;
  onRetry?: (messageId: string) => void;
};

function formatTime(date: Date, lang: string): string {
  return date.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

export function ChatBubble({ message, onRetry }: Props) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={[styles.wrapper, message.isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      {!message.isOwn && (
        <Text style={styles.senderName}>{message.userName}</Text>
      )}
      <View style={[
        styles.bubble,
        message.isOwn
          ? { backgroundColor: colors.ownBubble, borderBottomRightRadius: 4 }
          : { backgroundColor: colors.otherBubble, borderBottomLeftRadius: 4 },
      ]}>
        <Text style={[styles.text, { color: message.isOwn ? colors.ownBubbleText : colors.otherBubbleText }]}>
          {message.text}
        </Text>
      </View>
      <View style={[styles.footer, message.isOwn && styles.footerOwn]}>
        <Text style={[styles.time, { color: colors.placeholder }]}>{formatTime(message.timestamp, i18n.language)}</Text>
        {message.isOwn && message.status === 'pending' && (
          <Text style={[styles.statusText, { color: colors.placeholder }]}>{t('fe2.chat.status_pending')}</Text>
        )}
        {message.isOwn && message.status === 'error' && (
          <TouchableOpacity onPress={() => onRetry?.(message.id)}>
            <Text style={[styles.statusText, { color: colors.danger }]}>{t('fe2.chat.status_error')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: ReturnType<typeof import('../../hooks/useTheme').useTheme>['colors']) =>
  StyleSheet.create({
    wrapper: { marginVertical: 4, maxWidth: '80%', gap: 2 },
    wrapperOwn: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    wrapperOther: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    senderName: { fontSize: 11, color: c.placeholder, marginBottom: 2, marginLeft: 4 },
    bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
    text: { fontSize: 14, lineHeight: 20 },
    footer: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 4 },
    footerOwn: { justifyContent: 'flex-end' },
    time: { fontSize: 10 },
    statusText: { fontSize: 10, fontWeight: '600' },
  });
