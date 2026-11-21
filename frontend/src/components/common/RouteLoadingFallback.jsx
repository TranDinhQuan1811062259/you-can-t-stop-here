import React from 'react';

/**
 * RouteLoadingFallback - Bộ chỉ báo tải trang tối giản, êm ái
 * Phù hợp hoàn hảo với phong cách giao diện Dark & Minimalist của Freedom Web
 */
export const RouteLoadingFallback = () => {
  return (
    <div
      className="route-loading-fallback"
      style={{
        minHeight: '40vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'var(--text-muted, #94a3b8)',
        opacity: 0.8,
        pointerEvents: 'none',
        userSelect: 'none',
        transition: 'opacity 0.25s ease',
      }}
      aria-live="polite"
      aria-label="Đang tải dữ liệu trang..."
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2.5px solid rgba(255, 255, 255, 0.12)',
          borderTopColor: '#38bdf8',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span
        style={{
          fontSize: '0.84rem',
          letterSpacing: '0.4px',
          fontWeight: 500,
        }}
      >
        Đang mở trang...
      </span>
    </div>
  );
};

export default RouteLoadingFallback;
