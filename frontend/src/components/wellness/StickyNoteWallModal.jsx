import React, { useState, useEffect } from 'react';
import { playClickSound, playStarChimeSound, playWarmthSound } from '../../utils/soundEffects';

const INITIAL_STICKY_NOTES = [
  {
    id: 'note_1',
    text: 'Hôm nay bạn nhớ uống đủ 2 lít nước và vươn vai nhé! Cột sống và sức khỏe mới là của mình, deadline là của công ty ❤️',
    color: '#fef08a',
    author: 'Một đồng nghiệp cùng cày đêm',
    likes: 42,
    pinnedTime: '15 phút trước',
    emoji: '💧',
  },
  {
    id: 'note_2',
    text: 'Sếp mắng một chút thôi, đừng để nó làm hỏng cả bữa tối ngon lành và buổi tối ấm áp của bạn. Mọi chuyện rồi sẽ ổn cả!',
    color: '#fbcfe8',
    author: 'Junior Dev từng khóc trong toilet',
    likes: 68,
    pinnedTime: '1 giờ trước',
    emoji: '🫂',
  },
  {
    id: 'note_3',
    text: 'Cố lên người anh em, tớ cũng đang ngồi fix bug không rõ nguồn như bạn nè! Chúng ta không hề đơn độc đâu! ☕',
    color: '#bae6fd',
    author: 'Cú đêm tầng 5',
    likes: 55,
    pinnedTime: '2 giờ trước',
    emoji: '💻',
  },
  {
    id: 'note_4',
    text: 'Dù hôm nay kết quả thế nào, bạn cũng đã nỗ lực hết sức mình rồi. Tự hào về sự kiên trì của bạn ngày hôm nay!',
    color: '#bbf7d0',
    author: 'Người lạ qua đường ấm áp',
    likes: 89,
    pinnedTime: 'Hôm nay',
    emoji: '🌿',
  },
  {
    id: 'note_5',
    text: 'Đừng so sánh chương 1 của bản thân với chương 20 của người khác. Mỗi người đều có múi giờ và lộ trình rực rỡ riêng!',
    color: '#ddd6fe',
    author: 'Người chuyển ngành tuổi 28',
    likes: 114,
    pinnedTime: 'Hôm qua',
    emoji: '✨',
  },
  {
    id: 'note_6',
    text: 'Tô bún bò nóng hổi đang đợi bạn tan ca. Xong việc rồi thì gấp máy lại và về nhà ăn ngon ngủ kỹ nhé!',
    color: '#fed7aa',
    author: 'Thực thần công sở',
    likes: 73,
    pinnedTime: 'Hôm qua',
    emoji: '🍜',
  },
];

const PASTEL_COLORS = [
  { id: 'yellow', hex: '#fef08a', label: 'Vàng Nắng', border: '#fde047' },
  { id: 'pink', hex: '#fbcfe8', label: 'Hồng Phấn', border: '#f472b6' },
  { id: 'mint', hex: '#bbf7d0', label: 'Bạc Hà', border: '#4ade80' },
  { id: 'sky', hex: '#bae6fd', label: 'Mây Trời', border: '#38bdf8' },
  { id: 'lavender', hex: '#ddd6fe', label: 'Oải Hương', border: '#a78bfa' },
  { id: 'peach', hex: '#fed7aa', label: 'Trà Đào', border: '#fb923c' },
];

export const StickyNoteWallModal = ({ isOpen, onClose }) => {
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_sticky_notes');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_STICKY_NOTES;
  });

  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'top' | 'random'
  const [isWriting, setIsWriting] = useState(false);
  const [newText, setNewText] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0]);
  const [randomNote, setRandomNote] = useState(null);
  const [likedNoteIds, setLikedNoteIds] = useState(() => {
    try {
      const saved = localStorage.getItem('freedom_liked_sticky_ids');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });

  // Lưu notes vào localStorage
  const saveNotes = (updated) => {
    setNotes(updated);
    try {
      localStorage.setItem('freedom_sticky_notes', JSON.stringify(updated));
    } catch (_) {}
  };

  // Thả tim cho một lời nhắn
  const handleLikeNote = (noteId) => {
    playWarmthSound();
    const isAlreadyLiked = likedNoteIds.includes(noteId);
    const updatedLiked = isAlreadyLiked
      ? likedNoteIds.filter((id) => id !== noteId)
      : [...likedNoteIds, noteId];

    setLikedNoteIds(updatedLiked);
    try {
      localStorage.setItem('freedom_liked_sticky_ids', JSON.stringify(updatedLiked));
    } catch (_) {}

    const updated = notes.map((n) => {
      if (n.id === noteId) {
        return { ...n, likes: isAlreadyLiked ? Math.max(0, n.likes - 1) : n.likes + 1 };
      }
      return n;
    });
    saveNotes(updated);
  };

  // Đăng lời nhắn mới
  const handlePostNote = (e) => {
    e.preventDefault();
    if (!newText.trim()) return;

    playStarChimeSound();
    const createdNote = {
      id: `note_${Date.now()}`,
      text: newText.trim(),
      color: selectedColor.hex,
      author: newAuthor.trim() || 'Một người đồng hành ẩn danh',
      likes: 1,
      pinnedTime: 'Vừa xong',
      emoji: ['💌', '✨', '🌻', '🐾', '☕', '🌸'][Math.floor(Math.random() * 6)],
    };

    const next = [createdNote, ...notes];
    saveNotes(next);
    setNewText('');
    setNewAuthor('');
    setIsWriting(false);
  };

  // Bốc ngẫu nhiên một lời nhắn
  const handleDrawRandom = () => {
    playStarChimeSound();
    const randomIndex = Math.floor(Math.random() * notes.length);
    setRandomNote(notes[randomIndex]);
    setActiveFilter('random');
  };

  if (!isOpen) return null;

  const displayNotes =
    activeFilter === 'top'
      ? [...notes].sort((a, b) => b.likes - a.likes)
      : notes;

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
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="modal-box sticky-wall-modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '860px',
          maxHeight: '90vh',
          borderRadius: '24px',
          background: '#ffffff',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header Bức tường giấy nhớ */}
        <div
          style={{
            padding: '18px 24px 14px',
            borderBottom: '1.5px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #fefce8 0%, #fffbeb 50%, #fef3c7 100%)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.5rem' }}>💌</span>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#92400e', fontWeight: 900 }}>
                Trạm Gửi Gắm Yêu Thương Ẩn Danh
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#b45309' }}>
              Bức tường giấy nhớ ấm áp nơi người lạ dặn dò và tiếp thêm động lực cho nhau mỗi ngày.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid #fde68a',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '1rem',
              cursor: 'pointer',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Thanh công cụ: Tabs bộ lọc & Nút hành động */}
        <div
          style={{
            padding: '10px 20px',
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => { playClickSound(); setActiveFilter('all'); setRandomNote(null); }}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeFilter === 'all' ? '#f59e0b' : '#f1f5f9',
                color: activeFilter === 'all' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              📌 Tất Cả ({notes.length})
            </button>

            <button
              type="button"
              onClick={() => { playClickSound(); setActiveFilter('top'); setRandomNote(null); }}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeFilter === 'top' ? '#ef4444' : '#f1f5f9',
                color: activeFilter === 'top' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              💖 Nhiều Tim Nhất
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Nút Bốc Ngẫu Nhiên */}
            <button
              type="button"
              onClick={handleDrawRandom}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
              }}
            >
              <span>🎲 Bốc 1 Lời Nhắn</span>
            </button>

            {/* Nút Viết Lời Nhắn Mới */}
            <button
              type="button"
              onClick={() => { playClickSound(); setIsWriting((prev) => !prev); }}
              style={{
                background: isWriting ? '#cbd5e1' : 'linear-gradient(135deg, #10b981, #059669)',
                color: isWriting ? '#334155' : '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isWriting ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)',
              }}
            >
              <span>{isWriting ? '✕ Đóng Viết' : '✍️ Dán Lời Nhắn Mới'}</span>
            </button>
          </div>
        </div>

        {/* Khung Soạn Thảo Giấy Nhớ Mới (Khi bấm Viết) */}
        {isWriting && (
          <form
            onSubmit={handlePostNote}
            style={{
              padding: '16px 20px',
              background: '#f8fafc',
              borderBottom: '1.5px dashed #cbd5e1',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              animation: 'fadeInUp 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                ✏️ Viết lời nhắn gửi người lạ (Tối đa 180 ký tự):
              </strong>
              {/* Chọn màu giấy */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {PASTEL_COLORS.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: col.hex,
                      border: selectedColor.id === col.id ? `2px solid ${col.border}` : '1px solid #cbd5e1',
                      cursor: 'pointer',
                      transform: selectedColor.id === col.id ? 'scale(1.15)' : 'none',
                      boxShadow: selectedColor.id === col.id ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
                    }}
                    title={col.label}
                  />
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              maxLength={180}
              placeholder="Nhập lời dặn dò, sự đồng cảm hoặc câu chúc ấm áp bạn muốn gửi tới một người đang mệt mỏi..."
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: `2px solid ${selectedColor.border}`,
                background: selectedColor.hex,
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                color: '#1e293b',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <input
                type="text"
                placeholder="Ký tên (vd: Bạn bàn bên / Cú đêm tầng 5...)"
                value={newAuthor}
                maxLength={40}
                onChange={(e) => setNewAuthor(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: '0.8rem',
                  color: '#334155',
                  flex: 1,
                  maxWidth: '300px',
                }}
              />

              <button
                type="submit"
                disabled={!newText.trim()}
                style={{
                  background: !newText.trim() ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  cursor: !newText.trim() ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                }}
              >
                📌 Ghim Lên Bảng
              </button>
            </div>
          </form>
        )}

        {/* Khung Hiển Thị Lời Nhắn Ngẫu Nhiên Vừa Bốc Được */}
        {activeFilter === 'random' && randomNote && (
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)',
              borderBottom: '2px solid #c7d2fe',
              textAlign: 'center',
              animation: 'fadeInUp 0.25s ease',
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>🎁✨</div>
            <strong style={{ fontSize: '0.94rem', color: '#4338ca', display: 'block', marginBottom: '8px' }}>
              Món Quà Tinh Thần Dành Riêng Cho Bạn Lúc Này:
            </strong>
            <div
              style={{
                maxWidth: '460px',
                margin: '0 auto',
                background: randomNote.color,
                border: '1.5px solid rgba(0,0,0,0.08)',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                position: 'relative',
              }}
            >
              <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', fontSize: '1.3rem' }}>
                📌
              </span>
              <p style={{ margin: '4px 0 10px', fontSize: '0.95rem', color: '#0f172a', fontWeight: 600, lineHeight: 1.6 }}>
                "{randomNote.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b' }}>
                <span>— {randomNote.author}</span>
                <button
                  type="button"
                  onClick={() => handleLikeNote(randomNote.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: likedNoteIds.includes(randomNote.id) ? '#ef4444' : '#64748b',
                  }}
                >
                  {likedNoteIds.includes(randomNote.id) ? '❤️' : '🤍'} {randomNote.likes}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thân bảng bọc gỗ/nút ghim gốm (Corkboard Grid) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: 'radial-gradient(circle at 50% 50%, #fdf8f0 0%, #f7efe2 100%)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '16px',
            minHeight: '320px',
          }}
        >
          {displayNotes.map((note, index) => {
            const isLiked = likedNoteIds.includes(note.id);
            // Nghiêng ngẫu nhiên nhẹ nhàng cho tự nhiên như bảng thật (-3deg đến +3deg)
            const rotateDeg = ((index % 5) - 2) * 1.5;

            return (
              <div
                key={note.id}
                style={{
                  background: note.color,
                  borderRadius: '12px',
                  padding: '16px 14px 12px',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  transform: `rotate(${rotateDeg}deg)`,
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  minHeight: '140px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.04) rotate(0deg)';
                  e.currentTarget.style.zIndex = '10';
                  e.currentTarget.style.boxShadow = '0 14px 28px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = `rotate(${rotateDeg}deg)`;
                  e.currentTarget.style.zIndex = '1';
                  e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.08)';
                }}
              >
                {/* Đinh ghim thumbtack trên đầu giấy */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '1.1rem',
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
                    userSelect: 'none',
                  }}
                >
                  📌
                </div>

                {/* Nội dung lời nhắn */}
                <div style={{ marginTop: '4px' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                      color: '#1e293b',
                      fontWeight: 600,
                      wordBreak: 'break-word',
                    }}
                  >
                    {note.text}
                  </p>
                </div>

                {/* Footer giấy nhớ: Người gửi & Thả tim */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '12px',
                    paddingTop: '8px',
                    borderTop: '1px dashed rgba(0,0,0,0.1)',
                    fontSize: '0.72rem',
                    color: '#64748b',
                  }}
                >
                  <span style={{ fontStyle: 'italic', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={note.author}>
                    — {note.author}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleLikeNote(note.id)}
                    style={{
                      background: isLiked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0,0,0,0.05)',
                      border: 'none',
                      borderRadius: '999px',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: isLiked ? '#ef4444' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title={isLiked ? 'Bỏ tim' : 'Thả tim động viên'}
                  >
                    <span>{isLiked ? '❤️' : '🤍'}</span>
                    <span>{note.likes}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
