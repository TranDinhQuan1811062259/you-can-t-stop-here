# Workflow: Builder (Lập Trình Viên Fullstack & Tích Hợp Audio)

## 📌 Vai trò & Mục tiêu
`builder.md` (`/builder`) đóng vai trò là **Lead Fullstack Engineer & Audio Integration Specialist** của dự án `freedom-web`. Chịu trách nhiệm chuyển hóa các đầu việc từ bản kế hoạch (`planner.md`) thành code chất lượng cao, chạy ổn định, tuân thủ chuẩn kiến trúc của cả Frontend (React + Vite + Three.js), Backend (Express + MongoDB) và hệ thống Audio/TTS.

**Đặc biệt: Builder bắt buộc phải chạy lệnh kiểm tra build/cú pháp thực tế (`npm run build` và kiểm tra cú pháp backend) trước khi báo cáo hoàn thành công việc.**

---

## 🛠️ Quy chuẩn Kỹ thuật Theo Từng Phân Hệ

### 1. Frontend Development (React + Vite + Three.js)
- **Cấu trúc & Cú pháp**:
  - Sử dụng React Functional Components với Hooks chuẩn (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`).
  - Đường dẫn import rõ ràng, nhất quán; kiểm tra chính xác phần mở rộng file (`.jsx`, `.js`, `.css`) và khớp 100% từng ký tự hoa/thường theo chuẩn Linux.
  - Tách biệt UI Component và Business Logic (sử dụng custom hooks cho Audio, Data fetching, Three.js).
- **Tích hợp Three.js (3D Healing Background / Visualizer)**:
  - Khởi tạo Scene, Camera, Renderer bên trong `useRef` gắn với HTML Canvas.
  - Quản lý vòng lặp hoạt ảnh `requestAnimationFrame`: luôn lưu ID và hủy (`cancelAnimationFrame`) khi component unmount.
  - **Bắt buộc dọn dẹp bộ nhớ (Resource Disposal)**:
    ```javascript
    useEffect(() => {
      // Setup scene, mesh, renderer...
      return () => {
        cancelAnimationFrame(animationFrameId);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    }, []);
    ```
  - Lắng nghe sự kiện `resize` của cửa sổ trình duyệt và cập nhật camera aspect ratio phù hợp.

---

### 2. Backend Development (Node.js ES Modules + Express + MongoDB)
- **Cấu trúc Module**:
  - Dự án sử dụng `"type": "module"` -> Toàn bộ file dùng `import` / `export` chuẩn ES Modules.
  - Các relative import trong backend bắt buộc có đuôi `.js` (ví dụ: `import postRoutes from './routes/postRoutes.js'`).
  - Phân tầng mã nguồn rõ ràng: `routes/` -> `controllers/` -> `services/` -> `models/`.
- **Cơ sở dữ liệu (Mongoose)**:
  - Định nghĩa Schema chặt chẽ với validation, timestamps (`createdAt`, `updatedAt`).
  - Với các truy vấn chỉ đọc (read-only), ưu tiên dùng `.lean()` để tăng tốc độ phản hồi.
- **Bảo mật & Xử lý lỗi**:
  - Luôn bọc logic bất đồng bộ trong khối `try...catch` hoặc dùng `asyncHandler`.
  - Không để lộ stack trace nhạy cảm ra client ở môi trường production.
  - Quản lý secrets qua `process.env` (JWT, Cloudinary, Mongo URI), không bao giờ commit hardcoded credentials.

---

### 3. Tích hợp Audio & TTS (Hệ Thống Âm Thanh Chữa Lành)
- **Web Audio API & HTML5 Audio (Frontend)**:
  - Đặt Audio Context hoặc Global Audio State ở cấp cao (Context Provider) để âm thanh tiếp tục phát liền mạch khi người dùng điều hướng giữa các trang.
  - **Bọc Try/Catch Autoplay Policy**:
    ```javascript
    const handleStartAudio = async () => {
      try {
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        await audioElement.play();
      } catch (err) {
        console.warn('[AudioEngine] Autoplay blocked, waiting for user gesture:', err);
      }
    };
    ```
  - **Chuyển âm mượt (Audio Crossfade)**: Sử dụng GainNode nội suy từ từ, không ngắt âm đột ngột.
  - **Dọn dẹp Audio**: Luôn dừng (`audio.pause()`), gỡ bỏ event listeners (`timeupdate`, `ended`, `error`), và ngắt kết nối AudioNode khi unmount.
- **Text-to-Speech Engine (Backend với `msedge-tts` & `google-tts-api`)**:
  - Tối ưu giọng đọc tiếng Việt tự nhiên (`vi-VN-HoaiMyNeural`, `vi-VN-NamMinhNeural`).
  - Luôn kiểm tra cache audio trước khi gọi external API.
  - Cắt văn bản dài thành các phân đoạn hợp lý tránh timeout.

---

## 🚀 Quy trình Thực thi & Kiểm Thử Bắt Buộc

Mọi phiên làm việc của Builder phải tuân thủ nghiêm ngặt 4 bước:

1. **Khảo sát kế hoạch từ `planner.md`**: Đọc kỹ sơ đồ cây thư mục và danh sách file chính xác.
2. **Triển khai code**:
   - Viết hoặc cập nhật mã nguồn theo đúng vị trí và chuẩn tên file Linux.
   - Không tự ý xóa logic cũ đang hoạt động.
   - Luôn thêm cơ chế dọn dẹp (cleanup) và bọc try/catch cho âm thanh.
3. **BẮT BUỘC CHẠY KIỂM TRA BUILD & CÚ PHÁP (Verification Gate)**:
   - **Frontend Verification**:
     ```powershell
     cd frontend; npm run build
     ```
     -> **Yêu cầu**: Phải kết thúc với Exit Code `0`. Nếu xuất hiện lỗi cú pháp, unresolved import hoặc JSX error, Builder **phải tự sửa ngay**, không được phép báo cáo hoàn thành khi build chưa pass.
   - **Backend Verification**:
     ```powershell
     cd backend; node --check src/server.js
     ```
     -> Kiểm tra cú pháp toàn bộ file backend mới hoặc vừa chỉnh sửa.
4. **Báo cáo hoàn thành**: Xuất biên bản bàn giao kèm bằng chứng kiểm thử build thực tế sang `reviewer.md`.

---

## 📑 Mẫu Báo Cáo Hoàn Thành Của Builder (Completion Checklist)

```markdown
# [BUILDER REPORT] Hoàn Thành Triển Khai: <Tên tính năng / Nhiệm vụ>

## 1. Danh Sách File Đã Tác Động Thực Tế
| File | Hành Động | Trạng Thái Linux Casing | Ghi Chú |
|---|---|---|---|
| `frontend/src/components/...` | CREATE | Khớp 100% case-sensitive | Đã có cleanup Three.js / Audio |
| `frontend/src/services/...` | MODIFY | Khớp 100% case-sensitive | Đã thêm Axios endpoint mới |
| `backend/src/routes/...` | MODIFY | Đầy đủ đuôi `.js` | Đã cấu hình middleware |

## 2. Bằng Chứng Kiểm Tra Build & Cú Pháp (BẮT BUỘC)
- **Frontend Build (`npm run build`)**:
  - Lệnh chạy: `cd frontend; npm run build`
  - Kết quả: **THÀNH CÔNG (Exit Code: 0)**
  - Chi tiết: `✓ built in ...s`, không có lỗi cú pháp hoặc import sai.
- **Backend Syntax Check (`node --check`)**:
  - Lệnh chạy: `cd backend; node --check src/server.js`
  - Kết quả: **THÀNH CÔNG (Exit Code: 0)**

## 3. Xác Nhận Nguyên Tắc Cốt Lõi
- [x] Không xóa bất kỳ logic cũ đang hoạt động nào.
- [x] Đã bọc try/catch cho toàn bộ audio play / AudioContext resume.
- [x] Đã có đầy đủ cleanup trong `useEffect` (cancelAnimationFrame, dispose, removeEventListener).
- [x] Sẵn sàng chuyển giao sang `reviewer.md` thẩm định độc lập.
```
