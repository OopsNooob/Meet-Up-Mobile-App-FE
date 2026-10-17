# Quy ước Frontend — MeetUp Mobile

Tài liệu chung cho **Frontend 1** và **Frontend 2**. Đọc trước khi thêm màn hình/component mới.
Thay thế phần cấu trúc thư mục trong `docs/08_ui_skeleton_design.md` (NativeWind đã bỏ, route đã tổ chức lại).

Stack: Expo SDK 57 · Expo Router (file-based) · TypeScript strict · Zustand · i18next · StyleSheet + theme tokens.

## 1. Cấu trúc thư mục

```text
app/                          # CHỈ chứa route (mỗi file = 1 màn hình). Không đặt component/hook ở đây.
  _layout.tsx                 # Root: ThemeProvider, ToastProvider, guard đăng nhập (Stack.Protected)
  +not-found.tsx
  (auth)/                     # Luồng chưa đăng nhập: login, register
  (app)/                      # Luồng đã đăng nhập
    _layout.tsx               # Stack + "sổ đăng ký" màn hình (title, modal, guard admin)
    (tabs)/                   # Bottom tabs: index (Bản đồ), meetups, friends, profile
    meetup/create, invitations, [meetupId]/{index, edit, preferences, recommendations, vote, chat}
    friend/search, requests
    place/[placeId]/{index, explanation}
    history, favorites
    settings/location, nearby
    admin/users, reports      # chỉ role admin
    dev/                      # màn test nội bộ (components gallery, notifications, performance)
components/
  common/                     # Component dùng chung toàn app — export qua components/common/index.ts
  map/, meetup/, ...          # Component đặc thù một feature
constants/routes.ts           # Tên route + params + deep link (nguồn duy nhất)
hooks/                        # Custom hook (useTheme, useAsyncResource, useSocket, useLocation, useFCM...)
services/                     # Gọi API/socket — mỗi domain một file (meetupService.ts...)
store/                        # Zustand store — mỗi domain một store (useXxxStore.ts)
theme/                        # colors.ts (light/dark), tokens.ts (spacing, radius, fontSize...)
types/                        # Type dùng chung: async.ts (AsyncState), domain.ts (enum nghiệp vụ), privacy.ts
locales/                      # vi.json, en.json
```

Import tuyệt đối bằng alias `@/`: `import { Button } from '@/components/common';` — không dùng `../../`.

## 2. Đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| File route | kebab-case / `[param]` theo URL | `app/(app)/meetup/[meetupId]/vote.tsx` |
| Component | PascalCase, 1 component chính/file | `components/common/StatusLabel.tsx` |
| Hook | `useXxx.ts` | `hooks/useAsyncResource.ts` |
| Store | `useXxxStore.ts` | `store/useMeetupStore.ts` |
| Service | `xxxService.ts` | `services/privacyService.ts` |
| Route param | camelCase + `Id` | `meetupId`, `placeId` |
| Thư mục route chi tiết | số ít; tab danh sách số nhiều | `meetup/[meetupId]` vs tab `meetups` |
| i18n key | `nhóm.tên_snake_case` | `screens.meetup_detail`, `errors.offline.title` |

Mỗi màn hình route `export default function XxxScreen()`; tab dùng hậu tố `Tab` (`MeetupsTab`).

## 3. Điều hướng

- **Luôn** dùng `routes` trong `constants/routes.ts`, không viết tay chuỗi path và không cast `as any`:
  ```ts
  router.push(routes.meetupDetail(meetupId));
  router.push(routes.placeExplanation(placeId, placeName));
  <Link href={routes.friendRequests} />
  ```
- Typed routes đang bật: path sai sẽ báo lỗi khi `npx tsc --noEmit`. Types sinh ra khi chạy `npx expo start`.
- Đọc params bằng type khai báo sẵn: `const { meetupId } = useLocalSearchParams<MeetupRouteParams>();`
- Guard: `app/_layout.tsx` chuyển (auth) ↔ (app) theo `useAuthStore`; admin được guard ở `app/(app)/_layout.tsx`.
- Deep link: `mobile://meetup/<id>` mở thẳng `app/(app)/meetup/[meetupId]/index.tsx` (Expo Router tự map URL).
  Tạo link bằng `deepLinks.meetup(id)`. Test: `npx uri-scheme open "mobile://meetup/123" --android`.

### Thêm màn hình mới

1. Tạo file route trong `app/(app)/...` theo URL mong muốn (không thêm route group theo tên người làm).
2. Khai báo `<Stack.Screen name="..." options={{ title: t('screens.xxx') }} />` trong `app/(app)/_layout.tsx`.
3. Thêm path vào `constants/routes.ts` (+ type params nếu là route động).
4. Thêm key i18n vào **cả** `locales/vi.json` và `locales/en.json`.
5. Màn chưa làm thì dùng `<PlaceholderScreen task="FE-xx" title=... />` để giữ chỗ.

## 4. Theme & style

- Dùng `StyleSheet` + token. **Không** hardcode mã màu, không dùng số "ma thuật" cho spacing/font/radius.
  ```ts
  const { colors } = useTheme();             // màu theo light/dark
  import { spacing, radius, fontSize, fontWeight } from '@/theme';
  ```
- Màu ngữ nghĩa: `primary`, `success`, `warning`, `danger`, `info`, `neutral`, `purple` (+ `xxxLight` làm nền).
  Chữ trên nền màu đậm dùng `colors.onPrimary`.
- Màu phụ thuộc theme thì truyền inline (`{ color: colors.text }`) hoặc `useMemo(() => makeStyles(colors), [colors])`.
- Cần token mới → thêm vào `theme/`, không khai báo cục bộ.

## 5. Component dùng chung (`@/components/common`)

> **Quy tắc: kiểm tra `components/common` (và màn `dev/components` trong Dev menu) trước khi tạo component mới.**
> Nếu cần biến thể, mở rộng props của component có sẵn thay vì copy. Component chỉ dùng trong 1 feature thì để ở `components/<feature>/`.

| Component | Dùng khi |
|---|---|
| `Screen` | Khung mọi màn: nền, safe area, padding, `scroll`, `keyboardAvoiding`, `footer`. Tab: `edges={['left','right']}`; màn không header: `edges={['top','left','right','bottom']}` |
| `Button` | `variant` primary/secondary/danger/ghost, `size`, `loading`, `disabled`, `icon`. Đã chống double-tap |
| `TextField` | Ô nhập có `label`, `error`, `hint` |
| `Card` | Khối nội dung; có `onPress` thì bấm được |
| `Avatar` | Ảnh đại diện, tự fallback chữ cái đầu tên khi không có/lỗi ảnh |
| `Badge` | Nhãn pill tự do theo `tone` |
| `StatusLabel` | **Mọi trạng thái nghiệp vụ**: vị trí `live/stale/approximate/location_missing`, kết nối `offline/reconnecting`, GPS `gps_denied/gps_off`, kết quả `exact/batch/cluster`, meetup `meetup_<status>`, thành viên `member_<status>` |
| `LoadingState` / `EmptyState` / `ErrorState` | 3 trạng thái thiếu dữ liệu (thường dùng qua `AsyncView`) |
| `AsyncView` | Render thống nhất loading/empty/error/success |
| `ConfirmDialog` | Xác nhận thao tác quan trọng (hủy meetup, chốt địa điểm, khóa tài khoản). `onConfirm` trả Promise → tự loading + hiện lỗi |
| `useToast()` | Thông báo ngắn: `toast.show(msg, { tone: 'success' })` |
| `LanguageToggle` | Nút vi/en trên header |
| `PlaceholderScreen` | Giữ chỗ cho màn chưa làm |
| `SkeletonBox`, `PlaceCardSkeleton`... | Skeleton loading (truyền vào `LoadingState skeleton={...}`) |

## 6. Pattern trạng thái màn hình

Mọi dữ liệu tải về ở đúng 1 trong 4 trạng thái — `AsyncState<T>` trong `types/async.ts`:

```tsx
const { state, reload } = useAsyncResource(() => meetupService.list(), []);

return (
  <Screen>
    <AsyncView
      state={state}
      onRetry={reload}
      empty={{ title: t('meetup.list_empty'), actionLabel: t('meetup.create'), onAction: () => router.push(routes.meetupCreate) }}
    >
      {(meetups) => <MeetupList data={meetups} />}
    </AsyncView>
  </Screen>
);
```

- Lỗi luôn chuẩn hóa thành `AppError { code }` (`toAppError(err)`); mỗi `code` có tiêu đề + mô tả trong `errors.<code>` →
  người dùng luôn biết **vì sao** không có dữ liệu (offline, mất quyền GPS, hết phiên...).
- **Không giả vờ realtime**: dữ liệu cũ/cache thì set `isStale: true` + `updatedAt` → `AsyncView` tự hiện nhãn "Vị trí cũ · cập nhật lúc hh:mm".
  Vị trí > 5 phút dùng `<StatusLabel kind="stale" />`.
- Mảng rỗng tự thành `empty` (`asyncFromData`). Luôn truyền `empty.title` riêng cho từng màn.

## 7. State & dữ liệu

- Zustand, mỗi domain một store; không tạo store mới nếu domain đã có (`useAuthStore`, `useAppStore`, `useMeetupStore`, `usePrivacyStore`).
- Enum nghiệp vụ (meetup status, route strategy...) lấy từ `types/domain.ts` — không khai báo lại.
- State chỉ dùng trong 1 màn → `useState` trong màn đó, không đưa vào store.
- Gọi API/socket đặt trong `services/` hoặc hook; màn hình không gọi axios trực tiếp.

## 8. i18n

- Không viết chuỗi hiển thị cứng trong màn sản phẩm — dùng `t('...')`. (Màn `dev/` được phép.)
- Key mới phải có ở cả `vi.json` và `en.json`. Nhóm sẵn có: `common`, `status`, `errors`, `screens`, `placeholder`, `auth`, `profile`, `tabs`, `meetup`, `fe2.*`.

## 9. Trước khi tạo PR

```bash
npx tsc --noEmit   # typecheck (kể cả typed routes)
npx expo lint
```
Thử chuyển qua lại các màn liên quan trên thiết bị/emulator (Expo Go: `npx expo start`).

## 10. Lưu ý môi trường (OneDrive)

Repo đang nằm trong OneDrive. Đổi tên/di chuyển thư mục route có thể khiến OneDrive biến thư mục thành
reparse point → Metro/Expo Router **bỏ qua cả thư mục** (route biến mất, typed routes thiếu). Nếu gặp:
tạo thư mục mới rồi `git mv` từng file sang. Tốt nhất nên để repo ngoài OneDrive.