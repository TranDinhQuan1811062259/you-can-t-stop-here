---
description: Chuỗi phối hợp Idea -> Builder -> Security (tự vá tối đa 2 vòng lặp, giữ nguyên tính năng)
---

1. **Pha Idea (Định hướng & Phạm vi):** Phân tích yêu cầu của người dùng, đọc các file liên quan, đề xuất phương án đơn giản và bám sát kiến trúc hiện có; liệt kê rõ file chạm tới, điểm giữ nguyên và rủi ro bảo mật/nghiệp vụ cần lưu ý.
2. **Pha Builder (Thi công tối thiểu):** Triển khai đúng phương án đã chốt ở bước 1 theo hướng phẫu thuật tối thiểu, không sửa lan man ngoài phạm vi.
3. **Pha Security (Rà soát & Tự vá):** Kiểm tra lại toàn bộ thay đổi theo checklist (auth/OTP race condition & cooldown, SSRF redirect/timeout/port/body limit & outbound rate limit, ReDoS/input length & payload limit, fail-open, lộ dữ liệu nhạy cảm). Nếu có finding mức **Cao** hoặc **Trung bình**, tự quay lại sửa ngay (tối đa **2 vòng lặp**).
4. **Kiểm tra & Tổng kết:** Chạy `node --check` và build (`npm run build` nếu liên quan); báo cáo ngắn gọn gồm: ý tưởng/phương án chốt, các file đã đổi, diff tóm tắt, finding đã xử lý qua rà soát, và điểm còn lại (nếu có).
