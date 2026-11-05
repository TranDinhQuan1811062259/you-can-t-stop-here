import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { postService } from '../../services/postService';
import { chatService } from '../../services/chatService';

export const ShareModal = ({ isOpen, onClose, post, onShareSuccess }) => {
  const { user } = useAuth();
  const { friendsList, openChatWithUser } = useChat();

  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sentFriendId, setSentFriendId] = useState(null);
  const [shareError, setShareError] = useState('');

  if (!isOpen || !post) return null;

  const postUrl = `${window.location.origin}/post/${post.slug}`;
  const shareTitle = `${post.title} | You Can't Stop Here`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      notifyServerShared();
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      notifyServerShared();
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const notifyServerShared = async () => {
    try {
      const res = await postService.sharePost(post._id || post.slug);
      if (res?.data?.sharesCount && onShareSuccess) {
        onShareSuccess(res.data.sharesCount);
      }
    } catch (err) {
      console.warn('Lỗi ghi nhận lượt chia sẻ:', err);
    }
  };

  const handleShareFacebook = () => {
    notifyServerShared();
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
  };

  const handleShareTwitter = () => {
    notifyServerShared();
    const tweetText = `Đọc câu chuyện "${post.title}" trên You Can't Stop Here: `;
    const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(tweetText)}`;
    window.open(xUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
  };

  const handleShareLinkedIn = () => {
    notifyServerShared();
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`;
    window.open(liUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
  };

  const handleShareZalo = () => {
    notifyServerShared();
    const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(postUrl)}`;
    window.open(zaloUrl, '_blank', 'width=600,height=500,scrollbars=yes,resizable=yes');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: `Đọc tâm sự "${post.title}" tại You Can't Stop Here`,
          url: postUrl,
        });
        notifyServerShared();
      } catch (err) {
        console.log('Chia sẻ bị hủy hoặc không hỗ trợ');
      }
    }
  };

  const handleSendViaChat = async (friend) => {
    try {
      setSharing(true);
      setShareError('');
      // Tìm hoặc tạo cuộc trò chuyện với bạn bè này
      const initRes = await chatService.findOrCreateConversation(friend._id);
      const conversationId = initRes.data._id;

      // Gửi tin nhắn chứa liên kết bài viết
      const messageContent = `Mình muốn chia sẻ câu chuyện này với bạn: "${post.title}"\n${postUrl}`;
      await chatService.sendMessage({
        conversationId,
        content: messageContent,
      });

      setSentFriendId(friend._id);
      notifyServerShared();
      setTimeout(() => {
        setSentFriendId(null);
      }, 3000);
    } catch (err) {
      setShareError('Không thể gửi tin nhắn lúc này. Vui lòng thử lại!');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box share-modal-box"
        style={{ maxWidth: '520px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          ✕
        </button>

        <h3 className="modal-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>↗️</span> Chia Sẻ Tâm Sự
        </h3>
        <p className="modal-subtitle">
          Lan tỏa câu chuyện này để tiếp thêm động lực cho những người đang cùng cảnh ngộ.
        </p>

        {/* Post Preview Card */}
        <div className="share-preview-card">
          {post.coverImage && (
            <img src={post.coverImage} alt={post.title} className="share-preview-img" />
          )}
          <div className="share-preview-info">
            <span className="share-preview-tag">{post.category?.name || 'Tâm sự'}</span>
            <h4 className="share-preview-title">{post.title}</h4>
            <span className="share-preview-author">Bởi {post.author || 'Thành viên'}</span>
          </div>
        </div>

        {/* Copy Link Section */}
        <div className="share-copy-box">
          <input type="text" readOnly value={postUrl} className="share-link-input" />
          <button
            type="button"
            className={`share-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopyLink}
          >
            {copied ? '✓ Đã chép!' : '📋 Sao chép'}
          </button>
        </div>

        {/* Social Platforms Row */}
        <div className="share-social-grid">
          <button
            type="button"
            className="share-social-btn fb-btn"
            onClick={handleShareFacebook}
            title="Chia sẻ lên Facebook cá nhân hoặc nhóm"
          >
            <span className="share-social-icon">📘</span>
            <span>Facebook</span>
          </button>

          <button
            type="button"
            className="share-social-btn zalo-btn"
            onClick={handleShareZalo}
            title="Chia sẻ qua tin nhắn Zalo"
          >
            <span className="share-social-icon">💬</span>
            <span>Zalo</span>
          </button>

          <button
            type="button"
            className="share-social-btn x-btn"
            onClick={handleShareTwitter}
            title="Đăng bài lên X (Twitter)"
          >
            <span className="share-social-icon">𝕏</span>
            <span>X (Twitter)</span>
          </button>

          <button
            type="button"
            className="share-social-btn in-btn"
            onClick={handleShareLinkedIn}
            title="Chia sẻ bài viết lên LinkedIn"
          >
            <span className="share-social-icon">💼</span>
            <span>LinkedIn</span>
          </button>

          {typeof navigator !== 'undefined' && navigator.share && (
            <button
              type="button"
              className="share-social-btn more-btn"
              onClick={handleNativeShare}
              title="Mở menu chia sẻ của thiết bị"
            >
              <span className="share-social-icon">📱</span>
              <span>Khác...</span>
            </button>
          )}
        </div>

        {/* Send to Freedom Friends Chat */}
        {user && friendsList && friendsList.length > 0 && (
          <div className="share-chat-friends-section">
            <h5 className="share-friends-title">✉️ Gửi trực tiếp cho bạn bè (Freedom Chat)</h5>
            {shareError && <p className="share-error-msg">{shareError}</p>}
            <div className="share-friends-list">
              {friendsList.map((friend) => (
                <div key={friend._id} className="share-friend-item">
                  <div className="share-friend-left">
                    <img
                      src={friend.avatar || '/images/man.jpg'}
                      alt={friend.name}
                      className="share-friend-avatar"
                    />
                    <div>
                      <strong className="share-friend-name">{friend.name}</strong>
                      <span className="share-friend-job">{friend.jobTitle}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`share-friend-send-btn ${sentFriendId === friend._id ? 'sent' : ''}`}
                    onClick={() => handleSendViaChat(friend)}
                    disabled={sharing || sentFriendId === friend._id}
                  >
                    {sentFriendId === friend._id ? '✓ Đã gửi' : 'Gửi'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

