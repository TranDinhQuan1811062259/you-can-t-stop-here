/**
 * Dịch vụ gửi tin nhắn SMS Xác thực OTP & Cảnh báo bảo mật đăng nhập
 * Hỗ trợ Brandname viễn thông (Viettel, Vinaphone, Mobifone) & Giả lập môi trường phát triển
 */

export const sendOtpSms = async (phoneNumber, otpCode, deviceName = 'Windows PC (Chrome)', userName = '') => {
  const cleanPhone = String(phoneNumber).replace(/\s+/g, '');
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const messageContent = `[YOU CAN'T STOP HERE] SDT cua ban (${cleanPhone}) vua duoc yeu cau dang nhap boi ${deviceName} luc ${timeStr} ngay ${dateStr}. Ma xac thuc SMS OTP cua ban la: ${otpCode}. Vui long khong chia se ma nay cho bat ky ai.`;

  console.log(`\n======================================================`);
  console.log(`📱 [SMS BRANDNAME GATEWAY] YOU CAN'T STOP HERE`);
  console.log(`To: ${cleanPhone}`);
  console.log(`Time: ${timeStr} - ${dateStr}`);
  console.log(`Content:\n"${messageContent}"`);
  console.log(`OTP Code: ${otpCode}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    messageId: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    phoneNumber: cleanPhone,
    content: messageContent,
    otpCode,
    sentAt: now.toISOString(),
  };
};

export const sendLoginAlertSms = async (phoneNumber, userName = 'Thành viên', deviceName = 'Windows PC (Chrome)') => {
  const cleanPhone = String(phoneNumber).replace(/\s+/g, '');
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const messageContent = `[YOU CAN'T STOP HERE] Thong bao: SDT cua ban (${cleanPhone}) da duoc dang nhap boi ${userName} tren thiet bi ${deviceName} luc ${timeStr} ngay ${dateStr}. Neu khong phai ban thuc hien, vui long doi mat khau ngay lap tuc.`;

  console.log(`\n======================================================`);
  console.log(`📱 [SMS SECURITY ALERT] YOU CAN'T STOP HERE`);
  console.log(`To: ${cleanPhone}`);
  console.log(`Time: ${timeStr} - ${dateStr}`);
  console.log(`Content:\n"${messageContent}"`);
  console.log(`======================================================\n`);

  return {
    success: true,
    messageId: `sms_alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    phoneNumber: cleanPhone,
    content: messageContent,
    sentAt: now.toISOString(),
  };
};

