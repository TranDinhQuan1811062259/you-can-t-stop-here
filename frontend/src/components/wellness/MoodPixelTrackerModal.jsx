import React, { useState, useEffect } from 'react';
import { playClickSound, playStarChimeSound, playWarmthSound } from '../../utils/soundEffects';

const MOOD_PALETTES = [
  { id: 'peaceful', label: 'Bình Yên & Thư Thái', color: '#10b981', emoji: '🟢', quote: 'Tâm trí tĩnh lặng như mặt hồ êm ả.' },
  { id: 'productive', label: 'Năng Lượng & Tự Hào', color: '#f59e0b', emoji: '🟡', quote: 'Hoàn thành nhiều mục tiêu xuất sắc!' },
  { id: 'stressed', label: 'Áp Lực & Burnout', color: '#ef4444', emoji: '🔴', quote: 'Đã rất nỗ lực vượt qua ngày bão giông.' },
  { id: 'reflective', label: 'Suy Tư & Trầm Lắng', color: '#8b5cf6', emoji: '🟣', quote: 'Một khoảng lặng cần thiết cho tâm hồn.' },
  { id: 'vulnerable', label: 'Tủi Thân & Cần Cái Ôm', color: '#06b6d4', emoji: '🔵', quote: 'Yếu lòng một chút không sao, bạn đã rất giỏi rồi.' },
  { id: 'empty', label: 'Trống Rỗng & Cạn Pin', color: '#64748b', emoji: '⚪', quote: 'Hãy nghỉ ngơi để sạc lại năng lượng nhé.' },
];

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
  ctx.closePath();
};

const drawMoodWallpaper = (canvas, pixelData, currentYear, currentMonth, daysInMonth, stats) => {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  // 1. Nền Gradient Đêm Huyền Ảo
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#090d16');
  bgGrad.addColorStop(0.35, '#0f172a');
  bgGrad.addColorStop(0.7, '#1e1b4b');
  bgGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Hiệu ứng ánh sáng hào quang (Ambient Glow Orbs)
  const orb1 = ctx.createRadialGradient(140, 160, 20, 140, 160, 320);
  orb1.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
  orb1.addColorStop(1, 'rgba(6, 182, 212, 0)');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, w, h);

  const orb2 = ctx.createRadialGradient(w - 140, h - 220, 20, w - 140, h - 220, 350);
  orb2.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
  orb2.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, w, h);

  // Các đốm sao lung linh
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  [
    [90, 80], [750, 100], [720, 480], [80, 540], [740, 860], [100, 940], [420, 55], [680, 260]
  ].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Khung viền ngoài nghệ thuật (Card Container Border)
  const margin = 36;
  const cardW = w - margin * 2;
  const cardH = h - margin * 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, margin, margin, cardW, cardH, 28);
  ctx.stroke();

  // 4. Tiêu đề Header & Huy hiệu
  const badgeW = 270;
  const badgeH = 34;
  const badgeX = (w - badgeW) / 2;
  const badgeY = 65;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 17);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#67e8f9';
  ctx.textAlign = 'center';
  ctx.fillText('🌱 FREEDOM WELLNESS MOSAIC', w / 2, badgeY + 22);

  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = 'rgba(254, 240, 138, 0.35)';
  ctx.shadowBlur = 12;
  ctx.fillText("YOU CAN'T STOP HERE", w / 2, 142);
  ctx.shadowBlur = 0;

  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#c7d2fe';
  ctx.fillText(`Emotional Pixel Mosaic • Tháng ${currentMonth + 1} / ${currentYear}`, w / 2, 178);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, 205);
  ctx.lineTo(w - 90, 205);
  ctx.stroke();

  // 5. Cột các ngày trong tuần (T2 -> CN)
  const daysOfWeek = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const gridX = 75;
  const gridY = 230;
  const gridW = w - gridX * 2; // 690px
  const cols = 7;
  const cellGap = 12;
  const cellSize = (gridW - (cols - 1) * cellGap) / cols; // ~88px

  ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  daysOfWeek.forEach((dow, i) => {
    const cx = gridX + i * (cellSize + cellGap) + cellSize / 2;
    ctx.fillText(dow, cx, gridY + 16);
  });

  // Tính độ lệch ngày đầu tháng (0 = Thứ 2, ..., 6 = Chủ Nhật)
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
  const pixelStartY = gridY + 32;

  // Vẽ các ô vuông Pixel cho từng ngày
  for (let day = 1; day <= daysInMonth; day++) {
    const slotIndex = firstDayIndex + (day - 1);
    const col = slotIndex % cols;
    const row = Math.floor(slotIndex / cols);

    const px = gridX + col * (cellSize + cellGap);
    const py = pixelStartY + row * (cellSize + cellGap);

    const key = `${currentYear}-${currentMonth + 1}-${day}`;
    const entry = pixelData[key];
    const mood = entry ? MOOD_PALETTES.find((m) => m.id === entry.moodId) : null;

    drawRoundedRect(ctx, px, py, cellSize, cellSize, 14);

    if (mood) {
      ctx.fillStyle = mood.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Số ngày màu trắng nổi bật
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${day}`, px + cellSize / 2, py + cellSize / 2 + 7);
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = '500 17px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.textAlign = 'center';
      ctx.fillText(`${day}`, px + cellSize / 2, py + cellSize / 2 + 6);
    }
  }

  // 6. Khung Thống Kê Tỷ Lệ Cảm Xúc (Stats Legend)
  const maxRows = Math.ceil((firstDayIndex + daysInMonth) / cols);
  const legendY = pixelStartY + maxRows * (cellSize + cellGap) + 24;
  const legBarW = gridW;
  const legBarH = 115;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  drawRoundedRect(ctx, gridX, legendY, legBarW, legBarH, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#f1f5f9';
  ctx.textAlign = 'left';
  ctx.fillText('📊 TỶ LỆ CẢM XÚC TRONG THÁNG:', gridX + 18, legendY + 26);

  const legItemW = (legBarW - 36) / 3;
  stats.forEach((st, idx) => {
    const lx = gridX + 18 + (idx % 3) * legItemW;
    const ly = legendY + 56 + Math.floor(idx / 3) * 34;

    ctx.beginPath();
    ctx.arc(lx + 8, ly - 4, 7, 0, Math.PI * 2);
    ctx.fillStyle = st.color;
    ctx.fill();

    ctx.font = '600 12.5px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText(`${st.label.split('&')[0].trim()}: ${st.count}d (${st.percent}%)`, lx + 22, ly);
  });

  // 7. Câu Châm Ngôn Truyền Động Lực
  const quoteY = legendY + legBarH + 40;
  ctx.font = 'italic 500 15px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.fillText('"Cảm xúc có thể thăng trầm, nhưng bạn đã can đảm đi qua từng ngày một cách trọn vẹn!"', w / 2, quoteY);

  // 8. Watermark Cuối Thẻ
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.fillText('Freedom Web Sanctuary • Trạm Nạp Năng Lượng Tâm Hồn', w / 2, h - 52);
};

export const MoodPixelTrackerModal = ({ isOpen, onClose }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 - 11
  const todayDate = now.getDate();

  const [pixelData, setPixelData] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_mood_pixels');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    // Khởi tạo mẫu cho tháng hiện tại
    const sample = {};
    for (let d = 1; d <= Math.min(todayDate, 28); d++) {
      if (d % 3 === 0) sample[`${currentYear}-${currentMonth + 1}-${d}`] = { moodId: 'peaceful', note: 'Một ngày trôi qua êm đềm' };
      else if (d % 4 === 0) sample[`${currentYear}-${currentMonth + 1}-${d}`] = { moodId: 'productive', note: 'Hoàn thành báo cáo' };
      else if (d % 5 === 0) sample[`${currentYear}-${currentMonth + 1}-${d}`] = { moodId: 'stressed', note: 'Chạy đua deadline' };
      else sample[`${currentYear}-${currentMonth + 1}-${d}`] = { moodId: 'reflective', note: 'Suy ngẫm về dự định mới' };
    }
    return sample;
  });

  const [selectedDay, setSelectedDay] = useState(todayDate);
  const [selectedMood, setSelectedMood] = useState(MOOD_PALETTES[0]);
  const [dailyNote, setDailyNote] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedImageUrl, setExportedImageUrl] = useState(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Số ngày trong tháng hiện tại
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Đọc dữ liệu của ngày được chọn
  useEffect(() => {
    const key = `${currentYear}-${currentMonth + 1}-${selectedDay}`;
    const dayEntry = pixelData[key];
    if (dayEntry) {
      const matched = MOOD_PALETTES.find((m) => m.id === dayEntry.moodId) || MOOD_PALETTES[0];
      setSelectedMood(matched);
      setDailyNote(dayEntry.note || '');
    } else {
      setSelectedMood(MOOD_PALETTES[0]);
      setDailyNote('');
    }
  }, [selectedDay, currentYear, currentMonth, pixelData]);

  const handleSaveDayMood = () => {
    playStarChimeSound();
    const key = `${currentYear}-${currentMonth + 1}-${selectedDay}`;
    const updated = {
      ...pixelData,
      [key]: {
        moodId: selectedMood.id,
        note: dailyNote.trim(),
        updatedAt: new Date().toISOString(),
      },
    };
    setPixelData(updated);
    try {
      localStorage.setItem('freedom_mood_pixels', JSON.stringify(updated));
    } catch (_) {}
  };

  const handleOpenExport = () => {
    playWarmthSound();
    setIsGeneratingImage(true);
    setShowExportModal(true);

    setTimeout(() => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 840;
        canvas.height = 1120;
        drawMoodWallpaper(canvas, pixelData, currentYear, currentMonth, daysInMonth, stats);
        const dataUrl = canvas.toDataURL('image/png');
        setExportedImageUrl(dataUrl);
      } catch (err) {
        console.error('Lỗi khởi tạo ảnh Wallpaper:', err);
      } finally {
        setIsGeneratingImage(false);
      }
    }, 60);
  };

  const handleDownloadImage = () => {
    if (!exportedImageUrl) return;
    playStarChimeSound();
    const link = document.createElement('a');
    link.download = `Freedom-The-Cam-Xuc-T${currentMonth + 1}-${currentYear}.png`;
    link.href = exportedImageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyImage = async () => {
    if (!exportedImageUrl) return;
    try {
      const res = await fetch(exportedImageUrl);
      const blob = await res.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2500);
      }
    } catch (e) {
      console.warn('Clipboard copy error:', e);
    }
  };

  if (!isOpen) return null;

  // Tính thống kê tỷ lệ cảm xúc trong tháng
  const monthKeys = Object.keys(pixelData).filter((k) => k.startsWith(`${currentYear}-${currentMonth + 1}-`));
  const stats = MOOD_PALETTES.map((m) => {
    const count = monthKeys.filter((k) => pixelData[k]?.moodId === m.id).length;
    const percent = monthKeys.length > 0 ? Math.round((count / monthKeys.length) * 100) : 0;
    return { ...m, count, percent };
  });

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className="modal-box mood-pixel-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '780px',
          maxHeight: '90vh',
          borderRadius: '26px',
          background: '#ffffff',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header Nhật Ký Cảm Xúc */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1.5px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #fef3c7 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>🗓️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 900 }}>
                Nhật Ký Cảm Xúc 365 Ngày (Emotional Pixel Tracker)
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Tháng {currentMonth + 1} / {currentYear} • Mỗi ngày là một mảnh ghép màu sắc trên bức tranh cuộc sống.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Nút Xuất Ảnh Wallpaper */}
            <button
              type="button"
              onClick={handleOpenExport}
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.76rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
              }}
            >
              🖼️ Xuất Ảnh Wallpaper
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Thân Canvas Pixel & Bảng Điều Khiển Ngày */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Lưới Ma Trận Pixel của Tháng (Month Pixel Mosaic Grid) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155' }}>
                Bức Tranh Cảm Xúc Tháng {currentMonth + 1} (Bấm vào ngày để xem / sửa):
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Đã ghi nhận {monthKeys.length} / {daysInMonth} ngày
              </span>
            </div>

            {/* Lưới ô vuông pixel theo ngày */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
              }}
            >
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const key = `${currentYear}-${currentMonth + 1}-${dayNum}`;
                const entry = pixelData[key];
                const matchedMood = entry ? MOOD_PALETTES.find((m) => m.id === entry.moodId) : null;
                const isSelected = selectedDay === dayNum;
                const isToday = dayNum === todayDate;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => { playClickSound(); setSelectedDay(dayNum); }}
                    style={{
                      aspectRatio: '1/1',
                      borderRadius: '10px',
                      border: isSelected ? '2.5px solid #0f172a' : '1px solid #e2e8f0',
                      background: matchedMood ? matchedMood.color : '#ffffff',
                      color: matchedMood ? '#ffffff' : '#94a3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                    title={`Ngày ${dayNum}: ${matchedMood ? matchedMood.label : 'Chưa ghi nhận'}`}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, textShadow: matchedMood ? '0 1px 2px rgba(0,0,0,0.4)' : 'none' }}>
                      {dayNum}
                    </span>
                    {isToday && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '3px',
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: matchedMood ? '#ffffff' : '#f59e0b',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Ghi Nhận Tâm Trạng Cho Ngày Đang Chọn */}
          <div
            style={{
              background: '#fdfbf7',
              border: `1.5px solid ${selectedMood.color}40`,
              borderRadius: '18px',
              padding: '16px 20px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>
                📍 Ghi nhận cho Ngày {selectedDay} Tháng {currentMonth + 1}:
              </strong>
              <span style={{ fontSize: '0.78rem', color: selectedMood.color, fontWeight: 800 }}>
                {selectedMood.label}
              </span>
            </div>

            {/* Chọn Palette Màu Cảm Xúc */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
              {MOOD_PALETTES.map((mood) => {
                const isChosen = selectedMood.id === mood.id;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => { playClickSound(); setSelectedMood(mood); }}
                    style={{
                      padding: '8px 6px',
                      borderRadius: '10px',
                      border: isChosen ? `2px solid ${mood.color}` : '1px solid #e2e8f0',
                      background: isChosen ? `${mood.color}18` : '#ffffff',
                      color: isChosen ? mood.color : '#475569',
                      fontSize: '0.72rem',
                      fontWeight: isChosen ? 800 : 600,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>{mood.emoji}</span>
                    <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{mood.label.split('&')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Ô nhập ghi chú ngắn */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Ghi chú 1 dòng suy nghĩ về ngày hôm nay (tùy chọn)..."
                value={dailyNote}
                maxLength={100}
                onChange={(e) => setDailyNote(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.84rem',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleSaveDayMood}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                  whiteSpace: 'nowrap',
                }}
              >
                💾 Lưu Ngày {selectedDay}
              </button>
            </div>
          </div>

          {/* Biểu Đồ Thống Kê Cảm Xúc Trong Tháng */}
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '10px' }}>
              📊 Tỷ Lệ Cảm Xúc Tháng Này:
            </span>
            <div style={{ display: 'flex', height: '12px', borderRadius: '999px', overflow: 'hidden', background: '#e2e8f0', marginBottom: '10px' }}>
              {stats.map((s) => (
                <div
                  key={s.id}
                  style={{
                    width: `${s.percent}%`,
                    background: s.color,
                    transition: 'width 0.3s ease',
                  }}
                  title={`${s.label}: ${s.percent}%`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {stats.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#475569' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                  <span>{s.label}: <strong>{s.percent}%</strong> ({s.count} ngày)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Xem Trước & Tải Wallpaper Kỷ Niệm */}
        {showExportModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(5, 10, 20, 0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              zIndex: 100001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowExportModal(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '440px',
                background: 'linear-gradient(160deg, #0d1527 0%, #171d34 50%, #0b0f1d 100%)',
                borderRadius: '24px',
                padding: '20px 22px',
                color: '#ffffff',
                border: '1.5px solid rgba(99, 102, 241, 0.35)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.85), 0 0 40px rgba(99, 102, 241, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxSizing: 'border-box',
                maxHeight: '94vh',
                overflowY: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.3rem' }}>✨</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#fef08a' }}>
                      Thẻ Cảm Xúc Sẵn Sàng!
                    </h4>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      Ảnh Wallpaper PNG độ nét cao • Tải về máy ngay
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Preview Image hoặc Loading */}
              <div
                style={{
                  width: '100%',
                  background: '#040812',
                  borderRadius: '16px',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '280px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  marginBottom: '16px',
                  boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.6)',
                }}
              >
                {isGeneratingImage || !exportedImageUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#a5b4fc' }}>
                    <div style={{ width: '32px', height: '32px', border: '3px solid rgba(165, 180, 252, 0.2)', borderTopColor: '#a5b4fc', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Đang kết xuất ảnh Wallpaper HD...</span>
                  </div>
                ) : (
                  <img
                    src={exportedImageUrl}
                    alt="Thẻ Cảm Xúc Tháng"
                    style={{
                      width: '100%',
                      maxHeight: '52vh',
                      objectFit: 'contain',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      display: 'block',
                    }}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!exportedImageUrl}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    cursor: exportedImageUrl ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>💾</span> Tải Ảnh Về Máy (PNG)
                </button>

                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    disabled={!exportedImageUrl}
                    style={{
                      flex: 1,
                      background: copySuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                      border: copySuccess ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: copySuccess ? '#34d399' : '#e2e8f0',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: exportedImageUrl ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{copySuccess ? '✓' : '📋'}</span>
                    <span>{copySuccess ? 'Đã Sao Chép!' : 'Sao Chép Ảnh'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowExportModal(false)}
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
