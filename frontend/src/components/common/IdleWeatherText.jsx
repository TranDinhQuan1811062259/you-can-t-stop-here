import React, { useMemo } from 'react';
import { useIdleWeather } from '../../hooks/useIdleWeather';

export const IdleWeatherText = ({
  children,
  as: Component = 'span',
  className = '',
  style = {},
  enableAllSeasons = true,
  ...props
}) => {
  const { idleLevel, lastIdleLevel, idleRatio, isRecovering, seasonId } = useIdleWeather();
  const effectiveLevel = idleLevel > 0 ? idleLevel : (isRecovering ? (lastIdleLevel || 2) : 0);

  const isSummer = seasonId === 'summer';
  const isWinter = seasonId === 'winter';
  const isSpring = seasonId === 'spring';
  const isAutumn = seasonId === 'autumn';

  // Tính số lượng hạt bám theo cấp độ nhàn rỗi (Level 0 -> 4)
  const decorations = useMemo(() => {
    if (effectiveLevel === 0 && !isRecovering) return [];

    if (isWinter) {
      const counts = [0, 1, 3, 5, 7];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: ['❄️', '❅', '✨', '✻'][i % 4],
        left: `${(i * 22 + 8) % 88}%`,
        top: `${-10 - (i % 2) * 4}px`,
        size: 11 + (i % 2) * 3,
        delay: `${(i * 0.16).toFixed(2)}s`,
      }));
    }

    if (isSpring) {
      const counts = [0, 1, 3, 5, 7];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: ['🌸', '💮', '🌱', '🌷'][i % 4],
        left: `${(i * 22 + 6) % 88}%`,
        top: `${-11 - (i % 2) * 4}px`,
        size: 12 + (i % 2) * 3,
        delay: `${(i * 0.18).toFixed(2)}s`,
      }));
    }

    if (isAutumn) {
      const counts = [0, 1, 3, 5, 7];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: ['🍂', '🍁', '🍃'][i % 3],
        left: `${(i * 24 + 8) % 88}%`,
        top: `${-11 - (i % 2) * 4}px`,
        size: 12 + (i % 2) * 3,
        delay: `${(i * 0.16).toFixed(2)}s`,
      }));
    }

    if (isSummer) {
      // Mùa hạ: Các tia nắng ấm & đốm sáng lung linh nhẹ nhàng trên chữ
      const counts = [0, 1, 2, 3, 4];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: ['✨', '☀️', '🌻', '✨'][i % 4],
        left: `${(i * 24 + 10) % 86}%`,
        top: `${-10 - (i % 2) * 3}px`,
        size: 11 + (i % 2) * 2,
        delay: `${(i * 0.18).toFixed(2)}s`,
      }));
    }

    return [];
  }, [effectiveLevel, seasonId, isRecovering, isWinter, isSpring, isAutumn, isSummer]);

  // Tạo class trạng thái
  const weatherClass = useMemo(() => {
    const classes = ['idle-weather-text-wrap'];
    classes.push(`weather-season-${seasonId}`);
    classes.push(`idle-level-${effectiveLevel}`);

    if (isRecovering) {
      classes.push('is-recovering');
      if (isSummer) classes.push('summer-elastic-reunite');
      if (isWinter) classes.push('winter-snow-melt-off');
      if (isSpring) classes.push('spring-petals-scatter');
      if (isAutumn) classes.push('autumn-leaves-scatter');
    }

    if (effectiveLevel > 0) {
      classes.push('is-weather-accumulated');
    }

    return classes.join(' ');
  }, [seasonId, effectiveLevel, isRecovering, isSummer, isWinter, isSpring, isAutumn]);

  return (
    <Component
      className={`${weatherClass} ${className}`.trim()}
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
      {...props}
    >
      {/* Lớp viền sương tuyết mỏng manh tinh khôi trên đỉnh chữ (Mùa đông) */}
      {isWinter && (effectiveLevel > 0 || isRecovering) && (
        <span
          className={`snow-cap-accumulation snow-cap-level-${effectiveLevel}`}
          aria-hidden="true"
        />
      )}

      {/* Nội dung chữ nguyên bản kèm hiệu ứng tan chảy lượn sóng nếu là Mùa Hạ */}
      <span className="idle-weather-inner-text">
        {children}
      </span>

      {/* Các hạt bám: Hoa nở, Lá vàng, Bông tuyết, hoặc Giọt tan chảy Mùa Hạ */}
      {decorations.length > 0 && (
        <span className="idle-weather-decorations-layer" aria-hidden="true">
          {decorations.map((item) => (
            <span
              key={item.id}
              className={`weather-decor-item decor-${seasonId} ${isRecovering ? 'item-recovering' : ''}`}
              style={{
                position: 'absolute',
                left: item.left,
                top: item.top !== undefined ? item.top : '-10px',
                fontSize: `${item.size || 12}px`,
                animationDelay: item.delay,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {item.char}
            </span>
          ))}
        </span>
      )}
    </Component>
  );
};
