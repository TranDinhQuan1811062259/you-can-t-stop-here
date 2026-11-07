/**
 * =========================================================================
 * 📱 DỊCH VỤ GỬI TIN NHẮN SMS XÁC THỰC OTP & CẢNH BÁO BẢO MẬT
 * =========================================================================
 * Hỗ trợ SMS Brandname viễn thông (Viettel, VinaPhone, MobiFone)
 * & Trình giả lập hiển thị tin nhắn điện thoại thông minh (Smart Phone Simulator)
 */

/**
 * Định dạng số điện thoại hiển thị đẹp (VD: 0901234567 -> 0901 234 567)
 */
export const formatPhoneNumber = (phone) => {
  const clean = String(phone || '').replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return clean;
};

/**
 * Che một phần số điện thoại bảo mật (VD: 0901234567 -> 0901 *** 567)
 */
export const maskPhoneNumber = (phone) => {
  const clean = String(phone || '').replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 4)} *** ${clean.slice(-3)}`;
  }
  return clean;
};

/**
 * Gửi tin nhắn SMS chứa mã OTP 6 số tới Số điện thoại
 * @param {string} phoneNumber - Số điện thoại người nhận
 * @param {string} otpCode - Mã 6 số xác thực
 * @param {string} deviceName - Tên thiết bị yêu cầu
 */
export const sendOtpSms = async (phoneNumber, otpCode, deviceName = 'Windows PC (Chrome)', userName = '') => {
  const cleanPhone = String(phoneNumber).replace(/\D/g, '');
  const formattedPhone = formatPhoneNumber(cleanPhone);
  const maskedPhone = maskPhoneNumber(cleanPhone);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const brandname = "CANTSTOPHERE";
  const messageContent = `[${brandname}] SDT cua ban (${maskedPhone}) vua duoc yeu cau xac thuc tren ${deviceName} luc ${timeStr} ngay ${dateStr}. Ma xac thuc SMS OTP cua ban la: ${otpCode}. Ma co hieu luc trong 5 phut. Vui long khong chia se ma nay.`;

  console.log(`\n======================================================`);
  console.log(`📱 [SMS BRANDNAME GATEWAY] YOU CAN'T STOP HERE`);
  console.log(`Đến số:      ${formattedPhone} (${cleanPhone})`);
  console.log(`Thời gian:   ${timeStr} - ${dateStr}`);
  console.log(`Brandname:   ${brandname}`);
  console.log(`Nội dung SMS:\n"${messageContent}"`);
  console.log(`MÃ SMS OTP:  [ ${otpCode} ]`);
  console.log(`======================================================\n`);

  return {
    success: true,
    messageId: `sms_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    phoneNumber: cleanPhone,
    formattedPhone,
    maskedPhone,
    brandname,
    content: messageContent,
    otpCode,
    sentAt: now.toISOString(),
  };
};

/**
 * Gửi tin nhắn SMS cảnh báo đăng nhập thành công
 */
export const sendLoginAlertSms = async (phoneNumber, userName = 'Thành viên', deviceName = 'Windows PC (Chrome)') => {
  const cleanPhone = String(phoneNumber).replace(/\D/g, '');
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const messageContent = `[YOU CAN'T STOP HERE] Thong bao: SDT cua ban (${cleanPhone}) da duoc dang nhap boi ${userName} tren thiet bi ${deviceName} luc ${timeStr} ngay ${dateStr}. Neu khong phai ban, vui long bao mat tai khoan ngay.`;

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

export default {
  formatPhoneNumber,
  maskPhoneNumber,
  sendOtpSms,
  sendLoginAlertSms,
};
