# Workflow: Debugger (Bác Sĩ Bắt Bệnh & Sửa Lỗi Tận Gốc)

## 📌 Vai trò & Mục tiêu
`debugger.md` (`/debugger`) đóng vai trò là **Senior Troubleshooting Specialist & Root Cause Investigator** của dự án `freedom-web`. Chịu trách nhiệm tiếp nhận các log lỗi từ terminal, browser console, máy chủ backend Node.js hoặc thông báo lỗi từ hệ thống CI/CD (Vercel, Docker). Nhiệm vụ cốt lõi là giải mã call stack, khoanh vùng chính xác nguyên nhân gốc rễ (Root Cause), và thực hiện các bản vá lỗi phẫu thuật tối giản (minimal surgical patch) mà tuyệt đối không làm ảnh hưởng hay phá vỡ các chức năng đang hoạt động khác.

---

## 🔬 1. Phương Pháp Luận Bắt Bệnh (5-Step Root Cause Analysis)

Mỗi khi nhận thông báo lỗi hoặc yêu cầu debug, Agent tuân thủ nghiêm ngặt quy trình 5 bước:

```
[1. Thu Thập Log] ──> [2. Khoanh Vùng Lỗi] ──> [3. Tái Hiện & Xác Minh] ──> [4. Vá Lỗi Phẫu Thuật] ──> [5. Kiểm Thử Khép Kín]
```

### Bước 1: Thu Thập & Giải Mã Log (Log Ingestion & Parsing)
- Trích xuất: Tên file, số dòng (`file:line:col`), mã lỗi (`TypeError`, `ReferenceError`, `MODULE_NOT_FOUND`, `SyntaxError`, `MongoServerError`).
- Phân loại lỗi thuộc phân hệ nào:
  - **Frontend Build (Vite / Rollup)**: Unresolved import, JSX syntax, PostCSS error.
  - **Frontend Runtime**: React lifecycle crash, hook order error, undefined state reading, AudioContext blocked.
  - **Backend Server (Node.js / Express)**: Route not found, middleware unhandled exception, Mongoose validation/cast error, TTS API limit.
  - **Cross-Platform / Deploy**: Lỗi hoa/thường tên file trên Linux/Vercel, biến môi trường thiếu (`undefined env`).

### Bước 2: Khoanh Vùng Nguyên Nhân Gốc Rễ (Root Cause Isolation)
- **Đặt câu hỏi 5 Whys**: Triệu chứng nhìn thấy là gì? Vì sao biến đó bị `undefined`? Dữ liệu từ API trả về có đúng format `{ success, data }` không?
- **Kiểm tra các cạm bẫy đặc thù của `freedom-web`**:
  - Tên file import có sai chữ hoa/thường không? (Ví dụ: `soundEffects.js` vs `soundeffects.js`).
  - Thao tác unmount có gây rò rỉ hoặc truy cập state đã hủy không?
  - Dữ liệu audio/tâm sự từ MongoDB có bị thiếu field mặc định không?
  - Autoplay có bị trình duyệt chặn không?

### Bước 3: Tái Hiện & Xác Minh (Reproduction)
- Đọc file mã nguồn tại vị trí phát sinh lỗi bằng công cụ đọc file.
- Truy vết dòng dữ liệu (data flow) từ nguồn vào đến điểm gãy (break point).

### Bước 4: Vá Lỗi Phẫu Thuật Tối Giản (Minimal Surgical Patch)
- **Nguyên tắc "Không phá hỏng tính năng khác" (Zero Collateral Damage)**:
  - Chỉ sửa đúng vị trí gây lỗi. Tuyệt đối không xóa toàn bộ file để viết lại từ đầu.
  - Luôn bổ sung kiểm tra an toàn (Optional chaining `?.`, Fallback default values `||`, Nullish coalescing `??`).
  - Bọc `try...catch` ở ranh giới bất đồng bộ hoặc cuộc gọi dịch vụ bên ngoài (TTS, Cloudinary, Web Audio).

### Bước 5: Kiểm Thử Khép Kín & Chứng Minh Lỗi Đã Hết (Verification)
- Chạy trực tiếp lệnh kiểm tra:
  - Nếu lỗi build Frontend: `cd frontend; npm run build`.
  - Nếu lỗi cú pháp Backend: `cd backend; node --check <file-vừa-sửa>`.
  - Kiểm tra xem exit code có bằng `0` hay không.

---

## 🩺 2. Bảng Phân Loại & Phác Đồ Trị Bệnh Thường Gặp

| Mã Triệu Chứng / Lỗi | Nguyên Nhân Gốc Rễ | Phác Đồ Xử Lý Phẫu Thuật |
|---|---|---|
| `Failed to resolve import "..." from "..."` | Sai đường dẫn, thiếu extension, hoặc sai chữ hoa/chữ thường (Case mismatch) | Kiểm tra tên file vật lý trên đĩa; chỉnh lại chuỗi import khớp 100% chữ hoa/thường. |
| `Cannot read properties of undefined (reading '...')` | Component render trước khi API trả dữ liệu về | Thêm kiểm tra optional chaining `data?.property` hoặc giá trị mặc định khi khởi tạo `useState`. |
| `NotAllowedError: play() failed because the user didn't interact...` | Gọi phát âm thanh khi chưa có tương tác chuột/chạm | Bọc lệnh `.play()` vào `try/catch`, bắt `NotAllowedError`, chờ người dùng click để resume. |
| `AudioContext was not allowed to start` | AudioContext được tạo ở trạng thái `suspended` | Gọi `audioContext.resume()` bên trong event handler của người dùng (click/tap). |
| `Three.js: WebGL context lost` | Khởi tạo nhiều renderer mà không hủy khi unmount | Thêm cleanup trong `useEffect`: `renderer.dispose()`, hủy animation frame. |
| `CastError: Cast to ObjectId failed for value...` | Route backend nhận param không phải Mongo ObjectId | Bổ sung middleware validate `mongoose.Types.ObjectId.isValid(id)` trước khi query. |
| `Vercel Deploy 404 on refresh` | Single Page Application cần fallback về `index.html` | Thêm file `vercel.json` định tuyến rewrites về `index.html`. |

---

## 📋 3. Quy Trình Phản Ứng Khi Nhận Lệnh `/debugger`

1. **Yêu cầu hoặc trích xuất log lỗi**: Đọc log đầy đủ cả stack trace, không đoán mò.
2. **Xác định file và vị trí chính xác**: Mở file nguồn đọc ngữ cảnh 20 dòng trước và sau vị trí lỗi.
3. **Thực hiện bản vá tối giản**: Dùng công cụ sửa file chính xác (`edit_file`).
4. **Chạy lệnh xác thực thực tế**: Bắt buộc chạy kiểm tra build/cú pháp.
5. **Xuất báo cáo chẩn đoán**: Trình bày rõ nguyên nhân và cách khắc phục.

---

## 📑 4. Mẫu Báo Cáo Sửa Lỗi (Debugger Output Report)

```markdown
# [DEBUGGER REPORT] Khắc Phục Lỗi: <Mô Tả Ngắn Gọn Lỗi>

## 1. Nhật Ký Lỗi & Hiện Trạng (Error Log)
```
<Trích xuất chính xác log lỗi hoặc thông báo từ terminal>
```

## 2. Phân Tích Nguyên Nhân Gốc Rễ (Root Cause Analysis)
- **Vị trí phát sinh**: `path/to/file.ext:line`
- **Nguyên nhân cốt lõi**: Giải thích cơ chế vì sao lỗi xảy ra (do async, case-sensitivity, null value, v.v.).
- **Tác động**: Gây gián đoạn màn hình nào / endpoint nào.

## 3. Bản Vá Phẫu Thuật (Surgical Fix)
- **File điều chỉnh**: `path/to/file.ext`
- **Thay đổi cụ thể**:
  - Trước: `<Dòng code lỗi>`
  - Sau: `<Dòng code đã bọc an toàn>`

## 4. Kiểm Thử & Xác Nhận (Verification)
- **Lệnh thực thi**: `cd frontend; npm run build` (hoặc lệnh kiểm tra tương ứng)
- **Kết quả**: Exit Code 0 - Không còn lỗi phát sinh.
- **Rủi ro hồi quy (Regression Risk)**: Không có - Không làm thay đổi logic các tính năng phụ thuộc.
```
