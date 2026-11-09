import mongoose from 'mongoose';

const timeCapsuleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    guestId: {
      type: String,
      default: '',
      index: true,
    },
    creatorName: {
      type: String,
      default: 'Tôi của quá khứ',
      trim: true,
    },
    creatorAvatar: {
      type: String,
      default: '/images/man.jpg',
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề chiếc hộp thời gian là bắt buộc'],
      trim: true,
      maxlength: [120, 'Tiêu đề không quá 120 ký tự'],
    },
    content: {
      type: String,
      required: [true, 'Nội dung thư gửi tương lai là bắt buộc'],
    },
    mood: {
      type: String,
      enum: ['hopeful', 'anxious', 'tired', 'dreamer', 'peaceful'],
      default: 'hopeful',
    },
    envelopeColor: {
      type: String,
      default: 'amber', // 'amber' | 'emerald' | 'indigo' | 'rose' | 'slate'
    },
    musicTheme: {
      type: String,
      default: 'piano', // 'piano' | 'acoustic' | 'lofi' | 'silence'
    },
    unlockDate: {
      type: Date,
      required: [true, 'Thời gian mở khóa là bắt buộc'],
    },
    isOpened: {
      type: Boolean,
      default: false,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    notifyEmail: {
      type: String,
      default: '',
      trim: true,
      lowercase: true,
    },
    isEmailSent: {
      type: Boolean,
      default: false,
    },
    emailSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const TimeCapsule = mongoose.model('TimeCapsule', timeCapsuleSchema);
export default TimeCapsule;
