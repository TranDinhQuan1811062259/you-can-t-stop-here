import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Tiêu đề tâm sự/bài viết là bắt buộc'],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    summary: {
      type: String,
      required: [true, 'Tóm tắt bài viết là bắt buộc'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Nội dung tâm sự là bắt buộc'],
    },
    coverImage: {
      type: String,
      default: '/images/sun.jpg',
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Danh mục bài viết là bắt buộc'],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    author: {
      type: String,
      default: 'Ẩn danh',
    },
    authorJob: {
      type: String,
      default: 'Người đi làm',
    },
    authorAvatar: {
      type: String,
      default: '/images/man.jpg',
    },
    authorSocialLinks: {
      facebook: { type: String, default: '', trim: true },
      instagram: { type: String, default: '', trim: true },
      tiktok: { type: String, default: '', trim: true },
      x: { type: String, default: '', trim: true },
      linkedin: { type: String, default: '', trim: true },
      website: { type: String, default: '', trim: true },
    },
    views: {
      type: Number,
      default: 0,
    },
    cheersCount: {
      type: Number,
      default: 0,
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        userName: {
          type: String,
          default: 'Người dùng',
        },
        userAvatar: {
          type: String,
          default: '/images/man.jpg',
        },
        types: [
          {
            type: String,
            enum: ['sympathy', 'stop', 'love', 'encourage'],
          },
        ],
      },
    ],
    reactionCounts: {
      sympathy: { type: Number, default: 0 },
      stop: { type: Number, default: 0 },
      love: { type: Number, default: 0 },
      encourage: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    showReactionCount: {
      type: Boolean,
      default: true,
    },
    sharesCount: {
      type: Number,
      default: 0,
    },
    repostCount: {
      type: Number,
      default: 0,
    },
    repostedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        userName: {
          type: String,
          default: '',
        },
        userAvatar: {
          type: String,
          default: '/images/man.jpg',
        },
        repostedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    visibility: {
      type: String,
      enum: ['public', 'friends'],
      default: 'public',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    audioMood: {
      type: String,
      enum: ['auto', 'melancholic', 'uplifting', 'child', 'podcast', 'custom_voice'],
      default: 'auto',
    },
    voiceGender: {
      type: String,
      enum: ['female', 'male'],
      default: 'female',
    },
    voiceRegion: {
      type: String,
      enum: ['north', 'central', 'south'],
      default: 'north',
    },
    customVoiceProfile: {
      voiceName: { type: String, default: '' },
      sampleAudioUrl: { type: String, default: '' },
      pitch: { type: Number, default: 1.0 },
      rate: { type: Number, default: 1.0 },
      timbre: { type: String, default: 'authentic' },
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    flagReason: {
      type: String,
      default: '',
    },
    moderationStatus: {
      type: String,
      enum: ['approved', 'flagged', 'removed'],
      default: 'approved',
    },
  },
  {
    timestamps: true,
  }
);

// Tạo text index để hỗ trợ tìm kiếm toàn văn
postSchema.index({ title: 'text', summary: 'text', content: 'text' });

export default mongoose.model('Post', postSchema);
