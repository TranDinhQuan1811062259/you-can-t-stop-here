import React, { useEffect, useState } from 'react';
import { playPageTransitionAtmosphereSound } from '../../utils/soundEffects';

export const PageTransitionAtmosphereOverlay = ({
  isTransitioning,
  direction = 'forward',
  activeSeason,
  activeEvent,
}) => {
  const [visible, setVisible] = useState(false);

  // Xác định hiệu ứng nào sẽ hiển thị (Ưu tiên Sự Kiện Lễ Hội -> Mùa Màng)
  const getAtmosphereType = () => {
    const eventId = String(activeEvent?.id || '').toLowerCase();
    const eventName = String(activeEvent?.name || '').toLowerCase();

    if (
      eventId.includes('30_4') ||
      eventId.includes('30/4') ||
      eventId.includes('giai_phong') ||
      eventName.includes('30/4')
    ) {
      return 'event_tank_304';
    }
    if (
      eventId.includes('2_9') ||
      eventId.includes('2/9') ||
      eventId.includes('quoc_khanh') ||
      eventName.includes('2/9')
    ) {
      return 'event_national_day_29';
    }
    if (
      eventId.includes('trung_thu') ||
      eventId.includes('rằm') ||
      eventName.includes('trung thu')
    ) {
      return 'event_mid_autumn';
    }
    if (
      eventId.includes('20_11') ||
      eventId.includes('nha_giao') ||
      eventName.includes('20/11') ||
      eventName.includes('nhà giáo') ||
      eventName.includes('thầy cô')
    ) {
      return 'event_teachers_day_chalk';
    }
    if (
      eventId.includes('tet_duong') ||
      eventId.includes('tet_nguyen') ||
      eventId.includes('nam_moi') ||
      eventId.includes('new_year') ||
      (eventName.includes('tết') && !eventName.includes('trung thu'))
    ) {
      return 'event_fireworks_tet';
    }
    if (
      eventId.includes('giang_sinh') ||
      eventId.includes('noel') ||
      eventId.includes('christmas') ||
      eventName.includes('noel') ||
      eventName.includes('giáng sinh')
    ) {
      return 'event_santa_sleigh';
    }
    if (
      eventId.includes('phu_nu') ||
      eventId.includes('8_3') ||
      eventId.includes('20_10') ||
      eventName.includes('8/3') ||
      eventName.includes('20/10') ||
      eventName.includes('phụ nữ')
    ) {
      return 'event_women_flowers';
    }

    // Nếu không có sự kiện đặc thù, hiển thị theo 4 mùa
    const seasonId = String(activeSeason?.id || 'winter').toLowerCase();
    return `season_${seasonId}`;
  };

  const currentType = getAtmosphereType();

  useEffect(() => {
    if (isTransitioning) {
      setVisible(true);
      // Phát âm thanh đặc trưng chuyển trang tương ứng
      playPageTransitionAtmosphereSound({
        seasonId: activeSeason?.id || 'winter',
        eventId: activeEvent?.id || null,
      });

      const timer = setTimeout(() => {
        setVisible(false);
      }, 1800); // 1.8s tốc độ chậm rãi, êm ái, thư thái, chống mỏi mắt cho người cận thị
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [isTransitioning, activeSeason?.id, activeEvent?.id]);

  if (!visible && !isTransitioning) return null;

  return (
    <div
      className={`page-transition-fx-overlay fx-${currentType} dir-${direction} fx-3d-scene-active`}
      aria-hidden="true"
    >
      {/* =========================================================================
          1. MÙA XUÂN: Đàn chim én 3D gập cánh bay lượn từ xa tới gần trong không gian
         ========================================================================= */}
      {currentType === 'season_spring' && (
        <div className="fx-flock-of-birds-container fx-3d-perspective-stage">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`fx-bird-flight fx-bird-3d bird-item-${i}`}
              style={{
                animationDelay: `${i * 0.14}s`,
                top: `${18 + i * 11}%`,
              }}
            >
              {/* Bóng chim én in dưới đất */}
              <div className="fx-bird-ground-shadow" />
              {/* Thân và cánh gập 3D trong không gian */}
              <div className="fx-bird-3d-body-wrap">
                <div className="fx-bird-3d-wing-left" />
                <div className="fx-bird-3d-torso" />
                <div className="fx-bird-3d-wing-right" />
                <div className="fx-bird-3d-tail" />
              </div>
            </div>
          ))}
          <div className="fx-spring-breeze-trail fx-3d-volume-dust" />
        </div>
      )}

      {/* =========================================================================
          2. MÙA HẠ: Ánh sáng mặt trời chiếu nhẹ (Ánh sáng Thiên Đàng / 3D God Rays)
         ========================================================================= */}
      {currentType === 'season_summer' && (
        <div className="fx-heavenly-godrays-container fx-3d-perspective-stage">
          <div className="fx-heavenly-source-sun fx-3d-sun-sphere" />
          <div className="fx-godray ray-1 fx-3d-shaft" />
          <div className="fx-godray ray-2 fx-3d-shaft" />
          <div className="fx-godray ray-3 fx-3d-shaft" />
          <div className="fx-godray ray-4 fx-3d-shaft" />
          <div className="fx-heavenly-lens-flare fx-3d-flare-ring" />
          <div className="fx-celestial-shimmer-particles">
            {[...Array(14)].map((_, i) => (
              <span
                key={i}
                className="shimmer-sparkle fx-3d-sparkle"
                style={{
                  left: `${12 + (i * 7) % 80}%`,
                  top: `${18 + (i * 12) % 68}%`,
                  animationDelay: `${(i * 0.09).toFixed(2)}s`,
                  transform: `translateZ(${(i % 4) * 35}px)`,
                }}
              >
                ✨
              </span>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          3. MÙA THU: Lá vàng xoay lộn 3D trong gió rơi xào xạc
         ========================================================================= */}
      {currentType === 'season_autumn' && (
        <div className="fx-autumn-leaves-container fx-3d-perspective-stage">
          {[...Array(11)].map((_, i) => {
            const leaves = ['🍂', '🍁', '🍃'];
            const leaf = leaves[i % leaves.length];
            return (
              <div
                key={i}
                className={`fx-autumn-leaf fx-leaf-3d leaf-${i}`}
                style={{
                  top: `${8 + (i * 9) % 78}%`,
                  animationDelay: `${i * 0.11}s`,
                  fontSize: `${1.45 + (i % 3) * 0.4}rem`,
                }}
              >
                <span className="fx-leaf-inner-rotate">{leaf}</span>
                <span className="fx-leaf-3d-drop-shadow" />
              </div>
            );
          })}
          <div className="fx-autumn-wind-gust fx-3d-wind-stream" />
        </div>
      )}

      {/* =========================================================================
          4. MÙA ĐÔNG: Cơn lốc bông tuyết 3D đa tầng (chiều sâu trường ảnh)
         ========================================================================= */}
      {currentType === 'season_winter' && (
        <div className="fx-winter-snowstorm-container fx-3d-perspective-stage">
          {[...Array(16)].map((_, i) => {
            const flakes = ['❄️', '❅', '✻', '✨'];
            const flake = flakes[i % flakes.length];
            const depthLayer = (i % 3) + 1; // 1: foreground to rõ, 2: mid, 3: background mờ
            return (
              <div
                key={i}
                className={`fx-winter-snowflake fx-snowflake-3d flake-${i} depth-layer-${depthLayer}`}
                style={{
                  top: `${6 + (i * 7) % 82}%`,
                  animationDelay: `${i * 0.08}s`,
                  fontSize: `${1.1 + (i % 3) * 0.45}rem`,
                }}
              >
                <span className="fx-flake-3d-spin">{flake}</span>
              </div>
            );
          })}
          <div className="fx-frost-sweep-trail fx-3d-frost-fog" />
        </div>
      )}

      {/* =========================================================================
          5. TẾT TÂY & TẾT TA: Pháo hoa nở bung hình cầu 3D bung tỏa 360 độ
         ========================================================================= */}
      {currentType === 'event_fireworks_tet' && (
        <div className="fx-tet-fireworks-container fx-3d-perspective-stage">
          {/* Quả pháo 1: Góc trái */}
          <div className="fx-firework-burst burst-left fx-3d-sphere-burst">
            <div className="fx-rocket-trail fx-3d-rocket-spark" />
            <div className="fx-burst-flash fx-3d-halo-glow" />
            <div className="fx-burst-stars">
              {[...Array(16)].map((_, i) => (
                <span
                  key={i}
                  className="burst-spark fx-3d-spark"
                  style={{
                    transform: `rotateZ(${i * 22.5}deg) rotateX(${((i % 4) - 2) * 20}deg) translate3d(60px, 0, ${((i % 3) - 1) * 40}px)`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Quả pháo 2: Chính giữa đỉnh cao rực rỡ */}
          <div className="fx-firework-burst burst-center fx-3d-sphere-burst">
            <div className="fx-rocket-trail fx-3d-rocket-spark" />
            <div className="fx-burst-flash fx-3d-halo-glow" />
            <div className="fx-burst-stars">
              {[...Array(20)].map((_, i) => (
                <span
                  key={i}
                  className="burst-spark spark-gold fx-3d-spark"
                  style={{
                    transform: `rotateZ(${i * 18}deg) rotateX(${((i % 5) - 2) * 24}deg) translate3d(85px, 0, ${((i % 4) - 2) * 50}px)`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Quả pháo 3: Góc phải */}
          <div className="fx-firework-burst burst-right fx-3d-sphere-burst">
            <div className="fx-rocket-trail fx-3d-rocket-spark" />
            <div className="fx-burst-flash fx-3d-halo-glow" />
            <div className="fx-burst-stars">
              {[...Array(16)].map((_, i) => (
                <span
                  key={i}
                  className="burst-spark spark-cyan fx-3d-spark"
                  style={{
                    transform: `rotateZ(${i * 22.5}deg) rotateX(${((i % 3) - 1) * 25}deg) translate3d(65px, 0, ${((i % 3) - 1) * 45}px)`,
                  }}
                />
              ))}
            </div>
          </div>

          <div className="fx-tet-sparkle-dust fx-3d-gold-dust">🎆 🎉 🧧 🎊 ✨</div>
        </div>
      )}

      {/* =========================================================================
          6. GIÁNG SINH: Cỗ xe tuần lộc 3D mạ vàng & Ông Già Noel lái xe bay ngang màn hình
         ========================================================================= */}
      {currentType === 'event_santa_sleigh' && (
        <div className="fx-santa-flight-container fx-3d-perspective-stage">
          <div className="fx-santa-sleigh-vehicle fx-sleigh-3d-hull">
            {/* Cỗ xe trượt nhung đỏ viền vàng với Ông Già Noel ngồi vững chãi trên xe */}
            <div className="fx-santa-sleigh-composite">
              <span className="fx-gift-bag">🎁</span>
              <span className="fx-sleigh-icon">🛷</span>
              <span className="fx-santa-icon">🎅</span>
            </div>

            {/* Dây cương vàng óng 3D nối tay lái với tuần lộc */}
            <div className="fx-reindeer-reins fx-3d-gold-reins" />

            {/* Đàn tuần lộc dẫn đầu kéo xe bay ngang màn hình */}
            <div className="fx-reindeer-team fx-reindeer-3d">
              <span className="fx-reindeer">🦌</span>
              <span className="fx-reindeer fx-lead-reindeer">🦌</span>
            </div>
          </div>

          {/* Vệt bụi sao vàng 3 chiều tỏa sáng trên bầu trời tuyết */}
          <div className="fx-santa-stardust-trail fx-3d-stardust">
            {[...Array(12)].map((_, i) => (
              <span
                key={i}
                className={`star-puff puff-${i} fx-3d-star-float`}
                style={{
                  top: `${36 + (i * 3) % 18}%`,
                  left: `${(i * 8.5) % 92}%`,
                  animationDelay: `${i * 0.09}s`,
                }}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          7. 8/3 & 20/10: Mưa hoa 3D xoay lộn 3 chiều bồng bềnh trong gió
         ========================================================================= */}
      {currentType === 'event_women_flowers' && (
        <div className="fx-women-flowers-container fx-3d-perspective-stage">
          {[...Array(10)].map((_, i) => {
            const flowers = ['🌹', '🌷', '🌸', '💐', '🌺', '💖'];
            const flower = flowers[i % flowers.length];
            return (
              <div
                key={i}
                className={`fx-drifting-flower fx-flower-3d flower-${i}`}
                style={{
                  top: `${12 + (i * 8) % 72}%`,
                  animationDelay: `${i * 0.11}s`,
                  fontSize: `${1.6 + (i % 3) * 0.45}rem`,
                }}
              >
                <span className="fx-flower-3d-spin">{flower}</span>
                <span className="fx-flower-soft-shadow" />
              </div>
            );
          })}
          <div className="fx-romantic-glow-aura fx-3d-pink-haze" />
        </div>
      )}

      {/* =========================================================================
          8. 30/4: Xe tăng T-54 Thép Bọc Giáp 3D Lịch Sử mang cờ đỏ sao vàng chạy qua
         ========================================================================= */}
      {currentType === 'event_tank_304' && (
        <div className="fx-tank-304-container fx-3d-perspective-stage">
          <div className="fx-heroic-tank-unit fx-tank-3d-model">
            {/* Bóng đổ mặt đất 3D sâu hun hút của xe tăng */}
            <div className="fx-tank-ground-shadow-3d" />

            {/* Cột ăng-ten & Cờ đỏ sao vàng lụa 3D dập dờn trong gió */}
            <div className="fx-tank-vn-flag-wrap fx-3d-flag-rig">
              <div className="fx-tank-flagpole fx-3d-pole" />
              <div className="fx-tank-vn-flag fx-3d-cloth-flag">
                <span className="flag-star">★</span>
                <span className="fx-flag-silk-sheen" />
              </div>
            </div>

            {/* Tháp pháo tròn 3D đúc thép bọc giáp (Sloped Armor Dome) */}
            <div className="fx-tank-turret-dome-3d">
              {/* Nòng pháo dài 3D có vành kim loại đúc & loa giảm giật */}
              <div className="fx-tank-cannon-barrel-3d">
                <span className="fx-cannon-muzzle-brake" />
              </div>
              {/* Cửa hầm chỉ huy tròn trên đỉnh tháp pháo */}
              <div className="fx-tank-commander-cupola" />
              {/* Thân tháp pháo vát cạnh thép quân sự */}
              <div className="fx-tank-turret-body-3d" />
            </div>

            {/* Thân xe tăng thép nghiêng vát 3D (Cast Armor Hull) */}
            <div className="fx-tank-hull-armor-3d">
              <div className="fx-tank-hull-top-plate" />
              <div className="fx-tank-hull-front-glacis" />
              <div className="fx-tank-fender-guards" />
            </div>

            {/* Băng xích bánh tì chịu lực thép đúc 3D (5 bánh đôi huyền thoại) */}
            <div className="fx-tank-tracks-system-3d">
              <div className="fx-track-tread-belt" />
              <div className="fx-road-wheels-array">
                <span className="track-wheel-3d wheel-1" />
                <span className="track-wheel-3d wheel-2" />
                <span className="track-wheel-3d wheel-3" />
                <span className="track-wheel-3d wheel-4" />
                <span className="track-wheel-3d wheel-5" />
              </div>
            </div>

            {/* Làn khói ống xả 3D cuộn ra phía sau */}
            <div className="fx-tank-exhaust-smoke-3d">
              <span className="smoke-puff-3d puff-1" />
              <span className="smoke-puff-3d puff-2" />
              <span className="smoke-puff-3d puff-3" />
            </div>
          </div>

          {/* Vùng xoáy hút năng lượng 3D vào Header Title ("YOU CAN'T STOP HERE") */}
          <div className="fx-title-suction-vortex fx-3d-vortex-portal">
            <div className="vortex-ring-3d" />
            <div className="vortex-core-3d" />
            <span className="vortex-burst-text-3d">★ 30/4 ĐẠI THẮNG ★</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          9. 2/9: Tượng Đài Nắm Đấm Vinh Quang 3D Đồng Vàng + Hào Quang 360 độ
         ========================================================================= */}
      {currentType === 'event_national_day_29' && (
        <div className="fx-national-day-29-container fx-3d-perspective-stage">
          {/* Vầng hào quang mặt trời 3D tỏa tia sáng đa tầng */}
          <div className="fx-golden-sunburst-aura fx-3d-radial-rays">
            {[...Array(16)].map((_, i) => (
              <span
                key={i}
                className="aura-beam-3d"
                style={{ transform: `rotateZ(${i * 22.5}deg) rotateX(${((i % 4) - 2) * 15}deg)` }}
              />
            ))}
          </div>

          {/* Cụm trung tâm: Tượng đài nắm đấm 3D mạ vàng & Lá cờ Tổ quốc bay cuộn sóng */}
          <div className="fx-glory-fist-center fx-3d-monument-wrap">
            {/* Cờ đỏ sao vàng lụa 3D bay kiêu hãnh */}
            <div className="fx-glory-flag-3d">
              <span className="glory-star-3d">★</span>
              <span className="glory-flag-wave-shine" />
            </div>

            {/* Cánh tay nắm đấm vinh quang bằng đồng vàng nổi khối 3D */}
            <div className="fx-glory-fist-symbol fx-3d-gold-fist">
              <div className="fist-metal-core">✊</div>
              <div className="fist-glow-halo-3d" />
            </div>

            <div className="fx-glory-banner-text-3d">
              2/9 QUỐC KHÁNH VIỆT NAM ★ ĐỘC LẬP - TỰ DO
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          10. TẾT TRUNG THU: Lồng đèn đa diện & Bánh nướng chạm khắc hoa văn 3D
         ========================================================================= */}
      {currentType === 'event_mid_autumn' && (
        <div className="fx-mid-autumn-container fx-3d-perspective-stage">
          {/* Mặt trăng rằm 3D nổi khối với bề mặt sáng ngời */}
          <div className="fx-mid-autumn-moon fx-3d-moon-globe">
            <span className="moon-face-3d">🌕</span>
            <div className="moon-glow-ring-3d" />
          </div>

          {/* Dàn Lồng đèn & Bánh Trung Thu 3D xoay lộn bồng bềnh */}
          <div className="fx-lanterns-mooncakes-swarm fx-3d-lanterns-cloud">
            <div className="fx-festive-item-3d item-star-lantern">
              <span className="item-icon-3d">⭐</span>
              <span className="star-tassel-3d">🏮</span>
            </div>
            <div className="fx-festive-item-3d item-baked-cake" style={{ animationDelay: '0.15s' }}>
              <span className="item-icon-3d">🥮</span>
            </div>
            <div className="fx-festive-item-3d item-carp-lantern" style={{ animationDelay: '0.28s' }}>
              <span className="item-icon-3d">🎏</span>
            </div>
            <div className="fx-festive-item-3d item-snow-cake" style={{ animationDelay: '0.40s' }}>
              <span className="item-icon-3d">🥮</span>
            </div>
            <div className="fx-festive-item-3d item-red-lantern" style={{ animationDelay: '0.52s' }}>
              <span className="item-icon-3d">🏮</span>
            </div>
            <div className="fx-festive-item-3d item-sparkle-star" style={{ animationDelay: '0.65s' }}>
              <span className="item-icon-3d">✨</span>
            </div>
          </div>

          {/* Vùng tia sáng vàng 3D hút vào ô Dashboard đang tích */}
          <div className="fx-tab-suction-target fx-3d-tab-portal">
            <div className="tab-target-pulse-ring-3d" />
            <span className="tab-target-badge-3d">🏮 TRUNG THU ĐOÀN VIÊN 🥮</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          11. 20/11: Bảng đen viền gỗ sồi 3D & Bụi phấn bồng bềnh trong ánh nắng
         ========================================================================= */}
      {currentType === 'event_teachers_day_chalk' && (
        <div className="fx-teachers-chalk-container fx-3d-perspective-stage">
          {/* Bảng đen vân đá 3D đóng khung gỗ */}
          <div className="fx-blackboard-wash fx-3d-chalkboard-slab" />

          {/* Chữ phấn viết tay 3D nổi gân phấn */}
          <div className="fx-chalk-handwriting-wrap fx-3d-chalk-board-content">
            <div className="chalk-header-tag-3d">✨ 20/11 • NGÀY NHÀ GIÁO VIỆT NAM ✨</div>
            <div className="chalk-main-quote-3d">
              <span className="chalk-symbol-3d">📖</span>
              <span className="chalk-text-3d">Nét Chữ Nết Người • Tri Ân Thầy Cô</span>
              <span className="chalk-symbol-3d">🖋️</span>
            </div>
            <div className="chalk-sub-text-3d">Người lái đò thầm lặng chở những ước mơ bay xa</div>
          </div>

          {/* Bụi phấn 3D bay bồng bềnh đa tầng trong chùm sáng */}
          <div className="fx-chalk-dust-cloud fx-3d-dust-volume">
            {[...Array(24)].map((_, i) => (
              <span
                key={i}
                className={`chalk-dust-mote-3d mote-${i}`}
                style={{
                  left: `${4 + (i * 4) % 92}%`,
                  top: `${12 + (i * 8) % 78}%`,
                  animationDelay: `${(i * 0.07).toFixed(2)}s`,
                  width: `${3 + (i % 4) * 2}px`,
                  height: `${3 + (i % 4) * 2}px`,
                  transform: `translateZ(${(i % 5) * 30}px)`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PageTransitionAtmosphereOverlay;
