import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Construction } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { fontSize, fontWeight, iconSize, spacing } from '@/theme';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Screen, type ScreenProps } from './Screen';

export interface PlaceholderLink {
  label: string;
  href: Href;
}

export interface PlaceholderScreenProps {
  /** Mã task sẽ làm màn này, vd. "FE-07". */
  task: string;
  title: string;
  description?: string;
  /** Link sang các màn liên quan để test điều hướng trong lúc chưa có UI thật. */
  links?: PlaceholderLink[];
  children?: ReactNode;
  edges?: ScreenProps['edges'];
}

/**
 * Màn hình tạm cho route đã khai báo nhưng chưa làm.
 * Người làm task thay toàn bộ file route bằng màn hình thật (giữ nguyên path).
 */
export function PlaceholderScreen({ task, title, description, links, children, edges }: PlaceholderScreenProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Screen scroll edges={edges}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Construction size={iconSize.lg} color={colors.warning} />
          <Badge label={`TODO ${task}`} tone="warning" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.subtext }]}>
          {description ?? t('placeholder.description', { task })}
        </Text>
      </Card>

      {children}

      {links && links.length > 0 && (
        <View style={styles.links}>
          <Text style={[styles.linksTitle, { color: colors.subtext }]}>{t('placeholder.related')}</Text>
          {links.map((link) => (
            <Button key={link.label} label={link.label} variant="secondary" fullWidth onPress={() => router.push(link.href)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  description: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.5 },
  links: { gap: spacing.sm },
  linksTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: spacing.sm },
});
