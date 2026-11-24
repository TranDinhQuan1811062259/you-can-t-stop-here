import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { playClickSound, playNotificationTone } from '../../utils/soundEffects';
import { triggerToneHaptic } from '../../utils/haptics';

const OFFLINE_QUEUE_KEY = 'freedom_offline_post_queue_v1';

export const OfflineSyncToast = () => {
  const { isOnline } = useNetworkStatus();
  const [queuedPost, setQueuedPost] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const wasOfflineRef = useRef(!isOnline);

  const checkQueue = useCallback(() => {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.pendingSync && (parsed.title || parsed.content)) {
          setQueuedPost(parsed);
          setIsVisible(true);
          return;
        }
      }
      setQueuedPost(null);
      setIsVisible(false);
    } catch (_) {
      setQueuedPost(null);
      setIsVisible(false);
    }
  }, []);

  // Kiểm tra hàng đợi khi mount và khi mạng online trở lại kèm âm báo & nhịp rung đồng bộ
  useEffect(() => {
    if (isOnline) {
      if (wasOfflineRef.current) {
        playNotificationTone(null, { volume: 0.5 });
        triggerToneHaptic();
        wasOfflineRef.current = false;
      }
      checkQueue();
    } else {
      wasOfflineRef.current = true;
    }
  }, [isOnline, checkQueue]);

  // Lắng nghe sự kiện đăng bài thành công hoặc queue thay đổi
  useEffect(() => {
    const handleQueueChange = () => {
      checkQueue();
    };

    window.addEventListener('freedom_offline_queue_updated', handleQueueChange);
    return () => {
      window.removeEventListener('freedom_offline_queue_updated', handleQueueChange);
    };
  }, [checkQueue]);

  const handleOpenDraftToPost = () => {
    playClickSound();
    if (!queuedPost) return;

    // Dispatch event mở CreatePostModal với dữ liệu từ hàng đợi
    window.dispatchEvent(
      new CustomEvent('freedom_open_create_post_from_queue', {
        detail: { queuedPost },
      })
    );
    setIsVisible(false);
  };

  const handleDismiss = () => {
    playClickSound();
    setIsVisible(false);
  };

  const handleDiscardQueue = () => {
    playClickSound();
    try {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setQueuedPost(null);
      setIsVisible(false);
    } catch (_) {}
  };

  if (!isOnline || !isVisible || !queuedPost) return null;

  return (
    <div
      className="offline-sync-toast"
      role="alert"
      style={{
        position: 'fixed',
        bottom: '84px',
        right: '20px',
        zIndex: 10015,
        maxWidth: '380px',
        width: 'calc(100vw - 40px)',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(16, 185, 129, 0.25)',
        borderLeft: '5px solid #10b981',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'slideUpBounce 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.25rem', lineHeight: '1' }}>🌐</span>
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#065f46' }}>
            Đã có kết nối mạng trở lại!
          </h4>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: '1',
            padding: '2px',
          }}
          title="Đóng thông báo"
        >
          ✕
        </button>
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: '#334155', lineHeight: '1.4' }}>
        Bạn có 1 bài viết đang chờ đăng: <strong>"{queuedPost.title || 'Bài viết chưa đặt tên'}"</strong>.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
        <button
          type="button"
          onClick={handleOpenDraftToPost}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            color: '#ffffff',
            padding: '7px 12px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <span>✍️</span>
          <span>Mở & Đăng Ngay</span>
        </button>
        <button
          type="button"
          onClick={handleDiscardQueue}
          style={{
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            color: '#64748b',
            padding: '7px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Xóa bài viết này khỏi hàng đợi"
        >
          Hủy bỏ
        </button>
      </div>
    </div>
  );
};
