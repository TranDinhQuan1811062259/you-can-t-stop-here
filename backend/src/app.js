import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');
const imagesDir = path.join(__dirname, '../../frontend/public/images');

const app = express();

// Hỗ trợ reverse proxy (Vercel, Render, Nginx) để xác định chính xác IP client cho rate limiter
app.set('trust proxy', 1);

// Middlewares & CORS hỗ trợ linh hoạt cổng local
app.use(cors({
  origin: (origin, callback) => {
    // Trong môi trường dev, cho phép tất cả các cổng localhost / 127.0.0.1 hoặc requests không có origin
    if (
      !origin ||
      process.env.NODE_ENV !== 'production' ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
}));

// Giới hạn kích thước payload JSON và form urlencoded tối đa 2MB (chống DOS và cạn kiệt RAM).
// Lưu ý: Các tệp tải lên (ảnh, tài liệu, âm thanh) được xử lý riêng qua Multer multipart streaming.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Phục vụ thư mục static cho các file ảnh tải lên cục bộ và thư viện ảnh
app.use('/uploads', express.static(uploadsDir));
if (fs.existsSync(imagesDir)) {
  app.use('/images', express.static(imagesDir));
}

// Mount API routes
app.use('/api', routes);

// Handle 404 & Global Errors
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
