import type { TFunction } from 'i18next';
import { toFriendError } from '@/services/friendshipService';

/** Câu thông báo cho lỗi thao tác bạn bè: lỗi nghiệp vụ BE-03 → `friend.errors.*`, còn lại → `errors.<code>` */
export function getFriendErrorMessage(t: TFunction, err: unknown): string {
  const error = toFriendError(err);
  return error.friendCode ? t(`friend.errors.${error.friendCode}`) : t(`errors.${error.code}.description`);
}
