import React, { useEffect, useRef } from 'react';

/**
 * Thanh tiến độ đọc bài viết siêu mượt 60fps (Zero Re-render GPU Accelerated)
 * Cập nhật trực tiếp transform scaleX qua DOM ref + requestAnimationFrame
 * Không gây re-render component React khi người dùng cuộn trang
 */
export const ReadingProgressBar = ({ post }) => {
  const indicatorRef = useRef(null);
  const trackRef = useRef(null);
  const rafIdRef = useRef(null);

  const postType = post?.postType || 'article';
  const isArticle = postType === 'article';

  useEffect(() => {
    if (!isArticle) return;

    const handleScroll = () => {
      if (rafIdRef.current) return;

      rafIdRef.current = requestAnimationFrame(() => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const totalScrollable = scrollHeight - clientHeight;

        if (totalScrollable > 0 && indicatorRef.current) {
          const ratio = Math.min(1, Math.max(0, scrollTop / totalScrollable));
          indicatorRef.current.style.transform = `scaleX(${ratio})`;

          if (trackRef.current) {
            trackRef.current.style.opacity = ratio > 0.005 ? '1' : '0';
          }
        }

        rafIdRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Khởi tạo vị trí ngay khi mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isArticle]);

  if (!isArticle) return null;

  return (
    <div
      ref={trackRef}
      className="reading-progress-track"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '3px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        zIndex: 9990,
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 0.2s ease',
      }}
      aria-hidden="true"
    >
      <div
        ref={indicatorRef}
        className="reading-progress-indicator"
        style={{
          width: '100%',
          height: '100%',
          transform: 'scaleX(0)',
          transformOrigin: 'left center',
          background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
          boxShadow: '0 0 10px rgba(245, 158, 11, 0.75), 0 0 4px rgba(239, 68, 68, 0.6)',
          borderRadius: '0 2px 2px 0',
          willChange: 'transform',
        }}
      />
    </div>
  );
};
