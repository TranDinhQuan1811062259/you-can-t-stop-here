import mongoose from 'mongoose';
import User from '../models/User.js';
import TrackStat from '../models/TrackStat.js';
import MutualBond from '../models/MutualBond.js';
import { getBondTierInfo } from '../utils/mutualBondHelper.js';
import { isDbConnected } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { saveUserToStore } from '../utils/persistentStore.js';

/**
 * Tiện ích lấy định dạng YYYY-MM-DD theo múi giờ Việt Nam (GMT+7)
 */
const getVietnamDateKey = (date = new Date()) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch (_) {
    return new Date(date).toISOString().slice(0, 10);
  }
};

/**
 * Tiện ích lấy ngày hôm qua theo múi giờ Việt Nam
 */
const getYesterdayVietnamDateKey = () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return getVietnamDateKey(yesterday);
};

/**
 * Làm sạch chuỗi chống XSS cơ bản
 */
const sanitizeText = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
};

/**
 * Tiện ích tìm user từ DB (ưu tiên) hoặc persistent store
 */
const resolveLiveUser = async (reqUser) => {
  if (!reqUser) return null;
  if (isDbConnected && reqUser._id && String(reqUser._id).match(/^[0-9a-fA-F]{24}$/)) {
    return await User.findById(reqUser._id);
  }
  if (isDbConnected && reqUser.email) {
    return await User.findOne({ email: reqUser.email.toLowerCase().trim() });
  }
  return reqUser;
};

/**
 * GET /api/user/hub
 * Lấy toàn bộ dữ liệu cá nhân hóa (Personal Motivation Vault)
 */
export const getUserHub = async (req, res) => {
  try {
    const user = await resolveLiveUser(req.user);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy thông tin tài khoản', status: 404 });
    }

    const todayKey = getVietnamDateKey(new Date());
    const lastCheckInKey = user.lastCheckInDate ? getVietnamDateKey(user.lastCheckInDate) : null;
    const hasCheckedInToday = Boolean(lastCheckInKey && lastCheckInKey === todayKey);

    // Lấy bản đồ thống kê lượt like của tất cả bài nhạc
    const trackLikesMap = {};
    if (isDbConnected) {
      const stats = await TrackStat.find({}).lean();
      stats.forEach((s) => {
        if (s.trackId) {
          trackLikesMap[s.trackId] = Math.max(0, s.likesCount || 0);
        }
      });
    }

    const sanitizedProfile = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      jobTitle: user.jobTitle,
      role: user.role,
      streakCount: user.streakCount || 0,
      lastCheckInDate: user.lastCheckInDate,
      createdAt: user.createdAt,
    };

    return sendSuccess(res, {
      message: 'Nạp thông tin Personal Motivation Hub thành công',
      data: {
        profile: sanitizedProfile,
        streakCount: user.streakCount || 0,
        lastCheckInDate: user.lastCheckInDate,
        hasCheckedInToday,
        likedTracks: user.likedTracks || [],
        savedQuotes: user.savedQuotes || [],
        personalNotes: user.personalNotes || [],
        trackLikesMap,
      },
    });
  } catch (error) {
    console.error('[UserHub] Lỗi getUserHub:', error);
    return sendError(res, { message: 'Không thể tải dữ liệu Personal Hub', status: 500 });
  }
};

/**
 * POST /api/user/checkin
 * Điểm danh giữ lửa hằng ngày (Daily Check-in Streak)
 */
export const checkIn = async (req, res) => {
  try {
    const user = await resolveLiveUser(req.user);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy người dùng', status: 404 });
    }

    const todayKey = getVietnamDateKey(new Date());
    const lastCheckInKey = user.lastCheckInDate ? getVietnamDateKey(user.lastCheckInDate) : null;

    // Nếu trong ngày hôm nay đã check-in rồi
    if (lastCheckInKey && lastCheckInKey === todayKey) {
      return sendSuccess(res, {
        message: 'Bạn đã giữ lửa hôm nay rồi! Hãy tiếp tục duy trì ngày mai nhé.',
        data: {
          alreadyCheckedIn: true,
          streakCount: user.streakCount || 1,
          lastCheckInDate: user.lastCheckInDate,
        },
      });
    }

    const yesterdayKey = getYesterdayVietnamDateKey();
    let newStreak = 1;

    // Nếu ngày check-in gần nhất là ngày hôm qua -> chuỗi liên tiếp tăng +1
    if (lastCheckInKey && lastCheckInKey === yesterdayKey) {
      newStreak = (user.streakCount || 0) + 1;
    } else {
      // Bỏ lỡ hơn 1 ngày hoặc lần đầu tiên check-in -> bắt đầu chuỗi mới
      newStreak = 1;
    }

    user.streakCount = newStreak;
    user.lastCheckInDate = new Date();

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      saveUserToStore(user);
    }

    return sendSuccess(res, {
      message: `Điểm danh giữ lửa thành công! Chuỗi hiện tại: ${newStreak} ngày liên tục. 🔥`,
      data: {
        alreadyCheckedIn: false,
        streakCount: newStreak,
        lastCheckInDate: user.lastCheckInDate,
      },
    });
  } catch (error) {
    console.error('[UserHub] Lỗi checkIn:', error);
    return sendError(res, { message: 'Không thể điểm danh lúc này', status: 500 });
  }
};

/**
 * POST /api/user/tracks/:trackId/toggle-like
 * Thả tim hoặc bỏ tim bản nhạc gốc trên Freedom Web
 */
export const toggleTrackLike = async (req, res) => {
  try {
    const { trackId } = req.params;
    const cleanTrackId = sanitizeText(trackId);

    if (!cleanTrackId || cleanTrackId.length > 100) {
      return sendError(res, { message: 'Mã bài hát không hợp lệ', status: 400 });
    }

    const user = await resolveLiveUser(req.user);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy người dùng', status: 404 });
    }

    if (!Array.isArray(user.likedTracks)) {
      user.likedTracks = [];
    }

    const likedIndex = user.likedTracks.indexOf(cleanTrackId);
    let isLiked = false;

    if (likedIndex > -1) {
      // Đã like -> Bỏ like
      user.likedTracks.splice(likedIndex, 1);
      isLiked = false;

      if (isDbConnected) {
        await TrackStat.findOneAndUpdate(
          { trackId: cleanTrackId },
          { $inc: { likesCount: -1 } },
          { upsert: true, new: true }
        );
        // Đảm bảo không âm
        await TrackStat.updateOne(
          { trackId: cleanTrackId, likesCount: { $lt: 0 } },
          { $set: { likesCount: 0 } }
        );
      }
    } else {
      // Chưa like -> Thêm like
      user.likedTracks.push(cleanTrackId);
      isLiked = true;

      if (isDbConnected) {
        await TrackStat.findOneAndUpdate(
          { trackId: cleanTrackId },
          { $inc: { likesCount: 1 } },
          { upsert: true, new: true }
        );
      }
    }

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      saveUserToStore(user);
    }

    let likesCount = 0;
    if (isDbConnected) {
      const stat = await TrackStat.findOne({ trackId: cleanTrackId }).lean();
      likesCount = stat ? Math.max(0, stat.likesCount || 0) : (isLiked ? 1 : 0);
    } else {
      likesCount = isLiked ? 1 : 0;
    }

    return sendSuccess(res, {
      message: isLiked ? 'Đã thêm vào danh sách nhạc yêu thích ❤️' : 'Đã bỏ thích bản nhạc',
      data: {
        isLiked,
        trackId: cleanTrackId,
        likedTracks: user.likedTracks,
        likesCount,
      },
    });
  } catch (error) {
    console.error('[UserHub] Lỗi toggleTrackLike:', error);
    return sendError(res, { message: 'Không thể cập nhật lượt thích bản nhạc', status: 500 });
  }
};

/**
 * GET /api/user/tracks/likes
 * Lấy danh sách lượt like công khai của tất cả bản nhạc
 */
export const getTrackLikes = async (req, res) => {
  try {
    const trackLikesMap = {};
    if (isDbConnected) {
      const stats = await TrackStat.find({}).lean();
      stats.forEach((s) => {
        if (s.trackId) {
          trackLikesMap[s.trackId] = Math.max(0, s.likesCount || 0);
        }
      });
    }

    return sendSuccess(res, {
      message: 'Danh sách lượt like bản nhạc',
      data: { trackLikesMap },
    });
  } catch (error) {
    console.error('[UserHub] Lỗi getTrackLikes:', error);
    return sendError(res, { message: 'Không thể nạp danh sách lượt like', status: 500 });
  }
};

/**
 * POST /api/user/notes
 * Thêm ghi chú mục tiêu cá nhân (tối đa 20 ghi chú)
 */
export const addPersonalNote = async (req, res) => {
  try {
    const { content } = req.body;
    const cleanContent = sanitizeText(content);

    if (!cleanContent) {
      return sendError(res, { message: 'Vui lòng nhập nội dung mục tiêu', status: 400 });
    }

    if (cleanContent.length > 300) {
      return sendError(res, { message: 'Nội dung mục tiêu tối đa 300 ký tự', status: 400 });
    }

    const user = await resolveLiveUser(req.user);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy người dùng', status: 404 });
    }

    if (!Array.isArray(user.personalNotes)) {
      user.personalNotes = [];
    }

    if (user.personalNotes.length >= 20) {
      return sendError(res, {
        message: 'Bạn đã đạt giới hạn 20 ghi chú mục tiêu. Hãy xóa bớt mục tiêu cũ để thêm mới!',
        status: 400,
      });
    }

    const newNote = {
      _id: new mongoose.Types.ObjectId(),
      content: cleanContent,
      completed: false,
      createdAt: new Date(),
    };

    user.personalNotes.unshift(newNote);

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      saveUserToStore(user);
    }

    return sendSuccess(res, {
      message: 'Đã thêm mục tiêu hôm nay thành công ✨',
      data: {
        newNote,
        personalNotes: user.personalNotes,
      },
      status: 201,
    });
  } catch (error) {
    console.error('[UserHub] Lỗi addPersonalNote:', error);
    return sendError(res, { message: 'Không thể thêm mục tiêu', status: 500 });
  }
};

/**
 * PATCH /api/user/notes/:noteId/toggle
 * Đánh dấu hoàn thành / chưa hoàn thành mục tiêu
 */
export const togglePersonalNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const user = await resolveLiveUser(req.user);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy người dùng', status: 404 });
    }

    if (!Array.isArray(user.personalNotes)) {
      user.personalNotes = [];
    }

    const note = user.personalNotes.find((n) => String(n._id) === String(noteId));
    if (!note) {
      return sendError(res, { message: 'Không tìm thấy mục tiêu này', status: 404 });
    }

    note.completed = !note.completed;

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      saveUserToStore(user);
    }

    return sendSuccess(res, {
      message: note.completed ? 'Chúc mừng bạn đã hoàn thành mục tiêu! 🎉' : 'Đã mở lại mục tiêu',
      data: {
        updatedNote: note,
        personalNotes: user.personalNotes,
      },
    });
  } catch (error) {
    console.error('[UserHub] Lỗi togglePersonalNote:', error);
    return sendError(res, { message: 'Không thể cập nhật mục tiêu', status: 500 });
  }
};

/**
 * DELETE /api/user/notes/:noteId
 * Xóa ghi chú mục tiêu
 */
export const deletePersonalNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const user = await resolveLiveUser(req.user);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy người dùng', status: 404 });
    }

    if (!Array.isArray(user.personalNotes)) {
      user.personalNotes = [];
    }

    const initialLength = user.personalNotes.length;
    user.personalNotes = user.personalNotes.filter((n) => String(n._id) !== String(noteId));

    if (user.personalNotes.length === initialLength) {
      return sendError(res, { message: 'Không tìm thấy mục tiêu để xóa', status: 404 });
    }

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      saveUserToStore(user);
    }

    return sendSuccess(res, {
      message: 'Đã xóa mục tiêu',
      data: {
        personalNotes: user.personalNotes,
      },
    });
  } catch (error) {
    console.error('[UserHub] Lỗi deletePersonalNote:', error);
    return sendError(res, { message: 'Không thể xóa mục tiêu', status: 500 });
  }
};

/**
 * PATCH /api/user/profile
 * Cập nhật tên hiển thị, bio hoặc avatar
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, bio, jobTitle, avatar } = req.body;
    const user = await resolveLiveUser(req.user);
    if (!user) {
      return sendError(res, { message: 'Không tìm thấy người dùng', status: 404 });
    }

    if (name !== undefined) {
      const cleanName = sanitizeText(name);
      if (!cleanName || cleanName.length < 2 || cleanName.length > 60) {
        return sendError(res, { message: 'Tên hiển thị phải từ 2 đến 60 ký tự', status: 400 });
      }
      user.name = cleanName;
    }

    if (bio !== undefined) {
      const cleanBio = sanitizeText(bio);
      if (cleanBio.length > 200) {
        return sendError(res, { message: 'Giới thiệu bản thân tối đa 200 ký tự', status: 400 });
      }
      user.bio = cleanBio;
    }

    if (jobTitle !== undefined) {
      const cleanJobTitle = sanitizeText(jobTitle);
      user.jobTitle = cleanJobTitle.slice(0, 80);
    }

    if (avatar !== undefined && typeof avatar === 'string' && avatar.trim()) {
      user.avatar = avatar.trim();
    }

    if (typeof user.save === 'function') {
      await user.save();
    } else {
      saveUserToStore(user);
    }

    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio,
      jobTitle: user.jobTitle,
      role: user.role,
      streakCount: user.streakCount || 0,
      lastCheckInDate: user.lastCheckInDate,
    };

    return sendSuccess(res, {
      message: 'Cập nhật hồ sơ cá nhân thành công!',
      data: { user: sanitizedUser },
    });
  } catch (error) {
    console.error('[UserHub] Lỗi updateProfile:', error);
    return sendError(res, { message: 'Không thể cập nhật hồ sơ', status: 500 });
  }
};

/**
 * GET /api/user/bonds/:targetUserId
 * Lấy mức độ thân thiết 2 chiều giữa người dùng hiện tại và chủ hồ sơ
 */
export const getBondWithUser = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user?._id;

    if (!targetUserId || !currentUserId || String(targetUserId) === String(currentUserId)) {
      return sendSuccess(res, {
        data: {
          mutualScore: 0,
          tier: 'none',
          tierInfo: getBondTierInfo(0),
        },
      });
    }

    const fromStr = String(currentUserId);
    const toStr = String(targetUserId);
    const isFromSmaller = fromStr < toStr;
    const userA = isFromSmaller ? currentUserId : targetUserId;
    const userB = isFromSmaller ? targetUserId : currentUserId;

    let bond = null;
    if (isDbConnected) {
      bond = await MutualBond.findOne({ userA, userB }).lean();
    }

    const mutualScore = bond?.mutualScore || 0;
    const tierInfo = getBondTierInfo(mutualScore);

    return sendSuccess(res, {
      message: 'Lấy độ thân thiết thành công',
      data: {
        mutualScore,
        tier: tierInfo.key,
        tierInfo,
        scoreAtoB: isFromSmaller ? (bond?.scoreAtoB || 0) : (bond?.scoreBtoA || 0),
        scoreBtoA: isFromSmaller ? (bond?.scoreBtoA || 0) : (bond?.scoreAtoB || 0),
        lastInteractionAt: bond?.lastInteractionAt || null,
      },
    });
  } catch (err) {
    console.warn('[GetBondWithUser Error]:', err);
    return sendSuccess(res, {
      data: { mutualScore: 0, tier: 'none', tierInfo: getBondTierInfo(0) },
    });
  }
};

/**
 * GET /api/user/bonds
 * Lấy danh sách Top người bạn thân thiết nhất của user đang đăng nhập
 */
export const getMyTopBonds = async (req, res) => {
  try {
    const currentUserId = req.user?._id;
    if (!currentUserId || !isDbConnected) {
      return sendSuccess(res, { data: [] });
    }

    const bonds = await MutualBond.find({
      $or: [{ userA: currentUserId }, { userB: currentUserId }],
      mutualScore: { $gt: 0 },
    })
      .sort({ mutualScore: -1 })
      .limit(8)
      .populate('userA', 'name avatar jobTitle role streakCount')
      .populate('userB', 'name avatar jobTitle role streakCount')
      .lean();

    const formatted = bonds
      .map((b) => {
        const isUserA = String(b.userA?._id) === String(currentUserId);
        const partner = isUserA ? b.userB : b.userA;
        const tierInfo = getBondTierInfo(b.mutualScore);
        return {
          _id: b._id,
          partner,
          mutualScore: b.mutualScore,
          tier: b.tier,
          tierInfo,
          lastInteractionAt: b.lastInteractionAt,
        };
      })
      .filter((item) => Boolean(item.partner));

    return sendSuccess(res, {
      message: 'Lấy danh sách kết nối thân thiết thành công',
      data: formatted,
    });
  } catch (err) {
    console.warn('[GetMyTopBonds Error]:', err);
    return sendSuccess(res, { data: [] });
  }
};

/**
 * GET /api/user/bonds/:targetUserId/memories
 * Lấy hành trình tương tác và nhật ký kỷ niệm 2 chiều (Mutual Memories Timeline)
 */
export const getMutualMemories = async (req, res) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user?._id;

    if (!currentUserId) {
      return sendError(res, { message: 'Vui lòng đăng nhập để xem nhật ký', status: 401 });
    }

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return sendError(res, { message: 'ID người dùng không hợp lệ', status: 400 });
    }

    if (String(currentUserId) === String(targetUserId)) {
      return sendError(res, { message: 'Không thể xem nhật ký gắn kết với chính mình', status: 400 });
    }

    if (!isDbConnected) {
      return sendSuccess(res, {
        data: {
          mutualScore: 0,
          tier: 'none',
          tierInfo: getBondTierInfo(0),
          scoreAtoB: 0,
          scoreBtoA: 0,
          partner: null,
          recentMemories: [],
        },
      });
    }

    const partnerUser = await User.findById(targetUserId).select('name avatar jobTitle role streakCount').lean();
    if (!partnerUser) {
      return sendError(res, { message: 'Không tìm thấy người dùng này', status: 404 });
    }

    const fromStr = String(currentUserId);
    const toStr = String(targetUserId);
    const isFromSmaller = fromStr < toStr;
    const userA = isFromSmaller ? currentUserId : targetUserId;
    const userB = isFromSmaller ? targetUserId : currentUserId;

    const bond = await MutualBond.findOne({ userA, userB })
      .populate('recentMemories.actorId', 'name avatar')
      .lean();

    const mutualScore = bond?.mutualScore || 0;
    const tierInfo = getBondTierInfo(mutualScore);
    const scoreAtoB = isFromSmaller ? (bond?.scoreAtoB || 0) : (bond?.scoreBtoA || 0); // Điểm Bạn gửi tới Partner
    const scoreBtoA = isFromSmaller ? (bond?.scoreBtoA || 0) : (bond?.scoreAtoB || 0); // Điểm Partner gửi tới Bạn

    const rawMemories = Array.isArray(bond?.recentMemories) ? bond.recentMemories : [];
    const formattedMemories = rawMemories.map((m) => {
      const actorIdStr = String(m.actorId?._id || m.actorId);
      const isSelf = actorIdStr === String(currentUserId);
      return {
        _id: m._id,
        actorId: actorIdStr,
        actorName: isSelf ? 'Bạn' : (m.actorId?.name || partnerUser.name || 'Bạn đồng hành'),
        actorAvatar: isSelf ? (req.user?.avatar || '') : (m.actorId?.avatar || partnerUser.avatar || ''),
        isSelf,
        type: m.type || 'reaction',
        actionDetail: m.actionDetail || '',
        postId: m.postId || null,
        postTitle: m.postTitle || '',
        snippet: m.snippet || '',
        createdAt: m.createdAt,
      };
    });

    return sendSuccess(res, {
      message: 'Lấy nhật ký tri kỷ thành công',
      data: {
        mutualScore,
        tier: tierInfo.key,
        tierInfo,
        scoreAtoB,
        scoreBtoA,
        partner: partnerUser,
        recentMemories: formattedMemories,
      },
    });
  } catch (err) {
    console.error('[GetMutualMemories Error]:', err);
    return sendError(res, { message: 'Không thể tải nhật ký tri kỷ', status: 500 });
  }
};

