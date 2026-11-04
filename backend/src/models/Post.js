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
    views: {
      type: Number,
      default: 0,
    },
    cheersCount: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo text index để hỗ trợ tìm kiếm toàn văn
postSchema.index({ title: 'text', summary: 'text', content: 'text' });

export default mongoose.model('Post', postSchema);
