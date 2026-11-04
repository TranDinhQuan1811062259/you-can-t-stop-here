/**
 * Chuyển đổi chuỗi tiếng Việt thành slug URL thân thiện với SEO
 * Ví dụ: "Hướng Dẫn Lập Trình React 2026" -> "huong-dan-lap-trinh-react-2026"
 */
export const slugify = (text) => {
  if (!text) return '';

  let slug = text.toString().toLowerCase().trim();

  // Đổi ký tự có dấu thành không dấu
  slug = slug
    .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a')
    .replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e')
    .replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i')
    .replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o')
    .replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u')
    .replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y')
    .replace(/đ/gi, 'd');

  // Xóa các ký tự đặc biệt
  slug = slug
    .replace(/[^a-z0-9 -]/g, '') // Xóa ký tự không hợp lệ
    .replace(/\s+/g, '-')        // Thay khoảng trắng bằng dấu gạch ngang
    .replace(/-+/g, '-')        // Rút gọn nhiều dấu gạch ngang liền nhau
    .replace(/^-+/, '')          // Cắt gạch ngang ở đầu
    .replace(/-+$/, '');         // Cắt gạch ngang ở cuối

  return slug;
};

