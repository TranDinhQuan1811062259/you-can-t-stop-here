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
      const counts = [0, 3, 6, 9, 14];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: ['❄️', '❅', '✻', '•', '🌨️'][i % 5],
        left: `${(i * 19 + 7) % 92}%`,
        top: `${-10 - (i % 3) * 6}px`,
        size: 11 + (i % 3) * 4,
        delay: `${(i * 0.12).toFixed(2)}s`,
      }));
    }

    if (isSpring) {
      const counts = [0, 3, 6, 10, 16];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: ['🌸', '💮', '🌱', '🌷', '🌿'][i % 5],
        left: `${(i * 18 + 5) % 94}%`,
        top: `${(i % 2 === 0 ? -12 : 12) + (i % 3) * 3}px`,
        size: 12 + (i % 3) * 4,
        delay: `${(i * 0.15).toFixed(2)}s`,
      }));
    }

    if (isAutumn) {
      const counts = [0, 3, 6, 9, 15];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: ['🍂', '🍁', '🍃', '🌾'][i % 4],
        left: `${(i * 21 + 8) % 93}%`,
        top: `${-11 - (i % 3) * 5}px`,
        size: 13 + (i % 3) * 4,
        delay: `${(i * 0.14).toFixed(2)}s`,
      }));
    }

    if (isSummer) {
      // Mùa hạ: Các giọt tan chảy ròng ròng từ chân chữ
      const counts = [0, 2, 5, 8, 12];
      const count = counts[effectiveLevel] || 0;
      return Array.from({ length: count }).map((_, i) => ({
        id: i,
        char: '💧',
        left: `${(i * 17 + 9) % 90}%`,
        height: 6 + effectiveLevel * 5 + (i % 3) * 4,
        delay: `${(i * 0.2).toFixed(2)}s`,
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
      {/* Lớp tuyết nắp phủ trên đỉnh chữ (Mùa đông tuyết tích trữ dày) */}
      {isWinter && (effectiveLevel > 0 || isRecovering) && (
        <span
          className={`snow-cap-accumulation snow-cap-level-${effectiveLevel}`}
          aria-hidden="true"
        />
      )}

      {/* Lớp băng tuyết màng nhũ (Icicles rủ xuống) */}
      {isWinter && (effectiveLevel >= 2 || isRecovering) && (
        <span
          className={`snow-icicles-accumulation icicles-level-${effectiveLevel}`}
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
                top: item.top !== undefined ? item.top : 'auto',
                bottom: isSummer ? `-${item.height + 2}px` : 'auto',
                fontSize: item.size ? `${item.size}px` : undefined,
                animationDelay: item.delay,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {isSummer ? (
                <span
                  className="summer-dripping-droplet"
                  style={{
                    height: `${item.height}px`,
                  }}
                />
              ) : (
                item.char
              )}
            </span>
          ))}
        </span>
      )}
    </Component>
  );
};
