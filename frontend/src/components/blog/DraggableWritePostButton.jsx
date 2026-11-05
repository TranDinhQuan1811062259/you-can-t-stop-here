import React, { useState, useEffect, useRef } from 'react';
import {
  getFabPos,
  saveFabPos,
  resolveAntiCollision,
  ensureInBounds,
  FAB_SIZES,
} from '../../utils/floatingButtonManager';

export const DraggableWritePostButton = ({ onClick }) => {
  const [btnPos, setBtnPos] = useState(() => {
    const raw = getFabPos('write');
    return resolveAntiCollision('write', raw);
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, btnX: 0, btnY: 0 });
  const hasMovedRef = useRef(false);
  const btnRef = useRef(null);

  // Giữ nút luôn trong khung nhìn khi thay đổi kích thước cửa sổ
  useEffect(() => {
    const handleResize = () => {
      setBtnPos((prev) => {
        const bounded = ensureInBounds('write', prev);
        const resolved = resolveAntiCollision('write', bounded);
        saveFabPos('write', resolved);
        return resolved;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lắng nghe khi nút Tin Nhắn (Chat) di dời vị trí:
  // Nếu nút Chat dời đến gần hoặc đè lên nút Viết tâm sự, nút Viết tâm sự tự động né tránh thông minh!
  useEffect(() => {
    const handleOtherMoved = (e) => {
      if (e.detail?.type === 'chat') {
        setBtnPos((curr) => {
          const safe = resolveAntiCollision('write', curr);
          if (safe.x !== curr.x || safe.y !== curr.y) {
            saveFabPos('write', safe);
            return safe;
          }
          return curr;
        });
      }
    };

    window.addEventListener('freedom_fab_pos_changed', handleOtherMoved);
    return () => window.removeEventListener('freedom_fab_pos_changed', handleOtherMoved);
  }, []);

  // Bắt đầu kéo thả (Chuột hoặc Cảm ứng trên điện thoại / máy tính bảng)
  const handleStartDrag = (clientX, clientY) => {
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      btnX: btnPos.x,
      btnY: btnPos.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (Math.hypot(dx, dy) > 5) {
        hasMovedRef.current = true;
      }

      const nextX = dragStartRef.current.btnX + dx;
      const nextY = dragStartRef.current.btnY + dy;
      setBtnPos(ensureInBounds('write', { x: nextX, y: nextY }));
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - dragStartRef.current.mouseX;
        const dy = e.touches[0].clientY - dragStartRef.current.mouseY;

        if (Math.hypot(dx, dy) > 5) {
          hasMovedRef.current = true;
        }

        const nextX = dragStartRef.current.btnX + dx;
        const nextY = dragStartRef.current.btnY + dy;
        setBtnPos(ensureInBounds('write', { x: nextX, y: nextY }));
      }
    };

    const handleEndDrag = () => {
      setIsDragging(false);

      if (hasMovedRef.current) {
        setBtnPos((current) => {
          // Tự động kiểm tra chống va chạm với nút Chat:
          const resolved = resolveAntiCollision('write', current);
          saveFabPos('write', resolved);
          return resolved;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEndDrag);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDragging]);

  const handleClick = (e) => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }
    if (typeof onClick === 'function') {
      onClick(e);
    }
  };

  return (
    <div
      ref={btnRef}
      className={`draggable-write-post-btn-wrapper ${isDragging ? 'is-dragging' : ''}`}
      style={{
        position: 'fixed',
        left: `${btnPos.x}px`,
        top: `${btnPos.y}px`,
        right: 'auto',
        bottom: 'auto',
        zIndex: isDragging ? 9998 : 9995,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging
          ? 'none'
          : 'left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.2s, box-shadow 0.2s',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      title="✍️ Viết bài tâm sự (Bấm để mở khung viết, hoặc giữ và kéo để di chuyển vị trí tùy thích)"
    >
      <button type="button" className="floating-write-post-btn inner-draggable-btn">
        <span className="fab-drag-handle" title="Kéo để di chuyển">⠿</span>
        <span className="fab-icon">✍️</span>
        <span className="fab-label">Viết tâm sự</span>
      </button>
    </div>
  );
};

