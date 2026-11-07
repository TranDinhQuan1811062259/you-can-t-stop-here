/**
 * QUẢN LÝ VỊ TRÍ & HỆ THỐNG CHỐNG VA CHẠM TỰ ĐỘNG (ANTI-COLLISION MANAGER)
 * Cho các nút chức năng nổi (Floating Action Buttons):
 * 1. Nút Tin Nhắn (AssistiveChatWidget)
 * 2. Nút Viết Tâm Sự (DraggableWritePostButton)
 *
 * Đảm bảo 2 nút có thể kéo thả di dời tự do khắp màn hình nhưng KHÔNG BAO GIỜ bị đè / che khuất nhau!
 */

export const FAB_SIZES = {
  chat: { width: 58, height: 58 },
  write: { width: 170, height: 48 },
  mascot: { width: 76, height: 86 },
};

/**
 * Lấy toạ độ và kích thước của Widget Linh Vật Sự Kiện Lễ Hội (FloatingFestiveMascot)
 * Để ngăn chặn nút Viết tâm sự đè lên sự kiện
 */
export const getMascotBox = () => {
  if (typeof window === 'undefined') return null;
  const mascotEl = typeof document !== 'undefined' ? document.querySelector('.floating-festive-mascot-widget') : null;
  if (mascotEl) {
    const rect = mascotEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }
  }
  // Vùng chiếm dụng chuẩn của linh vật sự kiện (bottom: 84px, right: 24px)
  return {
    x: window.innerWidth - 104,
    y: window.innerHeight - 170,
    width: 76,
    height: 86,
  };
};

/**
 * Đảm bảo toạ độ luôn nằm gọn gàng bên trong khung nhìn trình duyệt (Viewport Bounds)
 */
export const ensureInBounds = (type, pos) => {
  if (typeof window === 'undefined') return pos;
  const size = FAB_SIZES[type] || { width: 60, height: 60 };
  const margin = 20;
  const maxX = Math.max(margin, window.innerWidth - size.width - margin);
  const maxY = Math.max(margin, window.innerHeight - size.height - margin);

  return {
    x: Math.min(Math.max(margin, Math.round(pos.x)), maxX),
    y: Math.min(Math.max(margin, Math.round(pos.y)), maxY),
  };
};

/**
 * Kiểm tra xem 2 nút có đang giao nhau / đè lên nhau không (kèm vùng đệm an toàn)
 */
export const checkBoxesOverlap = (pos1, size1, pos2, size2, cushion = 12) => {
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
 * Lấy vị trí đã lưu của nút (hoặc trả về vị trí mặc định thông minh, cách xa nhau)
 */
export const getFabPos = (type) => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const key = type === 'chat' ? 'freedom_chat_btn_pos' : 'freedom_write_btn_pos';

  let currentPos = null;
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
        currentPos = ensureInBounds(type, parsed);
        // Tự động đẩy nút Viết tâm sự lên nếu toạ độ đã lưu từ phiên cũ bị đè lên Linh vật sự kiện (bottom: 84px..170px)
        if (
          type === 'write' &&
          currentPos.x > window.innerWidth - 220 &&
          currentPos.y > window.innerHeight - 215
        ) {
          currentPos.y = Math.max(20, window.innerHeight - 235);
          try {
            localStorage.setItem(key, JSON.stringify(currentPos));
          } catch (e) {}
        }
      }
    }
  } catch (e) {}

  if (!currentPos) {
    if (type === 'chat') {
      // Nút Chat mặc định: Góc dưới cùng bên phải
      currentPos = {
        x: Math.max(16, window.innerWidth - 76),
        y: Math.max(16, window.innerHeight - 82),
      };
    } else {
      // Nút Viết tâm sự mặc định: Nằm phía trên cả Linh vật sự kiện (bottom: 84px) và nút Chat (bottom: 24px)
      // Khoảng cách an toàn y = window.innerHeight - 235px để hoàn toàn KHÔNG BAO GIỜ bị đè lên sự kiện
      currentPos = {
        x: Math.max(16, window.innerWidth - 180),
        y: Math.max(20, window.innerHeight - 235),
      };
    }
  }

  return currentPos;
};

/**
 * Lưu vị trí mới và phát sự kiện thông báo để nút còn lại kiểm tra va chạm
 */
export const saveFabPos = (type, pos) => {
  if (typeof window === 'undefined') return;
  const key = type === 'chat' ? 'freedom_chat_btn_pos' : 'freedom_write_btn_pos';
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
 * TỰ ĐỘNG GIẢI QUYẾT VA CHẠM (ANTI-COLLISION REPULSION)
 * Đảm bảo cả 3 thành phần nổi:
 * 1. Nút Chat (AssistiveChatWidget)
 * 2. Nút Viết tâm sự (DraggableWritePostButton)
 * 3. Linh vật sự kiện lễ hội (FloatingFestiveMascot)
 * KHÔNG BAO GIỜ bị đè lên nhau trên bất kỳ độ phân giải nào!
 */
export const resolveAntiCollision = (movingType, candidatePos) => {
  const otherType = movingType === 'chat' ? 'write' : 'chat';
  const otherPos = getFabPos(otherType);
  const movingSize = FAB_SIZES[movingType];
  const otherSize = FAB_SIZES[otherType];
  const mascotBox = getMascotBox();

  let resolved = ensureInBounds(movingType, candidatePos);

  const overlapsOther = checkBoxesOverlap(resolved, movingSize, otherPos, otherSize, 14);
  const overlapsMascot =
    movingType === 'write' && mascotBox
      ? checkBoxesOverlap(
          resolved,
          movingSize,
          mascotBox,
          { width: mascotBox.width, height: mascotBox.height },
          16
        )
      : false;

  // Nếu không va chạm với nút kia và không va chạm với mascot sự kiện, giữ nguyên vị trí người dùng kéo đến
  if (!overlapsOther && !overlapsMascot) {
    return resolved;
  }

  // Nếu là nút Viết tâm sự và đang đè lên mascot sự kiện ở góc dưới phải:
  if (overlapsMascot) {
    const posAboveMascot = ensureInBounds(movingType, {
      x: resolved.x,
      y: mascotBox.y - movingSize.height - 18,
    });
    // Nếu vị trí phía trên mascot an toàn và không đè nút Chat:
    if (!checkBoxesOverlap(posAboveMascot, movingSize, otherPos, otherSize, 10)) {
      return posAboveMascot;
    }
  }

  // Tính toán các phương án dịch chuyển né tránh thông minh:
  const offsetGap = 16;
  const minY = mascotBox && movingType === 'write' ? Math.min(otherPos.y, mascotBox.y) : otherPos.y;
  const minX = mascotBox && movingType === 'write' ? Math.min(otherPos.x, mascotBox.x) : otherPos.x;

  // Phương án 1: Đẩy lên phía trên
  const posAbove = ensureInBounds(movingType, {
    x: resolved.x,
    y: minY - movingSize.height - offsetGap,
  });

  // Phương án 2: Đẩy xuống phía dưới (nếu còn chỗ phía đáy)
  const posBelow = ensureInBounds(movingType, {
    x: resolved.x,
    y: Math.max(otherPos.y + otherSize.height, mascotBox ? mascotBox.y + mascotBox.height : otherPos.y) + offsetGap,
  });

  // Phương án 3: Lệch sang mép trái
  const posLeft = ensureInBounds(movingType, {
    x: minX - movingSize.width - offsetGap,
    y: resolved.y,
  });

  // Phương án 4: Lệch sang mép phải
  const posRight = ensureInBounds(movingType, {
    x: otherPos.x + otherSize.width + offsetGap,
    y: resolved.y,
  });

  // Lọc các vị trí không còn bị giao nhau với cả nút khác và linh vật sự kiện
  const validCandidates = [posAbove, posLeft, posBelow, posRight].filter((cand) => {
    const hitOther = checkBoxesOverlap(cand, movingSize, otherPos, otherSize, 6);
    const hitMascot =
      movingType === 'write' && mascotBox
        ? checkBoxesOverlap(
            cand,
            movingSize,
            mascotBox,
            { width: mascotBox.width, height: mascotBox.height },
            8
          )
        : false;
    return !hitOther && !hitMascot;
  });

  if (validCandidates.length > 0) {
    // Ưu tiên vị trí có khoảng cách di chuyển ngắn nhất
    validCandidates.sort((a, b) => {
      const distA = Math.hypot(a.x - candidatePos.x, a.y - candidatePos.y);
      const distB = Math.hypot(b.x - candidatePos.x, b.y - candidatePos.y);
      return distA - distB;
    });
    return validCandidates[0];
  }

  return posAbove;
};

/**
 * Hít vào mép màn hình thông minh (Snap to nearest screen edge)
 * Tự động hút dạt về mép trái hoặc mép phải tùy theo bên nghiêng khi người dùng thả tay
 */
export const snapToNearestEdge = (type, pos) => {
  if (typeof window === 'undefined') return pos;
  const size = FAB_SIZES[type] || { width: 170, height: 48 };
  const midX = window.innerWidth / 2;
  const margin = 24;

  // Tính tâm của nút để xác định nghiêng hẳn về bên trái hay bên phải
  const buttonCenterX = pos.x + size.width / 2;
  const snappedX =
    buttonCenterX < midX
      ? margin
      : Math.max(margin, window.innerWidth - size.width - margin);

  // Đảm bảo toạ độ Y nằm trong phạm vi hiển thị an toàn
  const candidate = ensureInBounds(type, { x: snappedX, y: pos.y });

  // Kiểm tra chống va chạm sau khi hít vào mép (né nút Chat nếu cùng mép)
  return resolveAntiCollision(type, candidate);
};

