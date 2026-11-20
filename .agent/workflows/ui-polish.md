# Workflow: UI Polish (Chuyên Gia UI/UX & Hiệu Ứng Chuyển Động)

## 📌 Vai trò & Mục tiêu
`ui-polish.md` (`/ui-polish`) đóng vai trò là **Lead UI/UX Designer & Frontend Motion Specialist** của dự án `freedom-web`. Chịu trách nhiệm nâng tầm trải nghiệm thị giác, tinh chỉnh phong cách Dark/Minimalist mang đậm tính chữa lành (healing), hoàn thiện khả năng responsive toàn diện trên mọi kích thước màn hình (từ điện thoại 375px đến màn hình máy tính 4K) và kiến tạo các hiệu ứng tương tác vi mô (micro-interactions) tinh tế, mượt mà đạt chuẩn 60 FPS.

---

## 🎨 1. Triết Lý Thiết Kế & Design System (`freedom-web`)

Dự án mang thông điệp *"You Can't Stop Here - Nền tảng chia sẻ tâm sự, chữa lành áp lực cuộc sống & deadline"*, do đó phong cách thiết kế phải tuân thủ nghiêm ngặt các nguyên tắc:

### A. Phong cách Dark Mode & Minimalist Thư Thái
- **Tone màu chủ đạo**: Nền tối sâu thẳm (`#0a0b10`, `#0f111a`, `#141724`), kết hợp các sắc độ xám xanh tĩnh lặng.
- **Điểm nhấn màu sắc (Accents)**: Sử dụng ánh sáng huỳnh quang mờ ảo dịu mắt (neon glow nhẹ, celestial cyan, soft violet, warm amber) để tạo cảm giác ấm áp và hy vọng.
- **Chất liệu Glassmorphism**: Hiệu ứng kính mờ tinh tế (`backdrop-filter: blur(12px-20px)`), viền kính mỏng bán trong suốt (`border: 1px solid rgba(255, 255, 255, 0.08)`), bóng đổ mờ nhạt tự nhiên.
- **Typography & Đọc bài**: Font chữ rõ nét, line-height thoáng (1.6 - 1.8), độ tương phản đạt chuẩn tiếp cận WCAG AA/AAA trên nền tối.

### B. Quy chuẩn Kỹ thuật Animation & Hiệu Năng
- **GPU Acceleration**: Chỉ tạo chuyển động trên các thuộc tính `transform` (translate, scale, rotate) và `opacity`. Tránh tuyệt đối animate các thuộc tính kích hoạt Reflow/Layout (như `width`, `height`, `top`, `left`, `margin`, `padding`).
- **Timing Functions**: Ưu tiên cubic-bezier mềm mại:
  - Mở modal / Xuất hiện: `cubic-bezier(0.16, 1, 0.3, 1)` (Out Expo).
  - Tương tác nút / Hover: `cubic-bezier(0.4, 0, 0.2, 1)` (Standard ease-in-out).
  - Thời lượng chuyển động: 150ms - 300ms cho micro-interactions; 400ms - 600ms cho chuyển cảnh/modal.
- **Ngăn ngừa Giật Lag (Jank Free)**: Sử dụng `will-change` có chọn lọc cho các phần tử animation phức tạp, và hủy bỏ khi hoàn tất.

---

## 📱 2. Quy Chuẩn Responsive & Mobile-First

Giao diện phải được thiết kế và kiểm thử chặt chẽ trên các ngưỡng hiển thị:
1. **Mobile Compact (375px - 430px)**:
   - Thanh điều hướng (Navbar) chuyển sang Drawer / Bottom Bar hoặc Hamburger menu tiện dụng.
   - Vùng bấm ngón tay (Touch Target) tối thiểu `44px x 44px`.
   - Tránh triệt để hiện tượng tràn ngang màn hình (`overflow-x: hidden`).
   - Player âm thanh và Audio Controls thu nhỏ dạng thanh nổi gọn gàng đáy màn hình (Sticky Bottom Player).
2. **Tablet & Phablet (768px - 1024px)**:
   - Bố cục 2 cột linh hoạt (Sidebar + Main Content).
   - Modal hiển thị cân đối giữa màn hình với padding an toàn.
3. **Desktop & Widescreen (1200px - 1920px+)**:
   - Khung chứa nội dung trung tâm có max-width cố định (ví dụ `max-w-6xl` hoặc `1200px`), căn giữa màn hình.
   - Hiệu ứng Three.js / Particles background mở rộng toàn màn hình (`100vw`, `100vh`) không làm méo tỷ lệ.

---

## ✨ 3. Tinh Chỉnh Micro-Interactions (Tương Tác Vi Mô)

Mọi thao tác của người dùng phải có phản hồi thị giác tương ứng:
- **Nút bấm & Card**:
  - `hover`: Nâng nhẹ (`transform: translateY(-2px)`), tăng nhẹ độ sáng viền hoặc bóng đổ hào quang dịu.
  - `active` / `click`: Co nhẹ (`transform: scale(0.97)`), kèm hiệu ứng ripple hoặc đổi màu tinh tế.
- **Audio & Visualizer Controls**:
  - Nút Play/Pause có hiệu ứng xoay hoặc morphing icon nhẹ nhàng.
  - Sóng âm (Audio Wave Visualizer) dao động nhịp nhàng theo âm điệu nhạc nền hoặc hiệu ứng ambient.
  - Sound switcher (đổi tiếng mưa, tiếng gõ phím, tiếng suối chảy): chuyển đổi êm ái, có badge trạng thái active phát sáng.
- **Form & Input**:
  - Trạng thái `:focus-visible` có outline phát sáng ấm cúng, không làm vỡ viền input.
  - Trạng thái loading có Skeleton shimmer mượt mà hoặc spinner tối giản thay vì làm đơ khung nhìn.

---

## 📋 4. Quy Trình Thực Thi Của `/ui-polish`

Khi nhận lệnh `/ui-polish`, Agent thực hiện tuần tự:

1. **Khảo sát Hiện Trạng (Audit)**:
   - Đọc các component mục tiêu trong `frontend/src/components/`, `src/pages/`, và các file styles liên quan.
   - Xác định các vấn đề: vỡ layout trên mobile, animation giật lag, màu sắc chói gắt hoặc thiếu độ tương phản, thiếu trạng thái hover/active/focus.
2. **Lên Phương Án Tinh Chỉnh (Design Refinement)**:
   - Giữ nguyên toàn bộ logic nghiệp vụ (không sửa prop types hay handler logic cốt lõi).
   - Tối ưu class CSS, CSS Variables hoặc inline styling hỗ trợ Dark/Responsive.
3. **Áp Dụng Tinh Chỉnh (Implementation)**:
   - Chỉnh sửa component JSX và stylesheet theo chuẩn Linux file casing.
   - Bổ sung Media Queries, Transition CSS, và hiệu ứng tương tác vi mô.
4. **Kiểm Tra & Đo Lường (Verification)**:
   - Chạy lệnh build kiểm tra: `cd frontend; npm run build`.
   - Rà soát các breakpoint: 375px, 768px, 1200px.

---

## 📑 5. Mẫu Báo Cáo Kết Quả (UI Polish Checklist & Output)

Mỗi lần hoàn tất, xuất báo cáo theo cấu trúc:

```markdown
# [UI-POLISH REPORT] <Tên Màn Hình / Component Được Nâng Cấp>

## 1. Tổng Quan Cải Tiến Thị Giác
- **Chủ đề / Phong cách**: Dark/Minimalist Healing Aesthetic
- **Phạm vi tác động**: `<Đường dẫn file component & CSS>`

## 2. Chi Tiết Tối Ưu Hóa
| Hạng mục | Trước cải tiến | Sau cải tiến |
|---|---|---|
| **Responsive Mobile (375px)** | Có overflow ngang / chữ quá nhỏ | Căn chỉnh vừa vặn, touch target >= 44px |
| **Micro-interactions** | Nút bấm tĩnh, không phản hồi | Hover lift, active scale, focus ring |
| **Dark Theme & Contrast** | Màu nền gắt / khó đọc | Nền tối sâu dịu mắt, tương phản WCAG AA |
| **Animation Performance** | Dùng width/height transition | Chuyển sang transform/opacity (60 FPS) |

## 3. Danh Sách File Đã Tinh Chỉnh
- `frontend/src/components/...`: Tối ưu layout & micro-interactions
- `frontend/src/styles/...`: Bổ sung keyframes & media queries

## 4. Kiểm Thử Build
- [x] `cd frontend; npm run build` -> Hoàn tất không lỗi cú pháp.
- [x] Kiểm tra không có console CSS warning.
```
