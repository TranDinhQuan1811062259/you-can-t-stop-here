/**
 * Utility tính toán thời gian đọc/xem ước tính cho bài viết
 * Hỗ trợ bài viết sâu (article), khoảnh khắc ảnh (photo), và thước phim ngắn (video)
 */

/**
 * Trích xuất văn bản thuần túy từ chuỗi HTML hoặc Markdown
 */
export const stripHtmlAndMarkdown = (html = '') => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Đếm số từ hợp lệ trong chuỗi văn bản (hỗ trợ cả tiếng Việt có dấu và tiếng Anh)
 */
export const countWords = (text = '') => {
  if (!text || typeof text !== 'string') return 0;
  const clean = text.trim();
  if (!clean) return 0;
  const words = clean.split(/\s+/).filter((w) => w.length > 0);
  return words.length;
};

/**
 * Tính toán thời gian đọc/xem ước tính của bài viết
 * @param {Object} post - Đối tượng bài viết (content, summary, postType, mediaUrls)
 * @returns {Object} { minutes, text, words, isMediaOnly }
 */
export const calculateReadingTime = (post) => {
  if (!post) {
    return { minutes: 1, text: '⏱️ ~1 phút đọc', words: 0, isMediaOnly: false };
  }

  const postType = post.postType || 'article';

  // 1. Thước phim ngắn (Video)
  if (postType === 'video') {
    return {
      minutes: 2,
      text: '🎬 ~2 phút xem',
      words: 0,
      isMediaOnly: true,
    };
  }

  // 2. Khoảnh khắc ảnh (Photo)
  if (postType === 'photo') {
    const photoCount = Array.isArray(post.mediaUrls) ? post.mediaUrls.length : 1;
    const estMinutes = photoCount > 4 ? 2 : 1;
    return {
      minutes: estMinutes,
      text: `📷 ~${estMinutes} phút xem`,
      words: 0,
      isMediaOnly: true,
    };
  }

  // 3. Bài viết sâu (Article hoặc không gắn loại)
  const fullContent = [post.title || '', post.summary || '', post.content || ''].join(' ');
  const plainText = stripHtmlAndMarkdown(fullContent);
  const words = countWords(plainText);

  // Tốc độ đọc trung bình người trưởng thành: ~200 - 220 từ/phút
  const WORDS_PER_MINUTE = 200;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  return {
    minutes,
    text: `⏱️ ~${minutes} phút đọc`,
    words,
    isMediaOnly: false,
  };
};
