# 🛡️ Bộ Quy Tắc Kiểm Toán UI/UX & Chức Năng Toàn Diện (4-Role QA Squad)

Tài liệu này quy định tiêu chuẩn kiểm toán bắt buộc cho dự án **"You Can't Stop Here" (`freedom-web`)** trên cả **Chế Độ Ngày (Day Mode)**, **Chế Độ Đêm (Night Mode)**, giao diện **Desktop (`1280px–1920px`)** và **Mobile (`360px–430px`)**.

> [!CAUTION]
> **Ranh giới thực thi an toàn**: Trong quá trình kiểm toán UI/UX và static/build check, **tuyệt đối KHÔNG chạy lệnh khởi động server Express/MongoDB** (`node src/server.js`, `npm run dev:backend`, `npm run dev`, `start-project.bat`) gây giữ port hoặc treo tiến trình nền. Chỉ sử dụng static analysis, rà soát mã nguồn, `npm run lint` và `npm run build` tại `frontend/`.

---

## 1. [Pixel & Overflow Inspector]
*Chuyên trách bố cục, box-sizing, co giãn Flex/Grid, cắt chữ và lớp phủ.*

- **Flex/Grid chống tràn**:
  - Mọi flex child hoặc grid item chứa văn bản dài, tiêu đề, input hoặc bảng điều khiển bắt buộc có `min-width: 0` (hoặc `overflow: hidden` / `overflow-wrap: anywhere` / `word-break: break-word` hợp lý).
  - Toàn bộ container, input, card và modal áp dụng chuẩn `box-sizing: border-box` để padding/border không làm phình kích thước vượt `100%`.
- **Không tràn ngang & không cắt chữ (Multi-Viewport)**:
  - **Desktop (`1280px–1920px`)** & **Mobile (`360px–430px`)**: `documentElement.scrollWidth <= window.innerWidth`; không có bảng, card, grid cứng `1fr 1fr`/`2fr 1fr`, hoặc popover `position: absolute` có bề rộng cố định (`290px`, `390px`...) đâm ra ngoài mép màn hình mobile.
  - Popover/dropdown trên mobile (`<= 640px`) phải chuyển sang `position: fixed` hoặc bám khung nhìn (`left: 12px; right: 12px; width: auto; max-height: calc(100dvh - 80px); overflow-y: auto`).
  - Không dùng `overflow: hidden` gây cắt cụt chữ hoặc che khuất badge/nút tương tác quan trọng.
- **Lớp phủ hiệu ứng & `z-index`**:
  - Mọi hiệu ứng tuyết rơi (`WinterSnowOverlay`, `WinterSnowAtmosphere`), mưa/lá/sương nền (`AmbientBackground`, `CursorAura`, confetti, atmosphere particles) bắt buộc có `pointer-events: none` và `z-index` thấp hơn lớp nội dung tương tác (`header`, `main`, modal, floating controls).

---

## 2. [Visual & Theme Auditor]
*Chuyên trách tương phản Ngày/Đêm, bản sắc Đông Ấm Áp (Icy Frost Blue) và hiệu năng 60fps.*

- **Độ tương phản Ngày / Đêm trên mọi thành phần**:
  - Mọi `<input>`, `<select>`, `<textarea>`, `::placeholder`, `<label>`, button, badge, footer và card phải rõ nét, đủ độ tương phản ở cả **Chế Độ Ngày** (`body.theme-light` / `body.mode-light` / `[data-theme="light"]`) lẫn **Chế Độ Đêm** (`body.theme-dark` / `body.mode-dark` / `[data-theme="dark"]`).
  - **Cảnh báo biến CSS**: Không dùng `color: var(--bg-dark)` cho chữ trên nền sáng (`#ffffff` / `#f8fafc`), vì trong Chế Độ Ngày `--bg-dark` được đảo thành `#faf8f5` khiến chữ trắng tàng hình trên nền sáng. Không dùng màu chữ inline cố định `#e2e8f0` / `#ffffff` trong footer hay modal nếu nền chuyển sang sáng vào ban ngày.
- **Vibe Đông Ấm Áp — Icy Frost Blue**:
  - Giữ đúng bảng màu xanh sương tuyết Icy Frost Blue (`#bae6fd`, `#e0f2fe`, `#eff6ff`, `#0284c7`, `#38bdf8`, frosted glass `backdrop-filter`) kết hợp điểm nhấn ấm áp cho không gian đọc/nghe nhạc.
- **Hiệu năng GPU 60fps**:
  - Animation ưu tiên chỉ animate `transform` và `opacity` (tránh animate `width`, `height`, `top`, `left` gây layout thrashing), tôn trọng `@media (prefers-reduced-motion: reduce)` và dọn sạch `requestAnimationFrame` / canvas / event listener khi unmount.

---

## 3. [Functional & Edge-Case Tester]
*Chuyên trách hành vi thực tế, bảo toàn nhạc nền, form validation và bảo mật 2 lớp Admin.*

- **Mọi phần tử có vẻ bấm được phải hoạt động thực tế**:
  - Mọi button, pill, tag, badge hoặc item tìm kiếm có `cursor: pointer` bắt buộc có `onClick` hoạt động (hoặc là `<button>` / `<a href=... target="_blank" rel="noopener noreferrer">`), hỗ trợ bàn phím (`tabIndex={0}`, `onKeyDown` Enter/Space) khi là element tương tác.
  - Không còn route sai hoặc gọi hàm chưa khai báo (ví dụ: điều hướng bài viết dùng đúng `/post/:slug`, chọn mùa dùng đúng hàm từ `MusicContext`).
- **Bảo toàn nhạc đang phát khi mở liên kết ngoài**:
  - Toàn bộ link dẫn ra ngoài (mạng xã hội, YouTube, SoundCloud, tài liệu bên thứ 3) bắt buộc mở ở tab mới (`target="_blank" rel="noopener noreferrer"`), và mọi `window.open(..., '_blank', ...)` đều phải kèm `noopener,noreferrer` để không làm đứt luồng phát nhạc SPA và tránh tab-nabbing.
- **Chuẩn hóa Form (`noValidate` + Trim + Loading Lock)**:
  - Tất cả thẻ `<form>` bắt buộc có `noValidate` để tự kiểm soát validation bằng UI tiếng Việt rõ ràng thay vì tooltip mặc định của trình duyệt.
  - Input text/email/search/PIN/OTP phải được `.trim()` trước khi validate hoặc gửi API.
  - Phải hiển thị thông báo lỗi UI rõ ràng khi dữ liệu rỗng/sai định dạng (không `return` im lặng).
  - Nút submit phải bị khóa (`disabled={isLoading || isSubmitting}`) kèm trạng thái trực quan trong lúc gọi API để chống double-submit.
- **Luồng bảo mật 2 lớp `/admin` & `/admin-portal`**:
  - Truy cập quản trị bắt buộc đi qua **2 lớp xác thực**: Lớp 1 **PIN bí mật** (`/admin/verify-pin`) + Lớp 2 **OTP Email** (`/admin/verify-admin-otp`).
  - Mọi request `/admin*` sau xác thực phải gắn header `x-admin-token` từ `sessionStorage` (`adminToken` / `freedom_admin_token`), và tự động kích hoạt lại luồng PIN khi nhận phản hồi `403` (`requireAdminPin`).

---

## 4. [Static & Build Verifier]
*Chuyên trách tính toàn vẹn React Hooks, lint sạch và build 0 lỗi trước khi commit/push.*

- **React Hooks & Scope Discipline**:
  - Tuân thủ tuyệt đối Rules of Hooks: không bao giờ `return null` hoặc rẽ nhánh early-return **trước** các lời gọi `useState`, `useRef`, `useMemo`, `useCallback`, `useEffect`.
  - Không vi phạm `no-use-before-define` (không tham chiếu biến/handler trước khi khai báo); đầy đủ dependency arrays và cleanup function (`clearTimeout`, `clearInterval`, `cancelAnimationFrame`, `removeEventListener`).
- **Cổng kiểm định trước khi `git commit` / `git push`**:
  - Chạy tuần tự tại thư mục `frontend/`:
    1. `cd frontend && npm run lint` -> **0 errors**
    2. `cd frontend && npm run build` -> **0 errors**
  - Chỉ được phép `git add`, `git commit`, `git push` sau khi cả `lint` và `build` đều trả về exit code `0`.
