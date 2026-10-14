import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PlaceholderScreen, StatusLabel } from '@/components/common';
import { routes, type MeetupRouteParams } from '@/constants/routes';
import { spacing } from '@/theme';

// TODO FE-07: chi tiết meetup — thành viên, trạng thái, sửa/hủy (ConfirmDialog).
// Đây cũng là đích của deep link mobile://meetup/:meetupId (FE-13).
export default function MeetupDetailScreen() {
  const { t } = useTranslation();
  const { meetupId } = useLocalSearchParams<MeetupRouteParams>();

  return (
    <PlaceholderScreen
      task="FE-07"
      title={`${t('screens.meetup_detail')} #${meetupId}`}
      links={[
        { label: t('screens.meetup_edit'), href: routes.meetupEdit(meetupId) },
        { label: t('screens.meetup_preferences'), href: routes.meetupPreferences(meetupId) },
        { label: t('fe2.recommendation.screen_title'), href: routes.meetupRecommendations(meetupId) },
        { label: t('screens.meetup_vote'), href: routes.meetupVote(meetupId) },
        { label: t('fe2.chat.screen_title'), href: routes.meetupChat(meetupId) },
      ]}
    >
      <View style={styles.row}>
        <StatusLabel kind="meetup_inviting" />
        <StatusLabel kind="member_accepted" />
      </View>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});