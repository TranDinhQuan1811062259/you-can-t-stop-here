import DOMPurify from 'dompurify';

/**
 * Tiện ích xử lý và định dạng nội dung bài viết tâm sự
 * Hỗ trợ hiển thị ảnh, video YouTube, icon cảm xúc và ngắt dòng chuẩn xác
 * Tích hợp bộ lọc DOMPurify chống tấn công Cross-Site Scripting (XSS)
 */

/**
 * Cấu hình bảo mật DOMPurify:
 * - Cho phép các thẻ định dạng văn bản, media, liên kết
 * - Cho phép thẻ iframe nhúng (YouTube) với các thuộc tính an toàn
 */
const PURIFY_CONFIG = {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'loading'],
  ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
};

const getPurify = () => {
  if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify;
  }
  if (typeof window !== 'undefined' && typeof DOMPurify === 'function') {
    return DOMPurify(window);
  }
  return null;
};

const purify = getPurify();

// Đảm bảo chỉ những iframe từ nguồn nhúng video đáng tin cậy (YouTube) mới được phép hiển thị
if (purify && purify.addHook) {
  purify.addHook('uponSanitizeElement', (node, data) => {
    if (data.tagName === 'iframe') {
      const src = node.getAttribute('src') || '';
      const isTrustedEmbed = /^https:\/\/(www\.)?(youtube\.com\/embed\/|youtube-nocookie\.com\/embed\/|youtu\.be\/)/i.test(src);
      if (!isTrustedEmbed) {
        node.parentNode?.removeChild(node);
      }
    }
  });
}

/**
 * Trích xuất video ID từ link YouTube bất kỳ
 */
export const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);
  return match && match[1] ? match[1] : null;
};

/**
 * Tạo mã nhúng HTML video YouTube chuẩn phản hồi (16:9)
 */
export const createYouTubeEmbed = (videoId) => {
  return `<div class="video-container"><iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
};

/**
 * Làm sạch chuỗi HTML nhằm loại bỏ mã độc XSS
 */
export const sanitizePostHtml = (dirtyHtml) => {
  if (!dirtyHtml) return '';
  const activePurify = getPurify();
  if (activePurify && typeof activePurify.sanitize === 'function') {
    return activePurify.sanitize(dirtyHtml, PURIFY_CONFIG);
  }
  return dirtyHtml;
};

/**
 * Format nội dung bài viết trước khi render ra màn hình:
 * - Chuyển link YouTube trần thành video embed
 * - Tự động tạo thẻ <p> và <br/> cho các đoạn văn thuần text
 * - Khử khuẩn toàn bộ HTML đầu ra bằng DOMPurify để chống XSS
 */
export const formatPostContent = (rawContent) => {
  if (!rawContent) return '';
  let content = rawContent.trim();

  // 1. Tự động chuyển đổi các link YouTube đứng riêng thành khung video iframe
  const ytStandaloneRegex = /(?:^|\n|\r\n)(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s<]*)(?:\n|\r\n|$)/g;

  content = content.replace(ytStandaloneRegex, (_, videoId) => {
    return `\n${createYouTubeEmbed(videoId)}\n`;
  });

  // 2. Kiểm tra xem nội dung đã chứa thẻ khối HTML nào chưa
  const hasBlockHtml = /<(?:p|div|h[1-6]|blockquote|hr|ul|ol|table|section|article)\b/i.test(content);

  let formattedHtml = '';
  if (hasBlockHtml) {
    formattedHtml = content;
  } else {
    // 3. Nếu là text thuần, chia thành các đoạn văn <p>
    const paragraphs = content
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) return '';

    formattedHtml = paragraphs
      .map((p) => `<p>${p.replace(/\r?\n/g, '<br />')}</p>`)
      .join('');
  }

  // 4. Khử khuẩn toàn bộ HTML bằng DOMPurify trước khi trả về cho UI
  return sanitizePostHtml(formattedHtml);
};
