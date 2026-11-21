import React, { useEffect, useRef, useState } from 'react';

/**
 * HeaderAudioVisualizer - Mini Equalizer / Waveform Rhythm Visualizer
 * - Kiến trúc Pure Non-Destructive Visualizer: Không can thiệp hay chiếm quyền Web Audio stream của <audio> element.
 * - Bảo toàn 100% luồng âm thanh nguyên bản: Không bao giờ bị tắt tiếng (CORS Silence), không làm liệt thanh volume/mute.
 * - Mô phỏng phổ âm học Harmonic Wave Synthesis tự nhiên, sinh động đạt chuẩn 60 FPS.
 * - Tự động hạ thấp các cột sóng về trạng thái nghỉ (Zero CPU waste) khi nhạc tạm dừng hoặc unmount (Quy tắc 3 GEMINI.md).
 */
export const HeaderAudioVisualizer = ({
  audioRef,
  isPlaying = false,
  barCount = 8,
  height = 16,
  barWidth = 2.5,
  barGap = 2,
  activeColor = '#38bdf8',
  idleColor = 'rgba(255, 255, 255, 0.22)',
  className = '',
  style = {},
}) => {
  const [barHeights, setBarHeights] = useState(() => Array(barCount).fill(0.15));
  const animFrameRef = useRef(null);
  const tickRef = useRef(0);

  // Vòng lặp animation frame đồng bộ nhịp điệu âm thanh 60 FPS
  useEffect(() => {
    let isCancelled = false;

    const renderLoop = () => {
      if (isCancelled) return;

      if (!isPlaying) {
        // Nhạc đang tạm dừng: Hạ dần các thanh sóng âm về trạng thái nghỉ tối thiểu
        setBarHeights((prev) => {
          let hasActive = false;
          const next = prev.map((val) => {
            const decayed = val * 0.82;
            if (decayed > 0.12) hasActive = true;
            return Math.max(0.1, decayed);
          });
          if (hasActive) {
            animFrameRef.current = requestAnimationFrame(renderLoop);
          }
          return next;
        });
        return;
      }

      tickRef.current += 1;
      const audioEl = audioRef?.current;
      const audioCurrentTime = audioEl && !Number.isNaN(audioEl.currentTime) ? audioEl.currentTime : 0;

      // Phổ nhịp điệu âm học sinh động kết hợp đa sóng sin/cos hài hòa
      const t = tickRef.current * 0.11 + audioCurrentTime * 0.5;
      const newHeights = Array.from({ length: barCount }, (_, i) => {
        // Phân bố năng lượng phổ: Cột tần số thấp (Bass, index nhỏ) dao động mạnh hơn cột cao (Treble)
        const freqWeight = 1.0 - (i / (barCount * 1.6));
        const s1 = Math.sin(t * 1.2 + i * 0.65);
        const s2 = Math.cos(t * 1.85 + i * 0.42);
        const s3 = Math.sin(t * 0.75 - i * 0.3);
        const blended = (s1 * 0.45 + s2 * 0.35 + s3 * 0.2 + 1) / 2;
        
        // Chuẩn hóa tỷ lệ từ 0.16 (sàn) đến 0.98 (đỉnh)
        const heightRatio = Math.max(0.16, Math.min(0.98, blended * freqWeight * 0.82 + 0.18));
        return heightRatio;
      });

      setBarHeights(newHeights);
      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isCancelled = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isPlaying, barCount, audioRef]);

  return (
    <div
      className={`header-audio-waveform-visualizer ${isPlaying ? 'is-active' : 'is-idle'} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: `${barGap}px`,
        height: `${height}px`,
        padding: '0 2px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      {barHeights.map((h, idx) => (
        <span
          key={idx}
          className="waveform-bar-col"
          style={{
            display: 'inline-block',
            width: `${barWidth}px`,
            height: `${Math.max(2, Math.round(h * height))}px`,
            maxHeight: `${height}px`,
            borderRadius: '999px',
            backgroundColor: isPlaying ? activeColor : idleColor,
            transition: isPlaying ? 'height 0.05s linear, background-color 0.25s ease' : 'height 0.2s ease, background-color 0.25s ease',
            boxShadow: isPlaying ? `0 0 6px ${activeColor}55` : 'none',
          }}
        />
      ))}
    </div>
  );
};

export default HeaderAudioVisualizer;
