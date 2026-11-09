import React, { useState, useEffect, useRef } from 'react';
import {
  playClickSound,
  playCatMeowSound,
  playCatPurrSound,
  playDogBarkSound,
  playPetEatingSound,
} from '../../utils/soundEffects';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  snapToNearestEdge,
  ensureInBounds,
} from '../../utils/floatingButtonManager';

// Danh sách món ăn hợp logic thực tế cho từng bé
const PET_CONFIG = {
  cat: {
    id: 'cat',
    name: 'Bé Mèo Mướp',
    subtitle: 'Tri Kỷ Lười Biếng • Vỗ Về Tâm Trí',
    emoji: '🐱',
    avatar3d: '🐱',
    accentColor: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.45)',
    bgGradient: 'radial-gradient(circle at 35% 30%, #fff7ed 0%, #ffedd5 40%, #fdba74 85%, #ea580c 100%)',
    borderGradient: 'linear-gradient(135deg, #fdba74, #ea580c)',
    foods: [
      { id: 'fish', name: 'Cá hồi phi lê', icon: '🐟', quote: 'Meo meo~ Cá béo ngậy ngọt lịm! Cảm ơn sen chu đáo nhiều nha! 🐟' },
      { id: 'shrimp', name: 'Tôm hấp giòn', icon: '🍤', quote: 'Meow~ Tôm tươi đã cái nọng! Cùng sen cày tiếp deadline nhé! 🍤' },
      { id: 'milk', name: 'Bát sữa ấm', icon: '🥛', quote: 'Chẹp chẹp... Uống sữa ấm no bụng rồi, sen nhớ uống ngụm nước ấm nha! 🥛' },
    ],
  },
  dog: {
    id: 'dog',
    name: 'Bé Cún Shiba',
    subtitle: 'Vệ Sĩ Cột Sống • Nạp Năng Lượng Tích Cực',
    emoji: '🐕',
    avatar3d: '🐕',
    accentColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.45)',
    bgGradient: 'radial-gradient(circle at 35% 30%, #fefce8 0%, #fef08a 40%, #fde047 80%, #ca8a04 100%)',
    borderGradient: 'linear-gradient(135deg, #fde047, #ca8a04)',
    foods: [
      { id: 'bone', name: 'Khúc xương thơm', icon: '🦴', quote: 'Gâu gâu! Khúc xương này gặm sướng răng quá! Cậu là số 1! 🦴' },
      { id: 'drumstick', name: 'Đùi gà giòn tan', icon: '🍗', quote: 'Woof woof! Đùi gà nướng giòn rụm! Năng lượng tràn trề để đồng hành cùng cậu! 🍗' },
      { id: 'beef', name: 'Miếng thịt bò', icon: '🥩', quote: 'Gâu! Thịt hảo hạng ngon bá cháy! Cậu nhớ ăn uống tẩm bổ đừng bỏ bữa nhé! 🥩' },
      { id: 'sausage', name: 'Xúc xích phô mai', icon: '🌭', quote: 'Yummy! Xúc xích béo ngậy! Cún gửi cậu một ngàn cái ôm ấm áp! 🌭' },
    ],
  },
};

const WELLNESS_QUOTES = [
  'Cậu ơi, đã làm việc một lúc rồi đấy, uống một ngụm nước ấm rồi hẵng gõ tiếp nhé! ☕',
  'Deadline thì nhiều, nhưng cột sống chỉ có một thôi! Vươn vai hít một hơi thật sâu nào! 🐾',
  'Dù hôm nay có áp lực thế nào, cậu vẫn đang làm rất tốt rồi! Tớ luôn ở đây cạnh cậu nè ❤️',
  'Chớp mắt 10 lần và nhìn ra xa 20 giây để đôi mắt được nghỉ ngơi một chút nhé 🌿',
  'Hôm nay có chuyện gì bực mình không? Ghé trạm Xả Stress đập vỡ vài cái đĩa cho nhẹ lòng nhé! 🍽️',
  'Đêm muộn rồi đấy, nhớ hoàn thành sớm rồi đi ngủ cho lại sức nha 🌙',
  'Bụng đói làm việc dễ cáu lắm, nhớ ăn uống đầy đủ đừng bỏ bữa nhé! 🍱',
  'Mỉm cười một cái nào! Nụ cười của cậu làm góc bàn làm việc sáng bừng lên đấy ✨',
  'Hít vào thật sâu... giữ 4 giây... thở ra từ từ... Thấy nhẹ nhõm hơn chưa nào? 🧘',
  'Ghé Trạm Giấy Nhớ đọc lời dặn dò của người lạ để thấy ấm lòng hơn nhé 💌',
  'Nếu thấy hoảng loạn hay quá tải, bấm ngay nút Cứu Trợ 🆘 để cùng định tâm 5-4-3-2-1 nha 🐾',
  'Qua Tiệm Cà Phê Mưa bật Pomodoro 25 phút cùng tớ cày xong việc sớm nào ☕',
];

export const DeskCompanionPet = () => {
  const [petType, setPetType] = useState(() => {
    return localStorage.getItem('freedom_desk_pet_type') || 'cat';
  });

  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('freedom_desk_pet_minimized') === 'true';
  });

  const [petHappiness, setPetHappiness] = useState(() => {
    return parseInt(localStorage.getItem('freedom_desk_pet_happy') || '25', 10);
  });

  const [currentFoodIndex, setCurrentFoodIndex] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(() => WELLNESS_QUOTES[0]);
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [floatingParticles, setFloatingParticles] = useState([]);
  const [isEatingAnim, setIsEatingAnim] = useState(false);
  const [isPettingAnim, setIsPettingAnim] = useState(false);
  const [activeFlyingFood, setActiveFlyingFood] = useState(null);

  // Kéo thả di dời tự do & Tự động hít bám vào góc/mép màn hình (Draggable FAB with Edge Snapping)
  const [btnPos, setBtnPos] = useState(() => {
    const raw = getFabPos('pet');
    return resolveAntiCollision('pet', raw, true);
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const bubbleTimerRef = useRef(null);

  // Giữ vị trí trong màn hình & Tự động hít mép khi thay đổi kích thước cửa sổ (Debounce)
  useEffect(() => {
    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setBtnPos((prev) => {
          const bounded = ensureInBounds('pet', prev);
          const resolved = snapToNearestEdge('pet', bounded);
          saveFabPos('pet', resolved, false);
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

  // Lắng nghe khi nút khác di dời để tự né tránh va chạm (CHỈ né dọc Y, giữ nguyên mép X)
  useEffect(() => {
    const handleRecheckCollision = (e) => {
      if (e?.detail?.type === 'pet') return;
      setBtnPos((curr) => {
        const safe = resolveAntiCollision('pet', curr, true);
        if (safe.x !== curr.x || safe.y !== curr.y) {
          saveFabPos('pet', safe, false);
          return safe;
        }
        return curr;
      });
    };
    window.addEventListener('freedom_fab_pos_changed', handleRecheckCollision);
    return () => window.removeEventListener('freedom_fab_pos_changed', handleRecheckCollision);
  }, []);

  // Tự động nhắc nhở thư giãn ngẫu nhiên mỗi 75 giây
  useEffect(() => {
    const timer = setInterval(() => {
      const randomQ = WELLNESS_QUOTES[Math.floor(Math.random() * WELLNESS_QUOTES.length)];
      setCurrentQuote(randomQ);
      setShowSpeechBubble(true);
      clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => setShowSpeechBubble(false), 9000);
    }, 75000);
    return () => {
      clearInterval(timer);
      clearTimeout(bubbleTimerRef.current);
    };
  }, []);

  // Xử lý kéo thả bằng Pointer Events (chống dính chuột, mượt mà trên cả điện thoại & PC)
  const handlePointerDown = (e) => {
    // Nếu bấm trúng nút bấm con hoặc menu thao tác thì không kéo
    if (e.target.closest('button') || e.target.closest('.pet-action-control') || e.target.closest('.pet-actions-menu-3d')) return;
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
    setBtnPos(ensureInBounds('pet', { x: nextX, y: nextY }));
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
        const snapped = snapToNearestEdge('pet', current);
        saveFabPos('pet', snapped, true);
        return snapped;
      });
    }
  };

  const handlePointerCancel = (e) => {
    if (isDragging) {
      handlePointerUp(e);
    }
  };

  // Vuốt ve / Cưng nựng bé
  const handlePet = (e) => {
    if (e) e.stopPropagation();
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }

    if (petType === 'dog') {
      playDogBarkSound();
    } else {
      playCatMeowSound();
      playCatPurrSound();
    }

    setIsPettingAnim(true);
    setTimeout(() => setIsPettingAnim(false), 600);

    // Tăng điểm vui vẻ
    setPetHappiness((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem('freedom_desk_pet_happy', String(next));
      } catch (_) {}
      return next;
    });

    // Tạo hiệu ứng tim bay 3D
    const pId = Date.now() + Math.random();
    const emojis = ['💖', '✨', '🥰', '🐾', '❤️'];
    const chosenEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    setFloatingParticles((prev) => [
      ...prev,
      { id: pId, emoji: chosenEmoji, left: Math.random() * 40 - 20 },
    ]);
    setTimeout(() => {
      setFloatingParticles((prev) => prev.filter((p) => p.id !== pId));
    }, 1300);

    // Bật bong bóng lời nhắn
    const randomQ = WELLNESS_QUOTES[Math.floor(Math.random() * WELLNESS_QUOTES.length)];
    setCurrentQuote(randomQ);
    setShowSpeechBubble(true);
    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setShowSpeechBubble(false), 8000);
  };

  // Cho ăn hợp lý: Mèo ăn cá / tôm; Cún ăn xương / thịt / đùi gà!
  const handleFeed = (e, specificIndex = null) => {
    if (e) e.stopPropagation();
    playClickSound();

    const currentConfig = PET_CONFIG[petType] || PET_CONFIG.cat;
    const foodList = currentConfig.foods;
    const targetIdx = typeof specificIndex === 'number' ? specificIndex : (currentFoodIndex % foodList.length);
    const chosenFood = foodList[targetIdx];

    // Thú cưng phản ứng âm thanh phấn khích:
    // Chó sủa gâu gâu mừng rỡ! Mèo kêu meo meo nũng nịu!
    if (petType === 'dog') {
      playDogBarkSound();
    } else {
      playCatMeowSound();
    }

    // Kèm âm thanh nhai măm măm rôm rả chân thực (crunch / nom nom)
    setTimeout(() => {
      playPetEatingSound(petType === 'dog');
    }, 240);

    // Kích hoạt hoạt cảnh thức ăn bay vào miệng
    setActiveFlyingFood(chosenFood.icon);
    setIsEatingAnim(true);

    setTimeout(() => {
      setIsEatingAnim(false);
      setActiveFlyingFood(null);

      // Tăng điểm vui vẻ khi được ăn ngon
      setPetHappiness((prev) => {
        const next = prev + 5;
        try {
          localStorage.setItem('freedom_desk_pet_happy', String(next));
        } catch (_) {}
        return next;
      });

      // Lời thoại cảm ơn món ăn
      setCurrentQuote(chosenFood.quote);
      setShowSpeechBubble(true);
      clearTimeout(bubbleTimerRef.current);
      bubbleTimerRef.current = setTimeout(() => setShowSpeechBubble(false), 9000);

      // Xoay vòng món ăn tiếp theo
      setCurrentFoodIndex((targetIdx + 1) % foodList.length);
    }, 950);
  };

  // Đổi loại thú cưng (Mèo <-> Cún)
  const handleTogglePetType = (e) => {
    if (e) e.stopPropagation();
    playClickSound();
    const nextType = petType === 'cat' ? 'dog' : 'cat';
    setPetType(nextType);
    setCurrentFoodIndex(0);
    try {
      localStorage.setItem('freedom_desk_pet_type', nextType);
    } catch (_) {}

    if (nextType === 'dog') {
      playDogBarkSound();
      setCurrentQuote('Gâu gâu! Cún Shiba xin chào cậu! Hôm nay tớ sẽ làm vệ sĩ bảo vệ mắt và cột sống cho cậu! 🐕');
    } else {
      playCatMeowSound();
      setCurrentQuote('Meo meo~ Bé Mèo Mướp đây! Làm việc căng thẳng thì cứ vuốt ve tớ một cái là hết mệt liền nhé! 🐱');
    }
    setShowSpeechBubble(true);
    clearTimeout(bubbleTimerRef.current);
    bubbleTimerRef.current = setTimeout(() => setShowSpeechBubble(false), 8000);
  };

  // Thu nhỏ / Phóng to
  const handleToggleMinimize = (e) => {
    if (e) e.stopPropagation();
    playClickSound();
    const next = !isMinimized;
    setIsMinimized(next);
    setShowActionsMenu(false);
    try {
      localStorage.setItem('freedom_desk_pet_minimized', String(next));
    } catch (_) {}
  };

  const currentConfig = PET_CONFIG[petType] || PET_CONFIG.cat;
  const currentFood = currentConfig.foods[currentFoodIndex % currentConfig.foods.length];
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const isRightSide = btnPos.x > screenWidth / 2;
  const isTopSide = btnPos.y < 230;

  return (
    <aside
      className={`desk-companion-pet-root ${isDragging ? 'is-dragging' : ''} ${isRightSide ? 'docked-right' : 'docked-left'}`}
      style={{
        position: 'fixed',
        left: `${btnPos.x}px`,
        top: `${btnPos.y}px`,
        zIndex: isDragging ? 10001 : 9996,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging
          ? 'none'
          : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      title={`${currentConfig.name} • Giữ và kéo thả để di chuyển tự do vào bất kỳ góc nào!`}
      aria-label="Bé thú cưng bàn làm việc"
    >
      {/* ========================================================
          1. BONG BÓNG LỜI THOẠI 3D GLASSMORPHISM (TỰ HƯỚNG THEO GÓC)
         ======================================================== */}
      {showSpeechBubble && (
        <div
          className={`pet-speech-bubble-3d ${isRightSide ? 'bubble-dock-right' : 'bubble-dock-left'} ${isTopSide ? 'bubble-dock-top' : 'bubble-dock-bottom'}`}
          style={{
            position: 'absolute',
            [isTopSide ? 'top' : 'bottom']: isMinimized ? '58px' : '78px',
            [isRightSide ? 'right' : 'left']: '0',
            width: '270px',
            maxWidth: 'calc(100vw - 36px)',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.92) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: `1.5px solid ${currentConfig.accentColor}`,
            borderRadius: '18px',
            padding: '12px 14px',
            boxShadow: `0 14px 34px rgba(0, 0, 0, 0.55), 0 0 20px ${currentConfig.glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
            color: '#f8fafc',
            fontSize: '0.82rem',
            lineHeight: 1.55,
            fontWeight: 600,
            pointerEvents: 'auto',
            animation: 'petBubblePop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            zIndex: 10,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header bong bóng */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.05rem', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                {currentConfig.avatar3d}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#fde047', fontWeight: 800, letterSpacing: '0.3px' }}>
                {currentConfig.name}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSpeechBubble(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.7rem',
                transition: 'all 0.15s ease',
              }}
              title="Đóng lời nhắn"
            >
              ✕
            </button>
          </div>

          {/* Lời nhắn gửi động viên */}
          <div style={{ color: '#e2e8f0', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
            {currentQuote}
          </div>

          {/* Mũi tên bong bóng chỉ về bé thú cưng */}
          <div
            style={{
              position: 'absolute',
              [isTopSide ? 'top' : 'bottom']: '-8px',
              [isRightSide ? 'right' : 'left']: isMinimized ? '20px' : '28px',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              [isTopSide ? 'borderBottom' : 'borderTop']: `8px solid ${currentConfig.accentColor}`,
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
            }}
          />
        </div>
      )}

      {/* ========================================================
          2. MENU THAO TÁC 3D (CHO ĂN HỢP LOGIC, ĐỔI BÉ, THU NHỎ)
         ======================================================== */}
      {showActionsMenu && !isMinimized && (
        <div
          className="pet-actions-menu-3d"
          style={{
            position: 'absolute',
            [isTopSide ? 'top' : 'bottom']: '78px',
            [isRightSide ? 'right' : 'left']: '0',
            background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1.5px solid ${currentConfig.accentColor}`,
            borderRadius: '20px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: `0 16px 38px rgba(0, 0, 0, 0.6), 0 0 20px ${currentConfig.glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
            width: '290px',
            boxSizing: 'border-box',
            zIndex: 12,
            animation: 'petBubblePop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header khay thức ăn */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
            <span style={{ fontSize: '0.74rem', color: '#e2e8f0', fontWeight: 800, letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
              {petType === 'dog' ? '🦴 Khay đồ ăn của Cún:' : '🐟 Khay đồ ăn của Mèo:'}
            </span>
            <span
              style={{
                fontSize: '0.66rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                padding: '2px 7px',
                borderRadius: '6px',
                fontWeight: 900,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
              }}
            >
              +5 tim
            </span>
          </div>

          {/* Lưới các món ăn đa dạng */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${currentConfig.foods.length}, 1fr)`,
              gap: '6px',
              padding: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {currentConfig.foods.map((food, idx) => (
              <button
                key={food.id}
                type="button"
                onClick={(e) => handleFeed(e, idx)}
                title={`Cho ${currentConfig.name} ăn ${food.name}`}
                style={{
                  background: currentFoodIndex % currentConfig.foods.length === idx
                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.45) 0%, rgba(217, 119, 6, 0.55) 100%)'
                    : 'rgba(255, 255, 255, 0.07)',
                  border: currentFoodIndex % currentConfig.foods.length === idx
                    ? '1.5px solid #f59e0b'
                    : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '8px 2px',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                  transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.12)';
                  e.currentTarget.style.borderColor = '#f59e0b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.borderColor = currentFoodIndex % currentConfig.foods.length === idx
                    ? '#f59e0b'
                    : 'rgba(255, 255, 255, 0.12)';
                }}
              >
                <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{food.icon}</span>
              </button>
            ))}
          </div>

          {/* Nút Cho ăn nhanh món đang chọn (Không bao giờ bị ngắt dòng hay ép khung) */}
          <button
            type="button"
            className="pet-action-control pet-3d-btn"
            onClick={(e) => handleFeed(e)}
            title={`Cho ${currentConfig.name} ăn ${currentFood.name} (+5 điểm yêu thương)`}
            style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.35) 100%)',
              border: '1.5px solid rgba(245, 158, 11, 0.65)',
              borderRadius: '12px',
              padding: '9px 12px',
              color: '#fef08a',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ fontSize: '1.25rem', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))', flexShrink: 0 }}>{currentFood.icon}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fef08a' }}>
                {currentFood.name}
              </span>
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 900,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.45)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                flexShrink: 0,
              }}
            >
              Măm ngay 😋
            </span>
          </button>

          {/* Nút Đổi qua lại giữa bé Mèo và bé Cún */}
          <button
            type="button"
            className="pet-action-control pet-3d-btn"
            onClick={handleTogglePetType}
            title="Đổi giữa Bé Mèo Mướp và Bé Cún Shiba"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '12px',
              padding: '7px 12px',
              color: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '0.95rem' }}>🔄</span>
            <span style={{ whiteSpace: 'nowrap' }}>Đổi sang: {petType === 'cat' ? '🐕 Bé Cún Shiba' : '🐱 Bé Mèo Mướp'}</span>
          </button>

          {/* Nút Vuốt ve xoa đầu */}
          <button
            type="button"
            className="pet-action-control pet-3d-btn"
            onClick={handlePet}
            title="Xoa đầu cưng nựng để giải tỏa mệt mỏi"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '12px',
              padding: '7px 12px',
              color: '#f8fafc',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '0.95rem' }}>🐾</span>
            <span style={{ whiteSpace: 'nowrap' }}>Xoa đầu cưng nựng (+1 tim)</span>
          </button>

          {/* Nút Thu nhỏ */}
          <button
            type="button"
            className="pet-action-control"
            onClick={handleToggleMinimize}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.72rem',
              cursor: 'pointer',
              padding: '4px',
              textAlign: 'center',
              marginTop: '1px',
              transition: 'color 0.15s ease',
            }}
          >
            _ Thu nhỏ lại
          </button>
        </div>
      )}

      {/* ========================================================
          3. THÂN BÉ PET 3D CHÍNH (3D SPHERE CAPSULE + CỬ ĐỘNG)
         ======================================================== */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          flexDirection: isRightSide ? 'row-reverse' : 'row',
          gap: '6px',
        }}
      >
        <div
          onClick={handlePet}
          onDoubleClick={() => setShowActionsMenu((prev) => !prev)}
          className={`pet-3d-sphere ${isPettingAnim ? 'is-petting' : ''} ${isEatingAnim ? 'is-eating' : ''}`}
          style={{
            position: 'relative',
            width: isMinimized ? '50px' : '70px',
            height: isMinimized ? '50px' : '70px',
            borderRadius: '50%',
            background: currentConfig.bgGradient,
            border: `3px solid ${currentConfig.accentColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMinimized ? '1.8rem' : '2.5rem',
            cursor: isDragging ? 'grabbing' : 'pointer',
            boxShadow: `0 10px 24px rgba(0, 0, 0, 0.45), 0 0 16px ${currentConfig.glowColor}, inset 0 3px 6px rgba(255, 255, 255, 0.8), inset 0 -4px 6px rgba(0, 0, 0, 0.25)`,
            transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease',
          }}
        >
          {/* Tay cầm kéo thả 3D siêu nhỏ */}
          <span
            className="pet-drag-grip"
            style={{
              position: 'absolute',
              top: '2px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.55rem',
              color: 'rgba(0, 0, 0, 0.35)',
              pointerEvents: 'none',
              letterSpacing: '1px',
            }}
          >
            •••
          </span>

          {/* Biểu tượng 3D bé cún / bé mèo với hoạt cảnh thở & nháy mắt */}
          <span
            className="pet-avatar-character"
            style={{
              display: 'inline-block',
              filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.25))',
              transform: isEatingAnim ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {isEatingAnim ? (petType === 'dog' ? '🐶' : '😻') : currentConfig.emoji}
          </span>

          {/* Thức ăn bay vào miệng khi cho ăn */}
          {activeFlyingFood && (
            <span
              className="pet-flying-food"
              style={{
                position: 'absolute',
                top: '-12px',
                right: '-8px',
                fontSize: '1.4rem',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                animation: 'foodNomNom 0.85s ease-in-out forwards',
              }}
            >
              {activeFlyingFood}
            </span>
          )}

          {/* Huy hiệu tình cảm Ruby 3D */}
          {!isMinimized && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '1px 6px',
                borderRadius: '999px',
                border: '1.5px solid #ffffff',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
                letterSpacing: '0.2px',
                zIndex: 3,
              }}
              title={`Điểm yêu thương tích lũy: ${petHappiness} tim. Bấm để vuốt ve tăng điểm!`}
            >
              ❤️ {petHappiness}
            </span>
          )}

          {/* Trái tim & hạt lấp lánh bay phấp phới */}
          {floatingParticles.map((p) => (
            <span
              key={p.id}
              style={{
                position: 'absolute',
                bottom: '36px',
                left: `calc(50% + ${p.left}px)`,
                fontSize: '1.3rem',
                animation: 'petFloatUp 1.25s ease-out forwards',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              {p.emoji}
            </span>
          ))}
        </div>

        {/* Nút mở rộng/thu gọn menu tương tác 3D */}
        {!isMinimized && (
          <button
            type="button"
            className="pet-action-control pet-gear-toggle-btn"
            onClick={() => setShowActionsMenu((prev) => !prev)}
            title={showActionsMenu ? 'Đóng menu' : 'Menu cho ăn & đổi bé'}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.95) 100%)',
              border: `1.5px solid ${currentConfig.accentColor}`,
              color: '#fde047',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              transform: showActionsMenu ? 'rotate(90deg) scale(1.08)' : 'scale(1)',
            }}
          >
            {showActionsMenu ? '✕' : (petType === 'dog' ? '🦴' : '🐟')}
          </button>
        )}

        {/* Nút bung ra khi đang thu nhỏ */}
        {isMinimized && (
          <button
            type="button"
            className="pet-action-control"
            onClick={handleToggleMinimize}
            title="Mở rộng Bé Thú Cưng Bàn Làm Việc"
            style={{
              background: 'linear-gradient(135deg, #1e293b, #0f172a)',
              border: `1.5px solid ${currentConfig.accentColor}`,
              color: '#fde047',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '999px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            Mở rộng
          </button>
        )}
      </div>

      {/* ========================================================
          4. STYLES & ANIMATIONS ĐỘC QUYỀN
         ======================================================== */}
      <style>{`
        .desk-companion-pet-root:hover .pet-3d-sphere:not(.is-dragging) {
          transform: translateY(-3px) scale(1.05);
        }

        .pet-3d-sphere.is-petting {
          animation: petSquish 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .pet-3d-sphere.is-eating {
          animation: petChew 0.85s cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .pet-3d-btn:hover {
          transform: translateY(-1px) scale(1.02);
          filter: brightness(1.12);
        }

        .pet-3d-btn:active {
          transform: translateY(1px) scale(0.97);
        }

        @keyframes petSquish {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.22, 0.85) rotate(-6deg); }
          60% { transform: scale(0.9, 1.15) rotate(4deg); }
        }

        @keyframes petChew {
          0%, 100% { transform: scale(1) translateY(0); }
          25% { transform: scale(1.08, 0.94) translateY(2px) rotate(2deg); }
          50% { transform: scale(0.96, 1.05) translateY(-3px) rotate(-2deg); }
          75% { transform: scale(1.04, 0.98) translateY(1px) rotate(1deg); }
        }

        @keyframes foodNomNom {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1) rotate(0deg);
          }
          40% {
            opacity: 1;
            transform: translate(-10px, 12px) scale(1.3) rotate(-20deg);
          }
          80% {
            opacity: 0.8;
            transform: translate(-18px, 20px) scale(0.7) rotate(15deg);
          }
          100% {
            opacity: 0;
            transform: translate(-22px, 26px) scale(0.2) rotate(45deg);
          }
        }

        @keyframes petBubblePop {
          0% {
            opacity: 0;
            transform: scale(0.85) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes petFloatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.6) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-30px) scale(1.2) rotate(-15deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-65px) scale(1.4) rotate(20deg);
          }
        }
      `}</style>
    </aside>
  );
};
