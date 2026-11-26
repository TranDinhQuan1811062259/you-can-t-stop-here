import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ['login', 'register', 'admin_gate'],
      default: 'login',
      lowercase: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetType: {
      type: String,
      enum: ['email', 'phone'],
      default: 'email',
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

otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OtpVerification', otpVerificationSchema);
