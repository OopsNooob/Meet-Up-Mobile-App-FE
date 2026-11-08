import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react-native';
import { AsyncView, Screen, TextField } from '@/components/common';
import { FriendRow } from '@/components/friend/FriendRow';
import { RelationshipActions } from '@/components/friend/RelationshipActions';
import { useUserSearch, SEARCH_MIN_LENGTH } from '@/hooks/useUserSearch';
import { useTheme } from '@/hooks/useTheme';
import { useFriendStore } from '@/store/useFriendStore';
import { fontSize, spacing } from '@/theme';

// FE-03: tìm người dùng theo tên/email và gửi lời mời. Không có nút kết bạn với chính mình.
export default function FriendSearchScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const { state, retry } = useUserSearch(query);

  // Quan hệ trên từng kết quả suy ra từ danh sách bạn/lời mời → cần danh sách mới nhất
  useFocusEffect(
    useCallback(() => {
      void useFriendStore.getState().refreshAll();
    }, []),
  );

  return (
    <Screen scroll keyboardAvoiding>
      <TextField
        value={query}
        onChangeText={setQuery}
        placeholder={t('friend.search_placeholder')}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        returnKeyType="search"
        accessibilityLabel={t('friend.search_placeholder')}
      />

      {state === null ? (
        <Text style={[styles.hint, { color: colors.subtext }]}>
          {t('friend.search_hint', { count: SEARCH_MIN_LENGTH })}
        </Text>
      ) : (
        <AsyncView
          state={state}
          onRetry={retry}
          empty={{ icon: SearchX, title: t('friend.search_empty_title'), description: t('friend.search_empty_description') }}
        >
          {(results) => (
            <View style={styles.list}>
              {results.map((result) => (
                <FriendRow
                  key={result.user.id}
                  user={result.user}
                  actions={<RelationshipActions user={result.user} fallback={result.relationship} />}
                />
              ))}
            </View>
          )}
        </AsyncView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.xl },
  list: { gap: spacing.sm },
});
