import React, { useEffect, useRef } from 'react';

/**
 * Hiệu ứng Canvas Hạt Tia Lửa (Flame Sparks Confetti)
 * Dùng HTML5 Canvas thuần, 60fps mượt mà, tự động dọn dẹp bộ nhớ và animation frame khi kết thúc.
 */
export const FlameSparksEffect = ({ origin, duration = 2500, onComplete }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let isCancelled = false;

    // Thiết lập kích thước canvas theo khung nhìn
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Điểm xuất phát của hạt lửa (mặc định từ vị trí truyền vào hoặc giữa màn hình)
    const startX = origin?.x ?? window.innerWidth / 2;
    const startY = origin?.y ?? window.innerHeight * 0.55;

    const sparkColors = [
      '#FF4500', // Đỏ cam rực
      '#FF6B00', // Cam lửa
      '#FF8C00', // Hổ phách
      '#FFA500', // Cam vàng
      '#FFB800', // Vàng hoàng kim
      '#FFD700', // Vàng kim tuyến
      '#FFF3D1', // Trắng ngà đốm sáng
    ];

    // Khởi tạo 55 hạt tia lửa bùng lên
    const particleCount = 55;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI / 180) * (200 + Math.random() * 140); // Hướng xiên lên trên từ 200° đến 340°
      const speed = 2.5 + Math.random() * 6.5;
      const size = 2 + Math.random() * 4.5;
      const life = 1200 + Math.random() * 1200; // Thời gian sống từng hạt (1.2s - 2.4s)

      particles.push({
        x: startX + (Math.random() - 0.5) * 40,
        y: startY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5, // Lực đẩy phụ hướng lên trời
        size,
        initialSize: size,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        life,
        maxLife: life,
        age: 0,
        wobbleSpeed: 0.05 + Math.random() * 0.1,
        wobbleAmplitude: 0.8 + Math.random() * 1.5,
      });
    }

    const startTime = performance.now();

    const render = (currentTime) => {
      if (isCancelled) return;

      const elapsed = currentTime - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let aliveCount = 0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age = elapsed;

        if (p.age < p.maxLife) {
          aliveCount++;
          const progress = p.age / p.maxLife; // 0 -> 1

          // Chuyển động: Gió nhẹ lắc lư + lực nổi khí nóng hướng lên
          p.x += p.vx + Math.sin(p.age * p.wobbleSpeed) * p.wobbleAmplitude;
          p.y += p.vy;

          // Lực cản không khí làm giảm dần vận tốc ngang
          p.vx *= 0.985;
          // Lực nâng nhiệt quyển giúp hạt lửa bay bồng bềnh
          p.vy -= 0.02;

          // Kích thước co nhỏ dần khi tàn
          p.size = p.initialSize * (1 - progress * 0.7);

          // Độ trong suốt mờ dần về cuối
          const alpha = Math.max(0, 1 - Math.pow(progress, 1.8));

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 12;
          ctx.shadowColor = p.color;

          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }
      }

      if (aliveCount > 0 && elapsed < duration) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (typeof onComplete === 'function') {
          onComplete();
        }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    // Cleanup triệt để khi unmount (Quy tắc 3 GEMINI.md)
    return () => {
      isCancelled = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', setCanvasSize);
    };
  }, [duration, onComplete, origin]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999999,
      }}
      aria-hidden="true"
    />
  );
};

export default FlameSparksEffect;
