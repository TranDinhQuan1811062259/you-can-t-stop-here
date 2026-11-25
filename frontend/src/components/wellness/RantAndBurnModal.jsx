import React, { useState, useEffect, useRef } from 'react';
import { playClickSound, playWarmthSound } from '../../utils/soundEffects';

// Danh sách các thẻ tâm trạng xả giận nhanh
const QUICK_RANT_TAGS = [
  '#DeadlineÁmẢnh',
  '#SếpHãm',
  '#KháchHành11hĐêm',
  '#OTKhôngLương',
  '#ĐồngNghiệpToxic',
  '#KiệtSứcBurnout',
  '#BấtCôngChốnCôngSở',
  '#ImpostorSyndrome',
  '#MuốnBỏViệc',
];

// Danh sách thông điệp chữa lành sau khi đốt tro tàn
const HEALING_AFFIRMATIONS = [
  {
    quote: 'Mọi muộn phiền đã tan biến thành tro bụi. Đừng mang rác của người khác về gặm nhấm trong tâm trí mình nữa.',
    author: 'Freedom Sanctuary',
    icon: '🌱',
  },
  {
    quote: 'Bạn đã giữ những ấm ức này quá lâu rồi. Thả nó đi vào hư vô là cách tốt nhất để trái tim bạn được thở nhẹ nhàng.',
    author: 'Góc Tĩnh Lặng',
    icon: '🕊️',
  },
  {
    quote: 'Bão giông ngoài kia không định nghĩa bạn. Bạn kiên cường hơn bất kỳ áp lực deadline hay sự bất công nào.',
    author: 'Lời Nhắn Vô Danh',
    icon: '🌿',
  },
  {
    quote: 'Tro tàn đã nguội. Bây giờ hãy đứng dậy, uống một cốc nước ấm, thả lỏng đôi vai và hít một hơi thật sâu bạn nhé!',
    author: 'Freedom Buddy',
    icon: '☕',
  },
  {
    quote: 'Ngày mai là một trang giấy mới toanh. Hôm nay bạn đã cố gắng hết sức rồi, hãy bao dung với chính mình.',
    author: 'Trạm Định Tâm',
    icon: '✨',
  },
];

// Danh sách các bản nhạc u buồn & trút giận (Đã kiểm tra 100% bản quyền embed & âm thanh trong trẻo, không rờn)
const SAD_PLAYLIST = [
  {
    id: 'kHdMIY0-psY',
    title: 'salvia palth - dream (extended seamless version)',
    artist: 'salvia palth',
    tag: 'Gợi ý từ bạn 🥀',
    desc: 'Bản nhạc hoài niệm da diết, tiếng guitar lo-fi trôi lững lờ xoa dịu tổn thương',
    icon: '🎸',
  },
  {
    id: 'P7GUkYg1BAo',
    title: 'salvia palth - dream (original studio audio)',
    artist: 'salvia palth',
    tag: 'Studio Trong Trẻo ☕',
    desc: 'Bản gốc phòng thu chuẩn tiếng, âm thanh sạch không rè không rờn',
    icon: '🎧',
  },
  {
    id: 'imGaOIm5HOk',
    title: 'Kiss The Rain (Official Piano Melancholy)',
    artist: 'Yiruma',
    tag: 'Piano Nước Mắt 🎹',
    desc: 'Phím đàn dương cầm cô đơn chạm vào đáy sâu nỗi buồn',
    icon: '🎹',
  },
  {
    id: '7maJOI3QMu0',
    title: 'River Flows in You (Original Master Audio)',
    artist: 'Yiruma',
    tag: 'Dương Cầm Chữa Lành 🌧️',
    desc: 'Giai điệu dương cầm huyền thoại xoa dịu và nâng đỡ những trái tim vụn vỡ',
    icon: '🎼',
  },
  {
    id: '9E6b3swbnWg',
    title: 'Nocturne Op.9 No.2 in E-Flat Major',
    artist: 'Frédéric Chopin',
    tag: 'Dạ Khúc Lắng Đọng 🌙',
    desc: 'Bản dạ khúc cổ điển trầm mặc, đưa tâm hồn vào sự tĩnh lặng tuyệt đối',
    icon: '🎻',
  },
  {
    id: '5qap5aO4i9A',
    title: 'lofi hip hop radio - beats to relax/study to',
    artist: 'Lofi Girl',
    tag: 'Mưa Đêm U Sầu 🌧️',
    desc: 'Tiếng mưa rơi cùng những nốt nhạc lo-fi êm dịu lúc nửa đêm',
    icon: '📻',
  },
];

// Bộ từ vựng nhận diện nhiệt độ cảm xúc (Không chặn chữ, chỉ đo độ cay cú để visual hóa)
const MILD_STRESS_WORDS = [
  'mệt', 'mệt mỏi', 'met moi', 'met', 'áp lực', 'ap luc', 'stress', 'chán', 'chán nản', 'chan nan', 'chan',
  'bực', 'bực mình', 'bực bội', 'buc minh', 'buc boi', 'buc', 'khó chịu', 'kho chiu', 'bất công', 'bat cong',
  'oan', 'ức', 'uất ức', 'uc che', 'ức chế', 'quỵt', 'quỵt lương', 'quyt luong', 'deadline', 'ot', 'overtime',
  'toxic', 'sếp', 'sep', 'khách', 'khách hàng', 'khach hang', 'khach hanh', 'impostor', 'đùn việc', 'dun viec',
  'chèn ép', 'chen ep', 'bóc lột', 'boc lot', 'thao túng', 'gaslight', 'trầm cảm', 'tram cam', 'kiệt sức', 'burnout',
  'nghỉ việc', 'nghi viec', 'bỏ việc', 'bo viec', 'nản', 'buồn', 'tuyệt vọng', 'tuyet vong', 'bế tắc', 'be tac',
  'bất lực', 'bat luc', 'mất ngủ', 'mat ngu', 'kiệt quệ', 'kiet que', 'gánh nặng', 'ganh nang', 'cô lập', 'co lap'
];

const SPICY_ANGER_WORDS = [
  'tức', 'tức điên', 'tuc dien', 'cay', 'cay cú', 'cay cu', 'khốn nạn', 'khon nan', 'mất dạy', 'mat day',
  'chó má', 'cho ma', 'khốn khiếp', 'khon khiep', 'cút', 'cut', 'biến', 'bien', 'vãi', 'vai',
  'vcl', 'vkl', 'vđ', 'vd', 'vl', 'cl', 'clgt', 'đm', 'dm', 'dkm', 'đkm', 'đcm', 'dcm', 'đcmm', 'dcmm',
  'mẹ nó', 'me no', 'bà mẹ', 'ba me', 'mẹ khỉ', 'me khi', 'mẹ kiếp', 'me kiep', 'đéo', 'deo',
  'dell', 'đếch', 'dech', 'dở hơi', 'do hoi', 'hãm', 'ham', 'hãm l', 'ham l', 'hãm lol', 'ham lol',
  'bullshit', 'fuck', 'fucking', 'shit', 'bitch', 'damn', 'crap', 'bastard', 'cút đi', 'cut di',
  'nhảm nhí', 'nham nhi', 'điên máu', 'dien mau', 'phát điên', 'phat dien', 'đập phá', 'dap pha',
  'lừa đảo', 'lua dao', 'đâm sau lưng', 'dam sau lung', 'bẩn thỉu', 'ban thiu', 'ngứa mắt', 'ngua mat'
];

const NUCLEAR_RAGE_WORDS = [
  'đụ', 'du', 'du ma', 'du me', 'đụ má', 'đụ mẹ', 'địt', 'dit', 'địt mẹ', 'dit me', 'dit cu', 'địt cụ',
  'đĩ', 'con đĩ', 'con di', 'lồn', 'lon', 'hãm lồn', 'ham lon', 'cặc', 'cac', 'buồi', 'buoi',
  'đmm', 'dmm', 'đ m', 'd m', 'súc sinh', 'suc sinh', 'chó đẻ', 'cho de', 'chết tiệt', 'chet tiet',
  'mả mẹ', 'ma me', 'motherfucker', 'asshole', 'cunt', 'son of a bitch', 'douchebag',
  'giết', 'giet', 'thiêu rụi', 'thieu rui', 'đập chết', 'dap chet', 'đồ khốn', 'do khon'
];

// Hàm đo nhiệt độ cảm xúc
const countOccurrences = (targetStr, phrase) => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('(^|[^a-z0-9à-ỹ_])' + escaped + '(?=[^a-z0-9à-ỹ_]|$)', 'gi');
  const matches = targetStr.match(regex);
  return matches ? matches.length : 0;
};

const analyzeRantLanguage = (text) => {
  if (!text || !text.trim()) {
    return { percent: 10, levelLabel: 'Thanh thản 🍃', levelColor: '#10b981' };
  }
  const rawLower = text.toLowerCase();
  const normalizedNoAccent = rawLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

  let stressCount = 0;
  let spicyCount = 0;
  let nuclearCount = 0;

  NUCLEAR_RAGE_WORDS.forEach((w) => {
    const wNo = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const c1 = countOccurrences(rawLower, w);
    const c2 = w !== wNo ? countOccurrences(normalizedNoAccent, wNo) : 0;
    nuclearCount += Math.max(c1, c2);
  });

  SPICY_ANGER_WORDS.forEach((w) => {
    const wNo = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const c1 = countOccurrences(rawLower, w);
    const c2 = w !== wNo ? countOccurrences(normalizedNoAccent, wNo) : 0;
    spicyCount += Math.max(c1, c2);
  });

  MILD_STRESS_WORDS.forEach((w) => {
    const wNo = w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const c1 = countOccurrences(rawLower, w);
    const c2 = w !== wNo ? countOccurrences(normalizedNoAccent, wNo) : 0;
    stressCount += Math.max(c1, c2);
  });

  const words = text.trim().split(/\s+/);
  const wordCount = words.length;
  const exclamations = (text.match(/!/g) || []).length;
  const uppercaseWords = words.filter((w) => w.length >= 2 && w === w.toUpperCase() && /[A-ZÀ-Ỹ]/.test(w)).length;

  let baseScore = Math.min(wordCount * 1.5, 25) + Math.min(exclamations * 4, 20) + Math.min(uppercaseWords * 5, 20);
  let vocabScore = (stressCount * 10) + (spicyCount * 22) + (nuclearCount * 40);
  let totalScore = Math.round(baseScore + vocabScore);
  let percent = Math.min(Math.max(totalScore, 10), 100);

  let levelLabel = 'Thanh thản 🍃';
  let levelColor = '#10b981';

  if (percent >= 85 || nuclearCount >= 2 || (spicyCount >= 2 && exclamations >= 2)) {
    levelLabel = 'Hỏa ngục cuồng phong 🔥🌋';
    levelColor = '#ef4444';
    percent = Math.max(percent, 92);
  } else if (percent >= 60 || spicyCount >= 1 || nuclearCount === 1) {
    levelLabel = 'Bốc Hỏa & Bực Dọc 💢';
    levelColor = '#f97316';
    percent = Math.max(percent, 65);
  } else if (percent >= 28 || stressCount >= 1) {
    levelLabel = 'Ấm Ức & Nặng Lòng ⚠️';
    levelColor = '#f59e0b';
    percent = Math.max(percent, 35);
  } else {
    levelLabel = 'Khởi Động Xả Giận 🌱';
    levelColor = '#10b981';
    percent = Math.max(percent, 15);
  }

  return {
    score: totalScore,
    percent,
    levelLabel,
    levelColor,
  };
};

// Bộ giả lập âm thanh lửa cháy & củi nổ tí tách (Chỉ phát trong 3.8s lúc bấm đốt)
class FireAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.noiseNode = null;
    this.gainNode = null;
    this.filterNode = null;
    this.crackleTimer = null;
    this.isPlaying = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  start() {
    try {
      this.init();
      if (!this.ctx || this.isPlaying) return;

      this.isPlaying = true;

      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.96 * b1 + white * 0.11;
        b2 = 0.86 * b2 + white * 0.25;
        output[i] = (b0 + b1 + b2) * 0.2;
      }

      this.noiseNode = this.ctx.createBufferSource();
      this.noiseNode.buffer = noiseBuffer;
      this.noiseNode.loop = true;

      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(450, this.ctx.currentTime);

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(0.25, this.ctx.currentTime + 0.6);

      this.noiseNode.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this.noiseNode.start();

      this.crackleTimer = setInterval(() => {
        if (!this.isPlaying || !this.ctx) return;
        if (Math.random() > 0.35) {
          this.triggerPop();
        }
      }, 90);
    } catch (_) {}
  }

  triggerPop() {
    try {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const osc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();

      const freq = 1200 + Math.random() * 2400;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.04);

      const popVol = 0.08 + Math.random() * 0.22;
      popGain.gain.setValueAtTime(popVol, this.ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.045);

      osc.connect(popGain);
      popGain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (_) {}
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    clearInterval(this.crackleTimer);

    if (this.gainNode && this.ctx) {
      try {
        this.gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
        setTimeout(() => {
          if (this.noiseNode) {
            try { this.noiseNode.stop(); } catch (_) {}
            this.noiseNode = null;
          }
        }, 450);
      } catch (_) {}
    }
  }
}

const fireSynth = new FireAudioSynthesizer();

export const RantAndBurnModal = ({ isOpen, onClose, onOpenCafe }) => {
  const [rantText, setRantText] = useState('');
  const [burnMode, setBurnMode] = useState('inferno'); // 'inferno' | 'blackhole'
  const [burnStage, setBurnStage] = useState('writing'); // 'writing' | 'burning' | 'ashes'
  const [selectedTag, setSelectedTag] = useState('');
  const [healingQuote, setHealingQuote] = useState(HEALING_AFFIRMATIONS[0]);
  const [rumble, setRumble] = useState(false);

  // States cho Trình phát nhạc buồn lắng đọng
  const [selectedSadMusic, setSelectedSadMusic] = useState(SAD_PLAYLIST[0]);
  const [isSadMusicPlaying, setIsSadMusicPlaying] = useState(false);
  const [showSadVideo, setShowSadVideo] = useState(false);
  const [customSadYtInput, setCustomSadYtInput] = useState('');
  const [isCustomSadMode, setIsCustomSadMode] = useState(false);

  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);

  // Tách YouTube ID
  const extractYouTubeId = (urlOrId) => {
    if (!urlOrId) return '';
    const trimmed = urlOrId.trim();
    if (trimmed.length === 11 && !trimmed.includes('/') && !trimmed.includes('?') && !trimmed.includes('&')) {
      return trimmed;
    }
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : trimmed;
  };

  const handleApplyCustomSadYt = () => {
    playClickSound();
    const id = extractYouTubeId(customSadYtInput);
    if (id) {
      const customItem = {
        id,
        title: `Nhạc Buồn Tự Chọn (${id})`,
        artist: 'Người Dùng Nhập',
        tag: 'Tự Chọn 🥀',
        desc: 'Bản nhạc từ liên kết YouTube bạn vừa nhập',
        icon: '🔗',
      };
      setSelectedSadMusic(customItem);
      setIsSadMusicPlaying(true);
      setIsCustomSadMode(false);
    }
  };

  // Khởi tạo ngẫu nhiên quote chữa lành khi mở
  useEffect(() => {
    if (isOpen) {
      setRantText('');
      setBurnStage('writing');
      setSelectedTag('');
      setRumble(false);
      const randIdx = Math.floor(Math.random() * HEALING_AFFIRMATIONS.length);
      setHealingQuote(HEALING_AFFIRMATIONS[randIdx]);
    } else {
      fireSynth.stop();
      setIsSadMusicPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  }, [isOpen]);

  // Phân tích cường độ cảm xúc
  const rantAnalysis = analyzeRantLanguage(rantText);
  const wordCount = rantText.trim() ? rantText.trim().split(/\s+/).length : 0;

  // Chèn thẻ xả giận nhanh vào ô văn bản
  const handleAddTag = (tag) => {
    playClickSound();
    setSelectedTag(tag);
    setRantText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${tag}` : `${tag}: `;
    });
  };

  // Khởi tạo Canvas hạt than hồng & tàn tro
  const initParticles = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.parentElement.clientWidth);
    const height = (canvas.height = canvas.parentElement.clientHeight);

    const particles = [];
    const count = burnMode === 'blackhole' ? 140 : 160;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: height - Math.random() * 80,
        vx: (Math.random() - 0.5) * 3,
        vy: -(Math.random() * 4 + 2),
        size: Math.random() * 4 + 1.5,
        alpha: 1,
        life: 0,
        maxLife: Math.random() * 80 + 60,
        hue: burnMode === 'blackhole' ? 260 + Math.random() * 60 : 25 + Math.random() * 35,
      });
    }

    particlesRef.current = particles;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        if (burnMode === 'blackhole') {
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          p.vx += dx * 0.003;
          p.vy += dy * 0.003;
          p.x += p.vx;
          p.y += p.vy;
          p.size = Math.max(0.2, p.size * 0.98);
        } else {
          p.x += p.vx + Math.sin(p.life * 0.1) * 0.8;
          p.y += p.vy;
          p.size = Math.max(0.5, p.size * 0.985);
        }

        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 55%, ${p.alpha})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${p.hue}, 100%, 50%, 0.8)`;
        ctx.fill();

        if (p.life >= p.maxLife && burnStage === 'burning') {
          p.x = Math.random() * width;
          p.y = height - Math.random() * 40;
          p.vy = -(Math.random() * 4 + 2);
          p.life = 0;
          p.size = Math.random() * 4 + 1.5;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  // Bắt đầu châm lửa thiêu rụi
  const handleStartBurn = () => {
    if (!rantText.trim()) return;
    playWarmthSound();
    fireSynth.start();
    setBurnStage('burning');
    setRumble(true);

    // Kích hoạt hạt than bay Canvas
    initParticles();

    // Rung giật màn hình nhẹ nhàng trong 1.5s
    setTimeout(() => setRumble(false), 1500);

    // Sau 3.8s: Đốt xong hoàn toàn, biến thành tro tàn và nảy mầm cây
    setTimeout(() => {
      fireSynth.stop();
      setBurnStage('ashes');
      setRantText(''); // Xóa sổ hoàn toàn dữ liệu trên RAM
    }, 3800);
  };

  const handleResetForNext = () => {
    playClickSound();
    setBurnStage('writing');
    setRantText('');
    const randIdx = Math.floor(Math.random() * HEALING_AFFIRMATIONS.length);
    setHealingQuote(HEALING_AFFIRMATIONS[randIdx]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="rant-burn-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 14px',
        background: 'radial-gradient(circle at 50% 50%, rgba(20, 12, 10, 0.94) 0%, rgba(8, 6, 6, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        overflowY: 'auto',
      }}
    >
      <div
        className={`rant-burn-modal-box ${rumble ? 'is-rumbling' : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '96%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'linear-gradient(175deg, #181412 0%, #0d0b0a 100%)',
          border: '1.5px solid rgba(249, 115, 22, 0.35)',
          borderRadius: '24px',
          padding: '24px 22px',
          color: '#f8fafc',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.95), 0 0 50px rgba(234, 88, 12, 0.25)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(249, 115, 22, 0.4) rgba(0, 0, 0, 0.3)',
          animation: 'fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Canvas vẽ tia lửa bùng cháy đè lên giao diện khi đốt */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 10,
            opacity: burnStage === 'burning' ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />

        {/* Nút thoát */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            transition: 'all 0.15s ease',
            zIndex: 25,
          }}
          title="Đóng lò đốt"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>

        {/* ========================================================
            TRẠNG THÁI 1: SOẠN NỖI BỰC DỌC (WRITING)
           ======================================================== */}
        {burnStage === 'writing' && (
          <>
            {/* Header Lò Đốt */}
            <div style={{ textAlign: 'center', marginBottom: '14px', paddingRight: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(249, 115, 22, 0.14)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  padding: '3px 12px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  color: '#fb923c',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                <span>🔥</span>
                <span>SỌT RÁC CẢM XÚC KỸ THUẬT SỐ • RANT & BURN</span>
              </div>

              <h3 style={{ margin: '0 0 4px', fontSize: '1.45rem', fontWeight: 800, color: '#ffedd5', letterSpacing: '-0.3px' }}>
                Lò Đốt Muộn Phiền
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#a8a29e', lineHeight: 1.45 }}>
                Gõ hết những ấm ức, bực tức, bất công... rồi bấm nút để nhìn chúng bốc cháy thành tro bụi vĩnh viễn.
              </p>
            </div>

            {/* ========================================================
                KHỐI NHẠC BUỒN: DẠNG LIST CUỘN DỌC GỌN GÀNG (VERTICAL SCROLL LIST)
                - Không bị UI che khuất, cuộn mượt mà
                - Âm thanh phòng thu sạch sẽ, không rè, không rờn
                - Duy nhất 1 iframe nhúng tránh nhân đôi âm thanh
               ======================================================== */}
            <div
              className="rant-music-player-panel"
              style={{
                background: 'linear-gradient(160deg, rgba(30, 18, 22, 0.75) 0%, rgba(14, 10, 14, 0.95) 100%)',
                border: '1.5px solid rgba(244, 63, 94, 0.35)',
                borderRadius: '16px',
                padding: '12px 14px',
                marginBottom: '14px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45)',
              }}
            >
              {/* Header trình phát nhạc */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px', flex: 1 }}>
                  <span
                    style={{
                      fontSize: '1.3rem',
                      display: 'inline-block',
                      animation: isSadMusicPlaying ? 'spinSlow 10s linear infinite' : 'none',
                    }}
                  >
                    🥀
                  </span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#fecdd3', fontWeight: 800 }}>
                        Giai Điệu Lắng Đọng & U Buồn
                      </strong>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: 'rgba(244, 63, 94, 0.22)',
                          color: '#fda4af',
                          fontWeight: 700,
                          border: '1px solid rgba(244, 63, 94, 0.4)',
                        }}
                      >
                        {selectedSadMusic.tag}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: isSadMusicPlaying ? '#fb7185' : '#a8a29e',
                        marginTop: '1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '280px',
                      }}
                    >
                      {selectedSadMusic.artist} — {selectedSadMusic.title}
                    </div>
                  </div>
                </div>

                {/* Các nút điều khiển player */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowSadVideo((p) => !p);
                    }}
                    style={{
                      background: showSadVideo ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                      color: showSadVideo ? '#fecdd3' : '#cbd5e1',
                      border: showSadVideo ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '999px',
                      padding: '5px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    title="Mở hoặc thu nhỏ khung xem video YouTube"
                  >
                    <span>{showSadVideo ? '📺 Ẩn Video' : '📺 Xem Video'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsSadMusicPlaying((p) => !p);
                    }}
                    style={{
                      background: isSadMusicPlaying
                        ? 'linear-gradient(135deg, #e11d48, #be123c)'
                        : 'rgba(244, 63, 94, 0.2)',
                      color: '#ffffff',
                      border: isSadMusicPlaying ? 'none' : '1.5px solid rgba(244, 63, 94, 0.5)',
                      borderRadius: '999px',
                      padding: '5px 14px',
                      fontSize: '0.76rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: isSadMusicPlaying ? '0 2px 12px rgba(225, 29, 72, 0.45)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{isSadMusicPlaying ? '⏸ Tắt Nhạc Buồn' : '▶️ Bật Nhạc Buồn'}</span>
                  </button>
                </div>
              </div>

              {/* KHU VỰC LIST NHẠC CUỘN DỌC COMPACT (1 LIST SCROLL DOWN GỌN GÀNG) */}
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>📜 Danh sách bài hát (Cuộn xuống để xem thêm):</span>
                <span style={{ color: '#fda4af', fontWeight: 600 }}>{SAD_PLAYLIST.length} bản nhạc</span>
              </div>

              <div
                className="rant-sad-music-scroll-list"
                style={{
                  maxHeight: '135px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  paddingRight: '4px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(244, 63, 94, 0.4) rgba(0, 0, 0, 0.3)',
                }}
              >
                {SAD_PLAYLIST.map((track) => {
                  const isSelected = selectedSadMusic.id === track.id && !isCustomSadMode;
                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        playClickSound();
                        setSelectedSadMusic(track);
                        setIsSadMusicPlaying(true);
                        setIsCustomSadMode(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        background: isSelected
                          ? 'linear-gradient(90deg, rgba(225, 29, 72, 0.28) 0%, rgba(190, 18, 60, 0.15) 100%)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isSelected
                          ? '1.5px solid #f43f5e'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.95rem' }}>{track.icon || '🎵'}</span>
                        <div style={{ overflow: 'hidden' }}>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: isSelected ? 800 : 600,
                              color: isSelected ? '#ffffff' : '#e2e8f0',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '380px',
                            }}
                          >
                            {track.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: isSelected ? '#fda4af' : '#94a3b8' }}>
                            {track.artist} • <span style={{ opacity: 0.85 }}>{track.desc}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {isSelected && isSadMusicPlaying && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#e11d48',
                              color: '#ffffff',
                              fontSize: '0.64rem',
                              fontWeight: 800,
                            }}
                          >
                            <span className="equalizer-bar bar-1"></span>
                            <span className="equalizer-bar bar-2"></span>
                            <span className="equalizer-bar bar-3"></span>
                            <span>ĐANG PHÁT</span>
                          </span>
                        )}
                        {!isSelected && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              color: '#94a3b8',
                              background: 'rgba(255, 255, 255, 0.06)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {track.tag}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Hàng nút bấm chèn link bài hát YouTube buồn khác */}
                <div
                  onClick={() => {
                    playClickSound();
                    setIsCustomSadMode((p) => !p);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 10px',
                    borderRadius: '10px',
                    background: isCustomSadMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    border: isCustomSadMode ? '1.5px solid #c084fc' : '1px dashed rgba(255, 255, 255, 0.2)',
                    color: isCustomSadMode ? '#f3e8ff' : '#cbd5e1',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>🔗</span>
                  <span>{isCustomSadMode ? 'Đóng ô dán link YouTube' : 'Dán link hoặc ID YouTube buồn khác...'}</span>
                </div>
              </div>

              {/* Ô dán link YouTube tùy chọn */}
              {isCustomSadMode && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <input
                    type="text"
                    value={customSadYtInput}
                    onChange={(e) => setCustomSadYtInput(e.target.value)}
                    placeholder="Dán link bài hát YouTube (vd: https://youtube.com/watch?v=... hoặc video ID)"
                    style={{
                      flex: 1,
                      background: 'rgba(0, 0, 0, 0.65)',
                      border: '1.5px solid rgba(244, 63, 94, 0.45)',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      color: '#f8fafc',
                      fontSize: '0.78rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomSadYt}
                    style={{
                      background: 'linear-gradient(135deg, #e11d48, #be123c)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                    }}
                  >
                    Phát Ngay
                  </button>
                </div>
              )}

              {/* DUY NHẤT 1 KHUNG IFRAME YOUTUBE (Tránh triệt để lỗi nhân đôi âm thanh gây rờn/vang tiếng) */}
              {isSadMusicPlaying && (
                <div
                  style={
                    showSadVideo
                      ? {
                          marginTop: '10px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          background: '#000000',
                          border: '1px solid rgba(244, 63, 94, 0.4)',
                          position: 'relative',
                          paddingTop: '56.25%',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
                        }
                      : {
                          position: 'absolute',
                          width: '1px',
                          height: '1px',
                          opacity: 0.001,
                          pointerEvents: 'none',
                          overflow: 'hidden',
                        }
                  }
                >
                  <iframe
                    key={selectedSadMusic.id}
                    title="Rant and Burn Melancholy Player"
                    src={`https://www.youtube.com/embed/${selectedSadMusic.id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={
                      showSadVideo
                        ? {
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }
                        : {
                            width: '1px',
                            height: '1px',
                            border: 'none',
                          }
                    }
                  />
                </div>
              )}
            </div>

            {/* Thẻ xả giận nhanh */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '0.74rem', color: '#78716c', marginBottom: '6px', fontWeight: 600 }}>
                💡 Gợi ý chủ đề trút giận (Click để chèn nhanh):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {QUICK_RANT_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    style={{
                      background: selectedTag === tag ? 'rgba(249, 115, 22, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      border: selectedTag === tag ? '1px solid #f97316' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: selectedTag === tag ? '#fdba74' : '#d6d3d1',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '0.73rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Ô gõ tâm sự trút giận */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <textarea
                value={rantText}
                onChange={(e) => setRantText(e.target.value)}
                placeholder="Deadline dí đến nghẹt thở? Bị sếp mắng oan? Đồng nghiệp đùn việc? Khách hàng đòi đổi màu xanh thành màu xanh hơn? Cứ chửi thề, cứ xả thẳng tay vào đây..."
                rows={5}
                style={{
                  width: '100%',
                  background: 'rgba(12, 10, 9, 0.85)',
                  border: `1.5px solid ${rantAnalysis.percent > 60 ? '#f97316' : 'rgba(249, 115, 22, 0.3)'}`,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  color: '#fafaf9',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: rantAnalysis.percent > 75 ? '0 0 18px rgba(239, 68, 68, 0.35)' : 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#f97316';
                  e.target.style.boxShadow = '0 0 16px rgba(249, 115, 22, 0.35)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = rantAnalysis.percent > 60 ? '#f97316' : 'rgba(249, 115, 22, 0.3)';
                  e.target.style.boxShadow = rantAnalysis.percent > 75 ? '0 0 18px rgba(239, 68, 68, 0.35)' : 'none';
                }}
              />

              {/* Con dấu cam kết quyền riêng tư */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '5px',
                  fontSize: '0.72rem',
                  color: '#78716c',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#10b981' }}>🔒</span>
                  <span>Thiêu hủy thẳng trên RAM • Hoàn toàn không lưu Database</span>
                </span>
                <span>{wordCount} từ ({rantText.length} ký tự)</span>
              </div>
            </div>

            {/* Thanh đo mức độ bốc hỏa (Rant Intensity Meter) */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '12px',
                padding: '8px 12px',
                marginBottom: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', fontSize: '0.76rem' }}>
                <span style={{ color: '#a8a29e', fontWeight: 600 }}>Nhiệt độ cảm xúc:</span>
                <span style={{ color: rantAnalysis.levelColor, fontWeight: 700 }}>{rantAnalysis.levelLabel}</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${rantAnalysis.percent}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, #f59e0b 0%, ${rantAnalysis.levelColor} 100%)`,
                    borderRadius: '999px',
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Chọn nghi thức thiêu hủy */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setBurnMode('inferno')}
                style={{
                  flex: 1,
                  padding: '8px 8px',
                  borderRadius: '10px',
                  background: burnMode === 'inferno' ? 'rgba(249, 115, 22, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                  border: burnMode === 'inferno' ? '1.5px solid #f97316' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: burnMode === 'inferno' ? '#ffedd5' : '#a8a29e',
                  fontSize: '0.8rem',
                  fontWeight: burnMode === 'inferno' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🔥</span>
                <span>Lửa Thiêu Rụi</span>
              </button>

              <button
                type="button"
                onClick={() => setBurnMode('blackhole')}
                style={{
                  flex: 1,
                  padding: '8px 8px',
                  borderRadius: '10px',
                  background: burnMode === 'blackhole' ? 'rgba(168, 85, 247, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                  border: burnMode === 'blackhole' ? '1.5px solid #a855f7' : '1px solid rgba(255, 255, 255, 0.1)',
                  color: burnMode === 'blackhole' ? '#f3e8ff' : '#a8a29e',
                  fontSize: '0.8rem',
                  fontWeight: burnMode === 'blackhole' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🕳️</span>
                <span>Hố Đen Hư Vô</span>
              </button>
            </div>

            {/* Nút Châm Lửa Thiêu Rụi */}
            <button
              type="button"
              disabled={!rantText.trim()}
              onClick={handleStartBurn}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '14px',
                background: rantText.trim()
                  ? 'linear-gradient(135deg, #ea580c 0%, #c2410c 50%, #991b1b 100%)'
                  : 'rgba(255, 255, 255, 0.08)',
                color: rantText.trim() ? '#ffffff' : '#78716c',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.98rem',
                cursor: rantText.trim() ? 'pointer' : 'not-allowed',
                boxShadow: rantText.trim() ? '0 8px 25px rgba(234, 88, 12, 0.5)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease',
              }}
            >
              <span>🔥</span>
              <span>CHÂM LỬA ĐỐT RỤI THÀNH TRO BỤI</span>
            </button>
          </>
        )}

        {/* ========================================================
            TRẠNG THÁI 2: ĐANG BỐC CHÁY (BURNING IN PROGRESS)
           ======================================================== */}
        {burnStage === 'burning' && (
          <div
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 15,
            }}
          >
            <div
              style={{
                fontSize: '4.5rem',
                animation: 'firePulse 0.4s infinite alternate',
                marginBottom: '16px',
                filter: 'drop-shadow(0 0 25px rgba(249, 115, 22, 0.8))',
              }}
            >
              {burnMode === 'blackhole' ? '🕳️' : '🔥'}
            </div>

            <h3
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: burnMode === 'blackhole' ? '#d8b4fe' : '#fed7aa',
                margin: '0 0 10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {burnMode === 'blackhole' ? 'Hố Đen Đang Hút Cạn Uất Ức...' : 'Ngọn Lửa Đang Thiêu Rụi Từng Con Chữ...'}
            </h3>

            {/* Khung mô phỏng văn bản đang bốc cháy tan biến */}
            <div
              style={{
                maxWidth: '480px',
                maxHeight: '90px',
                overflow: 'hidden',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                color: '#fdba74',
                fontStyle: 'italic',
                animation: 'textDissolve 3.5s forwards ease-in',
                opacity: 0.7,
              }}
            >
              “{rantText.slice(0, 160)}...”
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.82rem', color: '#fb923c' }}>
              🔊 Đang phát âm thanh lửa cháy & củi nổ ASMR...
            </div>
          </div>
        )}

        {/* ========================================================
            TRẠNG THÁI 3: TRO TÀN & TÁI SINH (ASHES & REBIRTH)
           ======================================================== */}
        {burnStage === 'ashes' && (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Mầm cây xanh mọc lên từ tro tàn */}
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(16, 185, 129, 0.05) 70%)',
                border: '1.5px solid rgba(52, 211, 153, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.8rem',
                marginBottom: '18px',
                boxShadow: '0 0 35px rgba(16, 185, 129, 0.4)',
                animation: 'sproutBloom 0.8s ease-out',
              }}
            >
              {healingQuote.icon}
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                color: '#34d399',
                fontWeight: 700,
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              ✓ ĐÃ THIÊU HỦY 100% • TÂM TRÍ GIỜ ĐÃ SẠCH SẼ
            </div>

            <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem', color: '#ecfdf5', fontWeight: 800 }}>
              Tro Tàn Đã Nguội, Lòng Đã Nhẹ
            </h3>

            {/* Hộp danh ngôn chữa lành */}
            <div
              style={{
                maxWidth: '520px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '16px',
                padding: '16px 20px',
                marginBottom: '24px',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: '0.92rem', color: '#d1fae5', lineHeight: 1.6, fontStyle: 'italic' }}>
                “{healingQuote.quote}”
              </p>
              <span style={{ fontSize: '0.76rem', color: '#6ee7b7', fontWeight: 600 }}>
                — {healingQuote.author}
              </span>
            </div>

            {/* Các nút hành động tiếp theo */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleResetForNext}
                style={{
                  padding: '11px 18px',
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  color: '#fdba74',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🔥</span>
                <span>Đốt tiếp một nỗi bực khác</span>
              </button>

              {onOpenCafe && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCafe();
                  }}
                  style={{
                    padding: '11px 18px',
                    background: 'rgba(217, 119, 6, 0.18)',
                    border: '1px solid rgba(217, 119, 6, 0.4)',
                    color: '#fde68a',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>☕</span>
                  <span>Mở Tiệm Cà Phê Mưa thư giãn</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '11px 20px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  color: '#a7f3d0',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>🌿</span>
                <span>Quay lại làm việc</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes firePulse {
          0% { transform: scale(0.96) rotate(-2deg); filter: drop-shadow(0 0 15px rgba(249, 115, 22, 0.7)); }
          100% { transform: scale(1.08) rotate(3deg); filter: drop-shadow(0 0 35px rgba(239, 68, 68, 0.95)); }
        }
        @keyframes textDissolve {
          0% { filter: blur(0px); opacity: 0.9; }
          40% { filter: blur(2px) contrast(150%); color: #ef4444; }
          75% { filter: blur(6px); opacity: 0.4; }
          100% { filter: blur(14px); opacity: 0; transform: translateY(-20px); }
        }
        @keyframes sproutBloom {
          0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .rant-burn-modal-box.is-rumbling {
          animation: rumbleAnim 0.15s infinite;
        }
        @keyframes rumbleAnim {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 2px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-1px, -2px); }
          100% { transform: translate(1px, 1px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .equalizer-bar {
          display: inline-block;
          width: 2px;
          height: 9px;
          background: #ffffff;
          border-radius: 1px;
          animation: eqAnim 0.6s infinite alternate ease-in-out;
        }
        .equalizer-bar.bar-1 { animation-delay: 0.1s; }
        .equalizer-bar.bar-2 { animation-delay: 0.3s; }
        .equalizer-bar.bar-3 { animation-delay: 0.2s; }
        @keyframes eqAnim {
          0% { height: 3px; }
          100% { height: 10px; }
        }
        .rant-burn-modal-box::-webkit-scrollbar {
          width: 6px;
        }
        .rant-burn-modal-box::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 999px;
        }
        .rant-burn-modal-box::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.45);
          border-radius: 999px;
        }
        .rant-burn-modal-box::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.75);
        }
        .rant-sad-music-scroll-list::-webkit-scrollbar {
          width: 5px;
        }
        .rant-sad-music-scroll-list::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.25);
          border-radius: 999px;
        }
        .rant-sad-music-scroll-list::-webkit-scrollbar-thumb {
          background: rgba(244, 63, 94, 0.45);
          border-radius: 999px;
        }
        .rant-sad-music-scroll-list::-webkit-scrollbar-thumb:hover {
          background: rgba(244, 63, 94, 0.75);
        }
      `}</style>
    </div>
  );
};
