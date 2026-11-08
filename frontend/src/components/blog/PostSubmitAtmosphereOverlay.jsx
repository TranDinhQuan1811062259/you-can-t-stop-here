import React, { useEffect, useState, useMemo } from 'react';
import { Tank3DCanvas } from '../common/Tank3DCanvas';
import { SoldiersParade29 } from '../common/SoldiersParade29';
import { playClickSound, playTank304TransitionSound, playFestiveEventSound, getAudioContext } from '../../utils/soundEffects';

/**
 * PostSubmitAtmosphereOverlay - Bộ hiệu ứng đăng bài viết theo Mùa Màng & Sự Kiện Lễ Hội
 * - 30/4: Xe tăng 3D gầm rú lao tới rồi bị xoắn ốc hút thẳng vào tâm nút button đăng bài!
 * - Tết Dương Lịch & Tết Âm Lịch: Pháo hoa bắn đầy trời rực rỡ như đêm giao thừa đếm ngược!
 * - Halloween: Đàn dơi túa ra từ nút đăng bài, bí ngô phát sáng ma mị, bóng ma uốn lượn!
 * - 2/9, 8/3, 20/10, 1/6, 20/11, Noel: Hiệu ứng sáng tạo chuyên biệt theo từng ngày lễ!
 * - 4 Mùa tự nhiên (khi không có sự kiện):
 *   + Xuân: Chồi biếc nảy mầm, hoa đào hoa mai bung nở tỏa hương.
 *   + Hạ: Cột nắng thiên đường (God Rays) chiếu rọi, đom đóm dạ quang bay bổng.
 *   + Thu: Lốc xoáy lá phong đỏ cuốn tròn quanh nút đăng bài.
 *   + Đông: Bão tuyết ngưng tụ thành đại hoa tuyết pha lê phát sáng.
 */
export const PostSubmitAtmosphereOverlay = ({
  activeSeason,
  activeEvent,
  buttonRect,
  onComplete,
}) => {
  const [phase, setPhase] = useState('init'); // 'init' -> 'active' -> 'burst' -> 'done'

  // Phân loại sự kiện ưu tiên
  const atmosphereType = useMemo(() => {
    const eventId = String(activeEvent?.id || '').toLowerCase();
    const eventName = String(activeEvent?.name || '').toLowerCase();

    if (eventId.includes('30_4') || eventId.includes('30/4') || eventId.includes('giai_phong') || eventName.includes('30/4')) {
      return 'tank_304_vortex';
    }
    if (eventId.includes('tet_duong') || eventId.includes('tet_nguyen') || eventId.includes('nam_moi') || (eventName.includes('tết') && !eventName.includes('trung thu'))) {
      return 'new_year_fireworks';
    }
    if (eventId.includes('halloween') || eventName.includes('halloween') || eventName.includes('ma quái')) {
      return 'halloween_spooky';
    }
    if (eventId.includes('2_9') || eventId.includes('quoc_khanh') || eventName.includes('2/9')) {
      return 'national_day_29';
    }
    if (eventId.includes('8_3') || eventId.includes('20_10') || eventName.includes('8/3') || eventName.includes('20/10') || eventName.includes('phụ nữ')) {
      return 'women_flowers_vortex';
    }
    if (eventId.includes('1_6') || eventName.includes('thiếu nhi') || eventName.includes('1/6')) {
      return 'balloons_confetti';
    }
    if (eventId.includes('20_11') || eventName.includes('nhà giáo') || eventName.includes('20/11')) {
      return 'teachers_golden_book';
    }
    if (eventId.includes('giang_sinh') || eventId.includes('noel') || eventName.includes('giáng sinh') || eventName.includes('noel')) {
      return 'christmas_sleigh_gifts';
    }

    // Mặc định theo mùa
    return `season_${activeSeason?.id || 'winter'}`;
  }, [activeEvent, activeSeason]);

  // Vị trí tâm nút button Đăng bài
  const btnCenter = useMemo(() => {
    if (!buttonRect) {
      return { x: window.innerWidth / 2, y: window.innerHeight * 0.72 };
    }
    return {
      x: buttonRect.left + buttonRect.width / 2,
      y: buttonRect.top + buttonRect.height / 2,
      width: buttonRect.width,
      height: buttonRect.height,
    };
  }, [buttonRect]);

  useEffect(() => {
    setPhase('active');

    // Kích hoạt âm thanh tương ứng
    if (atmosphereType === 'tank_304_vortex') {
      playTank304TransitionSound();
    } else if (atmosphereType === 'new_year_fireworks') {
      playFestiveEventSound('tet_duong_lich');
    } else if (activeEvent) {
      playFestiveEventSound(activeEvent);
    } else {
      playClickSound();
    }

    // Thời gian diễn ra animation trước khi hoàn tất (2.6 giây)
    const burstTimer = setTimeout(() => {
      setPhase('burst');
    }, 1800);

    const finishTimer = setTimeout(() => {
      setPhase('done');
      if (onComplete) onComplete();
    }, 2600);

    return () => {
      clearTimeout(burstTimer);
      clearTimeout(finishTimer);
    };
  }, [atmosphereType]);

  return (
    <div
      className={`post-submit-fx-overlay fx-${atmosphereType} phase-${phase}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* Phông nền huyền ảo mờ tối nhẹ để tôn vinh hiệu ứng */}
      <div
        className="post-submit-backdrop-glow"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            atmosphereType === 'new_year_fireworks'
              ? 'radial-gradient(circle at 50% 60%, rgba(15, 23, 42, 0.92) 0%, rgba(2, 6, 23, 0.98) 100%)'
              : atmosphereType === 'halloween_spooky'
              ? 'radial-gradient(circle at 50% 50%, rgba(88, 28, 135, 0.88) 0%, rgba(15, 23, 42, 0.96) 100%)'
              : 'radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.65) 0%, rgba(15, 23, 42, 0.85) 100%)',
          backdropFilter: 'blur(6px)',
          animation: 'backdropFadeIn 0.35s ease forwards',
        }}
      />

      {/* =====================================================================
          1. 30/4: XE TĂNG 3D XOÁY ỐC HÚT VÀO NÚT BUTTON ĐĂNG BÀI!
         ===================================================================== */}
      {atmosphereType === 'tank_304_vortex' && (
        <div className="submit-fx-tank304-wrap">
          {/* Canvas Three.js hiển thị cỗ xe tăng 3D xoáy tròn vào nút */}
          <Tank3DCanvas
            mode="vortex_suction"
            targetPoint={btnCenter}
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0 }}
          />

          {/* Cổng hút xoáy năng lượng (Suction Vortex Ring) bao quanh nút button */}
          <div
            className="submit-button-suction-vortex"
            style={{
              position: 'absolute',
              left: `${btnCenter.x}px`,
              top: `${btnCenter.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="vortex-core-ring" />
            <div className="vortex-spiral-ring" />
            <div className="vortex-gold-flare" />
          </div>

          {/* Banner chúc mừng 30/4 đại thắng */}
          <div className="submit-fx-center-banner banner-304">
            <span className="banner-icon-star">★</span>
            <div className="banner-title-text">30/4 ĐẠI THẮNG • ĐÃ TRÚT BẦU TÂM SỰ!</div>
            <div className="banner-sub-text">Hào khí non sông • Tiếp thêm sức mạnh vượt qua mọi thử thách</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          2. TẾT DƯƠNG LỊCH & TẾT ÂM LỊCH: PHÁO HOA BẮN ĐẦY TRỜI ĐÊM GIAO THỪA!
         ===================================================================== */}
      {atmosphereType === 'new_year_fireworks' && (
        <div className="submit-fx-fireworks-wrap">
          {/* Mưa sao băng & Pháo hoa đa tầng */}
          <div className="fireworks-sky-container">
            {/* Đợt 1: Bắn từ dưới lên */}
            <div className="grand-firework-burst burst-1" style={{ left: '22%', top: '28%' }}>
              <div className="fw-flash" />
              {[...Array(24)].map((_, i) => (
                <span
                  key={i}
                  className="fw-spark spark-red"
                  style={{ transform: `rotate(${i * 15}deg) translate(85px)` }}
                />
              ))}
            </div>

            {/* Đợt 2: Quả pháo đại bác trung tâm đỉnh cao */}
            <div className="grand-firework-burst burst-center-climax" style={{ left: '50%', top: '22%' }}>
              <div className="fw-flash fw-flash-gold" />
              {[...Array(32)].map((_, i) => (
                <span
                  key={i}
                  className="fw-spark spark-gold"
                  style={{ transform: `rotate(${i * 11.25}deg) translate(120px)` }}
                />
              ))}
            </div>

            {/* Đợt 3: Pháo hoa góc phải */}
            <div className="grand-firework-burst burst-3" style={{ left: '78%', top: '32%' }}>
              <div className="fw-flash fw-flash-cyan" />
              {[...Array(24)].map((_, i) => (
                <span
                  key={i}
                  className="fw-spark spark-cyan"
                  style={{ transform: `rotate(${i * 15}deg) translate(90px)` }}
                />
              ))}
            </div>
          </div>

          {/* Cơn mưa hoa mai hoa đào & bao lì xì đỏ giao thừa rơi khắp màn hình */}
          <div className="giao-thua-floating-items">
            {['🧧', '🌸', '🌼', '✨', '🏮', '🎆', '🧨', '🎉', '🥂'].map((item, idx) => (
              <span
                key={idx}
                className="giao-thua-item"
                style={{
                  left: `${10 + idx * 10}%`,
                  animationDelay: `${idx * 0.15}s`,
                  fontSize: `${1.8 + (idx % 3) * 0.5}rem`,
                }}
              >
                {item}
              </span>
            ))}
          </div>

          <div className="submit-fx-center-banner banner-tet">
            <span className="banner-icon-tet">🎆</span>
            <div className="banner-title-text">CHÚC MỪNG NĂM MỚI • VẠN SỰ NHƯ Ý!</div>
            <div className="banner-sub-text">Khép lại năm cũ, vững vàng đón nhận vạn điều may mắn và bình an</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. HALLOWEEN: ĐÀN DƠI TÚA RA TỪ NÚT, BÍ NGÔ SÁNG & MA QUÁI!
         ===================================================================== */}
      {atmosphereType === 'halloween_spooky' && (
        <div className="submit-fx-halloween-wrap">
          {/* Đàn dơi đen bay túa ra từ vị trí nút button */}
          <div
            className="bats-eruption-portal"
            style={{
              position: 'absolute',
              left: `${btnCenter.x}px`,
              top: `${btnCenter.y}px`,
            }}
          >
            {[...Array(14)].map((_, i) => (
              <span
                key={i}
                className={`halloween-bat bat-${i}`}
                style={{
                  animationDelay: `${i * 0.08}s`,
                  transform: `rotate(${(i * 26) - 170}deg) translate(${60 + i * 18}px)`,
                }}
              >
                🦇
              </span>
            ))}
          </div>

          {/* Quả bí ngô ma quái 3D lập lòe phát sáng ở trung tâm */}
          <div className="halloween-pumpkin-center">
            <div className="pumpkin-jack-o-lantern">🎃</div>
            <div className="pumpkin-purple-fog" />
            <div className="halloween-spirits">
              <span className="ghost-float ghost-1">👻</span>
              <span className="ghost-float ghost-2">👻</span>
            </div>
          </div>

          <div className="submit-fx-center-banner banner-halloween">
            <span className="banner-icon-halloween">🎃</span>
            <div className="banner-title-text">TRICK OR TREAT • BÀI VIẾT ĐÃ LÊN SÓNG!</div>
            <div className="banner-sub-text">Đêm hội hóa trang ma mị • Trút bỏ mọi âu lo vào bóng tối</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. 2/9: QUỐC KHÁNH - HÀO QUANG MẶT TRỜI, ĐOÀN QUÂN TIÊU BINH & CỜ ĐỎ SAO VÀNG!
         ===================================================================== */}
      {atmosphereType === 'national_day_29' && (
        <div className="submit-fx-national-day-wrap">
          <div className="national-day-sunburst" />
          <div className="national-day-flag-center">
            <span className="national-day-star">★</span>
            <div className="peace-doves">🕊️ 🕊️ 🕊️</div>
          </div>

          {/* Đoàn quân tiêu binh giương cao cờ Tổ quốc & cờ Quyết Thắng duyệt binh qua màn hình */}
          <SoldiersParade29 style={{ bottom: '8%' }} />

          <div className="submit-fx-center-banner banner-29">
            <span className="banner-icon-star">🇻🇳</span>
            <div className="banner-title-text">2/9 QUỐC KHÁNH • TỰ HÀO VIỆT NAM!</div>
            <div className="banner-sub-text">Độc lập - Tự do - Hạnh phúc ngập tràn</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. 8/3 & 20/10: CƠN MƯA HOA HỒNG & TRÁI TIM BỒNG BỀNH YÊU THƯƠNG!
         ===================================================================== */}
      {atmosphereType === 'women_flowers_vortex' && (
        <div className="submit-fx-women-flowers-wrap">
          <div className="women-flowers-rain">
            {['🌹', '🌷', '🌸', '💖', '💐', '🌺', '✨', '🎀'].map((item, idx) => (
              <span
                key={idx}
                className="women-flower-petal"
                style={{
                  left: `${12 + idx * 11}%`,
                  animationDelay: `${idx * 0.12}s`,
                  fontSize: `${2.2 + (idx % 3) * 0.4}rem`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="submit-fx-center-banner banner-women">
            <span className="banner-icon-women">🌹</span>
            <div className="banner-title-text">GỬI TRỌN YÊU THƯƠNG &amp; THẤU CẢM!</div>
            <div className="banner-sub-text">Bạn xứng đáng được nâng niu, hạnh phúc và bình yên</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. 1/6 THIẾU NHI: CHÙM BÓNG BAY VÚT CAO & PHÁO GIẤY CONFETTI!
         ===================================================================== */}
      {atmosphereType === 'balloons_confetti' && (
        <div className="submit-fx-balloons-wrap">
          <div className="balloons-stream">
            {['🎈', '🍭', '🎡', '🧸', '⭐', '✨', '🎉'].map((item, idx) => (
              <span
                key={idx}
                className="balloon-fly-item"
                style={{
                  left: `${15 + idx * 12}%`,
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="submit-fx-center-banner banner-kids">
            <span className="banner-icon-kids">🎈</span>
            <div className="banner-title-text">GIỮ MÃI NỤ CƯỜI TRONG TRẺO TUỔI THƠ!</div>
            <div className="banner-sub-text">Nuôi dưỡng ước mơ và niềm vui hồn nhiên mỗi ngày</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          7. 20/11: TRANG GIÁO ÁN VÀNG & BỤI PHẤN SAO TRI ÂN!
         ===================================================================== */}
      {atmosphereType === 'teachers_golden_book' && (
        <div className="submit-fx-teachers-wrap">
          <div className="teachers-sunflowers">
            {['🌻', '📖', '🖋️', '✨', '💐', '🏆'].map((item, idx) => (
              <span
                key={idx}
                className="teacher-item"
                style={{
                  left: `${16 + idx * 12}%`,
                  animationDelay: `${idx * 0.12}s`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="submit-fx-center-banner banner-teacher">
            <span className="banner-icon-teacher">🌻</span>
            <div className="banner-title-text">TRI ÂN NHỮNG NGƯỜI LÁI ĐÒ THẦM LẶNG!</div>
            <div className="banner-sub-text">Tôn sư trọng đạo • Khắc ghi công ơn dạy dỗ nên người</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          8. GIÁNG SINH: CỖ XE TUẦN LỘC BAY QUA & HỘP QUÀ MỞ TUNG!
         ===================================================================== */}
      {atmosphereType === 'christmas_sleigh_gifts' && (
        <div className="submit-fx-christmas-wrap">
          <div className="christmas-sleigh-flight">
            <span className="santa-sleigh-team">🎅 🛷 🦌 🦌</span>
            <span className="stardust-trail">✨ ⭐ 🌟 ✨ ⭐</span>
          </div>
          <div className="submit-fx-center-banner banner-xmas">
            <span className="banner-icon-xmas">🎄</span>
            <div className="banner-title-text">MERRY CHRISTMAS • AN LÀNH &amp; ẤM ÁP!</div>
            <div className="banner-sub-text">Hơi ấm yêu thương xua tan đi cái lạnh mùa đông</div>
          </div>
        </div>
      )}

      {/* =====================================================================
          9. KHI KHÔNG CÓ SỰ KIỆN: HIỆU ỨNG THEO 4 MÙA TỰ NHIÊN
         ===================================================================== */}
      {/* 9A. MÙA XUÂN */}
      {atmosphereType === 'season_spring' && (
        <div className="submit-fx-season-wrap season-spring-fx">
          <div className="spring-sprouts-bloom">
            {['🌸', '💮', '🌱', '🌷', '🌿', '✨', '🌸'].map((item, idx) => (
              <span
                key={idx}
                className="spring-bloom-item"
                style={{
                  left: `${14 + idx * 12}%`,
                  animationDelay: `${idx * 0.1}s`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="submit-fx-center-banner banner-spring">
            <span className="banner-icon-spring">🌸</span>
            <div className="banner-title-text">CHỒI BIẾC NẢY MẦM • HY VỌNG TƯƠI MỚI!</div>
            <div className="banner-sub-text">Cảm ơn bạn đã sẻ chia tâm tư. Mùa xuân luôn ở cạnh bạn!</div>
          </div>
        </div>
      )}

      {/* 9B. MÙA HẠ */}
      {atmosphereType === 'season_summer' && (
        <div className="submit-fx-season-wrap season-summer-fx">
          <div className="summer-godrays-pillar" />
          <div className="summer-fireflies">
            {['✨', '☀️', '⭐', '🌻', '✨', '☀️'].map((item, idx) => (
              <span
                key={idx}
                className="summer-firefly-item"
                style={{
                  left: `${15 + idx * 14}%`,
                  animationDelay: `${idx * 0.12}s`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="submit-fx-center-banner banner-summer">
            <span className="banner-icon-summer">☀️</span>
            <div className="banner-title-text">ÁNH DƯƠNG RỰC RỠ • NĂNG LƯỢNG CĂNG TRÀN!</div>
            <div className="banner-sub-text">Sau cơn mưa trời lại sáng. Hãy tiếp tục vững bước nhé!</div>
          </div>
        </div>
      )}

      {/* 9C. MÙA THU */}
      {atmosphereType === 'season_autumn' && (
        <div className="submit-fx-season-wrap season-autumn-fx">
          <div className="autumn-leaves-vortex">
            {['🍂', '🍁', '🍃', '🌾', '🍁', '🍂'].map((item, idx) => (
              <span
                key={idx}
                className="autumn-leaf-vortex-item"
                style={{
                  left: `${15 + idx * 13}%`,
                  animationDelay: `${idx * 0.14}s`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="submit-fx-center-banner banner-autumn">
            <span className="banner-icon-autumn">🍁</span>
            <div className="banner-title-text">LÁ VÀNG XAO XUYẾN • BÌNH YÊN DỊU ÊM!</div>
            <div className="banner-sub-text">Từng trang tâm sự như chiếc lá vàng nhẹ nhàng đáp xuống tâm hồn</div>
          </div>
        </div>
      )}

      {/* 9D. MÙA ĐÔNG */}
      {atmosphereType === 'season_winter' && (
        <div className="submit-fx-season-wrap season-winter-fx">
          <div className="winter-crystal-snowstorm">
            {['❄️', '❅', '✻', '✨', '❄️', '❅'].map((item, idx) => (
              <span
                key={idx}
                className="winter-crystal-flake"
                style={{
                  left: `${16 + idx * 13}%`,
                  animationDelay: `${idx * 0.11}s`,
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div className="submit-fx-center-banner banner-winter">
            <span className="banner-icon-winter">❄️</span>
            <div className="banner-title-text">TUYẾT TRẮNG PHA LÊ • GIỮ ẤM TRÁI TIM!</div>
            <div className="banner-sub-text">Bạn đã dũng cảm nói ra nỗi lòng. Luôn có ngọn lửa ấm sưởi ấm cho bạn</div>
          </div>
        </div>
      )}
    </div>
  );
};
