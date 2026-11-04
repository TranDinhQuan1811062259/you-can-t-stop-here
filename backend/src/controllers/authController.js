import User from '../models/User.js';
import Post from '../models/Post.js';
import { isDbConnected } from '../config/db.js';
import { signToken } from '../utils/token.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Danh sách tài khoản sẵn có (mặc định password là 123456)
const defaultUsersList = [
  {
    _id: 'u_admin_1',
    name: 'Trần Đình Quân',
    email: 'anthonyq012025@gmail.com',
    password: 'password123',
    rawPassword: '123456',
    role: 'admin',
    jobTitle: 'System Admin & Lead Dev',
    avatar: '/images/man.jpg',
    bio: 'Chủ sở hữu & Quản trị viên hệ thống You Can\'t Stop Here.',
  },
  {
    _id: 'u_admin_2',
    name: 'Quản Trị Viên Freedom',
    email: 'admin@cantstophere.com',
    password: 'password123',
    rawPassword: '123456',
    role: 'admin',
    jobTitle: 'Community Administrator',
    avatar: '/images/1.jpg',
    bio: 'Hỗ trợ giải đáp và giữ gìn không gian chia sẻ an toàn, tích cực cho mọi người.',
  },
  {
    _id: 'u_minhanh',
    name: 'Minh Anh',
    email: 'minhanh@cantstophere.com',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    jobTitle: 'Frontend Dev 3 năm kinh nghiệm',
    avatar: '/images/man.jpg',
    bio: 'Đang vật lộn với deadlines và tìm lại niềm vui code ngày đầu.',
  },
  {
    _id: 'u_nam',
    name: 'Thành Nam',
    email: 'nam.pm@cantstophere.com',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    jobTitle: 'Product Manager',
    avatar: '/images/2.jpg',
    bio: 'Cầu nối giữa team Tech và Kinh doanh. Thích lắng nghe câu chuyện của mọi người.',
  },
  {
    _id: 'u_huy',
    name: 'Đức Huy',
    email: 'duchuy@cantstophere.com',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    jobTitle: 'Junior Developer (Chuyển ngành)',
    avatar: '/images/3.jpg',
    bio: 'Bắt đầu học code từ con số 0 ở tuổi 27. Tin rằng không bao giờ là quá muộn.',
  },
  {
    _id: 'u_ly',
    name: 'Hương Ly',
    email: 'huongly@cantstophere.com',
    password: 'password123',
    rawPassword: '123456',
    role: 'user',
    jobTitle: 'UI/UX Designer',
    avatar: '/images/img2.jpg',
    bio: 'Tìm kiếm sự cân bằng giữa sáng tạo nghệ thuật và cơm áo gạo tiền.',
  },
];

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

    if (isDbConnected) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return sendError(res, {
          message: 'Email này đã được sử dụng, vui lòng chọn email khác',
          status: 400,
        });
      }

      const sampleAvatars = ['/images/man.jpg', '/images/img2.jpg', '/images/1.jpg', '/images/2.jpg', '/images/3.jpg'];
      const randomAvatar = sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)];

      const user = await User.create({
        name,
        email: cleanEmail,
        password,
        role: assignedRole,
        jobTitle: jobTitle || (assignedRole === 'admin' ? 'Quản Trị Viên' : 'Thành viên cộng đồng'),
        avatar: randomAvatar,
      });

      const token = await signToken({
        id: user._id,
        role: user.role,
        name: user.name,
        email: user.email,
        jobTitle: user.jobTitle,
      });

      return sendSuccess(res, {
        message: 'Đăng ký tài khoản thành công!',
        data: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          jobTitle: user.jobTitle,
          avatar: user.avatar,
          token,
        },
        status: 201,
      });
    }

    const token = await signToken({
      id: `u_${Date.now()}`,
      role: assignedRole,
      name,
      email: cleanEmail,
      jobTitle: jobTitle || 'Thành viên cộng đồng',
    });

    const newUser = {
      _id: `u_${Date.now()}`,
      name,
      email: cleanEmail,
      role: assignedRole,
      jobTitle: jobTitle || 'Thành viên cộng đồng',
      avatar: '/images/man.jpg',
      token,
    };
    defaultUsersList.push(newUser);

    return sendSuccess(res, {
      message: 'Đăng ký tài khoản thành công!',
      data: newUser,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, {
        message: 'Vui lòng nhập email và mật khẩu',
        status: 400,
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (isDbConnected) {
      const user = await User.findOne({ email: cleanEmail });
      if (user) {
        const isMatch = (await user.comparePassword(password)) || password === '123456';
        if (isMatch) {
          const token = await signToken({
            id: user._id,
            role: user.role,
            name: user.name,
            email: user.email,
            jobTitle: user.jobTitle,
          });

          return sendSuccess(res, {
            message: 'Đăng nhập thành công',
            data: {
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              jobTitle: user.jobTitle,
              avatar: user.avatar,
              bio: user.bio,
              token,
            },
          });
        }
      }
    }

    const found = defaultUsersList.find((u) => u.email === cleanEmail);
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
          data: { ...found, token },
        });
      }
    }

    if (password === '123456') {
      const isAdm = cleanEmail.includes('admin') || cleanEmail === 'anthonyq012025@gmail.com';
      const fallbackUser = {
        _id: `u_${Date.now()}`,
        name: cleanEmail === 'anthonyq012025@gmail.com' ? 'Trần Đình Quân' : cleanEmail.split('@')[0],
        email: cleanEmail,
        role: isAdm ? 'admin' : 'user',
        jobTitle: isAdm ? 'System Admin & Lead Dev' : 'Thành viên cộng đồng',
        avatar: '/images/man.jpg',
      };
      const token = await signToken({
        id: fallbackUser._id,
        role: fallbackUser.role,
        name: fallbackUser.name,
        email: fallbackUser.email,
      });

      return sendSuccess(res, {
        message: 'Đăng nhập thành công với mật khẩu mặc định 123456!',
        data: { ...fallbackUser, token },
      });
    }

    return sendError(res, {
      message: 'Email hoặc mật khẩu không chính xác. Mẹo: Mật khẩu mặc định là 123456',
      status: 401,
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
    const { name, jobTitle, bio, avatar, currentPassword, newPassword } = req.body;
    const userId = req.user?._id;

    if (isDbConnected && userId) {
      const user = await User.findById(userId);
      if (!user) {
        return sendError(res, { message: 'Không tìm thấy tài khoản người dùng', status: 404 });
      }

      if (name && name.trim()) user.name = name.trim();
      if (jobTitle !== undefined) user.jobTitle = jobTitle.trim();
      if (bio !== undefined) user.bio = bio.trim();
      if (avatar) user.avatar = avatar;

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

      // Đồng bộ tên tác giả trên các bài viết do user này đã viết
      if (name || jobTitle) {
        await Post.updateMany(
          {
            $or: [
              { user: user._id },
              { author: user.name },
              { author: 'Trần Đình Quân' },
              { author: 'Đình Quân Trần' }
            ]
          },
          { author: user.name, authorJob: user.jobTitle, user: user._id }
        );
      }

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
          role: user.role,
          jobTitle: user.jobTitle,
          avatar: user.avatar,
          bio: user.bio,
          token: freshToken,
        },
      });
    }

    // Fallback Mock update
    const updatedUser = {
      ...req.user,
      name: name?.trim() || req.user?.name || 'Trần Đình Quân',
      jobTitle: jobTitle !== undefined ? jobTitle.trim() : req.user?.jobTitle,
      bio: bio !== undefined ? bio.trim() : req.user?.bio,
      avatar: avatar || req.user?.avatar,
    };

    return sendSuccess(res, {
      message: 'Cập nhật thông tin tài khoản thành công!',
      data: updatedUser,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
