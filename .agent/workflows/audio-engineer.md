# Workflow: Audio Engineer (Kỹ Sư Âm Thanh Web & TTS Pipeline)

## 📌 Vai trò & Mục tiêu
`audio-engineer.md` (`/audio-engineer`) đóng vai trò là **Chief Web Audio Specialist & Media Pipeline Architect** của dự án `freedom-web`. Chịu trách nhiệm toàn diện về chất lượng âm thanh, kiến trúc Web Audio API / HTML5 Audio, quản lý danh sách phát (playlist), tối ưu hóa luồng tải trước (preload/cache), loại bỏ hoàn toàn các lỗi trình duyệt chặn tự động phát (Autoplay Policy), xử lý sự cố file âm thanh bị thiếu (404 fallback) và thiết lập các hiệu ứng chuyển âm mượt mà (smooth crossfade/fading transitions).

---

## 🎧 1. Bản Đồ Hệ Thống Âm Thanh Trong Codebase

Codebase `freedom-web` sở hữu hệ sinh thái âm thanh đa tầng:
1. **Frontend Core Engines (`frontend/src/utils/`)**:
   - `soundEffects.js`: Bộ sưu tập hiệu ứng âm thanh tương tác (Click, Chime, Thư giãn, Chuông gió, v.v.).
   - `ambientSoundEngine.js`: Quản lý âm thanh môi trường đa lớp (Mưa rơi, sóng biển, gió thổi, lửa trại, tiếng đêm).
   - `keyboardSoundEngine.js`: Giả lập âm thanh gõ bàn phím (Mechanical switch, typewriter, soft click).
   - `storyAudioEngine.js`: Quản lý âm thanh đọc truyện và podcast radio tâm sự.
   - `aiVoiceEngine.js`: Cầu nối phát giọng đọc TTS sinh ra từ backend.
   - `musicPresets.js`: Danh sách các bản nhạc chữa lành cài đặt sẵn.
2. **Backend TTS Generation (`backend/src/services/`)**:
   - Tích hợp `msedge-tts` và `google-tts-api` sinh file đọc bài viết tiếng Việt chất lượng cao.
   - Caching file âm thanh và lưu trữ qua Cloudinary / static folder.

---

## 🛠️ 2. Quy Chuẩn Kỹ Thuật Web Audio API & HTML5 Audio

### A. Quản Lý Vòng Đời AudioContext & Autoplay Resilience
- **Singleton AudioContext**: Luôn duy trì một thể hiện duy nhất của `AudioContext` (hoặc thông qua React Context) để tránh vượt quá giới hạn trình duyệt (Chrome giới hạn tối đa 6 context đồng thời).
- **Chiến lược Bẻ Khóa Autoplay Thân Thiện**:
  ```javascript
  // Chuẩn mực xử lý Autoplay cho toàn bộ Audio Engine
  export const resumeAudioContext = async (audioCtx) => {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      try {
        await audioCtx.resume();
      } catch (err) {
        console.warn('[AudioContext] Resume blocked until user interaction:', err);
      }
    }
  };

  export const safePlayAudio = async (audioElement, onBlocked) => {
    try {
      const playPromise = audioElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        console.warn('[AudioEngine] Autoplay was prevented by browser policy.');
        if (typeof onBlocked === 'function') {
          onBlocked(error);
        }
        // Đăng ký event 1 lần duy nhất khi người dùng chạm vào trang
        const unlock = () => {
          audioElement.play().catch(() => {});
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
      } else {
        console.error('[AudioEngine] Playback failed with error:', error);
      }
    }
  };
  ```

### B. Hiệu Ứng Chuyển Bài Mượt Mà (Smooth Crossfade & Gain Ramping)
- **Tuyệt đối không cắt âm thanh đột ngột (Hard Cut)** gây tiếng "bốp/click" khó chịu trong tai nghe.
- **Sử dụng GainNode nội suy thời gian thực**:
  ```javascript
  export const fadeAudio = (gainNode, targetVolume, durationSeconds, audioCtx) => {
    const currentTime = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(targetVolume, currentTime + durationSeconds);
  };
  ```
- **Thời gian chuyển đổi chuẩn**:
  - Chuyển bài trong playlist: Crossfade 1.5s - 2.5s.
  - Tạm dừng/Tiếp tục (Pause/Resume): Fade in/out 0.2s - 0.4s.
  - Bật/Tắt âm thanh môi trường (Ambient toggle): Fade 0.8s.

### C. Quản Lý Danh Sách Phát (Playlist Engine) & Tải Trước (Smart Preload)
- **Trạng thái phát (Playback State Machine)**:
  - `IDLE` -> `LOADING` -> `READY` -> `PLAYING` -> `PAUSED` -> `ERROR`.
  - Quản lý chế độ: `Lặp lại một bài (Repeat One)`, `Lặp lại toàn bộ (Repeat All)`, `Trộn bài ngẫu nhiên (Shuffle)`.
- **Preload Bài Tiếp Theo**:
  - Khi bài hiện tại phát đạt `80%` thời lượng, tự động kích hoạt tải trước (buffer audio) của bài kế tiếp trong danh sách để phát liền mạch không trễ mạng.
- **Xử lý File Hỏng hoặc Thiếu (404 Missing File Resilience)**:
  - Khi gặp sự cố `404 Not Found` hoặc lỗi giải mã audio (`MEDIA_ERR_DECODE`):
    1. Bắt sự kiện `error` của thẻ Audio.
    2. Ghi log cảnh báo rõ ràng `[AudioEngine] Track <url> unavailable, skipping to next track gracefully.`
    3. Tự động chuyển bài kế tiếp mà không làm treo thanh điều khiển hay văng ứng dụng.

### D. Dọn Dẹp Tài Nguyên Tuyệt Đối (Zero Audio Leak)
Khi component unmount:
1. Gọi `audio.pause()`.
2. Gỡ bỏ toàn bộ event listeners (`timeupdate`, `canplay`, `ended`, `error`).
3. Ngắt kết nối các AudioNode (`sourceNode.disconnect()`, `gainNode.disconnect()`).
4. Nếu dùng `URL.createObjectURL(blob)`, bắt buộc gọi `URL.revokeObjectURL(url)`.

---

## 📋 3. Quy Trình Thực Thi Của `/audio-engineer`

1. **Khảo sát Nhu cầu Âm thanh (Audio Diagnostic)**:
   - Xác định luồng âm thanh cần tác động: SFX, Ambient, TTS, Playlist hay Three.js Audio Visualizer.
2. **Kiểm tra Chuẩn File & Static Assets**:
   - Đảm bảo file audio định dạng nén tối ưu: `.mp3` (128-192kbps) hoặc `.webm` / `.ogg` cho web.
   - File nằm đúng trong `frontend/public/sounds/` hoặc CDN Cloudinary.
   - Tên file tuân thủ `kebab-case` không dấu tiếng Việt.
3. **Triển Khai & Bọc Bảo Vệ**:
   - Luôn sử dụng hàm an toàn (`try/catch`, `safePlayAudio`, `resumeAudioContext`).
   - Tích hợp GainNode cho hiệu ứng fade.
4. **Kiểm Thử Thực Nghiệm**:
   - Kiểm tra hành vi khi người dùng chưa click mà trang cố phát nhạc.
   - Thử nghiệm tắt mạng giả lập xem player có graceful fallback không.
   - Chạy `cd frontend; npm run build`.

---

## 📑 4. Mẫu Báo Cáo Kết Quả (Audio Engineer Checklist)

```markdown
# [AUDIO-ENGINEER REPORT] <Tác vụ / Tính năng âm thanh>

## 1. Bản Đồ Nâng Cấp Kỹ Thuật
- **Hệ thống xử lý**: Web Audio API / HTML5 Audio / TTS Voice Pipeline
- **Các file can thiệp**: `frontend/src/utils/...`, `frontend/src/context/...`

## 2. Tiêu Chí Thẩm Định Âm Thanh
| Tiêu chí | Trạng thái | Đánh giá kỹ thuật |
|---|---|---|
| **Autoplay Handling** | ĐẠT | Bọc try/catch, có cờ tương tác và fallback UI |
| **Smooth Crossfade** | ĐẠT | GainNode ramping 2s, không tiếng click rè |
| **Preload & Caching** | ĐẠT | Buffer track tiếp theo ở 80% tiến độ |
| **Missing File Fallback**| ĐẠT | Bắt mã lỗi 404/decode, tự động chuyển bài |
| **Memory Cleanup** | ĐẠT | Đã ngắt kết nối AudioNode, revoke URL |

## 3. Kiểm Thử Build & Trực Quan
- [x] `cd frontend; npm run build` -> Hoàn tất thành công.
- [x] Không còn warning AudioContext suspended trên console.
```
