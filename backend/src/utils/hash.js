import crypto from 'crypto';

/**
 * Hash mật khẩu (Tự động dùng bcryptjs nếu có, hoặc dùng native crypto scrypt)
 */
export const hashPassword = async (password) => {
  try {
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.default.genSalt(10);
    return bcrypt.default.hash(password, salt);
  } catch (err) {
    // Fallback: Native Node.js crypto scrypt
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${derivedKey}`;
  }
};

/**
 * So sánh mật khẩu (Tự động nhận diện bcrypt hoặc crypto scrypt)
 */
export const comparePassword = async (candidatePassword, hashedPassword) => {
  if (hashedPassword.startsWith('scrypt:')) {
    const [, salt, originalKey] = hashedPassword.split(':');
    const keyToCompare = crypto.scryptSync(candidatePassword, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(originalKey, 'hex'), Buffer.from(keyToCompare, 'hex'));
  }

  try {
    const bcrypt = await import('bcryptjs');
    return bcrypt.default.compare(candidatePassword, hashedPassword);
  } catch (err) {
    // Nếu bcryptjs chưa cài nhưng password trong DB là bcrypt hash, hãy thông báo
    throw new Error('Hệ thống cần thư viện bcryptjs để giải mã hash này. Vui lòng chạy npm install trong thư mục backend.');
  }
};

