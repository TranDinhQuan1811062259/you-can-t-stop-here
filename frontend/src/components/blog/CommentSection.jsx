import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { commentService } from '../../services/commentService';
import { formatDate } from '../../utils/formatDate';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { maskSensitiveText } from '../../utils/sensitiveFilter';
import { AsmrKeyboardToggle } from '../common/AsmrKeyboardToggle';

const CHEER_TYPES = [
  { id: 'encourage', label: '💪 Cố lên nhé' },
  { id: 'hug', label: '🫂 Gửi cái ôm' },
  { id: 'advice', label: '💡 Lời khuyên' },
  { id: 'general', label: '💬 Đồng cảm' },
];

const CURATED_GIFS = [
  { id: 'hug', label: '🫂 Gửi cái ôm ấm áp', url: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif' },
  { id: 'heart', label: '❤️ Thả tim yêu thương', url: 'https://media.giphy.com/media/M90mJvfWfd5mbUuULX/giphy.gif' },
  { id: 'cheer', label: '💪 Bạn đã làm rất tốt', url: 'https://media.giphy.com/media/3oEdv4hwWTzBhWvaU0/giphy.gif' },
  { id: 'peace', label: '🐱 Mèo vỗ về bình yên', url: 'https://media.giphy.com/media/ICOgUNjpvO0PC/giphy.gif' },
  { id: 'coffee', label: '☕ Tách cafe thư giãn', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
  { id: 'flower', label: '🌸 Đóa hoa chữa lành', url: 'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif' },
  { id: 'highfive', label: '🙌 High five tiếp sức', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: 'sparkles', label: '✨ Tỏa sáng ngày mới', url: 'https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif' },
];

export const CommentSection = ({
  postId,
  postAuthorName,
  allowComments = true,
  isAuthor = false,
  onToggleAllowComments,
}) => {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const { openChatWithUser, handleAddFriend, friendsList } = useChat();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [selectedCheerType, setSelectedCheerType] = useState('encourage');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Trạng thái trả lời (Reply / Tagging kiểu Facebook)
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, userName }
  const textareaRef = useRef(null);

  // Trạng thái đính kèm ảnh động GIF trong bình luận
  const [attachedGif, setAttachedGif] = useState('');
  const [showGifPicker, setShowGifPicker] = useState(false);
  const commentGifInputRef = useRef(null);
  const gifPickerRef = useRef(null);

  // Đóng bảng chọn GIF khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (gifPickerRef.current && !gifPickerRef.current.contains(e.target)) {
        setShowGifPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGifUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedGif(ev.target?.result);
      setShowGifPicker(false);
    };
    reader.readAsDataURL(file);
  };

  const fetchComments = () => {
    commentService
      .getCommentsByPost(postId)
      .then((res) => {
        setComments(res.data || []);
      })
      .catch((err) => {
        console.warn('Lỗi tải bình luận:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (postId) {
      setLoading(true);
      fetchComments();
    }
  }, [postId]);

  const handleStartReply = (commentId, targetUserName) => {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    setReplyingTo({ commentId, userName: targetUserName });
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleLikeComment = async (commentId) => {
    try {
      const res = await commentService.likeComment(commentId);
      const newLikes = res.data?.likesCount || 1;

      setComments((prev) =>
        prev.map((c) => {
          if (c._id === commentId) {
            return { ...c, likesCount: newLikes };
          }
          if (c.replies && c.replies.length > 0) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r._id === commentId ? { ...r, likesCount: newLikes } : r
              ),
            };
          }
          return c;
        })
      );
    } catch (err) {
      console.warn('Lỗi thích bình luận:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newContent.trim() && !attachedGif) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const cleanComment = maskSensitiveText(newContent.trim());
      const payload = {
        content: cleanComment || '❤️ [Ảnh động GIF]',
        gifUrl: attachedGif || '',
        cheerType: selectedCheerType,
        parentComment: replyingTo ? replyingTo.commentId : null,
        replyToUser: replyingTo ? replyingTo.userName : null,
      };

      await commentService.createComment(postId, payload);
      setNewContent('');
      setAttachedGif('');
      setShowGifPicker(false);
      setReplyingTo(null);
      fetchComments();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể gửi bình luận lúc này.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa lời nhắn này?')) return;
    try {
      await commentService.deleteComment(commentId);
      fetchComments();
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa bình luận');
    }
  };

  // Tính tổng số lượng bình luận và phản hồi
  const totalCommentsCount = comments.reduce(
    (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
    0
  );

  return (
    <div className="comment-section-box">
      <div className="comment-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <span>💬 Lời Động Viên & Trò Chuyện ({totalCommentsCount})</span>
            {!allowComments && (
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                }}
              >
                🔒 Đã khóa
              </span>
            )}
          </h3>
          <p className="section-subtitle">
            Một lời nói tử tế có thể thắp sáng cả một ngày u tối của ai đó. Bạn có thể trò chuyện và trả lời nhau tại đây.
          </p>
        </div>

        {/* Nút dành cho Tác giả / Admin: Bật hoặc Tắt bình luận */}
        {isAuthor && onToggleAllowComments && (
          <button
            type="button"
            onClick={onToggleAllowComments}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 15px',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: allowComments ? '1.5px solid #cbd5e1' : '1.5px solid #10b981',
              background: allowComments ? '#f8fafc' : '#ecfdf5',
              color: allowComments ? '#334155' : '#047857',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'all 0.2s ease',
            }}
            title={allowComments ? 'Bấm để tắt tính năng bình luận cho bài viết này' : 'Bấm để mở lại tính năng bình luận'}
          >
            <span>{allowComments ? '🔒 Tắt bình luận' : '🔓 Mở lại bình luận'}</span>
          </button>
        )}
      </div>

      {/* Form gửi bình luận / Trả lời hoặc Thông báo khóa bình luận */}
      {!allowComments ? (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.95))',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '22px 20px',
            textAlign: 'center',
            marginBottom: '26px',
            boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🔒</div>
          <h4 style={{ margin: '0 0 6px', color: '#0f172a', fontSize: '1.02rem', fontWeight: 800 }}>
            Tính năng bình luận đã bị tắt bởi tác giả
          </h4>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5 }}>
            Tác giả đã tạm khóa mục bình luận cho bài viết này. Các lời chia sẻ trước đó (nếu có) vẫn được lưu giữ an toàn bên dưới.
          </p>
          {isAuthor && onToggleAllowComments && (
            <button
              type="button"
              onClick={onToggleAllowComments}
              style={{
                marginTop: '14px',
                padding: '8px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.3)',
              }}
            >
              🔓 Bấm vào đây để mở lại tính năng bình luận
            </button>
          )}
        </div>
      ) : isAuthenticated ? (
        <form onSubmit={handleSubmit} className="comment-form">
          {errorMsg && <div className="modal-error">{errorMsg}</div>}

          {/* Banner báo đang trả lời người khác (Facebook Style) */}
          {replyingTo && (
            <div className="replying-banner">
              <span>
                ↩️ Đang trả lời <strong>@{replyingTo.userName}</strong>:
              </span>
              <button
                type="button"
                className="cancel-reply-btn"
                onClick={handleCancelReply}
                title="Hủy trả lời"
              >
                ✕ Hủy
              </button>
            </div>
          )}

          {/* Chọn loại tương tác/cảm xúc (chỉ hiển thị khi bình luận gốc) */}
          {!replyingTo && (
            <div className="cheer-type-selector">
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tâm thế gửi gắm:</span>
              <div className="cheer-pills">
                {CHEER_TYPES.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className={`cheer-pill-btn ${selectedCheerType === t.id ? 'active' : ''}`}
                    onClick={() => setSelectedCheerType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="comment-input-wrap">
            <img
              src={user?.avatar || '/images/man.jpg'}
              alt={user?.name}
              className="comment-author-avatar"
            />
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <textarea
                ref={textareaRef}
                className="comment-textarea"
                placeholder={
                  replyingTo
                    ? `Nhập câu trả lời gửi đến @${replyingTo.userName}...`
                    : `Bạn muốn nhắn gửi lời động viên hay chia sẻ gì tới tác giả bài viết này?`
                }
                rows={3}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />

              {/* Xem trước GIF đang đính kèm */}
              {attachedGif && (
                <div className="comment-attached-preview-box">
                  <img src={attachedGif} alt="GIF đính kèm" className="comment-preview-gif-img" />
                  <button
                    type="button"
                    className="remove-gif-btn"
                    onClick={() => setAttachedGif('')}
                    title="Xóa GIF đính kèm"
                  >
                    ✕ Hủy GIF
                  </button>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div className="comment-toolbar-left" ref={gifPickerRef} style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`comment-gif-trigger-btn ${showGifPicker ? 'active' : ''}`}
                onClick={() => setShowGifPicker(!showGifPicker)}
                title="Chèn ảnh động GIF vào bình luận"
              >
                🎬 Thêm GIF
              </button>

              <button
                type="button"
                className="comment-gif-upload-btn"
                onClick={() => commentGifInputRef.current?.click()}
                title="Tải file GIF từ máy tính của bạn"
              >
                📁 Tải GIF máy
              </button>
              <input
                type="file"
                ref={commentGifInputRef}
                accept="image/*,.gif"
                style={{ display: 'none' }}
                onChange={handleGifUpload}
              />

              {/* ASMR Phím Cơ Toggle */}
              <AsmrKeyboardToggle variant="badge" />

              {/* Bảng chọn GIF động */}
              {showGifPicker && (
                <div className="comment-gif-picker-popover">
                  <div className="gif-picker-title">Chọn GIF động chữa lành & động viên:</div>
                  <div className="gif-grid">
                    {CURATED_GIFS.map((g) => (
                      <div
                        key={g.id}
                        className="gif-grid-item"
                        onClick={() => {
                          setAttachedGif(g.url);
                          setShowGifPicker(false);
                        }}
                        title={g.label}
                      >
                        <img src={g.url} alt={g.label} loading="lazy" />
                        <span className="gif-item-label">{g.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="comment-submit-btn"
              disabled={submitting || (!newContent.trim() && !attachedGif)}
            >
              {submitting ? 'Đang gửi...' : replyingTo ? 'Gửi Câu Trả Lời 💬' : 'Gửi Lời Động Viên ✨'}
            </button>
          </div>
        </form>
      ) : (
        <div className="guest-cta-banner">
          <p>
            Bạn có câu chuyện tương tự hoặc muốn gửi lời động viên chân thành tới người viết?
          </p>
          <button
            type="button"
            className="guest-login-btn"
            onClick={openLoginModal}
          >
            Đăng Nhập Hoặc Tạo Tài Khoản Để Bình Luận
          </button>
        </div>
      )}

      {/* Danh sách các bình luận và phản hồi */}
      {loading ? (
        <LoadingSpinner message="Đang tải lời nhắn của cộng đồng..." />
      ) : comments.length === 0 ? (
        <div className="empty-comments">
          <p>Chưa có lời nhắn nào. Hãy là người đầu tiên gửi lời động viên nhé!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((c) => {
            const cheerObj = CHEER_TYPES.find((t) => t.id === c.cheerType);
            const isOwner = user && user._id === c.user?._id;
            const canDelete = isOwner || user?.role === 'admin';
            const isPostAuthor = postAuthorName && c.user?.name === postAuthorName;

            return (
              <div key={c._id} className="comment-card-wrapper">
                <div className="comment-card">
                  <Link
                    to={`/profile/${c.user?._id || encodeURIComponent(c.user?.name || 'user')}`}
                    title={`Xem trang cá nhân của ${c.user?.name || 'người dùng'}`}
                  >
                    <img
                      src={c.user?.avatar || '/images/man.jpg'}
                      alt={c.user?.name}
                      className="comment-avatar"
                    />
                  </Link>
                  <div className="comment-body-wrap">
                    <div className="comment-top-row">
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <Link
                          to={`/profile/${c.user?._id || encodeURIComponent(c.user?.name || 'user')}`}
                          style={{ textDecoration: 'none' }}
                          title={`Xem trang cá nhân của ${c.user?.name || 'người dùng'}`}
                        >
                          <span className="comment-user-name">
                            {c.user?.name || 'Thành viên'}
                          </span>
                        </Link>

                        {isPostAuthor && (
                          <span className="post-author-badge-tag">
                            👑 Tác giả bài viết
                          </span>
                        )}

                        {c.user?.role === 'admin' && (
                          <span className="admin-badge-small">
                            ADMIN
                          </span>
                        )}

                        {c.user?.jobTitle && (
                          <span className="comment-user-job">
                            • {c.user.jobTitle}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cheerObj && (
                          <span className="comment-cheer-tag">
                            {cheerObj.label}
                          </span>
                        )}
                        <span className="comment-time">
                          {formatDate(c.createdAt)}
                        </span>
                        {canDelete && (
                          <button
                            type="button"
                            className="comment-del-btn"
                            onClick={() => handleDelete(c._id)}
                            title="Xóa bình luận"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="comment-text">{c.content}</p>

                    {c.gifUrl && (
                      <div className="comment-attached-gif-wrap">
                        <img
                          src={c.gifUrl}
                          alt="GIF đính kèm"
                          className="comment-attached-gif-img"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Hàng tương tác dưới bình luận (Thích, Trả lời, Nhắn tin, Kết bạn) */}
                    <div className="comment-actions-row">
                      <button
                        type="button"
                        className="comment-action-link"
                        onClick={() => handleLikeComment(c._id)}
                      >
                        ❤️ Thích {c.likesCount > 0 ? `(${c.likesCount})` : ''}
                      </button>
                      <button
                        type="button"
                        className="comment-action-link"
                        onClick={() => handleStartReply(c._id, c.user?.name || 'bạn')}
                      >
                        💬 Trả lời
                      </button>
                      {isAuthenticated && !isOwner && c.user && (
                        <>
                          <button
                            type="button"
                            className="comment-action-link chat-link"
                            onClick={() => openChatWithUser(c.user)}
                            title={`Nhắn tin với ${c.user.name}`}
                          >
                            ✉️ Nhắn tin
                          </button>
                          {friendsList.some((f) => f._id === c.user._id) ? (
                            <span className="comment-friend-badge">✓ Bạn bè</span>
                          ) : (
                            <button
                              type="button"
                              className="comment-action-link friend-link"
                              onClick={async () => {
                                await handleAddFriend(c.user._id);
                                alert(`Đã kết bạn với ${c.user.name}!`);
                              }}
                              title={`Kết bạn với ${c.user.name}`}
                            >
                              🤝 Kết bạn
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Danh sách các câu trả lời (Replies / Thread kiểu Facebook) */}
                {c.replies && c.replies.length > 0 && (
                  <div className="comment-replies-list">
                    {c.replies.map((reply) => {
                      const isReplyOwner = user && user._id === reply.user?._id;
                      const canDeleteReply = isReplyOwner || user?.role === 'admin';
                      const isReplyAuthor = postAuthorName && reply.user?.name === postAuthorName;

                      return (
                        <div key={reply._id} className="comment-reply-item">
                          <img
                            src={reply.user?.avatar || '/images/man.jpg'}
                            alt={reply.user?.name}
                            className="reply-avatar"
                          />
                          <div className="reply-body-wrap">
                            <div className="comment-top-row">
                              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                <span className="comment-user-name" style={{ fontSize: '0.9rem' }}>
                                  {reply.user?.name || 'Thành viên'}
                                </span>

                                {isReplyAuthor && (
                                  <span className="post-author-badge-tag">
                                    👑 Tác giả
                                  </span>
                                )}

                                {reply.user?.jobTitle && (
                                  <span className="comment-user-job" style={{ fontSize: '0.78rem' }}>
                                    • {reply.user.jobTitle}
                                  </span>
                                )}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="comment-time" style={{ fontSize: '0.75rem' }}>
                                  {formatDate(reply.createdAt)}
                                </span>
                                {canDeleteReply && (
                                  <button
                                    type="button"
                                    className="comment-del-btn"
                                    onClick={() => handleDelete(reply._id)}
                                    title="Xóa câu trả lời"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="comment-text" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                              {reply.replyToUser && (
                                <span className="reply-mention-tag">
                                  @{reply.replyToUser}{' '}
                                </span>
                              )}
                              {reply.content}
                            </p>

                            {reply.gifUrl && (
                              <div className="comment-attached-gif-wrap reply-gif">
                                <img
                                  src={reply.gifUrl}
                                  alt="GIF câu trả lời"
                                  className="comment-attached-gif-img"
                                  loading="lazy"
                                />
                              </div>
                            )}

                            <div className="comment-actions-row">
                              <button
                                type="button"
                                className="comment-action-link"
                                onClick={() => handleLikeComment(reply._id)}
                              >
                                ❤️ Thích {reply.likesCount > 0 ? `(${reply.likesCount})` : ''}
                              </button>
                              <button
                                type="button"
                                className="comment-action-link"
                                onClick={() => handleStartReply(c._id, reply.user?.name || 'bạn')}
                              >
                                💬 Trả lời
                              </button>
                              {isAuthenticated && !isReplyOwner && reply.user && (
                                <>
                                  <button
                                    type="button"
                                    className="comment-action-link chat-link"
                                    onClick={() => openChatWithUser(reply.user)}
                                    title={`Nhắn tin với ${reply.user.name}`}
                                  >
                                    ✉️ Nhắn tin
                                  </button>
                                  {friendsList.some((f) => f._id === reply.user._id) ? (
                                    <span className="comment-friend-badge">✓ Bạn bè</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="comment-action-link friend-link"
                                      onClick={async () => {
                                        await handleAddFriend(reply.user._id);
                                        alert(`Đã kết bạn với ${reply.user.name}!`);
                                      }}
                                      title={`Kết bạn với ${reply.user.name}`}
                                    >
                                      🤝 Kết bạn
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
