/**
 * Tiện ích xử lý và định dạng nội dung bài viết tâm sự
 * Hỗ trợ hiển thị ảnh, video YouTube, icon cảm xúc và ngắt dòng chuẩn xác
 */

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
 * Format nội dung bài viết trước khi render ra màn hình:
 * - Chuyển link YouTube trần thành video embed
 * - Tự động tạo thẻ <p> và <br/> cho các đoạn văn thuần text
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

  if (hasBlockHtml) {
    return content;
  }

  // 3. Nếu là text thuần, chia thành các đoạn văn <p>
  const paragraphs = content
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((p) => `<p>${p.replace(/\r?\n/g, '<br />')}</p>`)
    .join('');
};

