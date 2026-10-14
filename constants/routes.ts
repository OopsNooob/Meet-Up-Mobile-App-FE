/**
 * Tên route + params tập trung một chỗ. Luôn điều hướng qua `routes.*`,
 * không viết tay chuỗi path trong màn hình:
 *
 *   router.push(routes.meetupDetail(meetupId));
 *   <Link href={routes.friendRequests}>...</Link>
 *
 * Route group như (app), (tabs), (auth) KHÔNG xuất hiện trong URL.
 */
import type { Href } from 'expo-router';
import * as Linking from 'expo-linking';

/** Params của từng route động — dùng với useLocalSearchParams<...>(). */
export type MeetupRouteParams = { meetupId: string };
export type PlaceRouteParams = { placeId: string };
export type PlaceExplanationParams = { placeId: string; placeName?: string };

export const routes = {
  // Auth — FE-01
  login: '/login',
  register: '/register',

  // Bottom tabs
  tabMap: '/',
  tabMeetups: '/meetups',
  tabFriends: '/friends',
  tabProfile: '/profile',

  // Meetup — FE-07, FE-08, FE-09, FE-10, FE-12, FE-15
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

  // Bạn bè — FE-03
  friendSearch: '/friend/search',
  friendRequests: '/friend/requests',

  // Địa điểm — FE-11, FE-14, FE-16
  placeDetail: (placeId: string) => ({ pathname: '/place/[placeId]', params: { placeId } }),
  placeExplanation: (placeId: string, placeName?: string) => ({
    pathname: '/place/[placeId]/explanation',
    params: placeName ? { placeId, placeName } : { placeId },
  }),
  history: '/history',
  favorites: '/favorites',

  // Cài đặt — FE-04, FE-17
  settingsLocation: '/settings/location',
  settingsNearby: '/settings/nearby',

  // Admin — FE-18 (chỉ role admin)
  adminUsers: '/admin/users',
  adminReports: '/admin/reports',

  // Màn hình test nội bộ (chỉ hiện trong __DEV__)
  devComponents: '/dev/components',
  devNotifications: '/dev/notifications',
  devPerformance: '/dev/performance',
} as const satisfies Record<string, Href | ((...args: string[]) => Href)>;

/**
 * Deep link tuyệt đối, ví dụ `mobile://meetup/123` (scheme lấy từ app.json).
 * FE-13 dùng khi tạo notification; test bằng:
 *   npx uri-scheme open "mobile://meetup/123" --android
 */
export const deepLinks = {
  meetup: (meetupId: string) => Linking.createURL(`/meetup/${meetupId}`),
};
