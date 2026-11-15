import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MapPinned, MessageCircle, SlidersHorizontal, Vote, type LucideIcon } from 'lucide-react-native';
import { Button, Card } from '@/components/common';
import { routes } from '@/constants/routes';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, spacing } from '@/theme';
import type { Href } from 'expo-router';

export function MeetupFeatureLinks({ meetupId }: { meetupId: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const links: { label: string; icon: LucideIcon; href: Href }[] = [
    { label: t('screens.meetup_preferences'), icon: SlidersHorizontal, href: routes.meetupPreferences(meetupId) },
    { label: t('fe2.recommendation.screen_title'), icon: MapPinned, href: routes.meetupRecommendations(meetupId) },
    { label: t('screens.meetup_vote'), icon: Vote, href: routes.meetupVote(meetupId) },
    { label: t('fe2.chat.screen_title'), icon: MessageCircle, href: routes.meetupChat(meetupId) },
  ];

  return (
    <Card style={styles.card}>
      <Text style={[styles.heading, { color: colors.text }]} accessibilityRole="header">
        {t('meetup.detail.activities_title')}
      </Text>
      <View style={styles.links}>
        {links.map((link) => (
          <Button
            key={link.label}
            label={link.label}
            icon={link.icon}
            variant="secondary"
            fullWidth
            onPress={() => router.push(link.href)}
          />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  links: { gap: spacing.sm },
});
