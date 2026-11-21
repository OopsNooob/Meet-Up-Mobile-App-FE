# Hướng dẫn Tích hợp API Backend cho Frontend 1 (FE1)

> **Tài liệu đối chiếu chuẩn từ Backend (tính tới PR #16 & các commit PR #17 ngày 20–21/11/2026):**
> - Đặc tả HTTP & Socket.IO: `Meet-Up-Mobile-App-BE/docs/fe-integration/fe-api-integration.md`
> - TypeScript Contracts dùng chung: `types/api.ts` (đã đồng bộ đủ 100% tới PR #17 và 0 warning ESLint)
> - Tài liệu ngân sách & AI preference: `Meet-Up-Mobile-App-BE/docs/22_places_budget_ai_preferences.md`
> - Phân công màn hình FE1 vs FE2: `docs/MeetUp_Frontend_Assignment_v2.md`

---

## 1. Điều kiện tiên quyết để chạy & test với Backend thật

### 1.1. Sửa lỗi `POST /api/v1/auth/login` trả `500 INTERNAL_SERVER_ERROR`
Khi bắn `POST /api/v1/auth/login` tới Backend local đang nối Neon PostgreSQL, server báo `500` vì **Neon DB đang thiếu 14 migration mới** (mới áp đến `14 CreateRecommendationResults1792110000000`), trong khi code Backend đã truy vấn các cột/bảng mới (`public_handle`, chat/favorites, voting, feedback, budget):

Các migration đang pending trên Neon DB:
- `CreateMeetupInviteLinks1792120000000`
- `AddPublicHandleToUserAccounts1792130000000`
- `AddChatFavoritesAndAdminAudit1792140000000`
- `EnforceMeetupChatAccess1792150000000`
- `AddMeetupVoting1792150000000`
- `AddRecommendationTrafficWeatherContext1792160000000`
- `AddRecommendationStaticDurationMetric1792170000000`
- `AddRecommendationClosingSnapshots1792180000000`
- `AddDirectChatAndAttachments1792190000000`
- `UnifyChatConversations1792200000000`
- `CreateRecommendationFeedbackEvents1792210000000`
- `CreateRecommendationRetentionHolds1792220000000`
- `AddFriendLiveLocationEnabled1792300000000`
- `AddMeetupParticipantBudget1792310000000`

**Cách xử lý trước khi test:** Chạy lệnh migrate ở thư mục Backend (`Meet-Up-Mobile-App-BE`):

```powershell
docker compose up -d redis
npm run migration:run
npm run start:dev
```

### 1.2. Cấu hình Frontend `.env` và Metro
- Đặt `EXPO_PUBLIC_USE_MOCK_API=false`.
- Android Emulator: `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1`.
- Thiết bị thật cùng Wi-Fi: `EXPO_PUBLIC_API_URL=http://<IP-LAN-may-dev>:3000/api/v1`.
- Sau mỗi lần đổi `.env`, khởi động lại Metro kèm xóa cache:
  ```powershell
  pnpm start -c
  ```
- **Lưu ý tài khoản:** Không dùng tài khoản mock (`user@meetup.dev`) khi gọi Backend thật — cần mở màn **Đăng ký** (`app/(auth)/register.tsx`) tạo mới 2 tài khoản thật (hoặc dùng tài khoản đã tạo trên Neon DB).

---

## 2. Lộ trình ưu tiên cho FE1 (Mở khóa test liên thông với FE2)

| Mức độ | Hạng mục & File | Lý do ưu tiên | Mở khóa cho tính năng FE2 nào |
|---|---|---|---|
| **P0** | **Bạn bè (FE-03)** — `services/friendshipService.ts`, `store/useFriendStore.ts` | Đang lệch hoàn toàn shape response (`res.data.map` vs `OffsetPage.items`), lệch tên field gửi lên và query param → crash ngay khi load danh sách bạn bè | Bản đồ bạn bè (`FE-05`), Chọn bạn chia sẻ vị trí (`FE-04`), Chat 1-1 (`FE-15`), hiển thị tên thật trong ETA & Map gợi ý (`FE-10`) |
| **P1** | **Phản hồi lời mời Meetup (FE-08)** — `app/(app)/meetup/invitations.tsx` + sửa path mời bạn ở `services/meetupService.ts` (FE-07) | Màn hình lời mời đang là `PlaceholderScreen`; chưa có thành viên thứ 2 `accepted` thì không thể tạo gợi ý nhóm đúng nghĩa | Gợi ý nhóm (`FE-10`), Chat nhóm & giới hạn thành viên rời nhóm (`FE-15`), Kết quả theo người xem (`FE-27`) |
| **P2** | **Hồ sơ, Sở thích Profile & Auth edge cases (FE-01, FE-02)** — `services/profileService.ts`, `services/authService.ts` | `profileService.ts` đang gọi sai path `/users/*` (404); `GET /auth/me` không trả field `role` | Hiển thị tên/sở thích đồng nhất trên Profile, Chat và Recommendation |
| **P3** | **Sở thích riêng theo Meetup, Ngân sách & AI Draft (FE-09 — PR #17)** — `app/(app)/meetup/[meetupId]/preferences.tsx` | Đang là `PlaceholderScreen`; cần gắn `GET/PUT .../preferences`, `summary`, và `POST .../suggest` kèm `budgetVnd` | Nạp `matchedTags` & `budgetVnd` vào recommendation context (`FE-10`, `FE-27`) |
| **P4** | **Vote/Finish, Favorites/History, Invite Link, QR kết bạn, Admin** — `vote.tsx`, `favorites.tsx`, `history.tsx`, `admin/*`, `FE-28`, `FE-29` | Đang là `PlaceholderScreen` hoặc thiếu UI (nút Vote/Finalize/Favorite cơ bản đã có trên màn Chi tiết địa điểm của FE2) | Hoàn chỉnh toàn bộ vòng đời Meetup (`finish`, `history`, `favorites`, link mời, QR, khóa tài khoản admin) |

---

## 3. Chi tiết các lỗi lệch Contract & ESLint đang có ở file FE1

### 3.1. `services/friendshipService.ts` & `store/useFriendStore.ts` (FE-03 ↔ BE-03)

| Vị trí hiện tại | Code FE1 đang viết | Contract Backend thật (`fe-api-integration.md`) | Cần sửa thành |
|---|---|---|---|
| `search`, `listFriends`, `listRequests` | Đọc mảng phẳng `res.data.map(...)` | Trả về pagination `OffsetPage<T>`: `{ items, total, offset, limit }` (`FriendSearchResponse`, `FriendshipListResponse`) | Đọc `res.data.items.map(...)` và dùng type từ `@/types/api` |
| `listRequests` + `useFriendStore.ts` (`L184-185`) | Query `direction=incoming \| outgoing` | BE chỉ chấp nhận `direction?: 'received' \| 'sent'` (`FriendRequestsParams`) | Map `'incoming' → 'received'`, `'outgoing' → 'sent'` ở service |
| `sendRequest` (`L137`) | Body `{ targetUserId }` | BE bật `whitelist + forbidNonWhitelisted` và yêu cầu `{ recipientId }` (`SendFriendRequest`) | Gửi `{ recipientId: targetUserId }` |
| `sendRequest` response (`L138-140`) | Trông đợi `{ status: 'pending', request }` hoặc `{ status: 'accepted', friend }` | `POST /friends/requests` trả `FriendshipResponse` (`id, userAId, userBId, requestedById, status, requestedAt, ...`) khi dùng `recipientId` | Chuẩn hóa adapter theo `FriendshipResponse` (hoặc gọi `loadFriends()` / `loadRequests()` để đồng bộ `user`) |
| `unfriend` (`L38`, `L160`) | `DELETE /friends/${userId}` | BE nhận `:friendshipId` (`DELETE /api/v1/friends/:friendshipId`), không nhận `userId` | Lưu `friendshipId` trong model `Friend` (từ `FriendshipListItemResponse.id`) và truyền `friendshipId` |
| `cancelRequest` (`L154-157`) | `DELETE /friends/requests/${requestId}` | BE không có endpoint hủy lời mời gửi đi (chỉ có `accept` / `reject` cho người nhận) | Ẩn/khóa thao tác hủy lời mời gửi đi hoặc kiểm tra với BE nếu cần bổ sung |
| `FRIEND_SERVER_CODES` (`L62-69`) | `SELF_FRIEND_REQUEST`, `FRIEND_REQUEST_EXISTS`, `ALREADY_FRIENDS`, `USER_NOT_FOUND`, `FRIEND_REQUEST_NOT_FOUND` | BE trả `SELF_FRIENDSHIP`, `FRIEND_USER_NOT_FOUND`, `FRIENDSHIP_ALREADY_EXISTS`, `FRIENDSHIP_RESPONSE_FORBIDDEN`, `FRIENDSHIP_NOT_FOUND`, `FRIENDSHIP_NOT_PENDING`, `FRIENDSHIP_NOT_ACCEPTED` | Cập nhật `FRIEND_SERVER_CODES` khớp mã lỗi thật từ BE |

### 3.2. `services/profileService.ts` (FE-02 ↔ BE-02)

| Vị trí hiện tại | Code FE1 đang viết | Contract Backend thật | Cần sửa thành |
|---|---|---|---|
| `PROFILE_PATHS.me` (`L23`) | `PATCH /users/me` | `PATCH /auth/profile` (hoặc `/auth/me`) nhận `UpdateProfileRequest` (`{ displayName?, avatarUrl?, preferences? }`) | Đổi path sang `/auth/profile` |
| `PROFILE_PATHS.preferences` (`L25`) | `GET` / `PUT /users/me/preferences` | `GET /auth/preferences`, `PUT /auth/preferences` (`{ tags: PreferenceInput[] }`) trả `UserPreferenceResponse` | Đổi path sang `/auth/preferences` |
| `PROFILE_PATHS.activityTags` (`L26`) | `GET /activity-tags` | Public endpoint `GET /auth/activity-tags` (`ActivityTagResponse[]`) | Đổi path sang `/auth/activity-tags` |
| `PROFILE_PATHS.avatar` (`L24`) | `POST /users/me/avatar` (multipart) | BE chưa có endpoint upload avatar riêng; `PATCH /auth/profile` nhận `avatarUrl?: string \| null` | Tạm ẩn upload file avatar hoặc cho phép nhập/xóa `avatarUrl` qua `PATCH /auth/profile` |

### 3.3. `services/meetupService.ts` (FE-07 ↔ BE-08)

| Vị trí hiện tại | Code FE1 đang viết | Contract Backend thật | Cần sửa thành |
|---|---|---|---|
| `MEETUP_PATHS.participants` (`L18`, `L158`) | `POST /meetups/:meetupId/participants` | `POST /meetups/:meetupId/invitations` với body `{ inviteeIds: UUID[] }` (`InviteParticipantsRequest`) — STT 38 | Đổi path `POST` mời thành viên thành `/meetups/${encodeURIComponent(meetupId)}/invitations` *(giữ nguyên `DELETE .../participants/:userId` vì STT 42 đúng)* |
| `MEETUP_SERVER_CODES` (`L25-34`) | `NOT_MEETUP_ORGANIZER`, `MEETUP_NOT_EDITABLE`, `INVITEE_NOT_FRIEND`, ... | `MEETUP_NOT_FOUND` (404), `MEETUP_FORBIDDEN` (403), `MEETUP_INVITEE_UNAVAILABLE` (400), `409` state/deadline conflict | Bổ sung map `MEETUP_FORBIDDEN → 'not_organizer'`, `MEETUP_INVITEE_UNAVAILABLE → 'invitee_not_friend'` |

### 3.4. `services/authService.ts` (FE-01 ↔ BE-01)

| Vị trí | Chi tiết cần lưu ý |
|---|---|
| `toUser` (`L46-55`) | `GET /api/v1/auth/me` của BE trả `{ id, email, displayName, avatarUrl }`, **không có field `role`** (khi `/auth/login` và `/auth/register` thì `user` có `role` hoặc xem `UserProfileResponse`). Nên đặt fallback `role: dto.role ?? 'user'` để tránh `user.role === undefined`. |
| `loginWithGoogle` (`L74-77`) & `services/googleAuth.ts` | FE1 đang gọi `POST /auth/google` với `{ idToken }`, nhưng BE triển khai Passport OAuth Web Redirect `GET /api/v1/auth/google` → `GET /api/v1/auth/google/callback` (STT 3–4). Cần chốt với BE luồng deep link callback hoặc giữ đăng nhập Email trong lúc test. |

### 3.5. Hai lỗi ESLint React Compiler đang tồn tại ở file FE1
Khi chạy `npx eslint .` toàn repo, phát hiện 2 lỗi `react-hooks/set-state-in-effect` nằm trong file thuộc phạm vi FE1 (FE2 không tự ý sửa để tránh đụng code FE1):
- `hooks/useAsyncResource.ts:26` — gọi `reload()` chứa `setState` đồng bộ trong `useEffect`.
- `hooks/useMeetupDetail.ts:42` — gọi `void reload()` chứa `setState` đồng bộ trong `useEffect`.

*(Khuyến nghị sửa: tách hàm thuần `async` trả về Promise ra ngoài hoặc chạy qua async IIFE / `.then().catch()`, gọi `setState` trong callback async có cờ `active` cleanup tương tự `app/(app)/dev/performance.tsx`.)*

---

## 4. Bảng đầy đủ toàn bộ API & Socket Events thuộc phạm vi FE1

### 4.1. Auth & Profile (FE-01, FE-02)

| STT | Endpoint | Auth | Request / Response Type (`@/types/api`) | File đích FE1 |
|---|---|---|---|---|
| 1 | `POST /api/v1/auth/register` | Public | `RegisterRequest` → `AuthResponse` | `services/authService.ts` *(đã gắn)* |
| 2 | `POST /api/v1/auth/login` | Public | `LoginRequest` → `AuthResponse` | `services/authService.ts` *(đã gắn)* |
| 3–4 | `GET /api/v1/auth/google` & `/callback` | Public | OAuth browser/deep link → `AuthResponse` | `services/googleAuth.ts`, `services/authService.ts` |
| 5 | `POST /api/v1/auth/refresh` | Public | `RefreshTokenRequest` → `AuthResponse` | `services/authService.ts` *(đã gắn)* |
| 6 | `POST /api/v1/auth/logout` | Public | `RefreshTokenRequest` → `204` | `services/authService.ts` *(đã gắn)* |
| 7 | `GET /api/v1/auth/me` | Bearer | → `UserProfileResponse` | `services/authService.ts` *(thêm fallback `role`)* |
| 8–9 | `PATCH /api/v1/auth/profile` *(hoặc `/auth/me`)* | Bearer | `UpdateProfileRequest` → `UserProfileResponse` | `services/profileService.ts` *(sửa path)* |
| 10 | `GET /api/v1/auth/preferences` | Bearer | → `UserPreferenceResponse` | `services/profileService.ts` *(sửa path)* |
| 11 | `PUT /api/v1/auth/preferences` | Bearer | `SaveUserPreferencesRequest` → `UserPreferenceResponse` | `services/profileService.ts` *(sửa path)* |
| 12 | `GET /api/v1/auth/activity-tags` | Public | → `ActivityTagResponse[]` | `services/profileService.ts` *(sửa path)* |

### 4.2. Bạn bè & QR kết bạn (FE-03, FE-29)

| STT | Endpoint | Request / Response Type (`@/types/api`) | File đích FE1 |
|---|---|---|---|
| 19 | `GET /api/v1/friends/search` | `SearchFriendsParams` → `FriendSearchResponse` | `services/friendshipService.ts` *(sửa `OffsetPage`)* |
| 20 | `GET /api/v1/friends` | `FriendPageParams` → `FriendshipListResponse` | `services/friendshipService.ts` *(sửa `OffsetPage`)* |
| 21 | `GET /api/v1/friends/requests` | `FriendRequestsParams` (`received \| sent`) → `FriendshipListResponse` | `services/friendshipService.ts` *(sửa param + `OffsetPage`)* |
| 29 | `POST /api/v1/friends/requests` | `SendFriendRequest` (`recipientId \| recipientPublicHandle \| qrSessionToken`) → `FriendshipResponse \| QrFriendRequestResponse` | `services/friendshipService.ts` *(sửa body `{ recipientId }`)* |
| 30 | `POST /api/v1/friends/requests/:requestId/accept` | → `FriendshipResponse` | `services/friendshipService.ts` |
| 31 | `POST /api/v1/friends/requests/:requestId/reject` | → `FriendshipResponse` | `services/friendshipService.ts` |
| 32 | `DELETE /api/v1/friends/:friendshipId` | Param là `friendshipId` → `204` | `services/friendshipService.ts` *(sửa ID)* |
| 22 | `GET /api/v1/friends/qr-profiles/:publicHandle` | → `PublicQrProfileResponse` *(chỉ preview, không auto-friend)* | Màn QR kết bạn (`FE-29`) |
| 23 | `GET /api/v1/friends/qr-sessions/:token` | → `TemporaryQrProfileResponse` | Màn QR kết bạn (`FE-29`) |
| 24 | `DELETE /api/v1/friends/qr-sessions/:sessionId` | → `204` | Màn QR kết bạn (`FE-29`) |
| 25 | `POST /api/v1/friends/qr-sessions` | → `CreateFriendQrSessionResponse` | Màn QR kết bạn (`FE-29`) |
| 26 | `POST /api/v1/friends/public-handle/rotate` | → `PublicHandleResponse` (non-null) | Màn QR kết bạn (`FE-29`) |
| 27 | `GET /api/v1/friends/public-handle` | → `PublicHandleResponse` (`null` nếu tắt) | Màn QR kết bạn (`FE-29`) |
| 28 | `DELETE /api/v1/friends/public-handle` | → `204` | Màn QR kết bạn (`FE-29`) |

### 4.3. Meetup, Lời mời, Sở thích + Ngân sách/AI (PR #17), Vote/Finish & Invite Links (FE-07, FE-08, FE-09, FE-12, FE-28)

| STT | Endpoint | Request / Response Type (`@/types/api`) | File đích FE1 |
|---|---|---|---|
| 33 | `POST /api/v1/meetups` | `CreateMeetupRequest` → `MeetupDetailResponse` | `services/meetupService.ts` *(đã gắn)* |
| 34 | `GET /api/v1/meetups` | `MeetupPageParams` → `MeetupListResponse` | `services/meetupService.ts` *(đã gắn)* |
| 35 | `GET /api/v1/meetups/history` | `MeetupPageParams` → `MeetupHistoryListResponse` | `app/(app)/history.tsx` (`FE-14`) |
| 36 | `GET /api/v1/meetups/:meetupId` | → `MeetupDetailResponse` *(participants có thêm `budgetVnd`)* | `services/meetupService.ts` *(đã gắn)* |
| 37 | `PATCH /api/v1/meetups/:meetupId` | `UpdateMeetupRequest` → `MeetupDetailResponse` | `services/meetupService.ts` *(đã gắn)* |
| 38 | `POST /api/v1/meetups/:meetupId/invitations` | `InviteParticipantsRequest` → `MeetupDetailResponse` | `services/meetupService.ts` *(sửa path)* |
| 39 | `POST /api/v1/meetups/:meetupId/invitations/accept` | → `MeetupDetailResponse` | `app/(app)/meetup/invitations.tsx` (`FE-08`) |
| 40 | `POST /api/v1/meetups/:meetupId/invitations/reject` | → `MeetupDetailResponse` | `app/(app)/meetup/invitations.tsx` (`FE-08`) |
| 41 | `POST /api/v1/meetups/:meetupId/leave` | → `MeetupDetailResponse` | `app/(app)/meetup/[meetupId]/index.tsx` (`FE-08`) |
| 42 | `DELETE /api/v1/meetups/:meetupId/participants/:userId` | → `MeetupDetailResponse` | `services/meetupService.ts` *(đã gắn)* |
| 43 | `POST /api/v1/meetups/:meetupId/cancel` | → `MeetupDetailResponse` | `services/meetupService.ts` *(đã gắn)* |
| 44 | `POST /api/v1/meetups/:meetupId/finish` | → `MeetupDetailResponse` | Màn chi tiết / vote meetup (`FE-07`/`FE-12`) |
| 45 | `GET /api/v1/meetups/:meetupId/preferences` | → `MeetupMemberPreferenceResponse` *(có `budgetVnd`)* | `app/(app)/meetup/[meetupId]/preferences.tsx` (`FE-09`) |
| 46 | `PUT /api/v1/meetups/:meetupId/preferences` | `SetMeetupPreferencesRequest` (`preferences`, `budgetVnd?: number \| null`, `aiSuggestionId?`) → `MeetupMemberPreferenceResponse` | `app/(app)/meetup/[meetupId]/preferences.tsx` (`FE-09`) |
| 47 | `GET /api/v1/meetups/:meetupId/preferences/summary` | → `MeetupPreferenceSummaryResponse` | `app/(app)/meetup/[meetupId]/preferences.tsx` (`FE-09`) |
| 47a | `POST /api/v1/meetups/:meetupId/preferences/suggest` | `SuggestMeetupPreferencesRequest` → `SuggestMeetupPreferencesResponse` *(PR #17: chỉ draft, chỉ lưu khi user xác nhận qua STT 46 và gửi kèm `aiSuggestionId`)* | `app/(app)/meetup/[meetupId]/preferences.tsx` (`FE-09`) |
| 48 | `PUT /api/v1/meetups/:meetupId/recommendation-runs/:runId/vote` | `CastMeetupVoteRequest` → `CastMeetupVoteResponse` | `app/(app)/meetup/[meetupId]/vote.tsx` *(hiện dùng `recommendationService.castVote`)* |
| 49 | `POST /api/v1/meetups/:meetupId/recommendation-runs/:runId/finalize` | `FinalizeMeetupRequest` → `FinalizeMeetupResponse` | `app/(app)/meetup/[meetupId]/vote.tsx` *(hiện dùng `recommendationService.finalizeMeetup`)* |
| 50 | `POST /api/v1/meetups/:meetupId/invite-links` | `CreateMeetupInviteLinkRequest` → `MeetupInviteLinkResponse` | Màn link mời meetup (`FE-28`) |
| 51 | `DELETE /api/v1/meetups/:meetupId/invite-links/:linkId` | → `204` | Màn link mời meetup (`FE-28`) |
| 52 | `GET /api/v1/meetup-invites/:token/preview` | → `MeetupInvitePreviewResponse` *(Public; không lộ thành viên/vị trí)* | Deep link invite preview (`FE-28`) |
| 53 | `POST /api/v1/meetup-invites/:token/accept` | → `AcceptMeetupInviteResponse` | Deep link invite accept (`FE-28`) |

### 4.4. Favorites & Admin (FE-14, FE-18)

| STT | Endpoint | Request / Response Type (`@/types/api`) | File đích FE1 |
|---|---|---|---|
| 61 | `GET /api/v1/favorites/places` | → `FavoritePlaceResponse[]` | `app/(app)/favorites.tsx` *(có sẵn `recommendationService.listFavorites`)* |
| 62 | `POST /api/v1/favorites/places` | `AddFavoritePlaceRequest` → `FavoritePlaceResponse` | `app/(app)/favorites.tsx` *(có sẵn `addFavorite`)* |
| 63 | `DELETE /api/v1/favorites/places/:placeId` | → `204` | `app/(app)/favorites.tsx` *(có sẵn `removeFavorite`)* |
| 71 | `POST /api/v1/admin/accounts/:accountId/lock` | `AdminAccountLockRequest` → `AdminAccountLockResponse` | `app/(app)/admin/users.tsx` (`FE-18`) |
| 72 | `DELETE /api/v1/admin/accounts/:accountId/lock` | → `AdminAccountLockResponse` | `app/(app)/admin/users.tsx` (`FE-18`) |

*(Lưu ý: BE hiện chưa có endpoint `GET /admin/accounts` hay `admin/reports`, nên phần danh sách nếu chưa có trên BE có thể tạm giữ mock hoặc nhập UUID/đối chiếu BE trước.)*

### 4.5. Socket.IO `/realtime` Events liên quan tới FE1

| Event | Tài liệu BE | Ý nghĩa cho FE1 |
|---|---|---|
| `MeetupCreated.v1`, `MeetupUpdated.v1`, `MeetupCancelled.v1`, `MeetupFinished.v1` | STT R7 (`MeetupCreatedV1`, `MeetupLifecycleV1`) | Cập nhật `useMeetupStore` / danh sách lời mời & chi tiết meetup (`hooks/useMeetupRealtime.ts` đã lắng nghe phần lớn các event này) |
| `MeetupMemberChanged.v1`, `MeetupInviteLinkAccepted.v1` | STT R7 | Cập nhật danh sách thành viên trong chi tiết meetup |
| `PreferenceUpdated.v1` | STT R7 | Refetch `GET /meetups/:meetupId/preferences/summary` |
| `VoteUpdated.v1`, `MeetupFinalized.v1` | STT R7 | Cập nhật số phiếu bầu và trạng thái chốt địa điểm ở màn `vote.tsx` & `index.tsx` |

*(Ghi chú: Outbox/realtime chỉ gửi reference metadata, FE cần refetch endpoint REST canonical sau khi nhận event.)*

---

## 5. Tài nguyên dùng chung đã có sẵn từ FE2 (FE1 tái sử dụng trực tiếp)

Để tránh trùng lặp code và xung đột, FE1 **không cần viết lại** các module sau:
- **`types/api.ts`:** Đầy đủ toàn bộ request/response DTO và Socket IntegrationEvent (đã cập nhật PR #17, 0 warning ESLint).
- **`services/recommendationService.ts` & `store/useRecommendationStore.ts`:** Đã có sẵn `castVote`, `finalizeMeetup`, `listFavorites`, `addFavorite`, `removeFavorite`, `recordFeedback` — màn `vote.tsx` và `favorites.tsx` của FE1 có thể gọi thẳng các method này.
- **`hooks/useSocket.ts` & `hooks/useMeetupRealtime.ts`:** Socket singleton kết nối `/realtime` kèm JWT auth tự động làm mới, heartbeat và `joinMeetup`.
- **`services/systemService.ts`:** Service kiểm tra `getHealth()` và `getReadiness()`.
- **Quy ước bắt buộc toàn app:**
  - Song ngữ **chỉ** thông qua `locales/vi.json` & `locales/en.json` + `useTranslation()` (tuyệt đối không dùng `isVi`/`isEn`).
  - Hỗ trợ Dark/Light mode đầy đủ qua `useTheme()`.
  - Có Skeleton loading, Pull-to-Refresh (`RefreshControl`), và chặn double-tap bằng `useSinglePress` / `disabled`.

---

## 6. Kịch bản Test E2E liên thông FE1 ↔ FE2 (sau khi gắn P0–P3)

1. **Migration & Khởi động Backend:** Chạy `npm run migration:run` và `npm run start:dev` ở `Meet-Up-Mobile-App-BE`; vào màn Dev Hiệu năng ở FE kiểm tra thẻ Backend System Status hiện `PostgreSQL: Hoạt động`, `Redis: Hoạt động`, `Outbox Worker: Hoạt động`.
2. **Tạo 2 tài khoản thật (FE1):** Đăng ký `User A` và `User B` trên 2 thiết bị/máy ảo.
3. **Kết bạn (FE1 P0):** `User A` tìm kiếm `User B`, gửi lời mời kết bạn (`POST /friends/requests { recipientId }`), `User B` chấp nhận (`POST /friends/requests/:requestId/accept`).
4. **Chia sẻ vị trí & Bản đồ bạn bè (FE2):** Cả hai bật chia sẻ vị trí ở *Cài đặt vị trí*; kiểm tra trên *Bản đồ bạn bè* thấy marker thật (tự cập nhật realtime qua `friend:location:updated`, đổi sang `Chế độ vị trí gần đúng ~1.1km` thấy tọa độ làm tròn).
5. **Tạo Meetup & Nhận lời mời (FE1 P1):** `User A` tạo Meetup mời `User B`; `User B` mở màn Lời mời nhấn Chấp nhận (`POST .../invitations/accept`).
6. **Sở thích nhóm, Ngân sách & AI Draft (FE1 P3):** Cả hai chọn sở thích + `budgetVnd` (hoặc thử `POST .../preferences/suggest` với tin nhắn/audio nếu `MEETUP_PREFERENCE_AI_ENABLED=true`) và lưu qua `PUT .../preferences`.
7. **Gợi ý địa điểm, AI giải thích & Feedback (FE2):** Mở màn Gợi ý địa điểm từ chi tiết Meetup → kiểm tra Top 5 có ETA từng người với tên thật của `User A`/`User B`, mở "Vì sao gợi ý?" để xem giải thích Gemini AI (`source === 'ai'` hoặc fallback).
8. **Bình chọn, Chốt, Chat nhóm & Chat 1-1 (FE1 + FE2):** Vote thử địa điểm, chốt địa điểm, nhắn tin kèm ảnh/tệp/vị trí trong Chat nhóm Meetup và Chat 1-1 giữa `User A` và `User B`.

