# Hướng Dẫn Tải & Thay Thế Model Xe Tăng 3D (.glb / .gltf)

Website đã tích hợp sẵn thư viện **Three.js & GLTFLoader** chuyên nghiệp.
Hệ thống sẽ **tự động kiểm tra và ưu tiên nạp file 3D của bạn** nếu file tồn tại trong thư mục này!

---

### 1. Cách lấy file Model 3D miễn phí trên mạng:
1. Bạn có thể truy cập các kho 3D miễn phí hàng đầu thế giới:
   - **Sketchfab**: [https://sketchfab.com/3d-models?features=downloadable&sort_by=-likeCount](https://sketchfab.com) (Tìm từ khóa: `T-54 tank`, `tank`, `military vehicle`, `vietnam tank`)
   - **Poly Pizza**: [https://poly.pizza](https://poly.pizza) (Tìm từ khóa: `tank`)
   - **Free3D**: [https://free3d.com/3d-models/tank](https://free3d.com)
2. Chọn model bạn ưng ý nhất và nhấn nút **Download 3D Model**.
3. Chọn định dạng **.GLB** (khuyên dùng vì đã nhúng sẵn toàn bộ Texture, vật liệu kim loại PBR bên trong 1 file duy nhất).

---

### 2. Cách cài đặt vào dự án:
- Đổi tên file đã tải thành:
  👉 **`tank3d.glb`**
- Thả file đó vào đúng thư mục này:
  📁 `frontend/public/models/tank3d.glb`

---

### 3. Tận hưởng kết quả:
- **Ngay lập tức**: Cả hiệu ứng chuyển trang, cửa sổ tương tác 360 độ và **hiệu ứng chiếc xe tăng 3D lao tới rồi xoáy ốc bị hút vào nút Đăng Bài** sẽ sử dụng chính chiếc xe tăng 3D bạn vừa tải về!
- Nếu thư mục chưa có file `tank3d.glb`: Hệ thống sẽ tự động kích hoạt **Cỗ xe tăng thép T-54 3D Procedural Three.js** với tháp pháo tròn, 10 bánh tì kép, xích sắt và cờ đỏ sao vàng lụa uốn lượn sóng trong không gian 3 chiều!
