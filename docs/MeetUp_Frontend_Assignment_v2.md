# MeetUp_Frontend_Assignment_v2

## Tổng quan FE

### MeetUp Frontend - Phân công chức năng

Workbook dành cho Frontend Mobile/Admin tối giản. Phân công theo domain để hai người làm song song và giảm xung đột code.

| Chỉ số | Giá trị |
|---|---|
| Tổng điểm chức năng FE | 209 |
| Chức năng Core | 17 |
| Chức năng Planned | 12 |
| Điểm Core | 139 |
| Điểm Planned | 70 |
| Số thành viên FE | 2 |

| Thành viên | Phụ trách chính | Điểm FE | Tỷ lệ | Mảng chính |
|---|---|---|---|---|
| Frontend 1 | Account, social và nghiệp vụ meetup | 97 | 46.4% | App shell, auth, profile, friendship, meetup, preference, vote, history, favorite, navigation, admin, error/privacy states, invite link, QR kết bạn |
| Frontend 2 | GPS, map, realtime và tích hợp ngoài | 112 | 53.6% | GPS permission, friend map, Socket client, recommendation/ETA, Places, FCM/deep link, chat, AI explanation, nearby, mobile performance, feedback/impression, scheduledAt/stale, travel mode/traffic, weather, closing-soon, kết quả theo viewer |

| Sprint | Mục tiêu Frontend | Chức năng chính | Kết quả cần có |
|---|---|---|---|
| S1 | App shell, tài khoản và quan hệ | FE-01 đến FE-03, FE-21 | Đi vào app, profile, kết bạn và navigation/component chung chạy ổn định |
| S2 | GPS, privacy và realtime map | FE-04 đến FE-06 | Xin quyền đúng, map có marker/stale state, Socket reconnect không nhân listener |
| S3 | Meetup flow và preference | FE-07 đến FE-09 | Tạo/mời/phản hồi meetup, preference tạm thời và trạng thái rõ ràng |
| S4 | Recommendation, giờ gặp và vote | FE-10, FE-12, FE-23 | Top 5 có ETA/scale label; opening tại giờ gặp và xử lý run cũ; vote realtime và chốt địa điểm |
| S5 | Thông báo, tiện ích và kết quả mở rộng | FE-11, FE-13, FE-14, FE-26 đến FE-28 | Open-now, FCM/deep link, lịch sử/yêu thích/dẫn đường; cảnh báo sắp đóng cửa, kết quả theo viewer, link mời meetup |
| S6–S7 | Chat, AI, nearby, admin, mở rộng và chất lượng | FE-15 đến FE-20, FE-22, FE-24, FE-25, FE-29 | Chat/AI fallback/nearby, admin tối giản, error state và demo Android ổn định; feedback event, travel mode/traffic, weather và QR kết bạn |

| Nguyên tắc | Áp dụng |
|---|---|
| Chia theo domain | Frontend 1 sở hữu account/social/meetup flow; Frontend 2 sở hữu GPS/map/realtime/recommendation/integration. Hạng mục mở rộng chia theo domain; phần giao thoa/nhập nhằng giao Frontend 2. |
| Nguồn sở thích | MeetupMemberPreference ưu tiên; profile chỉ dùng để điền sẵn. |
| Privacy và stale state | UI phải hiển thị rõ quyền GPS, vị trí cũ, mất mạng và trường hợp thiếu dữ liệu; không giả vờ realtime. |
| Review bắt buộc | PR giao thoa navigation, state, Socket event, location, FCM và recommendation cần reviewer từ Frontend còn lại. |
| scheduledAt | Hiển thị giờ gặp và trạng thái mở cửa tại giờ gặp (OPEN/CLOSED/UNKNOWN); đổi giờ gặp làm kết quả cũ thành STALE_CONTEXT nên phải chạy lại; không tự suy ra giờ khởi hành. |
| Cảnh báo địa điểm | Sắp đóng cửa và thời tiết chỉ hiển thị theo dữ liệu Backend trả về; thiếu dữ liệu thì không gắn nhãn; FE không tự lọc hay xếp hạng lại. |
| Kết quả theo viewer | Mọi participant thấy ETA; chỉ hiển thị preference/utility của chính mình; sau vote/chốt gọi lại cùng recommendation run, không tạo run mới. |
| Link mời và QR | Không ghi raw token vào log; preview tối thiểu; QR chỉ dẫn tới luồng gửi lời mời hiện có, không tự kết bạn; xử lý rõ hết hạn/thu hồi/rate-limit. |

## Chức năng FE

### Chức năng Frontend để chia việc

Mỗi dòng là một đơn vị giao việc. Người phụ trách chính chịu trách nhiệm UI, state, tích hợp API/event, test luồng chính và demo. FE-22 đến FE-29 là phạm vi mở rộng đối ứng Backend (BE-24, BE-28 đến BE-34); hạng mục giao thoa hoặc nhập nhằng giao Frontend 2.

| Mã | Chức năng Frontend | UI / State / Integration chính | Phạm vi | Điểm FE | Phụ trách | Sprint | Phụ thuộc | Tiêu chí hoàn thành |
|---|---|---|---|---|---|---|---|---|
| FE-01 | Xác thực và phiên đăng nhập | Màn hình đăng ký/đăng nhập Email + Google; loading/error; logout/refresh token | Core | 8 | Frontend 1 | S1 | - | Đăng nhập/đăng xuất rõ trạng thái; tài khoản lỗi/khóa hiển thị đúng |
| FE-02 | Hồ sơ và sở thích profile | Profile, avatar/tên, sở thích mặc định dùng để prefill | Core | 5 | Frontend 1 | S1 | FE-01 | Profile chỉ là dữ liệu điền sẵn, không ghi đè preference meetup |
| FE-03 | Bạn bè | Tìm kiếm, gửi/nhận lời mời, accept/reject, danh sách bạn bè | Core | 8 | Frontend 1 | S1 | FE-01 | Không cho tự kết bạn; trạng thái lời mời cập nhật đúng |
| FE-04 | Quyền GPS và cài đặt chia sẻ vị trí | Xin quyền hệ điều hành, bật/tắt chia sẻ, giải thích khi từ chối/tắt GPS | Core | 8 | Frontend 2 | S2 | FE-01 | Có retry; UI phản ánh chính xác trạng thái quyền/chia sẻ |
| FE-05 | Bản đồ bạn bè realtime | Map, marker bạn bè, updatedAt, accuracy, nhãn vị trí cũ | Core | 13 | Frontend 2 | S2 | FE-04 | Vị trí >5 phút hiển thị cũ; marker cập nhật gần realtime |
| FE-06 | Socket client và vòng đời location | Kết nối Socket.IO, reconnect, presence, subscribe/unsubscribe event vị trí/meetup | Core | 8 | Frontend 2 | S2 | FE-01, FE-04 | Mất mạng/reconnect không nhân đôi listener; chỉ hiển thị event hợp lệ |
| FE-07 | Tạo/sửa/hủy Meetup | Form tên/thời gian/loại/bán kính, chọn thành viên, màn chi tiết và trạng thái meetup | Core | 13 | Frontend 1 | S3 | FE-03 | Không có giới hạn cứng số người; trạng thái meetup rõ ràng |
| FE-08 | Lời mời và phản hồi Meetup | Danh sách lời mời; accept/reject; trạng thái thành viên cập nhật realtime | Core | 5 | Frontend 1 | S3 | FE-07 | Không phản hồi meetup đã hủy/chốt; người tạo thấy cập nhật |
| FE-09 | Sở thích tạm thời Meetup | UI chọn tag high/normal/avoid; prefill từ profile; chỉnh trước khi chốt | Core | 5 | Frontend 1 | S3 | FE-02, FE-07 | Preference meetup được hiển thị/lưu riêng với profile |
| FE-10 | Kết quả gợi ý địa điểm | Top 5, rating, Avg ETA, Max ETA, ETA từng người, nhãn exact/batch/cluster | Core | 13 | Frontend 2 | S4 | FE-05, FE-07, FE-09 | Thiếu vị trí hiển thị rõ; kết quả theo quy mô được gắn nhãn đúng |
| FE-11 | Chi tiết địa điểm và lọc đang mở cửa | Place card/detail, trạng thái giờ mở cửa, bật/tắt lọc open-now | Planned | 5 | Frontend 2 | S5 | FE-10 | Nếu Places thiếu giờ mở phải hiện 'chưa có dữ liệu', không tự suy đoán |
| FE-12 | Vote realtime và chốt địa điểm | Vote/đổi vote, tổng phiếu realtime, người tạo chốt, trạng thái finalized | Core | 8 | Frontend 1 | S4 | FE-06, FE-07, FE-10 | Một vote/người; khóa thao tác sau khi chốt |
| FE-13 | FCM, nhắc lịch và deep link | Nhận notification lời mời/chốt/nhắc lịch; chạm mở đúng màn hình | Core | 8 | Frontend 2 | S5 | FE-07, FE-12 | Notification điều hướng đúng meetup; xử lý app foreground/background |
| FE-14 | Lịch sử, yêu thích và dẫn đường | Danh sách meetup cũ, lưu/bỏ lưu địa điểm, mở Google Maps tới nơi đã chốt | Planned | 8 | Frontend 1 | S5 | FE-10, FE-12 | Không hiển thị/lưu lịch sử GPS; favorite không trùng |
| FE-15 | Chat nhóm trong Meetup | Danh sách tin, gửi/nhận realtime, trạng thái gửi/lỗi/reconnect | Planned | 8 | Frontend 2 | S6 | FE-06, FE-07 | Chỉ thành viên hợp lệ đọc/gửi; UI báo lỗi khi mất mạng |
| FE-16 | AI giải thích đề xuất | Nút 'Vì sao gợi ý?', modal/card giải thích, fallback theo rule khi AI lỗi | Planned | 5 | Frontend 2 | S6 | FE-10 | Không hiển thị dữ liệu nhạy cảm; timeout dùng lý do fallback |
| FE-17 | Phát hiện bạn ở gần | Opt-in, chọn ngưỡng, notification/gợi ý tạo meetup, trạng thái cooldown | Planned | 5 | Frontend 2 | S6 | FE-04, FE-05, FE-13 | Chỉ gợi ý khi opt-in; không lộ vị trí chính xác |
| FE-18 | Admin tối giản | Danh sách tài khoản, khóa/mở khóa, báo cáo và số liệu cơ bản | Planned | 5 | Frontend 1 | S7 | FE-01 | Thao tác quản trị có confirm/error state rõ ràng |
| FE-19 | Trạng thái lỗi, offline và privacy | Màn/empty state cho GPS deny, stale location, network/socket lỗi, thiếu quyền | Core | 8 | Frontend 1 | S7 | FE-04, FE-05, FE-06, FE-10 | Không giả vờ realtime; người dùng luôn biết vì sao dữ liệu thiếu |
| FE-20 | Hiệu năng mobile và chuẩn bị demo | Theo dõi loading/re-render, số update vị trí, polish luồng demo, kiểm tra Android thật | Core | 8 | Frontend 2 | S7 | FE-05, FE-06, FE-10 | Demo ổn định; có số liệu update/độ trễ cần thiết cho phần kiểm thử |
| FE-21 | App shell, navigation và component dùng chung | Navigation structure, theme/component cơ bản, loading/empty/error component dùng chung | Core | 8 | Frontend 1 | S1 | - | Hai frontend dùng cùng convention; tránh tạo component/state trùng chức năng |
| FE-22 | Impression và feedback gợi ý | Gửi RecommendationShown khi kết quả thật sự hiển thị; liên kết vote, chọn địa điểm, dẫn đường, yêu thích theo runId/eventId (đối ứng BE-24) | Planned | 5 | Frontend 2 | S6 | FE-10, FE-12, FE-14 | Chỉ gửi khi kết quả đã hiển thị; không gửi lặp khi re-render/reconnect; lỗi feedback không chặn UI và không chạy lại recommendation |
| FE-23 | Giờ gặp (scheduledAt) và opening theo giờ gặp | Hiển thị scheduledAt, trạng thái OPEN/CLOSED/UNKNOWN tại giờ gặp và etaSeconds; xử lý STALE_CONTEXT khi đổi giờ gặp (đối ứng BE-28) | Core | 8 | Frontend 2 | S4 | FE-07, FE-10 | Run cũ sau khi đổi giờ gặp hiện cảnh báo và yêu cầu chạy lại; UNKNOWN hiện 'chưa có dữ liệu'; không tự suy ra giờ khởi hành |
| FE-24 | Phương tiện theo thành viên và nhãn traffic | UI chọn TWO_WHEELER/DRIVE cho từng thành viên (mặc định TWO_WHEELER); hiển thị nhãn traffic-aware/unaware và thông báo fallback (đối ứng BE-29) | Planned | 5 | Frontend 2 | S6 | FE-07, FE-10 | Chỉ cho chọn TWO_WHEELER/DRIVE; nhãn traffic theo dữ liệu Backend trả về (FE không có công tắc traffic); không tự suy ra giờ khởi hành hay mức kẹt xe |
| FE-25 | Cảnh báo thời tiết và lọc địa điểm outdoor | Cảnh báo thời tiết trên place card; thông báo khi outdoor bị lọc hoặc đã nới về cảnh báo; ẩn hoàn toàn khi Weather OFF (đối ứng BE-30) | Planned | 5 | Frontend 2 | S7 | FE-10, FE-23 | Thiếu/lỗi dữ liệu thời tiết thì không gắn nhãn và không suy đoán; kết quả filter rỗng phải báo rõ đã nới về cảnh báo |
| FE-26 | Cảnh báo sắp đóng cửa | Badge/cảnh báo 'Sắp đóng cửa' trên place card và chi tiết địa điểm (đối ứng BE-31) | Planned | 3 | Frontend 2 | S5 | FE-10, FE-23 | CLOSING_SOON vẫn hiển thị kèm cảnh báo; unknown không gắn nhãn; FE không tự sắp xếp lại theo penalty |
| FE-27 | Kết quả gợi ý theo người xem | Hiển thị ETA của mọi thành viên; chỉ hiện matched tags/preference/utility của chính mình; gọi lại GET cùng run sau vote/chốt (đối ứng BE-32) | Core | 5 | Frontend 2 | S5 | FE-10, FE-12 | Không hiển thị preference/utility của người khác; sau vote/chốt không tạo run mới và không đổi thứ hạng |
| FE-28 | Liên kết mời Meetup | Tạo/chia sẻ/thu hồi link mời; mở deep link xem preview tối thiểu; accept qua link; xử lý hết hạn/đã thu hồi (đối ứng BE-33) | Planned | 8 | Frontend 1 | S5 | FE-07, FE-08, FE-13 | Preview không lộ thành viên/vị trí; accept không bị gửi lặp; báo rõ link hết hạn/thu hồi/meetup đã hủy hoặc chốt; không log raw token |
| FE-29 | QR kết bạn | Hiển thị QR của mình (handle ổn định hoặc QR tạm có đếm ngược); quét QR, xem preview rồi gửi lời mời qua luồng kết bạn hiện có (đối ứng BE-34) | Planned | 8 | Frontend 1 | S6 | FE-01, FE-03 | Không auto-friend; xử lý QR hết hạn/thu hồi, tự kết bạn, trùng, bị chặn, rate-limit; xin quyền camera có giải thích khi bị từ chối |

## Backlog FE

### Backlog Frontend theo sprint

Đưa hạng mục sang Đang làm khi đã chốt API contract/event, UI state và tiêu chí hoàn thành với Backend. FE-22 đến FE-29 là hạng mục mở rộng theo BE-24, BE-28 đến BE-34.

| Mã | Hạng mục Frontend | Phạm vi | Điểm | Sprint | Phụ trách | Trạng thái | Phụ thuộc | Ghi chú | Mapping BE |
|---|---|---|---|---|---|---|---|---|---|
| FE-01 | Xác thực và phiên đăng nhập | Core | 8 | S1 | Frontend 1 | Sẵn sàng | - | Đăng nhập/đăng xuất rõ trạng thái; tài khoản lỗi/khóa hiển thị đúng | BE-01 |
| FE-02 | Hồ sơ và sở thích profile | Core | 5 | S1 | Frontend 1 | Sẵn sàng | FE-01 | Profile chỉ là dữ liệu điền sẵn, không ghi đè preference meetup | BE-02 |
| FE-03 | Bạn bè | Core | 8 | S1 | Frontend 1 | Sẵn sàng | FE-01 | Không cho tự kết bạn; trạng thái lời mời cập nhật đúng | BE-03 |
| FE-04 | Quyền GPS và cài đặt chia sẻ vị trí | Core | 8 | S2 | Frontend 2 | Sẵn sàng | FE-01 | Có retry; UI phản ánh chính xác trạng thái quyền/chia sẻ | BE-04 |
| FE-05 | Bản đồ bạn bè realtime | Core | 13 | S2 | Frontend 2 | Sẵn sàng | FE-04 | Vị trí >5 phút hiển thị cũ; marker cập nhật gần realtime | BE-05 |
| FE-06 | Socket client và vòng đời location | Core | 8 | S2 | Frontend 2 | Sẵn sàng | FE-01, FE-04 | Mất mạng/reconnect không nhân đôi listener; chỉ hiển thị event hợp lệ | BE-06 |
| FE-07 | Tạo/sửa/hủy Meetup | Core | 13 | S3 | Frontend 1 | Sẵn sàng | FE-03 | Không có giới hạn cứng số người; trạng thái meetup rõ ràng | BE-08 |
| FE-08 | Lời mời và phản hồi Meetup | Core | 5 | S3 | Frontend 1 | Sẵn sàng | FE-07 | Không phản hồi meetup đã hủy/chốt; người tạo thấy cập nhật | BE-08 |
| FE-09 | Sở thích tạm thời Meetup | Core | 5 | S3 | Frontend 1 | Sẵn sàng | FE-02, FE-07 | Preference meetup được hiển thị/lưu riêng với profile | BE-09 |
| FE-10 | Kết quả gợi ý địa điểm | Core | 13 | S4 | Frontend 2 | Sẵn sàng | FE-05, FE-07, FE-09 | Thiếu vị trí hiển thị rõ; kết quả theo quy mô được gắn nhãn đúng | BE-13, BE-14, BE-15, BE-16, BE-17, BE-22, BE-23, BE-28, BE-32 |
| FE-11 | Chi tiết địa điểm và lọc đang mở cửa | Planned | 5 | S5 | Frontend 2 | Sẵn sàng | FE-10 | Nếu Places thiếu giờ mở phải hiện 'chưa có dữ liệu', không tự suy đoán | BE-15, BE-28 |
| FE-12 | Vote realtime và chốt địa điểm | Core | 8 | S4 | Frontend 1 | Sẵn sàng | FE-06, FE-07, FE-10 | Một vote/người; khóa thao tác sau khi chốt | BE-10 |
| FE-13 | FCM, nhắc lịch và deep link | Core | 8 | S5 | Frontend 2 | Sẵn sàng | FE-07, FE-12 | Notification điều hướng đúng meetup; xử lý app foreground/background | BE-07 |
| FE-14 | Lịch sử, yêu thích và dẫn đường | Planned | 8 | S5 | Frontend 1 | Sẵn sàng | FE-10, FE-12 | Không hiển thị/lưu lịch sử GPS; favorite không trùng | BE-12, BE-20 |
| FE-15 | Chat nhóm trong Meetup | Planned | 8 | S6 | Frontend 2 | Sẵn sàng | FE-06, FE-07 | Chỉ thành viên hợp lệ đọc/gửi; UI báo lỗi khi mất mạng | BE-11 |
| FE-16 | AI giải thích đề xuất | Planned | 5 | S6 | Frontend 2 | Sẵn sàng | FE-10 | Không hiển thị dữ liệu nhạy cảm; timeout dùng lý do fallback | BE-23, BE-27 |
| FE-17 | Phát hiện bạn ở gần | Planned | 5 | S6 | Frontend 2 | Sẵn sàng | FE-04, FE-05, FE-13 | Chỉ gợi ý khi opt-in; không lộ vị trí chính xác | BE-18 |
| FE-18 | Admin tối giản | Planned | 5 | S7 | Frontend 1 | Sẵn sàng | FE-01 | Thao tác quản trị có confirm/error state rõ ràng | BE-19 |
| FE-19 | Trạng thái lỗi, offline và privacy | Core | 8 | S7 | Frontend 1 | Sẵn sàng | FE-04, FE-05, FE-06, FE-10 | Không giả vờ realtime; người dùng luôn biết vì sao dữ liệu thiếu | BE-04, BE-05, BE-06 |
| FE-20 | Hiệu năng mobile và chuẩn bị demo | Core | 8 | S7 | Frontend 2 | Sẵn sàng | FE-05, FE-06, FE-10 | Demo ổn định; có số liệu update/độ trễ cần thiết cho phần kiểm thử | BE-21 |
| FE-21 | App shell, navigation và component dùng chung | Core | 8 | S1 | Frontend 1 | Sẵn sàng | - | Hai frontend dùng cùng convention; tránh tạo component/state trùng chức năng | — |
| FE-22 | Impression và feedback gợi ý | Planned | 5 | S6 | Frontend 2 | Sẵn sàng | FE-10, FE-12, FE-14 | Chỉ gửi khi kết quả đã hiển thị; không gửi lặp khi re-render/reconnect; lỗi feedback không chặn UI và không chạy lại recommendation | BE-24 |
| FE-23 | Giờ gặp (scheduledAt) và opening theo giờ gặp | Core | 8 | S4 | Frontend 2 | Sẵn sàng | FE-07, FE-10 | Run cũ sau khi đổi giờ gặp hiện cảnh báo và yêu cầu chạy lại; UNKNOWN hiện 'chưa có dữ liệu'; không tự suy ra giờ khởi hành | BE-21 |
| FE-24 | Phương tiện theo thành viên và nhãn traffic | Planned | 5 | S6 | Frontend 2 | Sẵn sàng | FE-07, FE-10 | Chỉ cho chọn TWO_WHEELER/DRIVE; nhãn traffic theo dữ liệu Backend trả về (FE không có công tắc traffic); không tự suy ra giờ khởi hành hay mức kẹt xe | BE-29 |
| FE-25 | Cảnh báo thời tiết và lọc địa điểm outdoor | Planned | 5 | S7 | Frontend 2 | Sẵn sàng | FE-10, FE-23 | Thiếu/lỗi dữ liệu thời tiết thì không gắn nhãn và không suy đoán; kết quả filter rỗng phải báo rõ đã nới về cảnh báo | BE-30 |
| FE-26 | Cảnh báo sắp đóng cửa | Planned | 3 | S5 | Frontend 2 | Sẵn sàng | FE-10, FE-23 | CLOSING_SOON vẫn hiển thị kèm cảnh báo; unknown không gắn nhãn; FE không tự sắp xếp lại theo penalty | BE-31 |
| FE-27 | Kết quả gợi ý theo người xem | Core | 5 | S5 | Frontend 2 | Sẵn sàng | FE-10, FE-12 | Không hiển thị preference/utility của người khác; sau vote/chốt không tạo run mới và không đổi thứ hạng | BE-32 |
| FE-28 | Liên kết mời Meetup | Planned | 8 | S5 | Frontend 1 | Sẵn sàng | FE-07, FE-08, FE-13 | Preview không lộ thành viên/vị trí; accept không bị gửi lặp; báo rõ link hết hạn/thu hồi/meetup đã hủy hoặc chốt; không log raw token | BE-33 |
| FE-29 | QR kết bạn | Planned | 8 | S6 | Frontend 1 | Sẵn sàng | FE-01, FE-03 | Không auto-friend; xử lý QR hết hạn/thu hồi, tự kết bạn, trùng, bị chặn, rate-limit; xin quyền camera có giải thích khi bị từ chối | BE-34 |

## Phân công FE

### Phân công Frontend

Thay “Frontend 1–2” bằng tên thật. Tổng điểm được lấy trực tiếp từ sheet Chức năng FE.

| Thành viên | Vai trò Frontend | Điểm FE | Tỷ lệ | Mảng chính | Review bắt buộc |
|---|---|---|---|---|---|
| Frontend 1 | Account, social và nghiệp vụ meetup | 97 | 46.4% | App shell, auth, profile, friendship, meetup, preference, vote, history, favorite, navigation, admin, error/privacy states, invite link, QR kết bạn | GPS, map, Socket, recommendation (gồm scheduledAt, traffic, weather, closing-soon, viewer, feedback), FCM, chat, AI và nearby |
| Frontend 2 | GPS, map, realtime và tích hợp ngoài | 112 | 53.6% | GPS permission, friend map, Socket client, recommendation/ETA, Places, FCM/deep link, chat, AI explanation, nearby, mobile performance, feedback/impression, scheduledAt/stale, travel mode/traffic, weather, closing-soon, kết quả theo viewer | Luồng account/social/meetup, navigation/state chung và privacy UX, invite link, QR kết bạn |

| Nguyên tắc | Áp dụng |
|---|---|
| Phụ trách | Mỗi Frontend chịu UI, state, tích hợp API/event, test luồng chính và demo chức năng của mình. |
| Reviewer | Frontend còn lại review mọi PR giao thoa. Component/state dùng chung phải thống nhất trước khi merge. |
| Chức năng giao thoa | FE-04/05/06/07/10/12/13/15/22/23/24/27/28 cần chốt API, event và navigation contract trước khi làm song song. |
| Privacy | Không cache/log tọa độ chính xác ngoài phần cần thiết; stale/denied/offline phải có trạng thái UI rõ. |
| Sở thích | Profile chỉ prefill; ưu tiên MeetupMemberPreference trong màn meetup và recommendation. |
| Quy mô meetup | UI hiển thị kết quả exact/batch/cluster theo dữ liệu Backend trả về; không tự suy diễn. |
| Hạng mục mở rộng | FE-22 đến FE-29 đối ứng BE-24, BE-28 đến BE-34. Chia theo domain; hạng mục giao thoa hoặc nhập nhằng giao Frontend 2. |
| Cân tải | Nếu cần cân lại, ưu tiên chuyển FE-24 hoặc FE-26 sang Frontend 1 (Frontend 1 ít việc hơn ở S4–S6). |

## Function Points FE

### Function Points Frontend

Ước lượng chức năng phía Frontend để cân tải. Điểm là độ lớn tương đối, không phải số giờ công.

| Mã | Chức năng Frontend | UI / Flow | API / State | Realtime / Device | Điểm FE | Phụ trách | Cách hiểu |
|---|---|---|---|---|---|---|---|
| FE-01 | Xác thực và phiên đăng nhập | Nhiều | Nhiều | - | 8 | Frontend 1 | Màn hình đăng ký/đăng nhập Email + Google; loading/error; logout/refresh token |
| FE-02 | Hồ sơ và sở thích profile | Vừa | Vừa | - | 5 | Frontend 1 | Profile, avatar/tên, sở thích mặc định dùng để prefill |
| FE-03 | Bạn bè | Nhiều | Nhiều | Realtime | 8 | Frontend 1 | Tìm kiếm, gửi/nhận lời mời, accept/reject, danh sách bạn bè |
| FE-04 | Quyền GPS và cài đặt chia sẻ vị trí | Vừa | Vừa | GPS | 8 | Frontend 2 | Xin quyền hệ điều hành, bật/tắt chia sẻ, giải thích khi từ chối/tắt GPS |
| FE-05 | Bản đồ bạn bè realtime | Nhiều | Nhiều | Map + Realtime | 13 | Frontend 2 | Map, marker bạn bè, updatedAt, accuracy, nhãn vị trí cũ |
| FE-06 | Socket client và vòng đời location | Ít | Nhiều | Socket | 8 | Frontend 2 | Kết nối Socket.IO, reconnect, presence, subscribe/unsubscribe event vị trí/meetup |
| FE-07 | Tạo/sửa/hủy Meetup | Nhiều | Nhiều | Realtime | 13 | Frontend 1 | Form tên/thời gian/loại/bán kính, chọn thành viên, màn chi tiết và trạng thái meetup |
| FE-08 | Lời mời và phản hồi Meetup | Vừa | Vừa | Realtime | 5 | Frontend 1 | Danh sách lời mời; accept/reject; trạng thái thành viên cập nhật realtime |
| FE-09 | Sở thích tạm thời Meetup | Vừa | Vừa | - | 5 | Frontend 1 | UI chọn tag high/normal/avoid; prefill từ profile; chỉnh trước khi chốt |
| FE-10 | Kết quả gợi ý địa điểm | Nhiều | Nhiều | Map/Routes state | 13 | Frontend 2 | Top 5, rating, Avg ETA, Max ETA, ETA từng người, nhãn exact/batch/cluster |
| FE-11 | Chi tiết địa điểm và lọc đang mở cửa | Vừa | Vừa | Places | 5 | Frontend 2 | Place card/detail, trạng thái giờ mở cửa, bật/tắt lọc open-now |
| FE-12 | Vote realtime và chốt địa điểm | Vừa | Nhiều | Realtime | 8 | Frontend 1 | Vote/đổi vote, tổng phiếu realtime, người tạo chốt, trạng thái finalized |
| FE-13 | FCM, nhắc lịch và deep link | Vừa | Nhiều | FCM/Deep link | 8 | Frontend 2 | Nhận notification lời mời/chốt/nhắc lịch; chạm mở đúng màn hình |
| FE-14 | Lịch sử, yêu thích và dẫn đường | Nhiều | Vừa | Maps deep link | 8 | Frontend 1 | Danh sách meetup cũ, lưu/bỏ lưu địa điểm, mở Google Maps tới nơi đã chốt |
| FE-15 | Chat nhóm trong Meetup | Nhiều | Nhiều | Socket | 8 | Frontend 2 | Danh sách tin, gửi/nhận realtime, trạng thái gửi/lỗi/reconnect |
| FE-16 | AI giải thích đề xuất | Vừa | Vừa | AI API | 5 | Frontend 2 | Nút 'Vì sao gợi ý?', modal/card giải thích, fallback theo rule khi AI lỗi |
| FE-17 | Phát hiện bạn ở gần | Vừa | Vừa | Location + FCM | 5 | Frontend 2 | Opt-in, chọn ngưỡng, notification/gợi ý tạo meetup, trạng thái cooldown |
| FE-18 | Admin tối giản | Vừa | Vừa | - | 5 | Frontend 1 | Danh sách tài khoản, khóa/mở khóa, báo cáo và số liệu cơ bản |
| FE-19 | Trạng thái lỗi, offline và privacy | Nhiều | Nhiều | GPS/Network/Socket | 8 | Frontend 1 | Màn/empty state cho GPS deny, stale location, network/socket lỗi, thiếu quyền |
| FE-20 | Hiệu năng mobile và chuẩn bị demo | Vừa | Vừa | Device/performance | 8 | Frontend 2 | Theo dõi loading/re-render, số update vị trí, polish luồng demo, kiểm tra Android thật |
| FE-21 | App shell, navigation và component dùng chung | Nhiều | Vừa | Navigation | 8 | Frontend 1 | Navigation structure, theme/component cơ bản, loading/empty/error component dùng chung |
| FE-22 | Impression và feedback gợi ý | Ít | Vừa | Event/Analytics | 5 | Frontend 2 | Gửi RecommendationShown khi kết quả thật sự hiển thị; liên kết vote, chọn địa điểm, dẫn đường, yêu thích theo runId/eventId (đối ứng BE-24) |
| FE-23 | Giờ gặp (scheduledAt) và opening theo giờ gặp | Vừa | Nhiều | Scheduled context | 8 | Frontend 2 | Hiển thị scheduledAt, trạng thái OPEN/CLOSED/UNKNOWN tại giờ gặp và etaSeconds; xử lý STALE_CONTEXT khi đổi giờ gặp (đối ứng BE-28) |
| FE-24 | Phương tiện theo thành viên và nhãn traffic | Vừa | Vừa | Travel mode/Routes | 5 | Frontend 2 | UI chọn TWO_WHEELER/DRIVE cho từng thành viên (mặc định TWO_WHEELER); hiển thị nhãn traffic-aware/unaware và thông báo fallback (đối ứng BE-29) |
| FE-25 | Cảnh báo thời tiết và lọc địa điểm outdoor | Vừa | Vừa | Weather | 5 | Frontend 2 | Cảnh báo thời tiết trên place card; thông báo khi outdoor bị lọc hoặc đã nới về cảnh báo; ẩn hoàn toàn khi Weather OFF (đối ứng BE-30) |
| FE-26 | Cảnh báo sắp đóng cửa | Ít | Ít | Places | 3 | Frontend 2 | Badge/cảnh báo 'Sắp đóng cửa' trên place card và chi tiết địa điểm (đối ứng BE-31) |
| FE-27 | Kết quả gợi ý theo người xem | Vừa | Vừa | Viewer projection | 5 | Frontend 2 | Hiển thị ETA của mọi thành viên; chỉ hiện matched tags/preference/utility của chính mình; gọi lại GET cùng run sau vote/chốt (đối ứng BE-32) |
| FE-28 | Liên kết mời Meetup | Nhiều | Nhiều | Deep link | 8 | Frontend 1 | Tạo/chia sẻ/thu hồi link mời; mở deep link xem preview tối thiểu; accept qua link; xử lý hết hạn/đã thu hồi (đối ứng BE-33) |
| FE-29 | QR kết bạn | Nhiều | Vừa | Camera/QR | 8 | Frontend 1 | Hiển thị QR của mình (handle ổn định hoặc QR tạm có đếm ngược); quét QR, xem preview rồi gửi lời mời qua luồng kết bạn hiện có (đối ứng BE-34) |

**Tổng điểm FE:** 209

**Điểm Core:** 139

**Điểm Planned:** 70

**Lưu ý:** Điểm là ước lượng để cân tải. Hai Frontend vẫn cùng review component/state giao thoa và sửa lỗi tích hợp. FE-22 đến FE-27 (mở rộng recommendation) thuộc Frontend 2; FE-28/FE-29 (link mời, QR kết bạn) thuộc Frontend 1.

## Hướng dẫn

### Hướng dẫn dùng workbook Frontend

Dùng sheet Chức năng FE làm nguồn phân công chính.

| Bước | Việc cần làm |
|---|---|
| 1 | Đổi tên Frontend 1 và Frontend 2 trong sheet Phân công FE và Chức năng FE. |
| 2 | Mỗi sprint, lọc sheet Backlog FE theo Sprint, Phụ trách và Trạng thái. |
| 3 | Không nhận một dòng chức năng khi chưa rõ API contract/event, UI state, navigation và tiêu chí hoàn thành. |
| 4 | Core làm trước Planned. Planned không được làm chậm GPS/privacy/realtime/recommendation và luồng meetup lõi. |
| 5 | Với PR liên quan giữa hai mảng, mời Frontend còn lại review theo cột Review bắt buộc. |
| 6 | Nếu phạm vi thay đổi, sửa Điểm FE tại sheet Chức năng FE; tổng điểm và tỷ lệ tự cập nhật. |
| 7 | Chốt contract trước khi làm song song: LocationUpdated, MeetupMemberChanged, PreferenceUpdated, RecommendationReady, VoteUpdated, MeetupFinalized. |
| 8 | UI phải thể hiện rõ GPS deny, stale location, offline/socket error, thiếu giờ mở cửa và kết quả exact/batch/cluster, run STALE_CONTEXT, cảnh báo sắp đóng cửa/thời tiết. |
| 9 | Không sửa lại FE-01 đến FE-21; phần mở rộng theo Backend dùng FE-22 đến FE-29. |
| 10 | Đối ứng Backend: FE-22 ↔ BE-24, FE-23 ↔ BE-28, FE-24 ↔ BE-29, FE-25 ↔ BE-30, FE-26 ↔ BE-31, FE-27 ↔ BE-32, FE-28 ↔ BE-33, FE-29 ↔ BE-34. BE-21, BE-25, BE-26 là backend-only nên không có hạng mục FE. |
| 11 | Hạng mục mới chia theo domain; phần giao thoa nhiều nhất (FE-22, FE-24) giao Frontend 2. Link mời meetup và QR kết bạn giao Frontend 1 như bên Backend 1. |
| 12 | scheduledAt là giờ gặp, không phải giờ khởi hành. UI hiển thị trạng thái mở cửa tại giờ gặp; đổi giờ gặp làm run cũ STALE_CONTEXT và phải chạy lại. |
| 13 | Mọi participant thấy ETA. Chỉ hiển thị preference/utility của chính mình; sau vote/chốt gọi lại GET cùng run, không tạo run mới. |
| 14 | Link mời meetup và QR kết bạn: không ghi raw token vào log; QR không auto-friend; xử lý rõ hết hạn/thu hồi/rate-limit. |
