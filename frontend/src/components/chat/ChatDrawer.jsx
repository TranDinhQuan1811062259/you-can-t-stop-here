import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chatService';
import { formatDate } from '../../utils/formatDate';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const ChatDrawer = () => {
  const {
    isDrawerOpen,
    closeDrawer,
    activeTab,
    setActiveTab,
    sortBy,
    setSortBy,
    openChatWithUser,
    allowStrangerNotifications,
    toggleStrangerNotifications,
    handleRemoveFriend,
  } = useChat();
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    if (activeTab === 'messages') {
      chatService
        .getConversations({ sortBy, q: searchQuery })
        .then((res) => {
          setConversations(res.data || []);
        })
        .catch((err) => console.warn('Lỗi tải cuộc trò chuyện:', err))
        .finally(() => setLoading(false));
    } else {
      chatService
        .getFriends({ sortBy, q: searchQuery })
        .then((res) => {
          setFriends(res.data || []);
        })
        .catch((err) => console.warn('Lỗi tải danh bạ:', err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    if (isDrawerOpen) {
      fetchData();
    }
  }, [isDrawerOpen, activeTab, sortBy, searchQuery]);

  if (!isDrawerOpen) return null;

  return (
    <div className="chat-drawer-backdrop" onClick={closeDrawer}>
      <div className="chat-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header Drawer */}
        <div className="chat-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>💬</span>
            <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--bg-dark)' }}>
              Tin Nhắn & Danh Bạ
            </h3>
          </div>
          <button className="chat-drawer-close-btn" onClick={closeDrawer} title="Đóng danh sách">
            ✕
          </button>
        </div>

        {/* Cài đặt nhận thông báo từ người lạ */}
        <div className="stranger-settings-bar">
          <div className="stranger-settings-info">
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              🔔 Thông báo từ người lạ:
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {allowStrangerNotifications
                ? 'Đang bật (Nhận thông báo khi có người lạ nhắn tin)'
                : 'Đang tắt (Chỉ xem khi thấy tin nhắn hiện đầu danh sách)'}
            </span>
          </div>
          <button
            type="button"
            className={`settings-toggle-btn ${allowStrangerNotifications ? 'active' : ''}`}
            onClick={toggleStrangerNotifications}
            title="Bấm để bật hoặc tắt thông báo từ người lạ"
          >
            {allowStrangerNotifications ? 'BẬT' : 'TẮT'}
          </button>
        </div>

        {/* Tab Switcher: Tin nhắn & Danh bạ */}
        <div className="chat-tabs-bar">
          <button
            type="button"
            className={`chat-tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            💬 Trò chuyện ({conversations.length})
          </button>
          <button
            type="button"
            className={`chat-tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            👥 Danh bạ bạn bè ({friends.length})
          </button>
        </div>

        {/* Thanh công cụ: Sắp xếp & Tìm kiếm */}
        <div className="chat-toolbar">
          <div className="chat-sort-group">
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sắp xếp:</span>
            <select
              className="chat-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="recent">🕒 Gần nhất (Mới nhắn lên đầu)</option>
              <option value="alphabet">🔤 Theo chữ cái (Alpha B)</option>
              <option value="frequency">🔥 Mức độ nhắn tin (Nhiều nhất)</option>
            </select>
          </div>

          <div className="chat-search-input-wrap">
            <input
              type="text"
              className="chat-search-input"
              placeholder={activeTab === 'messages' ? 'Tìm cuộc trò chuyện...' : 'Tìm bạn bè theo tên...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Danh sách nội dung */}
        <div className="chat-drawer-body">
          {loading ? (
            <div style={{ padding: '30px 0' }}>
              <LoadingSpinner message="Đang tải dữ liệu..." />
            </div>
          ) : activeTab === 'messages' ? (
            /* TAB 1: DANH SÁCH CUỘC TRÒ CHUYỆN */
            conversations.length === 0 ? (
              <div className="chat-empty-state">
                <span style={{ fontSize: '2rem' }}>💌</span>
                <p>Chưa có cuộc trò chuyện nào.</p>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Bạn có thể nhắn tin với người khác từ phần bình luận hoặc trong danh bạ bạn bè!
                </span>
              </div>
            ) : (
              <div className="conversations-list">
                {conversations.map((c) => {
                  const other = c.otherUser || {};
                  const isPendingStranger = c.isStranger && c.status === 'pending';

                  return (
                    <div
                      key={c._id}
                      className={`conversation-item ${c.unreadCount > 0 ? 'unread' : ''}`}
                      onClick={() => openChatWithUser(other)}
                    >
                      <div className="conv-avatar-wrap">
                        <img
                          src={other.avatar || '/images/man.jpg'}
                          alt={other.name}
                          className="conv-avatar"
                        />
                        {other.isFriend && <span className="friend-dot-badge" title="Bạn bè">✓</span>}
                      </div>

                      <div className="conv-info">
                        <div className="conv-top-line">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong className="conv-user-name">{other.name}</strong>
                            {other.isFriend ? (
                              <span className="badge-friend-tag">Bạn bè</span>
                            ) : (
                              <span className="badge-stranger-tag">
                                {isPendingStranger ? 'Người lạ (Chờ duyệt)' : 'Người lạ'}
                              </span>
                            )}
                          </div>
                          <span className="conv-time">
                            {c.lastMessage ? formatDate(c.lastMessage.createdAt) : ''}
                          </span>
                        </div>

                        <div className="conv-bottom-line">
                          <p className="conv-last-msg">
                            {c.lastMessage?.content || 'Bắt đầu cuộc trò chuyện...'}
                          </p>
                          {c.totalMessagesCount > 0 && (
                            <span className="conv-msg-count" title="Tổng số tin nhắn">
                              💬 {c.totalMessagesCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            /* TAB 2: DANH BẠ BẠN BÈ */
            friends.length === 0 ? (
              <div className="chat-empty-state">
                <span style={{ fontSize: '2rem' }}>👥</span>
                <p>Chưa có bạn bè nào trong danh bạ.</p>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Hãy bấm nút "Kết bạn" ở các bài viết hoặc bình luận để thêm họ vào danh bạ của bạn nhé!
                </span>
              </div>
            ) : (
              <div className="friends-list">
                {friends.map((f) => (
                  <div key={f._id} className="friend-item">
                    <Link
                      to={`/profile/${f._id}`}
                      onClick={closeDrawer}
                      style={{ textDecoration: 'none' }}
                      title={`Xem trang cá nhân của ${f.name}`}
                    >
                      <img
                        src={f.avatar || '/images/man.jpg'}
                        alt={f.name}
                        className="friend-avatar"
                      />
                    </Link>
                    <div className="friend-info">
                      <Link
                        to={`/profile/${f._id}`}
                        onClick={closeDrawer}
                        style={{ textDecoration: 'none', color: 'inherit' }}
                        title={`Xem trang cá nhân của ${f.name}`}
                      >
                        <strong className="friend-name">{f.name}</strong>
                      </Link>
                      <span className="friend-job">{f.jobTitle || 'Thành viên'}</span>
                      {f.totalMessagesCount > 0 && (
                        <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>
                          💬 Đã trao đổi {f.totalMessagesCount} tin nhắn
                        </span>
                      )}
                    </div>
                    <div className="friend-actions">
                      <Link
                        to={`/profile/${f._id}`}
                        className="friend-chat-btn"
                        style={{ textDecoration: 'none', background: '#f1f5f9', color: '#334155' }}
                        onClick={closeDrawer}
                        title="Xem trang cá nhân"
                      >
                        👤 Hồ sơ
                      </Link>
                      <button
                        type="button"
                        className="friend-chat-btn"
                        onClick={() => openChatWithUser(f)}
                        title="Nhắn tin với người này"
                      >
                        💬 Chat
                      </button>
                      <button
                        type="button"
                        className="friend-remove-btn"
                        onClick={async () => {
                          if (window.confirm(`Bạn có chắc muốn xóa ${f.name} khỏi danh bạ bạn bè?`)) {
                            await handleRemoveFriend(f._id);
                            fetchData();
                          }
                        }}
                        title="Xóa khỏi danh bạ bạn bè"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

