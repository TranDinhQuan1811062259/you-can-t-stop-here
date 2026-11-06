import React, { useState, useEffect } from 'react';
import { eventService } from '../../services/eventService';
import { playClickSound, playFestiveEventSound } from '../../utils/soundEffects';

export const FloatingFestiveMascot = ({ onOpenShowcase }) => {
  const [activeEvent, setActiveEvent] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const fetchActiveEvent = () => {
    eventService
      .getActiveEvent()
      .then((res) => {
        if (res?.data) {
          setActiveEvent(res.data);
        } else {
          setActiveEvent(null);
        }
      })
      .catch(() => setActiveEvent(null));
  };

  useEffect(() => {
    fetchActiveEvent();
    window.addEventListener('freedom_festive_event_changed', fetchActiveEvent);
    return () => window.removeEventListener('freedom_festive_event_changed', fetchActiveEvent);
  }, []);

  if (!activeEvent || isDismissed) return null;

  const is304 = activeEvent.id === 'giai_phong_30_4' || activeEvent.name?.includes('30/4');
  const is29 = activeEvent.id === 'quoc_khanh_2_9' || activeEvent.name?.includes('2/9');
  const is83 = activeEvent.id === 'quoc_te_phu_nu_8_3' || activeEvent.name?.includes('8/3');

  const handleClick = () => {
    playClickSound();
    if (activeEvent) {
      playFestiveEventSound(activeEvent);
    }
    if (onOpenShowcase) onOpenShowcase(activeEvent);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  return (
    <aside
      className={`floating-festive-mascot-widget event-${activeEvent.id} ${isHovered ? 'hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${activeEvent.name} • Bấm để xem không gian lễ hội đặc biệt!`}
      role="button"
      tabIndex={0}
      aria-label={`Sự kiện ${activeEvent.name}`}
    >
      {/* Nút tắt nhỏ xinh */}
      <button
        type="button"
        className="mascot-dismiss-btn"
        onClick={handleDismiss}
        title="Tạm ẩn biểu tượng sự kiện"
        aria-label="Ẩn"
      >
        ✕
      </button>

      {/* Đồ họa biểu tượng sự kiện bay dẻo dẻo */}
      <div className="mascot-graphic-wrap">
        {is304 && (
          <div className="mascot-flag-container fluid-waving-flag" title="Quốc kỳ Việt Nam tung bay dẻo dẻo">
            <img
              src="/festive/flag-vn-waving.png"
              alt="Cờ Việt Nam"
              className="mascot-flag-img"
            />
            <span className="mascot-flag-glare" />
          </div>
        )}

        {is29 && (
          <div className="mascot-ribbon-container fluid-waving-ribbon" title="Dải lụa 2/9 bay dẻo dẻo">
            <img
              src="/festive/event-2-9-ribbon.png"
              alt="2/9 Dải Lụa Đỏ Vàng"
              className="mascot-ribbon-img"
            />
          </div>
        )}

        {is83 && (
          <div className="mascot-heart8-container fluid-waving-heart8" title="Số 8 trái tim 8/3 bay nhỏ nhỏ">
            <img
              src="/festive/event-8-3-heart.jpg"
              alt="Số 8 Trái Tim"
              className="mascot-heart8-img"
            />
            <span className="mascot-heart-balloon">🎈</span>
          </div>
        )}

        {!is304 && !is29 && !is83 && (
          <div className="mascot-default-icon">
            <span className="mascot-emoji">{activeEvent.icon || '🎊'}</span>
          </div>
        )}
      </div>

      {/* Nhãn nổi nhỏ xinh bên dưới */}
      <div className="mascot-label-pill">
        <span className="mascot-label-text">
          {activeEvent.shortName || (activeEvent.name.includes(':') ? activeEvent.name.split(':')[0] : activeEvent.name)}
        </span>
      </div>
    </aside>
  );
};
