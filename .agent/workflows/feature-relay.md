---
description: Điều phối chuỗi làm việc từ ý tưởng -> kế hoạch -> thi công -> review (gọi thêm audio-engineer/ui-polish/debugger khi đúng phạm vi)
---

1. **Ideator & Planner:** Phân tích yêu cầu, đọc file liên quan; đề xuất phương án gọn bám sát kiến trúc hiện có, liệt kê file chạm tới, điểm giữ nguyên và rủi ro.
2. **Builder:** Thi công tối thiểu đúng kế hoạch đã chốt, không sửa lan man ngoài phạm vi.
3. **Chuyên trách nhánh (nếu liên quan):**
   - Đụng luồng TTS / âm thanh / metadata nhạc: áp dụng/kiểm tra theo `audio-engineer.md`.
   - Đụng giao diện / trải nghiệm người dùng: áp dụng/kiểm tra theo `ui-polish.md`.
4. **Reviewer & Debugger:** Rà diff xem có lỗi logic, lệch rule hay tác động phụ không; nếu có lỗi/build/test fail thì dùng `debugger.md` khoanh vùng và sửa ngay (tối đa 2 vòng lặp).
5. **Kiểm tra & Tổng kết:** Chạy kiểm tra cú pháp (`node --check`) và build (`npm run build` nếu liên quan); báo cáo ngắn gọn phương án chốt, file đã đổi, diff tóm tắt, kết quả kiểm tra và điểm còn lại (nếu có).
