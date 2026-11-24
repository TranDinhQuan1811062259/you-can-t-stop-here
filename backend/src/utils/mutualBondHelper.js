import mongoose from 'mongoose';
import MutualBond from '../models/MutualBond.js';
import { isDbConnected } from '../config/db.js';

/**
 * Công thức tính điểm thân thiết đối xứng 2 chiều:
 * Chống farm/spam tương tác một chiều. Điểm chỉ tăng mạnh khi CẢ HAI BÊN cùng có tương tác qua lại.
 */
export const computeMutualScore = (scoreA = 0, scoreB = 0) => {
  const a = Math.max(0, Number(scoreA) || 0);
  const b = Math.max(0, Number(scoreB) || 0);
  const minScore = Math.min(a, b);
  const diff = Math.abs(a - b);

  // 🛡️ CHỐNG FARM MỘT CHIỀU:
  // Nếu một bên hoàn toàn không tương tác lại (minScore === 0), điểm tối đa chỉ là 2 (không thể lên cấp Đồng Hành hay Tri Kỷ)
  if (minScore === 0) {
    return Math.min(2, Math.floor(diff * 0.05));
  }

  // Điểm hai chiều đối xứng là cốt lõi: 2 bên cùng tương tác (minScore * 2)
  // Phần chênh lệch (diff) chỉ được cộng thêm tối đa 15% diff nhưng bị chặn trần bởi 50% minScore để không bị thổi phồng một chiều
  const unbalanceBonus = Math.min(Math.floor(diff * 0.15), Math.floor(minScore * 0.5));
  return minScore * 2 + unbalanceBonus;
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

export const TIER_ORDER = {
  none: 0,
  acquaintance: 1, // Quen Biết 🤝
  companion: 2,    // Đồng Hành ✨
  close_friend: 3, // Thân Thiết 💫
  soulmate: 4,     // Tri Kỷ 🔥
};

/**
 * Ghi nhận tương tác tự động giữa 2 người dùng (Có chống spam cooldown & phát hiện thăng hạng)
 */
export const recordMutualInteraction = async ({
  fromUserId,
  toUserId,
  actionType = 'like',
  points = 1,
  postId = null,
  postTitle = '',
  snippet = '',
}) => {
  if (!fromUserId || !toUserId) return null;
  const fromStr = String(fromUserId);
  const toStr = String(toUserId);
  if (fromStr === toStr) return null; // Không tự tăng điểm với chính mình

  if (!isDbConnected) return null;

  // Tránh lỗi CastError nếu một trong các ID không phải ObjectId hợp lệ
  if (!mongoose.Types.ObjectId.isValid(fromUserId) || !mongoose.Types.ObjectId.isValid(toUserId)) {
    return null;
  }

  try {
    // Chuẩn hóa userA < userB
    const isFromSmaller = fromStr < toStr;
    const userA = isFromSmaller ? fromUserId : toUserId;
    const userB = isFromSmaller ? toUserId : fromUserId;

    let bond = await MutualBond.findOne({ userA, userB });
    const oldTier = bond ? (bond.tier || 'none') : 'none';

    const now = new Date();
    const cooldownPeriodMs = 30000; // 30 giây cooldown theo từng chiều tương tác

    if (!bond) {
      bond = new MutualBond({
        userA,
        userB,
        scoreAtoB: isFromSmaller ? points : 0,
        scoreBtoA: isFromSmaller ? 0 : points,
        lastInteractionAt: now,
        cooldownUntil: new Date(now.getTime() + cooldownPeriodMs),
        cooldownUserAUntil: isFromSmaller ? new Date(now.getTime() + cooldownPeriodMs) : null,
        cooldownUserBUntil: isFromSmaller ? null : new Date(now.getTime() + cooldownPeriodMs),
      });
    } else {
      // 🛡️ Cooldown phân luồng theo chiều người tương tác:
      // Người gửi (fromUser) bị giới hạn cooldown nhưng không chặn người nhận (toUser) phản hồi lại
      const userCooldown = isFromSmaller ? bond.cooldownUserAUntil : bond.cooldownUserBUntil;
      if (userCooldown && now < userCooldown) {
        return bond;
      }

      if (isFromSmaller) {
        bond.scoreAtoB = (bond.scoreAtoB || 0) + points;
        bond.cooldownUserAUntil = new Date(now.getTime() + cooldownPeriodMs);
      } else {
        bond.scoreBtoA = (bond.scoreBtoA || 0) + points;
        bond.cooldownUserBUntil = new Date(now.getTime() + cooldownPeriodMs);
      }
      bond.lastInteractionAt = now;
      bond.cooldownUntil = new Date(now.getTime() + cooldownPeriodMs);
    }

    bond.mutualScore = computeMutualScore(bond.scoreAtoB, bond.scoreBtoA);
    const newTierInfo = getBondTierInfo(bond.mutualScore);
    const newTier = newTierInfo.key;
    const isLevelUp = (TIER_ORDER[newTier] || 0) > (TIER_ORDER[oldTier] || 0);

    bond.tier = newTier;

    // 📖 LƯU MỐC KỶ NIỆM (MUTUAL MEMORIES TIMELINE - TỐI ĐA 15 MỐC MỚI NHẤT)
    if (!Array.isArray(bond.recentMemories)) {
      bond.recentMemories = [];
    }
    const memoryItem = {
      actorId: fromUserId,
      type: actionType === 'comment' ? 'comment' : 'reaction',
      actionDetail: actionType,
      postId: postId || null,
      postTitle: postTitle ? String(postTitle).trim().slice(0, 120) : '',
      snippet: snippet ? String(snippet).trim().slice(0, 160) : '',
      createdAt: now,
    };
    bond.recentMemories.unshift(memoryItem);
    if (bond.recentMemories.length > 15) {
      bond.recentMemories = bond.recentMemories.slice(0, 15);
    }

    await bond.save();

    // 🌟 PHÁT HIỆN THĂNG HẠNG THÂN THIẾT (BOND LEVEL-UP DELIGHT)
    if (isLevelUp) {
      try {
        const User = (await import('../models/User.js')).default;
        const partnerUser = await User.findById(toUserId).select('name avatar jobTitle').lean();
        bond.levelUpInfo = {
          tierKey: newTier,
          tierName: newTierInfo.name,
          badge: newTierInfo.name,
          partnerName: partnerUser?.name || 'Bạn đồng hành',
          partnerAvatar: partnerUser?.avatar || '',
          partnerId: String(toUserId),
          mutualScore: bond.mutualScore,
        };
      } catch (_) {}
    }

    return bond;
  } catch (err) {
    console.warn('[MutualBond] Lỗi ghi nhận tương tác:', err.message);
    return null;
  }
};
