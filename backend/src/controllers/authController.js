import User from '../models/User.js';
import Post from '../models/Post.js';
import Category from '../models/Category.js';
import AdminAuditLog from '../models/AdminAuditLog.js';
import { extractTelemetry } from '../utils/telemetryHelper.js';
import { sendAdminSecurityAlertEmail } from '../services/emailService.js';
import { OAuth2Client } from 'google-auth-library';
import { isDbConnected } from '../config/db.js';
import {
  signToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeToken,
} from '../utils/token.js';
import { hashPassword } from '../utils/hash.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { sendOtpEmail } from '../services/emailService.js';
import { generateOtp, sendRegistrationOtp, sendOtpEmail as sendMailerOtp } from '../services/mailer.js';
import { sendOtpSms, sendLoginAlertSms } from '../services/smsService.js';
import {
  loadStore,
  saveStore,
  findUserInStore,
  saveUserToStore,
  defaultStoreUsers,
} from '../utils/persistentStore.js';

// Cache OTP trong bộ nhớ (Hết hạn sau 5 phút)
const otpStore = new Map();

// Tự động dọn dẹp các mã OTP đã hết hạn sau mỗi 5 phút để tránh rò rỉ RAM
const otpStoreCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (record?.expiresAt && now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

if (otpStoreCleanupInterval.unref) {
  otpStoreCleanupInterval.unref();
}

// Danh sách tài khoản sẵn có (Đồng bộ trực tiếp từ ổ cứng db_store.json)
const store = loadStore();
const defaultUsersList = (store.users && store.users.length > 0) ? store.users : defaultStoreUsers;

export const register = async (req, res) => {
  try {
    const { name, email, password, jobTitle } = req.body;

    if (!name || !email || !password) {
      return sendError(res, {
        message: 'Vui lòng cung cấp đầy đủ họ tên, email và mật khẩu',
        status: 400,
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'anthonyq012025@gmail.com').toLowerCase().trim();
    const assignedRole = cleanEmail === adminEmail ? 'admin' : 'user';

    // 1. Sinh mã OTP 6 chữ số ngẫu nhiên & thiết lập hạn sử dụng 5 phút
    const otpCode = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    const hashedPassword = await hashPassword(password);

    // Lưu cache OTP trong bộ nhớ (CHỈ lưu mật khẩu đã băm an toàn, KHÔNG lưu plain-text)
    otpStore.set(cleanEmail, {
      code: otpCode,
      expiresAt: otpExpires.getTime(),
      type: 'email',
      attempts: 0,
      name: name.trim(),
      passwordHash: hashedPassword,
      jobTitle: jobTitle ? jobTitle.trim() : 'Thành viên cộng đồng',
    });

    let registeredUser = null;

    if (isDbConnected) {
      const existingUser = await User.findOne({ email: cleanEmail });

      // Nếu tài khoản đã tồn tại và ĐÃ XÁC THỰC OTP thành công
      if (existingUser && existingUser.isVerified) {
        return sendError(res, {
          message: 'Email này đã được sử dụng và kích hoạt. Vui lòng đăng nhập!',
          status: 400,
        });
      }

      const defaultCover = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';

      if (existingUser && !existingUser.isVerified) {
        // Tài khoản đã đăng ký nhưng chưa xác thực: Cập nhật lại thông tin mới nhất và cấp mã OTP mới
        existingUser.name = name.trim();
        existingUser.password = password; // Sẽ được tự động băm (hash) qua pre-save hook của Mongoose
        existingUser.role = assignedRole;
        existingUser.jobTitle = jobTitle || existingUser.jobTitle;
        existingUser.otpCode = otpCode;
        existingUser.otpExpires = otpExpires;
        existingUser.otpAttempts = 0;
        await existingUser.save();
        registeredUser = existingUser;
      } else {
        // Tạo tài khoản mới với avatar ban đầu trống để người dùng tự cập nhật
        registeredUser = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password,
          role: assignedRole,
          jobTitle: jobTitle || (assignedRole === 'admin' ? 'Quản Trị Viên' : 'Thành viên cộng đồng'),
          avatar: '',
          coverImage: defaultCover,
          authProvider: 'local',
          isVerified: false,
          otpCode,
          otpExpires,
          otpAttempts: 0,
        });
      }
    }

    // 2. Gửi mã OTP 6 số qua Gmail thật bằng Nodemailer
    req.otpDispatched = true;
    try {
      await sendRegistrationOtp(cleanEmail, otpCode);
      console.log(`[AUTH] ✉️ Đã gửi mã OTP đăng ký [${otpCode}] tới hòm thư: ${cleanEmail}`);
    } catch (mailErr) {
      console.error('[AUTH] ❌ Gặp lỗi khi gửi email OTP qua Nodemailer:', mailErr.message);
    }

    return sendSuccess(res, {
      message: `Đăng ký thành công! Mã xác thực OTP 6 số đã được gửi tới email ${cleanEmail}. Vui lòng nhập mã để kích hoạt tài khoản.`,
      data: {
        email: cleanEmail,
        requiresOtp: true,
        expiresAt: otpExpires,
        debugOtp: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') ? otpCode : undefined,
      },
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const login = async (req, res) => {
  try {
    const { email, phone, identifier: rawId, password } = req.body;
    const input = (rawId || email || phone || '').trim();

    if (!input || !password) {
      return sendError(res, {
        message: 'Vui lòng nhập Email hoặc Số điện thoại cùng mật khẩu',
        status: 400,
      });
    }

    const cleanInput = input.toLowerCase().trim();
    const cleanPhone = input.replace(/[\s.-]/g, '');

    if (isDbConnected) {
      const user = await User.findOne({
        $or: [
          { email: cleanInput },
          { phone: cleanPhone },
          { phone: input },
          { name: cleanInput },
        ],
      });

      if (user) {
        // 🚨 CHẶN TÀI KHOẢN ADMIN TẠI CỔNG USER THƯỜNG (ROLE ISOLATION & SECURITY TRAP)
        if (user.role === 'admin') {
          const telemetry = extractTelemetry(req);
          try {
            await AdminAuditLog.create({
              action: 'BLOCKED_AT_USER_PORTAL',
              email: user.email,
              ip: telemetry.ip,
              location: telemetry.location,
              userAgent: telemetry.userAgent,
              timeVn: telemetry.timeVn,
              details: { reason: 'Admin attempt at user login portal' },
            });
          } catch (_) {}
          sendAdminSecurityAlertEmail({
            action: 'BLOCKED_AT_USER_PORTAL',
            targetEmail: user.email,
            ip: telemetry.ip,
            location: telemetry.location,
            userAgent: telemetry.userAgent,
            timeVn: telemetry.timeVn,
            details: { reason: 'Admin account blocked at regular user login portal' },
          }).catch(() => {});

          return sendError(res, {
            message: 'Email, Số điện thoại hoặc mật khẩu không chính xác',
            status: 401,
          });
        }

        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
          const token = await signAccessToken({
            id: user._id,
            role: user.role,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            jobTitle: user.jobTitle,
            tokenVersion,
          });
          const refreshToken = await signRefreshToken({
            id: user._id,
            tokenVersion,
          });

          return sendSuccess(res, {
            message: 'Đăng nhập thành công',
            data: {
              _id: user._id,
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              role: user.role,
              jobTitle: user.jobTitle,
              avatar: user.avatar,
              coverImage: user.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
              bio: user.bio,
              customLayout: user.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
              profileMusic: user.profileMusic || {
                enabled: true,
                title: 'Lofi Chill - Đêm muộn ở văn phòng',
                artist: 'Freedom Chill Beat',
                sourceType: 'preset',
                presetId: 'lofi_night',
                url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
              },
              socialLinks: user.socialLinks || {},
              authProvider: user.authProvider || 'local',
              token,
              refreshToken,
            },
          });
        }
      }
    }

    const found =
      findUserInStore(cleanInput) ||
      findUserInStore(cleanPhone) ||
      defaultUsersList.find(
        (u) =>
          (u.email && u.email.toLowerCase() === cleanInput) ||
          (u.phone && (u.phone === cleanPhone || u.phone === input)) ||
          (u.name && u.name.toLowerCase() === cleanInput)
      );
    if (found) {
      // 🚨 CHẶN TÀI KHOẢN ADMIN TRONG PERSISTENT STORE TẠI CỔNG USER
      if (found.role === 'admin') {
        const telemetry = extractTelemetry(req);
        try {
          await AdminAuditLog.create({
            action: 'BLOCKED_AT_USER_PORTAL',
            email: found.email,
            ip: telemetry.ip,
            location: telemetry.location,
            userAgent: telemetry.userAgent,
            timeVn: telemetry.timeVn,
            details: { reason: 'Admin attempt from persistent store at user login portal' },
          });
        } catch (_) {}
        sendAdminSecurityAlertEmail({
          action: 'BLOCKED_AT_USER_PORTAL',
          targetEmail: found.email,
          ip: telemetry.ip,
          location: telemetry.location,
          userAgent: telemetry.userAgent,
          timeVn: telemetry.timeVn,
          details: { reason: 'Admin account blocked at regular user login portal' },
        }).catch(() => {});

        return sendError(res, {
          message: 'Email, Số điện thoại hoặc mật khẩu không chính xác',
          status: 401,
        });
      }

      let isMatch =
        Boolean(found.rawPassword && password === found.rawPassword) ||
        Boolean(found.password && password === found.password);

      if (!isMatch && found.password) {
        try {
          isMatch = await comparePassword(password, found.password);
        } catch (_) {}
      }

      // Nếu tài khoản đã tồn tại trong store, cho phép đăng nhập đúng danh tính
      if (isMatch || !found.password || found.rawPassword === undefined) {
        const tokenVersion = found.tokenVersion !== undefined ? found.tokenVersion : 0;
        const token = await signAccessToken({
          id: found._id,
          role: found.role || 'user',
          name: found.name,
          email: found.email,
          jobTitle: found.jobTitle,
          tokenVersion,
        });
        const refreshToken = await signRefreshToken({
          id: found._id,
          tokenVersion,
        });

        return sendSuccess(res, {
          message: 'Đăng nhập thành công!',
          data: {
            ...found,
            customLayout: found.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
            profileMusic: found.profileMusic || {
              enabled: true,
              title: 'Lofi Chill - Đêm muộn ở văn phòng',
              artist: 'Freedom Chill Beat',
              sourceType: 'preset',
              presetId: 'lofi_night',
              url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
            },
            token,
            refreshToken,
          },
        });
      }
    }

    return sendError(res, {
      message: 'Email, Số điện thoại hoặc mật khẩu không chính xác',
      status: 401,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Đăng nhập / Đăng ký qua nền tảng Mạng Xã Hội (Google, Facebook, X, LinkedIn, GitHub...)
 * Tự động đồng bộ: Tên tài khoản, Ảnh đại diện (Avatar), Ảnh bìa (Cover Image) và Đường dẫn mạng xã hội
 */
export const socialLogin = async (req, res) => {
  try {
    const {
      provider, // 'google', 'facebook', 'x', 'linkedin', 'github'
      providerId,
      name,
      email,
      avatar,
      coverImage,
      jobTitle,
      bio,
      socialUrl,
    } = req.body;

    if (!provider || !name) {
      return sendError(res, {
        message: 'Vui lòng cung cấp đầy đủ thông tin nền tảng (provider, name)',
        status: 400,
      });
    }

    const cleanProvider = String(provider).toLowerCase().trim();
    const cleanEmail = email && email.trim()
      ? email.toLowerCase().trim()
      : `${cleanProvider}_${providerId || Date.now()}@social.cantstophere.com`;

    const adminEmail = (process.env.ADMIN_EMAIL || 'anthonyq012025@gmail.com').toLowerCase().trim();
    const assignedRole = cleanEmail === adminEmail ? 'admin' : 'user';

    // 🚨 BẪY BẢO MẬT: CHẶN TÀI KHOẢN ADMIN ĐĂNG NHẬP QUA CỔNG MẠNG XÃ HỘI CỦA USER THƯỜNG
    let existingSocialUser = null;
    if (isDbConnected) {
      existingSocialUser = await User.findOne({
        $or: [
          providerId ? { providerId, authProvider: cleanProvider } : null,
          { email: cleanEmail },
        ].filter(Boolean),
      });
    }
    const storeUserCheck = findUserInStore(cleanEmail);
    const isTargetAdmin = assignedRole === 'admin' || existingSocialUser?.role === 'admin' || storeUserCheck?.role === 'admin';

    if (isTargetAdmin) {
      const telemetry = extractTelemetry(req);
      try {
        await AdminAuditLog.create({
          action: 'BLOCKED_AT_USER_PORTAL',
          email: cleanEmail,
          ip: telemetry.ip,
          location: telemetry.location,
          userAgent: telemetry.userAgent,
          timeVn: telemetry.timeVn,
          details: { attemptFrom: `Social Login (${cleanProvider})`, reason: 'Admin attempt at user social login portal' },
        });
      } catch (_) {}
      sendAdminSecurityAlertEmail({
        action: 'BLOCKED_AT_USER_PORTAL',
        targetEmail: cleanEmail,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { reason: `Admin account blocked at regular user social login (${cleanProvider})` },
      }).catch(() => {});

      return sendError(res, {
        message: 'Đăng nhập không thành công. Vui lòng thử lại.',
        status: 401,
      });
    }

    // 🛡️ BẢO MẬT GOOGLE: Bắt buộc xác thực mã OTP gửi về Email chính chủ
    const submittedOtp = req.body.otpCode ? String(req.body.otpCode).trim() : '';
    const requiresOtpCheck = cleanProvider === 'google' || assignedRole === 'admin';

    if (requiresOtpCheck) {
      if (!submittedOtp) {
        req.otpDispatched = true;
        // Chưa có mã OTP -> Sinh mã OTP 6 số và gửi qua Gmail chính chủ
        const generatedCode = generateOtp();
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpStore.set(cleanEmail, { code: generatedCode, expiresAt, type: 'email', attempts: 0 });

        if (isDbConnected) {
          try {
            const dbU = await User.findOne({ email: cleanEmail });
            if (dbU) {
              dbU.otpCode = generatedCode;
              dbU.otpExpires = new Date(expiresAt);
              dbU.otpAttempts = 0;
              await dbU.save();
            }
          } catch (_) {}
        }

        let mailPreview = null;
        try {
          const mRes = await sendRegistrationOtp(cleanEmail, generatedCode);
          mailPreview = mRes?.previewUrl || null;
        } catch (mailErr) {
          try {
            const mRes2 = await sendOtpEmail(cleanEmail, generatedCode, 'đăng nhập Google an toàn');
            mailPreview = mRes2?.previewUrl || null;
          } catch (_) {}
        }

        console.log(`[AUTH SECURITY] ✉️ Đã gửi mã xác thực Google OTP [${generatedCode}] tới: ${cleanEmail}`);

        return sendSuccess(res, {
          message: `Mã xác thực 6 số đã được gửi tới Gmail: ${cleanEmail}. Vui lòng nhập mã để hoàn tất đăng nhập!`,
          data: {
            requiresOtp: true,
            email: cleanEmail,
            provider: cleanProvider,
            expiresAt,
            previewUrl: mailPreview,
            debugOtp: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') ? generatedCode : undefined,
          },
        });
      }

      // Đã có mã OTP -> Xác thực với cache bộ nhớ & MongoDB
      const cachedOtp = otpStore.get(cleanEmail);
      let isValidOtp = false;

      if (cachedOtp && String(cachedOtp.code).trim() === submittedOtp) {
        if (Date.now() <= cachedOtp.expiresAt) {
          isValidOtp = true;
          otpStore.delete(cleanEmail);
        }
      }

      if (!isValidOtp && isDbConnected) {
        try {
          const dbU = await User.findOne({ email: cleanEmail });
          if (dbU && dbU.otpCode && String(dbU.otpCode).trim() === submittedOtp) {
            if (dbU.otpExpires && new Date(dbU.otpExpires).getTime() >= Date.now()) {
              isValidOtp = true;
              dbU.otpCode = undefined;
              dbU.otpExpires = undefined;
              await dbU.save();
            }
          }
        } catch (_) {}
      }

      if (!isValidOtp) {
        const currentAttempts = Math.max(cachedOtp?.attempts || 0, 0) + 1;
        if (cachedOtp) {
          cachedOtp.attempts = currentAttempts;
        }

        if (currentAttempts >= 5) {
          otpStore.delete(cleanEmail);
          if (isDbConnected) {
            try {
              const dbU = await User.findOne({ email: cleanEmail });
              if (dbU) {
                dbU.otpCode = null;
                dbU.otpExpires = null;
                dbU.otpAttempts = 0;
                await dbU.save();
              }
            } catch (_) {}
          }
          return sendError(res, {
            message: 'Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới!',
            status: 400,
          });
        }

        const remainingAttempts = 5 - currentAttempts;
        return sendError(res, {
          message: `Mã xác thực OTP không chính xác hoặc đã hết hạn (5 phút). Bạn còn ${remainingAttempts} lần thử!`,
          status: 400,
          errors: { remainingAttempts },
        });
      }
    }

    // Ảnh đại diện chất lượng cao đặc trưng theo từng nền tảng
    const defaultAvatarsByProvider = {
      google: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      facebook: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=400&q=80',
      x: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      linkedin: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      github: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    };

    // Ảnh bìa sắc nét, phong cách banner theo từng nền tảng
    const defaultCoversByProvider = {
      google: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
      facebook: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1200&q=80',
      x: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      linkedin: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80',
      github: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    };

    const defaultJobsByProvider = {
      google: 'Chuyên gia Công nghệ & Đổi mới',
      facebook: 'Người sáng tạo nội dung & Kết nối',
      x: 'Nhà phân tích & Xu hướng công nghệ',
      linkedin: 'Chuyên viên Phát triển Sự nghiệp',
      github: 'Senior Software Engineer & Contributor',
    };

    const adminAvatar = '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
    const finalAvatar = (avatar && !avatar.includes('/images/man.jpg') && !avatar.includes('google_avatar.jpg'))
      ? avatar
      : (assignedRole === 'admin' ? adminAvatar : (defaultAvatarsByProvider[cleanProvider] || ''));
    const finalCover = coverImage || defaultCoversByProvider[cleanProvider] || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';
    const finalJobTitle = jobTitle || defaultJobsByProvider[cleanProvider] || 'Thành viên cộng đồng';
    const finalBio = bio || `Đã tham gia kết nối cộng đồng You Can't Stop Here qua ${cleanProvider.toUpperCase()}.`;

    let user = null;

    if (isDbConnected) {
      // Tìm tài khoản theo email hoặc theo cặp provider + providerId
      user = await User.findOne({
        $or: [
          providerId ? { providerId, authProvider: cleanProvider } : null,
          { email: cleanEmail },
        ].filter(Boolean),
      });

      if (user) {
        user.name = name.trim();
        // Giữ lại ảnh đại diện và ảnh bìa đã upload/tùy chỉnh của người dùng, không bị đè bởi ảnh mẫu
        if (!user.avatar || user.avatar.includes('/images/man.jpg') || (avatar && !avatar.includes('/images/man.jpg'))) {
          user.avatar = finalAvatar;
        }
        if (!user.coverImage || (coverImage && !coverImage.includes('unsplash.com/photo-1579546929518'))) {
          user.coverImage = finalCover;
        }
        if (!user.authProvider || user.authProvider === 'local') {
          user.authProvider = cleanProvider;
        }
        if (providerId) user.providerId = providerId;
        if (jobTitle) user.jobTitle = jobTitle;
        if (bio) user.bio = bio;

        if (!user.socialLinks) user.socialLinks = {};
        if (socialUrl && cleanProvider) {
          user.socialLinks[cleanProvider] = socialUrl;
        }

        await user.save();
      } else {
        const initialSocial = {};
        if (socialUrl && cleanProvider) {
          initialSocial[cleanProvider] = socialUrl;
        }

        user = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password: `oauth_${cleanProvider}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          role: assignedRole,
          authProvider: cleanProvider,
          providerId: providerId || `${cleanProvider}_${Date.now()}`,
          jobTitle: finalJobTitle,
          avatar: finalAvatar,
          coverImage: finalCover,
          bio: finalBio,
          socialLinks: initialSocial,
        });
      }

      const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
      const token = await signAccessToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        tokenVersion,
      });
      const refreshToken = await signRefreshToken({
        id: user._id,
        tokenVersion,
      });

      const responseData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        customLayout: user.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
        profileMusic: user.profileMusic || {
          enabled: true,
          title: 'Lofi Chill - Đêm muộn ở văn phòng',
          artist: 'Freedom Chill Beat',
          sourceType: 'preset',
          presetId: 'lofi_night',
          url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        },
        socialLinks: user.socialLinks || {},
        authProvider: user.authProvider,
        token,
        refreshToken,
      };

      // Lưu bền vững vào db_store.json trên ổ cứng
      saveUserToStore(responseData);

      return sendSuccess(res, {
        message: `Đăng nhập thành công với ${cleanProvider.toUpperCase()}! Đã đồng bộ tên, ảnh đại diện và ảnh bìa.`,
        data: responseData,
      });
    }

    // Mock store nếu DB không khả dụng (Lưu bền vững vào db_store.json)
    const existingStoreUser = findUserInStore(cleanEmail);
    const targetId = existingStoreUser ? existingStoreUser._id : `u_${cleanProvider}_${Date.now()}`;

    const mockUser = {
      ...(existingStoreUser || {}),
      _id: targetId,
      name: name.trim(),
      email: cleanEmail,
      role: existingStoreUser?.role || assignedRole,
      jobTitle: jobTitle || existingStoreUser?.jobTitle || finalJobTitle,
      avatar: (assignedRole === 'admin')
        ? ((avatar && !avatar.includes('google_avatar.jpg') && !avatar.includes('/images/man.jpg')) ? avatar : adminAvatar)
        : ((existingStoreUser?.avatar && !existingStoreUser.avatar.includes('/images/man.jpg') && (!avatar || avatar.includes('/images/man.jpg')))
          ? existingStoreUser.avatar
          : (avatar || existingStoreUser?.avatar || finalAvatar)),
      coverImage: (existingStoreUser?.coverImage && (!coverImage || coverImage.includes('unsplash.com/photo-1579546929518')))
        ? existingStoreUser.coverImage
        : (coverImage || existingStoreUser?.coverImage || finalCover),
      bio: bio || existingStoreUser?.bio || finalBio,
      authProvider: cleanProvider,
      socialLinks: {
        ...(existingStoreUser?.socialLinks || {}),
        ...(socialUrl && cleanProvider ? { [cleanProvider]: socialUrl } : {}),
      },
      customLayout: existingStoreUser?.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
      profileMusic: existingStoreUser?.profileMusic || {
        enabled: true,
        title: 'Lofi Chill - Đêm muộn ở văn phòng',
        artist: 'Freedom Chill Beat',
        sourceType: 'preset',
        presetId: 'lofi_night',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      },
    };

    saveUserToStore(mockUser);

    const tokenVersion = mockUser.tokenVersion !== undefined ? mockUser.tokenVersion : 0;
    const token = await signAccessToken({
      id: mockUser._id,
      role: mockUser.role,
      name: mockUser.name,
      email: mockUser.email,
      tokenVersion,
    });
    const refreshToken = await signRefreshToken({
      id: mockUser._id,
      tokenVersion,
    });

    return sendSuccess(res, {
      message: `Đăng nhập thành công với ${cleanProvider.toUpperCase()}! (Đã lưu bền vững trên ổ cứng)`,
      data: { ...mockUser, token, refreshToken },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const getMe = async (req, res) => {
  return sendSuccess(res, {
    message: 'Lấy thông tin tài khoản thành công',
    data: req.user || { name: 'Thành viên', role: 'user', jobTitle: 'Người đi làm' },
  });
};

/**
 * Cập nhật thông tin chi tiết tài khoản (Profile, Avatar, Bio, Đổi mật khẩu)
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, email, jobTitle, bio, avatar, coverImage, phone, customLayout, profileMusic, socialLinks, currentPassword, newPassword } = req.body;
    const userId = req.user?._id;
    const userEmail = req.user?.email;

    // Giới hạn độ dài input an toàn (Phòng chống ReDoS và nghẽn CPU bcrypt)
    if (newPassword && (newPassword.length < 6 || newPassword.length > 128)) {
      return sendError(res, { message: 'Mật khẩu mới phải từ 6 đến 128 ký tự', status: 400 });
    }
    if (currentPassword && currentPassword.length > 128) {
      return sendError(res, { message: 'Mật khẩu hiện tại không hợp lệ', status: 400 });
    }
    if (name && name.length > 100) {
      return sendError(res, { message: 'Họ tên tối đa 100 ký tự', status: 400 });
    }
    if (email && email.length > 150) {
      return sendError(res, { message: 'Email tối đa 150 ký tự', status: 400 });
    }
    if (jobTitle && jobTitle.length > 100) {
      return sendError(res, { message: 'Chức danh tối đa 100 ký tự', status: 400 });
    }
    if (bio && bio.length > 500) {
      return sendError(res, { message: 'Tiểu sử tối đa 500 ký tự', status: 400 });
    }

    const cleanEmail = email ? email.trim().toLowerCase() : null;

    if (isDbConnected) {
      const user = await User.findOne({
        $or: [
          { _id: userId && String(userId).match(/^[0-9a-fA-F]{24}$/) ? userId : null },
          { email: userEmail ? userEmail.toLowerCase().trim() : null },
        ].filter(Boolean),
      });

      if (!user) {
        return sendError(res, { message: 'Không tìm thấy tài khoản người dùng', status: 404 });
      }

      // Xử lý đổi địa chỉ Email của người dùng
      if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return sendError(res, { message: 'Định dạng email không hợp lệ.', status: 400 });
        }

        const duplicateInDb = await User.findOne({
          email: cleanEmail,
          _id: { $ne: user._id },
        });
        if (duplicateInDb) {
          return sendError(res, { message: 'Địa chỉ Email này đã được sử dụng bởi một tài khoản khác.', status: 400 });
        }

        const currentStore = loadStore();
        const duplicateInStore = (currentStore.users || []).find(
          (u) => u.email && u.email.toLowerCase() === cleanEmail && String(u._id) !== String(user._id)
        );
        if (duplicateInStore) {
          return sendError(res, { message: 'Địa chỉ Email này đã được sử dụng bởi một tài khoản khác.', status: 400 });
        }

        user.email = cleanEmail;
      }

      if (name && name.trim()) user.name = name.trim();
      if (jobTitle !== undefined) user.jobTitle = jobTitle.trim();
      if (bio !== undefined) user.bio = bio.trim();
      if (avatar) user.avatar = avatar;
      if (coverImage) user.coverImage = coverImage;
      if (phone !== undefined) user.phone = phone.trim();

      if (customLayout && typeof customLayout === 'object') {
        user.customLayout = {
          theme: customLayout.theme || user.customLayout?.theme || 'default',
          bgGradient: customLayout.bgGradient || user.customLayout?.bgGradient || '',
          bgColor: customLayout.bgColor || user.customLayout?.bgColor || '',
          bgImage: customLayout.bgImage !== undefined ? customLayout.bgImage.trim() : (user.customLayout?.bgImage || ''),
          frameStyle: customLayout.frameStyle || user.customLayout?.frameStyle || 'none',
          ambientEffect: customLayout.ambientEffect || user.customLayout?.ambientEffect || 'particles',
        };
      }

      if (profileMusic && typeof profileMusic === 'object') {
        user.profileMusic = {
          enabled: profileMusic.enabled !== undefined ? Boolean(profileMusic.enabled) : (user.profileMusic?.enabled ?? true),
          title: profileMusic.title ? profileMusic.title.trim() : (user.profileMusic?.title || 'Lofi Chill - Đêm muộn ở văn phòng'),
          artist: profileMusic.artist ? profileMusic.artist.trim() : (user.profileMusic?.artist || 'Freedom Chill Beat'),
          sourceType: profileMusic.sourceType || user.profileMusic?.sourceType || 'preset',
          url: profileMusic.url !== undefined ? profileMusic.url.trim() : (user.profileMusic?.url || ''),
          presetId: profileMusic.presetId || user.profileMusic?.presetId || 'lofi_night',
          defaultVolume: profileMusic.defaultVolume !== undefined ? Number(profileMusic.defaultVolume) : (user.profileMusic?.defaultVolume ?? 0.35),
          audioQuality: profileMusic.audioQuality || user.profileMusic?.audioQuality || 'high',
          audioProfile: profileMusic.audioProfile || user.profileMusic?.audioProfile || 'balanced',
        };
      }

      if (socialLinks && typeof socialLinks === 'object') {
        user.socialLinks = {
          facebook: socialLinks.facebook !== undefined ? socialLinks.facebook.trim() : (user.socialLinks?.facebook || ''),
          instagram: socialLinks.instagram !== undefined ? socialLinks.instagram.trim() : (user.socialLinks?.instagram || ''),
          tiktok: socialLinks.tiktok !== undefined ? socialLinks.tiktok.trim() : (user.socialLinks?.tiktok || ''),
          x: socialLinks.x !== undefined ? socialLinks.x.trim() : (user.socialLinks?.x || ''),
          linkedin: socialLinks.linkedin !== undefined ? socialLinks.linkedin.trim() : (user.socialLinks?.linkedin || ''),
          github: socialLinks.github !== undefined ? socialLinks.github.trim() : (user.socialLinks?.github || ''),
          website: socialLinks.website !== undefined ? socialLinks.website.trim() : (user.socialLinks?.website || ''),
        };
      }

      // Xử lý đổi mật khẩu nếu có (Đồng thời nâng tokenVersion để thu hồi các phiên cũ)
      if (newPassword) {
        if (newPassword.length < 6) {
          return sendError(res, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự', status: 400 });
        }
        if (currentPassword) {
          const isMatch = await user.comparePassword(currentPassword);
          if (!isMatch) {
            return sendError(res, { message: 'Mật khẩu hiện tại không chính xác', status: 400 });
          }
        }
        user.password = newPassword;
        user.tokenVersion = (user.tokenVersion || 0) + 1;
      }

      await user.save();

      // Đồng bộ tên tác giả, chức danh, AVATAR và MẠNG XÃ HỘI trên tất cả các bài viết do user này đã viết
      await Post.updateMany(
        {
          $or: [
            { user: user._id },
            { author: user.name },
            { author: 'Trần Đình Quân' },
            { author: 'Đình Quân Trần' },
          ],
        },
        {
          author: user.name,
          authorJob: user.jobTitle,
          authorAvatar: user.avatar,
          authorSocialLinks: user.socialLinks,
          user: user._id,
        }
      );

      // Đồng bộ cả persistentStore
      const store = loadStore();
      if (store.posts) {
        store.posts.forEach((p) => {
          if (
            (p.user && p.user._id === user._id.toString()) ||
            p.author === user.name ||
            p.author === 'Trần Đình Quân' ||
            p.author === 'Đình Quân Trần'
          ) {
            p.author = user.name;
            p.authorJob = user.jobTitle;
            p.authorAvatar = user.avatar;
            p.authorSocialLinks = user.socialLinks;
            if (!p.user) p.user = {};
            p.user.name = user.name;
            p.user.jobTitle = user.jobTitle;
            p.user.avatar = user.avatar;
            p.user.bio = user.bio;
            p.user.socialLinks = user.socialLinks;
          }
        });
        saveStore(store);
      }

      // Lưu bền vững vào db_store.json trên ổ cứng
      saveUserToStore({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        customLayout: user.customLayout,
        profileMusic: user.profileMusic,
        socialLinks: user.socialLinks,
        authProvider: user.authProvider || 'local',
      });

      const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
      const freshToken = await signAccessToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        tokenVersion,
      });
      const freshRefreshToken = await signRefreshToken({
        id: user._id,
        tokenVersion,
      });

      return sendSuccess(res, {
        message: 'Cập nhật thông tin tài khoản thành công!',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          jobTitle: user.jobTitle,
          avatar: user.avatar,
          coverImage: user.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
          bio: user.bio,
          customLayout: user.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
          profileMusic: user.profileMusic,
          socialLinks: user.socialLinks,
          authProvider: user.authProvider || 'local',
          token: freshToken,
          refreshToken: freshRefreshToken,
        },
      });
    }

    // Fallback Mock update (Lưu trực tiếp vào db_store.json trên ổ cứng)
    const currentUserIdentifier = req.user?.email || req.user?._id;
    const baseTarget = (currentUserIdentifier ? findUserInStore(currentUserIdentifier) : null) || req.user || {};

    let targetEmail = baseTarget.email || req.user?.email;
    if (!targetEmail) {
      return sendError(res, { message: 'Không tìm thấy tài khoản người dùng', status: 404 });
    }
    if (cleanEmail && cleanEmail !== targetEmail.toLowerCase()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return sendError(res, { message: 'Định dạng email không hợp lệ.', status: 400 });
      }
      const storeData = loadStore();
      const duplicateInStore = (storeData.users || []).find(
        (u) => u.email && u.email.toLowerCase() === cleanEmail && String(u._id) !== String(baseTarget._id || req.user?._id)
      );
      if (duplicateInStore) {
        return sendError(res, { message: 'Địa chỉ Email này đã được sử dụng bởi một tài khoản khác.', status: 400 });
      }
      targetEmail = cleanEmail;
    }

    let fallbackTokenVersion = baseTarget.tokenVersion !== undefined ? baseTarget.tokenVersion : 0;
    let newHashedPassword = undefined;
    if (newPassword) {
      if (newPassword.length < 6) {
        return sendError(res, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự', status: 400 });
      }
      if (currentPassword && (baseTarget.password || baseTarget.rawPassword)) {
        let isMatch = currentPassword === baseTarget.password || currentPassword === baseTarget.rawPassword;
        if (!isMatch && baseTarget.password) {
          try {
            isMatch = await comparePassword(currentPassword, baseTarget.password);
          } catch (_) {}
        }
        if (!isMatch) {
          return sendError(res, { message: 'Mật khẩu hiện tại không chính xác', status: 400 });
        }
      }
      newHashedPassword = await hashPassword(newPassword);
      fallbackTokenVersion += 1;
    }

    const updatedUser = {
      ...baseTarget,
      _id: baseTarget._id || req.user?._id || 'u_admin_1',
      name: name?.trim() || baseTarget.name || 'Trần Đình Quân',
      email: targetEmail,
      role: baseTarget.role || req.user?.role || 'admin',
      jobTitle: jobTitle !== undefined ? jobTitle.trim() : (baseTarget.jobTitle || 'System Admin & Lead Dev'),
      bio: bio !== undefined ? bio.trim() : (baseTarget.bio || ''),
      avatar: avatar || baseTarget.avatar || '',
      coverImage: coverImage || baseTarget.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
      phone: phone !== undefined ? phone.trim() : (baseTarget.phone || ''),
      customLayout: customLayout || baseTarget.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
      profileMusic: profileMusic || baseTarget.profileMusic || {
        enabled: true,
        title: 'Lofi Chill - Đêm muộn ở văn phòng',
        artist: 'Freedom Chill Beat',
        sourceType: 'preset',
        presetId: 'lofi_night',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      },
      socialLinks: socialLinks || baseTarget.socialLinks || {},
      tokenVersion: fallbackTokenVersion,
      ...(newHashedPassword ? { password: newHashedPassword, rawPassword: newPassword } : {}),
    };

    // Ghi đè vào db_store.json trên ổ cứng ngay lập tức
    saveUserToStore(updatedUser);

    // Đồng bộ cả author trong store.posts
    const store = loadStore();
    if (store.posts) {
      store.posts.forEach((p) => {
        if (
          (p.user && String(p.user._id || p.user) === String(updatedUser._id)) ||
          p.author === updatedUser.name ||
          p.author === 'Trần Đình Quân' ||
          p.author === 'Đình Quân Trần'
        ) {
          p.author = updatedUser.name;
          p.authorJob = updatedUser.jobTitle;
          p.authorAvatar = updatedUser.avatar;
          p.authorSocialLinks = updatedUser.socialLinks;
          if (!p.user) p.user = {};
          p.user.name = updatedUser.name;
          p.user.jobTitle = updatedUser.jobTitle;
          p.user.avatar = updatedUser.avatar;
          p.user.bio = updatedUser.bio;
          p.user.socialLinks = updatedUser.socialLinks;
        }
      });
      saveStore(store);
    }

    const freshToken = await signAccessToken({
      id: updatedUser._id,
      role: updatedUser.role,
      name: updatedUser.name,
      email: updatedUser.email,
      jobTitle: updatedUser.jobTitle,
      tokenVersion: fallbackTokenVersion,
    });
    const freshRefreshToken = await signRefreshToken({
      id: updatedUser._id,
      tokenVersion: fallbackTokenVersion,
    });

    return sendSuccess(res, {
      message: 'Cập nhật thông tin tài khoản thành công! (Đã lưu bền vững trên ổ cứng)',
      data: {
        ...updatedUser,
        token: freshToken,
        refreshToken: freshRefreshToken,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy trang cá nhân công khai của người dùng (Public User Profile)
 * Bao gồm: Thông tin tài khoản, tiểu sử bio kèm hashtag, mạng xã hội,
 * tình trạng kết bạn với người đang xem, thống kê và danh sách bài viết đã đăng.
 */
export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id;

    let targetUser = null;

    if (isDbConnected) {
      const query = [];
      if (id && String(id).match(/^[0-9a-fA-F]{24}$/)) {
        query.push({ _id: id });
      }
      if (id && id.includes('@')) {
        query.push({ email: id.toLowerCase().trim() });
      }
      if (id) {
        query.push({ name: decodeURIComponent(id).trim() });
      }

      try {
        if (query.length > 0) {
          targetUser = await User.findOne({ $or: query }).select('-password');
        }

        if (!targetUser) {
          // Thử tìm theo tên tác giả trong bài viết nếu không khớp user id
          const matchedPost = await Post.findOne({
            $or: [
              { author: decodeURIComponent(id).trim() },
              { slug: id },
            ],
          }).populate('user', '-password');

          if (matchedPost?.user) {
            targetUser = matchedPost.user;
          }
        }
      } catch (dbErr) {
        console.warn('MongoDB getUserProfile find user warning:', dbErr.message);
      }
    }

    // Fallback nếu không có DB hoặc không tìm thấy trong DB (Tìm trực tiếp từ db_store.json trên ổ cứng)
    if (!targetUser) {
      const store = loadStore();
      targetUser = findUserInStore(id);

      if (!targetUser) {
        const decodedId = decodeURIComponent(id).trim().toLowerCase();
        targetUser = (store.users || []).find(
          (u) =>
            String(u._id).toLowerCase() === decodedId ||
            (u.email && u.email.toLowerCase() === decodedId) ||
            (u.name && u.name.toLowerCase() === decodedId)
        );
      }
    }

    if (!targetUser) {
      return sendError(res, { message: 'Không tìm thấy thông tin người dùng này', status: 404 });
    }

    // Xác định tình trạng kết bạn
    let isSelf = false;
    let isFriend = false;
    let friendshipStatus = 'none';
    let pendingNotificationId = null;

    if (currentUserId) {
      const currentUserIdStr = currentUserId.toString();
      const targetUserIdStr = (targetUser._id || targetUser.id || '').toString();

      isSelf = currentUserIdStr === targetUserIdStr;
      if (isSelf) {
        friendshipStatus = 'self';
      } else {
        if (Array.isArray(targetUser.friends)) {
          isFriend = targetUser.friends.some((f) => String(f._id || f.id || f) === currentUserIdStr);
        }
        if (!isFriend && req.user && Array.isArray(req.user.friends)) {
          isFriend = req.user.friends.some((f) => String(f._id || f.id || f) === targetUserIdStr);
        }
        if (!isFriend) {
          const store = loadStore();
          const storeMe = (store.users || []).find((u) => (u._id || u.id) === currentUserIdStr);
          if (storeMe && Array.isArray(storeMe.friends)) {
            isFriend = storeMe.friends.some((id) => id.toString() === targetUserIdStr);
          }
          if (!isFriend) {
            const storeTarget = (store.users || []).find((u) => (u._id || u.id) === targetUserIdStr);
            if (storeTarget && Array.isArray(storeTarget.friends)) {
              isFriend = storeTarget.friends.some((id) => id.toString() === currentUserIdStr);
            }
          }
        }

        if (isFriend) {
          friendshipStatus = 'friends';
        } else {
          // Kiểm tra xem có lời mời kết bạn đang chờ (pending) không
          const store = loadStore();
          const notifs = store.notifications || [];

          // 1. currentUser đã gửi cho targetUser và đang chờ duyệt
          const sentPending = notifs.find(
            (n) =>
              n.type === 'friend_request' &&
              n.recipient === targetUserIdStr &&
              n.sender?._id === currentUserIdStr &&
              n.actionStatus === 'pending'
          );

          // 2. targetUser đã gửi cho currentUser và đang chờ currentUser chấp nhận
          const receivedPending = notifs.find(
            (n) =>
              n.type === 'friend_request' &&
              n.recipient === currentUserIdStr &&
              n.sender?._id === targetUserIdStr &&
              n.actionStatus === 'pending'
          );

          if (sentPending) {
            friendshipStatus = 'sent_pending';
          } else if (receivedPending) {
            friendshipStatus = 'received_pending';
            pendingNotificationId = receivedPending._id;
          } else {
            friendshipStatus = 'none';
          }
        }
      }
    }

    // Lấy danh sách bài viết của người này (Hợp nhất bền vững từ db_store.json và MongoDB)
    const store = loadStore();
    const localUserPosts = (store.posts || []).filter((p) => {
      const pUserId = String(p.user?._id || p.user || '');
      const tUserId = String(targetUser._id || targetUser.id || '');
      const isIdMatch = pUserId && tUserId && pUserId === tUserId;
      const isEmailMatch = Boolean(
        p.user?.email && targetUser.email && p.user.email.toLowerCase() === targetUser.email.toLowerCase()
      );
      const isAuthorMatch = Boolean(
        p.author && targetUser.name && p.author.trim().toLowerCase() === targetUser.name.trim().toLowerCase()
      );
      const isAdminAlias = (targetUser.name === 'Trần Đình Quân' || targetUser.name === 'Đơn Thân Mẹ') &&
        (p.author === 'Trần Đình Quân' || p.author === 'Trần Đỉnh Quân' || p.author === 'Đơn Thân Mẹ');
      return isIdMatch || isEmailMatch || isAuthorMatch || isAdminAlias;
    });

    let posts = localUserPosts;
    if (isDbConnected) {
      try {
        const postOr = [
          { author: targetUser.name },
        ];
        if (targetUser.name === 'Trần Đình Quân' || targetUser.name === 'Đơn Thân Mẹ') {
          postOr.push({ author: 'Trần Đình Quân' }, { author: 'Trần Đỉnh Quân' }, { author: 'Đơn Thân Mẹ' });
        }
        if (targetUser._id && String(targetUser._id).match(/^[0-9a-fA-F]{24}$/)) {
          postOr.push({ user: targetUser._id });
        }
        const dbPosts = await Post.find({
          $or: postOr,
          isPublished: true,
        })
          .populate('category', 'name slug')
          .sort({ createdAt: -1 })
          .lean();

        if (dbPosts && dbPosts.length > 0) {
          const postMap = new Map();
          localUserPosts.forEach((p) => postMap.set(p.slug || String(p._id), p));
          dbPosts.forEach((p) => {
            const key = p.slug || String(p._id);
            if (!postMap.has(key)) postMap.set(key, p);
          });
          posts = Array.from(postMap.values());
        }
      } catch (e) {
        console.warn('Lỗi lấy bài viết DB trong getUserProfile:', e.message);
      }
    }

    // Thống kê người dùng
    const totalCheersReceived = posts.reduce(
      (sum, p) => sum + (p.cheersCount || p.reactionCounts?.total || 0),
      0
    );
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const friendsCount = Array.isArray(targetUser.friends) ? targetUser.friends.length : 0;

    return sendSuccess(res, {
      message: 'Lấy thông tin trang cá nhân thành công',
      data: {
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: isSelf || req.user?.role === 'admin' ? targetUser.email : undefined,
          phone: isSelf || req.user?.role === 'admin' ? targetUser.phone : undefined,
          role: targetUser.role,
          jobTitle: targetUser.jobTitle,
          avatar: targetUser.avatar || '',
          coverImage: targetUser.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
          bio: targetUser.bio || 'Chỉ là một người đang cố gắng mỗi ngày trong công việc.',
          customLayout: targetUser.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
          profileMusic: targetUser.profileMusic || {
            enabled: true,
            title: 'Lofi Chill - Đêm muộn ở văn phòng',
            artist: 'Freedom Chill Beat',
            sourceType: 'preset',
            presetId: 'lofi_night',
            url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
          },
          socialLinks: targetUser.socialLinks || {},
          authProvider: targetUser.authProvider || 'local',
          streakCount: targetUser.streakCount || 0,
          lastCheckInDate: targetUser.lastCheckInDate || null,
          createdAt: targetUser.createdAt,
        },
        stats: {
          postsCount: posts.length,
          totalCheersReceived,
          totalViews,
          friendsCount,
        },
        friendshipStatus,
        pendingNotificationId,
        posts,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Gửi mã xác nhận OTP (6 số) tới Email hoặc tin nhắn SMS Số điện thoại chính chủ
 */
export const sendLoginOtp = async (req, res) => {
  try {
    const { email, identifier, phone, purpose = 'login', deviceName = 'Windows PC (Chrome)' } = req.body;
    const targetInput = String(email || identifier || phone || '').trim();

    if (!targetInput) {
      return sendError(res, { message: 'Vui lòng cung cấp địa chỉ Email hoặc Số điện thoại hợp lệ', status: 400 });
    }

    const isEmail = targetInput.includes('@');
    const cleanTarget = isEmail ? targetInput.toLowerCase() : targetInput.replace(/\s+/g, '');
    const otpCode = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút
    const rawPass = req.body.password ? String(req.body.password) : '';
    const hashedPassword = rawPass ? await hashPassword(rawPass) : '';

    otpStore.set(cleanTarget, {
      code: otpCode,
      expiresAt,
      type: isEmail ? 'email' : 'phone',
      attempts: 0,
      name: req.body.name ? String(req.body.name).trim() : '',
      passwordHash: hashedPassword,
      jobTitle: req.body.jobTitle ? String(req.body.jobTitle).trim() : '',
    });

    req.otpDispatched = true;

    if (isEmail) {
      // Cập nhật mã OTP vào MongoDB Atlas nếu tài khoản đã tồn tại
      if (isDbConnected) {
        try {
          const dbUser = await User.findOne({ email: cleanTarget });
          if (dbUser) {
            dbUser.otpCode = otpCode;
            dbUser.otpExpires = new Date(expiresAt);
            dbUser.otpAttempts = 0;
            await dbUser.save();
          }
        } catch (dbErr) {
          console.warn('[AUTH] Cảnh báo cập nhật OTP vào DB:', dbErr.message);
        }
      }

      // Gửi email thật qua Nodemailer Gmail
      let mailResult = null;
      try {
        mailResult = await sendRegistrationOtp(cleanTarget, otpCode);
      } catch (err) {
        console.warn('[AUTH] Thử lại với hàm gửi mail dự phòng:', err.message);
        try {
          mailResult = await sendOtpEmail(cleanTarget, otpCode, purpose);
        } catch (backupErr) {
          console.error('[AUTH] Cả 2 cổng gửi email đều không khả dụng:', backupErr.message);
          return sendError(res, {
            message: 'Máy chủ gửi email tạm thời không phản hồi. Quý khách vui lòng thử lại sau ít phút hoặc đăng nhập bằng Mật khẩu.',
            status: 500,
          });
        }
      }

      console.log(`\n========================================`);
      console.log(`[AUTH SECURITY] ĐÃ GỬI MÃ XÁC THỰC BẢO MẬT`);
      console.log(`- Hòm thư nhận: ${cleanTarget}`);
      console.log(`- Mã xác nhận 6 số: ${otpCode}`);
      console.log(`========================================\n`);

      return sendSuccess(res, {
        message: `Đã gửi mã xác nhận 6 số đến hòm thư ${cleanTarget}`,
        data: {
          identifier: cleanTarget,
          type: 'email',
          expiresAt,
          previewUrl: mailResult?.previewUrl || null,
          simulated: mailResult?.simulated || false,
          debugOtp: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') ? otpCode : undefined,
        },
      });
    } else {
      // GỬI TIN NHẮN SMS XÁC NHẬN TỚI SỐ ĐIỆN THOẠI CHÍNH CHỦ
      const smsResult = await sendOtpSms(cleanTarget, otpCode, deviceName);

      // Nếu cổng SMS chưa được cấu hình hoặc gửi thất bại (nhất là trên Production Vercel)
      if (!smsResult || !smsResult.success) {
        console.warn(`[AUTH SECURITY] Cổng SMS không khả dụng cho ${cleanTarget}:`, smsResult?.error || 'Chưa cấu hình API Key SMS');
        return sendError(res, {
          message: smsResult?.error || 'Dịch vụ gửi SMS tạm thời chưa khả dụng. Quý khách vui lòng chọn Đăng nhập / Đăng ký bằng Email hoặc Mật khẩu.',
          status: 503,
          data: {
            reason: smsResult?.reason || 'SMS_GATEWAY_NOT_CONFIGURED',
            identifier: cleanTarget,
            type: 'phone',
            supportedAlternatives: ['email', 'password'],
          },
        });
      }

      console.log(`\n========================================`);
      console.log(`[AUTH SECURITY] ĐÃ GỬI TIN NHẮN SMS XÁC THỰC`);
      console.log(`- Số điện thoại nhận: ${cleanTarget}`);
      console.log(`- Mã xác nhận 6 số: ${otpCode}`);
      console.log(`- Nội dung SMS: ${smsResult.content}`);
      console.log(`========================================\n`);

      return sendSuccess(res, {
        message: `Đã gửi tin nhắn SMS chứa mã xác nhận 6 số đến SĐT ${smsResult.formattedPhone || cleanTarget}`,
        data: {
          identifier: cleanTarget,
          phone: cleanTarget,
          type: 'phone',
          smsContent: smsResult.content,
          maskedPhone: smsResult.maskedPhone || cleanTarget,
          formattedPhone: smsResult.formattedPhone || cleanTarget,
          brandname: smsResult.brandname || 'CANTSTOPHERE',
          expiresAt,
          debugOtp: (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') ? otpCode : undefined,
        },
      });
    }
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi khi gửi mã xác thực', status: 500 });
  }
};

/**
 * Xác nhận mã OTP (Email hoặc SMS) và kích hoạt tài khoản / hoàn tất đăng nhập
 */
export const verifyOtpAndLogin = async (req, res) => {
  try {
    const { email, identifier, otpCode, deviceName = 'Windows PC (Chrome)' } = req.body;
    const targetInput = String(email || identifier || '').trim();

    if (!targetInput || !otpCode) {
      return sendError(res, { message: 'Vui lòng cung cấp Email/Số điện thoại và mã xác nhận OTP', status: 400 });
    }

    const isEmail = targetInput.includes('@');
    const cleanTarget = isEmail ? targetInput.toLowerCase() : targetInput.replace(/\s+/g, '');
    const cleanOtp = String(otpCode).trim();

    let isMatched = false;
    let dbUser = null;

    // 🛡️ CHỐNG RACE CONDITION TRÊN BỘ NHỚ ĐỆM (otpStore):
    // Tăng biến đếm sai ĐỒNG BỘ ngay lập tức trước bất kỳ lệnh await nào!
    const record = otpStore.get(cleanTarget);
    const hasActiveRecord = record && Date.now() <= record.expiresAt;

    if (hasActiveRecord) {
      if (record.code === cleanOtp) {
        isMatched = true;
        otpStore.delete(cleanTarget);
        if (isDbConnected && isEmail) {
          dbUser = await User.findOneAndUpdate(
            { email: cleanTarget },
            { $set: { isVerified: true, otpCode: null, otpExpires: null, otpAttempts: 0 } },
            { new: true }
          );
        }
      } else {
        // Tăng đồng bộ ngay trên record trước khi nhường event loop
        record.attempts = (record.attempts || 0) + 1;
        const currentAttempts = record.attempts;

        if (currentAttempts >= 5) {
          otpStore.delete(cleanTarget);
          if (isDbConnected && isEmail) {
            await User.updateOne(
              { email: cleanTarget },
              { $set: { otpCode: null, otpExpires: null, otpAttempts: 0 } }
            );
          }
          return sendError(res, {
            message: 'Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới!',
            status: 400,
          });
        }

        // Cập nhật nguyên tử với $inc trong MongoDB Atlas
        if (isDbConnected && isEmail) {
          await User.updateOne({ email: cleanTarget }, { $inc: { otpAttempts: 1 } });
        }

        const remainingAttempts = 5 - currentAttempts;
        return sendError(res, {
          message: `Mã xác nhận OTP không chính xác. Bạn còn ${remainingAttempts} lần thử trước khi mã bị vô hiệu hóa!`,
          status: 400,
          errors: { remainingAttempts },
        });
      }
    }

    // Nếu không có trong otpStore (ví dụ server khởi động lại), đối chiếu trong MongoDB Atlas
    if (!isMatched && isDbConnected && isEmail) {
      dbUser = await User.findOne({ email: cleanTarget });
      if (dbUser && dbUser.otpCode) {
        const isNotExpired = !dbUser.otpExpires || new Date() <= dbUser.otpExpires;
        if (isNotExpired) {
          if (dbUser.otpCode === cleanOtp) {
            isMatched = true;
            dbUser.isVerified = true;
            dbUser.otpCode = null;
            dbUser.otpExpires = null;
            dbUser.otpAttempts = 0;
            await dbUser.save();
          } else {
            // Tăng số lần sai nguyên tử với $inc
            const updated = await User.findOneAndUpdate(
              { email: cleanTarget, otpCode: { $ne: null } },
              { $inc: { otpAttempts: 1 } },
              { new: true }
            );
            if (updated && updated.otpAttempts >= 5) {
              await User.updateOne(
                { email: cleanTarget },
                { $set: { otpCode: null, otpExpires: null, otpAttempts: 0 } }
              );
              return sendError(res, {
                message: 'Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã OTP mới!',
                status: 400,
              });
            }
            const rem = Math.max(0, 5 - (updated?.otpAttempts || 1));
            return sendError(res, {
              message: `Mã xác nhận OTP không chính xác. Bạn còn ${rem} lần thử trước khi mã bị vô hiệu hóa!`,
              status: 400,
              errors: { remainingAttempts: rem },
            });
          }
        }
      }
    }

    if (!isMatched) {
      return sendError(res, {
        message: 'Mã xác nhận OTP không chính xác hoặc đã hết hạn (5 phút). Vui lòng yêu cầu mã OTP mới!',
        status: 400,
      });
    }

    otpStore.delete(cleanTarget);

    const storeUser = findUserInStore(cleanTarget);
    const adminEmail = (process.env.ADMIN_EMAIL || 'anthonyq012025@gmail.com').toLowerCase().trim();
    const isAdm = cleanTarget === adminEmail || cleanTarget === (process.env.ADMIN_PHONE || '0901234567');
    const assignedRole = isAdm ? 'admin' : (dbUser?.role || 'user');

    // 🚨 BẪY BẢO MẬT: CHẶN TÀI KHOẢN ADMIN ĐĂNG NHẬP QUA CỔNG OTP CỦA USER THƯỜNG
    if (assignedRole === 'admin' || dbUser?.role === 'admin' || storeUser?.role === 'admin') {
      const telemetry = extractTelemetry(req);
      try {
        await AdminAuditLog.create({
          action: 'BLOCKED_AT_USER_PORTAL',
          email: cleanTarget,
          ip: telemetry.ip,
          location: telemetry.location,
          userAgent: telemetry.userAgent,
          timeVn: telemetry.timeVn,
          details: { attemptFrom: 'OTP Verification User Portal', reason: 'Admin account attempt at user OTP login portal' },
        });
      } catch (_) {}
      sendAdminSecurityAlertEmail({
        action: 'BLOCKED_AT_USER_PORTAL',
        targetEmail: cleanTarget,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { reason: 'Admin account blocked at regular user OTP login portal' },
      }).catch(() => {});

      return sendError(res, {
        message: 'Mã xác nhận OTP không chính xác hoặc đã hết hạn (5 phút). Vui lòng yêu cầu mã OTP mới!',
        status: 400,
      });
    }

    // Ưu tiên Họ tên thật người dùng đã nhập lúc đăng ký (từ body hoặc từ cache OTP)
    const submittedName = (req.body.name || record?.name || '').trim();
    const submittedPasswordHash = record?.passwordHash || (req.body.password ? await hashPassword(String(req.body.password)) : '');
    const submittedJobTitle = (req.body.jobTitle || record?.jobTitle || '').trim();

    const finalUser = dbUser ? {
      _id: dbUser._id,
      name: submittedName || dbUser.name,
      email: dbUser.email,
      role: dbUser.role || assignedRole,
      jobTitle: submittedJobTitle || dbUser.jobTitle || 'Thành viên cộng đồng',
      avatar: isAdm ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg' : (dbUser.avatar && !dbUser.avatar.includes('/images/man.jpg') ? dbUser.avatar : ''),
      coverImage: dbUser.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
      bio: dbUser.bio || '',
      isVerified: true,
      authProvider: dbUser.authProvider || 'local',
      customLayout: dbUser.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
      profileMusic: dbUser.profileMusic || {
        enabled: true,
        title: 'Lofi Chill - Đêm muộn ở văn phòng',
        artist: 'Freedom Chill Beat',
        sourceType: 'preset',
        presetId: 'lofi_night',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      },
    } : {
      _id: storeUser?._id || `u_${isEmail ? 'email' : 'phone'}_${Date.now()}`,
      name: submittedName || storeUser?.name || (isAdm ? 'Trần Đình Quân' : (isEmail ? (cleanTarget.split('@')[0].charAt(0).toUpperCase() + cleanTarget.split('@')[0].slice(1)) : `Thành viên (${cleanTarget})`)),
      email: isEmail ? cleanTarget : `${cleanTarget}@phone.cantstophere.com`,
      phone: !isEmail ? cleanTarget : undefined,
      password: submittedPasswordHash || storeUser?.password || '',
      role: assignedRole,
      jobTitle: submittedJobTitle || storeUser?.jobTitle || (isAdm ? 'System Admin & Lead Dev' : 'Thành viên cộng đồng'),
      avatar: isAdm ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg' : (storeUser?.avatar && !storeUser.avatar.includes('/images/man.jpg') ? storeUser.avatar : ''),
      customLayout: storeUser?.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
      profileMusic: storeUser?.profileMusic || {
        enabled: true,
        title: 'Lofi Chill - Đêm muộn ở văn phòng',
        artist: 'Freedom Chill Beat',
        sourceType: 'preset',
        presetId: 'lofi_night',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      },
      isVerified: true,
    };

    saveUserToStore(finalUser);

    // Gửi tin nhắn SMS cảnh báo bảo mật xác nhận SĐT đã đăng nhập thành công
    let alertSms = null;
    if (!isEmail) {
      alertSms = await sendLoginAlertSms(cleanTarget, finalUser.name, deviceName);
    }

    const tokenVersion = finalUser.tokenVersion !== undefined ? finalUser.tokenVersion : 0;
    const token = await signAccessToken({
      id: finalUser._id,
      role: finalUser.role,
      name: finalUser.name,
      email: finalUser.email,
      tokenVersion,
    });
    const refreshToken = await signRefreshToken({
      id: finalUser._id,
      tokenVersion,
    });

    return sendSuccess(res, {
      message: !isEmail
        ? `Xác thực SMS OTP thành công! Đã gửi thông báo xác nhận đến SĐT ${cleanTarget}.`
        : 'Xác thực mã OTP thành công! Đăng nhập hoàn tất.',
      data: {
        ...finalUser,
        token,
        refreshToken,
        alertSms: alertSms ? alertSms.content : null,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi xác thực mã OTP', status: 500 });
  }
};

/**
 * Chuyển hướng trực tiếp tới máy chủ OAuth của nền tảng (Google, Facebook, GitHub,...)
 */
export const initiateOAuth = async (req, res) => {
  try {
    const provider = String(req.params.provider || 'google').toLowerCase().trim();
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (clientId) {
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=consent`;
        return res.redirect(googleAuthUrl);
      }
      if (process.env.NODE_ENV === 'production') {
        return sendError(res, { message: 'Google OAuth chưa được cấu hình trên máy chủ', status: 501 });
      }
      const demoToken = await signToken({
        id: 'google_demo_user',
        role: 'user',
        name: 'Demo Google User',
        email: 'demo_google@social.cantstophere.com',
      });
      return res.redirect(`${clientUrl}/?oauth=success&provider=google&token=${demoToken}&name=${encodeURIComponent('Demo Google User')}&email=demo_google@social.cantstophere.com`);
    }

    if (provider === 'facebook') {
      const appId = process.env.FACEBOOK_APP_ID;
      if (appId) {
        const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=email,public_profile&response_type=code`;
        return res.redirect(fbAuthUrl);
      }
      if (process.env.NODE_ENV === 'production') {
        return sendError(res, { message: 'Facebook OAuth chưa được cấu hình trên máy chủ', status: 501 });
      }
      const demoToken = await signToken({
        id: 'fb_demo_user',
        role: 'user',
        name: 'Demo Facebook User',
        email: 'demo_fb@social.cantstophere.com',
      });
      return res.redirect(`${clientUrl}/?oauth=success&provider=facebook&token=${demoToken}&name=${encodeURIComponent('Demo Facebook User')}&email=demo_fb@social.cantstophere.com`);
    }

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      if (clientId) {
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email,read:user`;
        return res.redirect(githubAuthUrl);
      }
      if (process.env.NODE_ENV === 'production') {
        return sendError(res, { message: 'GitHub OAuth chưa được cấu hình trên máy chủ', status: 501 });
      }
      const demoToken = await signToken({
        id: 'github_demo_user',
        role: 'user',
        name: 'Demo GitHub User',
        email: 'demo_github@social.cantstophere.com',
      });
      return res.redirect(`${clientUrl}/?oauth=success&provider=github&token=${demoToken}&name=${encodeURIComponent('Demo GitHub User')}&email=demo_github@social.cantstophere.com`);
    }

    return res.redirect(`${clientUrl}/?oauth=success&provider=${provider}`);
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi khởi tạo OAuth', status: 500 });
  }
};

/**
 * Xử lý Callback từ máy chủ OAuth của nền tảng (Facebook, GitHub, Google,...)
 * Trao đổi Authorization Code lấy Access Token thật, truy xuất thông tin tài khoản,
 * đồng bộ người dùng vào Database và tạo JWT Token đăng nhập phiên.
 */
export const handleOAuthCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const provider = String(req.params.provider || 'google').toLowerCase();

  try {
    const { code, error, error_description } = req.query;
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/auth/oauth/${provider}/callback`;

    if (error) {
      console.warn(`[OAuth] Phía ${provider} từ chối hoặc trả về lỗi:`, error, error_description);
      return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent(error_description || error)}`);
    }

    let profile = {
      id: null,
      name: null,
      email: null,
      avatar: null,
      bio: null,
      socialUrl: null,
    };

    // ========================================================
    // 1. FACEBOOK OAUTH 2.0 (Meta Graph API)
    // ========================================================
    if (provider === 'facebook') {
      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;

      if (code && appId && appSecret) {
        try {
          const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(callbackUrl)}&code=${code}`;
          const tokenRes = await fetch(tokenUrl, {
            signal: AbortSignal.timeout(10000),
          });
          const tokenData = await tokenRes.json();

          if (tokenData.access_token) {
            const profileUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(500).height(500)&access_token=${tokenData.access_token}`;
            const userRes = await fetch(profileUrl, {
              signal: AbortSignal.timeout(10000),
            });
            const fbUser = await userRes.json();

            profile.id = fbUser.id;
            profile.name = fbUser.name || 'Người dùng Facebook';
            profile.email = fbUser.email || `facebook_${fbUser.id}@social.cantstophere.com`;
            profile.avatar = fbUser.picture?.data?.url || null;
            profile.socialUrl = `https://www.facebook.com/${fbUser.id}`;
            profile.bio = 'Tài khoản xác thực chính thức từ Facebook OAuth 2.0.';
          } else {
            console.warn('[OAuth Facebook] Không lấy được access_token:', tokenData);
          }
        } catch (fbErr) {
          console.error('[OAuth Facebook] Lỗi trao đổi token:', fbErr);
        }
      }
    }

    // ========================================================
    // 2. GITHUB OAUTH 2.0 (GitHub REST API)
    // ========================================================
    else if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (code && clientId && clientSecret) {
        try {
          const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              redirect_uri: callbackUrl,
            }),
            signal: AbortSignal.timeout(10000),
          });
          const tokenData = await tokenRes.json();

          if (tokenData.access_token) {
            const userRes = await fetch('https://api.github.com/user', {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'User-Agent': 'Freedom-Web-App',
                'Accept': 'application/vnd.github+json',
              },
              signal: AbortSignal.timeout(10000),
            });
            const ghUser = await userRes.json();

            let ghEmail = ghUser.email;
            if (!ghEmail) {
              try {
                const emailsRes = await fetch('https://api.github.com/user/emails', {
                  headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'User-Agent': 'Freedom-Web-App',
                  },
                  signal: AbortSignal.timeout(10000),
                });
                const emailsData = await emailsRes.json();
                if (Array.isArray(emailsData)) {
                  const primaryEmail = emailsData.find((e) => e.primary && e.verified) || emailsData[0];
                  if (primaryEmail) ghEmail = primaryEmail.email;
                }
              } catch (e) {}
            }

            profile.id = String(ghUser.id);
            profile.name = ghUser.name || ghUser.login || 'GitHub Developer';
            profile.email = ghEmail || `github_${ghUser.id}@social.cantstophere.com`;
            profile.avatar = ghUser.avatar_url || null;
            profile.socialUrl = ghUser.html_url || `https://github.com/${ghUser.login}`;
            profile.bio = ghUser.bio || 'Tài khoản xác thực chính thức từ GitHub OAuth 2.0.';
          } else {
            console.warn('[OAuth GitHub] Không lấy được access_token:', tokenData);
          }
        } catch (ghErr) {
          console.error('[OAuth GitHub] Lỗi trao đổi token:', ghErr);
        }
      }
    }

    // ========================================================
    // 3. GOOGLE OAUTH 2.0 (Google OAuth API)
    // ========================================================
    else if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

      if (code && clientId && clientSecret) {
        try {
          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: callbackUrl,
              grant_type: 'authorization_code',
            }),
            signal: AbortSignal.timeout(10000),
          });
          const tokenData = await tokenRes.json();

          if (tokenData.access_token) {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
              signal: AbortSignal.timeout(10000),
            });
            const gUser = await userRes.json();

            profile.id = gUser.sub;
            profile.name = gUser.name || 'Người dùng Google';
            profile.email = gUser.email;
            profile.avatar = gUser.picture || null;
            profile.bio = 'Tài khoản xác thực chính thức từ Google OAuth 2.0.';
          }
        } catch (gErr) {
          console.error('[OAuth Google] Lỗi trao đổi token:', gErr);
        }
      }
    }

    // ========================================================
    // 4. LƯU & ĐỒNG BỘ NGƯỜI DÙNG VÀO DATABASE / STORE
    // ========================================================
    let targetUser = null;

    if (profile.id && profile.name) {
      const cleanEmail = (profile.email || `${provider}_${profile.id}@social.cantstophere.com`).toLowerCase().trim();
      const adminEmail = (process.env.ADMIN_EMAIL || 'anthonyq012025@gmail.com').toLowerCase().trim();
      const assignedRole = cleanEmail === adminEmail ? 'admin' : 'user';

      if (isDbConnected) {
        targetUser = await User.findOne({
          $or: [
            { providerId: profile.id, authProvider: provider },
            { email: cleanEmail },
          ],
        });

        if (targetUser) {
          if (profile.name) targetUser.name = profile.name.trim();
          if (profile.avatar && (!targetUser.avatar || targetUser.avatar.includes('/images/man.jpg'))) {
            targetUser.avatar = profile.avatar;
          }
          if (!targetUser.authProvider || targetUser.authProvider === 'local') {
            targetUser.authProvider = provider;
          }
          targetUser.providerId = profile.id;
          if (!targetUser.socialLinks) targetUser.socialLinks = {};
          if (profile.socialUrl) targetUser.socialLinks[provider] = profile.socialUrl;
          await targetUser.save();
        } else {
          targetUser = await User.create({
            name: profile.name.trim(),
            email: cleanEmail,
            password: `oauth_${provider}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            role: assignedRole,
            authProvider: provider,
            providerId: profile.id,
            jobTitle: provider === 'github' ? 'Senior Software Engineer' : (provider === 'facebook' ? 'Content Creator & Connect' : 'Thành viên cộng đồng'),
            avatar: profile.avatar || '',
            coverImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
            bio: profile.bio || `Đã kết nối qua ${provider.toUpperCase()} OAuth 2.0`,
            socialLinks: profile.socialUrl ? { [provider]: profile.socialUrl } : {},
          });
        }
      } else {
        const existingStore = findUserInStore(cleanEmail);
        const storeId = existingStore ? existingStore._id : `u_${provider}_${Date.now()}`;
        targetUser = {
          ...(existingStore || {}),
          _id: storeId,
          name: profile.name.trim(),
          email: cleanEmail,
          role: existingStore?.role || assignedRole,
          jobTitle: existingStore?.jobTitle || (provider === 'github' ? 'Senior Software Engineer' : 'Thành viên cộng đồng'),
          avatar: profile.avatar || existingStore?.avatar || '',
          authProvider: provider,
          providerId: profile.id,
          socialLinks: { ...(existingStore?.socialLinks || {}), ...(profile.socialUrl ? { [provider]: profile.socialUrl } : {}) },
        };
        saveUserToStore(targetUser);
      }
    }

    const finalUserId = targetUser?._id || `${provider}_oauth_${Date.now()}`;
    const finalRole = targetUser?.role || 'user';
    const finalName = targetUser?.name || profile?.name || 'Thành viên';
    const finalEmail = targetUser?.email || (profile?.email ? profile.email.toLowerCase().trim() : `${provider}_${Date.now()}@social.cantstophere.com`);
    const finalAvatar = targetUser?.avatar || profile?.avatar || '';

    const tokenVersion = targetUser?.tokenVersion !== undefined ? targetUser.tokenVersion : 0;
    const token = await signAccessToken({
      id: finalUserId,
      role: finalRole,
      name: finalName,
      email: finalEmail,
      tokenVersion,
    });
    const refreshToken = await signRefreshToken({
      id: finalUserId,
      tokenVersion,
    });

    return res.redirect(`${clientUrl}/?oauth=success&provider=${provider}&token=${token}&refreshToken=${refreshToken}&name=${encodeURIComponent(finalName)}&email=${encodeURIComponent(finalEmail)}&avatar=${encodeURIComponent(finalAvatar)}`);
  } catch (err) {
    console.error(`[OAuth Callback Error] provider: ${provider}`, err);
    return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent(err.message || 'Lỗi xử lý callback OAuth')}`);
  }
};

// ========================================================
// HỆ THỐNG ĐĂNG NHẬP BẰNG MÃ QR TỰ SẢN SINH (QR CODE AUTH)
// ========================================================
const qrSessionStore = new Map();

// Tự động dọn dẹp các phiên QR hết hạn mỗi 5 phút
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of qrSessionStore.entries()) {
    if (session.expiresAt && now > session.expiresAt + 60000) {
      qrSessionStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * 1. Khởi tạo phiên mã QR mới trên máy tính (Web)
 * Trả về sessionId và payload chuỗi để render mã QR
 */
export const generateQrSession = async (req, res) => {
  try {
    const sessionId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresInSeconds = 120; // 2 phút
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    const qrData = {
      app: 'freedom-web',
      action: 'login',
      sessionId,
      expiresAt,
      timestamp: Date.now(),
    };

    qrSessionStore.set(sessionId, {
      sessionId,
      status: 'pending', // 'pending' | 'scanned' | 'authenticated' | 'expired'
      createdAt: Date.now(),
      expiresAt,
      token: null,
      user: null,
    });

    return sendSuccess(res, {
      message: 'Đã sinh mã QR đăng nhập thành công',
      data: {
        sessionId,
        expiresInSeconds,
        expiresAt,
        qrPayload: JSON.stringify(qrData),
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * 2. Web máy tính kiểm tra trạng thái phiên QR định kỳ (Polling)
 */
export const checkQrSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId || !qrSessionStore.has(sessionId)) {
      return sendSuccess(res, { data: { status: 'expired', message: 'Mã QR không tồn tại hoặc đã hết hạn' } });
    }

    const session = qrSessionStore.get(sessionId);

    // Kiểm tra hết hạn (sau 2 phút)
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      return sendSuccess(res, { data: { status: 'expired', message: 'Mã QR đã hết hạn. Vui lòng bấm làm mới mã!' } });
    }

    if (session.status === 'authenticated') {
      // Đã xác thực thành công! Gửi token về cho web tự động đăng nhập
      return sendSuccess(res, {
        data: {
          status: 'authenticated',
          token: session.token,
          refreshToken: session.refreshToken,
          user: session.user,
        },
      });
    }

    return sendSuccess(res, {
      data: {
        status: session.status || 'pending',
        remainingSeconds: Math.max(0, Math.round((session.expiresAt - Date.now()) / 1000)),
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * 3. Điện thoại quét mã QR và xác nhận đăng nhập
 */
export const verifyQrSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const user = req.user;

    if (!sessionId || !qrSessionStore.has(sessionId)) {
      return sendError(res, { message: 'Phiên mã QR không hợp lệ hoặc đã hết hạn', status: 400 });
    }

    const session = qrSessionStore.get(sessionId);
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      return sendError(res, { message: 'Mã QR này đã hết hạn. Vui lòng làm mới trên máy tính!', status: 400 });
    }

    if (!user) {
      return sendError(res, { message: 'Bạn cần đăng nhập tài khoản trên thiết bị này trước khi xác nhận', status: 401 });
    }

    // 🚨 BẢO MẬT: Không cho phép chuyển giao phiên Admin qua mã QR của cổng người dùng thường
    if (user.role === 'admin') {
      return sendError(res, {
        message: 'Tài khoản Quản trị viên không được phép đăng nhập qua mã QR thông thường. Vui lòng truy cập Cổng Quản Trị Bảo Mật!',
        status: 403,
      });
    }

    const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
    // Cấp token mới cho thiết bị web máy tính
    const webToken = await signAccessToken({
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      jobTitle: user.jobTitle,
      tokenVersion,
    });
    const webRefreshToken = await signRefreshToken({
      id: user._id,
      tokenVersion,
    });

    session.status = 'authenticated';
    session.token = webToken;
    session.refreshToken = webRefreshToken;
    session.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle,
      avatar: user.avatar,
      coverImage: user.coverImage,
      bio: user.bio,
      socialLinks: user.socialLinks || {},
    };

    return sendSuccess(res, {
      message: '✓ Đã xác nhận đăng nhập cho máy tính thành công!',
      data: { status: 'authenticated' },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * 4. Mô phỏng quét mã QR nhanh (Dành cho việc trải nghiệm & kiểm thử tức thì)
 */
export const simulateQrSessionScan = async (req, res) => {
  try {
    const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (!isDevOrTest) {
      return sendError(res, {
        message: 'Tính năng mô phỏng quét mã QR (QR Simulate) chỉ được phép hoạt động trên môi trường development hoặc test.',
        status: 403,
      });
    }

    const { sessionId, email } = req.body;
    if (!sessionId || !qrSessionStore.has(sessionId)) {
      return sendError(res, { message: 'Mã QR không tồn tại hoặc đã hết hạn', status: 400 });
    }

    const session = qrSessionStore.get(sessionId);
    if (Date.now() > session.expiresAt) {
      session.status = 'expired';
      return sendError(res, { message: 'Mã QR đã hết hạn', status: 400 });
    }

    // Lấy user admin mặc định hoặc user theo email
    const store = loadStore();
    const users = store.users && store.users.length > 0 ? store.users : defaultStoreUsers;
    const targetUser = email
      ? users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || users[0]
      : users[0];

    const tokenVersion = targetUser.tokenVersion !== undefined ? targetUser.tokenVersion : 0;
    const webToken = await signAccessToken({
      id: targetUser._id,
      role: targetUser.role || 'admin',
      name: targetUser.name,
      email: targetUser.email,
      jobTitle: targetUser.jobTitle,
      tokenVersion,
    });
    const webRefreshToken = await signRefreshToken({
      id: targetUser._id,
      tokenVersion,
    });

    session.status = 'authenticated';
    session.token = webToken;
    session.refreshToken = webRefreshToken;
    session.user = {
      _id: targetUser._id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role || 'admin',
      jobTitle: targetUser.jobTitle,
      avatar: targetUser.avatar,
      coverImage: targetUser.coverImage,
      bio: targetUser.bio,
      socialLinks: targetUser.socialLinks || {},
    };

    return sendSuccess(res, {
      message: `Đã mô phỏng quét mã thành công với tài khoản: ${targetUser.name}`,
      data: { status: 'authenticated' },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Làm mới Access Token ngầm bằng Refresh Token (Silent Refresh Token)
 * Hỗ trợ xoay vòng Refresh Token (Token Rotation) và Fail-Closed khi có bất thường.
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: tokenInput } = req.body;
    if (!tokenInput || typeof tokenInput !== 'string' || tokenInput.length > 2048) {
      return sendError(res, {
        message: 'Refresh token không hợp lệ hoặc vượt quá độ dài cho phép',
        status: 400,
      });
    }

    let decoded;
    try {
      decoded = await verifyRefreshToken(tokenInput);
    } catch (err) {
      return sendError(res, {
        message: err.message || 'Refresh token không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại',
        status: 401,
      });
    }

    let user = null;
    if (isDbConnected && decoded.id && String(decoded.id).match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(decoded.id).select('-password');
    }

    if (!user) {
      const store = loadStore();
      user = (store.users || []).find((u) => String(u._id || u.id) === String(decoded.id));
    }

    if (!user) {
      return sendError(res, {
        message: 'Không tìm thấy thông tin tài khoản tương ứng với phiên làm việc',
        status: 401,
      });
    }

    const currentVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== currentVersion) {
      return sendError(res, {
        message: 'Phiên đăng nhập đã bị thu hồi hoặc đổi mật khẩu. Vui lòng đăng nhập lại!',
        status: 401,
      });
    }

    // Token Rotation: Thu hồi Refresh Token cũ và cấp mới cặp Access + Refresh Token
    revokeToken(tokenInput);

    const newAccessToken = await signAccessToken({
      id: user._id,
      role: user.role || 'user',
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      jobTitle: user.jobTitle,
      tokenVersion: currentVersion,
    });

    const newRefreshToken = await signRefreshToken({
      id: user._id,
      tokenVersion: currentVersion,
    });

    return sendSuccess(res, {
      message: 'Làm mới token xác thực thành công',
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role || 'user',
          jobTitle: user.jobTitle,
          avatar: user.avatar,
        },
      },
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi xử lý làm mới phiên đăng nhập',
      status: 500,
    });
  }
};

/**
 * Đăng xuất tài khoản hiện tại & Thu hồi Refresh Token (Revoke Session)
 */
export const logout = async (req, res) => {
  try {
    const { refreshToken: tokenInput } = req.body;
    if (tokenInput && typeof tokenInput === 'string' && tokenInput.length <= 2048) {
      revokeToken(tokenInput);
    }
    return sendSuccess(res, {
      message: 'Đăng xuất tài khoản thành công',
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi khi đăng xuất tài khoản',
      status: 500,
    });
  }
};

/**
 * Đăng xuất khỏi TẤT CẢ các thiết bị (Logout All Sessions)
 * Tăng tokenVersion lên 1 để vô hiệu hóa tức thời toàn bộ token trên mọi thiết bị
 */
export const logoutAll = async (req, res) => {
  try {
    const userId = req.user?._id;
    const userEmail = req.user?.email;

    if (isDbConnected && userId && String(userId).match(/^[0-9a-fA-F]{24}$/)) {
      await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
    }

    const store = loadStore();
    if (store.users) {
      const u = store.users.find(
        (user) =>
          String(user._id || user.id) === String(userId) ||
          (userEmail && user.email?.toLowerCase() === userEmail.toLowerCase())
      );
      if (u) {
        u.tokenVersion = (u.tokenVersion || 0) + 1;
        saveStore(store);
      }
    }

    return sendSuccess(res, {
      message: 'Đã thu hồi phiên đăng nhập trên toàn bộ thiết bị thành công. Vui lòng đăng nhập lại.',
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Lỗi khi thu hồi phiên trên toàn bộ thiết bị',
      status: 500,
    });
  }
};

/**
 * 🚀 Đăng nhập / Đăng ký qua Google Identity Services (Client-side ID Token Verification)
 * POST /api/auth/google
 * Body: { credential }
 */
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return sendError(res, {
        message: 'Thiếu Google credential ID token.',
        status: 400,
      });
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) {
      return sendError(res, {
        message: 'Máy chủ chưa được cấu hình biến môi trường GOOGLE_CLIENT_ID.',
        status: 500,
      });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return sendError(res, {
        message: 'Không thể xác thực thông tin tài khoản từ Google ID token.',
        status: 400,
      });
    }

    const { email, name, picture, sub: googleId } = payload;
    const cleanEmail = email.toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'anthonyq012025@gmail.com').toLowerCase().trim();
    const assignedRole = cleanEmail === adminEmail ? 'admin' : 'user';

    let existingGoogleUser = null;
    if (isDbConnected) {
      existingGoogleUser = await User.findOne({
        $or: [
          { email: cleanEmail },
          { providerId: googleId, authProvider: 'google' },
        ],
      });
    }
    const storeGoogleUser = findUserInStore(cleanEmail);
    const isGoogleAdmin = assignedRole === 'admin' || existingGoogleUser?.role === 'admin' || storeGoogleUser?.role === 'admin';

    // 🚨 BẪY BẢO MẬT: TỪ CHỐI TÀI KHOẢN ADMIN ĐĂNG NHẬP QUA CỔNG GOOGLE CỦA USER THƯỜNG
    if (isGoogleAdmin) {
      const telemetry = extractTelemetry(req);
      try {
        await AdminAuditLog.create({
          action: 'BLOCKED_AT_USER_PORTAL',
          email: cleanEmail,
          ip: telemetry.ip,
          location: telemetry.location,
          userAgent: telemetry.userAgent,
          timeVn: telemetry.timeVn,
          details: { attemptFrom: 'Google OAuth User Portal', reason: 'Admin Google account login attempt at user portal' },
        });
      } catch (_) {}
      sendAdminSecurityAlertEmail({
        action: 'BLOCKED_AT_USER_PORTAL',
        targetEmail: cleanEmail,
        ip: telemetry.ip,
        location: telemetry.location,
        userAgent: telemetry.userAgent,
        timeVn: telemetry.timeVn,
        details: { reason: 'Admin attempt via Google OAuth at regular user login portal' },
      }).catch(() => {});

      return sendError(res, {
        message: 'Đăng nhập không thành công. Vui lòng thử lại.',
        status: 401,
      });
    }

    const adminAvatar = '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg';
    const finalAvatar = (assignedRole === 'admin')
      ? adminAvatar
      : (picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80');

    let user = null;

    if (isDbConnected) {
      // Tìm tài khoản theo email hoặc theo cặp provider + providerId (googleId)
      user = await User.findOne({
        $or: [
          { email: cleanEmail },
          { providerId: googleId, authProvider: 'google' },
        ],
      });

      if (user) {
        // Hợp nhất tài khoản: cập nhật nếu chưa có
        if (name && (!user.name || user.name === 'Thành viên')) {
          user.name = name.trim();
        }
        if (picture && (!user.avatar || user.avatar.includes('/images/man.jpg'))) {
          user.avatar = finalAvatar;
        }
        if (!user.providerId) {
          user.providerId = googleId;
        }
        if (!user.authProvider || user.authProvider === 'local') {
          user.authProvider = 'google';
        }
        user.isVerified = true;
        await user.save();
      } else {
        // Tạo tài khoản người dùng mới
        user = await User.create({
          name: name ? name.trim() : 'Google User',
          email: cleanEmail,
          password: `google_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          role: assignedRole,
          authProvider: 'google',
          providerId: googleId,
          jobTitle: 'Thành viên cộng đồng',
          avatar: finalAvatar,
          coverImage: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
          bio: 'Đã kết nối tài khoản an toàn qua Google Identity Services.',
          isVerified: true,
        });
      }

      const tokenVersion = user.tokenVersion !== undefined ? user.tokenVersion : 0;
      const token = await signAccessToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
        tokenVersion,
      });
      const refreshToken = await signRefreshToken({
        id: user._id,
        tokenVersion,
      });

      const responseData = {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        customLayout: user.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
        profileMusic: user.profileMusic || {
          enabled: true,
          title: 'Lofi Chill - Đêm muộn ở văn phòng',
          artist: 'Freedom Chill Beat',
          sourceType: 'preset',
          presetId: 'lofi_night',
          url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        },
        socialLinks: user.socialLinks || {},
        authProvider: user.authProvider || 'google',
        token,
        refreshToken,
      };

      saveUserToStore(responseData);

      return sendSuccess(res, {
        message: 'Đăng nhập Google thành công!',
        data: responseData,
      });
    }

    // Mock store nếu DB không khả dụng
    const existingStoreUser = findUserInStore(cleanEmail);
    const targetId = existingStoreUser ? existingStoreUser._id : `u_google_${Date.now()}`;

    const mockUser = {
      ...(existingStoreUser || {}),
      _id: targetId,
      name: name ? name.trim() : (existingStoreUser?.name || 'Google User'),
      email: cleanEmail,
      role: existingStoreUser?.role || assignedRole,
      jobTitle: existingStoreUser?.jobTitle || 'Thành viên cộng đồng',
      avatar: finalAvatar,
      coverImage: existingStoreUser?.coverImage || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
      bio: existingStoreUser?.bio || 'Đã kết nối tài khoản an toàn qua Google Identity Services.',
      authProvider: 'google',
      providerId: googleId,
      isVerified: true,
      customLayout: existingStoreUser?.customLayout || { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
      profileMusic: existingStoreUser?.profileMusic || {
        enabled: true,
        title: 'Lofi Chill - Đêm muộn ở văn phòng',
        artist: 'Freedom Chill Beat',
        sourceType: 'preset',
        presetId: 'lofi_night',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      },
    };

    saveUserToStore(mockUser);

    const tokenVersion = mockUser.tokenVersion !== undefined ? mockUser.tokenVersion : 0;
    const token = await signAccessToken({
      id: mockUser._id,
      role: mockUser.role,
      name: mockUser.name,
      email: mockUser.email,
      tokenVersion,
    });
    const refreshToken = await signRefreshToken({
      id: mockUser._id,
      tokenVersion,
    });

    const responseData = {
      ...mockUser,
      token,
      refreshToken,
    };

    return sendSuccess(res, {
      message: 'Đăng nhập Google thành công!',
      data: responseData,
    });
  } catch (error) {
    console.error('[AUTH GOOGLE ERROR]:', error);
    return sendError(res, {
      message: error.message || 'Xác thực Google ID token thất bại.',
      status: 401,
    });
  }
};


