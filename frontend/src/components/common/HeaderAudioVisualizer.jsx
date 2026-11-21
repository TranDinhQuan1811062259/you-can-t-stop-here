import React, { useEffect, useRef, useState } from 'react';
import { getAudioContext } from '../../utils/soundEffects';

/**
 * Cache lưu trữ các node Web Audio theo từng HTMLAudioElement
 * Ngăn chặn tuyệt đối lỗi InvalidStateError khi gọi createMediaElementSource nhiều lần
 */
const mediaSourceCache = new WeakMap();

/**
 * HeaderAudioVisualizer - Mini Equalizer / Waveform Visualizer
 * - Kết nối trực tiếp Web Audio API (AnalyserNode) để phân tích tần số thời gian thực.
 * - Tự động kích hoạt cơ chế Fallback mượt mà (Harmonic Wave) khi không truy cập được node audio hoặc bị chặn bởi CORS/Autoplay.
 * - Tự động hạ thấp các cột sóng về trạng thái nghỉ (Zero CPU waste) khi nhạc tạm dừng.
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
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);

  // Khởi tạo hoặc tái sử dụng AnalyserNode an toàn
  useEffect(() => {
    const audioEl = audioRef?.current;
    if (!audioEl) return;

    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (!mediaSourceCache.has(audioEl)) {
          const source = ctx.createMediaElementSource(audioEl);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.78;
          analyser.minDecibels = -85;
          analyser.maxDecibels = -10;

          source.connect(analyser);
          analyser.connect(ctx.destination);

          mediaSourceCache.set(audioEl, { source, analyser, ctx });
        }

        const bundle = mediaSourceCache.get(audioEl);
        if (bundle?.analyser) {
          analyserRef.current = bundle.analyser;
          dataArrayRef.current = new Uint8Array(bundle.analyser.frequencyBinCount);
        }
      }
    } catch (err) {
      // Bắt êm ái nếu trình duyệt hạn chế hoặc audio element đã được chuyển hướng
      analyserRef.current = null;
    }
  }, [audioRef]);

  // Vòng lặp animation frame đồng bộ nhịp điệu âm thanh
  useEffect(() => {
    let isCancelled = false;

    // Đánh thức AudioContext nếu đang ở trạng thái suspended khi có lệnh phát
    if (isPlaying) {
      try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      } catch (_) {}
    }

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
      let hasRealSignal = false;
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;

      // 1. Phân tích phổ tần số thời gian thực từ Web Audio API AnalyserNode
      if (analyser && dataArray) {
        try {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          if (sum > 10) {
            hasRealSignal = true;
            const step = Math.max(1, Math.floor(dataArray.length / barCount));
            const newHeights = Array.from({ length: barCount }, (_, i) => {
              const binIdx = Math.min(dataArray.length - 1, i * step);
              const val = dataArray[binIdx] || 0;
              // Chuẩn hóa tỷ lệ từ 0.15 (tối thiểu) đến 1.0 (tối đa)
              const normalized = Math.max(0.15, Math.min(1, val / 220));
              return normalized;
            });
            setBarHeights(newHeights);
          }
        } catch (_) {
          hasRealSignal = false;
        }
      }

      // 2. Cơ chế Fallback hữu cơ (Harmonic Wave Rhythm) khi chưa bắt được tần số hoặc cross-origin
      if (!hasRealSignal) {
        const t = tickRef.current * 0.1;
        const fallbackHeights = Array.from({ length: barCount }, (_, i) => {
          const s1 = Math.sin(t + i * 0.55);
          const s2 = Math.cos(t * 1.35 + i * 0.35);
          const s3 = Math.sin(t * 0.7 - i * 0.25);
          const blended = (s1 + s2 + s3 + 3) / 6;
          return Math.max(0.16, Math.min(0.96, blended * 0.82 + 0.18));
        });
        setBarHeights(fallbackHeights);
      }

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
  }, [isPlaying, barCount]);

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
