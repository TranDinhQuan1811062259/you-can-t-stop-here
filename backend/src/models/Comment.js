import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Nội dung bình luận không được để trống'],
      trim: true,
    },
    cheerType: {
      type: String,
      enum: ['encourage', 'hug', 'advice', 'general'],
      default: 'encourage',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Comment', commentSchema);

