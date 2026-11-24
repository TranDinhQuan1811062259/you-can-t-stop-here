import React, { useState, useEffect, useRef } from 'react';

/**
 * Thanh tiến độ đọc bài viết mượt mà 60fps (Reading Progress Bar)
 * Cố định trên cùng màn hình với hiệu ứng ánh lửa ấm áp
 */
export const ReadingProgressBar = ({ post }) => {
  const [progress, setProgress] = useState(0);
  const rafIdRef = useRef(null);

  const postType = post?.postType || 'article';
  // Chỉ hiển thị trên bài viết sâu dạng văn bản
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

        if (totalScrollable > 0) {
          const currentPercent = (scrollTop / totalScrollable) * 100;
          setProgress(Math.min(100, Math.max(0, currentPercent)));
        } else {
          setProgress(0);
        }

        rafIdRef.current = null;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Tính toán một lần ngay khi component mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [isArticle]);

  if (!isArticle || progress <= 0) return null;

  return (
    <div
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
      }}
      aria-hidden="true"
    >
      <div
        className="reading-progress-indicator"
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
          boxShadow: '0 0 10px rgba(245, 158, 11, 0.75), 0 0 4px rgba(239, 68, 68, 0.6)',
          transition: 'width 0.1s ease-out',
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  );
};
