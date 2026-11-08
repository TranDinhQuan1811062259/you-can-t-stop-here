import React, { useState, useEffect } from 'react';
import { playClickSound, playFestiveEventSound, playTank304TransitionSound } from '../../utils/soundEffects';
import { Tank3DCanvas } from './Tank3DCanvas';
import { Soldier3DCanvas } from './Soldier3DCanvas';
import { SoldiersParade29 } from './SoldiersParade29';

export const FestiveShowcaseModal = ({ isOpen, onClose, event, onOpenAdminManager, user }) => {
  const [activeTab, setActiveTab] = useState('celebrate'); // 'celebrate' | 'details'
  const [confettiActive, setConfettiActive] = useState(false);
  const [showLiveParade, setShowLiveParade] = useState(false);
  const [showLiveTank, setShowLiveTank] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setConfettiActive(true);
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
    playFestiveEventSound(event);
    setConfettiActive(true);
    window.dispatchEvent(
      new CustomEvent('freedom_festive_burst', {
        detail: { eventId: event.id, duration: 6000 },
      })
    );
    setTimeout(() => setConfettiActive(false), 3000);
  };

  const handleTriggerParade = () => {
    playFestiveEventSound('quoc_khanh_2_9');
    setShowLiveParade(true);
    setTimeout(() => setShowLiveParade(false), 3400);
  };

  const handleTriggerTankParade = () => {
    playTank304TransitionSound();
    setShowLiveTank(true);
    setTimeout(() => setShowLiveTank(false), 3500);
  };

  return (
    <div className="modal-backdrop festive-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      {/* Khối duyệt binh toàn màn hình khi người dùng bấm nút kích hoạt */}
      {showLiveParade && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100010, pointerEvents: 'none' }}>
          <SoldiersParade29 style={{ position: 'fixed', bottom: '6%', zIndex: 100010 }} />
        </div>
      )}

      {/* Xe tăng 565 lướt qua toàn màn hình khi người dùng bấm nút kích hoạt */}
      {showLiveTank && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100010, pointerEvents: 'none' }}>
          <Tank3DCanvas mode="parade" style={{ position: 'fixed', inset: 0, zIndex: 100010 }} />
        </div>
      )}

      <div
        className={`modal-container festive-showcase-container event-type-${event.id}`}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        {/* Nút đóng */}
        <button type="button" className="festive-modal-close-icon" onClick={onClose} aria-label="Đóng">
          ✕
        </button>

        {/* Tiêu đề sự kiện */}
        <div className="festive-modal-header">
          <div className="festive-modal-badge">
            <span className="badge-sparkle">✨</span>
            <span className="badge-text">{event.shortName || event.name}</span>
            <span className="badge-sparkle">✨</span>
          </div>
          <h2 className="festive-modal-title">{event.bannerTitle || event.name}</h2>
          <p className="festive-modal-slogan">
            {event.bannerDesc || event.slogan || 'Không gian chia sẻ và tôn vinh những khoảnh khắc ý nghĩa của dân tộc!'}
          </p>
        </div>

        {/* Khung Hero Trưng Bày Đồ Họa 3D Tung Bay Dẻo Dẻo */}
        <div className="festive-stage-showcase">
          {/* =========================================================================
              30/4: XE TĂNG 565 NGUYÊN MẪU DUYỆT BINH & 3D INTERACTIVE VIEWER
             ========================================================================= */}
          {is304 && (
            <div className="festive-flags-duo-stage" style={{ flexDirection: 'column', gap: '14px' }}>
              {/* Cỗ Xe Tăng T-54B Số Hiệu 565 3D WebGL Three.js Tương Tác 360 độ */}
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
                    🕹️ Giữ chuột và kéo để xoay 360° xe tăng 565
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
                    Nguyên mẫu T-54B số hiệu 565
                  </span>
                </div>
              </div>

              {/* Ảnh tư liệu thực tế Xe tăng 565 duyệt binh */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  borderRadius: '14px',
                  padding: '8px 12px',
                  border: '1px solid rgba(250, 204, 21, 0.35)',
                }}
              >
                <img
                  src="/festive/tank-565-parade.jpg"
                  alt="Xe tăng 565 duyệt binh thực tế"
                  style={{ width: '110px', height: '65px', objectFit: 'cover', borderRadius: '8px' }}
                />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ color: '#facc15', fontWeight: 900, fontSize: '0.85rem' }}>
                    ★ Xe Tăng T-54B Số Hiệu 565 Duyệt Binh (Báo Thanh Niên)
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.74rem', marginTop: '2px' }}>
                    Sơn rằn ri ngụy trang 3 tông màu, giáp ERA mũi xe, trưởng xe đứng chào quân lễ kiêu hãnh.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerTankParade}
                  style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    color: '#fef08a',
                    border: '1px solid #facc15',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontWeight: 800,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  💥 Lướt qua màn hình
                </button>
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

          {/* =========================================================================
              2/9: KHỐI TIÊU BINH & CHIẾN SĨ QĐNDVN DUYỆT BINH RƯỚC CỜ
             ========================================================================= */}
          {is29 && (
            <div className="festive-parade-29-stage" style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
              {/* Mô hình 3D Người Chiến Sĩ QĐNDVN K20 Tương Tác 360 độ */}
              <div
                style={{
                  width: '100%',
                  height: '240px',
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: 'radial-gradient(circle at 50% 50%, #1e293b 0%, #090d16 100%)',
                  border: '1.5px solid rgba(218, 37, 29, 0.55)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(218, 37, 29, 0.25)',
                }}
              >
                <Soldier3DCanvas mode="showcase" width="100%" height="100%" />
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
                    🕹️ Giữ chuột và kéo để xoay 360° chiến sĩ K20
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
                    Quân phục K20 & Cờ Quyết Thắng 3D
                  </span>
                </div>
              </div>

              {/* Hai khối hình ảnh chiến sĩ & tiêu binh hào hùng */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                {/* 1. Khối Tiêu Binh Rước Cờ Quyết Thắng */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1.5px solid #facc15',
                    boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
                  }}
                >
                  <img
                    src="/festive/soldiers-marching-29.jpg"
                    alt="Khối tiêu binh duyệt binh rước cờ Quyết Thắng 2/9"
                    style={{ width: '100%', height: '155px', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.95) 100%)',
                      padding: '6px 10px',
                      color: '#facc15',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>🚩 Khối Tiêu Binh Giương Cờ</span>
                    <span style={{ color: '#fff', fontSize: '0.68rem' }}>QĐNDVN</span>
                  </div>
                </div>

                {/* 2. Người Chiến Sĩ K20 Quân Đội Nhân Dân Việt Nam */}
                <div
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1.5px solid #facc15',
                    boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
                  }}
                >
                  <img
                    src="/festive/soldier-vietnam-k20.jpg"
                    alt="Người chiến sĩ Quân Đội Nhân Dân Việt Nam quân phục K20"
                    style={{ width: '100%', height: '155px', objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(180deg, transparent 0%, rgba(15, 23, 42, 0.95) 100%)',
                      padding: '6px 10px',
                      color: '#facc15',
                      fontWeight: 800,
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>🎖️ Người Lính K20 Kiên Cường</span>
                    <span style={{ color: '#fff', fontSize: '0.68rem' }}>Sẵn Sàng</span>
                  </div>
                </div>
              </div>

              {/* Nút bấm kích hoạt khối duyệt binh chạy qua màn hình ngay lập tức */}
              <button
                type="button"
                onClick={handleTriggerParade}
                style={{
                  background: 'linear-gradient(135deg, #da251d 0%, #b91c1c 100%)',
                  color: '#fef08a',
                  border: '1.5px solid #facc15',
                  borderRadius: '12px',
                  padding: '11px 18px',
                  fontWeight: 900,
                  fontSize: '0.88rem',
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 18px rgba(218, 37, 29, 0.55)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>🎖️ BẤM ĐỂ KHỐI DUYỆT BINH CHẠY QUA MÀN HÌNH</span>
                <span>🇻🇳</span>
              </button>

              <div className="festive-stage-caption" style={{ marginTop: '4px' }}>
                <span className="caption-star">⭐</span>
                <strong>BẢN TUYÊN NGÔN ĐỘC LẬP 2/9/1945</strong> • Độc lập - Tự do - Hạnh phúc
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
              {isHalloween &&
                'Chúc bạn một mùa lễ hội Halloween ngập tràn sắc màu bí ẩn, xua tan mọi áp lực thường nhật và thỏa sức sáng tạo trong không gian huyền ảo lung linh!'}
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
                ? 'Thả Cờ Bay & Sao Vàng Ngập Tràn'
                : is29
                ? 'Thả Cờ Đỏ Sao Vàng 2/9'
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
