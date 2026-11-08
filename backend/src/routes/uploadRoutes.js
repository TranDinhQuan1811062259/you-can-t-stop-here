import express from 'express';
import { uploadImage, parseUploadedDocument } from '../controllers/uploadController.js';
import { protect, optionalProtect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Middleware hỗ trợ upload file qua multer nếu có
const multerMiddleware = async (req, res, next) => {
  try {
    const multerModule = await import('multer');
    const storage = multerModule.default.memoryStorage();
    const upload = multerModule.default({
      storage,
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB cho cả ảnh và tài liệu Word/PDF
    }).single('file');

    upload(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  } catch (err) {
    // Nếu multer chưa cài đặt thì vẫn tiếp tục để controller xử lý base64
    next();
  }
};

// Endpoint tải ảnh lên Cloudinary hoặc Lưu Cục Bộ (bảo vệ bởi protect)
router.post('/', protect, multerMiddleware, uploadImage);

// Endpoint trích xuất nội dung từ file Word (.docx), PDF (.pdf), Text (.txt)
router.post('/document', optionalProtect, multerMiddleware, parseUploadedDocument);

export default router;
