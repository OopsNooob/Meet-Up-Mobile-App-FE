import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/hooks/useTheme';
import { avatarSize, fontWeight, toneColors, type Tone } from '@/theme';

export interface AvatarProps {
  name: string;
  uri?: string | null;
  size?: keyof typeof avatarSize;
  style?: StyleProp<ViewStyle>;
}

const FALLBACK_TONES: Tone[] = ['primary', 'success', 'warning', 'info', 'purple', 'danger'];

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

function toneFor(name: string): Tone {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return FALLBACK_TONES[Math.abs(hash) % FALLBACK_TONES.length];
}

export function Avatar({ name, uri, size = 'md', style }: AvatarProps) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  const dimension = avatarSize[size];
  const box = { width: dimension, height: dimension, borderRadius: dimension / 2 };

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[box, style as object]}
        contentFit="cover"
        onError={() => setFailed(true)}
        accessibilityLabel={name}
      />
    );
  }

  const { fg, bg } = toneColors(colors, toneFor(name));
  return (
    <View style={[styles.fallback, box, { backgroundColor: bg }, style]} accessibilityLabel={name}>
      <Text style={[styles.initials, { color: fg, fontSize: dimension * 0.38 }]}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: fontWeight.bold },
});
