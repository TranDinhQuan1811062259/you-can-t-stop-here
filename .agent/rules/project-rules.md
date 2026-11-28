# 🌌 Quy Tắc Dự Án & Chuẩn Mực AI Agent: Freedom Web (`project-rules.md`)

Tài liệu này được đồng bộ từ file quy tắc gốc `GEMINI.md` tại thư mục root, định nghĩa toàn bộ quy chuẩn kiến trúc, tech stack, quy tắc kỹ thuật bất khả xâm phạm và quy trình phối hợp cho tất cả AI Agents khi làm việc trên repository **`freedom-web`** (`you-cant-stop-here`).

---

## 🏗️ 1. Tổng Quan Kiến Trúc & Tech Stack Codebase

Repository được tổ chức theo cấu trúc Split Monorepo (Frontend và Backend độc lập, điều phối qua root `package.json`):

```
freedom-web/
├── .agent/                     # Hệ thống AI Agent workflows & rules
│   ├── rules/
│   │   └── project-rules.md    # Bản sao quy tắc dự án
│   └── workflows/              # Các lệnh workflow chuyên trách (/planner, /builder, /ideator, ...)
├── frontend/                   # Ứng dụng Client Single Page Application (SPA)
│   ├── public/                 # Static assets (audio mp3, ambient sound, images, models)
│   ├── src/
│   │   ├── components/         # Giao diện (admin, auth, blog, chat, common, layout, profile, story, wellness)
│   │   ├── context/            # React Contexts (Global state, Audio Context, Theme)
│   │   ├── hooks/              # Custom hooks (Audio, Event, Weather, Atmosphere)
│   │   ├── pages/              # Các trang chính của ứng dụng
│   │   ├── routes/             # Định tuyến AppRoutes
│   │   ├── services/           # Axios API services (postService, authService, etc.)
│   │   ├── styles/             # CSS sheets (idleWeather, postSubmitAtmosphere, soldiersParade29)
│   │   └── utils/              # Audio & visual engines (soundEffects, ambientSoundEngine, etc.)
│   └── package.json
├── backend/                    # RESTful API & Media Processing Server
│   ├── src/
│   │   ├── config/             # Cấu hình DB, Cloudinary, Mailer
│   │   ├── controllers/        # Điều khiển nghiệp vụ API
│   │   ├── middleware/         # Auth, Upload, Error handler, Rate limit
│   │   ├── models/             # Mongoose Schemas (User, Post, Comment, Event, Story)
│   │   ├── routes/             # Express API Routes
│   │   ├── services/           # Logic TTS, Email, Cloudinary
│   │   ├── utils/              # Seed data, helpers
│   │   └── server.js           # Entry point backend
│   └── package.json
├── web/                        # Static assets / Landing backup
├── start-project.bat           # Script khởi động song song FE & BE trên Windows
├── package.json                # Root package scripts
└── GEMINI.md                   # File quy chuẩn gốc cho AI Agent
```

### Chi tiết Tech Stack hiện tại:

| Phân hệ | Công nghệ / Thư viện chính | Vai trò trong hệ thống |
|---|---|---|
| **Frontend Framework** | **React 18.3.1**, React Router DOM 6.28.1 | Giao diện người dùng, SPA routing |
| **Frontend Tooling** | **Vite 6.0.7**, `@vitejs/plugin-react` 4.3.4 | Dev server cực nhanh, build bundle tối ưu |
| **3D & Visual Effects** | **Three.js 0.187.0** | Không gian 3D thư giãn, hiệu ứng thời tiết, background visualizer |
| **Audio Architecture** | **Web Audio API**, HTML5 Audio Engine | `soundEffects.js` (72KB SFX), `ambientSoundEngine.js` (29KB), `keyboardSoundEngine.js`, `storyAudioEngine.js`, `aiVoiceEngine.js` |
| **HTTP Client** | **Axios 1.7.9** | Giao tiếp API RESTful với backend |
| **Backend Runtime** | **Node.js (ES Modules `"type": "module"`)** | Nền tảng thực thi server hiện đại |
| **Backend Framework** | **Express.js 4.21.2**, Morgan, CORS | Máy chủ HTTP REST API |
| **Database & ODM** | **MongoDB**, **Mongoose 8.9.5** | Lưu trữ bài viết, người dùng, tâm sự, bình luận |
| **TTS & Voice Engines** | **`msedge-tts 2.1.1`**, **`google-tts-api 2.0.2`** | Đọc bài viết tự động (Text-to-Speech) giọng chuẩn Việt |
| **Media & File Handling**| **Cloudinary 2.5.1**, **Multer 1.4.5**, **Mammoth**, **Pdf-parse** | Quản lý ảnh/audio đám mây, parse tài liệu docx/pdf |
| **Bảo mật & Tiện ích** | **JWT (jsonwebtoken 9.0.2)**, **Bcryptjs 2.4.3**, **Nodemailer 10.3.1**, **Dotenv 16.4.7** | Xác thực, mã hóa mật khẩu, gửi mail OTP |

---

## ⛔ 2. Sáu Quy Tắc Bất Khả Xâm Phạm Cho Mọi AI Agent

Bất kỳ AI Agent nào (Planner, Builder, Reviewer, UI-Polish, Audio-Engineer, Debugger, Ideator) khi thao tác trên repository đều phải tuân thủ nghiêm ngặt 6 quy tắc sau:

### Quy tắc 1: Chuẩn Đặt Tên & Đường Dẫn File Linux / Vercel (100% Case-Sensitivity)
- **Tên file & thư mục mới**:
  - Thư mục, file cấu hình, scripts, documentation: Bắt buộc dùng chuẩn **`kebab-case`**, toàn bộ chữ thường, không dấu tiếng Việt, không khoảng trắng, không ký tự đặc biệt (Ví dụ: `audio-player.jsx`, `project-rules.md`, `audio-context.js`).
  - React Component files: Dùng `PascalCase.jsx` (ví dụ: `AudioPlayer.jsx`), nhưng **tên file trên đĩa và chuỗi `import` phải khớp chính xác 100% từng ký tự hoa/thường**.
- **Độ nhạy hoa/thường (Linux/Vercel)**:
  - Windows không phân biệt hoa thường (`audioplayer.jsx` và `AudioPlayer.jsx` là một), nhưng Vercel, Render và Docker (Linux) phân biệt tuyệt đối.
  - ❌ Tuyệt đối cấm: Đổi tên file từ chữ thường sang chữ hoa hoặc ngược lại mà không đồng bộ đường dẫn import.
  - Bắt buộc kiểm tra mọi đường dẫn relative import (`./`, `../`) có đầy đủ extension hợp lệ và không dùng separator kiểu Windows (`\` -> bắt buộc dùng `/`).

### Quy tắc 2: Không Tự Ý Xóa Logic Đang Hoạt Động (Preserve Working Logic)
- **Bảo toàn chức năng cũ**: Codebase chứa nhiều logic chuyên sâu về âm thanh (`ambientSoundEngine`, `soundEffects`), Three.js animation, và bộ lọc nhạy cảm (`sensitiveFilter.js`). Tuyệt đối không xóa bỏ, không viết đè trắng (overwrite blindly) các tính năng đang hoạt động bình thường.
- **Sửa đổi có phẫu thuật (Surgical Editing)**:
  - Khi thêm tính năng mới hoặc vá lỗi, luôn mở rộng (extend) hoặc bọc (wrap) logic hiện tại.
  - Luôn đảm bảo tính tương thích ngược (backwards compatibility) cho API response contract và component props.

### Quy tắc 3: Dọn Dẹp Tài Nguyên Bắt Buộc (Mandatory Cleanup on Unmount)
Để đảm bảo hiệu năng mượt mà, không giật lag và không gây tràn RAM/CPU:
1. **Three.js Visualizer / Canvas**:
   - Lưu trữ `requestAnimationFrame` ID và hủy bằng `cancelAnimationFrame(frameId)` trong return của `useEffect`.
   - Bắt buộc gọi `.dispose()` trên toàn bộ `geometry`, `material`, `texture`, và gọi `renderer.dispose()` khi unmount component.
2. **Web Audio API & HTML5 Audio**:
   - Ngắt kết nối các node âm thanh (`sourceNode.disconnect()`, `gainNode.disconnect()`).
   - Tạm dừng `<audio>` element (`audio.pause()`), đặt `src = ""` hoặc hủy object URL khi rời trang.
   - Tránh khởi tạo nhiều `AudioContext` song song; ưu tiên dùng singleton hoặc Audio Context dùng chung qua React Context.
3. **Event Listeners & Timers**:
   - Mọi `window.addEventListener` (`resize`, `keydown`, `scroll`, `mousemove`) phải có `window.removeEventListener` tương ứng trong hàm cleanup.
   - Toàn bộ `setInterval` và `setTimeout` phải được xóa bằng `clearInterval` / `clearTimeout`.

### Quy tắc 4: Bọc Try/Catch Cho Autoplay Âm Thanh (Handle Autoplay Policy)
- Tất cả trình duyệt hiện đại (Chrome, Edge, Safari, Firefox) đều chặn phát âm thanh tự động nếu chưa có tương tác người dùng (`NotAllowedError: play() failed because the user didn't interact with the document first`).
- **Yêu cầu kỹ thuật**:
  - Mọi lệnh gọi `audio.play()` hoặc `audioContext.resume()` phải được đặt trong khối `try...catch` hoặc gắn `.catch(...)`:
    ```javascript
    try {
      if (audioContext && audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (err) {
      console.warn('[AudioEngine] Autoplay was blocked by browser policy:', err);
      // Hiển thị nút UI hoặc banner mời người dùng nhấn để bật âm thanh
    }
    ```
  - Cung cấp trạng thái fallback trực quan (icon âm thanh có gạch chéo, tooltip mời bấm để nghe) thay vì để lỗi làm crash ứng dụng.

### Quy tắc 5: Tư Duy Chủ Động Có Kiểm Soát (Proactive Mindset)
- **Chủ động quan sát & phát hiện điểm cải tiến**:
  - Trong suốt quá trình đọc code, kiểm tra hệ thống hoặc thực thi nhiệm vụ, nếu phát hiện bất kỳ lỗi tiềm ẩn nào (edge cases, race condition, memory leak), điểm nghẽn UX (trải nghiệm chưa mượt mà, thiếu tương tác/visual feedback, giật lag), file thừa/code rác không còn sử dụng, hoặc các điểm kỹ thuật có thể nâng tầm trải nghiệm âm thanh - thị giác của dự án, agent **phải chủ động chỉ ra ngay** cho người dùng.
- **Đề xuất 2–3 bước/ý tưởng tiếp theo (Next-Step Recommendations)**:
  - Ở cuối mỗi phản hồi, agent luôn chủ động đề xuất ngắn gọn **2–3 bước hoặc ý tưởng tiếp theo đáng giá nhất** kèm lý do cụ thể (giải thích rõ vì sao nên làm và mang lại lợi ích gì cho hệ thống).
- **Ranh giới an toàn tuyệt đối (Strict Non-Destructive Boundary)**:
  - Toàn bộ các phát hiện và ý tưởng bổ sung **chỉ dừng lại ở mức đề xuất, phân tích và gợi ý giải pháp**.
  - ❌ **Tuyệt đối cấm**: Tự ý chỉnh sửa code, xóa file, cài thêm package hoặc thay đổi logic ngoài phạm vi yêu cầu cụ thể của phiên làm việc khi chưa có sự xác nhận/phê duyệt rõ ràng từ người dùng.

### Quy tắc 6: Ranh Giới Dữ Liệu & Bảo Mật (Backend Database Source of Truth)
- **CSDL Backend (MongoDB) là nguồn sự thật duy nhất**:
  - Toàn bộ dữ liệu nhạy cảm & nghiệp vụ cốt lõi (tài khoản, phân quyền `role`/RBAC, trạng thái khóa `status`, nhật ký an ninh, bài viết, bình luận, tin nhắn) bắt buộc phải đọc/ghi trực tiếp qua API Backend và lưu trữ trong MongoDB.
- **Cấm đưa dữ liệu tài khoản & phân quyền ra Frontend**:
  - ❌ **Tuyệt đối cấm** lưu danh sách tài khoản, quyền quản trị (`role`), mã PIN, mật khẩu hay dữ liệu người dùng vào `localStorage`/`sessionStorage` (ngoại trừ token phiên như JWT / `x-admin-token`) hoặc tạo file mock/seed tài khoản trong `frontend/src/`.
  - ❌ **Tuyệt đối cấm** tự ý viết fallback sang `localStorage`/dữ liệu giả lập khi API lỗi đối với luồng tài khoản, đăng nhập, phân quyền, quản trị và danh sách bài viết (chỉ hiển thị Loading Skeleton hoặc thông báo lỗi UI rõ ràng).
  - ❌ **Tuyệt đối cấm** hardcode tên cá nhân, email Admin, mã PIN, `JWT_SECRET` hay thông tin xác thực trong mã nguồn.
- **Projection sạch (Clean Data Projection)**:
  - Mọi API trả về thông tin user bắt buộc loại bỏ trường nhạy cảm (`.select('-password -rawPassword -otp -otpExpires -resetPasswordToken')`).

---

## 🚀 3. Danh Mục Các Lệnh Workflow Trong Repo (`.agent/workflows/`)

| Lệnh | Workflow File | Vai trò chuyên trách | Khi nào sử dụng |
|---|---|---|---|
| `/planner` | `planner.md` | **Kiến Trúc Sư & Lập Kế Hoạch** | Khi bắt đầu tính năng mới, tái cấu trúc hoặc thay đổi kiến trúc lớn. Xuất sơ đồ cây thư mục & file matrix. |
| `/builder` | `builder.md` | **Kỹ Sư Fullstack & Tích Hợp** | Chuyển đổi plan thành code hoàn chỉnh; tự chạy `npm run build` kiểm tra trước khi bàn giao. |
| `/reviewer` | `reviewer.md` | **Thẩm Định & Kiểm Thử Pre-Deploy** | Đánh giá 3 tiêu chí: Lỗi tiềm ẩn, Rò rỉ bộ nhớ & Hiệu năng, và Tương thích Linux/Vercel. |
| `/ui-polish` | `ui-polish.md` | **Chuyên Gia UI/UX & Micro-interactions** | Tối ưu giao diện dark/minimalist, responsive mobile/desktop, hiệu ứng chuyển động mượt mà. |
| `/audio-engineer` | `audio-engineer.md` | **Kỹ Sư Âm Thanh Web & TTS Pipeline** | Xử lý Web Audio, playlist, preload, crossfade, khắc phục lỗi thiếu file & autoplay chặn. |
| `/debugger` | `debugger.md` | **Bác Sĩ Bắt Bệnh & Sửa Lỗi Tận Gốc** | Đọc log terminal/console, chẩn đoán nguyên nhân gốc rễ, sửa lỗi phẫu thuật tối giản. |
| `/ideator` | `ideator.md` | **Creative Partner & Product Architect** | Quét bối cảnh dự án, audit tìm "khoảng trống" UX/âm nhạc/dấu ấn cá nhân và đề xuất ý tưởng theo 3 tầng (Quick Wins, Signature Features, Roadmap). |

---

## 🛠️ 4. Quy Trình Kiểm Thử & Lệnh Chuẩn

Khi phát triển hoặc kiểm thử dự án, sử dụng các lệnh chuẩn sau:
- **Kiểm thử Build Frontend**:
  ```powershell
  cd frontend; npm run build
  ```
- **Kiểm tra cú pháp Backend**:
  ```powershell
  cd backend; node --check src/server.js
  ```
- **Khởi chạy môi trường Dev**:
  ```powershell
  npm run dev          # Khởi chạy cả FE và BE thông qua start-project.bat
  # Hoặc từng phân hệ:
  npm run dev:frontend # Vite dev server (port 5173 mặc định)
  npm run dev:backend  # Node watch server (port 5000 mặc định)
  ```
