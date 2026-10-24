import type { Href } from 'expo-router';
import * as Linking from 'expo-linking';

export type MeetupRouteParams = { meetupId: string };
export type PlaceRouteParams = { placeId: string };
export type PlaceExplanationParams = { placeId: string; placeName?: string };

export const routes = {
  login: '/login',
  register: '/register',

  tabMap: '/',
  tabMeetups: '/meetups',
  tabFriends: '/friends',
  tabProfile: '/profile',

  meetupCreate: '/meetup/create',
  meetupInvitations: '/meetup/invitations',
  meetupDetail: (meetupId: string) => ({ pathname: '/meetup/[meetupId]', params: { meetupId } }),
  meetupEdit: (meetupId: string) => ({ pathname: '/meetup/[meetupId]/edit', params: { meetupId } }),
  meetupPreferences: (meetupId: string) => ({
    pathname: '/meetup/[meetupId]/preferences',
    params: { meetupId },
  }),
  meetupRecommendations: (meetupId: string) => ({
    pathname: '/meetup/[meetupId]/recommendations',
    params: { meetupId },
  }),
  meetupVote: (meetupId: string) => ({ pathname: '/meetup/[meetupId]/vote', params: { meetupId } }),
  meetupChat: (meetupId: string) => ({ pathname: '/meetup/[meetupId]/chat', params: { meetupId } }),

  friendSearch: '/friend/search',
  friendRequests: '/friend/requests',

  placeDetail: (placeId: string) => ({ pathname: '/place/[placeId]', params: { placeId } }),
  placeExplanation: (placeId: string, placeName?: string) => ({
    pathname: '/place/[placeId]/explanation',
    params: placeName ? { placeId, placeName } : { placeId },
  }),
  history: '/history',
  favorites: '/favorites',

  settingsLocation: '/settings/location',
  settingsNearby: '/settings/nearby',

  adminUsers: '/admin/users',
  adminReports: '/admin/reports',

  devComponents: '/dev/components',
  devAuth: '/dev/auth',
  devNotifications: '/dev/notifications',
  devPerformance: '/dev/performance',
} as const satisfies Record<string, Href | ((...args: string[]) => Href)>;

export const deepLinks = {
  meetup: (meetupId: string) => Linking.createURL(`/meetup/${meetupId}`),
  recommendations: (meetupId: string) => Linking.createURL(`/meetup/${meetupId}/recommendations`),
  chat: (meetupId: string) => Linking.createURL(`/meetup/${meetupId}/chat`),
  place: (placeId: string) => Linking.createURL(`/place/${placeId}`),
  locationSettings: () => Linking.createURL('/settings/location'),
  nearbySettings: () => Linking.createURL('/settings/nearby'),
};
