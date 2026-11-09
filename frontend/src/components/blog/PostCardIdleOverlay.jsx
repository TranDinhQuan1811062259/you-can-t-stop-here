import React from 'react';
import { useIdleWeather } from '../../hooks/useIdleWeather';

/**
 * PostCardIdleOverlay - Hiệu ứng thời tiết phủ lên khung bài viết khi người dùng nhàn rỗi (Idle):
 * - Mùa Đông: Dải tuyết xốp trắng phủ trên nóc thẻ bài viết, các góc đóng băng phát sáng tuyết, nhũ băng rủ xuống.
 *   Khi vuốt chuột / chạm màn hình: Dải tuyết nứt vỡ, rơi lả tả xuống dưới và tan biến!
 * - Mùa Xuân: Hoa đào, hoa mai và chồi non nở bám viền thẻ bài viết.
 *   Khi vuốt chuột: Cánh hoa rụng bay bổng theo gió!
 * - Mùa Thu: Lá phong, lá vàng úa đọng trên gờ nóc thẻ bài viết.
 *   Khi vuốt chuột: Lá vàng xào xạc rơi rụng xuống đất!
 * - Mùa Hạ: Ánh nhiệt sóng lượn sóng & giọt tan chảy rủ xuống chân thẻ bài viết.
 *   Khi vuốt chuột: Co giãn đàn hồi biến mất ngay lập tức!
 */
export const PostCardIdleOverlay = () => {
  const { idleLevel, lastIdleLevel, isRecovering, seasonId } = useIdleWeather();
  const effectiveLevel = idleLevel > 0 ? idleLevel : isRecovering ? lastIdleLevel || 2 : 0;

  if (effectiveLevel === 0 && !isRecovering) return null;

  const isWinter = seasonId === 'winter';
  const isSpring = seasonId === 'spring';
  const isAutumn = seasonId === 'autumn';
  const isSummer = seasonId === 'summer';

  return (
    <div
      className={`card-idle-weather-frame weather-season-${seasonId} idle-level-${effectiveLevel} ${
        isRecovering
          ? `is-recovering ${
              isSummer
                ? 'summer-elastic-reunite'
                : isWinter
                ? 'winter-snow-melt-off'
                : isSpring
                ? 'spring-petals-scatter'
                : 'autumn-leaves-scatter'
            }`
          : ''
      }`}
      aria-hidden="true"
    >
      {/* =====================================================================
          1. MÙA ĐÔNG: Dải tuyết trắng xốp tinh tế trên gờ nóc thẻ + hoa tuyết góc
         ===================================================================== */}
      {isWinter && (
        <>
          <div className={`card-snow-cap-ridge snow-cap-level-${effectiveLevel}`} />
          <div className="card-frost-corner top-left">❄️</div>
          <div className="card-frost-corner top-right">❅</div>
        </>
      )}

      {/* =====================================================================
          2. MÙA XUÂN: Chùm hoa mai / hoa đào nở bám viền nóc khung bài viết
         ===================================================================== */}
      {isSpring && (
        <div className="card-spring-blooms-wrap">
          <span className="card-spring-flower flower-1">🌸</span>
          <span className="card-spring-flower flower-2">💮</span>
          <span className="card-spring-flower flower-3">🌱</span>
          {effectiveLevel >= 2 && <span className="card-spring-flower flower-4">🌷</span>}
          {effectiveLevel >= 3 && <span className="card-spring-flower flower-5">🌺</span>}
        </div>
      )}

      {/* =====================================================================
          3. MÙA THU: Lá phong / lá vàng úa phủ trên nóc khung bài viết
         ===================================================================== */}
      {isAutumn && (
        <div className="card-autumn-leaves-wrap">
          <span className="card-autumn-leaf leaf-1">🍂</span>
          <span className="card-autumn-leaf leaf-2">🍁</span>
          <span className="card-autumn-leaf leaf-3">🍃</span>
          {effectiveLevel >= 2 && <span className="card-autumn-leaf leaf-4">🌾</span>}
        </div>
      )}

      {/* =====================================================================
          4. MÙA HẠ: Sóng nhiệt gợn nhẹ ấm áp quanh viền thẻ
         ===================================================================== */}
      {isSummer && (
        <div className="card-summer-heat-wrap">
          <div className="card-summer-heat-haze" />
        </div>
      )}
    </div>
  );
};
