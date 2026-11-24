/**
 * Tiện ích Nén & Tối Ưu Hóa Ảnh Phía Client bằng HTML5 Canvas
 * - Tự động resize ảnh lớn về kích thước tối đa (mặc định 1600px)
 * - Nén ảnh > 800KB về dung lượng tối ưu mà vẫn giữ độ nét cao
 * - Giữ nguyên ảnh GIF động và file nhỏ dưới 500KB
 * - Dọn dẹp triệt để URL Object và Canvas buffer chống rò rỉ bộ nhớ (Quy tắc 3 GEMINI.md)
 */

export const compressImageFile = async (file, options = {}) => {
  if (!file || !(file instanceof Blob)) {
    return file;
  }

  // 1. Không nén ảnh GIF động để tránh mất các khung hình hoạt họa
  if (file.type === 'image/gif') {
    return file;
  }

  // 2. Nếu file không phải ảnh (svg, pdf, v.v.), bỏ qua
  if (!file.type || !file.type.startsWith('image/')) {
    return file;
  }

  const {
    maxWidth = 1600,
    maxHeight = 1600,
    maxSizeBytes = 800 * 1024, // 800KB
    initialQuality = 0.82,
    minQuality = 0.65,
  } = options;

  // 3. Nếu file nhỏ hơn 500KB và không bắt buộc resize, giữ nguyên file gốc
  if (file.size <= 500 * 1024 && !options.forceResize) {
    return file;
  }

  return new Promise((resolve) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
    } catch (e) {
      // Fallback nếu trình duyệt không hỗ trợ createObjectURL
      return resolve(file);
    }

    const img = new Image();

    // Dọn dẹp an toàn khi hoàn tất
    const cleanup = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch (_) {}
        objectUrl = null;
      }
    };

    img.onload = async () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Nếu ảnh quá nhỏ hoặc lỗi kích thước, fallback về file gốc
        if (!width || !height) {
          cleanup();
          return resolve(file);
        }

        // Nếu ảnh nhỏ hơn cả giới hạn kích thước lẫn dung lượng, không cần nén
        if (width <= maxWidth && height <= maxHeight && file.size <= maxSizeBytes) {
          cleanup();
          return resolve(file);
        }

        // Tính toán kích thước mới giữ nguyên tỉ lệ khung hình
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) {
          cleanup();
          return resolve(file);
        }

        // Khử răng cưa và vẽ ảnh chất lượng cao
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất blob với chất lượng điều chỉnh linh hoạt
        const outputMime = file.type === 'image/png' && file.size <= maxSizeBytes ? 'image/png' : 'image/jpeg';
        let quality = initialQuality;

        const attemptExport = (currQuality) => {
          return new Promise((resBlob) => {
            canvas.toBlob(
              (blob) => resBlob(blob),
              outputMime,
              outputMime === 'image/png' ? undefined : currQuality
            );
          });
        };

        let resultBlob = await attemptExport(quality);

        // Nếu sau lần 1 vẫn > 800KB và còn room giảm chất lượng
        if (resultBlob && resultBlob.size > maxSizeBytes && outputMime !== 'image/png') {
          resultBlob = await attemptExport(minQuality);
        }

        // Giải phóng tài nguyên Canvas buffer
        canvas.width = 0;
        canvas.height = 0;
        cleanup();

        if (!resultBlob || resultBlob.size >= file.size) {
          // Nếu sau khi nén mà kích thước không giảm hoặc lỗi, dùng file gốc
          return resolve(file);
        }

        // Chuyển Blob thành File object mới giữ tên file
        const newExt = outputMime === 'image/png' ? '.png' : '.jpg';
        const cleanName = file.name ? file.name.replace(/\.[^/.]+$/, newExt) : `optimized-image${newExt}`;
        const compressedFile = new File([resultBlob], cleanName, {
          type: outputMime,
          lastModified: Date.now(),
        });

        resolve(compressedFile);
      } catch (err) {
        console.warn('[ImageCompressor] Lỗi trong quá trình nén ảnh:', err);
        cleanup();
        resolve(file);
      }
    };

    img.onerror = () => {
      cleanup();
      resolve(file);
    };

    img.src = objectUrl;
  });
};

export default compressImageFile;
