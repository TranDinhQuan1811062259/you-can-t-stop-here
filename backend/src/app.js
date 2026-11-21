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
const clientDistDir = path.join(__dirname, '../../frontend/dist');
const clientAssetsDir = path.join(clientDistDir, 'assets');

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

// Phục vụ thư mục static cho các file ảnh tải lên cục bộ và thư viện ảnh với HTTP cache phù hợp
app.use(
  '/uploads',
  express.static(uploadsDir, {
    maxAge: '1d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    },
  })
);

if (fs.existsSync(imagesDir)) {
  app.use(
    '/images',
    express.static(imagesDir, {
      maxAge: '1d',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      },
    })
  );
}

// Phục vụ các file assets có hash bất biến từ frontend build (JS, CSS, vendor chunks)
// Header bất biến 1 năm: Trình duyệt không bao giờ cần tải lại lần 2
if (fs.existsSync(clientAssetsDir)) {
  app.use(
    '/assets',
    express.static(clientAssetsDir, {
      immutable: true,
      maxAge: '1y',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );
}

// Phục vụ các file tĩnh ở root của dist (favicon, manifest, audio, icons)
if (fs.existsSync(clientDistDir)) {
  app.use(
    express.static(clientDistDir, {
      index: false,
      setHeaders: (res, filePath) => {
        const normalized = filePath.replace(/\\/g, '/');
        if (normalized.includes('/assets/')) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (normalized.endsWith('sw.js') || normalized.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        }
      },
    })
  );
}

// Mount API routes (Đảm bảo dữ liệu động, Auth & Tokens KHÔNG BAO GIỜ bị proxy/browser cache)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}, routes);

// SPA Fallback cho client-side routing (React Router): phục vụ index.html với no-cache để luôn nhận build mới
if (fs.existsSync(path.join(clientDistDir, 'index.html'))) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

// Handle 404 & Global Errors
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
