import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { playClickSound } from '../../utils/soundEffects';

/**
 * BackToTopButton - Nút Cuộn Nhanh Lên Đầu Trang Thông Minh
 * - Tự động hiển thị khi cuộn sâu > 450px
 * - Cuộn mượt mà (smooth scroll), tôn trọng chế độ giảm chuyển động prefers-reduced-motion
 * - Vị trí hài hòa, không va chạm với nút FAB Viết bài (DraggableWritePostButton)
 * - Tương thích an toàn với safe-area-inset-bottom trên iPhone/iPad/Webview
 * - Dọn dẹp scroll listener triệt để khi unmount (Quy tắc 3 GEMINI.md)
 */
export const BackToTopButton = () => {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const animFrameRef = useRef(null);

  // Ẩn ngay lập tức nút cuộn lên đầu khi chuyển sang trang/route mới
  useEffect(() => {
    setIsVisible(false);
  }, [location.pathname]);

  useEffect(() => {
    let ticking = false;

    const checkScrollPosition = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      setIsVisible(scrollY > 450);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        animFrameRef.current = requestAnimationFrame(checkScrollPosition);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    checkScrollPosition();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleScrollToTop = () => {
    playClickSound();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <button
      type="button"
      className={`back-to-top-btn ${isVisible ? 'is-visible' : 'is-hidden'}`}
      onClick={handleScrollToTop}
      aria-label="Cuộn lên đầu trang"
      title="Cuộn lên đầu trang"
    >
      <span className="back-to-top-icon">
        <i className="fa-solid fa-arrow-up"></i>
      </span>
    </button>
  );
};
