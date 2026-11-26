/**
 * Xác định chính xác một tin nhắn có phải do người dùng hiện tại gửi hay không
 * trong hội thoại 1-1 giữa currentUser và otherUser.
 */
export const isMessageFromCurrentUser = (message, currentUser, otherUser) => {
  const myId = (currentUser?._id || currentUser?.id || '').toString();
  const myEmail = (currentUser?.email || '').toLowerCase().trim();
  const myName = (currentUser?.name || '').trim().toLowerCase();

  const otherId = (otherUser?._id || otherUser?.id || '').toString();
  const otherEmail = (otherUser?.email || '').toLowerCase().trim();
  const otherName = (otherUser?.name || '').trim().toLowerCase();

  const senderId = (message?.sender?._id || message?.sender?.id || message?.sender || '').toString();
  const senderEmail = (message?.sender?.email || '').toLowerCase().trim();
  const senderName = (message?.sender?.name || '').trim().toLowerCase();

  if (myId && senderId && senderId === myId) return true;
  if (myEmail && senderEmail && senderEmail === myEmail) return true;

  if (otherId && senderId && senderId === otherId) return false;
  if (otherEmail && senderEmail && senderEmail === otherEmail) return false;

  if (myName && senderName && senderName === myName && senderName !== otherName) return true;
  if (otherName && senderName && senderName === otherName) return false;

  return false;
};

/**
 * Chuẩn hóa trạng thái "Tin nhắn người lạ" theo đúng vai trò Người gửi / Người nhận:
 * - Khi chưa có tin nhắn hoặc chính người dùng hiện tại nhắn trước: KHÔNG hiện banner người lạ.
 * - Khi người dùng hiện tại đã gửi tin nhắn đầu tiên và đối phương chưa phản hồi: hiện ghi chú nhỏ.
 * - Chỉ hiện banner "TIN NHẮN NGƯỜI LẠ" (Chấp nhận / Bỏ qua) cho NGƯỜI NHẬN khi đủ 3 điều kiện:
 *   1) Chưa kết bạn (!isFriend)
 *   2) Có ít nhất 1 tin nhắn do đối phương gửi tới
 *   3) Người nhận chưa bấm Chấp nhận (convStatus === 'pending') và chưa nhắn trả lời
 */
export const getStrangerConversationState = ({
  messages = [],
  currentUser,
  otherUser,
  isFriend = false,
  isStranger = false,
  convStatus = 'accepted',
}) => {
  if (isFriend || convStatus === 'accepted' || convStatus === 'rejected') {
    return {
      showReceiverBanner: false,
      showSenderPendingHint: false,
      hasMyMessage: messages.some((m) => isMessageFromCurrentUser(m, currentUser, otherUser)),
      hasOtherMessage: messages.some((m) => !isMessageFromCurrentUser(m, currentUser, otherUser)),
    };
  }

  let hasMyMessage = false;
  let hasOtherMessage = false;

  for (const msg of messages) {
    if (isMessageFromCurrentUser(msg, currentUser, otherUser)) {
      hasMyMessage = true;
    } else {
      hasOtherMessage = true;
    }
    if (hasMyMessage && hasOtherMessage) break;
  }

  const isPending = convStatus === 'pending' && Boolean(isStranger || !isFriend);

  return {
    showReceiverBanner: Boolean(!isFriend && isPending && hasOtherMessage && !hasMyMessage),
    showSenderPendingHint: Boolean(!isFriend && convStatus === 'pending' && hasMyMessage && !hasOtherMessage),
    hasMyMessage,
    hasOtherMessage,
  };
};
