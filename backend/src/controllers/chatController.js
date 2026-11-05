import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { checkDbReady } from '../config/db.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { loadStore, saveStore } from '../utils/persistentStore.js';
import { maskSensitiveText } from '../utils/sensitiveFilter.js';

/**
 * Lấy danh sách các cuộc trò chuyện của người dùng hiện tại
 * Hỗ trợ sắp xếp:
 * - 'recent' (Mặc định): Cuộc trò chuyện có tin nhắn cuối cùng mới nhất sẽ hiện lên đầu
 * - 'alphabet': Theo bảng chữ cái A-Z tên người trò chuyện
 * - 'frequency': Theo mức độ nhắn tin (tổng số tin nhắn nhiều nhất lên đầu)
 */
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { sortBy = 'recent', q } = req.query;

    if (checkDbReady()) {
      let conversations = await Conversation.find({
        participants: currentUserId,
      })
        .populate('participants', 'name avatar jobTitle role email friends chatStatus lastActiveAt')
        .populate('lastMessage.sender', 'name avatar')
        .sort({ updatedAt: -1 })
        .lean();

      // Xử lý dữ liệu định dạng trả về cho Frontend
      let formatted = conversations.map((c) => {
        const otherUser = c.participants.find(
          (p) => p._id.toString() !== currentUserId.toString()
        ) || c.participants[0] || {};

        const isFriend = Array.isArray(req.user.friends)
          ? req.user.friends.some((f) => f.toString() === otherUser._id?.toString())
          : false;

        return {
          _id: c._id,
          otherUser: {
            _id: otherUser._id,
            name: otherUser.name || 'Người dùng',
            avatar: otherUser.avatar || '/images/man.jpg',
            jobTitle: otherUser.jobTitle || 'Thành viên',
            role: otherUser.role || 'user',
            chatStatus: otherUser.chatStatus || 'online',
            lastActiveAt: otherUser.lastActiveAt,
            isFriend,
          },
          lastMessage: c.lastMessage || null,
          totalMessagesCount: c.totalMessagesCount || 0,
          status: c.status || 'accepted',
          isStranger: Boolean(c.isStranger),
          requestedBy: c.requestedBy,
          unreadCount: (c.unreadCounts && c.unreadCounts[currentUserId.toString()]) || 0,
          updatedAt: c.updatedAt || c.createdAt,
        };
      });

      // Lọc theo từ khóa tìm kiếm nếu có
      if (q && q.trim()) {
        const lowerQ = q.trim().toLowerCase();
        formatted = formatted.filter((c) =>
          c.otherUser.name.toLowerCase().includes(lowerQ)
        );
      }

      // Áp dụng các tiêu chí sắp xếp theo yêu cầu
      if (sortBy === 'alphabet') {
        formatted.sort((a, b) =>
          a.otherUser.name.localeCompare(b.otherUser.name, 'vi')
        );
      } else if (sortBy === 'frequency') {
        formatted.sort((a, b) => (b.totalMessagesCount || 0) - (a.totalMessagesCount || 0));
      } else {
        // Mặc định: Gần nhất (Ai nhắn cuối cùng thì hiện lên trước)
        formatted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }

      return sendSuccess(res, {
        message: 'Lấy danh sách tin nhắn thành công',
        data: formatted,
      });
    }

    // Fallback persistentStore
    const store = loadStore();
    const allConvs = store.conversations || [];
    const userConvs = allConvs.filter((c) =>
      Array.isArray(c.participants) && c.participants.includes(currentUserId.toString())
    );

    const currentUser = (store.users || []).find((u) => u._id === currentUserId.toString()) || req.user;
    const currentUserFriends = Array.isArray(currentUser?.friends) ? currentUser.friends : [];

    let formatted = userConvs.map((c) => {
      const otherId = c.participants.find((p) => p.toString() !== currentUserId.toString()) || c.participants[0];
      const otherUserObj = (store.users || []).find((u) => u._id === otherId?.toString()) || {
        _id: otherId,
        name: 'Người dùng',
        avatar: '/images/man.jpg',
        jobTitle: 'Thành viên',
        chatStatus: 'online',
      };

      const isFriend = currentUserFriends.some((f) => f.toString() === otherId?.toString());

      return {
        _id: c._id,
        otherUser: {
          _id: otherUserObj._id,
          name: otherUserObj.name || 'Người dùng',
          avatar: otherUserObj.avatar || '/images/man.jpg',
          jobTitle: otherUserObj.jobTitle || 'Thành viên',
          role: otherUserObj.role || 'user',
          chatStatus: otherUserObj.chatStatus || 'online',
          lastActiveAt: otherUserObj.lastActiveAt,
          isFriend,
        },
        lastMessage: c.lastMessage || null,
        totalMessagesCount: c.totalMessagesCount || 0,
        status: c.status || 'accepted',
        isStranger: Boolean(c.isStranger),
        requestedBy: c.requestedBy,
        unreadCount: (c.unreadCounts && c.unreadCounts[currentUserId.toString()]) || 0,
        updatedAt: c.updatedAt || c.createdAt,
      };
    });

    if (q && q.trim()) {
      const lowerQ = q.trim().toLowerCase();
      formatted = formatted.filter((c) =>
        c.otherUser.name.toLowerCase().includes(lowerQ)
      );
    }

    if (sortBy === 'alphabet') {
      formatted.sort((a, b) => a.otherUser.name.localeCompare(b.otherUser.name, 'vi'));
    } else if (sortBy === 'frequency') {
      formatted.sort((a, b) => (b.totalMessagesCount || 0) - (a.totalMessagesCount || 0));
    } else {
      formatted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return sendSuccess(res, {
      message: 'Lấy danh sách tin nhắn thành công (Persistent Store)',
      data: formatted,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Tìm hoặc tạo cuộc trò chuyện với một người dùng (Bấm từ comment hoặc profile)
 */
export const findOrCreateConversation = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId.toString() === currentUserId.toString()) {
      return sendError(res, { message: 'ID người nhận không hợp lệ', status: 400 });
    }

    if (checkDbReady()) {
      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(targetUserId).select(
        'name avatar jobTitle role email friends chatStatus lastActiveAt'
      );

      if (!targetUser) {
        return sendError(res, { message: 'Không tìm thấy người dùng này', status: 404 });
      }

      // Kiểm tra cuộc trò chuyện đã tồn tại giữa 2 người chưa
      let conv = await Conversation.findOne({
        participants: { $all: [currentUserId, targetUserId] },
      }).populate('participants', 'name avatar jobTitle role email chatStatus lastActiveAt');

      const isFriend = Array.isArray(currentUser.friends) &&
        currentUser.friends.some((f) => f.toString() === targetUserId.toString());

      if (!conv) {
        conv = await Conversation.create({
          participants: [currentUserId, targetUserId],
          status: isFriend ? 'accepted' : 'pending',
          isStranger: !isFriend,
          requestedBy: currentUserId,
          totalMessagesCount: 0,
        });

        conv = await Conversation.findById(conv._id).populate(
          'participants',
          'name avatar jobTitle role email chatStatus lastActiveAt'
        );
      }

      const formatted = {
        _id: conv._id,
        otherUser: {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar,
          jobTitle: targetUser.jobTitle,
          role: targetUser.role,
          chatStatus: targetUser.chatStatus || 'online',
          lastActiveAt: targetUser.lastActiveAt,
          isFriend,
        },
        lastMessage: conv.lastMessage || null,
        totalMessagesCount: conv.totalMessagesCount || 0,
        status: conv.status,
        isStranger: conv.isStranger,
        requestedBy: conv.requestedBy,
        updatedAt: conv.updatedAt,
      };

      return sendSuccess(res, {
        message: 'Lấy cuộc trò chuyện thành công',
        data: formatted,
      });
    }

    return sendSuccess(res, {
      data: {
        _id: `conv_${currentUserId}_${targetUserId}`,
        otherUser: { _id: targetUserId, name: 'Người dùng', avatar: '/images/man.jpg' },
        status: 'accepted',
      },
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
    const currentUserId = req.user._id;

    if (checkDbReady()) {
      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        return sendError(res, { message: 'Không tìm thấy cuộc trò chuyện', status: 404 });
      }

      const isParticipant = conv.participants.some(
        (p) => p.toString() === currentUserId.toString()
      );
      if (!isParticipant) {
        return sendError(res, { message: 'Bạn không có quyền truy cập cuộc trò chuyện này', status: 403 });
      }

      // Lấy toàn bộ tin nhắn được xếp theo thời gian tăng dần
      const messages = await Message.find({ conversation: conversationId })
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar')
        .sort({ createdAt: 1 })
        .lean();

      // Đánh dấu các tin nhắn người khác gửi cho mình là đã đọc
      await Message.updateMany(
        { conversation: conversationId, receiver: currentUserId, isRead: false },
        { isRead: true }
      );

      return sendSuccess(res, {
        message: 'Lấy tin nhắn thành công',
        data: {
          conversation: conv,
          messages,
        },
      });
    }

    const store = loadStore();
    const conv = (store.conversations || []).find((c) => c._id === conversationId);
    const msgs = (store.messages || []).filter((m) => m.conversation === conversationId);

    // Đánh dấu các tin nhắn người khác gửi cho mình là đã đọc
    let updated = false;
    msgs.forEach((m) => {
      if ((m.receiver?._id === currentUserId.toString() || m.receiver === currentUserId.toString()) && !m.isRead) {
        m.isRead = true;
        updated = true;
      }
    });

    if (conv && conv.unreadCounts && conv.unreadCounts[currentUserId.toString()]) {
      conv.unreadCounts[currentUserId.toString()] = 0;
      updated = true;
    }

    if (updated) {
      saveStore(store);
    }

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
    const currentUserId = req.user._id;
    const { conversationId, receiverId, content } = req.body;

    if (!content || !content.trim()) {
      return sendError(res, { message: 'Vui lòng nhập nội dung tin nhắn', status: 400 });
    }

    const cleanContent = maskSensitiveText(content.trim());

    if (checkDbReady()) {
      let conv;
      let targetUserId = receiverId;

      if (conversationId) {
        conv = await Conversation.findById(conversationId);
        if (conv) {
          targetUserId = conv.participants.find(
            (p) => p.toString() !== currentUserId.toString()
          );
        }
      }

      if (!conv && targetUserId) {
        const currentUser = await User.findById(currentUserId);
        const isFriend = Array.isArray(currentUser.friends) &&
          currentUser.friends.some((f) => f.toString() === targetUserId.toString());

        conv = await Conversation.create({
          participants: [currentUserId, targetUserId],
          status: isFriend ? 'accepted' : 'pending',
          isStranger: !isFriend,
          requestedBy: currentUserId,
          totalMessagesCount: 0,
        });
      }

      if (!conv) {
        return sendError(res, { message: 'Không thể xác định cuộc trò chuyện', status: 400 });
      }

      // Tạo tin nhắn mới
      const newMessage = await Message.create({
        conversation: conv._id,
        sender: currentUserId,
        receiver: targetUserId,
        content: cleanContent,
        isRead: false,
      });

      // Cập nhật thông tin cuộc trò chuyện
      conv.lastMessage = {
        content: cleanContent,
        sender: currentUserId,
        createdAt: new Date(),
      };
      conv.totalMessagesCount = (conv.totalMessagesCount || 0) + 1;
      conv.updatedAt = new Date(); // Đảm bảo nhảy lên đầu danh sách theo sắp xếp gần nhất
      await conv.save();

      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar')
        .lean();

      // Lưu trữ persistent
      const store = loadStore();
      store.messages = store.messages || [];
      store.messages.push(populatedMessage);
      saveStore(store);

      return sendSuccess(res, {
        message: 'Gửi tin nhắn thành công',
        data: populatedMessage,
        status: 201,
      });
    }

    // Fallback store
    const store = loadStore();
    const currentUser = (store.users || []).find((u) => u._id === currentUserId.toString()) || req.user;
    const targetUser = (store.users || []).find((u) => u._id === receiverId?.toString());

    let conv = (store.conversations || []).find((c) => c._id === conversationId);
    if (!conv && receiverId) {
      conv = (store.conversations || []).find(
        (c) =>
          Array.isArray(c.participants) &&
          c.participants.includes(currentUserId.toString()) &&
          c.participants.includes(receiverId.toString())
      );
    }

    if (!conv) {
      const isFriend = Array.isArray(currentUser.friends) && currentUser.friends.includes(receiverId?.toString());
      conv = {
        _id: conversationId || `conv_${Date.now()}`,
        participants: [currentUserId.toString(), receiverId?.toString()],
        status: isFriend ? 'accepted' : 'pending',
        isStranger: !isFriend,
        requestedBy: currentUserId.toString(),
        totalMessagesCount: 0,
        unreadCounts: {},
        updatedAt: new Date().toISOString(),
      };
      if (!Array.isArray(store.conversations)) store.conversations = [];
      store.conversations.unshift(conv);
    }

    const fallbackMsg = {
      _id: `msg_${Date.now()}`,
      conversation: conv._id,
      sender: { _id: currentUserId, name: currentUser.name, avatar: currentUser.avatar },
      receiver: { _id: receiverId, name: targetUser?.name || 'Người nhận' },
      content: cleanContent,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    conv.lastMessage = {
      _id: fallbackMsg._id,
      content: cleanContent,
      sender: fallbackMsg.sender,
      createdAt: fallbackMsg.createdAt,
    };
    conv.totalMessagesCount = (conv.totalMessagesCount || 0) + 1;
    conv.updatedAt = new Date().toISOString();

    if (!Array.isArray(store.messages)) store.messages = [];
    store.messages.push(fallbackMsg);
    saveStore(store);

    return sendSuccess(res, { data: fallbackMsg, status: 201 });
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
    const currentUserId = req.user._id;

    if (checkDbReady()) {
      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        return sendError(res, { message: 'Không tìm thấy cuộc trò chuyện', status: 404 });
      }

      conv.status = 'accepted';
      await conv.save();

      return sendSuccess(res, {
        message: 'Đã đồng ý nhận tin nhắn từ người này!',
        data: conv,
      });
    }

    const store = loadStore();
    const conv = (store.conversations || []).find((c) => c._id === conversationId);
    if (conv) {
      conv.status = 'accepted';
      conv.isStranger = false;
      saveStore(store);
      return sendSuccess(res, {
        message: 'Đã đồng ý nhận tin nhắn từ người này!',
        data: conv,
      });
    }

    return sendSuccess(res, { message: 'Đã chấp nhận cuộc trò chuyện' });
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
    const currentUserId = req.user._id;
    const { sortBy = 'alphabet', q } = req.query;

    if (checkDbReady()) {
      const user = await User.findById(currentUserId).populate(
        'friends',
        'name avatar jobTitle role email bio chatStatus lastActiveAt'
      );

      let friendsList = (user?.friends || []).map((f) => ({
        _id: f._id,
        name: f.name,
        avatar: f.avatar || '/images/man.jpg',
        jobTitle: f.jobTitle || 'Thành viên',
        role: f.role || 'user',
        bio: f.bio || '',
        chatStatus: f.chatStatus || 'online',
        lastActiveAt: f.lastActiveAt,
      }));

      // Lấy thêm thông tin tin nhắn giữa 2 người để hỗ trợ sắp xếp theo 'frequency' và 'recent'
      const convs = await Conversation.find({
        participants: currentUserId,
      }).lean();

      const convMap = {};
      convs.forEach((c) => {
        const otherId = c.participants.find(
          (p) => p.toString() !== currentUserId.toString()
        );
        if (otherId) {
          convMap[otherId.toString()] = {
            totalMessagesCount: c.totalMessagesCount || 0,
            lastMessageTime: c.lastMessage?.createdAt || c.updatedAt || new Date(0),
          };
        }
      });

      friendsList = friendsList.map((f) => ({
        ...f,
        totalMessagesCount: convMap[f._id.toString()]?.totalMessagesCount || 0,
        lastMessageTime: convMap[f._id.toString()]?.lastMessageTime || new Date(0),
      }));

      if (q && q.trim()) {
        const lowerQ = q.trim().toLowerCase();
        friendsList = friendsList.filter((f) =>
          f.name.toLowerCase().includes(lowerQ)
        );
      }

      if (sortBy === 'recent') {
        friendsList.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
      } else if (sortBy === 'frequency') {
        friendsList.sort((a, b) => (b.totalMessagesCount || 0) - (a.totalMessagesCount || 0));
      } else {
        // Mặc định cho danh bạ: Thứ tự chữ cái Alpha B
        friendsList.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      }

      return sendSuccess(res, {
        message: 'Lấy danh bạ bạn bè thành công',
        data: friendsList,
      });
    }

    // Fallback persistentStore
    const store = loadStore();
    const currentUser = (store.users || []).find((u) => u._id === currentUserId.toString()) || req.user;
    const friendsIds = Array.isArray(currentUser?.friends) ? currentUser.friends : [];

    let friendsList = (store.users || [])
      .filter((u) => friendsIds.includes(u._id))
      .map((f) => ({
        _id: f._id,
        name: f.name,
        avatar: f.avatar || '/images/man.jpg',
        jobTitle: f.jobTitle || 'Thành viên',
        role: f.role || 'user',
        bio: f.bio || '',
        chatStatus: f.chatStatus || 'online',
        lastActiveAt: f.lastActiveAt,
        isFriend: true,
      }));

    if (q && q.trim()) {
      const lowerQ = q.trim().toLowerCase();
      friendsList = friendsList.filter((f) =>
        f.name.toLowerCase().includes(lowerQ)
      );
    }

    if (sortBy === 'alphabet') {
      friendsList.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    } else {
      friendsList.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    }

    return sendSuccess(res, {
      message: 'Lấy danh bạ bạn bè thành công (Persistent Store)',
      data: friendsList,
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Kết bạn trực tiếp với một người dùng (Thêm vào danh bạ)
 */
export const addFriend = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetUserId } = req.body;

    if (!targetUserId || targetUserId.toString() === currentUserId.toString()) {
      return sendError(res, { message: 'ID người bạn không hợp lệ', status: 400 });
    }

    if (checkDbReady()) {
      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(targetUserId);

      if (!targetUser) {
        return sendError(res, { message: 'Không tìm thấy người dùng này', status: 404 });
      }

      // Thêm nhau vào danh sách bạn bè 2 chiều
      if (!currentUser.friends.includes(targetUserId)) {
        currentUser.friends.push(targetUserId);
        await currentUser.save();
      }

      if (!targetUser.friends.includes(currentUserId)) {
        targetUser.friends.push(currentUserId);
        await targetUser.save();
      }

      // Nếu có cuộc trò chuyện đang là 'pending' (người lạ), tự động chuyển sang 'accepted' và 'isStranger: false'
      await Conversation.updateMany(
        { participants: { $all: [currentUserId, targetUserId] } },
        { status: 'accepted', isStranger: false }
      );

      return sendSuccess(res, {
        message: `Đã kết bạn thành công với ${targetUser.name}! Tên đã được lưu vào Danh bạ bạn bè.`,
        data: {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar,
          isFriend: true,
        },
      });
    }

    // Fallback persistent store
    const store = loadStore();
    const currentUser = (store.users || []).find((u) => u._id === currentUserId.toString());
    const targetUser = (store.users || []).find((u) => u._id === targetUserId.toString());

    if (currentUser && targetUser) {
      if (!Array.isArray(currentUser.friends)) currentUser.friends = [];
      if (!Array.isArray(targetUser.friends)) targetUser.friends = [];

      if (!currentUser.friends.includes(targetUserId.toString())) {
        currentUser.friends.push(targetUserId.toString());
      }
      if (!targetUser.friends.includes(currentUserId.toString())) {
        targetUser.friends.push(currentUserId.toString());
      }

      if (Array.isArray(store.conversations)) {
        store.conversations.forEach((c) => {
          if (
            c.participants.includes(currentUserId.toString()) &&
            c.participants.includes(targetUserId.toString())
          ) {
            c.status = 'accepted';
            c.isStranger = false;
          }
        });
      }

      saveStore(store);

      return sendSuccess(res, {
        message: `Đã kết bạn thành công với ${targetUser.name}! Tên đã được lưu vào Danh bạ bạn bè.`,
        data: {
          _id: targetUser._id,
          name: targetUser.name,
          avatar: targetUser.avatar,
          isFriend: true,
        },
      });
    }

    return sendSuccess(res, { message: 'Đã kết bạn thành công!' });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Hủy kết bạn
 */
export const removeFriend = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { targetUserId } = req.body;

    if (checkDbReady()) {
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { friends: targetUserId },
      });
      await User.findByIdAndUpdate(targetUserId, {
        $pull: { friends: currentUserId },
      });

      return sendSuccess(res, { message: 'Đã xóa khỏi danh bạ bạn bè' });
    }

    // Fallback persistent store
    const store = loadStore();
    const currentUser = (store.users || []).find((u) => u._id === currentUserId.toString());
    const targetUser = (store.users || []).find((u) => u._id === targetUserId.toString());

    if (currentUser && Array.isArray(currentUser.friends)) {
      currentUser.friends = currentUser.friends.filter((id) => id !== targetUserId.toString());
    }
    if (targetUser && Array.isArray(targetUser.friends)) {
      targetUser.friends = targetUser.friends.filter((id) => id !== currentUserId.toString());
    }
    saveStore(store);

    return sendSuccess(res, { message: 'Đã xóa khỏi danh bạ bạn bè' });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Bật / Tắt cài đặt nhận thông báo tin nhắn từ người lạ
 */
export const updateChatSettings = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { allowStrangerNotifications } = req.body;

    if (checkDbReady()) {
      const user = await User.findById(currentUserId);
      if (user) {
        user.allowStrangerNotifications = Boolean(allowStrangerNotifications);
        await user.save();

        return sendSuccess(res, {
          message: 'Đã cập nhật cài đặt thông báo tin nhắn!',
          data: { allowStrangerNotifications: user.allowStrangerNotifications },
        });
      }
    }

    // Fallback persistent store
    const store = loadStore();
    const userInStore = (store.users || []).find((u) => u._id === currentUserId.toString());
    if (userInStore) {
      userInStore.allowStrangerNotifications = Boolean(allowStrangerNotifications);
      saveStore(store);
    }

    return sendSuccess(res, {
      data: { allowStrangerNotifications: Boolean(allowStrangerNotifications) },
    });
  } catch (error) {
    return sendError(res, { message: error.message, status: 500 });
  }
};

/**
 * Lấy số lượng tin nhắn chưa đọc tổng thể
 * Có kiểm tra điều kiện cài đặt allowStrangerNotifications
 */
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    if (checkDbReady()) {
      const user = await User.findById(currentUserId);
      const allowStrangerNotif = user?.allowStrangerNotifications ?? true;

      // Lấy các tin nhắn chưa đọc mà người nhận là currentUserId
      const unreadMessages = await Message.find({
        receiver: currentUserId,
        isRead: false,
      }).populate('conversation');

      let count = 0;
      let strangerUnreadCount = 0;

      unreadMessages.forEach((m) => {
        const isStrangerConv = m.conversation && m.conversation.isStranger && m.conversation.status === 'pending';
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
    }

    // Fallback persistent store
    const store = loadStore();
    const currentUser = (store.users || []).find((u) => u._id === currentUserId.toString());
    const allowStrangerNotif = currentUser?.allowStrangerNotifications ?? true;

    const unreadMessages = (store.messages || []).filter(
      (m) =>
        (m.receiver?._id === currentUserId.toString() || m.receiver === currentUserId.toString()) &&
        !m.isRead
    );

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
 * Cập nhật trạng thái hoạt động của người dùng (online: Đang onl, busy: Đang bận/Treo máy, offline: Đang off)
 */
export const updateChatStatus = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { status } = req.body;
    const VALID_STATUSES = ['online', 'busy', 'offline'];

    if (!VALID_STATUSES.includes(status)) {
      return sendError(res, {
        message: 'Trạng thái không hợp lệ. Chọn online (Đang onl), busy (Đang bận / Treo máy), hoặc offline (Đang off)',
        status: 400,
      });
    }

    if (checkDbReady()) {
      const user = await User.findById(currentUserId);
      if (user) {
        user.chatStatus = status;
        user.lastActiveAt = new Date();
        await user.save();

        return sendSuccess(res, {
          message: 'Đã cập nhật trạng thái hoạt động thành công!',
          data: { chatStatus: user.chatStatus },
        });
      }
    }

    // Fallback persistent store
    const store = loadStore();
    const userInStore = (store.users || []).find((u) => u._id === currentUserId.toString());
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

