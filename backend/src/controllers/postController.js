import Post from '../models/Post.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { recordMutualInteraction } from '../utils/mutualBondHelper.js';
import { ensureDbConnected, checkDbReady } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { slugify } from '../utils/slugify.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';
import { maskSensitiveText, analyzeContentSafety } from '../utils/sensitiveFilter.js';
import { createNotification } from '../services/notificationService.js';

const INVALID_AUTHOR_PLACEHOLDERS = new Set([
  'hình ảnh',
  'hình anh',
  'image',
  'picture',
  'photo',
  'ảnh',
]);

const sanitizeAuthorName = (post) => {
  const candidate = post?.user?.name || post?.author || '';
  const trimmed = typeof candidate === 'string' ? candidate.trim() : '';
  if (!trimmed || INVALID_AUTHOR_PLACEHOLDERS.has(trimmed.toLowerCase())) {
    return 'Thành viên ẩn danh';
  }
  return trimmed;
};

// Bộ đệm lượt đọc trong RAM để tránh ghi đồng bộ db_store.json mỗi lần GET chi tiết bài viết
const pendingViewDeltas = new Map();
let isFlushingViews = false;

const bufferPostView = (postKey) => {
  if (!postKey) return 0;
  const key = String(postKey);
  const nextDelta = (pendingViewDeltas.get(key) || 0) + 1;
  pendingViewDeltas.set(key, nextDelta);
  return nextDelta;
};

const getBufferedViews = (post) => {
  const baseViews = Number(post?.views || 0);
  const idDelta = post?._id ? (pendingViewDeltas.get(String(post._id)) || 0) : 0;
  const slugDelta = post?.slug ? (pendingViewDeltas.get(String(post.slug)) || 0) : 0;
  return baseViews + Math.max(idDelta, slugDelta);
};

const flushPendingViewsToStore = async () => {
  if (isFlushingViews || pendingViewDeltas.size === 0) return;
  isFlushingViews = true;
  const snapshot = new Map(pendingViewDeltas);
  pendingViewDeltas.clear();
  try {
    const store = loadStore();
    let mutated = false;
    if (Array.isArray(store.posts)) {
      for (const p of store.posts) {
        const byId = p._id ? snapshot.get(String(p._id)) : 0;
        const bySlug = p.slug ? snapshot.get(String(p.slug)) : 0;
        const delta = Math.max(byId || 0, bySlug || 0);
        if (delta > 0) {
          p.views = Number(p.views || 0) + delta;
          mutated = true;
        }
      }
    }
    if (mutated) {
      await Promise.resolve(saveStore(store));
    }
  } catch (err) {
    for (const [k, v] of snapshot.entries()) {
      pendingViewDeltas.set(k, (pendingViewDeltas.get(k) || 0) + v);
    }
    console.warn('[postController] Lỗi flush lượt đọc định kỳ:', err.message);
  } finally {
    isFlushingViews = false;
  }
};

const viewFlushTimer = setInterval(() => {
  flushPendingViewsToStore().catch(() => {});
}, 30 * 1000);
if (viewFlushTimer.unref) {
  viewFlushTimer.unref();
}

export const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
};

const fallbackCategories = [
  { _id: 'cat_1', name: 'Áp lực & Kiệt sức (Burnout)', slug: 'ap-luc-kiet-suc-burnout' },
  { _id: 'cat_2', name: 'Khủng hoảng nghề nghiệp (Career Crisis)', slug: 'khung-hoang-nghe-nghiep-career-crisis' },
  { _id: 'cat_3', name: 'Chuyển ngành & Bắt đầu lại (Restart)', slug: 'chuyen-nganh-bat-dau-lai-restart' },
  { _id: 'cat_4', name: 'Những tia sáng & Động lực (Small Wins)', slug: 'nhung-tia-sang-dong-luc-small-wins' },
];

/**
 * Trợ giúp chuẩn hóa danh mục sang dạng object { _id, name, slug, icon }
 * Hỗ trợ tự động tạo & lưu thể loại mới vĩnh viễn nếu người dùng tạo thể loại riêng
 */
const resolveCategory = async (catInput) => {
  if (!catInput) return fallbackCategories[0];
  if (typeof catInput === 'object' && catInput.name && catInput.slug) return catInput;

  const rawName = typeof catInput === 'object' ? (catInput.name || '') : String(catInput);
  const store = loadStore();
  const allCats = [...(store.categories || []), ...fallbackCategories];
  const found = allCats.find(
    (c) =>
      c._id === catInput ||
      c.slug === catInput ||
      c.name.toLowerCase() === rawName.toLowerCase() ||
      c.slug === slugify(rawName)
  );
  if (found) return { _id: found._id, name: found.name, slug: found.slug, icon: found.icon || '🌍' };

  if (checkDbReady()) {
    try {
      const dbCat = await Category.findOne({
        $or: [
          { slug: catInput },
          { slug: slugify(rawName) },
          { _id: String(catInput).match(/^[0-9a-fA-F]{24}$/) ? catInput : null },
        ].filter(Boolean),
      });
      if (dbCat) return { _id: dbCat._id.toString(), name: dbCat.name, slug: dbCat.slug, icon: dbCat.icon || '🌍' };
    } catch {}
  }

  // Nếu người dùng nhập tên thể loại mới trực tiếp, tự động lưu vĩnh viễn
  if (rawName && rawName.trim().length >= 2) {
    const cleanName = rawName.trim();
    const cleanSlug = slugify(cleanName);
    const newCategory = {
      _id: `cat_${Date.now()}`,
      name: cleanName,
      slug: cleanSlug,
      description: 'Thể loại do thành viên cộng đồng khởi tạo',
      icon: '🌍',
      createdAt: new Date().toISOString(),
    };
    store.categories = store.categories || [];
    store.categories.push(newCategory);
    saveStore(store);
    if (checkDbReady()) {
      try {
        await Category.create(newCategory);
      } catch {}
    }
    return newCategory;
  }

  return { _id: String(catInput), name: 'Tâm sự & Đời Sống', slug: 'tam-su-doi-song-thuong-nhat', icon: '☕' };
};

/**
 * Lấy danh sách bài viết (100% dữ liệu thật từ MongoDB, tuyệt đối không trộn bài mẫu tĩnh)
 */
export const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 6);
    const { category, tag, q, sort = 'newest', visibility = 'all', postType = 'all' } = req.query;

    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu MongoDB đang khởi động hoặc chưa sẵn sàng. Vui lòng thử lại sau giây lát.',
        status: 503,
      });
    }

    const dbPosts = await Post.find({ isPublished: true })
      .populate('category', 'name slug')
      .populate('user', 'name avatar jobTitle bio streakCount')
      .sort({ createdAt: -1 })
      .lean();

    const allPosts = (dbPosts || []).map((dbP) => ({
      ...dbP,
      author: dbP.user?.name ? dbP.user.name : sanitizeAuthorName(dbP),
      authorJob: dbP.user?.jobTitle || dbP.authorJob,
      authorAvatar: dbP.user?.avatar || dbP.authorAvatar || '',
      authorStreakCount: dbP.user?.streakCount || dbP.authorStreakCount || 0,
      views: getBufferedViews(dbP),
    }));

    let filtered = allPosts;

    if (category) {
      const lowerCat = category.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.category?.slug === category ||
          String(p.category?._id || '') === String(category) ||
          p.category?.name?.toLowerCase() === lowerCat ||
          (typeof p.category === 'string' && (p.category === category || p.category.toLowerCase() === lowerCat))
      );
    }

    if (tag) {
      const cleanTag = tag.replace(/^#/, '').trim().toLowerCase();
      filtered = filtered.filter((p) =>
        (p.tags || []).some((t) => String(t).toLowerCase() === cleanTag)
      );
    }

    if (q) {
      const lowerQ = q.toLowerCase().trim();
      const cleanQ = removeVietnameseTones(lowerQ);

      filtered = filtered.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const summary = (p.summary || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        const author = (p.author || p.user?.name || '').toLowerCase();
        const catName = (typeof p.category === 'string' ? p.category : p.category?.name || '').toLowerCase();
        const catSlug = (p.category?.slug || '').toLowerCase();
        const tags = (p.tags || []).map((t) => String(t).toLowerCase());

        if (
          title.includes(lowerQ) ||
          summary.includes(lowerQ) ||
          content.includes(lowerQ) ||
          author.includes(lowerQ) ||
          catName.includes(lowerQ) ||
          catSlug.includes(lowerQ) ||
          tags.some((t) => t.includes(lowerQ))
        ) {
          return true;
        }

        if (cleanQ) {
          if (
            removeVietnameseTones(title).includes(cleanQ) ||
            removeVietnameseTones(summary).includes(cleanQ) ||
            removeVietnameseTones(content).includes(cleanQ) ||
            removeVietnameseTones(author).includes(cleanQ) ||
            removeVietnameseTones(catName).includes(cleanQ) ||
            tags.some((t) => removeVietnameseTones(t).includes(cleanQ))
          ) {
            return true;
          }
        }

        return false;
      });
    }

    if (visibility === 'public') {
      filtered = filtered.filter((p) => !p.visibility || p.visibility === 'public');
    } else if (visibility === 'friends') {
      filtered = filtered.filter((p) => p.visibility === 'friends');
    }

    if (postType && postType !== 'all') {
      filtered = filtered.filter((p) => (p.postType || 'article') === postType);
    }

    if (sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sort === 'az') {
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'vi'));
    } else if (sort === 'za') {
      filtered.sort((a, b) => (b.title || '').localeCompare(a.title || '', 'vi'));
    } else if (sort === 'most_engaged') {
      filtered.sort((a, b) => {
        const scoreA =
          (a.views || 0) * 1 +
          (a.cheersCount || 0) * 2 +
          (a.reactionCounts?.total || a.reactions?.length || 0) * 3 +
          (a.sharesCount || a.repostCount || 0) * 4;
        const scoreB =
          (b.views || 0) * 1 +
          (b.cheersCount || 0) * 2 +
          (b.reactionCounts?.total || b.reactions?.length || 0) * 3 +
          (b.sharesCount || b.repostCount || 0) * 4;
        return scoreB - scoreA;
      });
    } else if (sort === 'least_engaged') {
      filtered.sort((a, b) => {
        const scoreA =
          (a.views || 0) * 1 +
          (a.cheersCount || 0) * 2 +
          (a.reactionCounts?.total || a.reactions?.length || 0) * 3 +
          (a.sharesCount || a.repostCount || 0) * 4;
        const scoreB =
          (b.views || 0) * 1 +
          (b.cheersCount || 0) * 2 +
          (b.reactionCounts?.total || b.reactions?.length || 0) * 3 +
          (b.sharesCount || b.repostCount || 0) * 4;
        return scoreA - scoreB;
      });
    } else {
      filtered.sort((a, b) => {
        const diff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (Number.isFinite(diff) && diff !== 0) return diff;
        return String(b._id || '').localeCompare(String(a._id || ''));
      });
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return sendSuccess(res, {
      message: 'Lấy danh sách bài viết từ MongoDB thành công',
      data: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('[postController] Lỗi getPosts MongoDB:', error.message);
    return sendError(res, {
      message: error.message || 'Không thể tải danh sách bài viết từ cơ sở dữ liệu.',
      status: 500,
    });
  }
};

/**
 * Lấy chi tiết bài viết theo Slug (100% từ MongoDB)
 */
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu MongoDB đang khởi động hoặc chưa sẵn sàng. Vui lòng thử lại sau giây lát.',
        status: 503,
      });
    }

    const post = await Post.findOne({ slug, isPublished: true })
      .populate('category', 'name slug description')
      .populate('user', 'name avatar jobTitle bio socialLinks streakCount')
      .lean();

    if (!post) {
      return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
    }

    const nextViews = (post.views || 0) + 1;
    const normalizedPost = {
      ...post,
      author: post.user?.name ? post.user.name : sanitizeAuthorName(post),
      authorJob: post.user?.jobTitle || post.authorJob,
      authorAvatar: post.user?.avatar || post.authorAvatar,
      authorSocialLinks: post.user?.socialLinks || post.authorSocialLinks,
      authorStreakCount: post.user?.streakCount || post.authorStreakCount || 0,
      views: nextViews,
    };

    Post.updateOne({ _id: post._id }, { $inc: { views: 1 } }).catch((err) => {
      console.warn('[postController] Lỗi tăng lượt đọc MongoDB:', err.message);
    });
    bufferPostView(post._id || post.slug || slug);

    return sendSuccess(res, {
      message: 'Lấy thông tin bài viết thành công',
      data: normalizedPost,
    });
  } catch (error) {
    console.error('[postController] Lỗi getPostBySlug MongoDB:', error.message);
    return sendError(res, { message: error.message || 'Không thể tải chi tiết bài viết', status: 500 });
  }
};

/**
 * Lấy chi tiết bài viết theo ID (100% từ MongoDB)
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu MongoDB đang khởi động hoặc chưa sẵn sàng. Vui lòng thử lại sau giây lát.',
        status: 503,
      });
    }

    const query = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
    const post = await Post.findOne(query)
      .populate('category', 'name slug')
      .populate('user', 'name avatar jobTitle bio socialLinks streakCount')
      .lean();

    if (!post) {
      return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
    }

    return sendSuccess(res, {
      data: {
        ...post,
        author: post.user?.name ? post.user.name : sanitizeAuthorName(post),
        authorJob: post.user?.jobTitle || post.authorJob,
        authorAvatar: post.user?.avatar || post.authorAvatar,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Không thể tải bài viết', status: 500 });
  }
};

/**
 * Gửi lời động viên (Cheer - legacy)
 */
export const cheerPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (checkDbReady()) {
      try {
        const query = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
        const post = await Post.findOneAndUpdate(
          query,
          { $inc: { cheersCount: 1 } },
          { new: true }
        );
        if (post) {
          const store = loadStore();
          const storedPost = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
          if (storedPost) {
            storedPost.cheersCount = post.cheersCount;
            saveStore(store);
          }
          return sendSuccess(res, { data: { cheersCount: post.cheersCount } });
        }
      } catch (_) {}
    }

    const store = loadStore();
    const post = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
    if (post) {
      post.cheersCount = (post.cheersCount || 0) + 1;
      saveStore(store);
      return sendSuccess(res, { data: { cheersCount: post.cheersCount } });
    }

    return sendSuccess(res, { data: { cheersCount: 1 } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Bày tỏ cảm xúc về bài viết (Facebook-style Reactions)
 * Hỗ trợ 4 cảm xúc:
 * - sympathy: Đồng Cảm (Icon Khoác Vai 🫂)
 * - stop: Stop (Icon Dừng 🛑 cho bài viết tiêu cực)
 * - love: Yêu thích (Trái Tim ❤️)
 * - encourage: Cố Lên (Bắp Tay 💪)
 * Quy tắc:
 * 1. Tối đa 2 cảm xúc trên 1 bài viết cho mỗi người dùng.
 * 2. 'stop' và 'love' KHÔNG THỂ đi cùng nhau.
 * 3. Bấm vào cảm xúc đã chọn sẽ bỏ chọn (toggle off).
 */
export const reactToPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    const VALID_TYPES = ['sympathy', 'stop', 'love', 'encourage', 'hug', 'tea', 'coffee', 'goodnight'];

    if (!VALID_TYPES.includes(type)) {
      return sendError(res, {
        message: 'Loại cảm xúc không hợp lệ. Hỗ trợ: sympathy, stop, love, encourage, hug, tea, coffee, goodnight',
        status: 400,
      });
    }

    const userId = req.user?._id;
    const userName = req.user?.name || 'Thành viên';
    const userAvatar = req.user?.avatar || '';

    if (checkDbReady()) {
      try {
        let post = await Post.findOne({
          $or: [
            { _id: id && String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { slug: id },
          ].filter(Boolean),
        });

        if (post) {
          if (!Array.isArray(post.reactions)) {
            post.reactions = [];
          }
          if (!post.reactionCounts) {
            post.reactionCounts = { sympathy: 0, stop: 0, love: 0, encourage: 0, hug: 0, tea: 0, coffee: 0, goodnight: 0, total: 0 };
          }

          // Tìm cảm xúc hiện tại của user
          const existingIdx = post.reactions.findIndex(
            (r) =>
              (userId && r.user && r.user.toString() === userId.toString()) ||
              (r.userName && r.userName === userName)
          );

          let currentTypes = existingIdx !== -1 ? [...(post.reactions[existingIdx].types || [])] : [];

          if (currentTypes.includes(type)) {
            // Toggle OFF (Bỏ chọn)
            currentTypes = currentTypes.filter((t) => t !== type);
          } else {
            // Kiểm tra số lượng tối đa 2 cảm xúc
            if (currentTypes.length >= 2) {
              return sendError(res, {
                message: 'Bạn chỉ có thể chọn tối đa 2 cảm xúc cho một bài viết. Vui lòng bỏ chọn bớt một cảm xúc trước.',
                status: 400,
              });
            }

            // Quy tắc loại trừ: Stop và Love không thể đi chung
            if (type === 'stop' && currentTypes.includes('love')) {
              return sendError(res, {
                message: "Cảm xúc 'Stop' (Dừng lại 🛑) không thể kết hợp cùng 'Yêu thích' ❤️.",
                status: 400,
              });
            }
            if (type === 'love' && currentTypes.includes('stop')) {
              return sendError(res, {
                message: "Cảm xúc 'Yêu thích' ❤️ không thể kết hợp cùng 'Stop' (Dừng lại 🛑).",
                status: 400,
              });
            }

            currentTypes.push(type);
            // Ghi nhận điểm thân thiết 2 chiều nếu tương tác lên bài của người khác
            var bondLevelUp = null;
            if (post.user && String(post.user) !== String(userId)) {
              try {
                const bondRes = await recordMutualInteraction({
                  fromUserId: userId,
                  toUserId: post.user,
                  actionType: type,
                  points: 1,
                  postId: post._id,
                  postTitle: post.title,
                  snippet: '',
                });
                if (bondRes?.levelUpInfo) {
                  bondLevelUp = bondRes.levelUpInfo;
                }
              } catch (_) {}
            }
          }

          // Cập nhật reactions array
          if (currentTypes.length === 0) {
            if (existingIdx !== -1) {
              post.reactions.splice(existingIdx, 1);
            }
          } else {
            if (existingIdx !== -1) {
              post.reactions[existingIdx].types = currentTypes;
              post.reactions[existingIdx].userName = userName;
              post.reactions[existingIdx].userAvatar = userAvatar;
            } else {
              post.reactions.push({
                user: userId || null,
                userName,
                userAvatar,
                types: currentTypes,
              });
            }
          }

          // Tính toán lại reactionCounts
          const counts = { sympathy: 0, stop: 0, love: 0, encourage: 0, hug: 0, tea: 0, coffee: 0, goodnight: 0, total: 0 };
          post.reactions.forEach((r) => {
            (r.types || []).forEach((t) => {
              if (counts[t] !== undefined) {
                counts[t]++;
                counts.total++;
              }
            });
          });

          post.reactionCounts = counts;
          post.cheersCount = counts.total;
          await post.save();

          // Đồng bộ persistentStore
          const store = loadStore();
          const storedPost = (store.posts || []).find((p) => p._id === post._id.toString() || p.slug === post.slug);
          if (storedPost) {
            storedPost.reactions = post.reactions;
            storedPost.reactionCounts = post.reactionCounts;
            storedPost.cheersCount = post.cheersCount;
            saveStore(store);
          }

          if (currentTypes.includes(type)) {
            try {
              const authorId = (post.user?._id || post.user?.id || post.user)?.toString();
              const myId = (req.user?._id || req.user?.id || '').toString();
              if (authorId && authorId !== myId) {
                const REACTION_LABELS = {
                  love: '❤️ Yêu thương',
                  sympathy: '🤗 Đồng cảm',
                  stop: '🛑 Dừng lại & Nghỉ ngơi',
                  encourage: '🌱 Tiếp thêm động lực',
                };
                const label = REACTION_LABELS[type] || '❤️ Cảm xúc';
                await createNotification({
                  recipientId: authorId,
                  sender: req.user || { name: userName, avatar: userAvatar },
                  type: 'reaction',
                  reactionType: type,
                  post: { _id: post._id, title: post.title, slug: post.slug, coverImage: post.coverImage },
                  title: 'Tương tác mới về bài viết',
                  message: `${userName} đã bày tỏ cảm xúc ${label} vào bài tâm sự "${post.title}" của bạn.`,
                });
              }
            } catch (_) {}
          }

          return sendSuccess(res, {
            message: currentTypes.includes(type) ? 'Đã bày tỏ cảm xúc thành công!' : 'Đã bỏ chọn cảm xúc',
            data: {
              reactionCounts: post.reactionCounts,
              myReactions: currentTypes,
              reactions: post.reactions,
              cheersCount: post.cheersCount,
              showReactionCount: post.showReactionCount !== false,
              bondLevelUp: bondLevelUp || undefined,
            },
          });
        }
      } catch (dbErr) {
        console.warn('Lỗi MongoDB trong reactToPost, fallback sang persistentStore:', dbErr.message);
      }
    }

    // Fallback persistentStore
    const store = loadStore();
    const post = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
    if (!post) {
      return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
    }

    if (!Array.isArray(post.reactions)) post.reactions = [];
    if (!post.reactionCounts) post.reactionCounts = { sympathy: 0, stop: 0, love: 0, encourage: 0, hug: 0, tea: 0, coffee: 0, goodnight: 0, total: 0 };

    const existingIdx = post.reactions.findIndex((r) => r.userName === userName);
    let currentTypes = existingIdx !== -1 ? [...(post.reactions[existingIdx].types || [])] : [];

    if (currentTypes.includes(type)) {
      currentTypes = currentTypes.filter((t) => t !== type);
    } else {
      if (currentTypes.length >= 2) {
        return sendError(res, {
          message: 'Bạn chỉ có thể chọn tối đa 2 cảm xúc cho một bài viết.',
          status: 400,
        });
      }
      if (type === 'stop' && currentTypes.includes('love')) {
        return sendError(res, {
          message: "Cảm xúc 'Stop' không thể kết hợp cùng 'Yêu thích' ❤️.",
          status: 400,
        });
      }
      if (type === 'love' && currentTypes.includes('stop')) {
        return sendError(res, {
          message: "Cảm xúc 'Yêu thích' ❤️ không thể kết hợp cùng 'Stop' 🛑.",
          status: 400,
        });
      }
      currentTypes.push(type);
    }

    if (currentTypes.length === 0) {
      if (existingIdx !== -1) post.reactions.splice(existingIdx, 1);
    } else {
      if (existingIdx !== -1) {
        post.reactions[existingIdx].types = currentTypes;
      } else {
        post.reactions.push({ userName, userAvatar, types: currentTypes });
      }
    }

    const counts = { sympathy: 0, stop: 0, love: 0, encourage: 0, hug: 0, tea: 0, coffee: 0, goodnight: 0, total: 0 };
    post.reactions.forEach((r) => {
      (r.types || []).forEach((t) => {
        if (counts[t] !== undefined) {
          counts[t]++;
          counts.total++;
        }
      });
    });

    post.reactionCounts = counts;
    post.cheersCount = counts.total;
    saveStore(store);

    if (currentTypes.includes(type)) {
      try {
        const authorId = (post.user?._id || post.user?.id || post.user)?.toString();
        const myId = (req.user?._id || req.user?.id || '').toString();
        if (authorId && authorId !== myId) {
          const REACTION_LABELS = {
            love: '❤️ Yêu thương',
            sympathy: '🤗 Đồng cảm',
            stop: '🛑 Dừng lại & Nghỉ ngơi',
            encourage: '🌱 Tiếp thêm động lực',
          };
          const label = REACTION_LABELS[type] || '❤️ Cảm xúc';
          await createNotification({
            recipientId: authorId,
            sender: req.user || { name: userName, avatar: userAvatar },
            type: 'reaction',
            reactionType: type,
            post: { _id: post._id, title: post.title, slug: post.slug, coverImage: post.coverImage },
            title: 'Tương tác mới về bài viết',
            message: `${userName} đã bày tỏ cảm xúc ${label} vào bài tâm sự "${post.title}" của bạn.`,
          });
        }
      } catch (_) {}
    }

    return sendSuccess(res, {
      message: currentTypes.includes(type) ? 'Đã bày tỏ cảm xúc thành công!' : 'Đã bỏ chọn cảm xúc',
      data: {
        reactionCounts: post.reactionCounts,
        myReactions: currentTypes,
        reactions: post.reactions,
        cheersCount: post.cheersCount,
        showReactionCount: post.showReactionCount !== false,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Tăng lượt chia sẻ bài viết (Facebook-style Share)
 */
export const sharePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (checkDbReady()) {
      const post = await Post.findOne({
        $or: [
          { _id: id && String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { slug: id },
        ].filter(Boolean),
      });

      if (post) {
        post.sharesCount = (post.sharesCount || 0) + 1;
        await post.save();

        const store = loadStore();
        const stored = (store.posts || []).find((p) => p._id === post._id.toString() || p.slug === post.slug);
        if (stored) {
          stored.sharesCount = post.sharesCount;
          saveStore(store);
        }

        try {
          const authorId = (post.user?._id || post.user?.id || post.user)?.toString();
          const myId = (req.user?._id || req.user?.id || '').toString();
          if (authorId && authorId !== myId) {
            await createNotification({
              recipientId: authorId,
              sender: req.user || { name: 'Thành viên' },
              type: 'share',
              post: { _id: post._id, title: post.title, slug: post.slug, coverImage: post.coverImage },
              title: 'Bài viết được chia sẻ 🔄',
              message: `${req.user?.name || 'Một thành viên'} vừa chia sẻ bài tâm sự "${post.title}" của bạn.`,
            });
          }
        } catch (_) {}

        return sendSuccess(res, {
          message: 'Chia sẻ bài viết thành công!',
          data: { sharesCount: post.sharesCount },
        });
      }
    }

    const store = loadStore();
    const post = (store.posts || []).find((p) => p._id === id || p.slug === id);
    if (post) {
      post.sharesCount = (post.sharesCount || 0) + 1;
      saveStore(store);

      try {
        const authorId = (post.user?._id || post.user?.id || post.user)?.toString();
        const myId = (req.user?._id || req.user?.id || '').toString();
        if (authorId && authorId !== myId) {
          await createNotification({
            recipientId: authorId,
            sender: req.user || { name: 'Thành viên' },
            type: 'share',
            post: { _id: post._id, title: post.title, slug: post.slug, coverImage: post.coverImage },
            title: 'Bài viết được chia sẻ 🔄',
            message: `${req.user?.name || 'Một thành viên'} vừa chia sẻ bài tâm sự "${post.title}" của bạn.`,
          });
        }
      } catch (_) {}

      return sendSuccess(res, {
        message: 'Chia sẻ bài viết thành công!',
        data: { sharesCount: post.sharesCount },
      });
    }

    return sendSuccess(res, { data: { sharesCount: 1 } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Bật/Tắt hiển thị số lượng cảm xúc (Dành riêng cho tác giả bài viết hoặc Admin)
 */
export const toggleReactionVisibility = async (req, res) => {
  try {
    const { id } = req.params;
    const { showReactionCount } = req.body;

    if (checkDbReady()) {
      try {
        const post = await Post.findOne({
          $or: [
            { _id: id && String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { slug: id },
          ].filter(Boolean),
        });

        if (post) {
          const isOwner = post.user && post.user.toString() === req.user?._id?.toString();
          const isAdmin = req.user?.role === 'admin';
          if (!isOwner && !isAdmin) {
            return sendError(res, { message: 'Chỉ tác giả mới có quyền ẩn/hiện số lượng cảm xúc', status: 403 });
          }

          post.showReactionCount =
            showReactionCount !== undefined ? Boolean(showReactionCount) : !post.showReactionCount;
          await post.save();

          const store = loadStore();
          const stored = (store.posts || []).find((p) => p._id === post._id.toString() || p.slug === post.slug);
          if (stored) {
            stored.showReactionCount = post.showReactionCount;
            saveStore(store);
          }

          return sendSuccess(res, {
            message: post.showReactionCount
              ? 'Đã bật hiển thị số lượng cảm xúc'
              : 'Đã ẩn số lượng cảm xúc (chỉ hiển thị icon)',
            data: { showReactionCount: post.showReactionCount },
          });
        }
      } catch (dbErr) {
        console.warn('Lỗi MongoDB trong toggleReactionVisibility, fallback sang persistentStore:', dbErr.message);
      }
    }

    const store = loadStore();
    const post = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
    if (post) {
      const isOwner = (post.user && String(post.user._id || post.user) === String(req.user?._id)) || post.author === req.user?.name;
      const isAdmin = req.user?.role === 'admin';
      if (!isOwner && !isAdmin) {
        return sendError(res, { message: 'Chỉ tác giả mới có quyền ẩn/hiện số lượng cảm xúc', status: 403 });
      }

      post.showReactionCount =
        showReactionCount !== undefined ? Boolean(showReactionCount) : !post.showReactionCount;
      saveStore(store);
      return sendSuccess(res, {
        message: post.showReactionCount
          ? 'Đã bật hiển thị số lượng cảm xúc'
          : 'Đã ẩn số lượng cảm xúc (chỉ hiển thị icon)',
        data: { showReactionCount: post.showReactionCount },
      });
    }

    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Tạo mới bài viết (Lưu bền vững trên ổ cứng db_store.json + Đồng bộ MongoDB)
 */
export const createPost = async (req, res) => {
  try {
    const {
      postType = 'article',
      mediaUrls = [],
      title,
      summary,
      content,
      category,
      coverImage,
      tags,
      author,
      authorJob,
      showReactionCount,
      allowComments,
      audioMood,
      voiceGender,
      voiceRegion,
      customVoiceProfile,
      atmosphere,
    } = req.body;

    let finalTitle = (title || '').trim();
    let finalSummary = (summary || '').trim();
    let finalContent = (content || '').trim();
    let finalCoverImage = (coverImage || '').trim();
    let finalMediaUrls = Array.isArray(mediaUrls) ? mediaUrls.filter(Boolean) : [];

    // Validation chặt chẽ theo từng định dạng bài viết
    if (postType === 'photo') {
      if (!finalContent) {
        return sendError(res, {
          message: 'Vui lòng nhập nội dung hoặc cảm nghĩ cho khoảnh khắc ảnh!',
          status: 400,
        });
      }
      if (finalContent.length > 300) {
        return sendError(res, {
          message: `Nội dung khoảnh khắc ảnh tối đa 300 ký tự (Hiện tại: ${finalContent.length} ký tự)!`,
          status: 400,
        });
      }
      if (finalMediaUrls.length === 0 && !finalCoverImage) {
        return sendError(res, {
          message: 'Khoảnh khắc ảnh bắt buộc phải có ít nhất 1 hình ảnh!',
          status: 400,
        });
      }
      if (!finalCoverImage && finalMediaUrls.length > 0) {
        finalCoverImage = finalMediaUrls[0];
      }
      if (!finalTitle) {
        finalTitle = finalContent.slice(0, 40) + (finalContent.length > 40 ? '...' : '');
      }
      if (!finalSummary) {
        finalSummary = finalContent.slice(0, 100);
      }
    } else if (postType === 'video') {
      if (!finalContent) {
        return sendError(res, {
          message: 'Vui lòng nhập chú thích cho video ngắn!',
          status: 400,
        });
      }
      if (finalContent.length > 250) {
        return sendError(res, {
          message: `Chú thích video ngắn tối đa 250 ký tự (Hiện tại: ${finalContent.length} ký tự)!`,
          status: 400,
        });
      }
      if (finalMediaUrls.length === 0 && !finalCoverImage) {
        return sendError(res, {
          message: 'Thước phim ngắn bắt buộc phải có đường dẫn video (YouTube, MP4, v.v.)!',
          status: 400,
        });
      }
      if (!finalCoverImage && finalMediaUrls.length > 0) {
        finalCoverImage = finalMediaUrls[0];
      }
      if (!finalTitle) {
        finalTitle = finalContent.slice(0, 40) + (finalContent.length > 40 ? '...' : '');
      }
      if (!finalSummary) {
        finalSummary = finalContent.slice(0, 100);
      }
    } else {
      // Mặc định: article
      if (!finalTitle || !finalSummary || !finalContent || !category) {
        return sendError(res, {
          message: 'Vui lòng cung cấp đầy đủ Tiêu đề, Tóm tắt, Nội dung và Danh mục',
          status: 400,
        });
      }
    }

    await ensureDbConnected().catch(() => false);

    let baseSlug = slugify(finalTitle || `post-${Date.now()}`);
    let uniqueSlug = baseSlug;

    // Đảm bảo slug là duy nhất trên cả MongoDB lẫn store cục bộ
    const store = loadStore();
    store.posts = store.posts || [];

    let counter = 1;
    while (store.posts.some((p) => p.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    if (checkDbReady()) {
      try {
        while (await Post.exists({ slug: uniqueSlug })) {
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }
      } catch (_) {}
    }

    const resolvedCategory = await resolveCategory(category);
    const isUserAdmin = req.user?.role === 'admin' || req.user?.email === 'anthonyq012025@gmail.com';
    const authorDisplayName = req.user?.name || author || 'Thành viên cộng đồng';
    const authorDisplayJob = req.user?.jobTitle || authorJob || (isUserAdmin ? 'System Admin & Lead Dev' : 'Thành viên cộng đồng');
    const authorAvatar = req.user?.avatar || '';
    const authorSocialLinks = req.user?.socialLinks || {};
    const parsedTags = Array.isArray(tags) ? tags : tags ? tags.split(',').map((t) => t.trim().replace(/^#/, '')) : [];

    // Tự động làm sạch & chèn dấu chấm vào từ ngữ nhạy cảm (D.I.E, c.h.ế.t, t.ự t.ử...)
    const cleanTitle = maskSensitiveText(finalTitle.trim());
    const cleanSummary = maskSensitiveText(finalSummary.trim());
    const cleanContent = maskSensitiveText(finalContent);
    const cleanTags = parsedTags.map((t) => maskSensitiveText(t));

    // Phân tích độ an toàn & yếu tố Chính trị nhạy cảm
    const safetyCheck = analyzeContentSafety(finalTitle, finalSummary, finalContent, parsedTags);

    const newPostData = {
      _id: `post_${Date.now()}`,
      postType,
      mediaUrls: finalMediaUrls,
      title: cleanTitle,
      slug: uniqueSlug,
      summary: cleanSummary,
      content: cleanContent,
      category: resolvedCategory,
      coverImage: finalCoverImage || '/images/sun.jpg',
      tags: cleanTags,
      user: req.user ? {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        avatar: req.user.avatar || authorAvatar,
        jobTitle: req.user.jobTitle,
        bio: req.user.bio,
      } : {
        _id: 'u_admin_1',
        name: authorDisplayName,
        avatar: authorAvatar,
        jobTitle: authorDisplayJob,
      },
      author: authorDisplayName,
      authorJob: authorDisplayJob,
      authorAvatar,
      authorSocialLinks,
      views: 1,
      cheersCount: 0,
      showReactionCount: showReactionCount !== undefined ? Boolean(showReactionCount) : true,
      allowComments: allowComments !== undefined ? Boolean(allowComments) : true,
      reactions: [],
      reactionCounts: { sympathy: 0, stop: 0, love: 0, encourage: 0, total: 0 },
      sharesCount: 0,
      repostCount: 0,
      repostedBy: [],
      visibility: req.body.visibility === 'friends' ? 'friends' : 'public',
      isPublished: true,
      audioMood: audioMood || 'auto',
      voiceGender: voiceGender || 'female',
      voiceRegion: voiceRegion || 'north',
      customVoiceProfile: customVoiceProfile || req.user?.customVoiceProfile || {},
      personalMusic: req.body.personalMusic && typeof req.body.personalMusic === 'object' ? {
        enabled: Boolean(req.body.personalMusic.enabled),
        url: typeof req.body.personalMusic.url === 'string' ? req.body.personalMusic.url.trim() : '',
        provider: typeof req.body.personalMusic.provider === 'string' ? req.body.personalMusic.provider.trim() : '',
        title: typeof req.body.personalMusic.title === 'string' ? req.body.personalMusic.title.trim() : '',
        artist: typeof req.body.personalMusic.artist === 'string' ? req.body.personalMusic.artist.trim() : '',
      } : { enabled: false, url: '', provider: '', title: '', artist: '' },
      atmosphere: atmosphere || {
        theme: 'default',
        soundEnabled: true,
        soundEffect: 'auto',
        bgPreset: 'default',
        customColor: '',
        customBgGradient: '',
        particleEffect: 'none',
      },
      isFlagged: safetyCheck.isFlagged,
      flagReason: safetyCheck.reason || '',
      moderationStatus: safetyCheck.isFlagged ? 'flagged' : 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Luôn ghi xuống db_store.json trên ổ cứng trước tiên để đảm bảo vĩnh viễn không bị mất bài
    store.posts.unshift(newPostData);
    saveStore(store);

    // Đồng thời lưu vào MongoDB nếu database đang online
    if (checkDbReady()) {
      try {
        let dbCategory = category;
        if (typeof category === 'object' && category._id) {
          dbCategory = category._id;
        } else if (resolvedCategory._id && resolvedCategory._id.match(/^[0-9a-fA-F]{24}$/)) {
          dbCategory = resolvedCategory._id;
        } else {
          const catDoc = await Category.findOne({ slug: resolvedCategory.slug });
          if (catDoc) dbCategory = catDoc._id;
        }

        const mongoPost = await Post.create({
          postType: newPostData.postType || 'article',
          mediaUrls: newPostData.mediaUrls || [],
          title: newPostData.title,
          slug: newPostData.slug,
          summary: newPostData.summary,
          content: newPostData.content,
          category: dbCategory,
          coverImage: newPostData.coverImage,
          tags: newPostData.tags,
          user: req.user ? req.user._id : null,
          author: newPostData.author,
          authorJob: newPostData.authorJob,
          authorAvatar: newPostData.authorAvatar,
          authorSocialLinks: newPostData.authorSocialLinks,
          views: 1,
          cheersCount: 0,
          showReactionCount: newPostData.showReactionCount,
          allowComments: newPostData.allowComments,
          reactions: [],
          reactionCounts: newPostData.reactionCounts,
          sharesCount: 0,
          isPublished: true,
          audioMood: newPostData.audioMood,
          voiceGender: newPostData.voiceGender,
          voiceRegion: newPostData.voiceRegion,
          customVoiceProfile: newPostData.customVoiceProfile,
          atmosphere: newPostData.atmosphere,
          isFlagged: newPostData.isFlagged,
          flagReason: newPostData.flagReason,
          moderationStatus: newPostData.moderationStatus,
        });

        if (mongoPost?._id) {
          newPostData._id = mongoPost._id.toString();
          store.posts[0]._id = newPostData._id;
          saveStore(store);
        }
      } catch (dbErr) {
        console.warn('Lỗi lưu MongoDB trong createPost (dữ liệu đã an toàn trong db_store.json):', dbErr.message);
      }
    }

    return sendSuccess(res, {
      message: 'Đã chia sẻ tâm sự thành công! (Dữ liệu đã được lưu bền vững trên ổ cứng)',
      data: newPostData,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Cập nhật chi tiết bài viết (Lưu bền vững trên ổ cứng db_store.json + Đồng bộ MongoDB)
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      summary,
      content,
      category,
      coverImage,
      tags,
      author,
      authorJob,
      views,
      isPublished,
      showReactionCount,
      allowComments,
      audioMood,
      voiceGender,
      voiceRegion,
      customVoiceProfile,
      atmosphere,
    } = req.body;
    const parsedTags = tags !== undefined
      ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean))
      : undefined;

    const store = loadStore();
    store.posts = store.posts || [];
    const idx = store.posts.findIndex((p) => String(p._id) === String(id) || p.slug === id);
    const postInStore = idx !== -1 ? store.posts[idx] : null;

    let dbPost = null;
    if (checkDbReady()) {
      try {
        const mongoQuery = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
        dbPost = await Post.findOne(mongoQuery).populate(
          'user',
          'name email avatar jobTitle bio socialLinks streakCount role'
        );
      } catch (err) {
        console.warn('Lỗi tìm bài viết MongoDB trong updatePost:', err.message);
      }
    }

    const targetPost = dbPost || postInStore;
    if (!targetPost) {
      return sendError(res, { message: 'Không tìm thấy bài viết để cập nhật', status: 404 });
    }

    // 🛡️ BẢO VỆ CHỐNG IDOR: Kiểm tra quyền chủ sở hữu hoặc Quản trị viên (Admin)
    const adminEmail = (process.env.ADMIN_EMAIL || 'anthonyq012025@gmail.com').toLowerCase().trim();
    const isAdmin = req.user?.role === 'admin' || (req.user?.email && req.user.email.toLowerCase().trim() === adminEmail);
    const currentUserId = req.user?._id ? String(req.user._id) : '';
    const currentUserName = (req.user?.name || '').trim().toLowerCase();
    const currentUserEmail = (req.user?.email || '').trim().toLowerCase();

    const postUserId = targetPost.user ? String(targetPost.user._id || targetPost.user) : '';
    const postAuthor = (targetPost.author || '').trim().toLowerCase();
    const postUserEmail = (targetPost.user?.email || '').trim().toLowerCase();

    const isOwner = Boolean(
      (currentUserId && postUserId && currentUserId === postUserId) ||
      (currentUserName && postAuthor && currentUserName === postAuthor) ||
      (currentUserEmail && postAuthor && currentUserEmail.split('@')[0] === postAuthor) ||
      (currentUserEmail && postUserEmail && currentUserEmail === postUserEmail)
    );

    if (!isAdmin && !isOwner) {
      return sendError(res, {
        message: 'Bạn không có quyền chỉnh sửa bài viết này! Chỉ tác giả hoặc quản trị viên mới được phép.',
        status: 403,
      });
    }

    // 🛡️ VALIDATION ĐỊNH DẠNG & GIỚI HẠN KÝ TỰ BÀI ĐĂNG (Tương thích ngược & An toàn dữ liệu)
    const effectivePostType = req.body.postType || targetPost.postType || 'article';
    const effectiveContent = content !== undefined ? String(content).trim() : (targetPost.content || '').trim();

    if (effectivePostType === 'photo' && effectiveContent.length > 300) {
      return sendError(res, {
        message: `Nội dung khoảnh khắc ảnh tối đa 300 ký tự (Hiện tại: ${effectiveContent.length} ký tự)!`,
        status: 400,
      });
    }

    if (effectivePostType === 'video' && effectiveContent.length > 250) {
      return sendError(res, {
        message: `Chú thích video ngắn tối đa 250 ký tự (Hiện tại: ${effectiveContent.length} ký tự)!`,
        status: 400,
      });
    }

    const finalTitle = title !== undefined ? maskSensitiveText(title.trim()) : targetPost.title;
    const finalSummary = summary !== undefined ? maskSensitiveText(summary.trim()) : targetPost.summary;
    const finalContent = content !== undefined ? maskSensitiveText(content) : targetPost.content;
    const finalTags = parsedTags !== undefined
      ? parsedTags.map((t) => maskSensitiveText(t))
      : (Array.isArray(targetPost.tags) ? targetPost.tags : []);
    const safety = analyzeContentSafety(finalTitle, finalSummary, finalContent, finalTags);

    let nextSlug = targetPost.slug;
    if (title && title.trim() && title.trim() !== targetPost.title) {
      const baseSlug = slugify(title);
      nextSlug = baseSlug;
      let counter = 1;
      while (store.posts.some((p, i) => i !== idx && p.slug === nextSlug)) {
        nextSlug = `${baseSlug}-${counter}`;
        counter++;
      }
      if (dbPost && checkDbReady()) {
        try {
          while (await Post.exists({ slug: nextSlug, _id: { $ne: dbPost._id } })) {
            nextSlug = `${baseSlug}-${counter}`;
            counter++;
          }
        } catch (_) {}
      }
    }

    const resolvedCat = category ? await resolveCategory(category) : null;
    const finalMediaUrls = req.body.mediaUrls !== undefined
      ? (Array.isArray(req.body.mediaUrls) ? req.body.mediaUrls.filter(Boolean) : [])
      : (Array.isArray(targetPost.mediaUrls) ? targetPost.mediaUrls : []);

    let updatedStorePost = null;
    if (idx !== -1) {
      const existing = store.posts[idx];
      updatedStorePost = {
        ...existing,
        postType: effectivePostType,
        mediaUrls: finalMediaUrls,
        title: finalTitle,
        slug: nextSlug,
        summary: finalSummary,
        content: finalContent,
        category: resolvedCat || existing.category,
        coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
        tags: finalTags,
        author: author !== undefined ? author.trim() : existing.author,
        authorJob: authorJob !== undefined ? authorJob.trim() : existing.authorJob,
        views: views !== undefined && !isNaN(views) ? Math.max(0, parseInt(views, 10)) : existing.views,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
        showReactionCount: showReactionCount !== undefined ? Boolean(showReactionCount) : existing.showReactionCount,
        allowComments: allowComments !== undefined ? Boolean(allowComments) : (existing.allowComments !== undefined ? existing.allowComments : true),
        audioMood: audioMood !== undefined ? audioMood : existing.audioMood || 'auto',
        voiceGender: voiceGender !== undefined ? voiceGender : existing.voiceGender || 'female',
        voiceRegion: voiceRegion !== undefined ? voiceRegion : existing.voiceRegion || 'north',
        customVoiceProfile: customVoiceProfile !== undefined ? customVoiceProfile : existing.customVoiceProfile || {},
        personalMusic: req.body.personalMusic !== undefined ? req.body.personalMusic : existing.personalMusic || { enabled: false, url: '' },
        atmosphere: atmosphere !== undefined ? atmosphere : existing.atmosphere || {
          theme: 'default',
          soundEnabled: true,
          soundEffect: 'auto',
          bgPreset: 'default',
          customColor: '',
          customBgGradient: '',
          particleEffect: 'none',
        },
        visibility: req.body.visibility !== undefined ? (req.body.visibility === 'friends' ? 'friends' : 'public') : existing.visibility || 'public',
        isFlagged: safety.isFlagged,
        flagReason: safety.reason || '',
        moderationStatus: safety.isFlagged ? 'flagged' : 'approved',
        updatedAt: new Date().toISOString(),
      };

      store.posts[idx] = updatedStorePost;
      saveStore(store);
    }

    // Đồng thời cập nhật trong MongoDB nếu database đang online và bài viết tồn tại trên MongoDB
    let updatedMongoPost = null;
    let mongoUpdateError = null;
    if (dbPost && checkDbReady()) {
      try {
        if (title && title.trim()) {
          dbPost.title = finalTitle;
          dbPost.slug = nextSlug;
        }
        if (summary !== undefined) dbPost.summary = finalSummary;
        if (content !== undefined) dbPost.content = finalContent;
        if (resolvedCat) {
          const catDoc = await Category.findOne({ slug: resolvedCat.slug });
          if (catDoc) dbPost.category = catDoc._id;
        }
        if (coverImage !== undefined) dbPost.coverImage = coverImage;
        dbPost.postType = effectivePostType;
        if (req.body.mediaUrls !== undefined && Array.isArray(req.body.mediaUrls)) {
          dbPost.mediaUrls = finalMediaUrls;
        }
        if (parsedTags !== undefined) dbPost.tags = finalTags;
        if (author !== undefined && author.trim()) dbPost.author = author.trim();
        if (authorJob !== undefined) dbPost.authorJob = authorJob.trim();
        if (views !== undefined && !isNaN(views)) dbPost.views = Math.max(0, parseInt(views, 10));
        if (isPublished !== undefined) dbPost.isPublished = Boolean(isPublished);
        if (showReactionCount !== undefined) dbPost.showReactionCount = Boolean(showReactionCount);
        if (allowComments !== undefined) dbPost.allowComments = Boolean(allowComments);
        if (audioMood !== undefined) dbPost.audioMood = audioMood;
        if (voiceGender !== undefined) dbPost.voiceGender = voiceGender;
        if (voiceRegion !== undefined) dbPost.voiceRegion = voiceRegion;
        if (customVoiceProfile !== undefined) dbPost.customVoiceProfile = customVoiceProfile;
        if (atmosphere !== undefined) dbPost.atmosphere = atmosphere;
        if (req.body.personalMusic !== undefined) dbPost.personalMusic = req.body.personalMusic;
        if (req.body.visibility !== undefined) {
          dbPost.visibility = req.body.visibility === 'friends' ? 'friends' : 'public';
        }
        dbPost.isFlagged = safety.isFlagged;
        dbPost.flagReason = safety.reason || '';
        dbPost.moderationStatus = safety.isFlagged ? 'flagged' : 'approved';

        await dbPost.save();
        await dbPost.populate([
          { path: 'category', select: 'name slug description' },
          { path: 'user', select: 'name avatar jobTitle bio socialLinks streakCount' },
        ]);

        const mongoObj = dbPost.toObject();
        updatedMongoPost = {
          ...mongoObj,
          author: mongoObj.user?.name || sanitizeAuthorName(mongoObj),
          authorJob: mongoObj.authorJob || mongoObj.user?.jobTitle,
          authorAvatar: mongoObj.user?.avatar || mongoObj.authorAvatar,
          authorSocialLinks: mongoObj.user?.socialLinks || mongoObj.authorSocialLinks,
          authorStreakCount: mongoObj.user?.streakCount || mongoObj.authorStreakCount || 0,
        };
      } catch (dbErr) {
        mongoUpdateError = dbErr;
        console.warn('Lỗi cập nhật MongoDB trong updatePost:', dbErr.message);
      }
    }

    const finalUpdatedPost = updatedMongoPost || updatedStorePost;
    if (finalUpdatedPost) {
      return sendSuccess(res, {
        message: 'Đã cập nhật bài viết thành công!',
        data: finalUpdatedPost,
      });
    }

    if (mongoUpdateError) {
      return sendError(res, { message: mongoUpdateError.message || 'Không thể cập nhật bài viết', status: 500 });
    }

    return sendError(res, { message: 'Không tìm thấy bài viết để cập nhật', status: 404 });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Xóa bài viết / Xóa ngang bài vi phạm (Admin & Tác giả)
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const store = loadStore();
    let postToDelete = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);

    let dbPost = null;
    if (checkDbReady()) {
      try {
        const mongoQuery = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
        dbPost = await Post.findOne(mongoQuery);
      } catch (err) {}
    }

    const targetPost = dbPost || postToDelete;
    if (!targetPost) {
      return sendError(res, { message: 'Không tìm thấy bài viết để xóa', status: 404 });
    }

    const isAdmin = req.user?.role === 'admin' || req.user?.email === 'anthonyq012025@gmail.com';
    const currentUserId = req.user?._id ? String(req.user._id) : '';
    const currentUserName = (req.user?.name || '').trim().toLowerCase();
    const currentUserEmail = (req.user?.email || '').trim().toLowerCase();

    const postUserId = targetPost.user ? String(targetPost.user._id || targetPost.user) : '';
    const postAuthor = (targetPost.author || '').trim().toLowerCase();

    const postUserEmail = (targetPost.user?.email || '').trim().toLowerCase();

    const isOwner = Boolean(
      (currentUserId && postUserId && currentUserId === postUserId) ||
      (currentUserName && postAuthor && currentUserName === postAuthor) ||
      (currentUserEmail && postAuthor && currentUserEmail.split('@')[0] === postAuthor) ||
      (currentUserEmail && postUserEmail && currentUserEmail === postUserEmail)
    );

    if (!isAdmin && !isOwner) {
      return sendError(res, { message: 'Bạn chỉ có quyền xóa bài viết do chính bạn đăng!', status: 403 });
    }

    store.posts = (store.posts || []).filter(
      (p) => String(p._id) !== String(id) && p.slug !== id
    );
    saveStore(store);

    if (checkDbReady()) {
      try {
        const mongoQuery = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
        await Post.deleteOne(mongoQuery);
      } catch (dbErr) {
        console.warn('Lỗi xóa MongoDB trong deletePost:', dbErr.message);
      }
    }

    return sendSuccess(res, {
      message: isAdmin && !isOwner
        ? 'Admin đã xóa ngang bài viết vi phạm thành công!'
        : 'Đã xóa bài viết thành công!',
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Kiểm duyệt bài viết nhạy cảm (Dành cho Admin phê duyệt an toàn hoặc gắn cờ)
 */
export const moderatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // 'approve' | 'flag'

    if (req.user?.role !== 'admin') {
      return sendError(res, { message: 'Chỉ Quản trị viên (Admin) mới có quyền kiểm duyệt bài viết', status: 403 });
    }

    await ensureDbConnected().catch(() => false);
    const mongoQuery = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
    const dbPost = checkDbReady() ? await Post.findOne(mongoQuery) : null;

    const store = loadStore();
    const storePost = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
    const target = dbPost || storePost;

    if (!target) {
      return sendError(res, { message: 'Không tìm thấy bài viết để kiểm duyệt', status: 404 });
    }

    const nextFlagged = action !== 'approve';
    const nextReason = nextFlagged ? reason || 'Bài viết bị Admin gắn cờ kiểm duyệt' : '';
    const nextStatus = nextFlagged ? 'flagged' : 'approved';

    if (storePost) {
      storePost.isFlagged = nextFlagged;
      storePost.flagReason = nextReason;
      storePost.moderationStatus = nextStatus;
      saveStore(store);
    }

    let responseData = storePost || null;
    if (dbPost && checkDbReady()) {
      dbPost.isFlagged = nextFlagged;
      dbPost.flagReason = nextReason;
      dbPost.moderationStatus = nextStatus;
      await dbPost.save();
      responseData = dbPost.toObject();
    }

    return sendSuccess(res, {
      message: action === 'approve' ? 'Đã phê duyệt an toàn cho bài viết!' : 'Đã gắn cờ kiểm duyệt bài viết!',
      data: responseData,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy các bài viết gần đây nhất (Sidebar - 100% từ MongoDB)
 */
export const getRecentPosts = async (req, res) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);

    await ensureDbConnected().catch(() => false);
    if (!checkDbReady()) {
      return sendError(res, {
        message: 'Cơ sở dữ liệu MongoDB chưa sẵn sàng. Vui lòng thử lại sau giây lát.',
        status: 503,
      });
    }

    const dbRecent = await Post.find({ isPublished: true })
      .populate('category', 'name slug')
      .populate('user', 'name avatar jobTitle')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = (dbRecent || []).map((dbP) => ({
      ...dbP,
      author: dbP.user?.name ? dbP.user.name : sanitizeAuthorName(dbP),
      authorJob: dbP.user?.jobTitle || dbP.authorJob,
      authorAvatar: dbP.user?.avatar || dbP.authorAvatar || '',
    }));

    return sendSuccess(res, {
      message: 'Lấy bài viết gần đây thành công',
      data: formatted,
    });
  } catch (error) {
    return sendError(res, {
      message: error.message || 'Không thể tải bài viết gần đây từ cơ sở dữ liệu.',
      status: 500,
    });
  }
};

/**
 * Lấy danh sách các Hashtag gợi ý hệ thống (tổng hợp từ MongoDB posts + custom store)
 */
export const getHashtags = async (req, res) => {
  try {
    await ensureDbConnected().catch(() => false);
    const store = loadStore();
    const defaultTags = [
      'burnout', 'smallwins', 'chuyennghe', 'tamsu', 'congso',
      'deadline', 'healing', 'laptrinh', 'it_developer', 'khoinghiep',
      'overthinking', 'khoanglang', 'chualanh', 'ot_dem', 'apluc'
    ];

    const tagSet = new Set(defaultTags);

    if (checkDbReady()) {
      const dbTagRows = await Post.find({ isPublished: true }).select('tags').lean();
      (dbTagRows || []).forEach((p) => {
        if (Array.isArray(p.tags)) {
          p.tags.forEach((t) => {
            if (t && typeof t === 'string') {
              const clean = t.trim().replace(/^#/, '').toLowerCase();
              if (clean) tagSet.add(clean);
            }
          });
        }
      });
    }

    // Bổ sung các custom hashtags đã lưu
    if (Array.isArray(store.customHashtags)) {
      store.customHashtags.forEach((t) => {
        if (t && typeof t === 'string') {
          const clean = t.trim().replace(/^#/, '').toLowerCase();
          if (clean) tagSet.add(clean);
        }
      });
    }

    return sendSuccess(res, {
      message: 'Lấy danh sách hashtags thành công',
      data: Array.from(tagSet),
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Đăng ký lưu thêm một hashtag mới vào hệ thống
 */
export const addHashtag = async (req, res) => {
  try {
    const { tag } = req.body;
    if (!tag || typeof tag !== 'string') {
      return sendError(res, { message: 'Hashtag không hợp lệ', status: 400 });
    }

    const clean = tag.trim().replace(/^#/, '').toLowerCase();
    if (!clean || clean.length > 40) {
      return sendError(res, { message: 'Hashtag không hợp lệ hoặc quá dài (tối đa 40 ký tự)', status: 400 });
    }

    const store = loadStore();
    store.customHashtags = store.customHashtags || [];
    if (!store.customHashtags.includes(clean)) {
      store.customHashtags.push(clean);
      saveStore(store);
    }

    return sendSuccess(res, {
      message: 'Đã lưu hashtag mới thành công',
      data: clean,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Chia sẻ bài viết về trang cá nhân (Repost / Share to profile)
 */
export const repostPost = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    if (!user) {
      return sendError(res, { message: 'Vui lòng đăng nhập để chia sẻ bài viết về trang cá nhân', status: 401 });
    }

    const store = loadStore();
    store.posts = store.posts || [];
    let post = store.posts.find((p) => p._id === id || p.slug === id);

    if (checkDbReady()) {
      try {
        let dbPost = await Post.findOne({
          $or: [
            { _id: id && String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { slug: id },
          ].filter(Boolean),
        });
        if (dbPost) {
          if (!Array.isArray(dbPost.repostedBy)) dbPost.repostedBy = [];
          const already = dbPost.repostedBy.some((r) => r.user?.toString() === user._id?.toString());
          if (!already) {
            dbPost.repostedBy.push({
              user: user._id,
              userName: user.name,
              userAvatar: user.avatar || '',
              repostedAt: new Date(),
            });
            dbPost.repostCount = (dbPost.repostCount || 0) + 1;
            dbPost.sharesCount = (dbPost.sharesCount || 0) + 1;
            await dbPost.save();
          }
        }
      } catch (err) {
        console.warn('Lỗi repost trong db:', err.message);
      }
    }

    if (post) {
      if (!Array.isArray(post.repostedBy)) post.repostedBy = [];
      const already = post.repostedBy.some((r) => String(r.user?._id || r.user) === String(user._id));
      if (!already) {
        post.repostedBy.push({
          user: {
            _id: user._id,
            name: user.name,
            avatar: user.avatar || '',
          },
          userName: user.name,
          userAvatar: user.avatar || '',
          repostedAt: new Date().toISOString(),
        });
        post.repostCount = (post.repostCount || 0) + 1;
        post.sharesCount = (post.sharesCount || 0) + 1;
        saveStore(store);
      }
      return sendSuccess(res, {
        message: 'Đã chia sẻ bài viết về trang cá nhân của bạn!',
        data: { repostCount: post.repostCount, sharesCount: post.sharesCount },
      });
    }

    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Bật / Tắt tính năng bình luận của bài viết (Chỉ tác giả hoặc Admin)
 */
export const toggleAllowComments = async (req, res) => {
  try {
    const { id } = req.params;
    const { allowComments } = req.body;

    if (checkDbReady()) {
      try {
        const post = await Post.findOne({
          $or: [
            { _id: id && String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null },
            { slug: id },
          ],
        });

        if (post) {
          const isOwner = (post.user && String(post.user._id || post.user) === String(req.user?._id)) || post.author === req.user?.name;
          const isAdmin = req.user?.role === 'admin';
          if (!isOwner && !isAdmin) {
            return sendError(res, { message: 'Chỉ tác giả bài viết hoặc Admin mới có quyền bật/tắt bình luận', status: 403 });
          }

          post.allowComments = allowComments !== undefined ? Boolean(allowComments) : !post.allowComments;
          await post.save();

          // Đồng bộ sang persistentStore
          const store = loadStore();
          const storePost = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
          if (storePost) {
            storePost.allowComments = post.allowComments;
            saveStore(store);
          }

          return sendSuccess(res, {
            message: post.allowComments
              ? '✓ Đã mở lại tính năng bình luận cho bài viết'
              : '✓ Đã tắt tính năng bình luận cho bài viết',
            data: { allowComments: post.allowComments },
          });
        }
      } catch (dbErr) {
        console.warn('Lỗi MongoDB trong toggleAllowComments, fallback sang persistentStore:', dbErr.message);
      }
    }

    const store = loadStore();
    const post = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
    if (post) {
      const isOwner = (post.user && String(post.user._id || post.user) === String(req.user?._id)) || post.author === req.user?.name;
      const isAdmin = req.user?.role === 'admin';
      if (!isOwner && !isAdmin) {
        return sendError(res, { message: 'Chỉ tác giả bài viết hoặc Admin mới có quyền bật/tắt bình luận', status: 403 });
      }

      post.allowComments = allowComments !== undefined ? Boolean(allowComments) : !post.allowComments;
      saveStore(store);
      return sendSuccess(res, {
        message: post.allowComments
          ? '✓ Đã mở lại tính năng bình luận cho bài viết'
          : '✓ Đã tắt tính năng bình luận cho bài viết',
        data: { allowComments: post.allowComments },
      });
    }

    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

