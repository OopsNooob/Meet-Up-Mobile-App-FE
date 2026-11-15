import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/common';
import { MeetupForm } from '@/components/meetup/MeetupForm';
import { DEFAULT_MEETUP_RADIUS_M, defaultScheduleTime } from '@/constants/meetup';
import { routes } from '@/constants/routes';
import { meetupService } from '@/services/meetupService';
import { useMeetupStore } from '@/store/useMeetupStore';
import type { MeetupFormValues } from '@/types/meetup';

export default function MeetupCreateScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const [initialValues] = useState<MeetupFormValues>(() => ({
    title: '',
    scheduledAt: defaultScheduleTime(),
    placeType: null,
    searchRadiusM: DEFAULT_MEETUP_RADIUS_M,
    inviteeIds: [],
  }));

  const handleSubmit = async (values: MeetupFormValues) => {
    const meetupId = await meetupService.create(values);
    meetupService
      .get(meetupId)
      .then((detail) => useMeetupStore.getState().upsert(detail))
      .catch(() => {});
    toast.show(t('meetup.toast.created'), { tone: 'success' });
    router.replace(routes.meetupDetail(meetupId));
  };

  return <MeetupForm mode="create" initialValues={initialValues} submitLabel={t('meetup.form.submit_create')} onSubmit={handleSubmit} />;
}
