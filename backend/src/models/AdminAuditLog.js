import mongoose from 'mongoose';

const adminAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ['PORTAL_VISITED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'BLOCKED_AT_USER_PORTAL'],
      index: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
      index: true,
    },
    ip: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: 'Không xác định / Local',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
    timeVn: {
      type: String,
      default: '',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

adminAuditLogSchema.index({ createdAt: -1 });

const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);

export default AdminAuditLog;
