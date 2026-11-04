import Comment from '../models/Comment.js';
import Post from '../models/Post.js';
import { isDbConnected } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const fallbackComments = [
  {
    _id: 'comm_1',
    content: 'Gửi bạn một cái ôm thật chặt 🫂! Mình từng làm đến 4h sáng và sau đó phải nhập viện vì kiệt sức. Sức khỏe luôn là số một bạn nhé!',
    cheerType: 'hug',
    user: { _id: 'u1', name: 'Thành Nam', avatar: '/images/2.jpg', jobTitle: 'Product Manager' },
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'comm_2',
    content: 'Cố lên bạn ơi 💪! Ngày mai thức dậy uống một ly nước ấm, hít thở khí trời một chút rồi tính tiếp. Bạn đã làm rất tốt rồi!',
    cheerType: 'encourage',
    user: { _id: 'u2', name: 'Hương Ly', avatar: '/images/img2.jpg', jobTitle: 'UI/UX Designer' },
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'comm_3',
    content: 'Mình cũng y hệt bạn! Đọc bài của bạn làm mình thấy bớt cô độc hẳn. Cảm ơn bạn rất nhiều vì đã chia sẻ!',
    cheerType: 'general',
    user: { _id: 'u3', name: 'Đức Huy', avatar: '/images/3.jpg', jobTitle: 'Junior Developer' },
    createdAt: new Date().toISOString(),
  },
];

export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (isDbConnected) {
      const comments = await Comment.find({ post: postId })
        .populate('user', 'name avatar jobTitle')
        .sort({ createdAt: -1 })
        .lean();

      if (comments.length > 0) {
        return sendSuccess(res, {
          message: 'Lấy bình luận thành công',
          data: comments,
        });
      }
    }

    return sendSuccess(res, {
      message: 'Lấy bình luận thành công',
      data: fallbackComments,
    });
  } catch (error) {
    return sendSuccess(res, {
      message: 'Lấy bình luận thành công',
      data: fallbackComments,
    });
  }
};

export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, cheerType } = req.body;

    if (!content || !content.trim()) {
      return sendError(res, {
        message: 'Nội dung bình luận không được để trống',
        status: 400,
      });
    }

    if (isDbConnected) {
      const comment = await Comment.create({
        post: postId,
        user: req.user._id,
        content: content.trim(),
        cheerType: cheerType || 'encourage',
      });

      const populated = await Comment.findById(comment._id).populate(
        'user',
        'name avatar jobTitle'
      );

      return sendSuccess(res, {
        message: 'Đã gửi lời động viên thành công!',
        data: populated,
        status: 201,
      });
    }

    // Fallback Mock
    const mockComment = {
      _id: `comm_${Date.now()}`,
      content: content.trim(),
      cheerType: cheerType || 'encourage',
      user: {
        _id: req.user?._id || 'guest',
        name: req.user?.name || 'Thành viên',
        avatar: req.user?.avatar || '/images/man.jpg',
        jobTitle: req.user?.jobTitle || 'Người đi làm',
      },
      createdAt: new Date().toISOString(),
    };
    fallbackComments.unshift(mockComment);

    return sendSuccess(res, {
      message: 'Đã gửi lời động viên thành công!',
      data: mockComment,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (isDbConnected) {
      const comment = await Comment.findById(id);
      if (comment) {
        // Chỉ tác giả comment HOẶC Admin mới được quyền xóa
        if (req.user?.role !== 'admin' && comment.user?.toString() !== req.user?._id?.toString()) {
          return sendError(res, {
            message: 'Bạn không có quyền xóa bình luận này!',
            status: 403,
          });
        }
        await comment.deleteOne();
      }
    }
    return sendSuccess(res, { message: 'Xóa bình luận thành công', data: { id } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
