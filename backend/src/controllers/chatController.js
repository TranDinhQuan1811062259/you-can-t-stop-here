import mongoose from 'mongoose';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { checkDbReady } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';
import { maskSensitiveText } from '../utils/sensitiveFilter.js';
import { createNotification } from '../services/notificationService.js';

/**
 * Helper: Tìm thông tin người dùng từ persistent store hoặc MongoDB Atlas
 */
export const findUserAnywhere = async (userId) => {
  if (!userId) return null;
  const idStr = (userId._id || userId.id || userId).toString().trim();
  const store = loadStore();

  // 1. Tìm trong store.users theo _id, id, email hoặc họ tên
  let found = (store.users || []).find(
    (u) =>
      (u._id && u._id.toString() === idStr) ||
      (u.id && u.id.toString() === idStr) ||
      (u.email && u.email.toLowerCase() === idStr.toLowerCase()) ||
      (u.name && u.name.trim().toLowerCase() === idStr.toLowerCase())
  );

  // 2. Tìm trong MongoDB nếu là ObjectId hợp lệ và DB đã sẵn sàng
  if (!found && checkDbReady() && mongoose.isValidObjectId(idStr)) {
    try {
      const dbUser = await User.findById(idStr).lean();
      if (dbUser) {
        found = {
          _id: dbUser._id.toString(),
          id: dbUser._id.toString(),
          name: dbUser.name,
          email: dbUser.email,
          avatar: dbUser.avatar || '',
          jobTitle: dbUser.jobTitle || 'Thành viên',
          role: dbUser.role || 'user',
          friends: (dbUser.friends || []).map((f) => f.toString()),
          chatStatus: dbUser.chatStatus || 'online',
          lastActiveAt: dbUser.lastActiveAt,
          bio: dbUser.bio || '',
        };
      }
    } catch (_) {}
  }

  // 3. Chuẩn hóa dữ liệu trả về
  if (found) {
    return {
      _id: (found._id || found.id || idStr).toString(),
      id: (found._id || found.id || idStr).toString(),
      name: found.name || 'Người dùng',
      email: found.email || '',
      avatar: found.avatar || '',
      jobTitle: found.jobTitle || 'Thành viên',
      role: found.role || 'user',
      friends: Array.isArray(found.friends) ? found.friends.map((f) => f.toString()) : [],
      chatStatus: found.chatStatus || 'online',
      lastActiveAt: found.lastActiveAt || new Date().toISOString(),
      bio: found.bio || '',
    };
  }

  return null;
};

/**
 * Helper: Kiểm tra 2 người dùng có phải là bạn bè hay không
 */
export const checkAreFriends = (userA, userB) => {
  if (!userA || !userB) return false;
  const idA = (userA._id || userA.id || '').toString();
  const idB = (userB._id || userB.id || '').toString();
  const friendsA = Array.isArray(userA.friends) ? userA.friends.map((f) => f.toString()) : [];
  const friendsB = Array.isArray(userB.friends) ? userB.friends.map((f) => f.toString()) : [];
  return friendsA.includes(idB) || friendsB.includes(idA);
};

/**
 * Lấy danh sách các cuộc trò chuyện của người dùng hiện tại
 * Hỗ trợ sắp xếp:
 * - 'recent' (Mặc định): Cuộc trò chuyện có tin nhắn cuối cùng mới nhất lên đầu
 * - 'alphabet': Theo bảng chữ cái A-Z tên người trò chuyện
 * - 'frequency': Theo tần suất nhắn tin (tổng số tin nhắn nhiều nhất lên đầu)
 */
export const getConversations = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { sortBy = 'recent', q } = req.query;

    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const store = loadStore();
    const allConvs = store.conversations || [];

    // Lọc các cuộc hội thoại mà người dùng hiện tại tham gia
    let userConvs = allConvs.filter(
      (c) => Array.isArray(c.participants) && c.participants.map((p) => p.toString()).includes(currentUserId)
    );

    // Bổ sung các cuộc hội thoại từ MongoDB nếu kết nối khả dụng
    if (checkDbReady() && mongoose.isValidObjectId(currentUserId)) {
      try {
        const dbConvs = await Conversation.find({ participants: currentUserId }).lean();
        for (const dbc of dbConvs) {
          const dbId = dbc._id.toString();
          const existing = userConvs.find((c) => c._id === dbId);
          if (!existing) {
            userConvs.push({
              _id: dbId,
              participants: (dbc.participants || []).map((p) => p.toString()),
              status: dbc.status || 'accepted',
              isStranger: Boolean(dbc.isStranger),
              requestedBy: dbc.requestedBy?.toString(),
              totalMessagesCount: dbc.totalMessagesCount || 0,
              unreadCounts: dbc.unreadCounts || {},
              lastMessage: dbc.lastMessage || null,
              createdAt: dbc.createdAt || new Date().toISOString(),
              updatedAt: dbc.updatedAt || dbc.createdAt || new Date().toISOString(),
            });
          }
        }
      } catch (dbErr) {
        console.warn('MongoDB getConversations warning:', dbErr.message);
      }
    }

    // Định dạng đầy đủ thông tin người trò chuyện cùng
    let formatted = await Promise.all(
      userConvs.map(async (c) => {
        const participantsStr = (c.participants || []).map((p) => (p._id || p.id || p).toString());
        const otherId = participantsStr.find((p) => p !== currentUserId) || participantsStr[0] || 'stranger';
        const otherUserObj = (await findUserAnywhere(otherId)) || {
          _id: otherId,
          name: 'Người dùng',
          avatar: '',
          jobTitle: 'Thành viên',
          role: 'user',
          chatStatus: 'online',
        };

        const isFriend = checkAreFriends(currentUser, otherUserObj);

        return {
          _id: c._id,
          otherUser: {
            _id: otherUserObj._id,
            name: otherUserObj.name || 'Người dùng',
            avatar: otherUserObj.avatar || '',
            jobTitle: otherUserObj.jobTitle || 'Thành viên',
            role: otherUserObj.role || 'user',
            chatStatus: otherUserObj.chatStatus || 'online',
            lastActiveAt: otherUserObj.lastActiveAt,
            isFriend,
          },
          lastMessage: c.lastMessage || null,
          totalMessagesCount: c.totalMessagesCount || 0,
          status: c.status || 'accepted',
          isStranger: isFriend ? false : Boolean(c.isStranger),
          requestedBy: c.requestedBy,
          unreadCount: (c.unreadCounts && c.unreadCounts[currentUserId]) || 0,
          updatedAt: c.updatedAt || c.createdAt || new Date().toISOString(),
        };
      })
    );

    // Lọc theo từ khóa tìm kiếm
    if (q && q.trim()) {
      const lowerQ = q.trim().toLowerCase();
      formatted = formatted.filter((c) =>
        c.otherUser.name.toLowerCase().includes(lowerQ)
      );
    }

    // Sắp xếp
    if (sortBy === 'alphabet') {
      formatted.sort((a, b) => a.otherUser.name.localeCompare(b.otherUser.name, 'vi'));
    } else if (sortBy === 'frequency') {
      formatted.sort((a, b) => (b.totalMessagesCount || 0) - (a.totalMessagesCount || 0));
    } else {
      formatted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return sendSuccess(res, {
      message: 'Lấy danh sách tin nhắn thành công',
      data: formatted,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Khởi tạo hoặc tìm cuộc trò chuyện với một người dùng (Bấm từ profile hoặc comment)
 */
export const findOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId.toString() === currentUserId) {
      return sendError(res, { message: 'ID người nhận không hợp lệ', status: 400 });
    }

    const targetUserIdStr = targetUserId.toString();
    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const targetUser = await findUserAnywhere(targetUserIdStr);

    if (!targetUser) {
      return sendError(res, { message: 'Không tìm thấy người dùng này', status: 404 });
    }

    const isFriend = checkAreFriends(currentUser, targetUser);
    const store = loadStore();
    store.conversations = store.conversations || [];

    // Tìm trong store trước
    let storeConv = store.conversations.find((c) =>
      Array.isArray(c.participants) &&
      c.participants.map((p) => p.toString()).includes(currentUserId) &&
      c.participants.map((p) => p.toString()).includes(targetUserIdStr)
    );

    let dbConv = null;
    // Nếu cả 2 đều là ObjectId và DB sẵn sàng, tìm/tạo trên MongoDB
    if (checkDbReady() && mongoose.isValidObjectId(currentUserId) && mongoose.isValidObjectId(targetUserIdStr)) {
      try {
        dbConv = await Conversation.findOne({
          participants: { $all: [currentUserId, targetUserIdStr] },
        }).lean();

        if (!dbConv) {
          dbConv = await Conversation.create({
            participants: [currentUserId, targetUserIdStr],
            status: isFriend ? 'accepted' : 'pending',
            isStranger: !isFriend,
            requestedBy: currentUserId,
            totalMessagesCount: 0,
          });
        }
      } catch (dbErr) {
        console.warn('MongoDB findOrCreateConversation warning:', dbErr.message);
      }
    }

    const convId = dbConv ? dbConv._id.toString() : (storeConv ? storeConv._id : `conv_${currentUserId}_${targetUserIdStr}`);

    if (!storeConv) {
      storeConv = {
        _id: convId,
        participants: [currentUserId, targetUserIdStr],
        status: isFriend ? 'accepted' : 'pending',
        isStranger: !isFriend,
        requestedBy: currentUserId,
        totalMessagesCount: 0,
        unreadCounts: {},
        lastMessage: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.conversations.unshift(storeConv);
      saveStore(store);
    } else {
      storeConv.participants = [currentUserId, targetUserIdStr];
      if (isFriend) {
        storeConv.status = 'accepted';
        storeConv.isStranger = false;
      }
      saveStore(store);
    }

    const formatted = {
      _id: storeConv._id,
      otherUser: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar || '',
        jobTitle: targetUser.jobTitle || 'Thành viên',
        role: targetUser.role || 'user',
        chatStatus: targetUser.chatStatus || 'online',
        lastActiveAt: targetUser.lastActiveAt,
        isFriend,
      },
      lastMessage: storeConv.lastMessage || null,
      totalMessagesCount: storeConv.totalMessagesCount || 0,
      status: storeConv.status || 'accepted',
      isStranger: Boolean(storeConv.isStranger),
      requestedBy: storeConv.requestedBy,
      unreadCount: (storeConv.unreadCounts && storeConv.unreadCounts[currentUserId]) || 0,
      updatedAt: storeConv.updatedAt,
    };

    return sendSuccess(res, {
      message: 'Lấy cuộc trò chuyện thành công',
      data: formatted,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy lịch sử tin nhắn của một cuộc trò chuyện & Đánh dấu đã đọc
 */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = (req.user._id || req.user.id).toString();

    const store = loadStore();
    store.messages = store.messages || [];
    store.conversations = store.conversations || [];

    let conv = store.conversations.find((c) => c._id === conversationId);

    // Đồng bộ từ MongoDB nếu conversationId là ObjectId hợp lệ
    if (checkDbReady() && mongoose.isValidObjectId(conversationId)) {
      try {
        const dbConv = await Conversation.findById(conversationId).lean();
        if (dbConv) {
          if (!conv) {
            conv = {
              _id: dbConv._id.toString(),
              participants: (dbConv.participants || []).map((p) => p.toString()),
              status: dbConv.status,
              isStranger: dbConv.isStranger,
              requestedBy: dbConv.requestedBy?.toString(),
              totalMessagesCount: dbConv.totalMessagesCount || 0,
              unreadCounts: dbConv.unreadCounts || {},
              lastMessage: dbConv.lastMessage,
              updatedAt: dbConv.updatedAt,
            };
            store.conversations.unshift(conv);
          }

          const dbMessages = await Message.find({ conversation: conversationId })
            .populate('sender', 'name avatar')
            .populate('receiver', 'name avatar')
            .sort({ createdAt: 1 })
            .lean();

          // Đánh dấu đã đọc trên MongoDB
          await Message.updateMany(
            { conversation: conversationId, receiver: currentUserId, isRead: false },
            { isRead: true }
          );

          // Đồng bộ vào persistent store
          dbMessages.forEach((dbm) => {
            const mId = dbm._id.toString();
            const existingIdx = store.messages.findIndex((m) => m._id === mId);
            const msgObj = {
              _id: mId,
              conversation: conversationId,
              sender: {
                _id: dbm.sender?._id?.toString() || dbm.sender?.toString(),
                name: dbm.sender?.name || 'Người dùng',
                email: dbm.sender?.email || '',
                avatar: dbm.sender?.avatar || '',
              },
              receiver: {
                _id: dbm.receiver?._id?.toString() || dbm.receiver?.toString(),
                name: dbm.receiver?.name || 'Người nhận',
                email: dbm.receiver?.email || '',
                avatar: dbm.receiver?.avatar || '',
              },
              content: dbm.content,
              isRead: true,
              createdAt: dbm.createdAt,
            };
            if (existingIdx >= 0) {
              store.messages[existingIdx] = msgObj;
            } else {
              store.messages.push(msgObj);
            }
          });
        }
      } catch (dbErr) {
        console.warn('MongoDB getMessages warning:', dbErr.message);
      }
    }

    // Lọc tin nhắn của cuộc trò chuyện trong persistent store
    let msgs = store.messages.filter((m) => m.conversation === conversationId);

    // Đánh dấu đã đọc trong persistent store
    let updated = false;
    msgs.forEach((m) => {
      const recId = (m.receiver?._id || m.receiver?.id || m.receiver || '').toString();
      if (recId === currentUserId && !m.isRead) {
        m.isRead = true;
        updated = true;
      }
    });

    if (conv && conv.unreadCounts && conv.unreadCounts[currentUserId]) {
      conv.unreadCounts[currentUserId] = 0;
      updated = true;
    }

    if (updated) {
      saveStore(store);
    }

    // Sắp xếp tin nhắn theo thời gian tăng dần
    msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return sendSuccess(res, {
      data: {
        conversation: conv,
        messages: msgs,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Gửi tin nhắn mới
 */
export const sendMessage = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { conversationId, receiverId, content } = req.body;

    if (!content || !content.trim()) {
      return sendError(res, { message: 'Vui lòng nhập nội dung tin nhắn', status: 400 });
    }

    const cleanContent = maskSensitiveText(content.trim());
    const store = loadStore();
    store.conversations = store.conversations || [];
    store.messages = store.messages || [];

    // Xác định ID người nhận
    let targetUserId = receiverId ? receiverId.toString() : null;

    let conv = null;
    if (conversationId) {
      conv = store.conversations.find((c) => c._id === conversationId);
    }

    if (!targetUserId && conv && Array.isArray(conv.participants)) {
      targetUserId = conv.participants.map((p) => p.toString()).find((p) => p !== currentUserId);
    }

    if (!targetUserId) {
      return sendError(res, { message: 'Không thể xác định người nhận tin nhắn', status: 400 });
    }

    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const targetUser = await findUserAnywhere(targetUserId);

    const isFriend = checkAreFriends(currentUser, targetUser);

    if (!conv) {
      conv = store.conversations.find(
        (c) =>
          Array.isArray(c.participants) &&
          c.participants.map((p) => p.toString()).includes(currentUserId) &&
          c.participants.map((p) => p.toString()).includes(targetUserId)
      );
    }

    const convId = conv ? conv._id : (conversationId || `conv_${currentUserId}_${targetUserId}`);

    if (!conv) {
      conv = {
        _id: convId,
        participants: [currentUserId, targetUserId],
        status: isFriend ? 'accepted' : 'pending',
        isStranger: !isFriend,
        requestedBy: currentUserId,
        totalMessagesCount: 0,
        unreadCounts: {},
        updatedAt: new Date().toISOString(),
      };
      store.conversations.unshift(conv);
    }

    // Nếu cả 2 đều là ObjectId hợp lệ, ghi đồng thời vào MongoDB
    let mongoMsgId = null;
    if (
      checkDbReady() &&
      mongoose.isValidObjectId(currentUserId) &&
      mongoose.isValidObjectId(targetUserId)
    ) {
      try {
        let dbConv = null;
        if (mongoose.isValidObjectId(convId)) {
          dbConv = await Conversation.findById(convId);
        }
        if (!dbConv) {
          dbConv = await Conversation.findOne({
            participants: { $all: [currentUserId, targetUserId] },
          });
        }
        if (!dbConv) {
          dbConv = await Conversation.create({
            participants: [currentUserId, targetUserId],
            status: isFriend ? 'accepted' : 'pending',
            isStranger: !isFriend,
            requestedBy: currentUserId,
            totalMessagesCount: 0,
          });
        }

        const newDbMsg = await Message.create({
          conversation: dbConv._id,
          sender: currentUserId,
          receiver: targetUserId,
          content: cleanContent,
          isRead: false,
        });

        mongoMsgId = newDbMsg._id.toString();

        // Nếu người nhận trực tiếp nhắn trả lời khi cuộc trò chuyện đang ở trạng thái chờ, tự động mở khóa
        if (
          dbConv.status === 'pending' &&
          dbConv.requestedBy &&
          dbConv.requestedBy.toString() !== currentUserId
        ) {
          dbConv.status = 'accepted';
          dbConv.isStranger = false;
        } else if (dbConv.status === 'rejected') {
          dbConv.status = isFriend ? 'accepted' : 'pending';
          dbConv.isStranger = !isFriend;
          dbConv.requestedBy = currentUserId;
        }

        dbConv.lastMessage = {
          content: cleanContent,
          sender: currentUserId,
          createdAt: new Date(),
        };
        dbConv.totalMessagesCount = (dbConv.totalMessagesCount || 0) + 1;
        dbConv.updatedAt = new Date();
        await dbConv.save();
      } catch (dbErr) {
        console.warn('MongoDB sendMessage warning:', dbErr.message);
      }
    }

    // Tạo đối tượng tin nhắn chuẩn hóa
    const newMsg = {
      _id: mongoMsgId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversation: convId,
      sender: {
        _id: currentUserId,
        name: currentUser.name || 'Người dùng',
        email: currentUser.email || '',
        avatar: currentUser.avatar || '',
      },
      receiver: {
        _id: targetUserId,
        name: targetUser?.name || 'Người nhận',
        email: targetUser?.email || '',
        avatar: targetUser?.avatar || '',
      },
      content: cleanContent,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    // Cập nhật thông tin cuộc trò chuyện trong persistent store
    if (
      conv.status === 'pending' &&
      conv.requestedBy &&
      conv.requestedBy.toString() !== currentUserId
    ) {
      conv.status = 'accepted';
      conv.isStranger = false;
    } else if (conv.status === 'rejected') {
      conv.status = isFriend ? 'accepted' : 'pending';
      conv.isStranger = !isFriend;
      conv.requestedBy = currentUserId;
    }
    conv.lastMessage = {
      _id: newMsg._id,
      content: cleanContent,
      sender: newMsg.sender,
      createdAt: newMsg.createdAt,
    };
    conv.totalMessagesCount = (conv.totalMessagesCount || 0) + 1;
    conv.updatedAt = new Date().toISOString();
    if (!conv.unreadCounts) conv.unreadCounts = {};
    conv.unreadCounts[targetUserId] = (conv.unreadCounts[targetUserId] || 0) + 1;

    store.messages.push(newMsg);
    saveStore(store);

    // Bắn thông báo tin nhắn mới tới người nhận
    try {
      await createNotification({
        recipientId: targetUserId,
        sender: currentUser,
        type: 'message',
        conversationId: convId,
        title: 'Tin nhắn mới 💬',
        message: `${currentUser.name}: "${cleanContent.length > 50 ? cleanContent.substring(0, 50) + '...' : cleanContent}"`,
      });
    } catch (_) {}

    return sendSuccess(res, {
      message: 'Gửi tin nhắn thành công',
      data: newMsg,
      status: 201,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Chấp nhận yêu cầu trò chuyện từ người lạ
 */
export const acceptConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (checkDbReady() && mongoose.isValidObjectId(conversationId)) {
      try {
        await Conversation.findByIdAndUpdate(conversationId, {
          status: 'accepted',
          isStranger: false,
        });
      } catch (_) {}
    }

    const store = loadStore();
    const conv = (store.conversations || []).find((c) => c._id === conversationId);
    if (conv) {
      conv.status = 'accepted';
      conv.isStranger = false;
      saveStore(store);
    }

    return sendSuccess(res, {
      message: 'Đã đồng ý nhận tin nhắn từ người này!',
      data: conv || { _id: conversationId, status: 'accepted' },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Bỏ qua / từ chối yêu cầu trò chuyện từ người lạ
 */
export const declineConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (checkDbReady() && mongoose.isValidObjectId(conversationId)) {
      try {
        await Conversation.findByIdAndUpdate(conversationId, {
          status: 'rejected',
        });
      } catch (_) {}
    }

    const store = loadStore();
    const conv = (store.conversations || []).find((c) => c._id === conversationId);
    if (conv) {
      conv.status = 'rejected';
      saveStore(store);
    }

    return sendSuccess(res, {
      message: 'Đã bỏ qua yêu cầu trò chuyện này.',
      data: conv || { _id: conversationId, status: 'rejected' },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy danh sách danh bạ bạn bè của người dùng hiện tại
 * Hỗ trợ sắp xếp theo 'alphabet', 'recent', 'frequency'
 */
export const getFriends = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { sortBy = 'alphabet', q } = req.query;

    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const friendIds = Array.isArray(currentUser.friends) ? currentUser.friends.map((f) => f.toString()) : [];

    const store = loadStore();

    let friendsList = [];
    for (const fId of friendIds) {
      const u = await findUserAnywhere(fId);
      if (u) {
        friendsList.push({
          _id: u._id,
          name: u.name,
          avatar: u.avatar || '',
          jobTitle: u.jobTitle || 'Thành viên',
          role: u.role || 'user',
          bio: u.bio || '',
          chatStatus: u.chatStatus || 'online',
          lastActiveAt: u.lastActiveAt,
          isFriend: true,
        });
      }
    }

    const allConvs = store.conversations || [];
    const convMap = {};
    allConvs.forEach((c) => {
      if (Array.isArray(c.participants) && c.participants.map((p) => p.toString()).includes(currentUserId)) {
        const otherId = c.participants.map((p) => p.toString()).find((p) => p !== currentUserId);
        if (otherId) {
          convMap[otherId] = {
            totalMessagesCount: c.totalMessagesCount || 0,
            lastMessageTime: c.lastMessage?.createdAt || c.updatedAt || new Date(0),
          };
        }
      }
    });

    friendsList = friendsList.map((f) => ({
      ...f,
      totalMessagesCount: convMap[f._id]?.totalMessagesCount || 0,
      lastMessageTime: convMap[f._id]?.lastMessageTime || new Date(0),
    }));

    if (q && q.trim()) {
      const lowerQ = q.trim().toLowerCase();
      friendsList = friendsList.filter((f) => f.name.toLowerCase().includes(lowerQ));
    }

    if (sortBy === 'recent') {
      friendsList.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    } else if (sortBy === 'frequency') {
      friendsList.sort((a, b) => (b.totalMessagesCount || 0) - (a.totalMessagesCount || 0));
    } else {
      friendsList.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }

    return sendSuccess(res, {
      message: 'Lấy danh bạ bạn bè thành công',
      data: friendsList,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Gửi lời mời kết bạn (Hoặc chấp nhận ngay nếu đối phương đã gửi lời mời trước)
 */
export const addFriend = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId.toString() === currentUserId) {
      return sendError(res, { message: 'ID người bạn không hợp lệ', status: 400 });
    }

    const targetUserIdStr = targetUserId.toString();
    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const targetUser = await findUserAnywhere(targetUserIdStr);

    if (!targetUser) {
      return sendError(res, { message: 'Không tìm thấy người dùng này', status: 404 });
    }

    // 1. Kiểm tra nếu hai người đã là bạn bè từ trước
    const alreadyFriends = checkAreFriends(currentUser, targetUser);
    if (alreadyFriends) {
      return sendSuccess(res, {
        message: `Bạn và ${targetUser.name} đã là bạn bè từ trước!`,
        data: {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar || '',
          isFriend: true,
          friendshipStatus: 'friends',
        },
      });
    }

    const store = loadStore();
    store.notifications = store.notifications || [];

    // 2. Kiểm tra nếu đối phương ĐÃ gửi lời mời kết bạn cho currentUser trước đó (đang pending)
    // Nếu có -> Chấp thuận kết bạn ngay (kết nối 2 chiều)
    const incomingReq = store.notifications.find(
      (n) =>
        n.type === 'friend_request' &&
        n.recipient === currentUserId &&
        n.sender?._id === targetUserIdStr &&
        n.actionStatus === 'pending'
    );

    if (incomingReq) {
      incomingReq.actionStatus = 'accepted';
      incomingReq.isRead = true;

      // Thêm nhau vào danh sách bạn bè trong persistent store
      let storeMe = store.users.find((u) => (u._id || u.id)?.toString() === currentUserId);
      let storeTarget = store.users.find((u) => (u._id || u.id)?.toString() === targetUserIdStr);

      if (!storeMe) {
        storeMe = { ...currentUser, _id: currentUserId, friends: [] };
        store.users.push(storeMe);
      }
      if (!storeTarget) {
        storeTarget = { ...targetUser, _id: targetUserIdStr, friends: [] };
        store.users.push(storeTarget);
      }

      if (!Array.isArray(storeMe.friends)) storeMe.friends = [];
      if (!storeMe.friends.includes(targetUserIdStr)) storeMe.friends.push(targetUserIdStr);

      if (!Array.isArray(storeTarget.friends)) storeTarget.friends = [];
      if (!storeTarget.friends.includes(currentUserId)) storeTarget.friends.push(currentUserId);

      // Cập nhật trạng thái trò chuyện giữa hai người
      if (Array.isArray(store.conversations)) {
        store.conversations.forEach((c) => {
          if (
            Array.isArray(c.participants) &&
            c.participants.map((p) => p.toString()).includes(currentUserId) &&
            c.participants.map((p) => p.toString()).includes(targetUserIdStr)
          ) {
            c.status = 'accepted';
            c.isStranger = false;
          }
        });
      }

      // Cập nhật MongoDB nếu cả 2 là ObjectId hợp lệ
      if (
        checkDbReady() &&
        mongoose.isValidObjectId(currentUserId) &&
        mongoose.isValidObjectId(targetUserIdStr)
      ) {
        try {
          await User.findByIdAndUpdate(currentUserId, { $addToSet: { friends: targetUserIdStr } });
          await User.findByIdAndUpdate(targetUserIdStr, { $addToSet: { friends: currentUserId } });
          await Conversation.updateMany(
            { participants: { $all: [currentUserId, targetUserIdStr] } },
            { status: 'accepted', isStranger: false }
          );
        } catch (_) {}
      }

      saveStore(store);

      // Gửi thông báo chúc mừng
      await createNotification({
        recipientId: targetUserIdStr,
        sender: currentUser,
        type: 'friend_accept',
        title: 'Lời mời kết bạn được chấp nhận 🎉',
        message: `${currentUser.name} đã chấp nhận lời mời kết bạn của bạn! Hai người hiện đã là bạn bè trên Freedom.`,
      });

      return sendSuccess(res, {
        message: `Đã trở thành bạn bè với ${targetUser.name}!`,
        data: {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar || '',
          isFriend: true,
          friendshipStatus: 'friends',
        },
      });
    }

    // 3. Kiểm tra nếu currentUser đã gửi lời mời cho targetUser rồi và đang chờ duyệt
    const existingSentReq = store.notifications.find(
      (n) =>
        n.type === 'friend_request' &&
        n.recipient === targetUserIdStr &&
        n.sender?._id === currentUserId &&
        n.actionStatus === 'pending'
    );

    if (existingSentReq) {
      return sendSuccess(res, {
        message: `Lời mời kết bạn đã được gửi tới ${targetUser.name}. Vui lòng chờ đối phương đồng ý nhé!`,
        data: {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar || '',
          isFriend: false,
          friendshipStatus: 'sent_pending',
        },
      });
    }

    // 4. Tạo thông báo Lời mời kết bạn (CHƯA là bạn bè, chờ đối phương bấm Đồng ý)
    await createNotification({
      recipientId: targetUserIdStr,
      sender: currentUser,
      type: 'friend_request',
      actionStatus: 'pending',
      title: 'Lời mời kết bạn mới 👥',
      message: `${currentUser.name} đã gửi lời mời kết bạn tới bạn. Hãy đồng ý để kết nối vào danh bạ nhé!`,
    });

    return sendSuccess(res, {
      message: `Đã gửi lời mời kết bạn tới ${targetUser.name}! Vui lòng chờ đối phương chấp nhận.`,
      data: {
        _id: targetUser._id,
        name: targetUser.name,
        avatar: targetUser.avatar || '',
        isFriend: false,
        friendshipStatus: 'sent_pending',
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Hủy kết bạn hoặc hủy lời mời kết bạn đang chờ
 */
export const removeFriend = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return sendError(res, { message: 'ID người bạn không hợp lệ', status: 400 });
    }

    const targetUserIdStr = targetUserId.toString();
    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const targetUser = await findUserAnywhere(targetUserIdStr);

    // 1. Cập nhật MongoDB nếu cả hai là ObjectId
    if (
      checkDbReady() &&
      mongoose.isValidObjectId(currentUserId) &&
      mongoose.isValidObjectId(targetUserIdStr)
    ) {
      try {
        await User.findByIdAndUpdate(currentUserId, {
          $pull: { friends: targetUserIdStr },
        });
        await User.findByIdAndUpdate(targetUserIdStr, {
          $pull: { friends: currentUserId },
        });
        await Notification.updateMany(
          {
            type: 'friend_request',
            $or: [
              { recipient: targetUserIdStr, 'sender._id': currentUserId },
              { recipient: currentUserId, 'sender._id': targetUserIdStr },
            ],
            actionStatus: 'pending',
          },
          { actionStatus: 'declined', isRead: true }
        );
      } catch (dbErr) {
        console.warn('MongoDB removeFriend warning:', dbErr.message);
      }
    }

    // 2. Persistent store: Xóa khỏi danh bạ bạn bè của cả hai
    const store = loadStore();
    const storeMe = (store.users || []).find((u) => (u._id || u.id)?.toString() === currentUserId);
    const storeTarget = (store.users || []).find((u) => (u._id || u.id)?.toString() === targetUserIdStr);

    if (storeMe && Array.isArray(storeMe.friends)) {
      storeMe.friends = storeMe.friends.filter((id) => id.toString() !== targetUserIdStr);
    }
    if (storeTarget && Array.isArray(storeTarget.friends)) {
      storeTarget.friends = storeTarget.friends.filter((id) => id.toString() !== currentUserId);
    }

    // Đánh dấu hủy/từ chối các lời mời kết bạn đang chờ giữa hai người
    if (Array.isArray(store.notifications)) {
      store.notifications.forEach((n) => {
        if (
          n.type === 'friend_request' &&
          ((n.recipient === targetUserIdStr && n.sender?._id === currentUserId) ||
            (n.recipient === currentUserId && n.sender?._id === targetUserIdStr)) &&
          n.actionStatus === 'pending'
        ) {
          n.actionStatus = 'declined';
          n.isRead = true;
        }
      });
    }

    saveStore(store);

    return sendSuccess(res, {
      message: `Đã hủy kết bạn / hủy lời mời kết bạn với ${targetUser?.name || 'người dùng'}.`,
      data: {
        _id: targetUserIdStr,
        isFriend: false,
        friendshipStatus: 'none',
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Bật / Tắt cài đặt nhận thông báo tin nhắn từ người lạ
 */
export const updateChatSettings = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { allowStrangerNotifications } = req.body;

    if (checkDbReady() && mongoose.isValidObjectId(currentUserId)) {
      try {
        await User.findByIdAndUpdate(currentUserId, {
          allowStrangerNotifications: Boolean(allowStrangerNotifications),
        });
      } catch (_) {}
    }

    const store = loadStore();
    const userInStore = (store.users || []).find((u) => (u._id || u.id)?.toString() === currentUserId);
    if (userInStore) {
      userInStore.allowStrangerNotifications = Boolean(allowStrangerNotifications);
      saveStore(store);
    }

    return sendSuccess(res, {
      message: 'Đã cập nhật cài đặt thông báo tin nhắn!',
      data: { allowStrangerNotifications: Boolean(allowStrangerNotifications) },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy số lượng tin nhắn chưa đọc tổng thể
 */
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const store = loadStore();
    const currentUser = (await findUserAnywhere(currentUserId)) || req.user;
    const allowStrangerNotif = currentUser?.allowStrangerNotifications ?? true;

    const unreadMessages = (store.messages || []).filter((m) => {
      const recId = (m.receiver?._id || m.receiver?.id || m.receiver || '').toString();
      return recId === currentUserId && !m.isRead;
    });

    let count = 0;
    let strangerUnreadCount = 0;

    unreadMessages.forEach((m) => {
      const conv = (store.conversations || []).find((c) => c._id === m.conversation);
      const isStrangerConv = conv ? conv.isStranger && conv.status === 'pending' : false;
      if (isStrangerConv) {
        strangerUnreadCount++;
        if (allowStrangerNotif) {
          count++;
        }
      } else {
        count++;
      }
    });

    return sendSuccess(res, {
      data: {
        unreadCount: count,
        strangerUnreadCount,
        allowStrangerNotifications: allowStrangerNotif,
      },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Cập nhật trạng thái hoạt động (online: Đang onl, busy: Đang bận/Treo máy, offline: Đang off)
 */
export const updateChatStatus = async (req, res) => {
  try {
    const currentUserId = (req.user._id || req.user.id).toString();
    const { status } = req.body;
    const VALID_STATUSES = ['online', 'busy', 'offline'];

    if (!VALID_STATUSES.includes(status)) {
      return sendError(res, {
        message: 'Trạng thái không hợp lệ. Chọn online, busy, hoặc offline',
        status: 400,
      });
    }

    if (checkDbReady() && mongoose.isValidObjectId(currentUserId)) {
      try {
        await User.findByIdAndUpdate(currentUserId, {
          chatStatus: status,
          lastActiveAt: new Date(),
        });
      } catch (_) {}
    }

    const store = loadStore();
    const userInStore = (store.users || []).find((u) => (u._id || u.id)?.toString() === currentUserId);
    if (userInStore) {
      userInStore.chatStatus = status;
      userInStore.lastActiveAt = new Date().toISOString();
      saveStore(store);
    }

    return sendSuccess(res, {
      message: 'Đã cập nhật trạng thái hoạt động thành công!',
      data: { chatStatus: status },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};
