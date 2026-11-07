# 📱 HƯỚNG DẪN CÀI ĐẶT & ĐÓNG GÓI ỨNG DỤNG FREEDOM ĐA NỀN TẢNG
> **Dành cho Smartphone (Android, iOS), Máy tính bảng (iPad, Android Tablet) và Máy tính (Windows, macOS)**

Hệ thống **Freedom** hiện đã được tích hợp đầy đủ công nghệ **Progressive Web App (PWA) thế hệ mới** kết hợp với **Service Worker ngoại tuyến** và **Manifest chuẩn quốc tế**.

---

## 🌟 1. CÁCH NGƯỜI DÙNG CÀI ĐẶT TRỰC TIẾP (KHÔNG CẦN QUA APP STORE CỒNG KỀNH)

Người dùng ở bất kỳ hệ điều hành nào chỉ cần vào trang web là có thể cài đặt về máy chỉ sau **1 thao tác chạm**:

### 📱 A. Dành cho điện thoại Android & Máy tính bảng Android:
1. Mở trang web Freedom trên **Google Chrome**, **Microsoft Edge** hoặc **Samsung Internet**.
2. Một thanh thông báo thông minh **"Cài Đặt Freedom App (Miễn phí)"** sẽ tự động trượt lên ở mép dưới màn hình, hoặc bấm nút **"📲 Tải App"** ở góc phải thanh Header.
3. Bấm **"Cài ngay"** -> Ứng dụng Freedom sẽ tự động cài vào máy như một app gốc từ CH Play:
   - Có icon riêng trên màn hình chính (*Home Screen*).
   - Chạy toàn màn hình (*Standalone Mode* - không vướng thanh địa chỉ trình duyệt).
   - Mở ứng dụng siêu tốc và đọc được bài viết ngay cả khi mất mạng (*Offline Caching*).

---

### 🍏 B. Dành cho iPhone & iPad (iOS / iPadOS):
1. Mở trang web Freedom bằng trình duyệt **Safari**.
2. Nhấn vào biểu tượng **Chia sẻ** (**📤**) ở thanh công cụ dưới đáy màn hình.
3. Cuộn xuống một chút và chọn **"Thêm vào Màn hình chính"** (**➕ Add to Home Screen**).
4. Nhấn **"Thêm" (Add)** ở góc trên bên phải.
   - Logo Freedom tinh tế sẽ xuất hiện ngay lập tức cạnh các ứng dụng khác trên màn hình iPhone/iPad của bạn.
   - Khi chạm vào mở lên, ứng dụng sẽ chạy độc lập, tự động điều chỉnh theo tai thỏ/Dynamic Island.

---

### 💻 C. Dành cho Máy tính Windows & macOS:
1. Mở trang web bằng trình duyệt **Google Chrome** hoặc **Microsoft Edge**.
2. Ở phía bên phải thanh địa chỉ (URL bar), bạn sẽ thấy biểu tượng **"Cài đặt ứng dụng"** (**⊕** hoặc icon máy tính), hoặc bấm nút **"📲 Tải App"** trên Header.
3. Bấm **"Cài đặt" (Install)**:
   - Ứng dụng sẽ mở trong một cửa sổ riêng biệt không có thanh menu trình duyệt.
   - Biểu tượng Freedom tự động được ghim vào thanh **Taskbar** (Windows) hoặc **Dock** (macOS) và xuất hiện trong menu Start.

---

## 📦 2. CÁCH XUẤT FILE TẢI VỀ TRỰC TIẾP (FILE .APK CHO ANDROID HOẶC .MSIX / .EXE CHO WINDOWS)

Nếu bạn muốn có sẵn file `.apk` để người dùng bấm vào là tải file về máy hoặc để đăng lên Google Play Store, bạn có 2 cách cực kỳ nhanh:

### 🚀 Cách 1: Dùng Microsoft PWABuilder (Nhanh nhất - Không cần biết viết code, chỉ mất 1 phút)
1. Đưa website Freedom lên tên miền thật của bạn (ví dụ Vercel, Netlify, Render, hoặc VPS).
2. Truy cập công cụ chính thức miễn phí của Microsoft: **[https://www.pwabuilder.com](https://www.pwabuilder.com)**
3. Dán link website Freedom của bạn vào ô tìm kiếm và bấm **"Start"**.
4. PWABuilder sẽ chấm điểm PWA (Freedom đạt 100% tiêu chuẩn PWA).
5. Bạn chỉ cần chọn:
   - **Android**: Bấm **"Package for Android"** ➔ Tải ngay file `.apk` (cài đặt trực tiếp) và `.aab` (để up lên Google Play).
   - **Windows**: Bấm **"Package for Windows"** ➔ Tải file cài đặt `.msix` cho Windows 10 & 11.
   - **iOS**: Bấm **"Package for iOS"** ➔ Xuất project Xcode sẵn sàng cho App Store.

---

### 🛠️ Cách 2: Đóng gói bằng Capacitor (Tạo Native App Studio)
Nếu bạn muốn tự build file `.apk` trên máy tính bằng Android Studio:
```bash
# 1. Cài đặt Capacitor vào thư mục frontend
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Khởi tạo cấu hình Capacitor
npx cap init "Freedom" "com.freedom.web.app" --web-dir dist

# 3. Build mã nguồn React sang dist
npm run build

# 4. Thêm nền tảng Android
npx cap add android

# 5. Mở project trong Android Studio để xuất file .apk
npx cap open android
```
Trong Android Studio, bạn vào menu **Build > Build Bundle(s) / APK(s) > Build APK(s)** là bạn sẽ có ngay file `.apk` để gửi cho bạn bè hoặc up lên website cho người dùng tải về!
