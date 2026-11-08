import React, { useState, useEffect } from 'react';
import { playClickSound, playFestiveEventSound } from '../../utils/soundEffects';
import { Tank3DCanvas } from './Tank3DCanvas';

export const FestiveShowcaseModal = ({ isOpen, onClose, event, onOpenAdminManager, user }) => {
  const [activeTab, setActiveTab] = useState('celebrate'); // 'celebrate' | 'details'
  const [confettiActive, setConfettiActive] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setConfettiActive(true);
      // Kích hoạt âm thanh đặc trưng của sự kiện khi mở popup
      playFestiveEventSound(event);
      const timer = setTimeout(() => setConfettiActive(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, event]);

  if (!isOpen || !event) return null;

  const is304 = event.id === 'giai_phong_30_4' || event.name?.includes('30/4');
  const is29 = event.id === 'quoc_khanh_2_9' || event.name?.includes('2/9');
  const is83 = event.id === 'quoc_te_phu_nu_8_3' || event.name?.includes('8/3');
  const is16 = event.id === 'quoc_te_thieu_nhi_1_6' || event.name?.includes('1/6');
  const isTet = event.id?.includes('tet') || event.name?.toLowerCase().includes('tết');
  const isHalloween =
    event.id === 'le_hoi_halloween' ||
    event.id?.includes('halloween') ||
    event.name?.toLowerCase().includes('halloween');

  const handleTriggerCelebration = () => {
    playClickSound();
    // Phát âm thanh đặc trưng của sự kiện khi bấm nút kích hoạt hiệu ứng
    playFestiveEventSound(event);
    setConfettiActive(true);
    // Phát sự kiện toàn cục để AmbientBackground tăng số lượng hạt bay trong 6 giây
    window.dispatchEvent(
      new CustomEvent('freedom_festive_burst', {
        detail: { eventId: event.id, duration: 6000 },
      })
    );
    setTimeout(() => setConfettiActive(false), 3000);
  };

  return (
    <div className="modal-backdrop festive-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal-container festive-showcase-container event-type-${event.id}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          '--event-color': event.themeColor || '#dc2626',
          '--event-accent': event.accentColor || '#facc15',
        }}
      >
        {/* Nút đóng */}
        <button
          type="button"
          className="modal-close festive-modal-close"
          onClick={onClose}
          aria-label="Đóng popup sự kiện"
        >
          ✕
        </button>

        {/* Cụm Header Lễ Hội */}
        <div className="festive-modal-header">
          <div className="festive-tag-badge">
            <span className="badge-flag-icon">{event.icon || '🎊'}</span>
            <span className="badge-text">
              {is304
                ? 'ĐẠI THẮNG MÙA XUÂN 1975 • QUỐC TẾ LAO ĐỘNG 1/5'
                : is29
                ? 'TẾT ĐỘC LẬP • NGÀY QUỐC KHÁNH 2 THÁNG 9'
                : is83
                ? 'CHÚC MỪNG NGÀY QUỐC TẾ PHỤ NỮ 8/3'
                : 'SỰ KIỆN LỄ HỘI ĐẶC BIỆT TRONG NĂM'}
            </span>
          </div>
          <h2 className="festive-modal-title">{event.name}</h2>
          <p className="festive-modal-slogan">
            {event.bannerDesc || event.slogan || 'Không gian chia sẻ và tôn vinh những khoảnh khắc ý nghĩa của dân tộc!'}
          </p>
        </div>

        {/* Khung Hero Trưng Bày Đồ Họa 3D Tung Bay Dẻo Dẻo */}
        <div className="festive-stage-showcase">
          {is304 && (
            <div className="festive-flags-duo-stage" style={{ flexDirection: 'column', gap: '14px' }}>
              {/* Cỗ Xe Tăng T-54 3D WebGL Three.js Tương Tác 360 độ */}
              <div
                style={{
                  width: '100%',
                  height: '240px',
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #090d16 100%)',
                  border: '1.5px solid rgba(239, 68, 68, 0.45)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(239, 68, 68, 0.2)',
                }}
              >
                <Tank3DCanvas mode="showcase" width="100%" height="100%" />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    left: '12px',
                    right: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: '#facc15',
                      fontWeight: 800,
                      background: 'rgba(0, 0, 0, 0.65)',
                      padding: '3px 10px',
                      borderRadius: '8px',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(250, 204, 21, 0.3)',
                    }}
                  >
                    🕹️ Giữ chuột và kéo để xoay 360° xe tăng 3D
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#cbd5e1',
                      background: 'rgba(0, 0, 0, 0.65)',
                      padding: '3px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    Hỗ trợ file /models/tank3d.glb
                  </span>
                </div>
              </div>

              {/* Hai lá cờ 30/4 tung bay kiêu hãnh */}
              <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                <div className="flag-hero-item flag-vn-waving-wrap" title="Lá cờ đỏ sao vàng Việt Nam tung bay trong gió">
                  <img
                    src="/festive/flag-vn-waving.png"
                    alt="Cờ Đỏ Sao Vàng Việt Nam"
                    className="festive-flag-img fluid-waving-flag"
                  />
                  <span className="flag-shadow-ripple" />
                  <span className="flag-label-pill">🇻🇳 Quốc Kỳ Việt Nam</span>
                </div>

                <div className="flag-hero-item flag-liberation-wrap" title="Cờ Mặt trận Dân tộc Giải phóng miền Nam Việt Nam">
                  <img
                    src="/festive/flag-liberation-30-4.png"
                    alt="Cờ Giải Phóng Miền Nam"
                    className="festive-flag-img fluid-waving-flag liberation-flag"
                  />
                  <span className="flag-shadow-ripple" />
                  <span className="flag-label-pill">🕊️ Cờ Giải Phóng 30/4</span>
                </div>
              </div>
            </div>
          )}

          {is29 && (
            <div className="festive-ribbon-stage" title="Biểu tượng 2/9 dải lụa đỏ uốn lượn bay dẻo dẻo">
              <div className="ribbon-29-wrap">
                <img
                  src="/festive/event-2-9-ribbon.png"
                  alt="Biểu Tượng Quốc Khánh 2/9 Dải Lụa Đỏ Vàng"
                  className="festive-ribbon-img fluid-waving-ribbon"
                />
                <div className="ribbon-sparkle-halo" />
                <div className="ribbon-golden-shine" />
              </div>
              <div className="festive-stage-caption">
                <span className="caption-star">⭐</span>
                <strong>Bản Tuyên Ngôn Độc Lập 1945</strong> • Độc lập - Tự do - Hạnh phúc
                <span className="caption-star">⭐</span>
              </div>
            </div>
          )}

          {is83 && (
            <div className="festive-heart-stage" title="Biểu tượng số 8 trái tim bay nhỏ nhỏ dễ thương">
              <div className="heart-8-visual-wrap">
                <div className="heart-8-3d-card fluid-waving-heart8">
                  <img
                    src="/festive/event-8-3-heart.jpg"
                    alt="Số 8 Trái Tim 8/3"
                    className="festive-heart8-img"
                  />
                  {/* Chùm bóng bay pastel bay lơ lửng */}
                  <div className="mini-floating-balloons-cluster">
                    <span className="balloon-p p1">🎈</span>
                    <span className="balloon-p p2">💖</span>
                    <span className="balloon-p p3">🌸</span>
                    <span className="balloon-p p4">✨</span>
                  </div>
                </div>
              </div>
              <div className="festive-stage-caption heart-caption">
                🌷 Gửi trọn yêu thương & sự biết ơn tới những người phụ nữ tuyệt vời! 💖
              </div>
            </div>
          )}

          {isHalloween && (
            <div className="festive-halloween-stage" style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 0 20px #f97316) drop-shadow(0 0 40px #7c3aed)' }}>
                🎃
              </div>
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '8px', fontSize: '1.8rem' }}>
                <span title="Dơi đêm">🦇</span>
                <span title="Bóng ma huyền bí">👻</span>
                <span title="Mạng nhện">🕸️</span>
                <span title="Kẹo ngọt Trick or Treat">🍬</span>
                <span title="Nhện đêm">🕷️</span>
              </div>
              <div className="festive-stage-caption" style={{ color: '#c084fc', marginTop: '10px', fontWeight: 800 }}>
                🎃 Đêm Hội Ma Quái Halloween • Spooky &amp; Magical Night 👻
              </div>
            </div>
          )}

          {!is304 && !is29 && !is83 && !isHalloween && (
            <div className="festive-default-stage">
              <div className="default-festive-icon-circle">
                <span className="big-festive-icon">{event.icon || '🎊'}</span>
              </div>
              <div className="festive-stage-caption">
                {event.bannerTitle || event.name}
              </div>
            </div>
          )}
        </div>

        {/* Thông điệp & Lời chúc ý nghĩa */}
        <div className="festive-message-box">
          <div className="festive-quote-card">
            <span className="quote-mark">“</span>
            <p className="quote-body">
              {is304 &&
                'Non sông thống nhất, Bắc Nam một nhà. Tri ân ngàn đời những người con anh hùng đã ngã xuống vì độc lập tự do của Tổ quốc! Chúc toàn thể người đi làm một kỳ nghỉ lễ 30/4 & 1/5 ngập tràn niềm vui và bình yên bên người thân.'}
              {is29 &&
                'Bản Tuyên ngôn Độc lập vang vọng ngàn đời: "Nước Việt Nam có quyền hưởng tự do và độc lập, và sự thật đã thành một nước tự do, độc lập!" Tự hào Việt Nam vươn mình mạnh mẽ.'}
              {is83 &&
                'Chúc một nửa thế giới luôn rạng ngời, tự tin, được yêu thương và trân trọng mỗi ngày. Cảm ơn bạn vì đã mang đến sự ấm áp và kỳ diệu cho cuộc sống này!'}
              {isHalloween && (
            <div className="festive-halloween-stage" style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 0 20px #f97316) drop-shadow(0 0 40px #7c3aed)' }}>
                🎃
              </div>
              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginTop: '8px', fontSize: '1.8rem' }}>
                <span title="Dơi đêm">🦇</span>
                <span title="Bóng ma huyền bí">👻</span>
                <span title="Mạng nhện">🕸️</span>
                <span title="Kẹo ngọt Trick or Treat">🍬</span>
                <span title="Nhện đêm">🕷️</span>
              </div>
              <div className="festive-stage-caption" style={{ color: '#c084fc', marginTop: '10px', fontWeight: 800 }}>
                🎃 Đêm Hội Ma Quái Halloween • Spooky &amp; Magical Night 👻
              </div>
            </div>
          )}

          {!is304 && !is29 && !is83 && !isHalloween && (event.bannerTitle || event.name)}
            </p>
            <span className="quote-mark end">”</span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="festive-actions-row">
          <button
            type="button"
            className={`festive-btn-burst ${confettiActive ? 'is-bursting' : ''}`}
            onClick={handleTriggerCelebration}
            title="Thả hiệu ứng cờ bay & hạt lấp lánh ngập tràn màn hình"
          >
            <span className="btn-burst-icon">✨</span>
            <span>
              {is304
                ? 'Thả Cờ Bay Ngập Tràn Màn Hình'
                : is29
                ? 'Thả Dải Lụa 2/9 & Sao Vàng'
                : is83
                ? 'Thả Bóng Bay & Trái Tim'
                : 'Kích Hoạt Hiệu Ứng Bùng Nổ'}
            </span>
          </button>

          {user?.role === 'admin' && (
            <button
              type="button"
              className="festive-btn-admin-config"
              onClick={() => {
                onClose();
                if (onOpenAdminManager) onOpenAdminManager();
              }}
              title="Quản trị viên cài đặt ngày bắt đầu và thời lượng sự kiện"
            >
              <span>⚙️</span>
              <span>Cài Đặt Sự Kiện (Admin)</span>
            </button>
          )}

          <button type="button" className="festive-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
