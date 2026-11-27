import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';
import { useChat } from '../../context/ChatContext';
import { formatDate } from '../../utils/formatDate';

const DEFAULT_EMPTY_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";
const getSafeAvatar = (av) => (av && !av.includes('man.jpg') && !av.includes('google_avatar')) ? av : DEFAULT_EMPTY_AVATAR;

export const NotificationDropdown = ({
  isOpen,
  onClose,
  unreadCount,
  onUnreadChange,
}) => {
  const navigate = useNavigate();
  const { openChatWithUser, fetchFriends } = useChat();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'friend' | 'message' | 'interaction'
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({
    unreadCount: 0,
    friendCount: 0,
    messageCount: 0,
    interactionCount: 0,
  });

  const dropdownRef = useRef(null);

  // Lấy số lượng đếm thông báo
  const fetchCounts = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      if (res?.data) {
        setCounts(res.data);
        if (typeof onUnreadChange === 'function') {
          onUnreadChange(res.data.unreadCount || 0);
        }
      }
    } catch (_) {}
  };

  // Lấy danh sách thông báo theo tab
  const fetchList = async (tab = activeTab) => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({ type: tab });
      setNotifications(res?.data || []);
    } catch (err) {
      console.warn('Lỗi tải thông báo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchList(activeTab);
    fetchCounts();

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchCounts();
    }, 45000);

    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  // Click outside để đóng
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen, onClose]);

  // Đánh dấu 1 thông báo đã đọc
  const handleItemClick = async (notif) => {
    if (!notif.isRead) {
      try {
        await notificationService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        fetchCounts();
      } catch (_) {}
    }

    // Điều hướng theo loại thông báo
    if (notif.type === 'message' || notif.type === 'friend_accept') {
      onClose();
      openChatWithUser(notif.sender);
    } else if (notif.post?.slug) {
      onClose();
      navigate(`/post/${notif.post.slug}`);
    } else if (notif.type === 'friend_request' && notif.sender?._id) {
      // Giữ mở để người dùng bấm chấp nhận
    }
  };

  // Đánh dấu tất cả đã đọc
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      fetchCounts();
    } catch (_) {}
  };

  // Xóa toàn bộ
  const handleClearAll = async () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) {
      try {
        await notificationService.clearAllNotifications();
        setNotifications([]);
        fetchCounts();
      } catch (_) {}
    }
  };

  // Phản hồi kết bạn
  const handleRespondFriend = async (e, notifId, action) => {
    e.stopPropagation();
    try {
      const res = await notificationService.respondToFriendRequest(notifId, action);
      const newStatus = res?.data?.actionStatus || action;

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notifId
            ? { ...n, actionStatus: newStatus, isRead: true }
            : n
        )
      );

      if (action === 'accept') {
        if (typeof fetchFriends === 'function') fetchFriends();
      }
      fetchCounts();
    } catch (err) {
      alert(err.message || 'Lỗi thao tác');
    }
  };

  if (!isOpen) return null;

  const getTypeIcon = (type, reactionType) => {
    if (type === 'friend_request') return '👥';
    if (type === 'friend_accept') return '🎉';
    if (type === 'message') return '💬';
    if (type === 'reaction') {
      if (reactionType === 'love') return '❤️';
      if (reactionType === 'sympathy') return '🤗';
      if (reactionType === 'stop') return '🛑';
      if (reactionType === 'encourage') return '🌱';
      return '❤️';
    }
    if (type === 'comment') return '💭';
    if (type === 'share') return '🔄';
    return '🔔';
  };

  return (
    <div className="header-notifications-dropdown" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      {/* Header Dropdown */}
      <div className="notif-dropdown-header">
        <div className="notif-header-title-box">
          <span className="notif-header-icon">🔔</span>
          <h3 className="notif-header-title">Thông Báo</h3>
          {counts.unreadCount > 0 && (
            <span className="notif-unread-badge">{counts.unreadCount} mới</span>
          )}
        </div>

        <div className="notif-header-actions">
          {counts.unreadCount > 0 && (
            <button
              type="button"
              className="notif-action-btn read-all"
              onClick={handleMarkAllRead}
              title="Đánh dấu tất cả thông báo là đã đọc"
            >
              ✓✓ Đã đọc
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              className="notif-action-btn clear-all"
              onClick={handleClearAll}
              title="Xóa tất cả thông báo"
            >
              🗑️
            </button>
          )}
          <button type="button" className="notif-close-btn" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="notif-filter-tabs">
        <button
          type="button"
          className={`notif-tab-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          Tất cả
        </button>
        <button
          type="button"
          className={`notif-tab-item ${activeTab === 'friend' ? 'active' : ''}`}
          onClick={() => setActiveTab('friend')}
        >
          <span>👥 Kết bạn</span>
          {counts.friendCount > 0 && <span className="tab-pill-count">{counts.friendCount}</span>}
        </button>
        <button
          type="button"
          className={`notif-tab-item ${activeTab === 'message' ? 'active' : ''}`}
          onClick={() => setActiveTab('message')}
        >
          <span>💬 Tin nhắn</span>
          {counts.messageCount > 0 && <span className="tab-pill-count">{counts.messageCount}</span>}
        </button>
        <button
          type="button"
          className={`notif-tab-item ${activeTab === 'interaction' ? 'active' : ''}`}
          onClick={() => setActiveTab('interaction')}
        >
          <span>❤️ Tương tác</span>
          {counts.interactionCount > 0 && <span className="tab-pill-count">{counts.interactionCount}</span>}
        </button>
      </div>

      {/* Notifications List Stream */}
      <div className="notif-list-stream">
        {loading ? (
          <div className="notif-loading-box">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>Đang tải thông báo...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty-state">
            <span className="notif-empty-icon">
              {activeTab === 'friend' ? '👥' : activeTab === 'message' ? '💬' : activeTab === 'interaction' ? '✨' : '🍃'}
            </span>
            <p className="notif-empty-text">
              {activeTab === 'friend'
                ? 'Không có lời mời kết bạn nào đang chờ.'
                : activeTab === 'message'
                ? 'Chưa có thông báo tin nhắn mới.'
                : activeTab === 'interaction'
                ? 'Chưa có tương tác mới nào trên bài viết của bạn.'
                : 'Bạn chưa có thông báo mới nào.'}
            </p>
            <small>Mọi tương tác, tin nhắn và lời mời kết bạn sẽ hiển thị tại đây.</small>
          </div>
        ) : (
          notifications.map((n) => {
            const isFriendReq = n.type === 'friend_request';
            const iconBadge = getTypeIcon(n.type, n.reactionType);

            return (
              <div
                key={n._id}
                className={`notif-card-item ${!n.isRead ? 'unread' : 'read'} type-${n.type}`}
                onClick={() => handleItemClick(n)}
              >
                {/* Avatar + Badge Icon */}
                <div className="notif-avatar-wrapper">
                  <img
                    src={getSafeAvatar(n.sender?.avatar)}
                    alt={n.sender?.name}
                    className="notif-sender-avatar"
                  />
                  <span className="notif-type-badge-icon" title={n.type}>
                    {iconBadge}
                  </span>
                </div>

                {/* Content */}
                <div className="notif-content-wrapper">
                  <div className="notif-message-row">
                    <strong className="notif-sender-name">{n.sender?.name}</strong>{' '}
                    <span className="notif-message-text">{n.message}</span>
                  </div>

                  {/* Thumbnail bài viết nếu có */}
                  {n.post?.title && (
                    <div className="notif-post-preview">
                      <span className="notif-post-icon">📝</span>
                      <span className="notif-post-title">"{n.post.title}"</span>
                    </div>
                  )}

                  {/* Cụm nút chấp nhận / từ chối nếu là lời mời kết bạn */}
                  {isFriendReq && (
                    <div className="notif-friend-actions-bar" onClick={(e) => e.stopPropagation()}>
                      {n.actionStatus === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="notif-friend-btn accept"
                            onClick={(e) => handleRespondFriend(e, n._id, 'accept')}
                            title="Chấp nhận kết bạn và thêm vào danh bạ"
                          >
                            ✓ Đồng ý
                          </button>
                          <button
                            type="button"
                            className="notif-friend-btn decline"
                            onClick={(e) => handleRespondFriend(e, n._id, 'decline')}
                            title="Từ chối lời mời"
                          >
                            ✕ Bỏ qua
                          </button>
                        </>
                      ) : n.actionStatus === 'accepted' ? (
                        <span className="notif-friend-status-badge accepted">
                          ✓ Đã trở thành bạn bè
                        </span>
                      ) : (
                        <span className="notif-friend-status-badge declined">
                          Đã từ chối lời mời
                        </span>
                      )}
                    </div>
                  )}

                  {/* Nút trả lời tin nhắn */}
                  {n.type === 'message' && (
                    <div className="notif-quick-actions-bar" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="notif-reply-btn"
                        onClick={() => {
                          onClose();
                          openChatWithUser(n.sender);
                        }}
                      >
                        💬 Mở chat & Trả lời
                      </button>
                    </div>
                  )}

                  <span className="notif-time-ago">{formatDate(n.createdAt)}</span>
                </div>

                {/* Dot unread */}
                {!n.isRead && <span className="notif-unread-dot" title="Chưa đọc" />}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="notif-dropdown-footer">
        <span>✨ Tự động cập nhật thông báo thời gian thực</span>
      </div>
    </div>
  );
};
