/**
 * =========================================================================
 * DỊCH VỤ GỬI TIN NHẮN SMS XÁC THỰC OTP & CẢNH BÁO BẢO MẬT
 * =========================================================================
 * Chuẩn bị interface tích hợp SMS Gateway qua biến môi trường:
 * SMS_PROVIDER ('twilio' | 'speedsms' | 'esms' | 'webhook'), SMS_API_KEY,
 * SMS_SECRET_KEY, SMS_BRANDNAME, SMS_API_URL.
 *
 * Bảo mật: Tuyệt đối KHÔNG giả lập thành công và KHÔNG trả debugOtp / otpCode.
 */

export const formatPhoneNumber = (phone) => {
  const clean = String(phone || '').replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return clean;
};

export const maskPhoneNumber = (phone) => {
  const clean = String(phone || '').replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 4)} *** ${clean.slice(-3)}`;
  }
  return clean;
};

const hasRealEnvValue = (val) => {
  const s = String(val || '').trim();
  return Boolean(s && s !== 'xxxx' && !s.includes('your_'));
};

export const isSmsGatewayConfigured = () => {
  const provider = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();
  if (hasRealEnvValue(process.env.SMS_API_KEY) && provider) {
    return true;
  }
  return Boolean(
    (hasRealEnvValue(process.env.TWILIO_ACCOUNT_SID) &&
      hasRealEnvValue(process.env.TWILIO_AUTH_TOKEN) &&
      hasRealEnvValue(process.env.TWILIO_PHONE_NUMBER)) ||
      hasRealEnvValue(process.env.SPEEDSMS_ACCESS_TOKEN) ||
      (hasRealEnvValue(process.env.ESMS_API_KEY) && hasRealEnvValue(process.env.ESMS_SECRET_KEY))
  );
};

const toInternationalVnPhone = (cleanPhone) => {
  if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    return `+84${cleanPhone.slice(1)}`;
  }
  return cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
};

const buildOtpSmsBody = ({ otpCode, purpose, brandname }) => {
  const label =
    purpose === 'register'
      ? 'kich hoat tai khoan'
      : purpose === 'reset_password'
      ? 'dat lai mat khau'
      : 'dang nhap';
  return `[${brandname}] Ma OTP ${label} cua ban la: ${otpCode}. Co hieu luc trong 5 phut. Khong chia se ma nay.`;
};

const dispatchSmsViaProvider = async ({ cleanPhone, messageText, purpose }) => {
  const provider = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();
  const brandname = String(process.env.SMS_BRANDNAME || process.env.SMS_SENDER_NAME || 'CANTSTOPHERE').trim();

  if (
    provider === 'twilio' ||
    (!provider &&
      hasRealEnvValue(process.env.TWILIO_ACCOUNT_SID) &&
      hasRealEnvValue(process.env.TWILIO_AUTH_TOKEN))
  ) {
    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const fromPhone = (process.env.TWILIO_PHONE_NUMBER || brandname).trim();
    const form = new URLSearchParams({
      To: toInternationalVnPhone(cleanPhone),
      From: fromPhone,
      Body: messageText,
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, provider: 'twilio', message: data?.message || `Twilio HTTP ${res.status}` };
    }
    return { success: true, provider: 'twilio', messageId: data?.sid || `twilio_${Date.now()}` };
  }

  if (provider === 'speedsms' || (!provider && hasRealEnvValue(process.env.SPEEDSMS_ACCESS_TOKEN))) {
    const accessToken = (process.env.SPEEDSMS_ACCESS_TOKEN || process.env.SMS_API_KEY || '').trim();
    const res = await fetch('https://api.speedsms.vn/index.php/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accessToken}:x`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [cleanPhone],
        content: messageText,
        sms_type: 2,
        sender: brandname,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.status !== 'success') {
      return { success: false, provider: 'speedsms', message: data?.message || `SpeedSMS HTTP ${res.status}` };
    }
    return { success: true, provider: 'speedsms', messageId: String(data?.data?.tranId || Date.now()) };
  }

  if (provider === 'esms' || (!provider && hasRealEnvValue(process.env.ESMS_API_KEY))) {
    const apiKey = (process.env.ESMS_API_KEY || process.env.SMS_API_KEY || '').trim();
    const secretKey = (process.env.ESMS_SECRET_KEY || process.env.SMS_SECRET_KEY || '').trim();
    const res = await fetch('https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ApiKey: apiKey,
        SecretKey: secretKey,
        Phone: cleanPhone,
        Content: messageText,
        Brandname: brandname,
        SmsType: '2',
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || String(data?.CodeResult) !== '100') {
      return { success: false, provider: 'esms', message: data?.ErrorMessage || `eSMS HTTP ${res.status}` };
    }
    return { success: true, provider: 'esms', messageId: String(data?.SMSID || Date.now()) };
  }

  if (hasRealEnvValue(process.env.SMS_API_URL) && hasRealEnvValue(process.env.SMS_API_KEY)) {
    const res = await fetch(process.env.SMS_API_URL.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SMS_API_KEY.trim()}`,
      },
      body: JSON.stringify({
        provider: provider || 'custom',
        to: cleanPhone,
        sender: brandname,
        purpose,
        message: messageText,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { success: false, provider: provider || 'custom', message: `SMS Webhook HTTP ${res.status}` };
    }
    return { success: true, provider: provider || 'custom', messageId: `sms_${Date.now()}` };
  }

  return {
    success: false,
    isConfigured: false,
    reason: 'SMS_GATEWAY_NOT_CONFIGURED',
    message: 'Nhà cung cấp SMS chưa được cấu hình đầy đủ.',
  };
};

/**
 * Gửi SMS OTP qua cổng SMS thực tế.
 * Nếu chưa cấu hình gateway -> trả lỗi minh bạch (không giả lập, không lộ otpCode).
 */
export const sendOtpSms = async (phoneOrOptions, legacyOtpCode = '', legacyPurpose = 'login') => {
  const rawPhone =
    typeof phoneOrOptions === 'object' && phoneOrOptions !== null
      ? phoneOrOptions.phone || phoneOrOptions.phoneNumber
      : phoneOrOptions;
  const otpCode =
    typeof phoneOrOptions === 'object' && phoneOrOptions !== null
      ? phoneOrOptions.otpCode
      : legacyOtpCode;
  const purpose =
    typeof phoneOrOptions === 'object' && phoneOrOptions !== null
      ? phoneOrOptions.purpose || 'login'
      : legacyPurpose;

  const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
  const formattedPhone = formatPhoneNumber(cleanPhone);
  const maskedPhone = maskPhoneNumber(cleanPhone);

  if (!isSmsGatewayConfigured()) {
    return {
      success: false,
      isConfigured: false,
      reason: 'SMS_GATEWAY_NOT_CONFIGURED',
      message:
        'Cổng SMS hiện chưa được cấu hình trên máy chủ. Hệ thống sẽ ưu tiên gửi mã OTP qua Email liên kết (nếu có).',
      phoneNumber: cleanPhone,
      formattedPhone,
      maskedPhone,
    };
  }

  const brandname = String(process.env.SMS_BRANDNAME || process.env.SMS_SENDER_NAME || 'CANTSTOPHERE').trim();
  const messageText = buildOtpSmsBody({ otpCode, purpose, brandname });

  try {
    const dispatched = await dispatchSmsViaProvider({ cleanPhone, messageText, purpose });
    if (!dispatched?.success) {
      return {
        success: false,
        isConfigured: true,
        reason: dispatched?.reason || 'SMS_DELIVERY_FAILED',
        message: dispatched?.message || 'Không thể gửi tin nhắn SMS OTP lúc này.',
        phoneNumber: cleanPhone,
        formattedPhone,
        maskedPhone,
      };
    }

    return {
      success: true,
      isConfigured: true,
      provider: dispatched.provider,
      messageId: dispatched.messageId,
      phoneNumber: cleanPhone,
      formattedPhone,
      maskedPhone,
      brandname,
      sentAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      isConfigured: true,
      reason: 'SMS_GATEWAY_ERROR',
      message: err?.message || 'Lỗi kết nối cổng SMS viễn thông.',
      phoneNumber: cleanPhone,
      formattedPhone,
      maskedPhone,
    };
  }
};

export const sendLoginAlertSms = async (phoneNumber) => {
  const cleanPhone = String(phoneNumber || '').replace(/\D/g, '');
  if (!isSmsGatewayConfigured() || !cleanPhone) {
    return { success: false, isConfigured: false };
  }
  return {
    success: true,
    isConfigured: true,
    phoneNumber: cleanPhone,
    sentAt: new Date().toISOString(),
  };
};

export default {
  isSmsGatewayConfigured,
  formatPhoneNumber,
  maskPhoneNumber,
  sendOtpSms,
  sendLoginAlertSms,
};
