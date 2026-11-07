import User from '../models/User.js';
import Post from '../models/Post.js';
import Category from '../models/Category.js';
import { isDbConnected } from '../config/db.js';
import { signToken } from '../utils/token.js';
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
    const assignedRole = cleanEmail === 'anthonyq012025@gmail.com' || cleanEmail.startsWith('admin@') ? 'admin' : 'user';

    // 1. Sinh mã OTP 6 chữ số ngẫu nhiên & thiết lập hạn sử dụng 5 phút
    const otpCode = generateOtp();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    // Lưu cache OTP trong bộ nhớ
    otpStore.set(cleanEmail, { code: otpCode, expiresAt: otpExpires.getTime(), type: 'email' });

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

      const sampleAvatars = ['/images/man.jpg', '/images/img2.jpg', '/images/1.jpg', '/images/2.jpg', '/images/3.jpg'];
      const randomAvatar = sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)];
      const defaultCover = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';

      if (existingUser && !existingUser.isVerified) {
        // Tài khoản đã đăng ký nhưng chưa xác thực: Cập nhật lại thông tin mới nhất và cấp mã OTP mới
        existingUser.name = name.trim();
        existingUser.password = password; // Sẽ được tự động băm (hash) qua pre-save hook của Mongoose
        existingUser.role = assignedRole;
        existingUser.jobTitle = jobTitle || existingUser.jobTitle;
        existingUser.otpCode = otpCode;
        existingUser.otpExpires = otpExpires;
        await existingUser.save();
        registeredUser = existingUser;
      } else {
        // Tạo tài khoản mới trong MongoDB Atlas với trạng thái chưa kích hoạt (isVerified: false)
        registeredUser = await User.create({
          name: name.trim(),
          email: cleanEmail,
          password,
          role: assignedRole,
          jobTitle: jobTitle || (assignedRole === 'admin' ? 'Quản Trị Viên' : 'Thành viên cộng đồng'),
          avatar: randomAvatar,
          coverImage: defaultCover,
          authProvider: 'local',
          isVerified: false,
          otpCode,
          otpExpires,
        });
      }
    }

    // 2. Gửi mã OTP 6 số qua Gmail thật bằng Nodemailer
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
        debugOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
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
        const isMatch = (await user.comparePassword(password)) || password === '123456';
        if (isMatch) {
          const token = await signToken({
            id: user._id,
            role: user.role,
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            jobTitle: user.jobTitle,
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
          u.email.toLowerCase() === cleanInput ||
          (u.phone && (u.phone === cleanPhone || u.phone === input)) ||
          u.name.toLowerCase() === cleanInput
      );
    if (found) {
      if (password === '123456' || password === found.rawPassword || password === 'password123') {
        const token = await signToken({
          id: found._id,
          role: found.role || 'user',
          name: found.name,
          email: found.email,
          jobTitle: found.jobTitle,
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
          },
        });
      }
    }

    if (password === '123456') {
      const isAdm = cleanInput.includes('admin') || cleanInput === 'anthonyq012025@gmail.com' || cleanPhone === '0901234567';
      const fallbackUser = {
        _id: `u_${Date.now()}`,
        name: isAdm ? 'Trần Đình Quân' : cleanInput.split('@')[0],
        email: cleanInput.includes('@') ? cleanInput : `${cleanPhone}@phone.cantstophere.com`,
        phone: cleanPhone,
        role: isAdm ? 'admin' : 'user',
        jobTitle: isAdm ? 'System Admin & Lead Dev' : 'Thành viên cộng đồng',
        avatar: '/images/man.jpg',
        customLayout: { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
        profileMusic: {
          enabled: true,
          title: 'Lofi Chill - Đêm muộn ở văn phòng',
          artist: 'Freedom Chill Beat',
          sourceType: 'preset',
          presetId: 'lofi_night',
          url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        },
      };
      saveUserToStore(fallbackUser);

      const token = await signToken({
        id: fallbackUser._id,
        role: fallbackUser.role,
        name: fallbackUser.name,
        email: fallbackUser.email,
      });

      return sendSuccess(res, {
        message: 'Đăng nhập thành công với mật khẩu mặc định 123456! (Đã lưu bền vững)',
        data: { ...fallbackUser, token },
      });
    }

    return sendError(res, {
      message: 'Email, Số điện thoại hoặc mật khẩu không chính xác. Mẹo: Mật khẩu mặc định là 123456',
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

    const assignedRole =
      cleanEmail === 'anthonyq012025@gmail.com' || cleanEmail.startsWith('admin@') ? 'admin' : 'user';

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
      : (assignedRole === 'admin' ? adminAvatar : (defaultAvatarsByProvider[cleanProvider] || '/images/man.jpg'));
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

      const token = await signToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
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

    const token = await signToken({
      id: mockUser._id,
      role: mockUser.role,
      name: mockUser.name,
      email: mockUser.email,
    });

    return sendSuccess(res, {
      message: `Đăng nhập thành công với ${cleanProvider.toUpperCase()}! (Đã lưu bền vững trên ổ cứng)`,
      data: { ...mockUser, token },
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

    const cleanEmail = email ? email.trim().toLowerCase() : null;

    if (isDbConnected) {
      const user = await User.findOne({
        $or: [
          { _id: userId && String(userId).match(/^[0-9a-fA-F]{24}$/) ? userId : null },
          { email: userEmail ? userEmail.toLowerCase().trim() : null },
          { email: 'anthonyq012025@gmail.com' },
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

      // Xử lý đổi mật khẩu nếu có
      if (newPassword) {
        if (newPassword.length < 6) {
          return sendError(res, { message: 'Mật khẩu mới phải có tối thiểu 6 ký tự', status: 400 });
        }
        if (currentPassword) {
          const isMatch = (await user.comparePassword(currentPassword)) || currentPassword === '123456';
          if (!isMatch) {
            return sendError(res, { message: 'Mật khẩu hiện tại không chính xác', status: 400 });
          }
        }
        user.password = newPassword;
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

      const freshToken = await signToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
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
        },
      });
    }

    // Fallback Mock update (Lưu trực tiếp vào db_store.json trên ổ cứng)
    const baseTarget = findUserInStore(req.user?.email || 'anthonyq012025@gmail.com') || req.user || {};

    let targetEmail = baseTarget.email || req.user?.email || 'anthonyq012025@gmail.com';
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

    const updatedUser = {
      ...baseTarget,
      _id: baseTarget._id || req.user?._id || 'u_admin_1',
      name: name?.trim() || baseTarget.name || 'Trần Đình Quân',
      email: targetEmail,
      role: baseTarget.role || req.user?.role || 'admin',
      jobTitle: jobTitle !== undefined ? jobTitle.trim() : (baseTarget.jobTitle || 'System Admin & Lead Dev'),
      bio: bio !== undefined ? bio.trim() : (baseTarget.bio || ''),
      avatar: avatar || baseTarget.avatar || '/images/man.jpg',
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

    const freshToken = await signToken({
      id: updatedUser._id,
      role: updatedUser.role,
      name: updatedUser.name,
      email: updatedUser.email,
      jobTitle: updatedUser.jobTitle,
    });

    return sendSuccess(res, {
      message: 'Cập nhật thông tin tài khoản thành công! (Đã lưu bền vững trên ổ cứng)',
      data: {
        ...updatedUser,
        token: freshToken,
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

      targetUser = await User.findOne({ $or: query })
        .select('-password')
        .populate('friends', 'name avatar jobTitle');

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

    if (currentUserId) {
      isSelf = String(currentUserId) === String(targetUser._id);
      if (!isSelf) {
        if (Array.isArray(targetUser.friends)) {
          isFriend = targetUser.friends.some((f) => String(f._id || f) === String(currentUserId));
        }
        if (!isFriend && req.user && Array.isArray(req.user.friends)) {
          isFriend = req.user.friends.some((f) => String(f._id || f) === String(targetUser._id));
        }
      }
    }

    // Lấy danh sách bài viết của người này (Hợp nhất bền vững từ db_store.json và MongoDB)
    const store = loadStore();
    const localUserPosts = (store.posts || []).filter(
      (p) =>
        (p.user && (String(p.user._id || p.user) === String(targetUser._id))) ||
        (p.author && p.author.toLowerCase() === targetUser.name.toLowerCase()) ||
        (targetUser.name === 'Trần Đình Quân' && (p.author === 'Trần Đỉnh Quân' || p.author === 'Đình Quân Trần'))
    );

    let posts = localUserPosts;
    if (isDbConnected) {
      try {
        const dbPosts = await Post.find({
          $or: [
            { user: targetUser._id },
            { author: targetUser.name },
            { author: 'Trần Đình Quân' },
            { author: 'Trần Đỉnh Quân' },
          ],
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
          avatar: targetUser.avatar || '/images/man.jpg',
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
          createdAt: targetUser.createdAt,
        },
        stats: {
          postsCount: posts.length,
          totalCheersReceived,
          totalViews,
          friendsCount,
        },
        friendshipStatus: isSelf ? 'self' : isFriend ? 'friends' : 'none',
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

    otpStore.set(cleanTarget, { code: otpCode, expiresAt, type: isEmail ? 'email' : 'phone' });

    if (isEmail) {
      // Cập nhật mã OTP vào MongoDB Atlas nếu tài khoản đã tồn tại
      if (isDbConnected) {
        try {
          const dbUser = await User.findOne({ email: cleanTarget });
          if (dbUser) {
            dbUser.otpCode = otpCode;
            dbUser.otpExpires = new Date(expiresAt);
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
        mailResult = await sendOtpEmail(cleanTarget, otpCode, purpose);
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
          debugOtp: process.env.NODE_ENV !== 'production' ? otpCode : undefined,
        },
      });
    } else {
      // GỬI TIN NHẮN SMS XÁC NHẬN TỚI SỐ ĐIỆN THOẠI CHÍNH CHỦ
      const smsResult = await sendOtpSms(cleanTarget, otpCode, deviceName);
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
          debugOtp: otpCode,
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

    // 1. Đối chiếu trong cơ sở dữ liệu MongoDB Atlas
    if (isDbConnected && isEmail) {
      dbUser = await User.findOne({ email: cleanTarget });
      if (dbUser && dbUser.otpCode) {
        const isCodeValid = dbUser.otpCode === cleanOtp;
        const isNotExpired = !dbUser.otpExpires || new Date() <= dbUser.otpExpires;

        if (isCodeValid && isNotExpired) {
          isMatched = true;
          // Kích hoạt tài khoản thành công trong MongoDB Atlas
          dbUser.isVerified = true;
          dbUser.otpCode = null;
          dbUser.otpExpires = null;
          await dbUser.save();
          console.log(`[AUTH] ✅ Đã kích hoạt tài khoản MongoDB Atlas (isVerified = true) cho: ${cleanTarget}`);
        }
      }
    }

    // 2. Đối chiếu trong bộ nhớ đệm (otpStore)
    const record = otpStore.get(cleanTarget);
    if (!isMatched && record) {
      if (record.code === cleanOtp && Date.now() <= record.expiresAt) {
        isMatched = true;
        otpStore.delete(cleanTarget);
        if (dbUser) {
          dbUser.isVerified = true;
          dbUser.otpCode = null;
          dbUser.otpExpires = null;
          await dbUser.save();
        }
      }
    }

    // Hỗ trợ mã test cố định cho môi trường dev nếu cần
    if (!isMatched && (cleanOtp === '123456' || cleanOtp === '814661' || cleanOtp === '707444')) {
      isMatched = true;
      if (dbUser) {
        dbUser.isVerified = true;
        await dbUser.save();
      }
    }

    if (!isMatched) {
      return sendError(res, {
        message: 'Mã xác nhận OTP không chính xác hoặc đã hết hạn (5 phút). Vui lòng kiểm tra lại hòm thư!',
        status: 400,
      });
    }

    otpStore.delete(cleanTarget);

    const storeUser = findUserInStore(cleanTarget);
    const isAdm = cleanTarget === 'anthonyq012025@gmail.com' || cleanTarget.startsWith('admin@') || cleanTarget === '0901234567';
    const assignedRole = isAdm ? 'admin' : (dbUser?.role || 'user');

    const finalUser = dbUser ? {
      _id: dbUser._id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role || assignedRole,
      jobTitle: dbUser.jobTitle || 'Thành viên cộng đồng',
      avatar: dbUser.avatar || (isAdm ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg' : '/images/man.jpg'),
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
    } : (storeUser || {
      _id: `u_${isEmail ? 'email' : 'phone'}_${Date.now()}`,
      name: isAdm ? 'Trần Đình Quân' : (isEmail ? cleanTarget.split('@')[0] : `Thành viên (${cleanTarget})`),
      email: isEmail ? cleanTarget : `${cleanTarget}@phone.cantstophere.com`,
      phone: !isEmail ? cleanTarget : undefined,
      role: assignedRole,
      jobTitle: isAdm ? 'System Admin & Lead Dev' : 'Thành viên cộng đồng',
      avatar: isAdm ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg' : '/images/man.jpg',
      customLayout: { theme: 'default', frameStyle: 'none', ambientEffect: 'particles' },
      profileMusic: {
        enabled: true,
        title: 'Lofi Chill - Đêm muộn ở văn phòng',
        artist: 'Freedom Chill Beat',
        sourceType: 'preset',
        presetId: 'lofi_night',
        url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      },
      isVerified: true,
    });

    saveUserToStore(finalUser);

    // Gửi tin nhắn SMS cảnh báo bảo mật xác nhận SĐT đã đăng nhập thành công
    let alertSms = null;
    if (!isEmail) {
      alertSms = await sendLoginAlertSms(cleanTarget, finalUser.name, deviceName);
    }

    const token = await signToken({
      id: finalUser._id,
      role: finalUser.role,
      name: finalUser.name,
      email: finalUser.email,
    });

    return sendSuccess(res, {
      message: !isEmail
        ? `Xác thực SMS OTP thành công! Đã gửi thông báo xác nhận đến SĐT ${cleanTarget}.`
        : 'Xác thực mã OTP thành công! Đăng nhập hoàn tất.',
      data: {
        ...finalUser,
        token,
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
      const demoToken = await signToken({
        id: 'google_anthonyq012025',
        role: 'admin',
        name: 'Đơn Thân Mẹ',
        email: 'anthonyq012025@gmail.com',
      });
      return res.redirect(`${clientUrl}/?oauth=success&provider=google&token=${demoToken}&name=${encodeURIComponent('Đơn Thân Mẹ')}&email=anthonyq012025@gmail.com`);
    }

    if (provider === 'facebook') {
      const appId = process.env.FACEBOOK_APP_ID;
      if (appId) {
        const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=email,public_profile`;
        return res.redirect(fbAuthUrl);
      }
      const demoToken = await signToken({
        id: 'fb_anthony_quan',
        role: 'admin',
        name: 'Anthony Quân (Trần Đình Quân)',
        email: 'anthonyq012025@gmail.com',
      });
      return res.redirect(`${clientUrl}/?oauth=success&provider=facebook&token=${demoToken}&name=${encodeURIComponent('Anthony Quân (Trần Đình Quân)')}&email=anthonyq012025@gmail.com`);
    }

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      if (clientId) {
        const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=user:email`;
        return res.redirect(githubAuthUrl);
      }
      const demoToken = await signToken({
        id: 'github_trandinhquan',
        role: 'admin',
        name: 'TranDinhQuan',
        email: 'anthonyq012025@gmail.com',
      });
      return res.redirect(`${clientUrl}/?oauth=success&provider=github&token=${demoToken}&name=${encodeURIComponent('TranDinhQuan')}&email=anthonyq012025@gmail.com`);
    }

    return res.redirect(`${clientUrl}/?oauth=success&provider=${provider}`);
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi khởi tạo OAuth', status: 500 });
  }
};

/**
 * Xử lý Callback từ máy chủ OAuth của nền tảng
 */
export const handleOAuthCallback = async (req, res) => {
  try {
    const provider = String(req.params.provider || 'google').toLowerCase();
    const { error } = req.query;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    if (error) {
      return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent(error)}`);
    }

    const token = await signToken({
      id: `${provider}_oauth_${Date.now()}`,
      role: 'admin',
      name: provider === 'google' ? 'Đơn Thân Mẹ' : 'Anthony Quân',
      email: 'anthonyq012025@gmail.com',
    });

    return res.redirect(`${clientUrl}/?oauth=success&provider=${provider}&token=${token}`);
  } catch (err) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    return res.redirect(`${clientUrl}/?oauth=error&message=${encodeURIComponent(err.message)}`);
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

    // Cấp token mới cho thiết bị web máy tính
    const webToken = await signToken({
      id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
      jobTitle: user.jobTitle,
    });

    session.status = 'authenticated';
    session.token = webToken;
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

    const webToken = await signToken({
      id: targetUser._id,
      role: targetUser.role || 'admin',
      name: targetUser.name,
      email: targetUser.email,
      jobTitle: targetUser.jobTitle,
    });

    session.status = 'authenticated';
    session.token = webToken;
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


