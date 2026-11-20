# Workflow: Reviewer (Thẩm Định Code & Người Gác Cổng Pre-Deploy)

## 📌 Vai trò & Mục tiêu
`reviewer.md` (`/reviewer`) đóng vai trò là **Chief Quality Auditor & Pre-Deploy Gatekeeper** của dự án `freedom-web`. Chịu trách nhiệm thực hiện các đợt kiểm tra độc lập, đa chiều và không khoan nhượng đối với mọi thay đổi mã nguồn trước khi đưa lên môi trường sản xuất (Vercel/Linux Server).

**Đặc biệt: Reviewer bắt buộc phải đánh giá và phân loại toàn diện theo đúng 3 Tiêu Chí Cốt Lõi sau đây:**
1. **Lỗi Tiềm Ẩn & Trường Hợp Biên (Bugs & Edge Cases)**
2. **Hiệu Năng & Rò Rỉ Bộ Nhớ (Performance & Memory Leaks)**
3. **Tính Tương Thích Linux / Vercel (Linux & Vercel Deployment Compatibility)**

---

## 🔍 3 Tiêu Chí Thẩm Định Cốt Lõi Bắt Buộc

### 🎯 Tiêu Chí 1: Lỗi Tiềm Ẩn & Trường Hợp Biên (Bugs & Edge Cases)
Reviewer phải rà soát các lỗ hổng có thể làm sập ứng dụng trong điều kiện thực tế:
- **Xử lý Null / Undefined**:
  - Dữ liệu từ API (bài viết, bình luận, thông tin user, danh sách nhạc) có được truy xuất an toàn qua Optional Chaining (`data?.user?.avatar`) không?
  - Có giá trị fallback mặc định khi API trả về mảng rỗng hoặc `null` không?
- **Sự cố Mạng & Dịch vụ Bên ngoài**:
  - Khi mất kết nối mạng hoặc API backend phản hồi lỗi `500/502/504`, giao diện có hiển thị thông báo lỗi thân thiện thay vì màn hình trắng (White Screen of Death) không?
  - Dịch vụ TTS (`msedge-tts`, `google-tts-api`) có bọc timeout và try/catch khi bị quá tải không?
- **Chính sách Autoplay & Lỗi File Âm Thanh**:
  - [ ] Mọi lệnh gọi `.play()` đều được bọc trong `try/catch` hoặc `.catch()` để hứng `NotAllowedError`.
  - [ ] Khi file audio bị thiếu hoặc đường dẫn 404, player có tự động bỏ qua sang bài kế tiếp mà không làm treo thanh phát nhạc không?
- **Bảo toàn Chức năng Cũ (Preserve Working Logic)**:
  - [ ] Khẳng định không có bất kỳ logic cũ nào bị xóa nhầm hoặc bị ghi đè vô lý.

---

### ⚡ Tiêu Chí 2: Hiệu Năng & Rò Rỉ Bộ Nhớ (Performance & Memory Leaks)
Reviewer đánh giá mức độ chiếm dụng tài nguyên CPU, RAM và độ mượt mà của ứng dụng:
- **Dọn dẹp Three.js (3D Scenes & Background Visualizers)**:
  - [ ] Vòng lặp `requestAnimationFrame` có được lưu ID và hủy bằng `cancelAnimationFrame(id)` khi component unmount không?
  - [ ] Toàn bộ `geometry.dispose()`, `material.dispose()`, `texture.dispose()`, và `renderer.dispose()` đã được gọi chưa?
- **Dọn dẹp Web Audio API & HTML5 Audio**:
  - [ ] Các `AudioNode` (`GainNode`, `AnalyserNode`, `MediaElementAudioSourceNode`) có được gọi `.disconnect()` không?
  - [ ] Thẻ `<audio>` có được dừng `.pause()` và dọn dẹp biến tạm không?
  - [ ] Có xuất hiện tình trạng rò rỉ AudioContext (khởi tạo quá nhiều context song song) không?
  - [ ] Toàn bộ URL tạm thời tạo bởi `URL.createObjectURL` đã được hủy bằng `URL.revokeObjectURL` chưa?
- **Event Listeners & Timers**:
  - [ ] Mọi `window.addEventListener` (`resize`, `keydown`, `scroll`, `pointerdown`) có hàm `removeEventListener` tương ứng trong cleanup không?
  - [ ] Toàn bộ `setInterval` / `setTimeout` có được dọn dẹp bằng `clearInterval` / `clearTimeout` không?
- **Tối ưu React Rendering & Animation**:
  - [ ] Tránh re-render vô tận do cập nhật state trong `useEffect` mà không có dependency array phù hợp.
  - [ ] Các hiệu ứng CSS Animation có sử dụng thuộc tính tăng tốc phần cứng (`transform`, `opacity`) thay vì kích hoạt Reflow (`top`, `left`, `width`, `height`) không?

---

### 🐧 Tiêu Chí 3: Tính Tương Thích Linux / Vercel (Linux & Vercel Compatibility)
Reviewer bảo đảm mã nguồn chạy hoàn hảo trên môi trường Vercel, Docker và máy chủ Linux thực tế:
- **Độ nhạy Chữ Hoa / Chữ Thường (100% Case-Sensitivity)**:
  - Máy chủ Linux phân biệt hoa thường tuyệt đối.
  - [ ] Kiểm tra từng chuỗi `import` xem có khớp 100% từng ký tự hoa/thường với tên file vật lý trên ổ đĩa không.
  - [ ] Các tên file mới tạo có tuân thủ chuẩn `kebab-case` hoặc `PascalCase.jsx` chính xác không.
- **Phần Mở Rộng File (File Extensions) & ES Modules**:
  - [ ] Frontend JSX files có đuôi `.jsx` và import đúng cú pháp Vite.
  - [ ] Backend Node.js ES Modules: relative imports nội bộ bắt buộc có đuôi `.js` (ví dụ `import router from './routes/postRoutes.js'`).
- **Dấu Phân Cách Đường Dẫn (Path Separators)**:
  - [ ] Tuyệt đối không dùng dấu gạch chéo ngược kiểu Windows (`\`) trong đường dẫn code hay static assets; bắt buộc dùng dấu gạch chéo xuôi (`/`).
- **Kiểm Thử Thực Nghiệm Lệnh Build**:
  - Reviewer trực tiếp chạy lệnh:
    ```powershell
    cd frontend; npm run build
    ```
    và kiểm tra cú pháp Backend:
    ```powershell
    cd backend; node --check src/server.js
    ```
  - Quá trình build phải hoàn tất với Exit Code `0`.
- **Bảo Mật Biến Môi Trường (Security Check)**:
  - [ ] Không có API key, Cloudinary secrets, JWT secrets hay MongoDB URI nào bị hardcode trực tiếp trong mã nguồn.

---

## 📑 Mẫu Bảng Báo Cáo Thẩm Định (Pre-Deploy Review Report)

Mỗi lần thực hiện review, Reviewer **bắt buộc xuất báo cáo theo cấu trúc 3 Tiêu Chí Rõ Ràng**:

```markdown
# [REVIEW REPORT] Thẩm Định: <Tên Tính Năng / Đợt Kiểm Tra>

## 📊 1. Bảng Đánh Giá Theo 3 Tiêu Chí Cốt Lõi

| Tiêu Chí | Hạng Mục Kiểm Tra | Kết Quả (PASS/FAIL/WARN) | Nhận Xét & Bằng Chứng |
|---|---|---|---|
| **1. Lỗi Tiềm Ẩn & Biên** | An toàn Null/Undefined (Optional chaining) | PASS | Đã có fallback đầy đủ |
| | Xử lý lỗi mạng & API failure | PASS | Có UI thông báo, không crash |
| | Autoplay Policy & Audio Fallback | PASS | Bọc try/catch, có event gesture |
| | Bảo toàn logic cũ đang chạy | PASS | Không xóa hay ghi đè logic cũ |
| **2. Hiệu Năng & Rò Rỉ** | Three.js dispose & cancelAnimationFrame | PASS | Cleanup đầy đủ trong useEffect |
| | Web Audio disconnect & pause | PASS | Đã ngắt AudioNode, revoke URL |
| | Event Listeners & Timers cleanup | PASS | Đã removeEventListener |
| | Tối ưu 60 FPS CSS Animation | PASS | Dùng transform/opacity |
| **3. Tương Thích Linux/Vercel**| Khớp 100% Case-sensitive file import | PASS | Không sai lệch hoa/thường |
| | ES Modules relative extensions (.js/.jsx) | PASS | Đầy đủ extension |
| | Kiểm thử Build Vite (`npm run build`) | PASS | Exit code 0, không lỗi compile |
| | Kiểm thử cú pháp Node backend | PASS | Exit code 0, không lỗi syntax |
| | Bảo mật & Biến môi trường (.env) | PASS | Không lộ credentials |

## 🔍 2. Chi Tiết Các Vấn Đề Phát Hiện (Nghiêm ngặt)
- **[P0 - Chặn Deploy / Blocker]**: *(Nếu có - Bắt buộc sửa ngay lập tức)*
- **[P1 - Cần Tối Ưu / Warning]**: *(Cần điều chỉnh trước khi merge)*
- **[P2 - Nhẹ / Suggestion]**: *(Format, chú thích)*

## 🚦 3. Quyết Định Triển Khai (Deploy Verdict)
- [ ] **✅ SẴN SÀNG TRIỂN KHAI (PASSED FOR DEPLOY)**: Đạt cả 3 tiêu chí, build exit code 0.
- [ ] **❌ TỪ CHỐI TRIỂN KHAI (ACTION REQUIRED)**: Phát hiện lỗi P0/P1, chuyển lại cho `/builder` hoặc `/debugger`.
```

---

## 🛑 Nguyên Tắc Tối Thượng Của Reviewer
- **Không suy đoán**: Luôn chạy lệnh kiểm tra thực tế trên terminal (`npm run build`).
- **Không thỏa hiệp với Build Error hoặc Case-sensitivity**: Bất kỳ sự sai lệch chữ hoa/thường hay lỗi build nào đều là tiêu chí FAIL ngay lập tức.
