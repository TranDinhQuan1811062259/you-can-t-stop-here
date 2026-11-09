import React, { useState, useEffect, useRef } from 'react';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  snapToNearestEdge,
  ensureInBounds,
} from '../../utils/floatingButtonManager';

export const PwaInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFloatingPill, setShowFloatingPill] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isMinimized, setIsMinimized] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_pwa_minimized');
      if (saved !== null) return saved === 'true';
    } catch (_) {}
    return true;
  });

  const handleSetMinimized = (val) => {
    setIsMinimized(val);
    try {
      localStorage.setItem('freedom_pwa_minimized', String(val));
    } catch (_) {}
  };

  // Khả năng kéo thả di dời tự do đa góc như các nút khác
  const [btnPos, setBtnPos] = useState(() => {
    const raw = getFabPos('pwa');
    return resolveAntiCollision('pwa', raw, true);
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);
  const pillRef = useRef(null);
  const activePointerIdRef = useRef(null);

  // Giữ vị trí trong màn hình khi thay đổi kích thước cửa sổ (có chống bão sự kiện Debounce)
  useEffect(() => {
    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setBtnPos((prev) => {
          const bounded = ensureInBounds('pwa', prev);
          const resolved = resolveAntiCollision('pwa', bounded, true);
          saveFabPos('pwa', resolved, false);
          return resolved;
        });
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Lắng nghe khi nút khác di dời để tự né tránh va chạm (giữ nguyên cột mép X)
  useEffect(() => {
    const handleRecheckCollision = (e) => {
      if (e?.detail?.type === 'pwa') return;
      setBtnPos((curr) => {
        const safe = resolveAntiCollision('pwa', curr, true);
        if (safe.x !== curr.x || safe.y !== curr.y) {
          saveFabPos('pwa', safe, false);
          return safe;
        }
        return curr;
      });
    };
    window.addEventListener('freedom_fab_pos_changed', handleRecheckCollision);
    return () => window.removeEventListener('freedom_fab_pos_changed', handleRecheckCollision);
  }, []);

  // Bắt đầu kéo thả bằng Pointer Events (Triệt tiêu hoàn toàn lỗi dính chuột)
  const handlePointerDown = (e) => {
    // Nếu bấm trúng nút bấm con thì không kéo
    if (e.target.closest('button')) return;

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
    setBtnPos(ensureInBounds('pwa', { x: nextX, y: nextY }));
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
        const snapped = snapToNearestEdge('pwa', current);
        saveFabPos('pwa', snapped, true);
        return snapped;
      });
    }
  };

  const handlePointerCancel = (e) => {
    if (isDragging) {
      handlePointerUp(e);
    }
  };

  // Bảo hiểm toàn cục trên window
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalRelease = () => {
      setIsDragging(false);
      activePointerIdRef.current = null;
      if (hasMovedRef.current) {
        setBtnPos((current) => {
          const snapped = snapToNearestEdge('pwa', current);
          saveFabPos('pwa', snapped, true);
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

  useEffect(() => {
    // 1. Kiểm tra xem app đã được cài đặt và đang chạy dạng standalone chưa
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(standalone));
    };
    checkStandalone();

    // 2. Phát hiện hệ điều hành
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIosDevice);
    setIsAndroid(isAndroidDevice);

    // 3. Lắng nghe sự kiện beforeinstallprompt (Android Chrome, Windows Edge, Mac Chrome)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Hiển thị pill banner sau 2.5s nếu chưa tắt
      const dismissed = sessionStorage.getItem('freedom_pwa_dismissed');
      if (!dismissed) {
        setShowFloatingPill(true);
      }
    };

    // 4. Lắng nghe sự kiện cài đặt thành công
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowFloatingPill(false);
      setIsModalOpen(false);
      setDeferredPrompt(null);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 5000);
    };

    // 5. Lắng nghe mở modal cài đặt từ nút trên Header
    const handleCustomOpen = () => {
      setIsModalOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('freedom_open_install_pwa_modal', handleCustomOpen);

    // Trên iOS nếu chưa standalone và chưa dismissed, cũng gợi ý floating pill
    if (isIosDevice && !window.navigator.standalone) {
      const dismissed = sessionStorage.getItem('freedom_pwa_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowFloatingPill(true), 3500);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('freedom_open_install_pwa_modal', handleCustomOpen);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowFloatingPill(false);
        setIsModalOpen(false);
      }
      setDeferredPrompt(null);
    } else {
      // Mở modal hướng dẫn chi tiết cho từng thiết bị
      setIsModalOpen(true);
    }
  };

  const handleDismissPill = (e) => {
    e.stopPropagation();
    setShowFloatingPill(false);
    sessionStorage.setItem('freedom_pwa_dismissed', 'true');
  };

  // Nếu đang chạy trong app standalone rồi thì không hiển thị banner
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Toast thông báo khi vừa cài đặt app thành công */}
      {installSuccess && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 99999,
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: '#ffffff',
            padding: '14px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(5, 150, 105, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '0.9rem',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>🎉</span>
          <span>Chúc mừng! Ứng dụng Freedom đã được cài đặt vào máy của bạn!</span>
        </div>
      )}

      {/* Floating Pill Banner tiện lợi (Kéo thả di dời tự do khắp màn hình, chống tràn thanh cuộn) */}
      {showFloatingPill && (
        isMinimized ? (
          /* Dạng thu gọn siêu gọn gàng tinh tế (Mini Jewel Bubble) */
          <div
            ref={pillRef}
            className={`pwa-floating-install-pill is-minimized ${isDragging ? 'is-dragging' : ''}`}
            onClick={() => {
              if (hasMovedRef.current) {
                hasMovedRef.current = false;
                return;
              }
              handleSetMinimized(false);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{
              position: 'fixed',
              left: `${btnPos.x}px`,
              top: `${btnPos.y}px`,
              right: 'auto',
              bottom: 'auto',
              zIndex: isDragging ? 10000 : 9998,
              cursor: isDragging ? 'grabbing' : 'grab',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(13, 148, 136, 0.92) 100%)',
              border: '1.5px solid rgba(45, 212, 191, 0.65)',
              boxShadow: isDragging
                ? '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(13, 148, 136, 0.65)'
                : '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(13, 148, 136, 0.35)',
              borderRadius: '999px',
              padding: '6px 14px',
              width: 'max-content',
              minWidth: '172px',
              height: '42px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8rem',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'none',
              transition: isDragging
                ? 'none'
                : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s',
            }}
            title="📲 Cài Đặt Freedom App (Bấm để mở rộng, hoặc giữ & kéo để di dời)"
          >
            <span style={{ fontSize: '0.75rem', opacity: 0.6, cursor: 'grab', pointerEvents: 'none', userSelect: 'none', flexShrink: 0 }}>⠿</span>
            <img
              src="/icons/icon-192.png"
              alt="App"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.3)', pointerEvents: 'none', WebkitUserDrag: 'none' }}
            />
            <span style={{ letterSpacing: '0.2px', whiteSpace: 'nowrap', pointerEvents: 'none', flexShrink: 0, fontSize: '0.82rem' }}>Cài App</span>
            <span
              style={{
                fontSize: '0.62rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                flexShrink: 0,
              }}
            >
              FREE
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismissPill(e);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '0 4px',
                fontSize: '0.75rem',
                lineHeight: 1,
                flexShrink: 0,
              }}
              title="Đóng hoàn toàn"
            >
              ✕
            </button>
          </div>
        ) : (
          /* Dạng mở rộng đầy đủ sang trọng (Aurora Glass Capsule) */
          <div
            ref={pillRef}
            className={`pwa-floating-install-pill ${isDragging ? 'is-dragging' : ''}`}
            onClick={() => {
              if (hasMovedRef.current) {
                hasMovedRef.current = false;
                return;
              }
              setIsModalOpen(true);
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{
              position: 'fixed',
              left: `${btnPos.x}px`,
              top: `${btnPos.y}px`,
              right: 'auto',
              bottom: 'auto',
              zIndex: isDragging ? 10000 : 9998,
              cursor: isDragging ? 'grabbing' : 'grab',
              maxWidth: 'min(440px, calc(100vw - 32px))',
              width: 'max-content',
              boxSizing: 'border-box',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(13, 148, 136, 0.88) 100%)',
              border: '1.5px solid rgba(45, 212, 191, 0.45)',
              borderRadius: '999px',
              padding: '8px 12px 8px 10px',
              boxShadow: isDragging
                ? '0 24px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(45, 212, 191, 0.65)'
                : '0 16px 40px rgba(0, 0, 0, 0.55), 0 0 24px rgba(13, 148, 136, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              transition: isDragging
                ? 'none'
                : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s, border-color 0.2s',
              touchAction: 'none',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            title="📲 Cài Đặt Freedom App (Giữ và kéo để di chuyển tự do vào bất kỳ góc nào tùy thích!)"
          >
            {/* Tay nắm kéo thả (Grip Handle badge) */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '4px 5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: isDragging ? 'grabbing' : 'grab',
                flexShrink: 0,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              title="Kéo thả để di dời vị trí"
            >
              ⠿
            </div>

            {/* App Icon với vòng sáng ngọc bích */}
            <div
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35), 0 0 10px rgba(45, 212, 191, 0.4)',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                flexShrink: 0,
                pointerEvents: 'none',
              }}
            >
              <img
                src="/icons/icon-192.png"
                alt="Freedom App"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', WebkitUserDrag: 'none' }}
              />
            </div>

            {/* Thông tin mô tả ứng dụng */}
            <div style={{ minWidth: 0, flex: '1 1 auto' }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
              >
                <span style={{ color: '#ffffff', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 800 }}>
                  Cài Freedom App
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                    color: '#ffffff',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.45)',
                    flexShrink: 0,
                  }}
                >
                  MIỄN PHÍ
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#99f6e4',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  marginTop: '1px',
                }}
              >
                ⚡ Tải nhanh • Dùng như app gốc
              </div>
            </div>

            {/* Cụm nút hành động */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstallClick();
                }}
                style={{
                  background: '#ffffff',
                  color: '#0f766e',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(255, 255, 255, 0.3), 0 2px 6px rgba(0,0,0,0.2)',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease',
                  letterSpacing: '0.2px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0fdfa';
                  e.currentTarget.style.color = '#0d9488';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 255, 255, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#0f766e';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(255, 255, 255, 0.3), 0 2px 6px rgba(0,0,0,0.2)';
                }}
              >
                {deferredPrompt ? 'Cài ngay' : 'Tải App'}
              </button>

              {/* Nút Thu gọn dạng mini pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetMinimized(true);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  lineHeight: 1,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
                title="Thu nhỏ thanh cài đặt"
                aria-label="Thu nhỏ"
              >
                —
              </button>

              {/* Nút Đóng hoàn toàn */}
              <button
                type="button"
                onClick={handleDismissPill}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  lineHeight: 1,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.9)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
                title="Đóng thông báo (Tắt cho phiên này)"
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
          </div>
        )
      )}

      {/* Modal Hướng Dẫn Tải & Cài Đặt Chi Tiết Đa Nền Tảng */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-box pwa-install-modal-box"
            style={{ maxWidth: '560px', width: '92%', borderRadius: '18px', padding: '24px 28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <img
                src="/icons/icon-512.svg"
                alt="Freedom Logo"
                style={{
                  width: '76px',
                  height: '76px',
                  borderRadius: '18px',
                  boxShadow: '0 8px 24px rgba(13, 148, 136, 0.35)',
                  marginBottom: '10px',
                }}
              />
              <h3 style={{ margin: '0 0 4px', fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                Tải Ứng Dụng Freedom
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                Sử dụng như ứng dụng chính thức trên <strong>iPhone, iPad, Android, Windows & Mac</strong>
              </p>
            </div>

            {/* Khối Lợi Ích Của Ứng Dụng */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '10px',
                marginBottom: '20px',
                background: '#f8fafc',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>⚡</span>
                <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                  <strong>Mở siêu nhanh:</strong> Không giật lag, không tốn dung lượng máy
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📱</span>
                <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                  <strong>Toàn màn hình:</strong> Ẩn thanh trình duyệt, mượt như app tải về
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📶</span>
                <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                  <strong>Chế độ Ngoại tuyến:</strong> Vẫn đọc được bài viết khi mất mạng
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🔔</span>
                <span style={{ fontSize: '0.8rem', color: '#334155' }}>
                  <strong>Thông báo tức thì:</strong> Nhận tin nhắn và lời động viên mới
                </span>
              </div>
            </div>

            {/* Hướng Dẫn Chi Tiết Theo Từng Hệ Điều Hành */}
            <div style={{ marginBottom: '22px' }}>
              {isIOS ? (
                // Hướng dẫn riêng cho iPhone & iPad (Safari)
                <div
                  style={{
                    background: '#eff6ff',
                    border: '1.5px solid #bfdbfe',
                    borderRadius: '12px',
                    padding: '16px',
                    color: '#1e3a8a',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🍏</span>
                    <span>Cách Cài Đặt Trên iPhone & iPad (Safari):</span>
                  </div>
                  <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.84rem', lineHeight: 1.6 }}>
                    <li>
                      Nhấn vào biểu tượng <strong>Chia Sẻ</strong> (
                      <span style={{ fontSize: '1.1rem', display: 'inline-block', verticalAlign: 'middle' }}>📤</span>) ở thanh dưới cùng Safari.
                    </li>
                    <li>
                      Cuộn xuống và chọn dòng <strong>"Thêm vào Màn hình chính"</strong> (
                      <span style={{ fontSize: '1.1rem', display: 'inline-block', verticalAlign: 'middle' }}>➕</span> <em>Add to Home Screen</em>).
                    </li>
                    <li>
                      Nhấn nút <strong>"Thêm" (Add)</strong> ở góc trên bên phải. Biểu tượng Freedom sẽ xuất hiện ngay trên màn hình ứng dụng của bạn!
                    </li>
                  </ol>
                </div>
              ) : deferredPrompt ? (
                // Thiết bị hỗ trợ 1-Click Install (Android Chrome, Windows Edge, Mac Chrome)
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                      color: '#ffffff',
                      fontSize: '1rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(13, 148, 136, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <span>📲 Cài Đặt Ứng Dụng Ngay (1-Click)</span>
                  </button>
                  <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Nhấn vào nút trên để tải và ghim Freedom vào màn hình điện thoại hoặc máy tính của bạn
                  </p>
                </div>
              ) : (
                // Hướng dẫn chung cho Máy tính / Trình duyệt khác
                <div
                  style={{
                    background: '#f1f5f9',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: '#334155',
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💻</span>
                    <span>Cài Đặt Trên Máy Tính (Windows / macOS / Chrome / Edge):</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', lineHeight: 1.6 }}>
                    <li>
                      Tìm biểu tượng <strong>"Cài đặt ứng dụng"</strong> (
                      <span style={{ fontSize: '1rem' }}>⊕</span> hoặc <span style={{ fontSize: '1rem' }}>💻</span>) ở góc phải thanh địa chỉ trình duyệt.
                    </li>
                    <li>
                      Nhấn <strong>"Cài đặt" (Install)</strong> để Freedom chạy như một ứng dụng độc lập trên màn hình Desktop và thanh Taskbar.
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                className="page-btn"
                style={{ padding: '8px 24px', fontSize: '0.88rem' }}
                onClick={() => setIsModalOpen(false)}
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
