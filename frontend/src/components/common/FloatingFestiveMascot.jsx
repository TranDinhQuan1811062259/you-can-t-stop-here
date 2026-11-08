import React, { useState, useEffect, useRef } from 'react';
import { eventService } from '../../services/eventService';
import { playClickSound, playFestiveEventSound } from '../../utils/soundEffects';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  snapToNearestEdge,
  ensureInBounds,
} from '../../utils/floatingButtonManager';

export const FloatingFestiveMascot = ({ onOpenShowcase }) => {
  const [activeEvent, setActiveEvent] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Toạ độ & kéo thả tự do như 2 nút Chat và Viết tâm sự
  const [btnPos, setBtnPos] = useState(() => {
    const raw = getFabPos('mascot');
    return resolveAntiCollision('mascot', raw, true);
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);
  const mascotRef = useRef(null);
  const activePointerIdRef = useRef(null);

  const fetchActiveEvent = () => {
    eventService
      .getActiveEvent()
      .then((res) => {
        if (res?.data) {
          setActiveEvent(res.data);
          window.dispatchEvent(new CustomEvent('freedom_festive_mascot_updated', { detail: { event: res.data } }));
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

  // Giữ vị trí trong màn hình khi thay đổi kích thước cửa sổ
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        const bounded = ensureInBounds('mascot', prev);
        const resolved = resolveAntiCollision('mascot', bounded, true);
        saveFabPos('mascot', resolved);
        return resolved;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lắng nghe khi nút khác di dời để tự né tránh va chạm (CHỈ né dọc Y, giữ nguyên cột mép X)
  useEffect(() => {
    const handleRecheckCollision = (e) => {
      if (e?.detail?.type === 'mascot') return; // Không tự phản hồi lại chính mình
      setBtnPos((curr) => {
        const safe = resolveAntiCollision('mascot', curr, true);
        if (safe.x !== curr.x || safe.y !== curr.y) {
          saveFabPos('mascot', safe);
          return safe;
        }
        return curr;
      });
    };
    window.addEventListener('freedom_fab_pos_changed', handleRecheckCollision);
    return () => window.removeEventListener('freedom_fab_pos_changed', handleRecheckCollision);
  }, []);

  // =========================================================================
  // XỬ LÝ KÉO THẢ BẰNG POINTER EVENTS (TRIỆT TIÊU 100% LỖI DÍNH CHUỘT)
  // =========================================================================
  const handlePointerDown = (e) => {
    // Nếu click vào nút đóng '✕' thì không kéo
    if (e.target.closest('.mascot-dismiss-btn')) return;

    // Chỉ nhận chuột trái hoặc chạm cảm ứng
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointerIdRef.current = e.pointerId;
    } catch (_) {}

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      btnX: btnPos.x,
      btnY: btnPos.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();

    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (Math.hypot(dx, dy) > 4) {
      hasMovedRef.current = true;
    }

    const nextX = dragStartRef.current.btnX + dx;
    const nextY = dragStartRef.current.btnY + dy;
    setBtnPos(ensureInBounds('mascot', { x: nextX, y: nextY }));
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;

    try {
      if (activePointerIdRef.current !== null && e.currentTarget) {
        e.currentTarget.releasePointerCapture(activePointerIdRef.current);
      }
    } catch (_) {}
    activePointerIdRef.current = null;
    setIsDragging(false);

    if (hasMovedRef.current) {
      setBtnPos((current) => {
        // Tự động khép góc dạt về mép gần nhất (khóa cột mép X, né dọc Y nếu chạm)
        const snapped = snapToNearestEdge('mascot', current);
        saveFabPos('mascot', snapped);
        return snapped;
      });
    }
  };

  const handlePointerCancel = (e) => {
    if (isDragging) {
      handlePointerUp(e);
    }
  };

  // Bảo hiểm toàn cục trên window: Nhả chuột ở bất kỳ đâu cũng tự thoát trạng thái kéo
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalRelease = () => {
      setIsDragging(false);
      activePointerIdRef.current = null;
      if (hasMovedRef.current) {
        setBtnPos((current) => {
          const snapped = snapToNearestEdge('mascot', current);
          saveFabPos('mascot', snapped);
          return snapped;
        });
      }
    };

    window.addEventListener('pointerup', handleGlobalRelease);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('touchend', handleGlobalRelease);
    window.addEventListener('pointercancel', handleGlobalRelease);

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('touchend', handleGlobalRelease);
      window.removeEventListener('pointercancel', handleGlobalRelease);
    };
  }, [isDragging]);

  if (!activeEvent || isDismissed) return null;

  const is304 = activeEvent.id === 'giai_phong_30_4' || activeEvent.name?.includes('30/4');
  const is29 = activeEvent.id === 'quoc_khanh_2_9' || activeEvent.name?.includes('2/9');
  const is83 = activeEvent.id === 'quoc_te_phu_nu_8_3' || activeEvent.name?.includes('8/3');
  const isHalloween =
    activeEvent.id === 'le_hoi_halloween' ||
    activeEvent.id?.includes('halloween') ||
    activeEvent.name?.toLowerCase().includes('halloween');

  const handleClick = (e) => {
    // Nếu vừa kéo thả xong thì không kích hoạt mở modal
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
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
      ref={mascotRef}
      className={`floating-festive-mascot-widget event-${activeEvent.id} ${isHovered ? 'hovered' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        position: 'fixed',
        left: `${btnPos.x}px`,
        top: `${btnPos.y}px`,
        right: 'auto',
        bottom: 'auto',
        zIndex: isDragging ? 9999 : 9986,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging
          ? 'none'
          : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s, box-shadow 0.2s',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`${activeEvent.name} • Giữ và kéo để di chuyển tự do vào bất kỳ góc nào tùy thích!`}
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

      {/* Đồ họa biểu tượng sự kiện bay dẻo dẻo (Cấm hoàn toàn kéo native browser drag) */}
      <div
        className="mascot-graphic-wrap"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {is304 && (
          <div className="mascot-tank565-container fluid-waving-tank" title="30/4: Xe tăng 565 Quân Đội Nhân Dân Việt Nam đại thắng">
            <div className="mascot-tank-badge">
              <img
                src="/festive/tank-565-parade.jpg"
                alt="Xe Tăng 565 Duyệt Binh 30/4"
                className="mascot-tank-img"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' }}
              />
              <span className="mascot-tank-stencil">565</span>
              <span className="mascot-tank-flag-mini">🇻🇳</span>
            </div>
            <div className="mascot-tank-glow-ring" />
          </div>
        )}

        {is29 && (
          <div className="mascot-soldier-container fluid-waving-soldier" title="2/9 Quốc Khánh: Người lính & Khối tiêu binh QĐNDVN rước cờ Quyết Thắng">
            <div className="mascot-soldier-badge">
              <img
                src="/festive/soldier-vietnam-k20.jpg"
                alt="Người Lính Quân Đội Nhân Dân Việt Nam K20"
                className="mascot-soldier-img"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' }}
              />
              <span className="mascot-soldier-star">★</span>
              <span className="mascot-soldier-flag-mini">🚩</span>
            </div>
            <div className="mascot-soldier-glow-ring" />
          </div>
        )}

        {is83 && (
          <div className="mascot-heart8-container fluid-waving-heart8" title="Số 8 trái tim 8/3 bay nhỏ nhỏ">
            <img
              src="/festive/event-8-3-heart.jpg"
              alt="Số 8 Trái Tim"
              className="mascot-heart8-img"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none' }}
            />
            <span className="mascot-heart-balloon" style={{ pointerEvents: 'none' }}>🎈</span>
          </div>
        )}

        {isHalloween && (
          <div className="mascot-halloween-container fluid-waving-halloween" title="Bí ngô ma thuật & Dơi đêm Halloween">
            <span className="mascot-halloween-pumpkin" style={{ fontSize: '2rem', display: 'inline-block', filter: 'drop-shadow(0 0 10px #f97316)' }}>
              🎃
            </span>
            <span className="mascot-halloween-bat" style={{ position: 'absolute', top: '-6px', right: '-4px', fontSize: '1rem', animation: 'flyBat 1.4s infinite alternate ease-in-out' }}>
              🦇
            </span>
            <span className="mascot-halloween-ghost" style={{ position: 'absolute', bottom: '-4px', left: '-6px', fontSize: '0.9rem', opacity: 0.85 }}>
              👻
            </span>
          </div>
        )}

        {!is304 && !is29 && !is83 && !isHalloween && (
          <div className="mascot-default-icon" style={{ pointerEvents: 'none' }}>
            <span className="mascot-emoji" style={{ pointerEvents: 'none' }}>{activeEvent.icon || '🎊'}</span>
          </div>
        )}
      </div>

      {/* Nhãn nổi nhỏ xinh bên dưới */}
      <div className="mascot-label-pill" style={{ pointerEvents: 'none', userSelect: 'none' }}>
        <span className="mascot-label-text">
          {activeEvent.shortName || (activeEvent.name.includes(':') ? activeEvent.name.split(':')[0] : activeEvent.name)}
        </span>
      </div>
    </aside>
  );
};
