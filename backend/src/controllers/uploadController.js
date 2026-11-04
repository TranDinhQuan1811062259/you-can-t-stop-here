import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { parseDocument } from '../utils/documentParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// Đảm bảo thư mục lưu trữ uploads cục bộ luôn sẵn sàng
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Kiểm tra xem Cloudinary có được cấu hình hợp lệ hay chưa
 */
const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return Boolean(
    name &&
    key &&
    secret &&
    name !== 'your_cloud_name' &&
    key !== 'your_api_key' &&
    secret !== 'your_api_secret'
  );
};

/**
 * Lưu file buffer xuống ổ đĩa cục bộ
 */
const saveFileLocally = (buffer, originalName = 'image.png') => {
  const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${Date.now()}-${cleanName}`;
  const filePath = path.join(uploadsDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${fileName}`;
};

/**
 * Tải ảnh bìa hoặc ảnh nội dung bài viết lên Cloudinary hoặc Lưu trữ Cục bộ
 */
export const uploadImage = async (req, res) => {
  try {
    let fileBuffer = null;
    let originalName = 'upload.png';

    // 1. Nhận file từ FormData (Multer)
    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname || 'upload.png';
    } else if (req.body?.image) {
      // 2. Nhận file từ Base64 trong JSON body
      const base64Data = req.body.image.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
      originalName = req.body.fileName || 'image.png';
    }

    if (!fileBuffer) {
      return sendError(res, {
        message: 'Vui lòng chọn một file ảnh để tải lên',
        status: 400,
      });
    }

    // 3. Nếu đã cấu hình Cloudinary thật, thử tải lên Cloudinary
    if (isCloudinaryConfigured()) {
      try {
        const result = await uploadToCloudinary(fileBuffer, 'you_cant_stop_here/posts');
        return sendSuccess(res, {
          message: 'Tải ảnh lên Cloudinary thành công',
          data: result,
        });
      } catch (cloudErr) {
        console.warn('Lỗi Cloudinary, tự động lưu ảnh cục bộ:', cloudErr.message);
      }
    }

    // 4. Nếu chưa cấu hình Cloudinary hoặc Cloudinary lỗi, lưu ảnh trực tiếp vào backend/uploads
    const localUrl = saveFileLocally(fileBuffer, originalName);

    return sendSuccess(res, {
      message: 'Đã lưu trữ ảnh thành công trên máy chủ cục bộ',
      data: {
        url: localUrl,
        public_id: localUrl,
        format: path.extname(originalName).replace('.', ''),
        isLocal: true,
      },
    });
  } catch (error) {
    console.error('Lỗi upload image:', error);
    return sendError(res, {
      message: error.message || 'Lỗi khi tải ảnh lên',
      status: 500,
    });
  }
};

/**
 * Phân tích và trích xuất nội dung từ file văn bản (Word .docx, PDF, .txt, .md)
 */
export const parseUploadedDocument = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, {
        message: 'Vui lòng chọn file văn bản (.docx, .pdf, .txt) để nhập nội dung',
        status: 400,
      });
    }

    const parsedData = parseDocument(req.file.buffer, req.file.originalname);

    return sendSuccess(res, {
      message: `Đã trích xuất nội dung từ file "${req.file.originalname}" thành công`,
      data: parsedData,
    });
  } catch (error) {
    console.error('Lỗi parse document:', error);
    return sendError(res, {
      message: error.message || 'Không thể trích xuất nội dung từ file văn bản này.',
      status: 500,
    });
  }
};
