import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { playClickSound } from '../../utils/soundEffects';
import { formatPostContent } from '../../utils/contentFormatter';

/**
 * CinemaReadingOverlay - Chế Độ Đọc Chìm Đắm Rạp Phim
 * Loại bỏ mọi xao nhãng, đưa người đọc vào không gian tĩnh lặng 100%,
 * hỗ trợ chỉnh cỡ chữ, cuộn tự động êm dịu và tùy chọn theme nền thư giãn.
 */
export const CinemaReadingOverlay = ({ post, atmosphere = {}, onClose }) => {
  const [fontSize, setFontSize] = useState(19); // 16px - 24px
  const [readingTheme, setReadingTheme] = useState('midnight'); // 'midnight' | 'warm_amber' | 'zen_green'
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  const contentRef = useRef(null);
  const autoScrollTimerRef = useRef(null);

  // Lắng nghe phím ESC để thoát chế độ rạp phim
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        playClickSound();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Theo dõi tiến độ đọc bài viết (%)
  const handleScroll = (e) => {
    const el = e.currentTarget;
    const total = el.scrollHeight - el.clientHeight;
    if (total > 0) {
      const progress = Math.min(100, Math.round((el.scrollTop / total) * 100));
      setScrollProgress(progress);
    }
  };

  // Cuộn tự động chậm rãi êm dịu
  useEffect(() => {
    if (isAutoScrolling) {
      autoScrollTimerRef.current = setInterval(() => {
        if (contentRef.current) {
          contentRef.current.scrollBy({ top: 1, behavior: 'smooth' });
        }
      }, 35);
    } else {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    }
    return () => {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    };
  }, [isAutoScrolling]);

  // Cấu hình theme nền cho Rạp Phim
  const THEME_STYLES = {
    midnight: {
      bg: '#030712',
      cardBg: 'rgba(15, 23, 42, 0.95)',
      text: '#f8fafc',
      mutedText: '#94a3b8',
      accent: '#38bdf8',
      border: 'rgba(56, 189, 248, 0.25)',
      glow: 'rgba(56, 189, 248, 0.15)',
    },
    warm_amber: {
      bg: '#1c1308',
      cardBg: 'rgba(41, 26, 10, 0.95)',
      text: '#fef3c7',
      mutedText: '#d97706',
      accent: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.3)',
      glow: 'rgba(245, 158, 11, 0.2)',
    },
    zen_green: {
      bg: '#021811',
      cardBg: 'rgba(6, 44, 32, 0.95)',
      text: '#f0fdf4',
      mutedText: '#34d399',
      accent: '#10b981',
      border: 'rgba(16, 185, 129, 0.3)',
      glow: 'rgba(16, 185, 129, 0.2)',
    },
  };

  const currentTheme = THEME_STYLES[readingTheme] || THEME_STYLES.midnight;

  const overlayContent = (
    <div
      className="cinema-reading-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: currentTheme.bg,
        color: currentTheme.text,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeIn 0.3s ease-out',
        userSelect: 'text',
      }}
    >
      {/* Thanh Tiến Độ Đọc (Top Scroll Progress Bar) */}
      <div
        style={{
          height: '3px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1000000,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${scrollProgress}%`,
            background: currentTheme.accent,
            boxShadow: `0 0 10px ${currentTheme.accent}`,
            transition: 'width 0.1s linear',
          }}
        />
      </div>

      {/* Top Floating Control Bar */}
      <div
        style={{
          padding: '12px 24px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${currentTheme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          zIndex: 10,
        }}
      >
        {/* Left: Mode Title & Progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>🎬</span>
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 800, color: currentTheme.accent, letterSpacing: '0.4px' }}>
              CHẾ ĐỘ RẠP PHIM CHÌM ĐẮM
            </div>
            <div style={{ fontSize: '0.74rem', color: currentTheme.mutedText }}>
              Đã đọc {scrollProgress}% • Bấm ESC để thoát
            </div>
          </div>
        </div>

        {/* Center: Controls (Font size, Themes, Auto scroll) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Cỡ chữ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '2px 6px' }}>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setFontSize((prev) => Math.max(16, prev - 1.5));
              }}
              title="Giảm cỡ chữ"
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px 6px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              A-
            </button>
            <span style={{ fontSize: '0.75rem', color: currentTheme.accent, fontWeight: 700, minWidth: '32px', textAlign: 'center' }}>
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setFontSize((prev) => Math.min(26, prev + 1.5));
              }}
              title="Tăng cỡ chữ"
              style={{ background: 'transparent', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '4px 6px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              A+
            </button>
          </div>

          {/* Theme nền Rạp phim */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'midnight', label: '🌙 Đêm Sâu', color: '#38bdf8' },
              { id: 'warm_amber', label: '☕ Nắng Ấm', color: '#f59e0b' },
              { id: 'zen_green', label: '🍃 Rừng Thiền', color: '#10b981' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  playClickSound();
                  setReadingTheme(t.id);
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: readingTheme === t.id ? `1.5px solid ${t.color}` : '1px solid rgba(255, 255, 255, 0.1)',
                  background: readingTheme === t.id ? `${t.color}25` : 'transparent',
                  color: readingTheme === t.id ? '#ffffff' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: readingTheme === t.id ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Nút Cuộn Tự Động */}
          <button
            type="button"
            onClick={() => {
              playClickSound();
              setIsAutoScrolling((prev) => !prev);
            }}
            style={{
              padding: '5px 12px',
              borderRadius: '8px',
              border: isAutoScrolling ? `1.5px solid ${currentTheme.accent}` : '1px solid rgba(255, 255, 255, 0.15)',
              background: isAutoScrolling ? `${currentTheme.accent}30` : 'rgba(255, 255, 255, 0.06)',
              color: isAutoScrolling ? '#ffffff' : '#cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={isAutoScrolling ? 'Dừng cuộn tự động' : 'Tự động cuộn trang chậm rãi êm đềm'}
          >
            <span>{isAutoScrolling ? '⏸' : '▶'}</span>
            <span>{isAutoScrolling ? 'Đang cuộn...' : 'Tự cuộn'}</span>
          </button>
        </div>

        {/* Right: Close Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f8fafc',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>✕</span>
          <span>Thoát Rạp Phim</span>
        </button>
      </div>

      {/* Main Reading Scroll Container */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '40px 20px 80px',
        }}
      >
        <div
          style={{
            maxWidth: '740px',
            margin: '0 auto',
            background: currentTheme.cardBg,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '24px',
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.6), 0 0 35px ${currentTheme.glow}`,
            padding: '40px 36px',
            position: 'relative',
          }}
        >
          {/* Post Header */}
          <div style={{ marginBottom: '28px', borderBottom: `1px solid ${currentTheme.border}`, paddingBottom: '20px' }}>
            <h1
              style={{
                fontSize: `${fontSize * 1.55}px`,
                fontWeight: 800,
                color: currentTheme.text,
                lineHeight: 1.35,
                margin: '0 0 16px 0',
                letterSpacing: '-0.02em',
              }}
            >
              {post.title}
            </h1>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.84rem', color: currentTheme.mutedText }}>
              <span>Bởi: <strong style={{ color: currentTheme.accent }}>{post.author || post.user?.name || 'Tác giả'}</strong></span>
              <span>•</span>
              <span>{new Date(post.createdAt || Date.now()).toLocaleDateString('vi-VN')}</span>
              {atmosphere.theme && atmosphere.theme !== 'default' && (
                <>
                  <span>•</span>
                  <span>Không gian: {atmosphere.theme}</span>
                </>
              )}
            </div>
          </div>

          {/* Post Summary */}
          {post.summary && (
            <div
              style={{
                fontSize: `${fontSize * 1.05}px`,
                fontStyle: 'italic',
                color: currentTheme.mutedText,
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderLeft: `4px solid ${currentTheme.accent}`,
                marginBottom: '28px',
                lineHeight: 1.7,
              }}
            >
              "{post.summary}"
            </div>
          )}

          {/* Post Content Body */}
          <div
            className="cinema-reading-body"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: 1.9,
              color: currentTheme.text,
            }}
            dangerouslySetInnerHTML={{
              __html: formatPostContent(post.content || ''),
            }}
          />

          {/* Bottom Zen Outro */}
          <div
            style={{
              marginTop: '50px',
              paddingTop: '24px',
              borderTop: `1px solid ${currentTheme.border}`,
              textAlign: 'center',
              color: currentTheme.mutedText,
              fontSize: '0.85rem',
              fontStyle: 'italic',
            }}
          >
            "Cảm ơn bạn đã dành những phút giây tĩnh lặng để đọc trọn vẹn câu chuyện này 🌿✨"
          </div>
        </div>
      </div>

      <style>{`
        .cinema-reading-body p {
          margin-bottom: 1.6em;
        }
        .cinema-reading-body img {
          max-width: 100%;
          border-radius: 12px;
          margin: 1.5em 0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }
        .cinema-reading-body blockquote {
          border-left: 4px solid currentColor;
          padding-left: 18px;
          font-style: italic;
          opacity: 0.9;
          margin: 1.5em 0;
        }
      `}</style>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(overlayContent, document.body)
    : overlayContent;
};
