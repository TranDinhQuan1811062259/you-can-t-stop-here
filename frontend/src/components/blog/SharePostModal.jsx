import React, { useState } from 'react';
import { postService } from '../../services/postService';
import { useAuth } from '../../context/AuthContext';
import { playClickSound } from '../../utils/soundEffects';

export const SharePostModal = ({ isOpen, onClose, post, onShareSuccess }) => {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const [copySuccess, setCopySuccess] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !post) return null;

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/post/${post.slug}`
    : `https://freedom-web.vn/post/${post.slug}`;
  const shareTitle = `${post.title} - Tâm sự trên You Can't Stop Here`;

  // 1. Sao chép liên kết vào Clipboard
  const handleCopyLink = async () => {
    playClickSound();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement('input');
        input.value = currentUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
      postService.sharePost(post._id || post.slug).catch(() => {});
    } catch (err) {
      alert('Không thể sao chép liên kết, vui lòng sao chép thủ công!');
    }
  };

  // 2. Chia sẻ lên trang cá nhân (Repost to Profile)
  const handleRepostToProfile = async () => {
    playClickSound();
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    setReposting(true);
    setErrorMsg('');
    try {
      await postService.repostPost(post._id || post.slug);
      setReposted(true);
      if (onShareSuccess) onShareSuccess();
      window.dispatchEvent(new Event('post_updated'));
      setTimeout(() => {
        setReposted(false);
        onClose();
      }, 1800);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Không thể chia sẻ bài viết về trang cá nhân');
    } finally {
      setReposting(false);
    }
  };

  // 3. Mở cửa sổ chia sẻ mạng xã hội
  const openShareWindow = (url) => {
    playClickSound();
    postService.sharePost(post._id || post.slug).catch(() => {});
    window.open(url, '_blank', 'noopener,noreferrer,width=620,height=580');
  };

  const handleShareFacebook = () => {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`);
  };

  const handleShareTwitter = () => {
    openShareWindow(`https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareTitle)}`);
  };

  const handleShareTelegram = () => {
    openShareWindow(`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareTitle)}`);
  };

  const handleShareLinkedIn = () => {
    openShareWindow(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`);
  };

  return (
    <div className="sub-modal-overlay" onClick={onClose}>
      <div className="sub-modal-box share-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>💌</span>
            <h4 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>
              Chia Sẻ Bài Tâm Sự
            </h4>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Khung xem trước tóm tắt bài viết */}
        <div className="share-preview-card">
          {post.coverImage && (
            <img src={post.coverImage} alt={post.title} className="share-preview-thumb" />
          )}
          <div className="share-preview-info">
            <span className="share-preview-author">Tác giả: {post.author || 'Thành viên'}</span>
            <h5 className="share-preview-title">{post.title}</h5>
            <p className="share-preview-summary">{post.summary}</p>
          </div>
        </div>

        {errorMsg && (
          <div className="share-error-alert">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* CÁCH 1: CHIA SẺ VỀ TRANG CÁ NHÂN CỦA BẠN (REPOST) */}
        <div className="share-section">
          <span className="share-section-title">🌟 Cách 1: Chia sẻ lên Trang Cá Nhân</span>
          <p className="share-section-desc">
            Lưu bài viết này vào mục đã chia sẻ trên tường cá nhân của bạn để bạn bè cùng đọc và thấu hiểu:
          </p>
          <button
            type="button"
            className={`share-repost-btn ${reposted ? 'is-success' : ''}`}
            onClick={handleRepostToProfile}
            disabled={reposting || reposted}
          >
            <span className="repost-icon">{reposted ? '✓' : '🔄'}</span>
            <span>
              {reposted
                ? 'Đã chia sẻ lên trang cá nhân của bạn!'
                : reposting
                ? 'Đang chia sẻ...'
                : 'Chia sẻ về Trang Cá Nhân của tôi'}
            </span>
          </button>
        </div>

        {/* CÁCH 2: SAO CHÉP LIÊN KẾT & CHIA SẺ RA MẠNG XÃ HỘI */}
        <div className="share-section" style={{ marginTop: '16px' }}>
          <span className="share-section-title">🌐 Cách 2: Chia sẻ ra Mạng Xã Hội & Bạn Bè</span>

          {/* Ô Copy Link */}
          <div className="share-copy-box">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="share-link-input"
              onClick={(e) => e.target.select()}
            />
            <button
              type="button"
              className={`share-copy-btn ${copySuccess ? 'is-copied' : ''}`}
              onClick={handleCopyLink}
            >
              {copySuccess ? '✓ Đã chép link' : '📋 Sao chép link'}
            </button>
          </div>

          {/* Các nút mạng xã hội */}
          <div className="share-social-grid">
            <button
              type="button"
              className="social-share-pill share-fb"
              onClick={handleShareFacebook}
              title="Chia sẻ lên Facebook cá nhân hoặc nhóm"
            >
              <span className="social-icon">📘</span>
              <span>Facebook</span>
            </button>

            <button
              type="button"
              className="social-share-pill share-x"
              onClick={handleShareTwitter}
              title="Chia sẻ tweet lên X (Twitter)"
            >
              <span className="social-icon">✖️</span>
              <span>Twitter / X</span>
            </button>

            <button
              type="button"
              className="social-share-pill share-tele"
              onClick={handleShareTelegram}
              title="Gửi vào nhóm hoặc tin nhắn Telegram"
            >
              <span className="social-icon">✈️</span>
              <span>Telegram</span>
            </button>

            <button
              type="button"
              className="social-share-pill share-in"
              onClick={handleShareLinkedIn}
              title="Chia sẻ lên mạng việc làm LinkedIn"
            >
              <span className="social-icon">💼</span>
              <span>LinkedIn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
