/**
 * =========================================================================
 * 📧 NODEMAILER TRANSPORTER & OTP SERVICE (YOU CAN'T STOP HERE)
 * =========================================================================
 * Cấu hình chuẩn kết nối trực tiếp máy chủ Gmail SMTP (smtp.gmail.com)
 * Hỗ trợ cổng 465 (SSL) và cổng 587 (TLS)
 */

import nodemailer from 'nodemailer';

/**
 * Sinh mã OTP ngẫu nhiên gồm 6 chữ số (100000 - 999999)
 */
export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Lấy tài khoản và mật khẩu ứng dụng Gmail từ môi trường
 */
const getGmailCredentials = () => {
  const user = (process.env.EMAIL_USER || process.env.MAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || process.env.MAIL_APP_PASS || '').replace(/\s+/g, '');
  return { user, pass };
};

/**
 * Khởi tạo Transporter cho Nodemailer với cấu hình tối ưu nhất cho Gmail
 */
export const getMailerTransporter = () => {
  const { user, pass } = getGmailCredentials();

  if (!user || !pass) {
    console.warn('[MAILER] ⚠️ CẢNH BÁO: Chưa tìm thấy EMAIL_USER hoặc EMAIL_PASS trong file .env!');
  }

  // Cấu hình chuẩn kết nối Gmail SMTP trực tiếp qua host: smtp.gmail.com
  // Cổng 465 với secure: true là cổng ổn định nhất, tránh bị nhà mạng chặn cổng 587/25
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Sử dụng SSL trực tiếp
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false, // Tránh lỗi chứng chỉ mạng trên Windows/môi trường phát triển
    },
    // Timeout 15 giây
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
};

/**
 * Kiểm tra kết nối đến máy chủ Gmail SMTP
 */
export const verifyMailerConnection = async () => {
  const { user, pass } = getGmailCredentials();
  console.log(`[MAILER] 🔍 Đang kiểm tra kết nối Gmail SMTP với tài khoản: ${user}...`);

  if (!user || !pass) {
    return { success: false, message: 'Thiếu EMAIL_USER hoặc EMAIL_PASS trong .env' };
  }

  const transporter = getMailerTransporter();
  try {
    await transporter.verify();
    console.log(`[MAILER] ✅ KẾT NỐI GMAIL SMTP THÀNH CÔNG! Máy chủ sẵn sàng gửi thư.`);
    return { success: true };
  } catch (error) {
    console.error(`[MAILER] ❌ KẾT NỐI GMAIL SMTP THẤT BẠI:`, error.message);
    if (error.responseCode === 535 || error.message.includes('Username and Password not accepted') || error.message.includes('BadCredentials')) {
      console.error(`[MAILER] 👉 NGUYÊN NHÂN: Mật khẩu ứng dụng (App Password) hoặc Email không đúng!`);
      console.error(`[MAILER] 👉 HƯỚNG DẪN KHẮC PHỤC:`);
      console.error(`   1. Truy cập: https://myaccount.google.com/apppasswords`);
      console.error(`   2. Tạo một "Mật khẩu ứng dụng" mới (16 ký tự)`);
      console.error(`   3. Điền vào file .env: EMAIL_PASS=<16_ký_tự_vừa_tạo> (không cần khoảng trắng)`);
    }
    return { success: false, error: error.message };
  }
};

/**
 * Tạo giao diện HTML email chứa mã OTP hiện đại, ấm áp cho You Can't Stop Here
 */
const generateOtpEmailTemplate = (toEmail, otpCode, actionName = 'kích hoạt tài khoản mới') => {
  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Mã Xác Thực OTP - You Can't Stop Here</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
        .wrapper { width: 100%; max-width: 580px; margin: 30px auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 24px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0d9488 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
        .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 999px; font-size: 11px; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
        .header h2 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0; opacity: 0.85; font-size: 13px; }
        .content { padding: 32px 28px; line-height: 1.6; }
        .greeting { font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
        .desc { font-size: 14px; color: #475569; margin: 0 0 20px; }
        .otp-card { text-align: center; margin: 26px 0; padding: 24px; background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; }
        .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: 'Courier New', Courier, monospace, sans-serif; display: inline-block; }
        .otp-expiry { margin: 12px 0 0; font-size: 13px; color: #0d9488; font-weight: 600; }
        .warning-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #92400e; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <span class="badge">Xác Thực Bảo Mật</span>
          <h2>YOU CAN'T STOP HERE</h2>
          <p>Mã xác thực gửi tới: <strong>${toEmail}</strong></p>
        </div>
        <div class="content">
          <p class="greeting">Xin chào bạn,</p>
          <p class="desc">
            Chúng tôi nhận được yêu cầu <strong>${actionName}</strong> trên hệ thống <strong>You Can't Stop Here</strong>. 
            Vui lòng sử dụng mã xác thực OTP 6 số bên dưới để tiếp tục:
          </p>
          <div class="otp-card">
            <span class="otp-code">${otpCode}</span>
            <p class="otp-expiry">⏳ Mã xác thực có hiệu lực trong vòng 5 phút</p>
          </div>
          <div class="warning-box">
            🔒 <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai để bảo vệ tài khoản của bạn.
          </div>
          <p class="desc" style="font-size: 12px; color: #94a3b8;">
            Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tài khoản của bạn vẫn được an toàn.
          </p>
        </div>
        <div class="footer">
          © 2026 YOU CAN'T STOP HERE • Không gian an toàn và sẻ chia của người đi làm
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Gửi mã OTP phục vụ Đăng ký tài khoản mới (Register)
 * @param {string} toEmail - Hòm thư người nhận
 * @param {string} otpCode - Mã 6 số OTP
 */
export const sendRegistrationOtp = async (toEmail, otpCode) => {
  const { user: senderEmail } = getGmailCredentials();
  const senderName = "You Can't Stop Here";

  if (!senderEmail) {
    throw new Error('Chưa cấu hình EMAIL_USER trong file .env');
  }

  const transporter = getMailerTransporter();

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: toEmail,
    subject: `[${otpCode}] là mã xác thực đăng ký tài khoản của bạn - You Can't Stop Here`,
    text: `Mã xác thực đăng ký tài khoản của bạn là: ${otpCode}. Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`,
    html: generateOtpEmailTemplate(toEmail, otpCode, 'kích hoạt tài khoản mới'),
  };

  try {
    console.log(`[MAILER] 🚀 Đang gửi mã OTP [${otpCode}] từ <${senderEmail}> đến email: <${toEmail}>...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] ✅ ĐÃ GỬI THÀNH CÔNG VÀO GMAIL CỦA USER: ${toEmail} (MessageId: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      to: toEmail,
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ [MAILER] LỖI GỬI EMAIL NODEMAILER:');
    console.error('- Message:', error.message);
    if (error.response) console.error('- SMTP Response:', error.response);

    let friendlyMessage = error.message;
    if (error.responseCode === 535 || error.message.includes('535') || error.message.includes('Username and Password not accepted') || error.message.includes('BadCredentials')) {
      friendlyMessage = 'Google từ chối Mật khẩu ứng dụng (535 Bad Credentials). Vui lòng tạo lại mật khẩu 16 chữ cái mới cho anthonyq012025@gmail.com tại myaccount.google.com/apppasswords!';
    }
    console.error('========================================\n');
    throw new Error(friendlyMessage);
  }
};

/**
 * Gửi mã OTP chung (Đăng ký, Đăng nhập OTP hoặc Đổi mật khẩu)
 */
export const sendOtpEmail = async (toEmail, otpCode, purpose = 'register') => {
  const isRegister = purpose === 'register';
  const actionText = isRegister ? 'kích hoạt tài khoản mới' : (purpose === 'forgot_password' ? 'đặt lại mật khẩu' : 'đăng nhập');

  const { user: senderEmail } = getGmailCredentials();
  const senderName = "You Can't Stop Here";

  if (!senderEmail) {
    throw new Error('Chưa cấu hình EMAIL_USER trong file .env');
  }

  const transporter = getMailerTransporter();

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: toEmail,
    subject: `[${otpCode}] là mã xác nhận ${actionText} của bạn - You Can't Stop Here`,
    text: `Mã xác thực của bạn là: ${otpCode}. Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`,
    html: generateOtpEmailTemplate(toEmail, otpCode, actionText),
  };

  try {
    console.log(`[MAILER] 🚀 Đang gửi mã OTP [${otpCode}] (Mục đích: ${purpose}) từ <${senderEmail}> đến: <${toEmail}>...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[MAILER] ✅ ĐÃ GỬI THÀNH CÔNG VÀO GMAIL: ${toEmail} (MessageId: ${info.messageId})`);

    return {
      success: true,
      messageId: info.messageId,
      to: toEmail,
    };
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ [MAILER] LỖI GỬI EMAIL NODEMAILER:');
    console.error('- Message:', error.message);
    if (error.response) console.error('- SMTP Response:', error.response);

    let friendlyMessage = error.message;
    if (error.responseCode === 535 || error.message.includes('535') || error.message.includes('Username and Password not accepted') || error.message.includes('BadCredentials')) {
      friendlyMessage = 'Google từ chối Mật khẩu ứng dụng (535 Bad Credentials). Vui lòng tạo lại mật khẩu 16 chữ cái mới cho anthonyq012025@gmail.com tại myaccount.google.com/apppasswords!';
    }
    console.error('========================================\n');
    throw new Error(friendlyMessage);
  }
};

export default {
  generateOtp,
  getMailerTransporter,
  verifyMailerConnection,
  sendRegistrationOtp,
  sendOtpEmail,
};
