import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import { checkDbReady } from '../config/db.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';

/**
 * Tạo một thông báo mới cho người dùng
 */
export const createNotification = async ({
  recipientId,
  sender,
  type,
  title,
  message,
  post,
  conversationId,
  reactionType,
  commentContent,
  actionStatus = 'none',
}) => {
  try {
    if (!recipientId || !sender) return null;
    const recIdStr = recipientId.toString();
    const senderIdStr = (sender._id || sender.id || sender).toString();

    // Không gửi thông báo cho chính mình
    if (recIdStr === senderIdStr) return null;

    const notifObj = {
      _id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipient: recIdStr,
      sender: {
        _id: senderIdStr,
        name: sender.name || 'Người dùng',
        avatar: sender.avatar || '',
        jobTitle: sender.jobTitle || 'Thành viên',
        role: sender.role || 'user',
      },
      type,
      title: title || 'Thông báo mới',
      message: message || '',
      post: post
        ? {
            _id: (post._id || post.id || '').toString(),
            title: post.title || '',
            slug: post.slug || '',
            coverImage: post.coverImage || '',
          }
        : undefined,
      conversationId: conversationId ? conversationId.toString() : undefined,
      reactionType: reactionType || undefined,
      commentContent: commentContent || undefined,
      actionStatus: type === 'friend_request' ? (actionStatus || 'pending') : 'none',
      isRead: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Lưu vào persistent store
    const store = loadStore();
    if (!Array.isArray(store.notifications)) {
      store.notifications = [];
    }

    // Nếu là lời mời kết bạn từ cùng một người và đang chờ duyệt thì cập nhật chứ không spam nhiều thông báo
    if (type === 'friend_request') {
      const existingIdx = store.notifications.findIndex(
        (n) =>
          n.recipient === recIdStr &&
          n.sender?._id === senderIdStr &&
          n.type === 'friend_request' &&
          n.actionStatus === 'pending'
      );
      if (existingIdx >= 0) {
        store.notifications[existingIdx].updatedAt = notifObj.updatedAt;
        store.notifications[existingIdx].isRead = false;
        saveStore(store);
        return store.notifications[existingIdx];
      }
    }

    // Giữ tối đa 200 thông báo gần nhất trong persistent store
    store.notifications.unshift(notifObj);
    if (store.notifications.length > 200) {
      store.notifications = store.notifications.slice(0, 200);
    }
    saveStore(store);

    // 2. Lưu vào MongoDB nếu kết nối khả dụng
    if (checkDbReady()) {
      try {
        await Notification.create({
          recipient: recIdStr,
          sender: notifObj.sender,
          type: notifObj.type,
          title: notifObj.title,
          message: notifObj.message,
          post: notifObj.post,
          conversationId: notifObj.conversationId,
          reactionType: notifObj.reactionType,
          commentContent: notifObj.commentContent,
          actionStatus: notifObj.actionStatus,
          isRead: false,
        });
      } catch (dbErr) {
        console.warn('[Notification] MongoDB create error:', dbErr.message);
      }
    }

    return notifObj;
  } catch (err) {
    console.error('[Notification] Error creating notification:', err);
    return null;
  }
};
