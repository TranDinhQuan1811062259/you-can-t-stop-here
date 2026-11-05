import dns from 'dns';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Danh sách các tên miền phổ biến được xác thực nhanh
const KNOWN_VALID_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.com.vn',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'cantstophere.com',
]);

/**
 * Kiểm tra xem địa chỉ email có đúng cú pháp và tên miền có thực sự tồn tại nhận thư (MX record) hay không
 * @param {string} email 
 * @returns {Promise<{ isValid: boolean, domain: string, mxHost?: string, reason?: string }>}
 */
export const verifyEmailExistence = async (email) => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      reason: 'Vui lòng nhập địa chỉ email hợp lệ',
    };
  }

  const cleanEmail = email.toLowerCase().trim();

  // 1. Kiểm tra cú pháp theo chuẩn RFC
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return {
      isValid: false,
      reason: 'Định dạng email không đúng (ví dụ chuẩn: yourname@gmail.com)',
    };
  }

  const parts = cleanEmail.split('@');
  if (parts.length !== 2) {
    return {
      isValid: false,
      reason: 'Email phải chứa đúng một ký tự @',
    };
  }

  const [username, domain] = parts;

  if (username.length === 0 || username.length > 64) {
    return {
      isValid: false,
      reason: 'Tên tài khoản email (phía trước @) không hợp lệ',
    };
  }

  if (domain.length < 4 || !domain.includes('.')) {
    return {
      isValid: false,
      reason: 'Tên miền email không hợp lệ (cần có phần mở rộng như .com, .vn...)',
    };
  }

  // 2. Phát hiện lỗi chính tả tên miền thường gặp
  const commonTypos = {
    'gmial.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'outlok.com': 'outlook.com',
    'hotmial.com': 'hotmail.com',
  };

  if (commonTypos[domain]) {
    return {
      isValid: false,
      reason: `Có vẻ bạn gõ nhầm tên miền "${domain}". Có phải bạn muốn nhập "${commonTypos[domain]}" không?`,
    };
  }

  // 3. Nếu là tên miền uy tín quen thuộc đã biết
  if (KNOWN_VALID_DOMAINS.has(domain)) {
    return {
      isValid: true,
      domain,
      mxHost: `mx.${domain}`,
    };
  }

  // 4. Kiểm tra bản ghi MX (Mail Exchange) thực tế qua DNS với cơ chế Timeout 2.5s
  const withTimeout = (promise, ms = 2500) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DNS_TIMEOUT')), ms)
      ),
    ]);
  };

  try {
    const mxRecords = await withTimeout(dns.promises.resolveMx(domain), 2500);
    if (Array.isArray(mxRecords) && mxRecords.length > 0) {
      mxRecords.sort((a, b) => a.priority - b.priority);
      return {
        isValid: true,
        domain,
        mxHost: mxRecords[0].exchange,
      };
    }
  } catch (dnsErr) {
    if (dnsErr.message === 'DNS_TIMEOUT') {
      // Khi DNS timeout, nếu domain có đuôi hợp lệ thì chấp nhận
      return {
        isValid: true,
        domain,
        mxHost: `mail.${domain}`,
      };
    }

    try {
      const aRecords = await withTimeout(dns.promises.resolve4(domain), 2000);
      if (Array.isArray(aRecords) && aRecords.length > 0) {
        return {
          isValid: true,
          domain,
          mxHost: aRecords[0],
        };
      }
    } catch (aErr) {
      return {
        isValid: false,
        domain,
        reason: `Tên miền "@${domain}" không tồn tại hoặc không thể nhận thư.`,
      };
    }
  }

  return {
    isValid: false,
    domain,
    reason: `Tên miền "@${domain}" không có máy chủ nhận thư (MX Record).`,
  };
};
