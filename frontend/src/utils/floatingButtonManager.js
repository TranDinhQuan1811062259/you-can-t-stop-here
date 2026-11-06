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
      // Nút Viết tâm sự mặc định: Nằm ở phía trên nút Chat với khoảng cách an toàn 68px
      currentPos = {
        x: Math.max(16, window.innerWidth - 165),
        y: Math.max(16, window.innerHeight - 150),
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
 * Khi nút A được kéo đến gần hoặc đè lên nút B:
 * Tự động tìm vị trí kề cạnh an toàn gần nhất (ở trên, ở dưới, bên trái hoặc góc đối diện)
 * để 2 nút KHÔNG BAO GIỜ bị đè lên nhau!
 */
export const resolveAntiCollision = (movingType, candidatePos) => {
  const otherType = movingType === 'chat' ? 'write' : 'chat';
  const otherPos = getFabPos(otherType);
  const movingSize = FAB_SIZES[movingType];
  const otherSize = FAB_SIZES[otherType];

  let resolved = ensureInBounds(movingType, candidatePos);

  // Nếu không va chạm, giữ nguyên vị trí người dùng muốn
  if (!checkBoxesOverlap(resolved, movingSize, otherPos, otherSize, 14)) {
    return resolved;
  }

  // Nếu bị đè, tính toán 4 phương án dịch chuyển né tránh:
  const offsetGap = 16;

  // Phương án 1: Đẩy lên phía trên nút kia
  const posAbove = ensureInBounds(movingType, {
    x: resolved.x,
    y: otherPos.y - movingSize.height - offsetGap,
  });

  // Phương án 2: Đẩy xuống phía dưới nút kia
  const posBelow = ensureInBounds(movingType, {
    x: resolved.x,
    y: otherPos.y + otherSize.height + offsetGap,
  });

  // Phương án 3: Lệch sang mép trái của nút kia
  const posLeft = ensureInBounds(movingType, {
    x: otherPos.x - movingSize.width - offsetGap,
    y: resolved.y,
  });

  // Phương án 4: Lệch sang mép phải của nút kia
  const posRight = ensureInBounds(movingType, {
    x: otherPos.x + otherSize.width + offsetGap,
    y: resolved.y,
  });

  // Lọc các vị trí không còn bị giao nhau
  const validCandidates = [posAbove, posBelow, posLeft, posRight].filter(
    (cand) => !checkBoxesOverlap(cand, movingSize, otherPos, otherSize, 6)
  );

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

