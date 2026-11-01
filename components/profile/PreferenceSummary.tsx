import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Badge, PREFERENCE_LEVEL_STYLE, TagChip } from '@/components/common';
import { spacing } from '@/theme';
import { PREFERENCE_LEVELS } from '@/types/domain';
import type { ActivityTag, ProfilePreference } from '@/types/preference';
import { tagLabel } from '@/utils/preferences';

export interface PreferenceSummaryProps {
  preferences: readonly ProfilePreference[];
  tags: readonly ActivityTag[];
}

/** Sở thích đã chọn, nhóm theo mức (chỉ hiển thị) */
export function PreferenceSummary({ preferences, tags }: PreferenceSummaryProps) {
  const { t } = useTranslation();
  const tagByCode = new Map(tags.map((tag) => [tag.code, tag]));

  return (
    <View style={styles.container}>
      {PREFERENCE_LEVELS.map((level) => {
        const items = preferences.filter((pref) => pref.level === level);
        if (items.length === 0) return null;
        return (
          <View key={level} style={styles.group}>
            <Badge
              label={t(`preference.level.${level}`)}
              tone={PREFERENCE_LEVEL_STYLE[level].tone}
              icon={PREFERENCE_LEVEL_STYLE[level].icon}
            />
            <View style={styles.chips}>
              {items.map((pref) => (
                <TagChip
                  key={pref.tagCode}
                  label={tagLabel(t, tagByCode.get(pref.tagCode) ?? { code: pref.tagCode })}
                  level={pref.level}
                />
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
