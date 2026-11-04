import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'you_cant_stop_here_secret_key_2026_super_secure';

// Base64Url helpers
const base64UrlEncode = (str) =>
  Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString();
};

/**
 * Tạo token JWT (Tự động dùng thư viện jsonwebtoken nếu có, hoặc dùng native crypto nếu chưa cài)
 */
export const signToken = async (payload, expiresInSeconds = 30 * 24 * 60 * 60) => {
  try {
    const jwt = await import('jsonwebtoken');
    return jwt.default.sign(payload, JWT_SECRET, { expiresIn: `${expiresInSeconds}s` });
  } catch (err) {
    // Fallback: Native Node.js crypto HMAC SHA-256 JWT
    const header = { alg: 'HS256', typ: 'JWT' };
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const fullPayload = { ...payload, exp };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
};

/**
 * Xác minh token JWT (Tự động dùng jsonwebtoken hoặc native crypto)
 */
export const verifyToken = async (token) => {
  try {
    const jwt = await import('jsonwebtoken');
    return jwt.default.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      throw err;
    }
    // Fallback: Native Node.js crypto verification
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token không hợp lệ');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) {
      throw new Error('Chữ ký token không hợp lệ');
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      throw new Error('Token đã hết hạn');
    }

    return payload;
  }
};

