import mongoose from 'mongoose';

const mutualBondSchema = new mongoose.Schema(
  {
    // Chuẩn hóa thứ tự ID: userA luôn nhỏ hơn userB theo string comparison
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Điểm userA tương tác lên bài viết/bình luận của userB
    scoreAtoB: {
      type: Number,
      default: 0,
    },
    // Điểm userB tương tác lên bài viết/bình luận của userA
    scoreBtoA: {
      type: Number,
      default: 0,
    },
    // Điểm thân thiết 2 chiều tổng hợp: Math.min(scoreA, scoreB) * 2 + Math.floor(Math.abs(scoreA - scoreB) * 0.2)
    mutualScore: {
      type: Number,
      default: 0,
      index: true,
    },
    // Cấp bậc thân thiết: 'none', 'acquaintance', 'companion', 'close_friend', 'soulmate'
    tier: {
      type: String,
      enum: ['none', 'acquaintance', 'companion', 'close_friend', 'soulmate'],
      default: 'none',
    },
    lastInteractionAt: {
      type: Date,
      default: Date.now,
    },
    cooldownUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Đảm bảo mỗi cặp User chỉ có duy nhất 1 bản ghi MutualBond đối xứng
mutualBondSchema.index({ userA: 1, userB: 1 }, { unique: true });

const MutualBond = mongoose.model('MutualBond', mutualBondSchema);

export default MutualBond;
