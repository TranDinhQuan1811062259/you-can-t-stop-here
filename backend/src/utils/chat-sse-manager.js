/**
 * Chat SSE Connection Manager
 * Quản lý kết nối Server-Sent Events (SSE) theo từng userId với giới hạn chống rò rỉ RAM/DoS
 * và heartbeat giữ kết nối xuyên proxy/Render.
 */

const MAX_CONNECTIONS_PER_USER = 5;
const MAX_TOTAL_CONNECTIONS = 2000;
const HEARTBEAT_INTERVAL_MS = 25000;

/** @type {Map<string, Set<import('http').ServerResponse>>} */
const clientsByUser = new Map();

const countTotalConnections = () => {
  let total = 0;
  for (const userSet of clientsByUser.values()) {
    total += userSet.size;
  }
  return total;
};

const sanitizeSseEventName = (eventName) => {
  const cleaned = String(eventName || 'message').replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned || 'message';
};

const safeWriteFrame = (res, frame) => {
  if (!res || res.writableEnded || res.destroyed) return false;
  try {
    res.write(frame);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Đăng ký kết nối SSE mới cho một người dùng đã xác thực
 */
export const registerChatSseClient = ({ userId, req, res }) => {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) {
    return res.status(401).json({ success: false, message: 'Không xác định được tài khoản SSE' });
  }

  if (countTotalConnections() >= MAX_TOTAL_CONNECTIONS) {
    return res.status(503).json({
      success: false,
      message: 'Hệ thống đang quá tải kết nối realtime, vui lòng thử lại sau ít giây',
    });
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  let userSet = clientsByUser.get(cleanUserId);
  if (!userSet) {
    userSet = new Set();
    clientsByUser.set(cleanUserId, userSet);
  }

  // Giới hạn số tab/kết nối đồng thời mỗi user: đóng kết nối cũ nhất để chống rò rỉ RAM
  while (userSet.size >= MAX_CONNECTIONS_PER_USER) {
    const oldestRes = userSet.values().next().value;
    if (!oldestRes) break;
    safeWriteFrame(oldestRes, 'event: replaced\ndata: {"reason":"connection_limit"}\n\n');
    if (typeof oldestRes.__cleanupSse === 'function') {
      oldestRes.__cleanupSse();
    } else {
      userSet.delete(oldestRes);
    }
    try {
      if (!oldestRes.writableEnded) oldestRes.end();
    } catch (_) {}
  }

  let cleaned = false;
  let heartbeatTimer = null;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;

    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    const activeSet = clientsByUser.get(cleanUserId);
    if (activeSet) {
      activeSet.delete(res);
      if (activeSet.size === 0) {
        clientsByUser.delete(cleanUserId);
      }
    }

    req?.off?.('close', cleanup);
    res?.off?.('close', cleanup);
    res?.off?.('error', cleanup);
  };

  res.__cleanupSse = cleanup;
  userSet.add(res);

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);

  // Gửi xác nhận kết nối ban đầu (không chứa PII nhạy cảm)
  if (!safeWriteFrame(res, 'event: connected\ndata: {"ok":true}\n\n')) {
    cleanup();
    return;
  }

  // Comment heartbeat mỗi 25s tránh Render / Nginx đóng kết nối idle
  heartbeatTimer = setInterval(() => {
    if (res.writableEnded || res.destroyed) {
      cleanup();
      return;
    }
    if (!safeWriteFrame(res, ': ping\n\n')) {
      cleanup();
    }
  }, HEARTBEAT_INTERVAL_MS);

  if (heartbeatTimer && typeof heartbeatTimer.unref === 'function') {
    heartbeatTimer.unref();
  }
};

/**
 * Đẩy một sự kiện SSE tới tất cả kết nối đang mở của một userId
 */
export const emitChatEventToUser = (userId, eventName, payload = {}) => {
  const cleanUserId = String(userId || '').trim();
  if (!cleanUserId) return 0;

  const userSet = clientsByUser.get(cleanUserId);
  if (!userSet || userSet.size === 0) return 0;

  const safeEvent = sanitizeSseEventName(eventName);
  let serialized;
  try {
    serialized = JSON.stringify(payload);
  } catch (_) {
    return 0;
  }

  const frame = `event: ${safeEvent}\ndata: ${serialized}\n\n`;
  let sentCount = 0;

  for (const clientRes of [...userSet]) {
    if (safeWriteFrame(clientRes, frame)) {
      sentCount += 1;
    } else if (typeof clientRes.__cleanupSse === 'function') {
      clientRes.__cleanupSse();
    } else {
      userSet.delete(clientRes);
    }
  }

  return sentCount;
};

/**
 * Đẩy tin nhắn mới tức thì tới người nhận (và đồng bộ các tab khác của người gửi)
 * Chỉ mang các trường tối giản, không đính kèm email/PII dư thừa.
 */
export const pushNewChatMessage = ({ message, senderId, receiverId, conversation }) => {
  if (!message) return;

  const cleanSenderId = String(senderId || message.sender?._id || message.sender || '').trim();
  const cleanReceiverId = String(receiverId || message.receiver?._id || message.receiver || '').trim();
  const cleanConvId = String(message.conversation || conversation?._id || '').trim();

  const safeMessage = {
    _id: String(message._id || ''),
    conversation: cleanConvId,
    sender: {
      _id: cleanSenderId,
      name: message.sender?.name || 'Người dùng',
      avatar: message.sender?.avatar || '',
    },
    receiver: {
      _id: cleanReceiverId,
      name: message.receiver?.name || 'Người nhận',
      avatar: message.receiver?.avatar || '',
    },
    content: String(message.content || ''),
    isRead: Boolean(message.isRead),
    createdAt: message.createdAt || new Date().toISOString(),
  };

  const eventPayload = {
    message: safeMessage,
    conversationId: cleanConvId,
    senderId: cleanSenderId,
    receiverId: cleanReceiverId,
    conversationStatus: conversation?.status || 'accepted',
    isStranger: Boolean(conversation?.isStranger),
  };

  if (cleanReceiverId) {
    emitChatEventToUser(cleanReceiverId, 'new_message', eventPayload);
  }
  if (cleanSenderId && cleanSenderId !== cleanReceiverId) {
    emitChatEventToUser(cleanSenderId, 'new_message', eventPayload);
  }
};
