import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: String,
      required: true,
      index: true,
    },
    sender: {
      _id: { type: String, required: true },
      name: { type: String, default: 'Thành viên' },
      avatar: { type: String, default: '' },
      jobTitle: { type: String, default: 'Thành viên cộng đồng' },
      role: { type: String, default: 'user' },
    },
    type: {
      type: String,
      enum: [
        'friend_request',
        'friend_accept',
        'message',
        'reaction',
        'comment',
        'share',
        'system',
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    post: {
      _id: { type: String },
      title: { type: String },
      slug: { type: String },
      coverImage: { type: String },
    },
    conversationId: {
      type: String,
    },
    reactionType: {
      type: String, // 'sympathy', 'stop', 'love', 'encourage'
    },
    commentContent: {
      type: String,
    },
    actionStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'none'],
      default: 'none',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
