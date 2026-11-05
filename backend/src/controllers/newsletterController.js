import Subscriber from '../models/Subscriber.js';
import { verifyEmailExistence } from '../utils/emailValidator.js';
import { sendWelcomeNewsletter } from '../services/emailService.js';
import { isDbConnected } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';

/**
 * Đăng ký nhận tin định kỳ qua hòm thư
 * 1. Kiểm tra xác nhận địa chỉ email có tồn tại & có thể nhận thư (MX record) không
 * 2. Gửi thư chào mừng trực tiếp đến email người dùng
 * 3. Lưu vào cơ sở dữ liệu để gửi bản tin định kỳ hàng tuần
 */
export const subscribeNewsletter = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return sendError(res, {
        message: 'Vui lòng nhập địa chỉ email của bạn',
        status: 400,
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Kiểm tra xác nhận sự tồn tại của Email & Tên miền
    const checkResult = await verifyEmailExistence(cleanEmail);

    if (!checkResult.isValid) {
      return sendError(res, {
        message: checkResult.reason || 'Địa chỉ email này không tồn tại hoặc không thể nhận thư!',
        status: 400,
      });
    }

    // 2. Gửi thư trực tiếp tới địa chỉ email đã nhập
    const mailResult = await sendWelcomeNewsletter(cleanEmail);

    // 3. Lưu thông tin người đăng ký vào MongoDB
    let isNewSubscriber = true;

    if (isDbConnected) {
      const existing = await Subscriber.findOne({ email: cleanEmail });
      if (existing) {
        existing.status = 'active';
        existing.lastSentAt = new Date();
        existing.mxHost = checkResult.mxHost || existing.mxHost;
        await existing.save();
        isNewSubscriber = false;
      } else {
        await Subscriber.create({
          email: cleanEmail,
          status: 'active',
          verified: true,
          mxHost: checkResult.mxHost || '',
          subscribedAt: new Date(),
          lastSentAt: new Date(),
        });
      }
    } else {
      // Fallback persistent store
      const store = loadStore();
      if (!store.subscribers) store.subscribers = [];
      const foundIdx = store.subscribers.findIndex((s) => s.email === cleanEmail);
      if (foundIdx >= 0) {
        store.subscribers[foundIdx].lastSentAt = new Date().toISOString();
        isNewSubscriber = false;
      } else {
        store.subscribers.push({
          email: cleanEmail,
          mxHost: checkResult.mxHost || '',
          subscribedAt: new Date().toISOString(),
        });
      }
      saveStore(store);
    }

    return sendSuccess(res, {
      message: isNewSubscriber
        ? `✓ Xác nhận thành công! Đã gửi thư chào mừng tới ${cleanEmail}. Vui lòng kiểm tra hộp thư đến (hoặc hòm thư spam)!`
        : `✓ Email của bạn đã được cập nhật và thư mới nhất đã được gửi tới ${cleanEmail}!`,
      data: {
        email: cleanEmail,
        mxHost: checkResult.mxHost,
        messageId: mailResult.messageId,
        previewUrl: mailResult.previewUrl,
        sent: true,
      },
    });
  } catch (error) {
    console.error('Lỗi khi đăng ký nhận tin:', error);
    return sendError(res, {
      message: error.message || 'Có lỗi xảy ra khi xác thực hoặc gửi thư. Vui lòng thử lại sau!',
      status: 500,
    });
  }
};

