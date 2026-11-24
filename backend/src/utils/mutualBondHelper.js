import MutualBond from '../models/MutualBond.js';
import { isDbConnected } from '../config/db.js';

/**
 * Công thức tính điểm thân thiết đối xứng 2 chiều:
 * Chỉ khi CẢ HAI BÊN cùng có tương tác qua lại thì điểm mới tăng cao
 */
export const computeMutualScore = (scoreA = 0, scoreB = 0) => {
  const a = Math.max(0, Number(scoreA) || 0);
  const b = Math.max(0, Number(scoreB) || 0);
  const minScore = Math.min(a, b);
  const diff = Math.abs(a - b);
  return minScore * 2 + Math.floor(diff * 0.2);
};

/**
 * Lấy thông tin cấp bậc theo điểm số
 */
export const getBondTierInfo = (score = 0) => {
  const s = Math.max(0, Number(score) || 0);
  if (s >= 70) {
    return {
      key: 'soulmate',
      name: 'Tri Kỷ 🔥',
      min: 70,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: 'rgba(245, 158, 11, 0.4)',
      desc: 'Sự gắn kết sâu sắc và thấu hiểu lẫn nhau qua thời gian dài.',
    };
  }
  if (s >= 35) {
    return {
      key: 'close_friend',
      name: 'Thân Thiết 💫',
      min: 35,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.15)',
      border: 'rgba(56, 189, 248, 0.4)',
      desc: 'Những người bạn thường xuyên sẻ chia và ủng hộ nhau trong cuộc sống.',
    };
  }
  if (s >= 15) {
    return {
      key: 'companion',
      name: 'Đồng Hành ✨',
      min: 15,
      color: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.15)',
      border: 'rgba(168, 85, 247, 0.4)',
      desc: 'Cùng nhau tiến bước và để lại những lời động viên tích cực.',
    };
  }
  if (s >= 5) {
    return {
      key: 'acquaintance',
      name: 'Quen Biết 🤝',
      min: 5,
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.15)',
      border: 'rgba(34, 197, 94, 0.4)',
      desc: 'Đã bắt đầu có những tương tác đầu tiên cùng nhau trên nền tảng.',
    };
  }
  return {
    key: 'none',
    name: 'Mới Kết Nối 🌱',
    min: 0,
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.3)',
    desc: 'Chưa có nhiều tương tác qua lại.',
  };
};

/**
 * Ghi nhận tương tác tự động giữa 2 người dùng (Có chống spam cooldown)
 */
export const recordMutualInteraction = async ({
  fromUserId,
  toUserId,
  actionType = 'like',
  points = 1,
}) => {
  if (!fromUserId || !toUserId) return null;
  const fromStr = String(fromUserId);
  const toStr = String(toUserId);
  if (fromStr === toStr) return null; // Không tự tăng điểm với chính mình

  if (!isDbConnected) return null;

  try {
    // Chuẩn hóa userA < userB
    const isFromSmaller = fromStr < toStr;
    const userA = isFromSmaller ? fromUserId : toUserId;
    const userB = isFromSmaller ? toUserId : fromUserId;

    let bond = await MutualBond.findOne({ userA, userB });

    const now = new Date();

    if (!bond) {
      bond = new MutualBond({
        userA,
        userB,
        scoreAtoB: isFromSmaller ? points : 0,
        scoreBtoA: isFromSmaller ? 0 : points,
        lastInteractionAt: now,
        cooldownUntil: new Date(now.getTime() + 45000), // 45 giây cooldown
      });
    } else {
      // Kiểm tra cooldown chống spam lặp
      if (bond.cooldownUntil && now < bond.cooldownUntil) {
        return bond;
      }

      if (isFromSmaller) {
        bond.scoreAtoB = (bond.scoreAtoB || 0) + points;
      } else {
        bond.scoreBtoA = (bond.scoreBtoA || 0) + points;
      }
      bond.lastInteractionAt = now;
      bond.cooldownUntil = new Date(now.getTime() + 45000);
    }

    bond.mutualScore = computeMutualScore(bond.scoreAtoB, bond.scoreBtoA);
    bond.tier = getBondTierInfo(bond.mutualScore).key;

    await bond.save();
    return bond;
  } catch (err) {
    console.warn('[MutualBond] Lỗi ghi nhận tương tác:', err.message);
    return null;
  }
};
