import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import { checkDbReady } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';
import { findUserAnywhere } from './chatController.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Lấy danh sách thông báo của người dùng hiện tại
 * Hỗ trợ lọc theo tab: 'all', 'friend', 'message', 'interaction'
 */
export const getNotifications = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { type = 'all', unreadOnly = 'false' } = req.query;

    const store = loadStore();
    let allUserNotifs = (store.notifications || []).filter(
      (n) => n.recipient === currentUserId
    );

    // Đồng bộ thêm từ MongoDB nếu có
    if (checkDbReady()) {
      try {
        const dbNotifs = await Notification.find({ recipient: currentUserId })
          .sort({ createdAt: -1 })
          .limit(100)
          .lean();

        for (const dbn of dbNotifs) {
          const dbnId = dbn._id.toString();
          // Kiểm tra xem đã có thông báo tương đương trong list chưa
          const existingIdx = allUserNotifs.findIndex((n) => {
            if (n._id === dbnId) return true;
            if (
              n.type === dbn.type &&
              n.sender?._id === dbn.sender?._id &&
              n.recipient === dbn.recipient &&
              (n.type === 'friend_request' || Math.abs(new Date(n.createdAt) - new Date(dbn.createdAt)) < 15000)
            ) {
              return true;
            }
            return false;
          });

          if (existingIdx >= 0) {
            // Đồng bộ trạng thái mới hơn (nếu một bên đã accepted hoặc read)
            if (dbn.actionStatus && dbn.actionStatus !== 'none') {
              allUserNotifs[existingIdx].actionStatus = dbn.actionStatus;
            }
            if (dbn.isRead) {
              allUserNotifs[existingIdx].isRead = true;
            }
          } else {
            allUserNotifs.push({
              _id: dbnId,
              recipient: dbn.recipient,
              sender: dbn.sender,
              type: dbn.type,
              title: dbn.title,
              message: dbn.message,
              post: dbn.post,
              conversationId: dbn.conversationId,
              reactionType: dbn.reactionType,
              commentContent: dbn.commentContent,
              actionStatus: dbn.actionStatus,
              isRead: dbn.isRead,
              createdAt: dbn.createdAt,
              updatedAt: dbn.updatedAt,
            });
          }
        }
      } catch (dbErr) {
        console.warn('MongoDB getNotifications warning:', dbErr.message);
      }
    }

    // Lọc theo loại thông báo
    if (type === 'friend') {
      allUserNotifs = allUserNotifs.filter((n) =>
        ['friend_request', 'friend_accept'].includes(n.type)
      );
    } else if (type === 'message') {
      allUserNotifs = allUserNotifs.filter((n) => n.type === 'message');
    } else if (type === 'interaction') {
      allUserNotifs = allUserNotifs.filter((n) =>
        ['reaction', 'comment', 'share'].includes(n.type)
      );
    }

    if (unreadOnly === 'true') {
      allUserNotifs = allUserNotifs.filter((n) => !n.isRead);
    }

    // Sắp xếp mới nhất lên đầu
    allUserNotifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return sendSuccess(res, {
      message: 'Lấy danh sách thông báo thành công',
      data: allUserNotifs,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy số lượng thông báo chưa đọc (Tổng và phân loại theo tab)
 */
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const store = loadStore();

    const notifs = (store.notifications || []).filter(
      (n) => n.recipient === currentUserId
    );

    let unreadCount = 0;
    let friendCount = 0;
    let messageCount = 0;
    let interactionCount = 0;

    notifs.forEach((n) => {
      if (!n.isRead) {
        unreadCount++;
        if (['friend_request', 'friend_accept'].includes(n.type)) friendCount++;
        else if (n.type === 'message') messageCount++;
        else if (['reaction', 'comment', 'share'].includes(n.type)) interactionCount++;
      }
    });

    return sendSuccess(res, {
      data: {
        unreadCount,
        friendCount,
        messageCount,
        interactionCount,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Đánh dấu một thông báo là đã đọc
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = (req.user._id || req.user.id).toString();

    const store = loadStore();
    const notif = (store.notifications || []).find((n) => n._id === id);
    if (notif && notif.recipient === currentUserId) {
      notif.isRead = true;
      saveStore(store);
    }

    if (checkDbReady() && mongoose.isValidObjectId(id)) {
      try {
        await Notification.findByIdAndUpdate(id, { isRead: true });
      } catch (_) {}
    }

    return sendSuccess(res, { message: 'Đã đánh dấu thông báo là đã đọc', data: { id, isRead: true } });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Đánh dấu tất cả thông báo của người dùng là đã đọc
 */
export const markAllAsRead = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();

    const store = loadStore();
    if (Array.isArray(store.notifications)) {
      store.notifications.forEach((n) => {
        if (n.recipient === currentUserId) {
          n.isRead = true;
        }
      });
      saveStore(store);
    }

    if (checkDbReady()) {
      try {
        await Notification.updateMany({ recipient: currentUserId, isRead: false }, { isRead: true });
      } catch (_) {}
    }

    return sendSuccess(res, { message: 'Đã đánh dấu tất cả thông báo là đã đọc' });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Phản hồi lời mời kết bạn (Chấp nhận hoặc Từ chối)
 */
export const respondToFriendRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' | 'decline'
    const currentUserId = (req.user._id || req.user.id).toString();

    if (!['accept', 'decline'].includes(action)) {
      return sendError(res, { message: 'Hành động không hợp lệ. Chọn accept hoặc decline', status: 400 });
    }

    const store = loadStore();
    let notif = (store.notifications || []).find((n) => n._id === id);

    let senderId = notif?.sender?._id;

    if (checkDbReady() && !senderId && mongoose.isValidObjectId(id)) {
      try {
        const dbNotif = await Notification.findById(id).lean();
        if (dbNotif) {
          senderId = dbNotif.sender?._id;
        }
      } catch (_) {}
    }

    if (!senderId) {
      return sendError(res, { message: 'Không tìm thấy lời mời kết bạn này', status: 404 });
    }

    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const senderUser = await findUserAnywhere(senderId);

    if (action === 'accept') {
      // 1. Thêm nhau vào danh bạ bạn bè trong persistent store
      let storeMe = store.users.find((u) => (u._id || u.id)?.toString() === currentUserId);
      let storeSender = store.users.find((u) => (u._id || u.id)?.toString() === senderId);

      if (storeMe) {
        if (!Array.isArray(storeMe.friends)) storeMe.friends = [];
        if (!storeMe.friends.includes(senderId)) storeMe.friends.push(senderId);
      }
      if (storeSender) {
        if (!Array.isArray(storeSender.friends)) storeSender.friends = [];
        if (!storeSender.friends.includes(currentUserId)) storeSender.friends.push(currentUserId);
      }

      // 2. Cập nhật trạng thái cuộc trò chuyện giữa 2 người
      if (Array.isArray(store.conversations)) {
        store.conversations.forEach((c) => {
          if (
            Array.isArray(c.participants) &&
            c.participants.map((p) => p.toString()).includes(currentUserId) &&
            c.participants.map((p) => p.toString()).includes(senderId)
          ) {
            c.status = 'accepted';
            c.isStranger = false;
          }
        });
      }

      // 3. Cập nhật MongoDB nếu cả 2 là ObjectId
      if (
        checkDbReady() &&
        mongoose.isValidObjectId(currentUserId) &&
        mongoose.isValidObjectId(senderId)
      ) {
        try {
          await User.findByIdAndUpdate(currentUserId, { $addToSet: { friends: senderId } });
          await User.findByIdAndUpdate(senderId, { $addToSet: { friends: currentUserId } });
          await Conversation.updateMany(
            { participants: { $all: [currentUserId, senderId] } },
            { status: 'accepted', isStranger: false }
          );
        } catch (_) {}
      }

      // 4. Cập nhật trạng thái thông báo
      if (notif) {
        notif.actionStatus = 'accepted';
        notif.isRead = true;
      }

      // Cập nhật tất cả thông báo friend_request tương ứng trong store
      (store.notifications || []).forEach((n) => {
        if (
          n.type === 'friend_request' &&
          n.recipient === currentUserId &&
          n.sender?._id === senderId
        ) {
          n.actionStatus = 'accepted';
          n.isRead = true;
        }
      });

      if (checkDbReady()) {
        try {
          if (mongoose.isValidObjectId(id)) {
            await Notification.findByIdAndUpdate(id, { actionStatus: 'accepted', isRead: true });
          }
          await Notification.updateMany(
            { recipient: currentUserId, 'sender._id': senderId, type: 'friend_request' },
            { actionStatus: 'accepted', isRead: true }
          );
        } catch (_) {}
      }

      saveStore(store);

      // 5. Gửi thông báo chúc mừng kết nối thành công lại cho người gửi
      await createNotification({
        recipientId: senderId,
        sender: currentUser,
        type: 'friend_accept',
        title: 'Lời mời kết bạn được chấp nhận 🎉',
        message: `${currentUser.name} đã chấp nhận lời mời kết bạn của bạn! Hai người hiện đã là bạn bè trên Freedom.`,
      });

      return sendSuccess(res, {
        message: `Đã chấp nhận lời mời kết bạn từ ${senderUser?.name || 'người dùng'}!`,
        data: { actionStatus: 'accepted', friend: senderUser, isFriend: true },
      });
    } else {
      // Từ chối
      if (notif) {
        notif.actionStatus = 'declined';
        notif.isRead = true;
      }

      (store.notifications || []).forEach((n) => {
        if (
          n.type === 'friend_request' &&
          n.recipient === currentUserId &&
          n.sender?._id === senderId
        ) {
          n.actionStatus = 'declined';
          n.isRead = true;
        }
      });

      if (checkDbReady()) {
        try {
          if (mongoose.isValidObjectId(id)) {
            await Notification.findByIdAndUpdate(id, { actionStatus: 'declined', isRead: true });
          }
          await Notification.updateMany(
            { recipient: currentUserId, 'sender._id': senderId, type: 'friend_request' },
            { actionStatus: 'declined', isRead: true }
          );
        } catch (_) {}
      }

      saveStore(store);

      return sendSuccess(res, {
        message: `Đã từ chối lời mời kết bạn từ ${senderUser?.name || 'người dùng'}.`,
        data: { actionStatus: 'declined', isFriend: false },
      });

      saveStore(store);

      return sendSuccess(res, {
        message: 'Đã từ chối lời mời kết bạn',
        data: { actionStatus: 'declined' },
      });
    }
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Xóa một thông báo
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = (req.user._id || req.user.id).toString();

    const store = loadStore();
    if (Array.isArray(store.notifications)) {
      store.notifications = store.notifications.filter(
        (n) => !(n._id === id && n.recipient === currentUserId)
      );
      saveStore(store);
    }

    if (checkDbReady() && mongoose.isValidObjectId(id)) {
      try {
        await Notification.findOneAndDelete({ _id: id, recipient: currentUserId });
      } catch (_) {}
    }

    return sendSuccess(res, { message: 'Đã xóa thông báo' });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Xóa tất cả thông báo của người dùng
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();

    const store = loadStore();
    if (Array.isArray(store.notifications)) {
      store.notifications = store.notifications.filter(
        (n) => n.recipient !== currentUserId
      );
      saveStore(store);
    }

    if (checkDbReady()) {
      try {
        await Notification.deleteMany({ recipient: currentUserId });
      } catch (_) {}
    }

    return sendSuccess(res, { message: 'Đã xóa toàn bộ thông báo' });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
