import { loadStore, saveStore } from '../utils/persistentStore.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { checkDbReady } from '../config/db.js';

const DEFAULT_STORIES = [
  {
    _id: 'story_demo_1',
    userId: '6aec5b46ee112662b33c0e32',
    userName: 'Anthony Quân',
    userAvatar: '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg',
    content: 'Vừa hoàn thành xong sprint release lúc 22:00! Thở phào nhẹ nhõm, chúc cả nhà ngủ ngon 🌙✨',
    drawingData: null,
    musicTitle: 'Lofi Chill - Đêm muộn ở văn phòng',
    musicUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
    bgGradient: 'midnight',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    viewsCount: 28,
  },
  {
    _id: 'story_demo_2',
    userId: 'u_huong_ly',
    userName: 'Hương Ly',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    content: 'Tự thưởng cho bản thân một ly trà đào sau 8 tiếng đối mặt deadline căng thẳng ☕🌸 You can do it!',
    drawingData: null,
    musicTitle: 'Acoustic Sunset - Bình yên sau tan ca',
    musicUrl: 'https://cdn.pixabay.com/download/audio/2022/11/06/audio_c93e43d61f.mp3?filename=warm-acoustic-guitar-124928.mp3',
    bgGradient: 'sunset',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    viewsCount: 45,
  },
  {
    _id: 'story_demo_3',
    userId: '67c9c0000000000000000003',
    userName: 'Đức Huy',
    userAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    content: 'Hôm nay dù dự án có trễ chút, nhưng sức khỏe và sự bình an của mình vẫn là số 1 🌿💚',
    drawingData: null,
    musicTitle: 'Healing Piano - Khoảng lặng tâm hồn',
    musicUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=ambient-piano-amp-strings-10711.mp3',
    bgGradient: 'emerald',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
    viewsCount: 39,
  },
];

/**
 * Lấy danh sách tất cả Story đang còn hiệu lực trong vòng 24h
 */
export const getActiveStories = async (req, res) => {
  try {
    const store = loadStore();
    if (!store.stories || store.stories.length === 0) {
      store.stories = [...DEFAULT_STORIES];
      saveStore(store);
    }

    const now = Date.now();
    // Lọc các story chưa quá hạn 24 tiếng
    const activeStories = store.stories
      .filter((s) => new Date(s.expiresAt).getTime() > now)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sendSuccess(res, {
      message: 'Lấy danh sách story 24h thành công',
      data: activeStories,
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi khi tải story', status: 500 });
  }
};

/**
 * Đăng Story mới (tối đa 280 ký tự, có nhạc, cọ vẽ canvas, tồn tại 24h)
 */
export const createStory = async (req, res) => {
  try {
    const {
      content,
      drawingData,
      mediaUrl,
      mediaType,
      musicTitle,
      musicUrl,
      bgGradient = 'sunset',
    } = req.body;
    const user = req.user || {};

    if (!content && !drawingData && !mediaUrl) {
      return sendError(res, {
        message: 'Vui lòng nhập nội dung, tải ảnh/video hoặc vẽ nét lên story!',
        status: 400,
      });
    }

    if (content && content.length > 280) {
      return sendError(res, { message: 'Story giới hạn tối đa 280 ký tự!', status: 400 });
    }

    const store = loadStore();
    store.stories = store.stories || [];

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Hết hạn sau đúng 24h

    // Tự động nhận diện mediaType nếu chưa có
    let detectedMediaType = mediaType || 'none';
    if (mediaUrl && (!mediaType || mediaType === 'none')) {
      const isVideo =
        mediaUrl.match(/\.(mp4|webm|mov|ogg|m4v)$/i) ||
        mediaUrl.startsWith('data:video/');
      detectedMediaType = isVideo ? 'video' : 'image';
    }

    const newStory = {
      _id: `story_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: user._id || `guest_${Date.now()}`,
      userName: user.name || 'Thành viên ẩn danh',
      userAvatar: user.avatar || '/images/man.jpg',
      content: content ? content.trim() : '',
      drawingData: drawingData || null,
      mediaUrl: mediaUrl || null,
      mediaType: detectedMediaType,
      musicTitle: musicTitle || 'Nhạc êm dịu',
      musicUrl: musicUrl || null,
      bgGradient,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      viewsCount: 1,
    };

    store.stories.unshift(newStory);
    saveStore(store);

    return sendSuccess(res, {
      message: '✓ Đã đăng Story 24h thành công!',
      data: newStory,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi khi tạo story', status: 500 });
  }
};

/**
 * Chỉnh sửa Story của mình (cập nhật text, nhạc hoặc nền)
 */
export const updateStory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      content,
      drawingData,
      mediaUrl,
      mediaType,
      musicTitle,
      musicUrl,
      bgGradient,
    } = req.body;
    const user = req.user || {};

    const store = loadStore();
    store.stories = store.stories || [];

    const idx = store.stories.findIndex((s) => s._id === id);
    if (idx === -1) {
      return sendError(res, { message: 'Không tìm thấy Story cần sửa!', status: 404 });
    }

    const story = store.stories[idx];
    // Kiểm tra quyền sở hữu hoặc Admin
    if (user.role !== 'admin' && String(story.userId) !== String(user._id)) {
      return sendError(res, { message: 'Bạn không có quyền chỉnh sửa Story này!', status: 403 });
    }

    if (content && content.length > 280) {
      return sendError(res, { message: 'Story giới hạn tối đa 280 ký tự!', status: 400 });
    }

    let nextMediaType = story.mediaType;
    if (mediaType !== undefined) {
      nextMediaType = mediaType;
    } else if (mediaUrl !== undefined) {
      nextMediaType = mediaUrl
        ? (mediaUrl.match(/\.(mp4|webm|mov|ogg|m4v)$/i) || mediaUrl.startsWith('data:video/') ? 'video' : 'image')
        : 'none';
    }

    store.stories[idx] = {
      ...story,
      content: content !== undefined ? content.trim() : story.content,
      drawingData: drawingData !== undefined ? drawingData : story.drawingData,
      mediaUrl: mediaUrl !== undefined ? mediaUrl : story.mediaUrl,
      mediaType: nextMediaType,
      musicTitle: musicTitle !== undefined ? musicTitle : story.musicTitle,
      musicUrl: musicUrl !== undefined ? musicUrl : story.musicUrl,
      bgGradient: bgGradient !== undefined ? bgGradient : story.bgGradient,
      updatedAt: new Date().toISOString(),
    };

    saveStore(store);

    return sendSuccess(res, {
      message: '✓ Đã cập nhật Story thành công!',
      data: store.stories[idx],
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi cập nhật story', status: 500 });
  }
};

/**
 * Xóa Story của mình hoặc Admin xóa
 */
export const deleteStory = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || {};

    const store = loadStore();
    store.stories = store.stories || [];

    const idx = store.stories.findIndex((s) => s._id === id);
    if (idx === -1) {
      return sendError(res, { message: 'Không tìm thấy Story cần xóa!', status: 404 });
    }

    const story = store.stories[idx];
    if (user.role !== 'admin' && String(story.userId) !== String(user._id)) {
      return sendError(res, { message: 'Bạn không có quyền xóa Story này!', status: 403 });
    }

    store.stories.splice(idx, 1);
    saveStore(store);

    return sendSuccess(res, {
      message: '✓ Đã xóa Story thành công!',
      data: { id },
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi xóa story', status: 500 });
  }
};

/**
 * Phản hồi / Bình luận Story dạng tin nhắn trực tiếp (Direct Message)
 * Gửi tin nhắn thẳng vào hộp thư trò chuyện của người đăng Story
 */
export const replyToStory = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, reactionEmoji } = req.body;
    const user = req.user;

    if (!user) {
      return sendError(res, { message: 'Vui lòng đăng nhập để gửi phản hồi', status: 401 });
    }

    if ((!message || !message.trim()) && !reactionEmoji) {
      return sendError(res, { message: 'Vui lòng nhập nội dung tin nhắn hoặc chọn biểu tượng cảm xúc', status: 400 });
    }

    const store = loadStore();
    store.stories = store.stories || [];
    const story = store.stories.find((s) => s._id === id);

    if (!story) {
      return sendError(res, { message: 'Story không tồn tại hoặc đã hết hạn!', status: 404 });
    }

    const replyText = reactionEmoji
      ? `${reactionEmoji}`
      : message.trim();

    const replyEntry = {
      _id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
      },
      content: replyText,
      reactionEmoji: reactionEmoji || '',
      createdAt: new Date().toISOString(),
    };

    story.replies = story.replies || [];
    story.replies.push(replyEntry);
    saveStore(store);

    // Gửi tin nhắn trực tiếp (DM) cho tác giả Story nếu khác người đang đăng
    const authorId = story.userId;
    if (authorId && String(authorId) !== String(user._id)) {
      try {
        const storySnippet = story.content ? story.content.slice(0, 45) : (story.mediaType === 'video' ? '🎬 Video' : '📸 Hình ảnh');
        const chatContent = reactionEmoji
          ? `${reactionEmoji} Đã bày tỏ cảm xúc về Story: "${storySnippet}..."`
          : `💬 [Trả lời Story "${storySnippet}..."]: ${replyText}`;

        if (checkDbReady()) {
          let conv = await Conversation.findOne({
            participants: { $all: [user._id, authorId] },
          });

          if (!conv) {
            conv = await Conversation.create({
              participants: [user._id, authorId],
              status: 'accepted',
              lastMessage: {
                content: chatContent,
                sender: user._id,
                createdAt: new Date(),
              },
            });
          }

          await Message.create({
            conversation: conv._id,
            sender: user._id,
            receiver: authorId,
            content: chatContent,
            isRead: false,
          });

          conv.lastMessage = {
            content: chatContent,
            sender: user._id,
            createdAt: new Date(),
          };
          conv.updatedAt = new Date();
          await conv.save();
        }

        // Lưu bản ghi vào persistentStore
        store.conversations = store.conversations || [];
        store.messages = store.messages || [];

        let storeConv = store.conversations.find(
          (c) =>
            c.participants &&
            c.participants.includes(String(user._id)) &&
            c.participants.includes(String(authorId))
        );

        if (!storeConv) {
          storeConv = {
            _id: `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            participants: [String(user._id), String(authorId)],
            status: 'accepted',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          store.conversations.push(storeConv);
        }

        store.messages.push({
          _id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          conversationId: storeConv._id,
          senderId: String(user._id),
          receiverId: String(authorId),
          content: chatContent,
          isRead: false,
          createdAt: new Date().toISOString(),
        });

        saveStore(store);
      } catch (chatErr) {
        console.warn('[Story Reply Chat Delivery Error]:', chatErr);
      }
    }

    return sendSuccess(res, {
      message: '✓ Đã gửi tin nhắn phản hồi Story thành công!',
      data: replyEntry,
    });
  } catch (error) {
    return sendError(res, { message: error.message || 'Lỗi gửi phản hồi story', status: 500 });
  }
};
