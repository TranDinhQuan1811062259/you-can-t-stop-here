---
description: Quy trình sửa bảo mật (Builder) kết hợp tự rà soát lỗ hổng & edge case (Security) tối đa 2 vòng lặp
---

1. Xác định phạm vi mục tiêu bảo mật hoặc danh sách finding được giao; đọc đúng file liên quan, tuyệt đối giữ nguyên tính năng cốt lõi và luồng nghiệp vụ đang chạy.
2. **Pha Builder (Thi công tối thiểu):** Chỉnh sửa gọn nhất, tránh sửa lan man sang các phần không liên quan.
3. **Pha Security Audit (Tự rà soát chéo):** Kiểm tra kỹ các điểm vừa sửa theo checklist:
   - Auth, OTP & Rate Limit: race condition, cooldown/quota bypass, khóa nhầm user, lưu dữ liệu nhạy cảm trên RAM/DB, fail-open khi thiếu `NODE_ENV`.
   - SSRF & Outbound Request: redirect (`redirect: 'error'`), timeout (`AbortSignal.timeout`), port lạ, giới hạn kích thước body stream, rate limit cho endpoint gọi ra ngoài.
   - DoS & Input Validation: kiểm tra/cắt giới hạn độ dài input trước regex/xử lý nặng, giới hạn kích thước payload.
4. **Vòng lặp xử lý:** Nếu phát hiện finding mức **Cao** hoặc **Trung bình**, tự quay lại sửa ngay (tối đa **2 vòng lặp**), không sa đà tranh luận finding mức Thấp.
5. **Kiểm tra & Báo cáo:** Chạy kiểm tra cú pháp (`node --check`) và build (`npm run build` nếu liên quan); xuất báo cáo gọn gồm: file đã đổi, diff tóm tắt, finding đã xử lý qua vòng rà soát, và điểm còn lại (nếu có).
