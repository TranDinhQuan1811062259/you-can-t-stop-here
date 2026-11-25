import mongoose from 'mongoose';

const otpTokenSchema = new mongoose.Schema(
  {
    target: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['email', 'phone'],
      default: 'email',
    },
    purpose: {
      type: String,
      default: 'login',
      trim: true,
      lowercase: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    pendingName: {
      type: String,
      default: '',
      trim: true,
    },
    pendingPasswordHash: {
      type: String,
      default: '',
    },
    pendingJobTitle: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

otpTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OtpToken', otpTokenSchema);
