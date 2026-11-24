import mongoose from 'mongoose';

/**
 * Thống kê tương tác công khai cho các bản nhạc trên Freedom Web
 */
const trackStatSchema = new mongoose.Schema(
  {
    trackId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('TrackStat', trackStatSchema);
