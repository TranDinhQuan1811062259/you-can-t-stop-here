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
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.authProvider || this.authProvider === 'local';
      },
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Trạng thái kích hoạt và mã OTP cho luồng đăng ký bằng email
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'facebook', 'x', 'linkedin', 'github'],
      default: 'local',
    },
    providerId: {
      type: String,
      default: '',
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
    coverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
    },
    bio: {
      type: String,
      default: 'Chỉ là một người đang cố gắng mỗi ngày trong công việc.',
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    allowStrangerNotifications: {
      type: Boolean,
      default: true,
    },
    chatStatus: {
      type: String,
      enum: ['online', 'busy', 'offline'],
      default: 'online',
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    socialLinks: {
      facebook: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
      tiktok: { type: String, default: '', trim: true },
      x: { type: String, default: '', trim: true },
      linkedin: { type: String, default: '', trim: true },
      github: { type: String, default: '', trim: true },
      website: { type: String, default: '', trim: true },
    },
    customLayout: {
      theme: { type: String, default: 'default' },
      bgGradient: { type: String, default: '' },
      bgColor: { type: String, default: '' },
      frameStyle: { type: String, default: 'none' },
      ambientEffect: { type: String, default: 'particles' },
    },
    profileMusic: {
      enabled: { type: Boolean, default: true },
      title: { type: String, default: 'Lofi Chill - Đêm muộn ở văn phòng' },
      artist: { type: String, default: "You Can't Stop Here Chill Room" },
      sourceType: {
        type: String,
        enum: ['preset', 'youtube', 'soundcloud', 'tiktok', 'custom'],
        default: 'preset',
      },
      url: {
        type: String,
        default: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
      },
      presetId: { type: String, default: 'lofi_night' },
    },
    customVoiceProfile: {
      enabled: { type: Boolean, default: false },
      voiceName: { type: String, default: 'Giọng đọc chính chủ của tôi' },
      sampleAudioUrl: { type: String, default: '' },
      pitch: { type: Number, default: 1.0 },
      rate: { type: Number, default: 1.0 },
      timbre: { type: String, default: 'authentic' },
      recordedAt: { type: Date },
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
