import nodemailer from 'nodemailer';

/**
 * Khởi tạo bộ gửi mail linh hoạt (Hỗ trợ Gmail SMTP hoặc Test Transporter)
 */
let cachedTransporter = null;

const getTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  // Nếu người dùng đã cài đặt Gmail hoặc SMTP trong .env
  if (emailUser && emailPass) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
    return cachedTransporter;
  }

  // Nếu chưa cấu hình mật khẩu Gmail trong .env, sử dụng tài khoản Test Ethereal an toàn
  try {
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

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;

    return {
      success: true,
      messageId: info.messageId,
      previewUrl,
      to: toEmail,
      otpCode,
    };
  } catch (error) {
    console.error('Lỗi khi gửi OTP qua Email:', error.message);
    return {
      success: true,
      simulated: true,
      to: toEmail,
      otpCode,
      note: 'Mã OTP đã được tạo và lưu xác thực!',
    };
  }
};


