import { useCallback, useEffect, useRef, useState } from 'react';
import { friendshipService, toFriendError } from '@/services/friendshipService';
import { useFriendStore } from '@/store/useFriendStore';
import { asyncFromData, type AsyncState } from '@/types/async';
import type { UserSearchResult } from '@/types/friend';

export const SEARCH_MIN_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

const LOADING: AsyncState<never> = { status: 'loading' };

/**
 * Tìm người dùng theo tên/email (FE-03): debounce, không gọi khi rỗng/quá ngắn, bỏ kết quả của request cũ.
 * `state = null` khi chưa đủ ký tự để tìm. Quan hệ của từng kết quả đọc từ useFriendStore (RelationshipActions).
 */
export function useUserSearch(query: string) {
  const trimmed = query.trim();
  const [result, setResult] = useState<{ query: string; state: AsyncState<UserSearchResult[]> } | null>(null);
  const requestId = useRef(0);

  const search = useCallback(async (q: string) => {
    const id = ++requestId.current;
    setResult({ query: q, state: LOADING });
    try {
      const results = await friendshipService.search(q);
      if (id !== requestId.current) return;
      setResult({ query: q, state: asyncFromData(results) });
      useFriendStore.getState().reconcileSearchResults(results);
    } catch (err) {
      if (id === requestId.current) setResult({ query: q, state: { status: 'error', error: toFriendError(err) } });
    }
  }, []);

  useEffect(() => {
    // Bỏ kết quả đang chờ của từ khóa trước
    requestId.current += 1;
    if (trimmed.length < SEARCH_MIN_LENGTH) return;
    const timer = setTimeout(() => void search(trimmed), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [trimmed, search]);

  const retry = useCallback(() => search(trimmed), [search, trimmed]);

  // Đang chờ debounce/kết quả của từ khóa mới → loading, không hiện kết quả của từ khóa cũ
  const state = trimmed.length < SEARCH_MIN_LENGTH ? null : result?.query === trimmed ? result.state : LOADING;
  return { state, retry };
}
