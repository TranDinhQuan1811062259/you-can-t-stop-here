# You Can't Stop Here - Workplace Social & Community Blog

**"You Can't Stop Here"** là không gian mạng xã hội thu nhỏ và blog sẻ chia dành cho những người đi làm. Nơi bạn có thể trút bỏ những áp lực về deadline, kiệt sức (burnout), khủng hoảng tuổi nghề và nhận lại những lời động viên, chia sẻ chân thành từ cộng đồng.

---

## 🌟 Điểm nổi bật & Phân quyền

1. **Khách vãng lai (Chưa đăng nhập):**
   - Đọc tự do toàn bộ bài viết, tâm sự của mọi người.
   - Đọc toàn bộ các bình luận và lời động viên trong cộng đồng.
   - Gửi nút động viên (`💪 Cheer`) tức thì.
2. **Thành viên có tài khoản (Đã đăng ký / đăng nhập):**
   - **Đăng ký / Đăng nhập** nhanh chóng qua Modal Popup (bảo mật JWT & bcrypt).
   - **✍️ Viết tâm sự mới:** Chia sẻ những áp lực, suy nghĩ trong công việc của chính mình.
   - **💬 Gửi lời động viên:** Bình luận dưới bài viết kèm theo các huy hiệu cảm xúc:
     - `🫂 Gửi cái ôm`
     - `💪 Cố lên nhé`
     - `💡 Lời khuyên`
     - `💬 Đồng cảm`

---

## 📁 Cấu trúc thư mục

```text
freedom-web/
├── backend/                  # RESTful API Backend (Node.js, Express, MongoDB, JWT)
│   ├── src/
│   │   ├── config/           # Kết nối MongoDB (db.js)
│   │   ├── controllers/      # authController, postController, commentController, categoryController
│   │   ├── models/           # User, Post, Comment, Category (Mongoose)
│   │   ├── middlewares/      # protect (xác thực token JWT), errorHandler
│   │   ├── routes/           # /api/auth, /api/posts, /api/comments, /api/categories
│   │   ├── utils/            # slugify tiếng Việt, seedData, apiResponse
│   │   ├── app.js            # Express app & CORS
│   │   └── server.js         # Entry point cổng 5000
│   ├── .env
│   └── package.json
│
├── frontend/                 # Client UI (React 18 + Vite) cổng 3000
│   ├── public/images/        # Hình ảnh kế thừa từ template gốc
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/         # AuthModal (Popup Đăng nhập / Đăng ký)
│   │   │   ├── blog/         # PostCard, CommentSection, CreatePostModal, CategoryFilter
│   │   │   ├── layout/       # Header (Auth badge, Viết bài), Footer, MainLayout
│   │   │   └── common/       # LoadingSpinner, Pagination, ErrorMessage
│   │   ├── context/          # AuthContext (quản lý phiên đăng nhập toàn cục)
│   │   ├── pages/            # HomePage, PostDetailPage, CategoryPage, NotFoundPage
│   │   ├── services/         # apiClient (Axios interceptor gắn token), authService, postService, commentService
│   │   ├── hooks/            # usePosts
│   │   └── index.css         # Hệ thống giao diện hiện đại
│   ├── vite.config.js        # Port 3000 & Proxy /api -> :5000
│   └── package.json
│
└── web/                      # Template tĩnh gốc để tham khảo
```

## ☁️ Lưu trữ hình ảnh trên Cloudinary & Cơ sở dữ liệu MongoDB

### 1. MongoDB Local (Mongoose)
Dữ liệu của toàn bộ website được lưu trữ trực tiếp trên máy của bạn tại:
```env
MONGO_URI=mongodb://127.0.0.1:27017/freedom_blog
```
*(Hãy đảm bảo dịch vụ MongoDB trên máy bạn đang bật hoặc mở ứng dụng **MongoDB Compass**).*

### 2. Cấu hình Cloudinary (Lưu trữ hình ảnh bài viết)
1. Đăng ký tài khoản miễn phí tại [Cloudinary.com](https://cloudinary.com/).
2. Lấy 3 thông số tại Dashboard Cloudinary:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Mở file `backend/.env` và điền vào:
```env
CLOUDINARY_CLOUD_NAME=tên_cloud_của_bạn
CLOUDINARY_API_KEY=mã_api_key_của_bạn
CLOUDINARY_API_SECRET=mã_api_secret_của_bạn
```
Khi bạn đăng bài viết mới và chọn tệp ảnh, ảnh sẽ tự động được tải lên Cloudinary và lưu link trực tiếp vào bài viết!

---

## 🚀 Hướng dẫn khởi chạy

### Cách 1: Bật nhanh bằng file tự động (Khuyên dùng trên Windows)
Chỉ cần nhấp đúp vào file:
👉 **`start-project.bat`** (ngay thư mục gốc `freedom-web`)  
Hệ thống sẽ tự động mở 2 cửa sổ chạy song song cả **Backend (cổng 5050)** và **Frontend (cổng 3000)**!

---

### Cách 2: Bật thủ công bằng 2 Terminal trong VS Code

Vì dự án tách biệt rõ rệt 2 phần nên **bắt buộc phải có 2 cửa sổ Terminal chạy song song**:

#### Cửa sổ Terminal 1 (Backend - Cổng 5050):
```powershell
cd c:\Users\HP\Downloads\freedom-web\backend
npm run dev
```
*(Cửa sổ này phải luôn giữ mở để lắng nghe API)*

#### Cửa sổ Terminal 2 (Frontend - Cổng 3000):
*(Bấm nút dấu `+` ở góc trên tab Terminal trong VS Code để tạo thêm 1 terminal mới)*
```powershell
cd c:\Users\HP\Downloads\freedom-web\frontend
npm run dev
```

Truy cập: **`http://localhost:3000`** để trải nghiệm!
