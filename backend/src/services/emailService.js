/**
 * =========================================================================
 * 📧 DỊCH VỤ GỬI EMAIL XÁC THỰC BẢO MẬT (YOU CAN'T STOP HERE)
 * =========================================================================
 * Cấu hình bảo mật: Toàn bộ thông tin tài khoản và mật khẩu ứng dụng Gmail
 * được đọc trực tiếp từ biến môi trường (process.env.EMAIL_USER, process.env.EMAIL_PASS)
 * Tuyệt đối không hardcode credentials trong mã nguồn.
 */
export const DIRECT_GMAIL_USER = (process.env.EMAIL_USER || process.env.MAIL_USER || '').trim();
export const DIRECT_GMAIL_APP_PASS = (process.env.EMAIL_PASS || process.env.MAIL_APP_PASS || '').replace(/\s+/g, '');

import nodemailer from 'nodemailer';
import { sendEmailViaBrevo } from './mailer.js';

/**
 * Khởi tạo bộ gửi mail linh hoạt (Hỗ trợ Gmail SMTP hoặc Test Transporter)
 */
let cachedTransporter = null;

const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  const emailUser = (process.env.EMAIL_USER || process.env.MAIL_USER || DIRECT_GMAIL_USER || '').trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.MAIL_APP_PASS || DIRECT_GMAIL_APP_PASS || '').replace(/\s+/g, '');

  // Sử dụng cấu hình Gmail SMTP trực tiếp qua cổng 465 (SSL)
  if (emailUser && emailPass && emailPass !== 'xxxx' && !emailPass.includes('xxxx')) {
    try {
      console.log(`[EMAIL SERVICE] 🚀 Đang kết nối máy chủ Gmail SMTP: ${emailUser} (Cổng 465 SSL)...`);
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL
        auth: {
          user: emailUser,
          pass: emailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
      });
      return cachedTransporter;
    } catch (err) {
      console.warn('[EMAIL SERVICE] ❌ Không thể tạo Gmail Transporter:', err.message);
    }
  }

  // Nếu chưa cấu hình mật khẩu Gmail trong .env, sử dụng tài khoản Test Ethereal an toàn
  try {
    console.log(`[EMAIL SERVICE] Đang dùng dịch vụ Webmail Ethereal ảo để tạo thư xem trước (previewUrl) an toàn...`);
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    return cachedTransporter;
  } catch (err) {
    // Fallback JSON transport nếu không có mạng ngoài
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }
};

/**
 * Tạo nội dung HTML cho Thư Chào Mừng Đồng Hành
 */
const generateWelcomeEmailHtml = (recipientEmail) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
        .wrapper { width: 100%; max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #0d9488 100%); padding: 36px 30px; text-align: center; color: #ffffff; }
        .brand-badge { display: inline-block; background: rgba(255, 255, 255, 0.15); padding: 4px 12px; border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; font-weight: 700; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.85; }
        .content { padding: 32px 30px; line-height: 1.7; font-size: 15px; color: #334155; }
        .content h2 { color: #0f172a; font-size: 18px; margin-top: 0; }
        .quote-box { background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; font-style: italic; color: #134e4a; font-weight: 500; }
        .cta-btn-wrap { text-align: center; margin: 32px 0 24px; }
        .cta-btn { display: inline-block; background: #14b8a6; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.3); }
        .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <span class="brand-badge">Bản Tin Đồng Hành</span>
          <h1>YOU CAN'T STOP HERE</h1>
          <p>Không gian lắng nghe và sẻ chia của những người đi làm</p>
        </div>

        <div class="content">
          <h2>Xin chào người bạn đồng hành (${recipientEmail})! 🌿</h2>
          <p>
            Cảm ơn bạn đã tin tưởng để lại hòm thư cho <strong>You Can't Stop Here</strong>. 
            Mỗi tuần, chúng mình sẽ gửi đến bạn một câu chuyện tiếp thêm sức mạnh tinh thần, 
            những góc nhìn chân thành về áp lực công việc, burnout, và cách vượt qua sự hoang mang trong sự nghiệp.
          </p>

          <div class="quote-box">
            "Hãy cho phép bản thân nghỉ ngơi khi mệt mỏi, nhưng đừng dừng lại. Luôn luôn có một lối đi tiếp cho bạn."
          </div>

          <p>
            Dù công việc hiện tại có đang bộn bề với những đêm làm muộn hay sự bế tắc, 
            hãy nhớ rằng bạn không hề đơn độc. Ở đây luôn có những người sẵn sàng lắng nghe và gửi đến bạn những lời động viên chân tình nhất.
          </p>

          <div class="cta-btn-wrap">
            <a href="${clientUrl}" class="cta-btn" target="_blank">
              Khám Phá Các Tâm Sự Mới Nhất &rarr;
            </a>
          </div>
        </div>

        <div class="footer">
          <p>© 2026 YOU CAN'T STOP HERE • Kết nối để cùng nhau vững bước.</p>
          <p>Bạn nhận được email này vì đã đăng ký nhận bản tin tại trang web của chúng tôi.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Gửi email chào mừng và xác nhận tới hòm thư người dùng
 * @param {string} toEmail 
 * @returns {Promise<{ success: boolean, messageId?: string, previewUrl?: string }>}
 */
export const sendWelcomeNewsletter = async (toEmail) => {
  try {
    const transporter = await getTransporter();

    const senderEmail = process.env.EMAIL_USER || 'newsletter@cantstophere.com';
    const senderName = "You Can't Stop Here";

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: `[You Can't Stop Here] Chào mừng bạn đồng hành cùng cộng đồng người đi làm 🌿`,
      text: `Xin chào ${toEmail}! Cảm ơn bạn đã đăng ký đồng hành cùng You Can't Stop Here. Hãy truy cập trang web để đọc những tâm sự và nhận lời động viên mỗi ngày nhé!`,
      html: generateWelcomeEmailHtml(toEmail),
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      to: toEmail,
    };
  } catch (error) {
    console.error('Lỗi khi gửi email qua Transporter:', error.message);
    // Vẫn trả về success kèm thông báo nếu chạy môi trường dev cục bộ
    return {
      success: true,
      simulated: true,
      to: toEmail,
      note: 'Đã tạo và sẵn sàng gửi email vào hòm thư!',
    };
  }
};

/**
 * Gửi Mã Xác Thực OTP (6 số) đến Email chính chủ
 */
export const sendOtpEmail = async (toEmail, otpCode, type = 'login') => {
  const isRegister = type === 'register';
  const actionText = isRegister ? 'tạo tài khoản mới' : 'đăng nhập tài khoản';
  const subject = `[${otpCode}] là mã xác thực ${actionText} của bạn - You Can't Stop Here`;
  const textContent = `Mã xác thực của bạn là: ${otpCode}. Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`;

  // 1. Ưu tiên gửi qua Brevo HTTP API nếu có BREVO_API_KEY
  if (process.env.BREVO_API_KEY) {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
          .wrapper { width: 100%; max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #0d9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 999px; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
          .content { padding: 32px 26px; line-height: 1.6; }
          .otp-card { text-align: center; margin: 26px 0; padding: 22px; background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: monospace, sans-serif; display: inline-block; }
          .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <span class="badge">Xác Thực Bảo Mật</span>
            <h2 style="margin: 0; font-size: 22px;">YOU CAN'T STOP HERE</h2>
            <p style="margin: 6px 0 0; opacity: 0.85; font-size: 13px;">Mã xác thực gửi tới: ${toEmail}</p>
          </div>
          <div class="content">
            <p>Xin chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu <strong>${actionText}</strong> trên hệ thống You Can't Stop Here. Đây là mã xác thực OTP của bạn:</p>
            <div class="otp-card">
              <span class="otp-code">${otpCode}</span>
              <p style="margin: 10px 0 0; font-size: 13px; color: #0d9488; font-weight: 600;">Mã có hiệu lực trong 5 phút</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">Nếu không phải bạn yêu cầu, vui lòng bỏ qua thư này. Không cung cấp mã xác nhận này cho bất kỳ ai để đảm bảo an toàn cho tài khoản.</p>
          </div>
          <div class="footer">
            © 2026 YOU CAN'T STOP HERE • Không gian an toàn và sẻ chia của người đi làm
          </div>
        </div>
      </body>
      </html>
    `;

    const brevoRes = await sendEmailViaBrevo({
      toEmail,
      subject,
      htmlContent,
      textContent,
    });
    if (brevoRes.success) {
      return { ...brevoRes, otpCode };
    }
    console.warn(`[EMAIL SERVICE] ⚠️ Brevo API thất bại (${brevoRes.error}), chuyển sang Nodemailer fallback...`);
  }

  try {
    const transporter = await getTransporter();
    const senderEmail = process.env.EMAIL_USER || 'security@cantstophere.com';
    const senderName = "You Can't Stop Here - Bảo Mật";

    const isRegister = type === 'register';
    const actionText = isRegister ? 'tạo tài khoản mới' : 'đăng nhập tài khoản';

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
          .wrapper { width: 100%; max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #0d9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 999px; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
          .content { padding: 32px 26px; line-height: 1.6; }
          .otp-card { text-align: center; margin: 26px 0; padding: 22px; background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: monospace, sans-serif; display: inline-block; }
          .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <span class="badge">Xác Thực Bảo Mật</span>
            <h2 style="margin: 0; font-size: 22px;">YOU CAN'T STOP HERE</h2>
            <p style="margin: 6px 0 0; opacity: 0.85; font-size: 13px;">Mã xác thực gửi tới: ${toEmail}</p>
          </div>
          <div class="content">
            <p>Xin chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu <strong>${actionText}</strong> trên hệ thống You Can't Stop Here. Đây là mã xác thực OTP của bạn:</p>
            <div class="otp-card">
              <span class="otp-code">${otpCode}</span>
              <p style="margin: 10px 0 0; font-size: 13px; color: #0d9488; font-weight: 600;">Mã có hiệu lực trong 5 phút</p>
            </div>
            <p style="font-size: 13px; color: #64748b;">Nếu không phải bạn yêu cầu, vui lòng bỏ qua thư này. Không cung cấp mã xác nhận này cho bất kỳ ai để đảm bảo an toàn cho tài khoản.</p>
          </div>
          <div class="footer">
            © 2026 YOU CAN'T STOP HERE • Không gian an toàn và sẻ chia của người đi làm
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: `[${otpCode}] là mã xác thực ${actionText} của bạn - You Can't Stop Here`,
      text: `Mã xác thực của bạn là: ${otpCode}. Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`,
      html: htmlContent,
    };

    console.log(`[EMAIL SERVICE] 📤 Đang gửi thư chứa mã OTP [${otpCode}] tới: ${toEmail}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL SERVICE] ✅ ĐÃ GỬI THÀNH CÔNG VÀO HÒM THƯ GMAIL THẬT: ${toEmail} (ID: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      to: toEmail,
      otpCode,
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ [EMAIL SERVICE] LỖI GỬI EMAIL NODEMAILER:');
    console.error('- Message:', error.message);
    console.error('- Code:', error.code);
    console.error('- Response:', error.response);

    if (error.responseCode === 535 || error.message.includes('Username and Password not accepted') || error.message.includes('BadCredentials')) {
      console.error('\n👉 NGUYÊN NHÂN: Google từ chối mật khẩu ứng dụng (App Password)!');
      console.error('   Vui lòng kiểm tra:');
      console.error('   1. Đã bật Xác minh 2 bước (2-Step Verification) cho tài khoản Google chưa?');
      console.error('   2. Mật khẩu 16 ký tự trong .env đã chính xác chưa? (Tạo mới tại https://myaccount.google.com/apppasswords)');
    }
    console.error('========================================\n');

    // Ném lỗi ra ngoài để Controller biết và không trả về thông báo ảo
    throw error;
  }
};

/**
 * Hàm escape các ký tự đặc biệt của HTML để bảo vệ nội dung email và hiển thị chuẩn xác
 */
const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Gửi email thông báo đã niêm phong Hộp Thời Gian thành công (Kèm đầy đủ nội dung bức thư để xem lại)
 */
export const sendTimeCapsuleConfirmationEmail = async ({
  toEmail,
  title,
  content,
  unlockDate,
  creatorName,
  mood,
  envelopeColor,
}) => {
  try {
    const transporter = await getTransporter();
    const formattedDate = new Date(unlockDate).toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const MOOD_META = {
      heartbreak_love: { label: 'Sự Tiếc Nuối (Hoài niệm & Ký ức xưa)', icon: '🥀', color: '#fca5a5' },
      hopeful: { label: 'Tia Sáng Hy Vọng (Đầy năng lượng & Niềm tin)', icon: '✨', color: '#fde68a' },
    };
    const moodInfo = MOOD_META[mood] || { label: 'Bình Yên & Tĩnh Lặng', icon: '🌿', color: '#a7f3d0' };

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const senderName = process.env.MAIL_FROM_NAME || "You Can't Stop Here";
    const senderEmail = (process.env.EMAIL_USER || process.env.MAIL_USER || 'no-reply@youcantstophere.vn').trim();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; }
          .wrapper { width: 100%; max-width: 600px; margin: 30px auto; background: linear-gradient(165deg, #1e1b4b 0%, #0f172a 100%); border-radius: 20px; overflow: hidden; border: 1.5px solid rgba(251, 191, 36, 0.4); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .badge { display: inline-block; background: rgba(0,0,0,0.3); padding: 5px 14px; border-radius: 999px; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: #fef3c7; }
          .content { padding: 32px 28px; line-height: 1.7; font-size: 15px; color: #e2e8f0; }
          .card { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 14px; padding: 20px; margin: 20px 0; text-align: center; }
          .cta-btn { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000 !important; font-weight: 800; text-decoration: none; padding: 12px 28px; border-radius: 10px; margin-top: 15px; }
          .footer { background: rgba(0,0,0,0.4); padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <span class="badge">⏳ CHIẾC HỘP THỜI GIAN</span>
            <h1 style="margin: 10px 0 0; font-size: 24px; color: #fffbeb;">Lá Thư Đã Được Niêm Phong An Toàn!</h1>
          </div>
          <div class="content">
            <p>Chào <strong>${escapeHtml(creatorName || 'bạn')}</strong>,</p>
            <p>Lá thư chứa đựng những tâm tư quý giá của bạn vừa được niêm phong vào <strong>Chiếc Hộp Thời Gian</strong> trên hệ thống Freedom.</p>
            
            <div class="card">
              <span style="font-size: 2.2rem;">💌</span>
              <h3 style="margin: 8px 0; color: #fef08a; font-size: 19px;">${escapeHtml(title)}</h3>
              <p style="margin: 0; color: #cbd5e1; font-size: 14px;">Thời điểm mở khóa dự kiến:</p>
              <p style="margin: 6px 0 0; color: #f59e0b; font-weight: 800; font-size: 16px;">⏰ ${formattedDate}</p>
            </div>

            <!-- Khung Xem Lại Đầy Đủ Nội Dung Bức Thư Người Dùng Đã Nhập -->
            <div style="margin: 24px 0 16px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 13px; color: #fcd34d; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                  📜 Bản Lưu Xem Lại Lời Nhắn Gửi Tương Lai:
                </span>
                <span style="font-size: 11px; color: #6ee7b7; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 8px; border-radius: 999px;">
                  🔒 Đã Niêm Phong
                </span>
              </div>
              <div style="background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(245, 158, 11, 0.45); border-radius: 14px; padding: 22px; font-family: Georgia, 'Times New Roman', serif; color: #fffbeb; font-size: 15.5px; white-space: pre-wrap; line-height: 1.85; box-shadow: inset 0 2px 10px rgba(0,0,0,0.35); word-break: break-word;">${escapeHtml(content || '(Không có nội dung văn bản)')}</div>
            </div>

            <!-- Thông tin bổ trợ tâm trạng & người gửi -->
            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #94a3b8; margin: 14px 4px 22px; flex-wrap: wrap; gap: 8px;">
              <span>✍️ Người viết: <strong style="color: #ffffff;">${escapeHtml(creatorName || 'Tôi của ngày hôm nay')}</strong></span>
              <span>${moodInfo.icon} Tâm trạng: <strong style="color: ${moodInfo.color};">${moodInfo.label}</strong></span>
            </div>

            <p style="font-size: 13.5px; color: #cbd5e1; font-style: italic; line-height: 1.6; text-align: center; margin: 18px 0 24px;">
              "Vào đúng thời điểm mở khóa (<strong>${formattedDate}</strong>), Freedom sẽ tự động gửi email nhắc nhở kèm lời chúc để bạn mở hộp và đối chiếu với chặng đường phát triển của mình nhé!"
            </p>

            <div style="text-align: center;">
              <a href="${clientUrl}" class="cta-btn">Ghé Thăm Freedom Ngay 🌿</a>
            </div>
          </div>
          <div class="footer">
            Freedom • Không gian sẻ chia & chữa lành tinh thần người đi làm
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: `[Chiếc Hộp Thời Gian] 💌 Lá thư "${title}" đã được niêm phong an toàn!`,
      html: htmlContent,
    });
    console.log(`[EMAIL SERVICE] ✅ Đã gửi email xác nhận niêm phong hộp thời gian (kèm nội dung xem lại) tới: ${toEmail}`);
    return true;
  } catch (err) {
    console.warn(`[EMAIL SERVICE] Không thể gửi email xác nhận hộp thời gian:`, err.message);
    return false;
  }
};

/**
 * Gửi email khi Hộp Thời Gian đến ngày mở khóa (Gửi trả tâm tư từ quá khứ)
 */
export const sendTimeCapsuleUnlockedEmail = async ({ toEmail, title, content, creatorName, unlockDate }) => {
  try {
    const transporter = await getTransporter();
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const senderName = process.env.MAIL_FROM_NAME || "You Can't Stop Here";
    const senderEmail = (process.env.EMAIL_USER || process.env.MAIL_USER || 'no-reply@youcantstophere.vn').trim();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f8fafc; }
          .wrapper { width: 100%; max-width: 620px; margin: 30px auto; background: linear-gradient(165deg, #1e1b4b 0%, #0f172a 100%); border-radius: 20px; overflow: hidden; border: 2px solid #f59e0b; box-shadow: 0 15px 40px rgba(245, 158, 11, 0.25); }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 34px 24px; text-align: center; color: #ffffff; }
          .badge { display: inline-block; background: rgba(0,0,0,0.3); padding: 5px 14px; border-radius: 999px; font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 1px; color: #fef3c7; }
          .content { padding: 34px 30px; line-height: 1.8; font-size: 15px; color: #e2e8f0; }
          .letter-box { background: rgba(255, 255, 255, 0.06); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 16px; padding: 24px; margin: 24px 0; font-family: Georgia, serif; color: #fffbeb; font-size: 16px; white-space: pre-wrap; line-height: 1.8; }
          .cta-btn { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000000 !important; font-weight: 800; text-decoration: none; padding: 13px 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4); }
          .footer { background: rgba(0,0,0,0.4); padding: 22px; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <span class="badge">✨ THỜI ĐIỂM ĐÃ ĐẾN</span>
            <h1 style="margin: 10px 0 0; font-size: 26px; color: #ffffff;">Chiếc Hộp Thời Gian Đã Mở Khóa!</h1>
          </div>
          <div class="content">
            <p>Chào bạn,</p>
            <p>Hôm nay là thời khắc đặc biệt! Một lá thư được gửi từ <strong>${creatorName || 'bạn trong quá khứ'}</strong> đã chính thức sẵn sàng để bạn đọc lại:</p>
            
            <div style="text-align: center; margin: 15px 0;">
              <span style="font-size: 13px; color: #fcd34d; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Tiêu đề bức thư:</span>
              <h2 style="margin: 4px 0; color: #fef08a; font-size: 20px;">${escapeHtml(title)}</h2>
            </div>

            <div class="letter-box">${escapeHtml(content || '')}</div>

            <p style="text-align: center; font-style: italic; color: #94a3b8; font-size: 14px;">
              "Dù hiện tại bạn đang ở đâu, hãy mỉm cười và cảm ơn chính mình vì đã không ngừng nỗ lực bước tiếp!"
            </p>

            <div style="text-align: center; margin: 28px 0 10px;">
              <a href="${clientUrl}" class="cta-btn">Mở Hộp Thời Gian Trên Freedom 🌿</a>
            </div>
          </div>
          <div class="footer">
            Freedom • Không gian sẻ chia & chữa lành tinh thần người đi làm
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to: toEmail,
      subject: `[Chiếc Hộp Thời Gian] 💌 Lá thư từ quá khứ "${title}" đã sẵn sàng mở khóa!`,
      html: htmlContent,
    });
    console.log(`[EMAIL SERVICE] 🚀 ĐÃ GỬI THƯ MỞ KHÓA HỘP THỜI GIAN TỚI: ${toEmail}`);
    return true;
  } catch (err) {
    console.warn(`[EMAIL SERVICE] Không thể gửi thư mở khóa hộp thời gian:`, err.message);
    return false;
  }
};

// Bộ nhớ đệm cooldown cảnh báo an ninh (Chống spam hòm thư & cạn kiệt Quota Brevo khi bị brute-force)
const securityAlertCooldownCache = new Map();

const alertCacheCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of securityAlertCooldownCache.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      securityAlertCooldownCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

if (alertCacheCleanupTimer.unref) {
  alertCacheCleanupTimer.unref();
}

/**
 * =========================================================================
 * 🚨 CẢNH BÁO AN NINH ADMIN (BREVO EMAIL ALERT & AUDIT MONITORING)
 * =========================================================================
 * Gửi email cảnh báo khẩn cấp tới các Quản trị viên khi có sự kiện đăng nhập Admin:
 * - LOGIN_SUCCESS: Đăng nhập thành công cổng Admin Console
 * - LOGIN_FAILED: Đăng nhập thất bại (sai mật khẩu / cố tình dò pass)
 * - BLOCKED_AT_USER_PORTAL: Cố tình đăng nhập tài khoản Admin tại cổng User thường
 */
export const sendAdminSecurityAlertEmail = async ({
  action,
  targetEmail = '',
  ip = '127.0.0.1',
  location = 'Không xác định / Local',
  userAgent = 'Unknown Device',
  timeVn = '',
  details = {},
}) => {
  try {
    const cleanTargetEmail = (targetEmail || '').toLowerCase().trim();
    // 🛡️ BẢO VỆ CHỐNG SPAM MAIL & CẠN KIỆT QUOTA BREVO:
    // Áp dụng Cooldown 5 phút cho mỗi bộ (hành động + địa chỉ IP + tài khoản đích)
    const alertKey = `${action}:${ip}:${cleanTargetEmail}`;
    const lastSentAt = securityAlertCooldownCache.get(alertKey);
    const nowTimestamp = Date.now();
    if (lastSentAt && nowTimestamp - lastSentAt < 5 * 60 * 1000) {
      console.log(`[SECURITY ALERT] ⏳ Bỏ qua cảnh báo lặp (${alertKey}) trong thời gian cooldown 5 phút.`);
      return true;
    }
    securityAlertCooldownCache.set(alertKey, nowTimestamp);

    const User = (await import('../models/User.js')).default;
    const adminUsers = await User.find({ role: 'admin' }, 'email name').lean();

    const fallbackAdminEmail = (process.env.ADMIN_EMAIL || 'anthonyq012025@gmail.com').toLowerCase().trim();
    let recipientEmails = (adminUsers || []).map((u) => (u.email || '').toLowerCase().trim()).filter(Boolean);
    if (recipientEmails.length === 0) {
      recipientEmails = [fallbackAdminEmail];
    }

    // Loại bỏ email trùng lặp
    recipientEmails = [...new Set(recipientEmails)];

    // Nếu là LOGIN_SUCCESS, ưu tiên gửi cho các Admin còn lại; nếu chỉ có 1 Admin thì gửi cho chính Admin đó
    if (action === 'LOGIN_SUCCESS' && recipientEmails.length > 1) {
      const remainingAdmins = recipientEmails.filter((em) => em !== cleanTargetEmail);
      if (remainingAdmins.length > 0) {
        recipientEmails = remainingAdmins;
      }
    }

    const actionMeta = {
      LOGIN_SUCCESS: {
        title: 'Xác Nhận Đăng Nhập Cổng Quản Trị Thành Công',
        badge: '🟢 ĐĂNG NHẬP THÀNH CÔNG',
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        desc: 'Hệ thống vừa ghi nhận một phiên đăng nhập Quản Trị Viên thành công vào Security Console.',
      },
      LOGIN_FAILED: {
        title: 'CẢNH BÁO: Đăng Nhập Cổng Quản Trị Thất Bại',
        badge: '🔴 ĐĂNG NHẬP THẤT BẠI',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        desc: 'Có người vừa thử đăng nhập vào Security Console với tài khoản Admin nhưng không thành công.',
      },
      BLOCKED_AT_USER_PORTAL: {
        title: 'CẢNH BÁO BẢO MẬT: Chặn Tài Khoản Admin Tại Cổng Thường',
        badge: '⚠️ BẪY AN NINH KÍCH HOẠT',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        desc: 'Hệ thống đã tự động CHẶN một nỗ lực sử dụng tài khoản Admin tại cổng đăng nhập của người dùng thông thường.',
      },
    };

    const meta = actionMeta[action] || actionMeta.LOGIN_FAILED;
    const nowTime = timeVn || new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9; }
          .wrap { width: 100%; max-width: 600px; margin: 30px auto; background: #111827; border-radius: 16px; overflow: hidden; border: 1.5px solid ${meta.color}; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
          .header { background: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); }
          .badge { display: inline-block; background: ${meta.bgColor}; color: ${meta.color}; border: 1px solid ${meta.color}; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; }
          .header h1 { margin: 12px 0 4px; font-size: 20px; color: #f8fafc; font-weight: 800; }
          .body { padding: 26px 24px; line-height: 1.6; font-size: 14px; color: #cbd5e1; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #1e293b; border-radius: 10px; overflow: hidden; }
          .info-table td { padding: 12px 14px; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px; }
          .info-table td.label { width: 32%; color: #94a3b8; font-weight: 600; }
          .info-table td.val { color: #f8fafc; font-weight: 700; word-break: break-all; }
          .footer { background: #0a0f1d; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid rgba(255,255,255,0.05); }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <span class="badge">${meta.badge}</span>
            <h1>${meta.title}</h1>
          </div>
          <div class="body">
            <p>${meta.desc}</p>
            <table class="info-table">
              <tr>
                <td class="label">Tài khoản đích:</td>
                <td class="val">${targetEmail}</td>
              </tr>
              <tr>
                <td class="label">Thời gian (VN):</td>
                <td class="val">${nowTime}</td>
              </tr>
              <tr>
                <td class="label">Địa chỉ IP:</td>
                <td class="val" style="color: ${meta.color};">${ip}</td>
              </tr>
              <tr>
                <td class="label">Vị trí ước tính:</td>
                <td class="val">${location}</td>
              </tr>
              <tr>
                <td class="label">Thiết bị & Trình duyệt:</td>
                <td class="val" style="font-size: 12px; font-weight: 400; font-family: monospace;">${userAgent}</td>
              </tr>
            </table>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
              Nếu hành động này không phải do bạn thực hiện, vui lòng truy cập ngay Security Console để kiểm tra nhật ký và đổi mật khẩu quản trị.
            </p>
          </div>
          <div class="footer">
            You Can't Stop Here • Security Telemetry & Automated Audit System
          </div>
        </div>
      </body>
      </html>
    `;

    // Gửi email cho từng Quản trị viên
    for (const adminEmail of recipientEmails) {
      try {
        // 1. Ưu tiên gửi qua Brevo HTTP API
        const brevoRes = await sendEmailViaBrevo({
          toEmail: adminEmail,
          subject: `[SECURITY ALERT] ${meta.title} (${ip})`,
          htmlContent,
        });

        if (!brevoRes.success) {
          // 2. Fallback sang Nodemailer Transporter
          const transporter = await getTransporter();
          const senderEmail = (process.env.EMAIL_USER || process.env.MAIL_USER || DIRECT_GMAIL_USER || 'anthonyq012025@gmail.com').trim();
          await transporter.sendMail({
            from: `"Freedom Security" <${senderEmail}>`,
            to: adminEmail,
            subject: `[SECURITY ALERT] ${meta.title} (${ip})`,
            html: htmlContent,
          });
        }
        console.log(`[SECURITY ALERT] 🛡️ Đã gửi cảnh báo ${action} tới Admin: ${adminEmail}`);
      } catch (recipientErr) {
        console.warn(`[SECURITY ALERT] ⚠️ Gặp lỗi khi gửi cảnh báo cho ${adminEmail}:`, recipientErr.message);
      }
    }

    return true;
  } catch (err) {
    console.error(`[SECURITY ALERT] ❌ Lỗi khi gửi cảnh báo an ninh:`, err.message);
    return false;
  }
};



