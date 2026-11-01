import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, Text } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  InlineAlert,
  LoadingState,
  Screen,
  TagLevelPicker,
  TextField,
  useToast,
} from '@/components/common';
import { AvatarPicker, type AvatarUploadStatus } from '@/components/profile/AvatarPicker';
import { useTheme } from '@/hooks/useTheme';
import { toApiError, type ApiError } from '@/services/apiClient';
import { pickAvatarImage, type ImageSource } from '@/services/imagePicker';
import type { AvatarFile } from '@/services/profileService';
import { useAuthStore } from '@/store/useAuthStore';
import { useProfileStore } from '@/store/useProfileStore';
import { fontSize, fontWeight, spacing } from '@/theme';
import type { User } from '@/types/auth';
import type { ActivityTag, PreferenceSelection, ProfilePreference } from '@/types/preference';
import { fromSelection, isSameSelection, toSelection } from '@/utils/preferences';
import { DISPLAY_NAME_MAX_LENGTH, validateDisplayName } from '@/utils/validation';

export default function ProfileEditScreen() {
  const user = useAuthStore((s) => s.user);
  const preferences = useProfileStore((s) => s.preferences);
  const tags = useProfileStore((s) => s.tags);
  const loadPreferences = useProfileStore((s) => s.loadPreferences);

  useEffect(() => {
    // Mở thẳng màn này (deep link) hoặc lần tải trước lỗi → tải lại
    const { status } = useProfileStore.getState().preferences;
    if (status !== 'success' && status !== 'empty') void loadPreferences();
  }, [loadPreferences]);

  if (!user) return null;
  if (preferences.status === 'loading') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (preferences.status === 'error') {
    return (
      <Screen>
        <ErrorState error={preferences.error} onRetry={loadPreferences} />
      </Screen>
    );
  }
  return (
    <ProfileEditForm user={user} tags={tags} initialPreferences={preferences.status === 'success' ? preferences.data : []} />
  );
}

function ProfileEditForm({
  user,
  tags,
  initialPreferences,
}: {
  user: User;
  tags: readonly ActivityTag[];
  initialPreferences: readonly ProfilePreference[];
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const { savePreferences, updateDisplayName, uploadAvatar } = useProfileStore.getState();

  const [name, setName] = useState(user.name);
  const [nameEdited, setNameEdited] = useState(false);
  const [pickedAvatar, setPickedAvatar] = useState<AvatarFile | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<AvatarUploadStatus>('idle');
  const [savedSelection, setSavedSelection] = useState<PreferenceSelection>(() => toSelection(initialPreferences));
  const [selection, setSelection] = useState<PreferenceSelection>(savedSelection);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [deniedSource, setDeniedSource] = useState<ImageSource | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const savingRef = useRef(false);
  const allowLeaveRef = useRef(false);
  /** Hành động điều hướng bị chặn — chạy lại khi người dùng chọn bỏ thay đổi */
  const leaveRef = useRef<(() => void) | null>(null);

  const nameErrorKey = validateDisplayName(name);
  const nameChanged = name.trim() !== user.name;
  const preferencesChanged = !isSameSelection(selection, savedSelection);
  const dirty = nameChanged || pickedAvatar !== null || preferencesChanged;

  // Rời màn (nút back, vuốt, phím back Android) khi chưa lưu → hỏi xác nhận; đang lưu thì chặn hẳn
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (allowLeaveRef.current || (!dirty && !saving)) return;
        e.preventDefault();
        if (saving) return;
        leaveRef.current = () => navigation.dispatch(e.data.action);
        setConfirmLeave(true);
      }),
    [navigation, dirty, saving],
  );

  // Lưu xong toàn bộ → quay lại khi form đã hết "dirty" (listener ở trên không chặn)
  useEffect(() => {
    if (saved && !dirty) router.back();
  }, [saved, dirty]);

  const pick = async (source: ImageSource) => {
    const result = await pickAvatarImage(source);
    if (result.status === 'picked') {
      setPickedAvatar(result.file);
      setAvatarStatus('idle');
    } else if (result.status === 'denied') {
      setDeniedSource(result.source);
    } else if (result.status === 'error') {
      toast.show(t('profile.pick_failed'), { tone: 'danger' });
    }
  };

  const chooseAvatar = () => {
    if (Platform.OS === 'web') {
      void pick('library');
      return;
    }
    Alert.alert(t('profile.change_avatar'), undefined, [
      { text: t('profile.take_photo'), onPress: () => void pick('camera') },
      { text: t('profile.choose_from_library'), onPress: () => void pick('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const save = async () => {
    if (savingRef.current) return;
    if (nameErrorKey) {
      setNameEdited(true);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSubmitError(null);
    try {
      // Từng phần thành công được giữ lại: lỗi ở bước sau chỉ còn phần đó là "chưa lưu"
      if (pickedAvatar) {
        setAvatarStatus('uploading');
        try {
          await uploadAvatar(pickedAvatar);
          setPickedAvatar(null);
          setAvatarStatus('idle');
        } catch (err) {
          setAvatarStatus('error');
          throw err;
        }
      }
      if (nameChanged) await updateDisplayName(name.trim());
      if (preferencesChanged) {
        await savePreferences(fromSelection(selection));
        setSavedSelection(selection);
      }
      toast.show(t('profile.save_success'), { tone: 'success' });
      setSaved(true);
    } catch (err) {
      setSubmitError(toApiError(err));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const discardAndLeave = () => {
    setConfirmLeave(false);
    allowLeaveRef.current = true;
    leaveRef.current?.();
  };

  const openSettings = async () => {
    setDeniedSource(null);
    await Linking.openSettings().catch(() => toast.show(t('profile.open_settings_failed'), { tone: 'warning' }));
  };

  const showNameError = nameEdited && nameErrorKey;

  return (
    <Screen
      scroll
      keyboardAvoiding
      footer={
        <Button
          label={t('profile.save')}
          fullWidth
          loading={saving}
          disabled={!dirty || saving || !!nameErrorKey}
          onPress={save}
          testID="profile-save"
        />
      }
    >
      <AvatarPicker
        name={name.trim() || user.name}
        uri={pickedAvatar?.uri ?? user.avatarUrl}
        status={avatarStatus}
        pending={pickedAvatar !== null}
        onPress={chooseAvatar}
        disabled={saving}
      />

      <Card style={styles.card}>
        <TextField
          label={t('profile.display_name')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            setNameEdited(true);
          }}
          error={showNameError ? t(nameErrorKey, { max: DISPLAY_NAME_MAX_LENGTH }) : null}
          hint={t('profile.display_name_hint', { count: name.trim().length, max: DISPLAY_NAME_MAX_LENGTH })}
          editable={!saving}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          testID="profile-name-input"
        />
        <TextField label={t('auth.email')} value={user.email} editable={false} hint={t('profile.email_readonly')} />
      </Card>

      <Text style={[styles.section, { color: colors.subtext }]}>{t('profile.preferences_title')}</Text>
      <Card style={styles.card}>
        <Text style={[styles.prefillHint, { color: colors.subtext }]}>{t('profile.preferences_prefill_hint')}</Text>
        <TagLevelPicker tags={tags} value={selection} onChange={setSelection} disabled={saving} />
      </Card>

      {submitError && (
        <InlineAlert
          tone="danger"
          title={t(`errors.${submitError.code}.title`)}
          message={t(`errors.${submitError.code}.description`)}
        />
      )}

      <ConfirmDialog
        visible={confirmLeave}
        title={t('profile.discard_title')}
        message={t('profile.discard_message')}
        confirmLabel={t('profile.discard_confirm')}
        cancelLabel={t('profile.keep_editing')}
        tone="danger"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={discardAndLeave}
      />

      <ConfirmDialog
        visible={deniedSource !== null}
        title={t(deniedSource === 'camera' ? 'profile.camera_denied_title' : 'profile.photos_denied_title')}
        message={t(deniedSource === 'camera' ? 'profile.camera_denied_message' : 'profile.photos_denied_message')}
        confirmLabel={t('profile.open_settings')}
        cancelLabel={t('profile.later')}
        onCancel={() => setDeniedSource(null)}
        onConfirm={openSettings}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  section: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: spacing.md },
  prefillHint: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.4 },
});
