import mongoose from 'mongoose';
import { hashPassword, comparePassword } from '../utils/hash.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập họ tên hoặc biệt danh'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    jobTitle: {
      type: String,
      default: 'Thành viên cộng đồng',
      trim: true,
    },
    avatar: {
      type: String,
      default: '/images/man.jpg',
    },
    bio: {
      type: String,
      default: 'Chỉ là một người đang cố gắng mỗi ngày trong công việc.',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password trước khi lưu
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await hashPassword(this.password);
  next();
});

// So sánh mật khẩu
userSchema.methods.comparePassword = async function (candidatePassword) {
  return comparePassword(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
