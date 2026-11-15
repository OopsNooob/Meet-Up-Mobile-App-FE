import { useMemo } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Lock, ShieldAlert } from 'lucide-react-native';
import { EmptyState, InlineAlert, LoadingState, Screen, useToast } from '@/components/common';
import { MeetupErrorState } from '@/components/meetup/MeetupErrorState';
import { MeetupForm } from '@/components/meetup/MeetupForm';
import { canEditMeetup, isMeetupOrganizer } from '@/constants/meetup';
import { routes, type MeetupRouteParams } from '@/constants/routes';
import { useMeetupDetail } from '@/hooks/useMeetupDetail';
import { getActiveInviteeIds, meetupService, toMeetupError } from '@/services/meetupService';
import { useAuthStore } from '@/store/useAuthStore';
import type { MeetupDetail, MeetupFormValues } from '@/types/meetup';
import { getMeetupErrorMessage } from '@/utils/meetup';

export default function MeetupEditScreen() {
  const { t } = useTranslation();
  const { meetupId } = useLocalSearchParams<MeetupRouteParams>();
  const myId = useAuthStore((s) => s.user?.id ?? null);
  const { state, reload, refresh } = useMeetupDetail(meetupId);

  if (state.status === 'loading') {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (state.status !== 'success') {
    return (
      <Screen>
        <MeetupErrorState error={state.status === 'error' ? state.error : undefined} onRetry={reload} />
      </Screen>
    );
  }

  const meetup = state.data;
  const goToDetail = () => router.replace(routes.meetupDetail(meetup.id));

  if (!isMeetupOrganizer(meetup, myId)) {
    return (
      <Screen>
        <EmptyState
          icon={ShieldAlert}
          title={t('meetup.edit_locked.not_organizer_title')}
          description={t('meetup.errors.not_organizer')}
          actionLabel={t('meetup.edit_locked.back_to_detail')}
          onAction={goToDetail}
        />
      </Screen>
    );
  }
  if (!canEditMeetup(meetup, myId)) {
    return (
      <Screen>
        <EmptyState
          icon={Lock}
          title={t('meetup.edit_locked.title', { status: t(`status.meetup_${meetup.status}`) })}
          description={t('meetup.errors.not_editable')}
          actionLabel={t('meetup.edit_locked.back_to_detail')}
          onAction={goToDetail}
        />
      </Screen>
    );
  }

  return <EditForm key={state.updatedAt} meetup={meetup} onRefresh={refresh} />;
}

function EditForm({ meetup, onRefresh }: { meetup: MeetupDetail; onRefresh: () => Promise<unknown> }) {
  const { t } = useTranslation();
  const toast = useToast();

  const initialValues = useMemo<MeetupFormValues>(
    () => ({
      title: meetup.title,
      scheduledAt: new Date(meetup.scheduledAt),
      placeType: meetup.placeType,
      searchRadiusM: meetup.searchRadiusM,
      inviteeIds: getActiveInviteeIds(meetup),
    }),
    [meetup],
  );

  const handleSubmit = async (values: MeetupFormValues) => {
    try {
      await meetupService.update(meetup, values);
    } catch (err) {
      const error = toMeetupError(err);
      if (error.partial || error.meetupCode === 'not_editable') {
        toast.show(getMeetupErrorMessage(t, error), { tone: 'danger', duration: 6000 });
        void onRefresh();
        return;
      }
      throw error;
    }
    toast.show(t('meetup.toast.updated'), { tone: 'success' });
    if (router.canGoBack()) router.back();
    else router.replace(routes.meetupDetail(meetup.id));
  };

  return (
    <MeetupForm
      mode="edit"
      initialValues={initialValues}
      submitLabel={t('meetup.form.submit_edit')}
      onSubmit={handleSubmit}
      header={
        meetup.status === 'choosing' ? (
          <InlineAlert tone="warning" title={t('meetup.edit_choosing_warning')} />
        ) : undefined
      }
    />
  );
}
