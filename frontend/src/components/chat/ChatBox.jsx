import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import {
  isMessageFromCurrentUser,
  getStrangerConversationState,
} from '../../utils/chat-message-helpers';

const DEFAULT_EMPTY_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";
const getSafeAvatar = (av) => (av && !av.includes('man.jpg') && !av.includes('google_avatar')) ? av : DEFAULT_EMPTY_AVATAR;

export const ChatBox = () => {
  const {
    activeConversation,
    closeChat,
    handleAddFriend,
    fetchUnread,
  } = useChat();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [convStatus, setConvStatus] = useState('accepted');
  const [isStranger, setIsStranger] = useState(false);
  const [isFriend, setIsFriend] = useState(false);

  const messagesEndRef = useRef(null);

  const otherUser = activeConversation?.otherUser || {};
  const convId = activeConversation?._id;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = () => {
    if (!convId) return;
    chatService
      .getMessages(convId)
      .then((res) => {
        if (res.data) {
          setMessages(res.data.messages || []);
          if (res.data.conversation) {
            setConvStatus(res.data.conversation.status || 'accepted');
            setIsStranger(Boolean(res.data.conversation.isStranger));
          }
          fetchUnread();
        }
      })
      .catch((err) => console.warn('Lỗi lấy tin nhắn:', err));
  };

  useEffect(() => {
    if (activeConversation) {
      setConvStatus(activeConversation.status || 'accepted');
      setIsStranger(Boolean(activeConversation.isStranger));
      setIsFriend(Boolean(activeConversation.otherUser?.isFriend));
      fetchMessages();

      // Polling lấy tin nhắn mới mỗi 3 giây khi khung chat đang mở
      const timer = setInterval(() => {
        fetchMessages();
      }, 3000);

      return () => clearInterval(timer);
    }
  }, [convId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!activeConversation) return null;

  const { showReceiverBanner, showSenderPendingHint } = getStrangerConversationState({
    messages,
    currentUser: user,
    otherUser,
    isFriend,
    isStranger,
    convStatus,
  });

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const content = inputText.trim();
    const shouldAutoAcceptOnReply = showReceiverBanner;
    setInputText('');
    setSending(true);

    try {
      const payload = {
        conversationId: convId,
        receiverId: otherUser._id,
        content,
      };

      const res = await chatService.sendMessage(payload);
      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
        if (shouldAutoAcceptOnReply) {
          setConvStatus('accepted');
          setIsStranger(false);
          chatService.acceptConversation(convId).catch(() => {});
        }
        scrollToBottom();
      }
    } catch (err) {
      alert(err.message || 'Lỗi khi gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const handleAddEmoji = (emoji) => {
    setInputText((prev) => prev + emoji);
  };

  const handleAcceptStranger = async () => {
    try {
      await chatService.acceptConversation(convId);
      setConvStatus('accepted');
      setIsStranger(false);
    } catch (err) {
      alert(err.message || 'Lỗi khi chấp nhận cuộc trò chuyện');
    }
  };

  const handleDeclineStranger = async () => {
    try {
      await chatService.declineConversation(convId);
      setConvStatus('rejected');
      closeChat();
    } catch (_) {
      closeChat();
    }
  };

  const onAddFriendClick = async () => {
    try {
      await handleAddFriend(otherUser._id);
      setIsFriend(true);
      setIsStranger(false);
      setConvStatus('accepted');
    } catch (err) {
      alert(err.message || 'Lỗi khi kết bạn');
    }
  };

  return (
    <div className="floating-chat-box">
      {/* Header Khung Chat */}
      <div className="chatbox-header">
        <Link
          to={`/profile/${otherUser._id || encodeURIComponent(otherUser.name)}`}
          className="chatbox-header-user"
          style={{ textDecoration: 'none', color: 'inherit' }}
          title={`Xem trang cá nhân của ${otherUser.name}`}
        >
          <img
            src={getSafeAvatar(otherUser.avatar)}
            alt={otherUser.name}
            className="chatbox-avatar"
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h4 className="chatbox-user-name">{otherUser.name}</h4>
              {isFriend ? (
                <span className="badge-friend-tag">Bạn bè</span>
              ) : (
                <span className="badge-stranger-tag">Người lạ</span>
              )}
            </div>
            <span className="chatbox-user-sub">{otherUser.jobTitle || 'Thành viên'}</span>
          </div>
        </Link>

        <div className="chatbox-header-actions">
          {!isFriend && (
            <button
              type="button"
              className="chatbox-add-friend-btn"
              onClick={onAddFriendClick}
              title="Kết bạn để lưu vào Danh bạ bạn bè"
            >
              + Kết bạn
            </button>
          )}
          <button
            type="button"
            className="chatbox-close-btn"
            onClick={closeChat}
            title="Đóng cuộc trò chuyện"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Banner Người Lạ (Chỉ hiển thị cho người nhận khi đủ 3 điều kiện) */}
      {showReceiverBanner && (
        <div className="stranger-request-banner">
          <div className="assistive-stranger-banner-top">
            <span className="assistive-stranger-badge">
              <span className="badge-shield">🛡️</span> Tin nhắn người lạ
            </span>
          </div>
          <p className="stranger-banner-sub">
            <span className="warning-animated-icon">⚠️</span>
            <span><strong>{otherUser.name}</strong> chưa có trong danh bạ. Bạn có muốn bắt đầu trò chuyện?</span>
          </p>
          <div className="assistive-stranger-actions">
            <button
              type="button"
              className="accept-stranger-btn"
              onClick={handleAcceptStranger}
              title="Chấp nhận lời mời trò chuyện"
            >
              ✓ Chấp nhận
            </button>
            <button
              type="button"
              className="assistive-decline-btn"
              onClick={handleDeclineStranger}
              title="Bỏ qua yêu cầu trò chuyện này"
            >
              ✕ Bỏ qua
            </button>
          </div>
        </div>
      )}

      {/* Vùng Tin Nhắn */}
      <div className="chatbox-messages-area">
        {messages.length === 0 ? (
          <div className="chatbox-empty-prompt">
            <span style={{ fontSize: '1.8rem' }}>👋</span>
            <p>Gửi lời chào đầu tiên tới {otherUser.name}!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = isMessageFromCurrentUser(m, user, otherUser);
            const isPendingStrangerMsg = !isMe && showReceiverBanner;
            const timeStr = new Date(m.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={m._id}
                className={`chat-bubble-row ${isMe ? 'my-message' : 'their-message'} ${
                  isPendingStrangerMsg ? 'stranger-pending-msg' : ''
                }`}
              >
                {!isMe && (
                  <img
                    src={getSafeAvatar(m.sender?.avatar || otherUser.avatar)}
                    alt={otherUser.name}
                    className="bubble-avatar"
                  />
                )}
                <div className="bubble-content-wrap">
                  {isPendingStrangerMsg && (
                    <span className="stranger-msg-intro-tag">
                      ✨ Tin nhắn làm quen mới
                    </span>
                  )}
                  <div className="chat-bubble-text">{m.content}</div>
                  <span className="bubble-time">{timeStr}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Ghi chú nhỏ cho người gửi khi tin nhắn đang chờ ở phía đối phương */}
      {showSenderPendingHint && (
        <div className="stranger-sender-hint-bar">
          <i className="fa-solid fa-paper-plane" aria-hidden="true"></i>
          <span>
            Tin nhắn sẽ được gửi vào mục Tin nhắn chờ của <strong>{otherUser.name || 'đối phương'}</strong>
          </span>
        </div>
      )}

      {/* Nút Emojis nhanh */}
      <div className="chatbox-quick-emojis">
        {['👍', '❤️', '😊', '🫂', '☕', '💪'].map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="quick-emoji-btn"
            onClick={() => handleAddEmoji(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Khung nhập tin nhắn */}
      <form noValidate onSubmit={handleSend} className="chatbox-input-row">
        <input
          type="text"
          className="chatbox-text-input"
          placeholder={`Nhắn tin cho ${otherUser.name}...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button
          type="submit"
          className="chatbox-send-btn"
          disabled={sending || !inputText.trim()}
          title="Gửi tin nhắn (Enter)"
        >
          {sending ? '...' : 'Gửi'}
        </button>
      </form>
    </div>
  );
};

