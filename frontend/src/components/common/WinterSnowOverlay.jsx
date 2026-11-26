import React, { useEffect, useState } from 'react';

const WINTER_SNOWFLAKES = [
  { id: 0, left: 3, size: 3.6, duration: 15, delay: -2, driftStart: -8, driftMid: 18, driftEnd: 4, opacity: 0.62 },
  { id: 1, left: 8, size: 2.8, duration: 19, delay: -11, driftStart: 4, driftMid: -14, driftEnd: 10, opacity: 0.48 },
  { id: 2, left: 13, size: 5.5, duration: 22, delay: -6, driftStart: -6, driftMid: 22, driftEnd: -10, opacity: 0.74 },
  { id: 3, left: 17, size: 3.2, duration: 17, delay: -14, driftStart: 6, driftMid: -16, driftEnd: 8, opacity: 0.52 },
  { id: 4, left: 22, size: 4.6, duration: 20, delay: -4, driftStart: -10, driftMid: 16, driftEnd: -4, opacity: 0.68 },
  { id: 5, left: 27, size: 2.5, duration: 14, delay: -9, driftStart: 2, driftMid: -12, driftEnd: 14, opacity: 0.44 },
  { id: 6, left: 31, size: 5.2, duration: 24, delay: -17, driftStart: -12, driftMid: 20, driftEnd: 6, opacity: 0.72 },
  { id: 7, left: 36, size: 3.4, duration: 16, delay: -7, driftStart: 8, driftMid: -15, driftEnd: 4, opacity: 0.54 },
  { id: 8, left: 41, size: 4.2, duration: 21, delay: -13, driftStart: -4, driftMid: 18, driftEnd: -12, opacity: 0.65 },
  { id: 9, left: 46, size: 2.6, duration: 18, delay: -3, driftStart: 5, driftMid: -18, driftEnd: 6, opacity: 0.46 },
  { id: 10, left: 51, size: 6, duration: 25, delay: -15, driftStart: -10, driftMid: 24, driftEnd: -6, opacity: 0.75 },
  { id: 11, left: 55, size: 3.2, duration: 15, delay: -8, driftStart: 6, driftMid: -14, driftEnd: 12, opacity: 0.5 },
  { id: 12, left: 60, size: 4.8, duration: 23, delay: -19, driftStart: -8, driftMid: 19, driftEnd: 2, opacity: 0.7 },
  { id: 13, left: 64, size: 2.8, duration: 17, delay: -5, driftStart: 4, driftMid: -16, driftEnd: 10, opacity: 0.48 },
  { id: 14, left: 69, size: 4.2, duration: 20, delay: -12, driftStart: -6, driftMid: 20, driftEnd: -8, opacity: 0.64 },
  { id: 15, left: 74, size: 2.4, duration: 14, delay: -10, driftStart: 8, driftMid: -10, driftEnd: 12, opacity: 0.42 },
  { id: 16, left: 78, size: 5.2, duration: 22, delay: -1, driftStart: -12, driftMid: 18, driftEnd: -4, opacity: 0.74 },
  { id: 17, left: 83, size: 3.5, duration: 18, delay: -16, driftStart: 4, driftMid: -18, driftEnd: 8, opacity: 0.56 },
  { id: 18, left: 87, size: 4.6, duration: 21, delay: -7, driftStart: -8, driftMid: 15, driftEnd: -6, opacity: 0.66 },
  { id: 19, left: 91, size: 3, duration: 16, delay: -14, driftStart: 6, driftMid: -14, driftEnd: 4, opacity: 0.5 },
  { id: 20, left: 95, size: 3.8, duration: 19, delay: -9, driftStart: -6, driftMid: 14, driftEnd: -10, opacity: 0.6 },
  { id: 21, left: 98, size: 2.7, duration: 20, delay: -4, driftStart: 2, driftMid: -12, driftEnd: -4, opacity: 0.45 },
];

/**
 * Hiệu ứng bông tuyết li ti & lớp sương mùa đông 60fps bằng CSS transform3d thuần (GPU-accelerated).
 * Chế Độ Ngày mang sắc trắng ngọc kèm viền/bóng ánh xanh băng (rgba(186, 230, 253, 0.85)) sắc nét;
 * Chế Độ Đêm phát sáng trắng dịu. Tự động tắt khi bật `prefers-reduced-motion: reduce`.
 */
export const WinterSnowOverlay = ({ enabled = true }) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionChange = (e) => setPrefersReducedMotion(Boolean(e.matches));

    setPrefersReducedMotion(Boolean(mediaQuery.matches));
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMotionChange);
      return () => mediaQuery.removeEventListener('change', handleMotionChange);
    }
    mediaQuery.addListener(handleMotionChange);
    return () => mediaQuery.removeListener(handleMotionChange);
  }, []);

  if (!enabled || prefersReducedMotion) {
    return null;
  }

  return (
    <div className="winter-snow-overlay" aria-hidden="true">
      <div className="winter-mist-veil" />
      {WINTER_SNOWFLAKES.map((flake) => (
        <span
          key={flake.id}
          className={`winter-snow-flake ${flake.size >= 4.5 ? 'is-soft-flake' : ''}`}
          style={{
            left: `${flake.left}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            '--flake-opacity': flake.opacity,
            '--drift-start': `${flake.driftStart}px`,
            '--drift-mid': `${flake.driftMid}px`,
            '--drift-end': `${flake.driftEnd}px`,
            animationDuration: `${flake.duration}s`,
            animationDelay: `${flake.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default WinterSnowOverlay;
