/**
 * HỆ THỐNG PHÁT HIỆN TỪ NGỮ NHẠY CẢM, CHÈN DẤU CHẤM (DOT-MASKING) & KIỂM DUYỆT CHÍNH TRỊ (FRONTEND)
 * Ngăn chặn nguy cơ vi phạm tiêu chuẩn cộng đồng, bảo vệ an toàn cho website
 */

export const POLITICAL_KEYWORDS = [
  'chính trị',
  'chính quyền',
  'phản động',
  'lật đổ',
  'bạo động',
  'biểu tình chống',
  'đảo chính',
  'khủng bố',
  'chống phá',
  'quốc gia lưu vong',
  'xuyên tạc',
  'bôi nhọ lãnh tụ',
  'chống đảng',
  'chống nhà nước',
  'việt tân',
  'chế độ độc tài',
  'lật đổ chính quyền',
  'biểu tình bạo loạn',
];

export const SENSITIVE_KEYWORDS = [
  // Tự hại / Cái chết / Bạo lực (được chuyển sang dạng D.I.E, c.h.ế.t...)
  'die',
  'death',
  'dead',
  'kill',
  'suicide',
  'chết',
  'tự tử',
  'tự sát',
  'giết',
  'cắt cổ',
  'nhảy lầu',
  'treo cổ',
  'uống thuốc sâu',
  'đâm chết',
  'thảm sát',
  'chém chết',

  // Tục tĩu, chửi thề, 18+
  'đm',
  'dmm',
  'đmm',
  'vcl',
  'vkl',
  'vcc',
  'địt',
  'dit',
  'lồn',
  'lon',
  'cặc',
  'cak',
  'cac',
  'buồi',
  'buoi',
  'đéo',
  'deo',
  'chó đẻ',
  'đĩ',
  'cave',
  'khiêu dâm',
  'ấu dâm',
  'dâm đãng',
  'bán dâm',

  // Cờ bạc / Lừa đảo
  'tài xỉu',
  'cá độ',
  'đánh bạc',
  'đá gà',
  'kubet',
  'thabet',
  'cho vay nặng lãi',

  ...POLITICAL_KEYWORDS,
];

const SORTED_SENSITIVE_KEYWORDS = [...new Set(SENSITIVE_KEYWORDS)].sort((a, b) => b.length - a.length);

/**
 * Chèn dấu chấm vào giữa các ký tự của từ nhạy cảm
 */
export const maskWordWithDots = (word) => {
  if (!word || typeof word !== 'string') return word;

  const isCapitalized = word[0] && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase();
  const isAllUpper = word.length > 1 && word === word.toUpperCase();

  return word
    .split(/\s+/)
    .map((part) => {
      const chars = Array.from(part);
      if (chars.length <= 1) return part;

      if (isCapitalized || isAllUpper) {
        return chars.map((c) => c.toUpperCase()).join('.');
      }
      return chars.map((c) => c.toLowerCase()).join('.');
    })
    .join(' ');
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Lọc và tự động thay thế từ ngữ nhạy cảm trong đoạn văn bản
 */
export const maskSensitiveText = (text) => {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  SORTED_SENSITIVE_KEYWORDS.forEach((keyword) => {
    const escaped = escapeRegExp(keyword);
    const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'gui');

    result = result.replace(regex, (match) => {
      return maskWordWithDots(match);
    });
  });

  return result;
};

/**
 * Phân tích độ nhạy cảm & kiểm duyệt yếu tố Chính trị
 */
export const analyzeContentSafety = (title = '', summary = '', content = '', tags = []) => {
  const fullText = `${title} ${summary} ${content} ${(tags || []).join(' ')}`.toLowerCase();

  const foundPolitics = [];
  POLITICAL_KEYWORDS.forEach((kw) => {
    const escaped = escapeRegExp(kw);
    const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'ui');
    if (regex.test(fullText)) {
      foundPolitics.push(kw);
    }
  });

  if (foundPolitics.length > 0) {
    return {
      isFlagged: true,
      severity: 'high',
      category: 'Chính Trị & Nhạy Cảm Cao',
      reason: `Nội dung có yếu tố Chính trị / Nhạy cảm (từ khóa: "${foundPolitics.slice(0, 3).join(', ')}")`,
      foundWords: foundPolitics,
    };
  }

  const extremeKeywords = ['tự tử', 'tự sát', 'nhảy lầu', 'treo cổ', 'thảm sát', 'suicide'];
  const foundExtreme = [];
  extremeKeywords.forEach((kw) => {
    const escaped = escapeRegExp(kw);
    const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'ui');
    if (regex.test(fullText)) {
      foundExtreme.push(kw);
    }
  });

  if (foundExtreme.length > 0) {
    return {
      isFlagged: true,
      severity: 'medium',
      category: 'Nội Dung Nhạy Cảm',
      reason: `Bài viết có chủ đề cần chú ý tâm lý (từ khóa: "${foundExtreme.slice(0, 2).join(', ')}")`,
      foundWords: foundExtreme,
    };
  }

  return {
    isFlagged: false,
    severity: 'none',
    category: 'An Toàn',
    reason: '',
    foundWords: [],
  };
};

