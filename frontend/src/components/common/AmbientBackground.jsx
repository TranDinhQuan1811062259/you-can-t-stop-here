import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getActiveSeason } from '../../utils/seasonUtils';
import { eventService } from '../../services/eventService';

export const AmbientBackground = ({ profileLayout }) => {
  const { user } = useAuth();
  const layout = profileLayout || user?.customLayout || { theme: 'default', ambientEffect: 'particles' };
  const effect = layout.ambientEffect || 'particles';

  const [activeSeason, setLocalSeason] = useState(() => getActiveSeason());
  const [activeFestiveEvent, setActiveFestiveEvent] = useState(null);

  const fetchActiveEvent = () => {
    eventService
      .getActiveEvent()
      .then((res) => {
        if (res?.data) {
          setActiveFestiveEvent(res.data);
        } else {
          setActiveFestiveEvent(null);
        }
      })
      .catch(() => setActiveFestiveEvent(null));
  };

  const [isBursting, setIsBursting] = useState(false);
  const [isCrossFading, setIsCrossFading] = useState(false);

  useEffect(() => {
    fetchActiveEvent();

    const handleSeasonChange = (e) => {
      // Làm mờ dần các hạt cũ trong 350ms trước khi đổi mùa
      setIsCrossFading(true);
      setTimeout(() => {
        setLocalSeason(e.detail || getActiveSeason());
        setTimeout(() => setIsCrossFading(false), 200);
      }, 350);
    };

    const handleEventChange = () => {
      // Làm mờ dần các hạt cũ trong 350ms trước khi đổi sự kiện
      setIsCrossFading(true);
      setTimeout(() => {
        fetchActiveEvent();
        setTimeout(() => setIsCrossFading(false), 200);
      }, 350);
    };

    const handleBurst = () => {
      setIsBursting(true);
      setTimeout(() => setIsBursting(false), 6000);
    };

    window.addEventListener('freedom_season_changed', handleSeasonChange);
    window.addEventListener('freedom_festive_event_changed', handleEventChange);
    window.addEventListener('freedom_festive_burst', handleBurst);

    return () => {
      window.removeEventListener('freedom_season_changed', handleSeasonChange);
      window.removeEventListener('freedom_festive_event_changed', handleEventChange);
      window.removeEventListener('freedom_festive_burst', handleBurst);
    };
  }, []);

  // Tạo danh sách các hạt hiệu ứng lễ hội hoặc 4 mùa tự nhiên
  const seasonalFlakes = useMemo(() => {
    const is304 = activeFestiveEvent?.id === 'giai_phong_30_4' || activeFestiveEvent?.name?.includes('30/4');
    const is29 = activeFestiveEvent?.id === 'quoc_khanh_2_9' || activeFestiveEvent?.name?.includes('2/9');
    const is83 = activeFestiveEvent?.id === 'quoc_te_phu_nu_8_3' || activeFestiveEvent?.name?.includes('8/3');
    const isBalloons = activeFestiveEvent?.particleType === 'balloons' || is83;

    // Nếu đang trong đợt Sự Kiện Lễ Hội (30/4, 2/9, 8/3, 1/6, Tết...) -> Ưu tiên hiệu ứng Lễ Hội
    const particlePool = (activeFestiveEvent && activeFestiveEvent.particles?.length)
      ? activeFestiveEvent.particles
      : (activeSeason.particles || ['❄️', '❅', '✻', '•']);

    const totalCount = isBursting ? 24 : 16;

    return Array.from({ length: totalCount }).map((_, idx) => {
      const char = particlePool[idx % particlePool.length];
      const left = Math.floor(Math.random() * 94) + 3; // 3% -> 97%
      const baseDuration = isBalloons ? 9 + (idx % 5) * 2.5 : 12 + (idx % 7) * 3;
      const duration = isBursting ? Math.max(5, baseDuration * 0.6) : baseDuration;
      const delay = -((idx * 1.8) % 12);
      const size = isBalloons ? 20 + (idx % 4) * 6 : 14 + (idx % 5) * 4;
      const opacity = 0.5 + (idx % 5) * 0.11;

      // Gắn hình ảnh chuyên biệt theo yêu cầu của người dùng
      let customImg = null;
      let imgType = null;

      if (is304) {
        if (idx % 4 === 0) {
          customImg = '/festive/flag-vn-waving.png';
          imgType = 'flag-vn';
        } else if (idx % 4 === 2) {
          customImg = '/festive/flag-liberation-30-4.png';
          imgType = 'flag-liberation';
        }
      } else if (is29) {
        if (idx % 3 === 0) {
          customImg = '/festive/event-2-9-ribbon.png';
          imgType = 'ribbon-29';
        }
      } else if (is83) {
        if (idx % 4 === 0) {
          customImg = '/festive/event-8-3-heart.jpg';
          imgType = 'heart-83';
        }
      }

      return {
        id: idx,
        char,
        customImg,
        imgType,
        left,
        duration,
        delay,
        size,
        opacity,
        isBalloons,
      };
    });
  }, [activeSeason.id, activeFestiveEvent?.id, activeFestiveEvent?.particles, isBursting]);

  if (effect === 'none') return null;

  return (
    <div
      className={`ambient-container ambient-${effect} season-theme-${activeSeason.id} ${activeFestiveEvent ? `festive-event-${activeFestiveEvent.id}` : ''}`}
      aria-hidden="true"
    >
      {/* Floating orbs / luminous particles */}
      <div className="ambient-orb orb-1"></div>
      <div className="ambient-orb orb-2"></div>
      <div className="ambient-orb orb-3"></div>
      <div className="ambient-orb orb-4"></div>
      <div className="ambient-mesh-glow"></div>

      {/* Hiệu ứng hạt rơi sự kiện lễ hội hoặc 4 mùa thời tiết tự nhiên (Chuyển đổi chậm rãi êm dịu) */}
      <div className={`seasonal-particles-wrap ${isCrossFading ? 'is-cross-fading' : ''}`}>
        {seasonalFlakes.map((flake) => (
          <span
            key={flake.id}
            className={`seasonal-flake season-item-${activeSeason.id} ${flake.isBalloons ? 'is-floating-balloon' : ''} ${flake.imgType ? `is-${flake.imgType}` : ''}`}
            style={{
              left: `${flake.left}%`,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
              fontSize: `${flake.size}px`,
              opacity: flake.opacity,
            }}
          >
            {flake.customImg ? (
              <img
                src={flake.customImg}
                alt="Festive particle"
                className={`ambient-flake-img fluid-waving-${flake.imgType}`}
              />
            ) : (
              flake.char
            )}
          </span>
        ))}
      </div>
    </div>
  );
};
