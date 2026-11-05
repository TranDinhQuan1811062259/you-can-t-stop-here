import Post from '../models/Post.js';
import Category from '../models/Category.js';
import User from '../models/User.js';
import { checkDbReady } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { slugify } from '../utils/slugify.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';
import { maskSensitiveText, analyzeContentSafety } from '../utils/sensitiveFilter.js';

const fallbackCategories = [
  { _id: 'cat_1', name: 'Áp lực & Kiệt sức (Burnout)', slug: 'ap-luc-kiet-suc-burnout' },
  { _id: 'cat_2', name: 'Khủng hoảng nghề nghiệp (Career Crisis)', slug: 'khung-hoang-nghe-nghiep-career-crisis' },
  { _id: 'cat_3', name: 'Chuyển ngành & Bắt đầu lại (Restart)', slug: 'chuyen-nganh-bat-dau-lai-restart' },
  { _id: 'cat_4', name: 'Những tia sáng & Động lực (Small Wins)', slug: 'nhung-tia-sang-dong-luc-small-wins' },
];

/**
 * Trợ giúp chuẩn hóa danh mục sang dạng object { _id, name, slug }
 */
const resolveCategory = async (catInput) => {
  if (!catInput) return fallbackCategories[0];
  if (typeof catInput === 'object' && catInput.name && catInput.slug) return catInput;

  const store = loadStore();
  const allCats = [...(store.categories || []), ...fallbackCategories];
  const found = allCats.find(
    (c) =>
      c._id === catInput ||
      c.slug === catInput ||
      c.name.toLowerCase() === String(catInput).toLowerCase()
  );
  if (found) return { _id: found._id, name: found.name, slug: found.slug };

  if (checkDbReady()) {
    try {
      const dbCat = await Category.findOne({
        $or: [{ slug: catInput }, { _id: String(catInput).match(/^[0-9a-fA-F]{24}$/) ? catInput : null }].filter(Boolean),
      });
      if (dbCat) return { _id: dbCat._id.toString(), name: dbCat.name, slug: dbCat.slug };
    } catch {}
  }

  return { _id: String(catInput), name: 'Tâm sự', slug: 'tam-su' };
};

/**
 * Lấy danh sách bài viết (Hỗ trợ phân trang, tìm kiếm, lọc theo category/tag)
 * ĐỒNG BỘ 2 CHIỀU GIỮA Ổ CỨNG VÀ DATABASE: Không bao giờ bị mất bài khi CCleaner dọn máy
 */
export const getPosts = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 6);
    const { category, tag, q } = req.query;

    const store = loadStore();
    let allPosts = [...(store.posts || [])];

    // Nếu MongoDB đang sẵn sàng, hợp nhất dữ liệu hai chiều
    if (checkDbReady()) {
      try {
        const dbPosts = await Post.find({ isPublished: true })
          .populate('category', 'name slug')
          .populate('user', 'name avatar jobTitle bio')
          .sort({ createdAt: -1 })
          .lean();

        if (dbPosts && dbPosts.length > 0) {
          const map = new Map();
          // Nạp các bài từ store trước
          allPosts.forEach((p) => {
            const key = p.slug || String(p._id);
            map.set(key, p);
          });
          // Hợp nhất bài từ MongoDB
          dbPosts.forEach((dbP) => {
            const key = dbP.slug || String(dbP._id);
            const enrichedDb = {
              ...dbP,
              author: dbP.user?.name || dbP.author,
              authorJob: dbP.user?.jobTitle || dbP.authorJob,
              authorAvatar: dbP.user?.avatar || dbP.authorAvatar || '/images/man.jpg',
            };
            if (!map.has(key)) {
              map.set(key, enrichedDb);
            } else {
              map.set(key, {
                ...enrichedDb,
                ...map.get(key),
                views: Math.max(map.get(key).views || 0, enrichedDb.views || 0),
                cheersCount: Math.max(map.get(key).cheersCount || 0, enrichedDb.cheersCount || 0),
              });
            }
          });

          allPosts = Array.from(map.values());
          store.posts = allPosts;
          saveStore(store);
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ MongoDB trong getPosts, dùng local store:', err.message);
      }
    }

    let filtered = allPosts;

    if (category) {
      filtered = filtered.filter(
        (p) =>
          p.category?.slug === category ||
          p.category?._id === category ||
          (typeof p.category === 'string' && p.category === category)
      );
    }

    if (tag) {
      const cleanTag = tag.replace(/^#/, '').trim().toLowerCase();
      filtered = filtered.filter((p) =>
        (p.tags || []).some((t) => t.toLowerCase() === cleanTag)
      );
    }

    if (q) {
      const lowerQ = q.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(lowerQ) ||
          p.summary?.toLowerCase().includes(lowerQ)
      );
    }

    // Sắp xếp bài viết mới nhất lên đầu
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return sendSuccess(res, {
      message: 'Lấy bài viết thành công (Dữ liệu lưu trữ bền vững)',
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
    const store = loadStore();
    return sendSuccess(res, {
      message: 'Lấy bài viết thành công',
      data: (store.posts || []).slice(0, 6),
      pagination: { total: store.posts?.length || 0, page: 1, limit: 6, totalPages: 1 },
    });
  }
};

/**
 * Lấy chi tiết bài viết theo Slug (Tự động tăng số lượt đọc thực tế)
 */
export const getPostBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (checkDbReady()) {
      let post = await Post.findOne({ slug, isPublished: true })
        .populate('category', 'name slug description')
        .populate('user', 'name avatar jobTitle bio socialLinks');

      if (post) {
        // Tự động gán đúng tác giả và avatar mới nhất cho bài viết
        if (
          !post.user ||
          post.author === 'Trần Đình Quân' ||
          post.author === 'Đình Quân Trần' ||
          slug === '2-gio-sang-o-van-phong-va-cau-hoi-minh-dang-chay-dua-vi-dieu-gi'
        ) {
          const adminUser = await User.findOne({ email: 'anthonyq012025@gmail.com' });
          if (adminUser) {
            post.user = adminUser;
            post.author = adminUser.name;
            post.authorJob = adminUser.jobTitle;
            post.authorAvatar = adminUser.avatar;
            post.authorSocialLinks = adminUser.socialLinks;
          }
        } else if (post.user && post.user.avatar) {
          post.authorAvatar = post.user.avatar;
          post.author = post.user.name;
          post.authorJob = post.user.jobTitle;
          post.authorSocialLinks = post.user.socialLinks;
        }

        // Tăng lượt đọc thực tế
        post.views = (post.views || 0) + 1;
        await post.save();

        // Đồng bộ view vào persistentStore
        const store = loadStore();
        const storedPost = (store.posts || []).find((p) => p.slug === slug || p._id === post._id.toString());
        if (storedPost) {
          storedPost.views = post.views;
          saveStore(store);
        }

        return sendSuccess(res, {
          message: 'Lấy thông tin bài viết thành công',
          data: post,
        });
      }
    }

    // Đọc từ persistentStore (Ổ cứng db_store.json)
    const store = loadStore();
    const post = (store.posts || []).find(
      (p) => p.slug === slug || String(p._id) === String(slug)
    );
    if (post) {
      post.views = (post.views || 0) + 1;
      saveStore(store);

      return sendSuccess(res, {
        message: 'Lấy thông tin bài viết thành công',
        data: post,
      });
    }

    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    const store = loadStore();
    const post = (store.posts || []).find((p) => p.slug === req.params.slug);
    if (post) return sendSuccess(res, { data: post });
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy chi tiết bài viết theo ID
 */
export const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    if (checkDbReady()) {
      const post = await Post.findById(id).populate('category', 'name slug');
      if (post) return sendSuccess(res, { data: post });
    }
    const store = loadStore();
    const post = (store.posts || []).find((p) => p._id === id);
    if (post) return sendSuccess(res, { data: post });
    return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Gửi lời động viên (Cheer - legacy)
 */
export const cheerPost = async (req, res) => {
  try {
    const { id } = req.params;

    if (checkDbReady()) {
      const post = await Post.findByIdAndUpdate(
        id,
        { $inc: { cheersCount: 1 } },
        { new: true }
      );
      if (post) {
        const store = loadStore();
        const storedPost = (store.posts || []).find((p) => p._id === id || p.slug === id);
        if (storedPost) {
          storedPost.cheersCount = post.cheersCount;
          saveStore(store);
        }
        return sendSuccess(res, { data: { cheersCount: post.cheersCount } });
      }
    }

    const store = loadStore();
    const post = (store.posts || []).find((p) => p._id === id || p.slug === id);
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
    const VALID_TYPES = ['sympathy', 'stop', 'love', 'encourage'];

    if (!VALID_TYPES.includes(type)) {
      return sendError(res, {
        message: 'Loại cảm xúc không hợp lệ. Hỗ trợ: sympathy, stop, love, encourage',
        status: 400,
      });
    }

    const userId = req.user?._id;
    const userName = req.user?.name || 'Thành viên';
    const userAvatar = req.user?.avatar || '/images/man.jpg';

    if (checkDbReady()) {
      let post = await Post.findOne({
        $or: [
          { _id: id && String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { slug: id },
        ].filter(Boolean),
      });

      if (!post) {
        return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
      }

      if (!Array.isArray(post.reactions)) {
        post.reactions = [];
      }
      if (!post.reactionCounts) {
        post.reactionCounts = { sympathy: 0, stop: 0, love: 0, encourage: 0, total: 0 };
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
      const counts = { sympathy: 0, stop: 0, love: 0, encourage: 0, total: 0 };
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
    }

    // Fallback persistentStore
    const store = loadStore();
    const post = (store.posts || []).find((p) => p._id === id || p.slug === id);
    if (!post) {
      return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
    }

    if (!Array.isArray(post.reactions)) post.reactions = [];
    if (!post.reactionCounts) post.reactionCounts = { sympathy: 0, stop: 0, love: 0, encourage: 0, total: 0 };

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

    const counts = { sympathy: 0, stop: 0, love: 0, encourage: 0, total: 0 };
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
      const post = await Post.findOne({
        $or: [
          { _id: id && String(id).match(/^[0-9a-fA-F]{24}$/) ? id : null },
          { slug: id },
        ].filter(Boolean),
      });

      if (!post) {
        return sendError(res, { message: 'Không tìm thấy bài viết', status: 404 });
      }

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

    const store = loadStore();
    const post = (store.posts || []).find((p) => p._id === id || p.slug === id);
    if (post) {
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
      title,
      summary,
      content,
      category,
      coverImage,
      tags,
      author,
      authorJob,
      showReactionCount,
      audioMood,
      customVoiceProfile,
    } = req.body;

    if (!title || !summary || !content || !category) {
      return sendError(res, {
        message: 'Vui lòng cung cấp đầy đủ Tiêu đề, Tóm tắt, Nội dung và Danh mục',
        status: 400,
      });
    }

    let baseSlug = slugify(title);
    let uniqueSlug = baseSlug;

    // Đảm bảo slug là duy nhất
    const store = loadStore();
    store.posts = store.posts || [];

    let counter = 1;
    while (store.posts.some((p) => p.slug === uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const resolvedCategory = await resolveCategory(category);
    const authorDisplayName = author || (req.user ? req.user.name : 'Trần Đình Quân');
    const authorDisplayJob = authorJob || (req.user ? req.user.jobTitle : 'System Admin & Lead Dev');
    const authorAvatar = req.user?.avatar || '/images/man.jpg';
    const authorSocialLinks = req.user?.socialLinks || {};
    const parsedTags = Array.isArray(tags) ? tags : tags ? tags.split(',').map((t) => t.trim().replace(/^#/, '')) : [];

    // Tự động làm sạch & chèn dấu chấm vào từ ngữ nhạy cảm (D.I.E, c.h.ế.t, t.ự t.ử...)
    const cleanTitle = maskSensitiveText(title.trim());
    const cleanSummary = maskSensitiveText(summary.trim());
    const cleanContent = maskSensitiveText(content);
    const cleanTags = parsedTags.map((t) => maskSensitiveText(t));

    // Phân tích độ an toàn & yếu tố Chính trị nhạy cảm
    const safetyCheck = analyzeContentSafety(title, summary, content, parsedTags);

    const newPostData = {
      _id: `post_${Date.now()}`,
      title: cleanTitle,
      slug: uniqueSlug,
      summary: cleanSummary,
      content: cleanContent,
      category: resolvedCategory,
      coverImage: coverImage || '/images/sun.jpg',
      tags: cleanTags,
      user: req.user ? {
        _id: req.user._id,
        name: req.user.name,
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
      reactions: [],
      reactionCounts: { sympathy: 0, stop: 0, love: 0, encourage: 0, total: 0 },
      sharesCount: 0,
      isPublished: true,
      audioMood: audioMood || 'auto',
      customVoiceProfile: customVoiceProfile || req.user?.customVoiceProfile || {},
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
          reactions: [],
          reactionCounts: newPostData.reactionCounts,
          sharesCount: 0,
          isPublished: true,
          audioMood: newPostData.audioMood,
          customVoiceProfile: newPostData.customVoiceProfile,
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
      audioMood,
      customVoiceProfile,
    } = req.body;
    const parsedTags = tags !== undefined
      ? (Array.isArray(tags) ? tags : tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean))
      : undefined;

    const store = loadStore();
    store.posts = store.posts || [];
    const idx = store.posts.findIndex((p) => String(p._id) === String(id) || p.slug === id);

    let updatedPostObj = null;

    if (idx !== -1) {
      const existing = store.posts[idx];
      let newSlug = existing.slug;
      if (title && title.trim() && title.trim() !== existing.title) {
        newSlug = slugify(title);
        let counter = 1;
        while (store.posts.some((p, i) => i !== idx && p.slug === newSlug)) {
          newSlug = `${slugify(title)}-${counter}`;
          counter++;
        }
      }

      let updatedCategory = existing.category;
      if (category) {
        updatedCategory = await resolveCategory(category);
      }

      const finalTitle = title !== undefined ? maskSensitiveText(title.trim()) : existing.title;
      const finalSummary = summary !== undefined ? maskSensitiveText(summary.trim()) : existing.summary;
      const finalContent = content !== undefined ? maskSensitiveText(content) : existing.content;
      const finalTags = parsedTags !== undefined ? parsedTags.map((t) => maskSensitiveText(t)) : existing.tags;

      const safety = analyzeContentSafety(finalTitle, finalSummary, finalContent, finalTags);

      updatedPostObj = {
        ...existing,
        title: finalTitle,
        slug: newSlug,
        summary: finalSummary,
        content: finalContent,
        category: updatedCategory,
        coverImage: coverImage !== undefined ? coverImage : existing.coverImage,
        tags: finalTags,
        author: author !== undefined ? author.trim() : existing.author,
        authorJob: authorJob !== undefined ? authorJob.trim() : existing.authorJob,
        views: views !== undefined && !isNaN(views) ? Math.max(0, parseInt(views, 10)) : existing.views,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
        showReactionCount: showReactionCount !== undefined ? Boolean(showReactionCount) : existing.showReactionCount,
        audioMood: audioMood !== undefined ? audioMood : existing.audioMood || 'auto',
        customVoiceProfile: customVoiceProfile !== undefined ? customVoiceProfile : existing.customVoiceProfile || {},
        isFlagged: safety.isFlagged,
        flagReason: safety.reason || '',
        moderationStatus: safety.isFlagged ? 'flagged' : 'approved',
        updatedAt: new Date().toISOString(),
      };

      store.posts[idx] = updatedPostObj;
      saveStore(store);
    }

    // Đồng thời cập nhật trong MongoDB nếu database đang online
    if (checkDbReady()) {
      try {
        const mongoQuery = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
        const post = await Post.findOne(mongoQuery);
        if (post) {
          if (title && title.trim()) {
            post.title = title.trim();
            post.slug = updatedPostObj?.slug || slugify(title);
          }
          if (summary !== undefined) post.summary = summary.trim();
          if (content !== undefined) post.content = content;
          if (category) {
            const resCat = await resolveCategory(category);
            const catDoc = await Category.findOne({ slug: resCat.slug });
            if (catDoc) post.category = catDoc._id;
          }
          if (coverImage) post.coverImage = coverImage;
          if (parsedTags !== undefined) post.tags = parsedTags;
          if (author) post.author = author.trim();
          if (authorJob !== undefined) post.authorJob = authorJob.trim();
          if (views !== undefined && !isNaN(views)) post.views = Math.max(0, parseInt(views, 10));
          if (isPublished !== undefined) post.isPublished = Boolean(isPublished);
          if (showReactionCount !== undefined) post.showReactionCount = Boolean(showReactionCount);
          await post.save();
        }
      } catch (dbErr) {
        console.warn('Lỗi cập nhật MongoDB trong updatePost:', dbErr.message);
      }
    }

    if (updatedPostObj) {
      return sendSuccess(res, {
        message: 'Đã cập nhật bài viết thành công! (Dữ liệu đã lưu bền vững trên ổ cứng)',
        data: updatedPostObj,
      });
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
    const postToDelete = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);

    const isAdmin = req.user?.role === 'admin';
    const isOwner = postToDelete && (
      (postToDelete.user && String(postToDelete.user._id || postToDelete.user) === String(req.user?._id)) ||
      postToDelete.author === req.user?.name
    );

    if (!isAdmin && !isOwner && req.user) {
      return sendError(res, { message: 'Bạn không có quyền xóa bài viết này', status: 403 });
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

    const store = loadStore();
    const post = (store.posts || []).find((p) => String(p._id) === String(id) || p.slug === id);
    if (!post) {
      return sendError(res, { message: 'Không tìm thấy bài viết để kiểm duyệt', status: 404 });
    }

    if (action === 'approve') {
      post.isFlagged = false;
      post.flagReason = '';
      post.moderationStatus = 'approved';
    } else {
      post.isFlagged = true;
      post.flagReason = reason || 'Bài viết bị Admin gắn cờ kiểm duyệt';
      post.moderationStatus = 'flagged';
    }

    saveStore(store);

    if (checkDbReady()) {
      try {
        const mongoQuery = String(id).match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { slug: id };
        await Post.updateOne(mongoQuery, {
          isFlagged: post.isFlagged,
          flagReason: post.flagReason,
          moderationStatus: post.moderationStatus,
        });
      } catch (dbErr) {
        console.warn('Lỗi cập nhật MongoDB trong moderatePost:', dbErr.message);
      }
    }

    return sendSuccess(res, {
      message: action === 'approve' ? 'Đã phê duyệt an toàn cho bài viết!' : 'Đã gắn cờ kiểm duyệt bài viết!',
      data: post,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy các bài viết gần đây nhất (Sidebar)
 */
export const getRecentPosts = async (req, res) => {
  try {
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 4);
    const store = loadStore();
    const sorted = [...(store.posts || [])].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    return sendSuccess(res, {
      message: 'Lấy bài viết gần đây thành công',
      data: sorted.slice(0, limit),
    });
  } catch (error) {
    const store = loadStore();
    return sendSuccess(res, { data: (store.posts || []).slice(0, 4) });
  }
};
