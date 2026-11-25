import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '../../data');
const revokedTokensFilePath = path.join(dataDir, 'revoked_tokens.json');

const JWT_SECRET = process.env.JWT_SECRET || 'you_cant_stop_here_secret_key_2026_super_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh_v1`;
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || `${JWT_SECRET}_admin_gate_v1`;

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
 * Đọc danh sách token đã thu hồi từ đĩa cứng (Khôi phục phiên khi restart máy chủ)
 */
const loadRevokedTokensFromDisk = () => {
  try {
    if (fs.existsSync(revokedTokensFilePath)) {
      const raw = fs.readFileSync(revokedTokensFilePath, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        const now = Date.now();
        const map = new Map();
        for (const item of data) {
          if (item?.token && item.expiresAt && item.expiresAt > now) {
            map.set(String(item.token), Number(item.expiresAt));
          }
        }
        return map;
      }
    }
  } catch (err) {
    // Fail-safe: Sử dụng bộ nhớ RAM nếu gặp sự cố đọc file
  }
  return new Map();
};

/**
 * Ghi danh sách token đã thu hồi xuống đĩa cứng (Lưu trữ bền vững)
 */
const saveRevokedTokensToDisk = (store) => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const arr = [];
    const now = Date.now();
    for (const [token, expiresAt] of store.entries()) {
      if (expiresAt > now) {
        arr.push({ token, expiresAt });
      }
    }
    fs.writeFileSync(revokedTokensFilePath, JSON.stringify(arr, null, 2), 'utf8');
  } catch (_) {}
};

/**
 * Kho lưu trữ Token bị thu hồi (Revoked Token Store / Blacklist)
 * Lưu: token -> expiresAt (timestamp miliseconds)
 */
const revokedTokenStore = loadRevokedTokensFromDisk();

// Tự động dọn dẹp các token đã quá hạn trong danh sách thu hồi mỗi 15 phút
const cleanupRevokedTokensInterval = setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [t, exp] of revokedTokenStore.entries()) {
    if (now > exp) {
      revokedTokenStore.delete(t);
      changed = true;
    }
  }
  if (changed) {
    saveRevokedTokensToDisk(revokedTokenStore);
  }
}, 15 * 60 * 1000);

if (cleanupRevokedTokensInterval.unref) {
  cleanupRevokedTokensInterval.unref();
}

/**
 * Thu hồi một Refresh Token (Revoke Session - Đồng bộ tức thời xuống đĩa)
 */
export const revokeToken = (token, maxAgeSeconds = 7 * 24 * 60 * 60) => {
  if (!token) return;
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  revokedTokenStore.set(String(token), expiresAt);
  saveRevokedTokensToDisk(revokedTokenStore);
};

/**
 * Kiểm tra xem token đã bị thu hồi hay chưa
 */
export const isTokenRevoked = (token) => {
  if (!token) return true;
  return revokedTokenStore.has(String(token));
};

/**
 * Ký JWT tổng quát với secret tùy chọn
 */
const signJwtGeneric = async (payload, secret, expiresInSeconds) => {
  try {
    const jwtModule = await import('jsonwebtoken');
    const jwt = jwtModule.default || jwtModule;
    if (typeof jwt.sign === 'function') {
      return jwt.sign(payload, secret, { expiresIn: `${expiresInSeconds}s` });
    }
  } catch (err) {}

  // Fallback: Native Node.js crypto HMAC SHA-256 JWT
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload = { ...payload, exp };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Tạo Access Token ngắn hạn (Mặc định 15 phút = 900 giây)
 */
export const signAccessToken = async (payload, expiresInSeconds = 15 * 60) => {
  const cleanPayload = { ...payload, tokenType: 'access' };
  return signJwtGeneric(cleanPayload, JWT_SECRET, expiresInSeconds);
};

/**
 * Tạo Refresh Token dài hạn (Mặc định 7 ngày = 604800 giây)
 */
export const signRefreshToken = async (payload, expiresInSeconds = 7 * 24 * 60 * 60) => {
  const refreshPayload = {
    id: payload.id || payload._id,
    tokenVersion: payload.tokenVersion !== undefined ? payload.tokenVersion : 0,
    tokenType: 'refresh',
  };
  return signJwtGeneric(refreshPayload, JWT_REFRESH_SECRET, expiresInSeconds);
};

/**
 * Tạo token JWT tương thích ngược (Mặc định tạo Access Token 15 phút)
 */
export const signToken = async (payload, expiresInSeconds = 15 * 60) => {
  return signAccessToken(payload, expiresInSeconds);
};

/**
 * Xác minh Access Token JWT
 */
export const verifyToken = async (token) => {
  if (!token) throw new Error('Token không tồn tại');
  if (isTokenRevoked(token)) {
    throw new Error('Token đã bị thu hồi');
  }

  // 1. Thử qua thư viện jsonwebtoken nếu có
  try {
    const jwtModule = await import('jsonwebtoken');
    const jwt = jwtModule.default || jwtModule;
    if (typeof jwt.verify === 'function') {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.tokenType === 'refresh') {
        throw new Error('Loại token không hợp lệ cho truy cập API');
      }
      return decoded;
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw err;
    }
    if (err.message === 'Loại token không hợp lệ cho truy cập API') {
      throw err;
    }
  }

  // 2. Fallback: Native Node.js crypto verification (cho JWT tự ký hoặc token chuyển tiếp)
  const parts = String(token).split('.');
  if (parts.length === 3) {
    try {
      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      if (signature === expectedSignature) {
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          throw new Error('Token đã hết hạn');
        }
        if (payload.tokenType === 'refresh') {
          throw new Error('Loại token không hợp lệ cho truy cập API');
        }
        return payload;
      }
    } catch (cryptoErr) {
      if (cryptoErr.message === 'Token đã hết hạn' || cryptoErr.message === 'Loại token không hợp lệ cho truy cập API') {
        throw cryptoErr;
      }
    }
  }

  // 3. Fallback: Tra cứu trong persistent store nếu token được lưu vào hồ sơ người dùng
  try {
    const { loadStore } = await import('./persistentStore.js');
    const store = loadStore();
    const matchedUser = (store.users || []).find((u) => u.token === token);
    if (matchedUser) {
      return {
        id: (matchedUser._id || matchedUser.id).toString(),
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role || 'user',
        jobTitle: matchedUser.jobTitle || 'Thành viên cộng đồng',
        tokenVersion: matchedUser.tokenVersion !== undefined ? matchedUser.tokenVersion : 0,
      };
    }
  } catch (_) {}

  throw new Error('Token không hợp lệ hoặc đã hết hạn');
};

/**
 * Xác minh Refresh Token JWT
 */
export const verifyRefreshToken = async (token) => {
  if (!token) throw new Error('Refresh token không tồn tại');
  if (isTokenRevoked(token)) {
    throw new Error('Refresh token đã bị thu hồi hoặc đã được làm mới');
  }

  // 1. jsonwebtoken
  try {
    const jwtModule = await import('jsonwebtoken');
    const jwt = jwtModule.default || jwtModule;
    if (typeof jwt.verify === 'function') {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Token không phải là refresh token hợp lệ');
      }
      return decoded;
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Refresh token đã hết hạn, vui lòng đăng nhập lại');
    }
    if (err.message?.includes('refresh token')) {
      throw err;
    }
  }

  // 2. Native crypto fallback
  const parts = String(token).split('.');
  if (parts.length === 3) {
    try {
      const [encodedHeader, encodedPayload, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', JWT_REFRESH_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      if (signature === expectedSignature) {
        const payload = JSON.parse(base64UrlDecode(encodedPayload));
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          throw new Error('Refresh token đã hết hạn, vui lòng đăng nhập lại');
        }
        if (payload.tokenType !== 'refresh') {
          throw new Error('Token không phải là refresh token hợp lệ');
        }
        return payload;
      }
    } catch (cryptoErr) {
      throw cryptoErr;
    }
  }

  throw new Error('Refresh token không hợp lệ hoặc đã hết hạn');
};

/**
 * Tạo Admin Gate Token ngắn hạn sau khi xác thực Mã PIN Quản Trị (Mặc định 2 giờ = 7200 giây)
 */
export const signAdminToken = async (payload, expiresInSeconds = 2 * 60 * 60) => {
  const adminPayload = {
    id: String(payload?.id || payload?._id || ''),
    role: payload?.role || 'admin',
    email: payload?.email || '',
    isAdminUnlocked: true,
    tokenType: 'admin_gate',
  };
  return signJwtGeneric(adminPayload, JWT_ADMIN_SECRET, expiresInSeconds);
};

/**
 * Xác minh Admin Gate Token (x-admin-token header)
 */
export const verifyAdminToken = async (token) => {
  if (!token) throw new Error('Thiếu mã xác thực Admin PIN token');
  if (isTokenRevoked(token)) {
    throw new Error('Admin token đã bị thu hồi');
  }

  try {
    const jwtModule = await import('jsonwebtoken');
    const jwt = jwtModule.default || jwtModule;
    if (typeof jwt.verify === 'function') {
      const decoded = jwt.verify(token, JWT_ADMIN_SECRET);
      if (decoded.tokenType !== 'admin_gate' || decoded.isAdminUnlocked !== true) {
        throw new Error('Admin token không hợp lệ');
      }
      return decoded;
    }
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.message === 'Admin token không hợp lệ') {
      throw err;
    }
  }

  const parts = String(token).split('.');
  if (parts.length === 3) {
    const [encodedHeader, encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_ADMIN_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature === expectedSignature) {
      const payload = JSON.parse(base64UrlDecode(encodedPayload));
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        throw new Error('Admin PIN token đã hết hạn');
      }
      if (payload.tokenType !== 'admin_gate' || payload.isAdminUnlocked !== true) {
        throw new Error('Admin token không hợp lệ');
      }
      return payload;
    }
  }

  throw new Error('Admin PIN token không hợp lệ hoặc đã hết hạn');
};
