import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getActiveSeason } from '../../utils/seasonUtils';

export const AmbientBackground = ({ profileLayout }) => {
  const { user } = useAuth();
  const layout = profileLayout || user?.customLayout || { theme: 'default', ambientEffect: 'particles' };
  const effect = layout.ambientEffect || 'particles';

  const [activeSeason, setLocalSeason] = useState(() => getActiveSeason());

  useEffect(() => {
    const handleSeasonChange = (e) => {
      setLocalSeason(e.detail || getActiveSeason());
    };
    window.addEventListener('freedom_season_changed', handleSeasonChange);
    return () => window.removeEventListener('freedom_season_changed', handleSeasonChange);
  }, []);

  // Tạo danh sách 14 hạt thời tiết 4 mùa tự nhiên
  const seasonalFlakes = useMemo(() => {
    const particlePool = activeSeason.particles || ['❄️', '❅', '✻', '•'];
    return Array.from({ length: 14 }).map((_, idx) => {
      const char = particlePool[idx % particlePool.length];
      const left = Math.floor(Math.random() * 96) + 2; // 2% -> 98%
      const duration = 12 + (idx % 7) * 3; // 12s -> 30s
      const delay = -((idx * 2.3) % 15); // Staggered start
      const size = 12 + (idx % 4) * 4; // 12px -> 24px
      const opacity = 0.35 + (idx % 5) * 0.12; // 0.35 -> 0.85
      return { id: idx, char, left, duration, delay, size, opacity };
    });
  }, [activeSeason.id]);

  if (effect === 'none') return null;

  return (
    <div className={`ambient-container ambient-${effect} season-theme-${activeSeason.id}`} aria-hidden="true">
      {/* Floating orbs / luminous particles */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      <div className="ambient-orb orb-3"></div>
      <div className="ambient-orb orb-4"></div>
      <div className="ambient-mesh-glow"></div>

      {/* Hiệu ứng 4 mùa theo thời tiết (Tuyết rơi mùa đông, lá vàng mùa thu, hoa anh đào mùa xuân, đom đóm mùa hạ) */}
      <div className="seasonal-particles-wrap">
        {seasonalFlakes.map((flake) => (
          <span
            key={flake.id}
            className={`seasonal-flake season-item-${activeSeason.id}`}
            style={{
              left: `${flake.left}%`,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
              fontSize: `${flake.size}px`,
              opacity: flake.opacity,
            }}
          >
            {flake.char}
          </span>
        ))}
      </div>
    </div>
  );
};
