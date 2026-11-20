import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/apiResponse.js';

/**
 * =========================================================================
 * 🛡️ BỘ ĐIỀU PHỐI GIỚI HẠN TẦN SUẤT TRUY CẬP (RATE LIMITING MIDDLEWARES)
 * =========================================================================
 * Bảo vệ hệ thống xác thực khỏi tấn công Brute-Force mật khẩu/mã PIN OTP,
 * và ngăn chặn tấn công spam "bom mail" làm cạn kiệt quota Gmail SMTP.
 */

/**
 * 1. Giới hạn tần suất chung cho các thao tác Xác thực (Đăng nhập, Xác minh OTP, Social Login)
 * - Tối đa 10 requests / 1 phút cho mỗi địa chỉ IP.
 * - Trả về mã lỗi HTTP 429 nếu vượt ngưỡng.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  limit: 10, // Tối đa 10 lần mỗi IP trong 1 phút
  standardHeaders: true, // Trả về headers tiêu chuẩn Draft-6/Draft-7 `RateLimit-*`
  legacyHeaders: false, // Tắt headers cũ `X-RateLimit-*`
  handler: (req, res) => {
    return sendError(res, {
      message: 'Bạn đã thực hiện thao tác xác thực quá nhiều lần trong thời gian ngắn. Vui lòng chờ 1 phút rồi thử lại để bảo đảm an toàn!',
      status: 429,
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * 2. Giới hạn tần suất gửi mã OTP theo địa chỉ IP
 * - Tối đa 5 requests gửi OTP / 1 phút cho mỗi địa chỉ IP.
 * - Ngăn chặn một IP spam gửi dồn dập nhiều OTP.
 */
export const otpSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  limit: 5, // Tối đa 5 lần gửi OTP / IP / phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      message: 'Địa chỉ IP của bạn đã gửi yêu cầu mã OTP quá nhiều lần. Vui lòng chờ 1 phút trước khi thử lại!',
      status: 429,
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * 3. Bộ đệm kiểm soát Cooldown & Tần suất gửi OTP theo từng Email / Số điện thoại mục tiêu
 * - Chống Spam "bom mail" vào cùng một hòm thư (ngay cả khi kẻ tấn công đổi IP).
 * - Cooldown tối thiểu 60 giây giữa 2 lần gửi mã tới cùng một email/số điện thoại.
 * - Tối đa 5 mã OTP / 10 phút cho cùng một tài khoản.
 */
const targetOtpTracker = new Map();

// Tự động dọn dẹp các mục quá 15 phút để giải phóng bộ nhớ
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [target, record] of targetOtpTracker.entries()) {
    if (now - record.windowStart > 15 * 60 * 1000) {
      targetOtpTracker.delete(target);
    }
  }
}, 10 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export const otpTargetCooldownLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  const rawTarget = req.body?.email || req.body?.identifier || req.body?.phone;
  if (!rawTarget || typeof rawTarget !== 'string') {
    // Nếu không có target, chuyển sang controller để trả lỗi validate 400
    return next();
  }

  const cleanTarget = rawTarget.includes('@')
    ? rawTarget.toLowerCase().trim()
    : rawTarget.replace(/\s+/g, '');

  const now = Date.now();
  const COOLDOWN_MS = 60 * 1000; // 60 giây giữa 2 lần gửi
  const WINDOW_MS = 10 * 60 * 1000; // Cửa sổ 10 phút
  const MAX_PER_WINDOW = 5; // Tối đa 5 lần trong 10 phút

  const record = targetOtpTracker.get(cleanTarget);

  if (record) {
    // 1. Kiểm tra Cooldown 60 giây
    const elapsedSinceLast = now - record.lastSent;
    if (elapsedSinceLast < COOLDOWN_MS) {
      const waitSeconds = Math.ceil((COOLDOWN_MS - elapsedSinceLast) / 1000);
      return sendError(res, {
        message: `Mã xác thực OTP vừa được gửi tới bạn. Vui lòng chờ ${waitSeconds} giây trước khi yêu cầu gửi lại!`,
        status: 429,
        errors: { retryAfter: waitSeconds },
      });
    }

    // 2. Kiểm tra số lần gửi tối đa trong cửa sổ 10 phút
    if (now - record.windowStart < WINDOW_MS) {
      if (record.count >= MAX_PER_WINDOW) {
        const resetMinutes = Math.ceil((WINDOW_MS - (now - record.windowStart)) / 60000);
        return sendError(res, {
          message: `Tài khoản này đã nhận quá số lượng mã OTP cho phép (${MAX_PER_WINDOW} lần / 10 phút). Vui lòng thử lại sau ${resetMinutes} phút!`,
          status: 429,
          errors: { retryAfterMinutes: resetMinutes },
        });
      }
    } else {
      // Đã vượt quá cửa sổ 10 phút -> reset cửa sổ mới
      record.windowStart = now;
      record.count = 0;
    }
  }

  const previousRecord = record ? { ...record } : null;

  // Khóa lạc quan (Optimistic Lock) ngay lập tức để chặn các request đồng thời (burst attack)
  if (record) {
    record.lastSent = now;
    record.count += 1;
  } else {
    targetOtpTracker.set(cleanTarget, {
      lastSent: now,
      count: 1,
      windowStart: now,
    });
  }

  // Chỉ giữ cooldown/quota khi OTP thực sự được dispatch (req.otpDispatched = true).
  // Nếu request thất bại/lỗi (>= 400) TRƯỚC KHI dispatch (ví dụ validate thất bại, thiếu trường):
  // -> Hoàn tác tracking để không khóa oan người dùng hợp lệ hoặc bị kẻ xấu lợi dụng DOS khóa tài khoản mục tiêu.
  res.on('finish', () => {
    if (res.statusCode >= 400 && !req.otpDispatched) {
      if (previousRecord) {
        targetOtpTracker.set(cleanTarget, previousRecord);
      } else {
        targetOtpTracker.delete(cleanTarget);
      }
    }
  });

  next();
};

/**
 * 4. Giới hạn tần suất tạo giọng nói A.I (Text-To-Speech) theo địa chỉ IP
 * - Tối đa 20 requests / 1 phút cho mỗi địa chỉ IP.
 * - Ngăn chặn spam chuyển văn bản thành giọng nói (TTS) làm cạn kiệt tài nguyên hoặc bị chặn IP upstream.
 */
export const ttsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  limit: 20, // Tối đa 20 lần mỗi IP / phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      message: 'Bạn đã gửi quá nhiều yêu cầu đọc văn bản A.I trong thời gian ngắn. Vui lòng chờ 1 phút rồi thử lại!',
      status: 429,
      errors: { retryAfter: 60 },
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * 5. Giới hạn tần suất trích xuất Metadata bài hát theo địa chỉ IP
 * - Tối đa 30 requests / 1 phút cho mỗi địa chỉ IP.
 * - Ngăn chặn lạm dụng cào dữ liệu oEmbed và quét cổng/SSRF qua /api/music/metadata.
 */
export const musicMetadataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  limit: 30, // Tối đa 30 requests mỗi IP / phút
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return sendError(res, {
      message: 'Bạn đã gửi quá nhiều yêu cầu trích xuất thông tin bài hát trong thời gian ngắn. Vui lòng chờ 1 phút rồi thử lại!',
      status: 429,
      errors: { retryAfter: 60 },
    });
  },
  skip: () => process.env.NODE_ENV === 'test',
});
