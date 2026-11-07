/**
 * QUẢN LÝ VỊ TRÍ & HỆ THỐNG CHỐNG VA CHẠM TỰ ĐỘNG (ANTI-COLLISION MANAGER)
 * Cho 4 thành phần nổi đa năng có thể kéo thả di dời tự do (Draggable FABs):
 * 1. Nút Tin Nhắn (AssistiveChatWidget)
 * 2. Nút Viết Tâm Sự (DraggableWritePostButton)
 * 3. Nút Sự Kiện Lễ Hội (FloatingFestiveMascot)
 * 4. Thanh Cài Đặt App (PwaInstallPrompt)
 *
 * Đảm bảo cả 4 nút có thể kéo thả di dời tự do khắp màn hình/các góc,
 * bám sát 2 lề đều đặn (Lề Trái 20px & Lề Phải 20px), KHÔNG BAO GIỜ bị đẩy lệch vào trong
 * và KHÔNG BAO GIỜ bị đè / che khuất nhau!
 */

export const FAB_SIZES = {
  chat: { width: 60, height: 60 },
  write: { width: 160, height: 48 },
  mascot: { width: 80, height: 80 },
  pwa: { width: 360, height: 56 },
  pref: { width: 52, height: 52 },
};

export const MARGIN_LEFT = 20;
export const MARGIN_RIGHT = 20; // Đồng nhất lề phải đúng 20px tương tự lề trái
export const MARGIN_TOP = 20;
export const MARGIN_BOTTOM = 24;

/**
 * Đo kích thước màn hình chính xác
 */
export const getViewport = () => {
  if (typeof window === 'undefined') return { width: 1200, height: 800 };
  const width =
    document.documentElement && document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : window.innerWidth;
  const height =
    document.documentElement && document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : window.innerHeight;
  return { width, height };
};

export const getFabKey = (type) => {
  if (type === 'chat') return 'freedom_chat_btn_pos';
  if (type === 'mascot') return 'freedom_mascot_btn_pos';
  if (type === 'pwa') return 'freedom_pwa_btn_pos';
  if (type === 'pref') return 'freedom_pref_btn_pos';
  return 'freedom_write_btn_pos';
};

/**
 * Lấy toạ độ và kích thước của Widget Linh Vật Sự Kiện Lễ Hội (FloatingFestiveMascot)
 */
export const getMascotBox = () => {
  if (typeof window === 'undefined') return null;
  const pos = getFabPos('mascot');
  return {
    x: pos.x,
    y: pos.y,
    width: FAB_SIZES.mascot.width,
    height: FAB_SIZES.mascot.height,
  };
};

/**
 * Đảm bảo toạ độ luôn nằm gọn gàng bên trong khung nhìn trình duyệt (Viewport Bounds)
 */
export const ensureInBounds = (type, pos) => {
  if (typeof window === 'undefined') return pos;
  const size = FAB_SIZES[type] || { width: 60, height: 60 };
  const { width: vpWidth, height: vpHeight } = getViewport();

  const maxX = Math.max(MARGIN_LEFT, vpWidth - size.width - MARGIN_RIGHT);
  const maxY = Math.max(MARGIN_TOP, vpHeight - size.height - MARGIN_BOTTOM);

  return {
    x: Math.min(Math.max(MARGIN_LEFT, Math.round(pos.x)), maxX),
    y: Math.min(Math.max(MARGIN_TOP, Math.round(pos.y)), maxY),
  };
};

/**
 * Kiểm tra xem 2 nút có đang giao nhau / đè lên nhau không
 */
export const checkBoxesOverlap = (pos1, size1, pos2, size2, cushion = 10) => {
  if (!pos1 || !pos2) return false;
  const r1 = {
    left: pos1.x - cushion,
    right: pos1.x + size1.width + cushion,
    top: pos1.y - cushion,
    bottom: pos1.y + size1.height + cushion,
  };
  const r2 = {
    left: pos2.x,
    right: pos2.x + size2.width,
    top: pos2.y,
    bottom: pos2.y + size2.height,
  };

  return !(
    r1.right < r2.left ||
    r1.left > r2.right ||
    r1.bottom < r2.top ||
    r1.top > r2.bottom
  );
};

/**
 * Lấy vị trí đã lưu của nút (hoặc trả về vị trí mặc định thông minh, phân tầng cách nhau)
 */
export const getFabPos = (type) => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const key = getFabKey(type);
  const { width: vpWidth, height: vpHeight } = getViewport();
  const size = FAB_SIZES[type] || { width: 60, height: 60 };

  let currentPos = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        const bounded = ensureInBounds(type, parsed);

        // Tự động căn chỉnh bám sát lề nếu vị trí cũ bị lệch sâu vào trong:
        const rightEdgeX = Math.max(MARGIN_LEFT, vpWidth - size.width - MARGIN_RIGHT);
        if (bounded.x > vpWidth / 2) {
          // Ở nửa phải: tự động chuẩn hóa bám sát mép phải đúng MARGIN_RIGHT (20px)
          currentPos = { x: rightEdgeX, y: bounded.y };
        } else {
          // Ở nửa trái: tự động chuẩn hóa bám sát mép trái đúng MARGIN_LEFT (20px)
          currentPos = { x: MARGIN_LEFT, y: bounded.y };
        }
      }
    }
  } catch (e) {}

  if (!currentPos) {
    if (type === 'chat') {
      // Nút Chat mặc định: Góc dưới cùng bên phải, cách lề phải 20px, cách đáy 24px
      currentPos = {
        x: Math.max(MARGIN_LEFT, vpWidth - 60 - MARGIN_RIGHT),
        y: Math.max(MARGIN_TOP, vpHeight - 60 - 24),
      };
    } else if (type === 'mascot') {
      // Nút Sự kiện lễ hội mặc định: Nằm ngay phía trên nút Chat, cùng bám sát lề phải 20px
      currentPos = {
        x: Math.max(MARGIN_LEFT, vpWidth - 80 - MARGIN_RIGHT),
        y: Math.max(MARGIN_TOP, vpHeight - 60 - 24 - 80 - 14),
      };
    } else if (type === 'pwa') {
      // Thanh Cài đặt App mặc định: Nằm ở góc trên bên phải, cách lề phải 20px
      currentPos = {
        x: Math.max(MARGIN_LEFT, vpWidth - 360 - MARGIN_RIGHT),
        y: 112,
      };
    } else if (type === 'pref') {
      // Cụm Tiện ích Ngày/Đêm & Âm thanh mặc định: Góc dưới cùng bên trái, cách lề trái 20px, cách đáy 24px
      currentPos = {
        x: MARGIN_LEFT,
        y: Math.max(MARGIN_TOP, vpHeight - 52 - 24),
      };
    } else {
      // Nút Viết tâm sự mặc định: Nằm phía trên cả Mascot và Chat, cùng bám sát lề phải 20px
      currentPos = {
        x: Math.max(MARGIN_LEFT, vpWidth - 160 - MARGIN_RIGHT),
        y: Math.max(MARGIN_TOP, vpHeight - 60 - 24 - 80 - 14 - 48 - 14),
      };
    }
  }

  return currentPos;
};

/**
 * Lưu vị trí mới và phát sự kiện thông báo để các nút còn lại kiểm tra va chạm
 */
export const saveFabPos = (type, pos) => {
  if (typeof window === 'undefined') return;
  const key = getFabKey(type);
  const bounded = ensureInBounds(type, pos);
  try {
    localStorage.setItem(key, JSON.stringify(bounded));
  } catch (e) {}

  window.dispatchEvent(
    new CustomEvent('freedom_fab_pos_changed', {
      detail: { type, pos: bounded },
    })
  );
  return bounded;
};

/**
 * TỰ ĐỘNG GIẢI QUYẾT VA CHẠM (ANTI-COLLISION REPULSION CHO CẢ 4 NÚT)
 * - Khi các nút ở mép màn hình: BẮT BUỘC chỉ né dọc Y, TUYỆT ĐỐI KHÔNG né ngang X
 *   để các nút luôn luôn giữ nguyên hàng dọc thẳng tắp bám sát lề 20px!
 */
export const resolveAntiCollision = (movingType, candidatePos, keepOnEdge = false) => {
  const allTypes = ['chat', 'write', 'mascot', 'pwa', 'pref'];
  const otherTypes = allTypes.filter((t) => t !== movingType);
  const movingSize = FAB_SIZES[movingType] || { width: 60, height: 60 };
  const { width: vpWidth } = getViewport();

  let resolved = ensureInBounds(movingType, candidatePos);

  // Kiểm tra xem vị trí có đang thuộc phạm vi bám mép (trái hoặc phải)
  const isNearLeftEdge = resolved.x <= MARGIN_LEFT + 80;
  const isNearRightEdge = resolved.x >= vpWidth - movingSize.width - MARGIN_RIGHT - 80;
  const lockToEdge = keepOnEdge || isNearLeftEdge || isNearRightEdge;

  // Nếu đang ở mép: Khóa cứng X về đúng sát mép (20px)
  if (lockToEdge) {
    if (resolved.x < vpWidth / 2) {
      resolved.x = MARGIN_LEFT;
    } else {
      resolved.x = Math.max(MARGIN_LEFT, vpWidth - movingSize.width - MARGIN_RIGHT);
    }
  }

  const otherItems = otherTypes.map((type) => ({
    type,
    pos: getFabPos(type),
    size: FAB_SIZES[type] || { width: 60, height: 60 },
  }));

  const collidingOthers = otherItems.filter((other) =>
    checkBoxesOverlap(resolved, movingSize, other.pos, other.size, 10)
  );

  // Nếu không va chạm với nút nào, giữ nguyên vị trí an toàn
  if (collidingOthers.length === 0) {
    return resolved;
  }

  // Nếu có va chạm, né tránh: ƯU TIÊN NÉ DỌC TRÊN CÙNG CỘT X
  const offsetGap = 14;
  const candidates = [];

  for (const coll of collidingOthers) {
    // 1. Phía trên (Cùng cột X)
    candidates.push(
      ensureInBounds(movingType, {
        x: resolved.x,
        y: coll.pos.y - movingSize.height - offsetGap,
      })
    );
    // 2. Phía dưới (Cùng cột X)
    candidates.push(
      ensureInBounds(movingType, {
        x: resolved.x,
        y: coll.pos.y + coll.size.height + offsetGap,
      })
    );

    // Chỉ thử né ngang nếu nút đang kéo thả lơ lửng GIỮA màn hình (không ở mép)
    if (!lockToEdge) {
      candidates.push(
        ensureInBounds(movingType, {
          x: coll.pos.x - movingSize.width - offsetGap,
          y: resolved.y,
        })
      );
      candidates.push(
        ensureInBounds(movingType, {
          x: coll.pos.x + coll.size.width + offsetGap,
          y: resolved.y,
        })
      );
    }
  }

  // Lọc các vị trí không va chạm với BẤT KỲ nút nào khác
  const validCandidates = candidates.filter((cand) => {
    return !otherItems.some((other) =>
      checkBoxesOverlap(cand, movingSize, other.pos, other.size, 6)
    );
  });

  if (validCandidates.length > 0) {
    validCandidates.sort((a, b) => {
      const distA = Math.hypot(a.x - candidatePos.x, a.y - candidatePos.y);
      const distB = Math.hypot(b.x - candidatePos.x, b.y - candidatePos.y);
      return distA - distB;
    });
    return validCandidates[0];
  }

  // Quét dọc (Up/Down) để giữ nguyên vị trí bám mép X:
  for (let delta = 16; delta <= 600; delta += 16) {
    const up = ensureInBounds(movingType, { x: resolved.x, y: resolved.y - delta });
    if (!otherItems.some((other) => checkBoxesOverlap(up, movingSize, other.pos, other.size, 6))) {
      return up;
    }
    const down = ensureInBounds(movingType, { x: resolved.x, y: resolved.y + delta });
    if (!otherItems.some((other) => checkBoxesOverlap(down, movingSize, other.pos, other.size, 6))) {
      return down;
    }
  }

  return candidates[0] || resolved;
};

/**
 * Hít vào mép màn hình thông minh (Snap to nearest screen edge)
 * Tự động hút dạt về mép trái (20px) hoặc mép phải (20px tương tự lề trái)
 * BẮT BUỘC giữ nguyên toạ độ trên mép (keepOnEdge = true)
 */
export const snapToNearestEdge = (type, pos) => {
  if (typeof window === 'undefined') return pos;
  const size = FAB_SIZES[type] || { width: 60, height: 60 };
  const { width: vpWidth } = getViewport();
  const midX = vpWidth / 2;

  // Tính tâm của nút để xác định nghiêng hẳn về bên trái hay bên phải
  const buttonCenterX = pos.x + size.width / 2;
  const snappedX =
    buttonCenterX < midX
      ? MARGIN_LEFT
      : Math.max(MARGIN_LEFT, vpWidth - size.width - MARGIN_RIGHT);

  // Đảm bảo toạ độ Y nằm trong phạm vi an toàn
  const candidate = ensureInBounds(type, { x: snappedX, y: pos.y });

  // Kiểm tra chống va chạm sau khi hít vào mép - giữ nguyên trên mép cột X
  return resolveAntiCollision(type, candidate, true);
};
