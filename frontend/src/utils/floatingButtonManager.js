/**
 * QUẢN LÝ VỊ TRÍ & HỆ THỐNG CHỐNG VA CHẠM TỰ ĐỘNG (ANTI-COLLISION MANAGER)
 * Cho 4 thành phần nổi đa năng có thể kéo thả di dời tự do (Draggable FABs):
 * 1. Nút Tin Nhắn (AssistiveChatWidget)
 * 2. Nút Viết Tâm Sự (DraggableWritePostButton)
 * 3. Nút Sự Kiện Lễ Hội (FloatingFestiveMascot)
 * 4. Thanh Cài Đặt App (PwaInstallPrompt)
 *
 * Đảm bảo cả 4 nút có thể kéo thả di dời tự do khắp màn hình/các góc,
 * bám sát lề phải & lề trái đều đặn 20px, THẲNG TẮP TRÊN CÙNG MỘT HÀNG DỌC (VERTICAL RAIL),
 * KHÔNG BAO GIỜ bị đẩy lệch zíc-zắc vào trong, KHÔNG BAO GIỜ bị tràn mép / cắt cụt chữ
 * và KHÔNG BAO GIỜ bị đè / che khuất nhau!
 */

// Tự động reset và đồng bộ toạ độ lề phải chuẩn xác, tránh che lấp vùng Hero Banner
const FAB_ALIGN_VERSION = 'freedom_fab_aligned_v26';
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem(FAB_ALIGN_VERSION) !== 'true') {
      localStorage.removeItem('freedom_write_btn_pos');
      localStorage.removeItem('freedom_mascot_btn_pos');
      localStorage.removeItem('freedom_chat_btn_pos');
      localStorage.removeItem('freedom_pwa_btn_pos');
      localStorage.removeItem('freedom_desk_pet_pos');
      localStorage.setItem(FAB_ALIGN_VERSION, 'true');
    }
  } catch (_) {}
}

export const FAB_SIZES = {
  chat: { width: 56, height: 56 },
  write: { width: 156, height: 44 },
  mascot: { width: 88, height: 74 },
  pwa: { width: 136, height: 40 }, // Chuẩn kích thước mini pill mặc định của thanh PWA
  pref: { width: 52, height: 52 },
  radio: { width: 310, height: 46 },
  pet: { width: 92, height: 68 }, // Thu gọn nhẹ chiều ngang để bám mép phải an toàn
};

export const MARGIN_LEFT = 24;
export const MARGIN_RIGHT = 32; // Đồng nhất thụt lề phải an toàn 32px, chống cấn thanh cuộn và mép màn hình
export const MARGIN_TOP = 20;
export const MARGIN_BOTTOM = 24;
export const FAB_GAP = 16; // Khoảng cách đều tăm tắp giữa các nút nổi (16px)

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

/**
 * Lấy kích thước tương thích linh hoạt theo kích thước màn hình
 * (Trên mobile 320px–640px, nút Viết bài tự co về dạng tròn 48x48px để không che khuất bài viết)
 */
export const getFabDimensions = (type) => {
  if (typeof window === 'undefined') return FAB_SIZES[type] || { width: 58, height: 58 };
  const { width: vpWidth } = getViewport();
  if (type === 'write' && vpWidth <= 640) {
    return { width: 48, height: 48 };
  }
  return FAB_SIZES[type] || { width: 58, height: 58 };
};

export const getFabKey = (type) => {
  if (type === 'chat') return 'freedom_chat_btn_pos';
  if (type === 'mascot') return 'freedom_mascot_btn_pos';
  if (type === 'pwa') return 'freedom_pwa_btn_pos';
  if (type === 'pref') return 'freedom_pref_btn_pos';
  if (type === 'radio') return 'freedom_radio_btn_pos';
  if (type === 'pet') return 'freedom_desk_pet_pos';
  return 'freedom_write_btn_pos';
};

/**
 * Đảm bảo toạ độ luôn nằm gọn gàng bên trong khung nhìn trình duyệt (Viewport Bounds)
 */
export const ensureInBounds = (type, pos, dynamicWidth = null) => {
  if (typeof window === 'undefined') return pos;
  const baseSize = getFabDimensions(type);
  const size = {
    width: dynamicWidth || baseSize.width,
    height: baseSize.height,
  };
  const { width: vpWidth, height: vpHeight } = getViewport();
  const isMobile = vpWidth <= 640;
  const safeMarginLeft = isMobile ? 12 : MARGIN_LEFT;
  const safeMarginRight = isMobile ? 12 : MARGIN_RIGHT;
  const safeMarginBottom = isMobile ? 20 : MARGIN_BOTTOM;

  const maxX = Math.max(safeMarginLeft, vpWidth - size.width - safeMarginRight);
  const maxY = Math.max(MARGIN_TOP, vpHeight - size.height - safeMarginBottom);

  return {
    x: Math.min(Math.max(safeMarginLeft, Math.round(pos.x)), maxX),
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
 * Lấy vị trí đã lưu của nút (hoặc trả về vị trí mặc định thông minh, phân tầng đều đặn trên trục dọc)
 */
export const getFabPos = (type) => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const key = getFabKey(type);
  const { width: vpWidth, height: vpHeight } = getViewport();
  const isMobile = vpWidth <= 640;
  const safeMarginLeft = isMobile ? 12 : MARGIN_LEFT;
  const safeMarginRight = isMobile ? 12 : MARGIN_RIGHT;
  const safeMarginBottom = isMobile ? 24 : MARGIN_BOTTOM;
  const size = getFabDimensions(type);

  let currentPos = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        const bounded = ensureInBounds(type, parsed);

        // Tự động căn chỉnh bám sát lề nếu vị trí cũ bị lệch sâu vào trong:
        const rightEdgeX = Math.max(safeMarginLeft, vpWidth - size.width - safeMarginRight);
        if (bounded.x > vpWidth / 2) {
          // Ở nửa phải: tự động chuẩn hóa bám sát mép phải đúng safeMarginRight (12px mobile, 32px desktop)
          currentPos = { x: rightEdgeX, y: bounded.y };
        } else {
          // Ở nửa trái: tự động chuẩn hóa bám sát mép trái đúng safeMarginLeft (12px mobile, 24px desktop)
          currentPos = { x: safeMarginLeft, y: bounded.y };
        }
      }
    }
  } catch (e) {}

  if (!currentPos) {
    const writeDim = getFabDimensions('write'); // 48x48 trên mobile, 156x44 trên desktop
    const chatDim = getFabDimensions('chat');
    const mascotDim = getFabDimensions('mascot');
    const pwaDim = getFabDimensions('pwa');
    const petDim = getFabDimensions('pet');

    const writeH = writeDim.height;
    const chatH = chatDim.height;
    const mascotH = mascotDim.height;
    const pwaH = pwaDim.height;
    const stackGap = vpHeight < 780 ? 10 : FAB_GAP;
    const safeMinLowerY = Math.max(MARGIN_TOP, Math.round(vpHeight * 0.44));

    if (type === 'write') {
      // 1. Nút Viết tâm sự mặc định: Nằm ở góc dưới cùng bên phải, cách đáy safeMarginBottom, cách lề phải safeMarginRight
      currentPos = {
        x: Math.max(safeMarginLeft, vpWidth - writeDim.width - safeMarginRight),
        y: Math.max(MARGIN_TOP, vpHeight - writeH - safeMarginBottom),
      };
    } else if (type === 'chat') {
      // 2. Nút Chat mặc định: Nằm ngay phía trên nút Viết tâm sự
      currentPos = {
        x: Math.max(safeMarginLeft, vpWidth - chatDim.width - safeMarginRight),
        y: Math.max(MARGIN_TOP, vpHeight - writeH - safeMarginBottom - chatH - stackGap),
      };
    } else if (type === 'mascot') {
      // 3. Nút Sự kiện lễ hội mặc định: Giữ ở nửa dưới bên phải, không leo lên vùng Hero h1
      currentPos = {
        x: Math.max(safeMarginLeft, vpWidth - mascotDim.width - safeMarginRight),
        y: Math.max(safeMinLowerY, vpHeight - writeH - safeMarginBottom - chatH - stackGap - mascotH - stackGap),
      };
    } else if (type === 'pwa') {
      // 4. Thanh Cài đặt App mặc định
      currentPos = {
        x: Math.max(safeMarginLeft, vpWidth - pwaDim.width - safeMarginRight),
        y: Math.max(safeMinLowerY, vpHeight - writeH - safeMarginBottom - chatH - stackGap - mascotH - stackGap - pwaH - stackGap),
      };
    } else if (type === 'pet') {
      // 5. Bé Thú Cưng Bàn Làm Việc mặc định: Bám sát mép phải ở nửa dưới màn hình, tránh vùng Hero Banner
      const petH = petDim.height;
      currentPos = {
        x: Math.max(safeMarginLeft, vpWidth - petDim.width - safeMarginRight),
        y: Math.max(
          safeMinLowerY,
          vpHeight - writeH - safeMarginBottom - chatH - stackGap - mascotH - stackGap - pwaH - stackGap - petH - stackGap
        ),
      };
    } else if (type === 'pref') {
      // Cụm Tiện ích Ngày/Đêm & Âm thanh mặc định: Góc dưới cùng bên trái, cách lề trái safeMarginLeft, cách đáy safeMarginBottom
      currentPos = {
        x: safeMarginLeft,
        y: Math.max(MARGIN_TOP, vpHeight - 52 - safeMarginBottom),
      };
    } else if (type === 'radio') {
      // Thanh Mini Radio mặc định: Góc dưới bên trái, phía trên cụm tiện ích pref, cách đáy 90px
      currentPos = {
        x: safeMarginLeft,
        y: Math.max(MARGIN_TOP, vpHeight - 46 - 90),
      };
    } else {
      currentPos = {
        x: Math.max(safeMarginLeft, vpWidth - writeDim.width - safeMarginRight),
        y: Math.max(MARGIN_TOP, vpHeight - writeH - safeMarginBottom),
      };
    }
  }

  return currentPos;
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
 * Lưu vị trí mới và phát sự kiện thông báo để các nút còn lại kiểm tra va chạm
 */
let isDispatchingFabEvent = false;

export const saveFabPos = (type, pos, shouldNotify = false) => {
  if (typeof window === 'undefined') return pos;
  const key = getFabKey(type);
  const bounded = ensureInBounds(type, pos);

  // 1. Kiểm tra xem toạ độ có thực sự thay đổi không để tránh ghi đè và trigger không cần thiết
  try {
    const prevStr = localStorage.getItem(key);
    if (prevStr) {
      const prev = JSON.parse(prevStr);
      if (prev.x === bounded.x && prev.y === bounded.y) {
        return bounded;
      }
    }
    localStorage.setItem(key, JSON.stringify(bounded));
  } catch (e) {}

  // 2. Chỉ phát sự kiện thông báo khi được chỉ định rõ ràng (khi người dùng thả chuột sau khi kéo)
  if (shouldNotify && !isDispatchingFabEvent) {
    isDispatchingFabEvent = true;
    setTimeout(() => {
      try {
        window.dispatchEvent(
          new CustomEvent('freedom_fab_pos_changed', {
            detail: { type, pos: bounded },
          })
        );
      } finally {
        isDispatchingFabEvent = false;
      }
    }, 40);
  }

  return bounded;
};

/**
 * TỰ ĐỘNG GIẢI QUYẾT VA CHẠM (ANTI-COLLISION REPULSION CHO CÁC NÚT)
 * - Khi các nút ở mép màn hình: BẮT BUỘC chỉ né dọc Y, TUYỆT ĐỐI KHÔNG né ngang X
 *   để các nút luôn luôn giữ nguyên hàng dọc thẳng tắp bám sát lề!
 */
export const resolveAntiCollision = (movingType, candidatePos, keepOnEdge = false, dynamicWidth = null) => {
  const allTypes = ['chat', 'write', 'mascot', 'pwa', 'pref', 'radio', 'pet'];
  const otherTypes = allTypes.filter((t) => t !== movingType);
  const baseSize = FAB_SIZES[movingType] || { width: 58, height: 58 };
  const movingSize = {
    width: dynamicWidth || baseSize.width,
    height: baseSize.height,
  };
  const { width: vpWidth } = getViewport();

  let resolved = ensureInBounds(movingType, candidatePos, movingSize.width);

  // Kiểm tra xem vị trí có đang thuộc phạm vi bám mép (trái hoặc phải)
  const isRightHalf = resolved.x >= vpWidth / 2;
  const isNearLeftEdge = resolved.x <= MARGIN_LEFT + 80;
  const isNearRightEdge = resolved.x >= vpWidth - movingSize.width - MARGIN_RIGHT - 80;
  const lockToEdge = keepOnEdge || isNearLeftEdge || isNearRightEdge || isRightHalf;

  // Nếu đang ở mép: Khóa cứng X về đúng sát mép
  if (lockToEdge) {
    if (!isRightHalf && isNearLeftEdge) {
      resolved.x = MARGIN_LEFT;
    } else {
      resolved.x = Math.max(MARGIN_LEFT, vpWidth - movingSize.width - MARGIN_RIGHT);
    }
  }

  const otherItems = otherTypes.map((type) => ({
    type,
    pos: getFabPos(type),
    size: FAB_SIZES[type] || { width: 58, height: 58 },
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
    if (!lockToEdge && !isRightHalf && !isNearLeftEdge) {
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
    // Nếu ở mép, đảm bảo cand.x giữ nguyên cột mép X
    if (lockToEdge && cand.x !== resolved.x) return false;
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

  // Luôn khóa cứng resolved.x khi ở mép
  return { x: resolved.x, y: candidates[0]?.y || resolved.y };
};

/**
 * Hít vào mép màn hình thông minh (Snap to nearest screen edge)
 * Tự động hút dạt về mép trái hoặc mép phải an toàn
 * BẮT BUỘC giữ nguyên toạ độ trên mép (keepOnEdge = true)
 */
export const snapToNearestEdge = (type, pos, dynamicWidth = null) => {
  if (typeof window === 'undefined') return pos;
  const baseSize = getFabDimensions(type);
  const size = {
    width: dynamicWidth || baseSize.width,
    height: baseSize.height,
  };
  const { width: vpWidth } = getViewport();
  const isMobile = vpWidth <= 640;
  const safeMarginLeft = isMobile ? 12 : MARGIN_LEFT;
  const safeMarginRight = isMobile ? 12 : MARGIN_RIGHT;
  const midX = vpWidth / 2;

  // Tính tâm của nút để xác định nghiêng hẳn về bên trái hay bên phải
  const buttonCenterX = pos.x + size.width / 2;
  const snappedX =
    buttonCenterX < midX
      ? safeMarginLeft
      : Math.max(safeMarginLeft, vpWidth - size.width - safeMarginRight);

  // Đảm bảo toạ độ Y nằm trong phạm vi an toàn
  const candidate = ensureInBounds(type, { x: snappedX, y: pos.y }, size.width);

  // Kiểm tra chống va chạm sau khi hít vào mép - giữ nguyên trên mép cột X
  return resolveAntiCollision(type, candidate, true, size.width);
};
