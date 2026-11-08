import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { checkDbReady } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';
import { maskSensitiveText } from '../utils/sensitiveFilter.js';

export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (checkDbReady()) {
      const allComments = await Comment.find({ post: postId })
        .populate('user', 'name avatar jobTitle role')
        .sort({ createdAt: 1 })
        .lean();

      if (allComments.length > 0) {
        // Tổ chức bình luận thành dạng cây: bình luận chính và các câu trả lời
        const topLevel = [];
        const replyMap = {};

        allComments.forEach((c) => {
          c.replies = [];
          replyMap[c._id.toString()] = c;
          if (c.parentComment) {
            const pId = c.parentComment.toString();
            if (replyMap[pId]) {
              replyMap[pId].replies.push(c);
            } else {
              topLevel.push(c);
            }
          } else {
            topLevel.push(c);
          }
        });

        // Đảo ngược để bình luận mới nhất ở trên
        topLevel.reverse();

        return sendSuccess(res, {
          message: 'Lấy bình luận thành công',
          data: topLevel,
        });
      }
    }

    // Đọc từ bộ lưu trữ đĩa cứng bền vững (persistentStore)
    const store = loadStore();
    const postComments = (store.comments || []).filter(
      (c) => c.postId === postId || c.post === postId || postId === 'post_1'
    );

    const topLevel = [];
    const replyMap = {};

    postComments.forEach((c) => {
      c.replies = c.replies || [];
      replyMap[c._id] = c;
      if (c.parentComment) {
        if (replyMap[c.parentComment]) {
          replyMap[c.parentComment].replies.push(c);
        } else {
          topLevel.push(c);
        }
      } else {
        topLevel.push(c);
      }
    });

    topLevel.reverse();

    return sendSuccess(res, {
      message: 'Lấy bình luận thành công',
      data: topLevel,
    });
  } catch (error) {
    const store = loadStore();
    return sendSuccess(res, {
      message: 'Lấy bình luận thành công',
      data: store.comments || [],
    });
  }
};

export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, cheerType, parentComment, replyToUser, gifUrl } = req.body;

    if (!content || !content.trim()) {
      return sendError(res, {
        message: 'Nội dung bình luận không được để trống',
        status: 400,
      });
    }

    // Kiểm tra xem bài viết có mở tính năng bình luận không
    let isCommentAllowed = true;
    if (checkDbReady()) {
      try {
        const targetPost = await Post.findOne({
          $or: [
            { _id: postId && String(postId).match(/^[0-9a-fA-F]{24}$/) ? postId : null },
            { slug: postId },
          ],
        }).select('allowComments');
        if (targetPost && targetPost.allowComments === false) {
          isCommentAllowed = false;
        }
      } catch (err) {}
    } else {
      const store = loadStore();
      const targetPost = (store.posts || []).find((p) => String(p._id) === String(postId) || p.slug === postId);
      if (targetPost && targetPost.allowComments === false) {
        isCommentAllowed = false;
      }
    }

    if (!isCommentAllowed) {
      return sendError(res, {
        message: 'Tác giả đã tắt tính năng bình luận cho bài viết này.',
        status: 403,
      });
    }

    const cleanContent = maskSensitiveText(content.trim());

    if (checkDbReady()) {
      const comment = await Comment.create({
        post: postId,
        user: req.user._id,
        content: cleanContent,
        cheerType: cheerType || 'encourage',
        parentComment: parentComment || null,
        replyToUser: replyToUser || null,
        likesCount: 0,
        gifUrl: gifUrl ? String(gifUrl).trim() : '',
      });

      const populated = await Comment.findById(comment._id)
        .populate('user', 'name avatar jobTitle role')
        .lean();

      populated.replies = [];

      // Đồng thời sao lưu vào persistentStore
      const store = loadStore();
      store.comments = store.comments || [];
      store.comments.push({
        _id: populated._id.toString(),
        postId,
        content: populated.content,
        gifUrl: populated.gifUrl || '',
        cheerType: populated.cheerType,
        parentComment: parentComment || null,
        replyToUser: replyToUser || null,
        likesCount: 0,
        user: populated.user,
        createdAt: populated.createdAt,
        replies: [],
      });
      saveStore(store);

      return sendSuccess(res, {
        message: 'Đã gửi lời động viên thành công!',
        data: populated,
        status: 201,
      });
    }

    // Chế độ lưu trữ đĩa cứng bền vững (Không có kết nối DB)
    const store = loadStore();
    store.comments = store.comments || [];

    const mockComment = {
      _id: `comm_${Date.now()}`,
      postId,
      content: cleanContent,
      gifUrl: gifUrl ? String(gifUrl).trim() : '',
      cheerType: cheerType || 'encourage',
      parentComment: parentComment || null,
      replyToUser: replyToUser || null,
      likesCount: 0,
      user: {
        _id: req.user?._id || 'guest',
        name: req.user?.name || 'Anthony Quân (Trần Đình Quân)',
        avatar: req.user?.avatar || '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg',
        jobTitle: req.user?.jobTitle || 'System Admin & Lead Dev',
        role: req.user?.role || 'admin',
      },
      createdAt: new Date().toISOString(),
      replies: [],
    };

    store.comments.push(mockComment);
    saveStore(store);

    return sendSuccess(res, {
      message: 'Đã gửi lời động viên thành công!',
      data: mockComment,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const likeComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (checkDbReady()) {
      const comment = await Comment.findByIdAndUpdate(
        id,
        { $inc: { likesCount: 1 } },
        { new: true }
      );
      if (comment) {
        return sendSuccess(res, { data: { likesCount: comment.likesCount } });
      }
    }

    const store = loadStore();
    const comment = (store.comments || []).find((c) => c._id === id);
    if (comment) {
      comment.likesCount = (comment.likesCount || 0) + 1;
      saveStore(store);
      return sendSuccess(res, { data: { likesCount: comment.likesCount } });
    }

    return sendSuccess(res, { data: { likesCount: 1 } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (checkDbReady()) {
      const comment = await Comment.findById(id);
      if (comment) {
        if (req.user?.role !== 'admin' && comment.user?.toString() !== req.user?._id?.toString()) {
          return sendError(res, {
            message: 'Bạn không có quyền xóa bình luận này!',
            status: 403,
          });
        }
        await Comment.deleteMany({ $or: [{ _id: id }, { parentComment: id }] });
      }
    }

    const store = loadStore();
    store.comments = (store.comments || []).filter((c) => c._id !== id && c.parentComment !== id);
    saveStore(store);

    return sendSuccess(res, { message: 'Xóa bình luận thành công', data: { id } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
