/**
 * =========================================================================
 * 📧 NODEMAILER TRANSPORTER & OTP SERVICE (YOU CAN'T STOP HERE)
 * =========================================================================
 * Cấu hình chuẩn kết nối trực tiếp máy chủ Gmail SMTP (smtp.gmail.com)
 * Hỗ trợ cổng 465 (SSL) và cổng 587 (TLS)
 */

import nodemailer from 'nodemailer';

/**
 * Gửi email qua Brevo Transactional Email HTTP API (vượt chặn cổng SMTP trên Render/Vercel)
 * https://api.brevo.com/v3/smtp/email
 */
export const sendEmailViaBrevo = async ({ toEmail, subject, htmlContent, textContent }) => {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) {
    return { success: false, skipped: true, message: 'Chưa cấu hình BREVO_API_KEY' };
  }

  const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'anthonyq012025@gmail.com').trim();
  const senderName = "You Can't Stop Here";

  const payload = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: toEmail }],
    subject: subject,
    htmlContent: htmlContent,
  };
  if (textContent) {
    payload.textContent = textContent;
  }

  console.log(`[BREVO API] 🚀 Đang gửi email OTP tới <${toEmail}> qua Brevo HTTP API (Sender: <${senderEmail}>)...`);

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000), // Timeout 8 giây chống treo server
    });

    const responseText = await response.text();
    let responseData = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (_) {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      console.error(`[BREVO API] ❌ Brevo HTTP API trả về mã lỗi ${response.status}:`, JSON.stringify(responseData));
      return {
        success: false,
        status: response.status,
        error: `Brevo HTTP ${response.status}: ${responseData.message || responseText || 'Lỗi gửi email Brevo'}`,
        data: responseData,
      };
    }

    console.log(`[BREVO API] ✅ ĐÃ GỬI THÀNH CÔNG QUA BREVO HTTP API tới: ${toEmail} (MessageId: ${responseData.messageId || 'OK'})`);
    return {
      success: true,
      messageId: responseData.messageId || `brevo_${Date.now()}`,
      to: toEmail,
      provider: 'brevo_http',
    };
  } catch (err) {
    console.error(`[BREVO API] ❌ Lỗi kết nối Brevo HTTP API:`, err.message);
    return {
      success: false,
      error: err.message,
    };
  }
};

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
export const getMailerTransporter = (preferPort = 465) => {
  const { user, pass } = getGmailCredentials();

  if (!user || !pass || pass.includes('xxxx')) {
    console.warn('[MAILER] ⚠️ CẢNH BÁO: Chưa tìm thấy EMAIL_USER hoặc EMAIL_PASS hợp lệ trong biến môi trường!');
  }

  const isTls = preferPort === 587;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: preferPort,
    secure: !isTls, // true cho 465 (SSL), false cho 587 (TLS/STARTTLS)
    auth: {
      user: user,
      pass: pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    // Giới hạn timeout 5 giây chống treo serverless trên Vercel
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000,
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
 * Tối ưu tương thích Gmail desktop/mobile: table wrapper, fallback màu nền đặc, không overflow:hidden hay height cố định
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
        .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: 'Courier New', Courier, monospace, sans-serif; display: inline-block; user-select: all; -webkit-user-select: all; white-space: nowrap; }
      </style>
    </head>
    <body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; border-collapse: separate;">
        <tr>
          <td bgcolor="#0f172a" style="background-color: #0f172a; background-image: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0d9488 100%); padding: 36px 24px 32px; text-align: center; color: #ffffff; border-radius: 14px 14px 0 0; height: auto;">
            <div style="margin: 0 0 12px 0; line-height: 1.5;">
              <span style="display: inline-block; background-color: #1e293b; background: rgba(255,255,255,0.2); color: #ffffff; padding: 6px 16px; border-radius: 999px; font-size: 11px; line-height: 1.4; text-transform: uppercase; font-weight: 700; letter-spacing: 0.6px;">Xác Thực Bảo Mật</span>
            </div>
            <h2 style="margin: 0; padding: 0; font-size: 22px; line-height: 1.45; font-weight: 800; letter-spacing: 0.5px; color: #ffffff;">YOU CAN'T STOP HERE</h2>
            <p style="margin: 10px 0 0; font-size: 13px; line-height: 1.5; color: #e2e8f0;">Mã xác thực gửi tới: <strong style="color: #ffffff;">${toEmail}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 28px; line-height: 1.6;">
            <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 12px;">Xin chào bạn,</p>
            <p style="font-size: 14px; color: #475569; margin: 0 0 20px; line-height: 1.6;">
              Chúng tôi nhận được yêu cầu <strong>${actionName}</strong> trên hệ thống <strong>You Can't Stop Here</strong>.
              Vui lòng sử dụng mã xác thực OTP 6 số bên dưới để tiếp tục:
            </p>
            <div style="text-align: center; margin: 26px 0; padding: 24px; background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px;">
              <span class="otp-code" style="font-size: 38px; line-height: 1.25; font-weight: 800; letter-spacing: 8px; color: #0f766e; font-family: 'Courier New', Courier, monospace, sans-serif; display: inline-block; user-select: all; -webkit-user-select: all; white-space: nowrap;">${otpCode}</span>
              <p style="margin: 12px 0 0; font-size: 13px; line-height: 1.45; color: #0d9488; font-weight: 600;">⏳ Mã xác thực có hiệu lực trong vòng 5 phút</p>
            </div>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.55; color: #92400e; margin: 20px 0;">
              🔒 <strong>Lưu ý bảo mật:</strong> Tuyệt đối không chia sẻ mã xác thực này cho bất kỳ ai để bảo vệ tài khoản của bạn.
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin: 0; line-height: 1.55;">
              Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tài khoản của bạn vẫn được an toàn.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; line-height: 1.5; color: #64748b; border-top: 1px solid #f1f5f9; border-radius: 0 0 14px 14px;">
            © 2026 YOU CAN'T STOP HERE • Không gian an toàn và sẻ chia của người đi làm
          </td>
        </tr>
      </table>
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
  const subject = `[${otpCode}] là mã xác thực đăng ký tài khoản của bạn - You Can't Stop Here`;
  const textContent = `Mã xác thực đăng ký tài khoản của bạn là: ${otpCode}. Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`;
  const htmlContent = generateOtpEmailTemplate(toEmail, otpCode, 'kích hoạt tài khoản mới');

  // 1. ƯU TIÊN GỬI QUA BREVO HTTP API NẾU CÓ BREVO_API_KEY (VƯỢT CHẶN CỔNG SMTP TRÊN RENDER/VERCEL)
  if (process.env.BREVO_API_KEY) {
    const brevoRes = await sendEmailViaBrevo({
      toEmail,
      subject,
      htmlContent,
      textContent,
    });
    if (brevoRes.success) {
      return brevoRes;
    }
    console.warn(`[MAILER] ⚠️ Gửi qua Brevo API không thành công: ${brevoRes.error}. Tiến hành thử phương án dự phòng Gmail SMTP...`);
  }

  // 2. FALLBACK SANG NODEMAILER GMAIL SMTP KHI KHÔNG CÓ BREVO_API_KEY HOẶC BREVO GẶP SỰ CỐ
  const { user: senderEmail, pass: senderPass } = getGmailCredentials();
  const senderName = "You Can't Stop Here";

  if (!senderEmail || !senderPass || senderPass.includes('xxxx')) {
    throw new Error('Dịch vụ gửi email chưa được cấu hình BREVO_API_KEY hoặc EMAIL_USER / EMAIL_PASS.');
  }

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: toEmail,
    subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    console.log(`[MAILER] 🚀 Đang gửi mã OTP [${otpCode}] từ <${senderEmail}> đến: <${toEmail}> (cổng 465)...`);
    const transporter465 = getMailerTransporter(465);
    const info = await transporter465.sendMail(mailOptions);
    console.log(`[MAILER] ✅ ĐÃ GỬI THÀNH CÔNG VÀO GMAIL CỦA USER: ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId, to: toEmail, provider: 'gmail_smtp' };
  } catch (error) {
    // Nếu cổng 465 bị firewall serverless/cloud chặn, fallback sang cổng 587 (TLS)
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn(`[MAILER] Cổng 465 bị timeout, thử lại qua cổng 587 (TLS)...`);
      try {
        const transporter587 = getMailerTransporter(587);
        const info587 = await transporter587.sendMail(mailOptions);
        console.log(`[MAILER] ✅ ĐÃ GỬI THÀNH CÔNG QUA CỔNG 587: ${toEmail} (MessageId: ${info587.messageId})`);
        return { success: true, messageId: info587.messageId, to: toEmail, provider: 'gmail_smtp_587' };
      } catch (err587) {
        console.error('[MAILER] Thử cổng 587 cũng thất bại:', err587.message);
      }
    }

    let friendlyMessage = error.message;
    if (error.responseCode === 535 || error.message.includes('535') || error.message.includes('Username and Password not accepted') || error.message.includes('BadCredentials')) {
      friendlyMessage = 'Google từ chối Mật khẩu ứng dụng (535 Bad Credentials). Vui lòng cấu hình BREVO_API_KEY trên Render hoặc cập nhật App Password!';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      friendlyMessage = 'Máy chủ gửi thư SMTP phản hồi quá chậm do tường lửa chặn cổng SMTP. Vui lòng cấu hình biến môi trường BREVO_API_KEY!';
    }
    throw new Error(friendlyMessage);
  }
};

/**
 * Gửi mã OTP chung (Đăng ký, Đăng nhập OTP hoặc Đổi mật khẩu)
 */
export const sendOtpEmail = async (toEmail, otpCode, purpose = 'register') => {
  const isRegister = purpose === 'register';
  const isAdminGate = purpose === 'admin_gate';
  const actionText = isAdminGate
    ? 'mở khóa khu vực Quản Trị (Lớp 2)'
    : isRegister
    ? 'kích hoạt tài khoản mới'
    : purpose === 'forgot_password' || purpose === 'reset_password'
    ? 'đặt lại mật khẩu'
    : 'đăng nhập';
  const subject = isAdminGate
    ? `Mã Xác Thực Mở Khóa Quản Trị (Lớp 2): [${otpCode}] - You Can't Stop Here`
    : `[${otpCode}] là mã xác nhận ${actionText} của bạn - You Can't Stop Here`;
  const textContent = `Mã xác thực của bạn là: ${otpCode}. Mã có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.`;
  const htmlContent = generateOtpEmailTemplate(toEmail, otpCode, actionText);

  // 1. ƯU TIÊN GỬI QUA BREVO HTTP API NẾU CÓ BREVO_API_KEY (VƯỢT CHẶN CỔNG SMTP TRÊN RENDER/VERCEL)
  if (process.env.BREVO_API_KEY) {
    const brevoRes = await sendEmailViaBrevo({
      toEmail,
      subject,
      htmlContent,
      textContent,
    });
    if (brevoRes.success) {
      return brevoRes;
    }
    console.warn(`[MAILER] ⚠️ Gửi qua Brevo API không thành công: ${brevoRes.error}. Tiến hành thử phương án dự phòng Gmail SMTP...`);
  }

  // 2. FALLBACK SANG NODEMAILER GMAIL SMTP
  const { user: senderEmail, pass: senderPass } = getGmailCredentials();
  const senderName = "You Can't Stop Here";

  if (!senderEmail || !senderPass || senderPass.includes('xxxx')) {
    throw new Error('Dịch vụ gửi email chưa được cấu hình BREVO_API_KEY hoặc EMAIL_USER / EMAIL_PASS.');
  }

  const mailOptions = {
    from: `"${senderName}" <${senderEmail}>`,
    to: toEmail,
    subject,
    text: textContent,
    html: htmlContent,
  };

  try {
    console.log(`[MAILER] 🚀 Đang gửi mã OTP [${otpCode}] từ <${senderEmail}> đến: <${toEmail}> (cổng 465)...`);
    const transporter465 = getMailerTransporter(465);
    const info = await transporter465.sendMail(mailOptions);
    console.log(`[MAILER] ✅ ĐÃ GỬI THÀNH CÔNG VÀO GMAIL: ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId, to: toEmail, provider: 'gmail_smtp' };
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.warn(`[MAILER] Cổng 465 bị timeout, thử lại qua cổng 587 (TLS)...`);
      try {
        const transporter587 = getMailerTransporter(587);
        const info587 = await transporter587.sendMail(mailOptions);
        console.log(`[MAILER] ✅ ĐÃ GỬI THÀNH CÔNG QUA CỔNG 587: ${toEmail} (MessageId: ${info587.messageId})`);
        return { success: true, messageId: info587.messageId, to: toEmail, provider: 'gmail_smtp_587' };
      } catch (err587) {
        console.error('[MAILER] Thử cổng 587 cũng thất bại:', err587.message);
      }
    }

    let friendlyMessage = error.message;
    if (error.responseCode === 535 || error.message.includes('535') || error.message.includes('Username and Password not accepted') || error.message.includes('BadCredentials')) {
      friendlyMessage = 'Google từ chối Mật khẩu ứng dụng (535 Bad Credentials). Vui lòng cấu hình BREVO_API_KEY trên Render hoặc cập nhật App Password!';
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      friendlyMessage = 'Máy chủ gửi thư SMTP phản hồi quá chậm do tường lửa chặn cổng SMTP. Vui lòng cấu hình biến môi trường BREVO_API_KEY!';
    }
    throw new Error(friendlyMessage);
  }
};

export default {
  generateOtp,
  sendEmailViaBrevo,
  getMailerTransporter,
  verifyMailerConnection,
  sendRegistrationOtp,
  sendOtpEmail,
};
